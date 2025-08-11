import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { AuthService } from "./authService";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { insertUserSchema, insertFacilitySchema, insertBookingSchema, insertMatchSchema, insertReviewSchema } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Rate limiter for OTP requests: 2 requests per minute per IP
const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // limit each IP to 2 requests per windowMs
  message: {
    message: "Too many OTP requests, please try again later. Limit: 2 requests per minute."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Handler for when rate limit is exceeded
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many OTP requests, please try again later. Limit: 2 requests per minute.",
      retryAfter: Math.ceil(60 / 1000) // Retry after 1 minute
    });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Middleware to check user role
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // OTP Auth routes
  app.post("/api/auth/signup/send-otp", otpRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      const result = await AuthService.sendSignupOTP(email);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("OTP signup error:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  app.post("/api/auth/signup/verify-otp", otpRateLimiter, async (req, res) => {
    try {
      const { email, code, ...userData } = req.body;
      const result = await AuthService.verifySignupOTP(email, code, userData);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.status(201).json({
        message: result.message,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ message: "Failed to verify code" });
    }
  });

  app.post("/api/auth/login/send-otp", otpRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      const result = await AuthService.sendLoginOTP(email);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Login OTP error:", error);
      res.status(500).json({ message: "Failed to send login code" });
    }
  });

  app.post("/api/auth/login/verify-otp", otpRateLimiter, async (req, res) => {
    try {
      const { email, code } = req.body;
      const result = await AuthService.verifyLoginOTP(email, code);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.json({
        message: result.message,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      console.error("Login OTP verification error:", error);
      res.status(500).json({ message: "Failed to verify login code" });
    }
  });

  // Traditional Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(201).json({
        user: { ...user, password: undefined },
        token,
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        user: { ...user, password: undefined },
        token,
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // User routes
  app.get("/api/users/me", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/users/me", authenticateToken, async (req: any, res) => {
    try {
      const updates = req.body;
      delete updates.password; // Don't allow password updates through this route
      delete updates.role; // Don't allow role changes
      
      const user = await storage.updateUser(req.user.userId, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Facility routes
  app.get("/api/facilities", async (req, res) => {
    try {
      const { city, sportType, searchTerm } = req.query;
      const facilities = await storage.getFacilities({
        city: city as string,
        sportType: sportType as string,
        searchTerm: searchTerm as string,
      });
      res.json(facilities);
    } catch (error) {
      res.status(500).json({ message: "Failed to get facilities", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/facilities/:id", async (req, res) => {
    try {
      const facility = await storage.getFacility(req.params.id);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      res.json(facility);
    } catch (error) {
      res.status(500).json({ message: "Failed to get facility", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/facilities", authenticateToken, requireRole(["facility_owner", "admin"]), async (req: any, res) => {
    try {
      const facilityData = insertFacilitySchema.parse({
        ...req.body,
        ownerId: req.user.userId,
      });
      
      const facility = await storage.createFacility(facilityData);
      res.status(201).json(facility);
    } catch (error) {
      res.status(400).json({ message: "Invalid facility data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/facilities/:id", authenticateToken, requireRole(["facility_owner", "admin"]), async (req: any, res) => {
    try {
      const facility = await storage.getFacility(req.params.id);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }

      // Check ownership (unless admin)
      if (req.user.role !== "admin" && facility.ownerId !== req.user.userId) {
        return res.status(403).json({ message: "Not authorized to update this facility" });
      }

      const updates = req.body;
      delete updates.ownerId; // Don't allow owner changes through this route
      
      const updatedFacility = await storage.updateFacility(req.params.id, updates);
      res.json(updatedFacility);
    } catch (error) {
      res.status(500).json({ message: "Failed to update facility", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/facilities/:id/bookings", authenticateToken, async (req: any, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const bookings = await storage.getBookingsByFacility(req.params.id, date);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bookings", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Booking routes
  app.get("/api/bookings", authenticateToken, async (req: any, res) => {
    try {
      const bookings = await storage.getBookings(req.user.userId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bookings", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/bookings", authenticateToken, async (req: any, res) => {
    try {
      const bookingData = insertBookingSchema.parse({
        ...req.body,
        userId: req.user.userId,
      });
      
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      res.status(400).json({ message: "Invalid booking data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/bookings/:id/cancel", authenticateToken, async (req: any, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Check ownership (unless admin)
      if (req.user.role !== "admin" && booking.userId !== req.user.userId) {
        return res.status(403).json({ message: "Not authorized to cancel this booking" });
      }

      const success = await storage.cancelBooking(req.params.id);
      if (success) {
        res.json({ message: "Booking cancelled successfully" });
      } else {
        res.status(500).json({ message: "Failed to cancel booking" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel booking", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Match routes
  app.get("/api/matches", async (req, res) => {
    try {
      const { city, sportType, skillLevel } = req.query;
      const matches = await storage.getMatches({
        city: city as string,
        sportType: sportType as string,
        skillLevel: skillLevel as string,
      });
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to get matches", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/matches/:id", async (req, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      res.status(500).json({ message: "Failed to get match", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/matches", authenticateToken, async (req: any, res) => {
    try {
      const matchData = insertMatchSchema.parse({
        ...req.body,
        creatorId: req.user.userId,
      });
      
      const match = await storage.createMatch(matchData);
      res.status(201).json(match);
    } catch (error) {
      res.status(400).json({ message: "Invalid match data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/matches/:id/join", authenticateToken, async (req: any, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if ((match.currentPlayers || 0) >= match.maxPlayers) {
        return res.status(400).json({ message: "Match is already full" });
      }

      const participant = await storage.joinMatch(req.params.id, req.user.userId);
      res.status(201).json(participant);
    } catch (error) {
      res.status(500).json({ message: "Failed to join match", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/matches/:id/leave", authenticateToken, async (req: any, res) => {
    try {
      const success = await storage.leaveMatch(req.params.id, req.user.userId);
      if (success) {
        res.json({ message: "Left match successfully" });
      } else {
        res.status(400).json({ message: "Failed to leave match" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to leave match", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Facility owner routes
  app.get("/api/owner/facilities", authenticateToken, requireRole(["facility_owner", "admin"]), async (req: any, res) => {
    try {
      console.log('Getting facilities for user:', req.user.userId, 'role:', req.user.role);
      const facilities = await storage.getFacilitiesByOwner(req.user.userId);
      console.log('Found facilities:', facilities.length, 'facilities');
      res.json(facilities);
    } catch (error) {
      console.error('Error getting owner facilities:', error);
      res.status(500).json({ message: "Failed to get facilities", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/owner/bookings", authenticateToken, requireRole(["facility_owner", "admin"]), async (req: any, res) => {
    try {
      const facilities = await storage.getFacilitiesByOwner(req.user.userId);
      const facilityIds = facilities.map(f => f.id);
      
      if (facilityIds.length === 0) {
        return res.json([]);
      }
      
      // Get all bookings for the owner's facilities
      const allBookings = await storage.getBookings();
      const ownerBookings = allBookings.filter(booking => 
        facilityIds.includes(booking.facilityId)
      );
      
      res.json(ownerBookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bookings", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Review routes
  app.get("/api/facilities/:id/reviews", async (req, res) => {
    try {
      const reviews = await storage.getReviewsByFacility(req.params.id);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to get reviews", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/facilities/:id/reviews", authenticateToken, async (req: any, res) => {
    try {
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        facilityId: req.params.id,
        userId: req.user.userId,
      });
      
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      res.status(400).json({ message: "Invalid review data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
