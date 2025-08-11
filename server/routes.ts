import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { AuthService } from "./authService";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { insertUserSchema, insertFacilitySchema, insertBookingSchema, insertMatchSchema, insertReviewSchema, insertGameSchema, insertFacilityCourtSchema, bookings } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import multer from "multer";
import { imageUploadService } from "./imageUploadService";

import Stripe from "stripe";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

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
    console.log("No token provided");
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) {
      console.log("Token verification error:", err.message);
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    
    console.log("Decoded JWT token:", decoded);
    
    // If token only has userId, fetch full user data
    if (decoded.userId && !decoded.role) {
      try {
        const user = await storage.getUser(decoded.userId);
        if (user) {
          req.user = {
            userId: user.id,
            email: user.email,
            role: user.role,
            ...decoded
          };
        } else {
          return res.status(403).json({ message: "User not found" });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        return res.status(403).json({ message: "Invalid token" });
      }
    } else {
      req.user = decoded;
    }
    
    console.log("Final req.user:", req.user);
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
      
      // Return in the format the client expects
      const userWithoutPassword = { ...user, password: undefined };
      res.json({ 
        success: true,
        user: userWithoutPassword,
        message: "Profile updated successfully"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Profile image upload route
  app.post("/api/users/me/profile-image", authenticateToken, upload.single('profileImage'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Validate the uploaded file
      const validation = imageUploadService.validateFile(req.file);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      // Upload image to Cloudflare R2
      const uploadedImage = await imageUploadService.uploadImage(req.file, 'profiles');
      
      // Get current user to check if they have an existing profile image
      const currentUser = await storage.getUser(req.user.userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Delete old profile image if it exists
      if (currentUser.profileImage) {
        const oldImageInfo = imageUploadService.getImageInfoFromUrl(currentUser.profileImage);
        if (oldImageInfo) {
          await imageUploadService.deleteImage(oldImageInfo.filename);
        }
      }

      // Update user with new profile image URL
      const updatedUser = await storage.updateUser(req.user.userId, {
        profileImage: uploadedImage.url
      });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user profile image" });
      }

      res.json({ 
        message: "Profile image updated successfully",
        profileImage: uploadedImage.url,
        user: { ...updatedUser, password: undefined }
      });
    } catch (error) {
      console.error("Profile image upload error:", error);
      res.status(500).json({ 
        message: "Failed to upload profile image", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Games routes
  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getGames();
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Failed to get games", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    try {
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to get game", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/games", authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const gameData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(gameData);
      res.status(201).json(game);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate')) {
        res.status(400).json({ message: "Game with this sport type already exists" });
      } else {
        res.status(500).json({ message: "Failed to create game", error: error instanceof Error ? error.message : "Unknown error" });
      }
    }
  });

  // Facility routes
  app.get("/api/facilities", async (req, res) => {
    try {
      const { city, sportType, searchTerm, sortBy, sortOrder } = req.query;
      const facilities = await storage.getFacilities({
        city: city as string,
        sportType: sportType as string,
        searchTerm: searchTerm as string,
        sortBy: sortBy as 'rating' | 'price' | 'name',
        sortOrder: sortOrder as 'asc' | 'desc',
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
      const { gameCourts, ...facilityFields } = req.body;
      
      const facilityData = insertFacilitySchema.parse({
        ...facilityFields,
        ownerId: req.user.userId,
      });
      
      const facility = await storage.createFacility(facilityData);
      
      // Create facility courts if provided
      if (gameCourts && Array.isArray(gameCourts)) {
        for (const court of gameCourts) {
          try {
            const courtData = insertFacilityCourtSchema.parse({
              facilityId: facility.id,
              gameId: court.gameId,
              courtCount: court.courtCount,
              pricePerHour: court.pricePerHour,
            });
            await storage.createFacilityCourt(courtData);
          } catch (courtError) {
            console.error("Error creating facility court:", courtError);
          }
        }
      }
      
      // Return facility with courts populated
      const facilityWithCourts = await storage.getFacility(facility.id);
      res.status(201).json(facilityWithCourts);
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

      const { gameCourts, ...facilityUpdates } = req.body;
      delete facilityUpdates.ownerId; // Don't allow owner changes through this route
      
      // Update facility
      const updatedFacility = await storage.updateFacility(req.params.id, facilityUpdates);
      
      // Update facility courts if provided
      if (gameCourts && Array.isArray(gameCourts)) {
        // Get existing courts for this facility
        const existingCourts = await storage.getFacilityCourts(req.params.id);
        
        // Delete courts that are no longer needed
        const newGameIds = gameCourts.map(court => court.gameId);
        for (const existingCourt of existingCourts) {
          if (!newGameIds.includes(existingCourt.gameId)) {
            await storage.deleteFacilityCourt(existingCourt.id);
          }
        }
        
        // Create or update courts
        for (const court of gameCourts) {
          const existingCourt = existingCourts.find(ec => ec.gameId === court.gameId);
          
          if (existingCourt) {
            // Update existing court
            await storage.updateFacilityCourt(existingCourt.id, {
              courtCount: court.courtCount,
              pricePerHour: court.pricePerHour.toString(),
            });
          } else {
            // Create new court
            try {
              const courtData = insertFacilityCourtSchema.parse({
                facilityId: req.params.id,
                gameId: court.gameId,
                courtCount: court.courtCount,
                pricePerHour: court.pricePerHour.toString(),
              });
              await storage.createFacilityCourt(courtData);
            } catch (courtError) {
              console.error("Error creating facility court:", courtError);
            }
          }
        }
      }
      
      // Return updated facility with courts
      const facilityWithCourts = await storage.getFacility(req.params.id);
      res.json(facilityWithCourts);
    } catch (error) {
      res.status(500).json({ message: "Failed to update facility", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/facilities/:id", authenticateToken, requireRole(["facility_owner", "admin"]), async (req: any, res) => {
    try {
      const facility = await storage.getFacility(req.params.id);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }

      // Check ownership (unless admin)
      if (req.user.role !== "admin" && facility.ownerId !== req.user.userId) {
        return res.status(403).json({ message: "Not authorized to delete this facility" });
      }

      // Check if there are any active bookings for this facility
      const activeBookings = await storage.getBookingsByFacility(req.params.id);
      const hasActiveBookings = activeBookings.some((booking: any) => 
        new Date(booking.date) > new Date() && booking.status !== "cancelled"
      );

      if (hasActiveBookings) {
        return res.status(400).json({ 
          message: "Cannot delete facility with active or future bookings. Please cancel all bookings first." 
        });
      }

      const success = await storage.hardDeleteFacility(req.params.id);
      if (success) {
        res.json({ message: "Facility deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete facility" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete facility", error: error instanceof Error ? error.message : "Unknown error" });
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

  // Facility Courts routes
  app.get("/api/facilities/:id/courts", async (req, res) => {
    try {
      const facilityCourts = await storage.getFacilityCourts(req.params.id);
      res.json(facilityCourts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get facility courts", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/facilities/:id/courts", authenticateToken, requireRole(["facility_owner", "admin"]), async (req: any, res) => {
    try {
      const facility = await storage.getFacility(req.params.id);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }

      // Check ownership (unless admin)
      if (req.user.role !== "admin" && facility.ownerId !== req.user.userId) {
        return res.status(403).json({ message: "Not authorized to manage this facility's courts" });
      }

      const courtData = insertFacilityCourtSchema.parse({
        ...req.body,
        facilityId: req.params.id,
      });
      
      const facilityCourt = await storage.createFacilityCourt(courtData);
      res.status(201).json(facilityCourt);
    } catch (error) {
      res.status(400).json({ message: "Invalid court data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/facility-courts/:id", authenticateToken, requireRole(["facility_owner", "admin"]), async (req: any, res) => {
    try {
      const facilityCourt = await storage.getFacilityCourts('');
      // TODO: Implement getFacilityCourt by ID method if needed for ownership check
      
      const updates = req.body;
      const updatedFacilityCourt = await storage.updateFacilityCourt(req.params.id, updates);
      if (!updatedFacilityCourt) {
        return res.status(404).json({ message: "Facility court not found" });
      }
      res.json(updatedFacilityCourt);
    } catch (error) {
      res.status(500).json({ message: "Failed to update facility court", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/facility-courts/:id", authenticateToken, requireRole(["facility_owner", "admin"]), async (req: any, res) => {
    try {
      const success = await storage.deleteFacilityCourt(req.params.id);
      if (success) {
        res.json({ message: "Facility court deleted successfully" });
      } else {
        res.status(404).json({ message: "Facility court not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete facility court", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Court availability check endpoint
  app.post("/api/facilities/:id/courts/check-availability", async (req, res) => {
    try {
      const { gameId, startTime, endTime } = req.body;
      
      if (!gameId || !startTime || !endTime) {
        return res.status(400).json({ message: "gameId, startTime, and endTime are required" });
      }

      const startDateTime = new Date(startTime);
      const endDateTime = new Date(endTime);
      
      const availableCourts = await storage.checkCourtAvailability(req.params.id, gameId, startDateTime, endDateTime);
      const availableCourtNumber = await storage.getAvailableCourt(req.params.id, gameId, startDateTime, endDateTime);
      
      res.json({
        available: availableCourts !== null,
        availableCourtCount: availableCourts || 0,
        nextAvailableCourtNumber: availableCourtNumber
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check court availability", error: error instanceof Error ? error.message : "Unknown error" });
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
      // Convert data types to match schema expectations
      const { date, startTime, endTime, totalAmount, facilityId, gameId, ...restData } = req.body;
      
      // First, check if courts are available and get an available court number
      const startDateTime = new Date(startTime);
      const endDateTime = new Date(endTime);
      
      const availableCourtNumber = await storage.getAvailableCourt(facilityId, gameId, startDateTime, endDateTime);
      
      if (!availableCourtNumber) {
        return res.status(400).json({ message: "No courts available for the selected time slot" });
      }
      
      const bookingData = insertBookingSchema.parse({
        ...restData,
        userId: req.user.userId,
        facilityId,
        gameId,
        courtNumber: availableCourtNumber,
        date: new Date(date),
        startTime: startDateTime,
        endTime: endDateTime,
        totalAmount: typeof totalAmount === 'number' ? totalAmount.toString() : totalAmount,
      });
      
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      console.error('Booking creation error:', error);
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
      const facilities = await storage.getFacilitiesByOwner(req.user.userId);
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

  // Toggle facility status (active/inactive)
  app.patch("/api/owner/facilities/:id/toggle-status", authenticateToken, requireRole(["facility_owner", "admin"]), async (req: any, res) => {
    try {
      
      const facility = await storage.getFacility(req.params.id);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }


      // Check ownership (unless admin)
      if (req.user.role !== "admin" && facility.ownerId !== req.user.userId) {
        return res.status(403).json({ message: "Not authorized to update this facility" });
      }

      const newStatus = !facility.isActive;
      
      const updatedFacility = await storage.updateFacility(req.params.id, { isActive: newStatus });
      
      if (updatedFacility) {
        res.json({ 
          message: `Facility ${newStatus ? 'activated' : 'deactivated'} successfully`,
          facility: updatedFacility 
        });
      } else {
        res.status(500).json({ message: "Failed to update facility status" });
      }
    } catch (error) {
      console.error('Error in toggle facility status:', error);
      res.status(500).json({ message: "Failed to toggle facility status", error: error instanceof Error ? error.message : "Unknown error" });
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



    // Test endpoints to verify server is working
  app.get("/api/test", (req, res) => {
    res.json({ message: "Server is working", timestamp: new Date().toISOString() });
  });

  app.get("/api/test-auth", authenticateToken, (req: any, res) => {
    res.json({ 
      message: "Authentication working", 
      user: req.user,
      timestamp: new Date().toISOString() 
    });
  });

  // Test file upload without authentication first
  app.post("/api/test-upload", upload.single('image'), (req: any, res) => {
    res.json({ 
      message: "Upload test successful",
      hasFile: !!req.file,
      fileSize: req.file?.size,
      fileType: req.file?.mimetype
    });
  });

  // Test authentication with POST
  app.post("/api/test-auth-post", authenticateToken, (req: any, res) => {
    res.json({ 
      message: "POST authentication working", 
      user: req.user,
      timestamp: new Date().toISOString() 
    });
  });

  // Test image URL accessibility
  app.get("/api/test-image/:filename", async (req: any, res) => {
    try {
      const { filename } = req.params;
      const imageUrl = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME || 'quickcourt-images'}/${filename}`;
      
      res.json({ 
        message: "Image URL generated",
        filename,
        imageUrl,
        bucketName: process.env.R2_BUCKET_NAME || 'quickcourt-images',
        accountId: process.env.R2_ACCOUNT_ID
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to generate image URL", error: error.message });
    }
  });

  // Image upload routes - only for facility owners
  app.post("/api/upload/image", authenticateToken, requireRole(['facility_owner', 'admin']), upload.single('image'), async (req: any, res) => {
    // Handle multer errors
    if (req.fileValidationError) {
      return res.status(400).json({ message: req.fileValidationError });
    }
    try {
      console.log('Image upload request received:', {
        hasFile: !!req.file,
        fileSize: req.file?.size,
        fileType: req.file?.mimetype,
        fileName: req.file?.originalname,
        userId: req.user?.userId,
        userRole: req.user?.role
      });

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Validate file
      const validation = imageUploadService.validateFile(req.file);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      // Upload image
      const uploadedImage = await imageUploadService.uploadImage(req.file, 'facilities');
      
      console.log('Image uploaded successfully:', uploadedImage);
      
      res.status(201).json({
        message: "Image uploaded successfully",
        image: uploadedImage
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      res.status(500).json({ 
        message: "Failed to upload image", 
        error: error.message 
      });
    }
  });

  app.delete("/api/upload/image/:filename", authenticateToken, async (req: any, res) => {
    try {
      const { filename } = req.params;
      
      // Extract filename from the full path if needed
      const imageInfo = imageUploadService.getImageInfoFromUrl(filename);
      const actualFilename = imageInfo ? imageInfo.filename : filename;
      
      const success = await imageUploadService.deleteImage(actualFilename);
      
      if (success) {
        res.json({ message: "Image deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete image" });
      }
    } catch (error: any) {
      console.error('Image deletion error:', error);
      res.status(500).json({ 
        message: "Failed to delete image", 
        error: error.message 
      });
    }
  });

  // Payment routes - Stripe integration
  console.log('Stripe Config:', { 
    secret_key: process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING',
    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY ? 'SET' : 'MISSING'
  });

  // Create payment intent
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      console.log('Payment intent request body:', req.body);

      // Validate required fields
      if (!req.body.amount || !req.body.currency) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: amount or currency"
        });
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          message: "Payment gateway not configured properly"
        });
      }

      const { amount, currency = 'inr', metadata = {}, bookingIds } = req.body;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to smallest currency unit (paise for INR)
        currency: currency,
        metadata: {
          transactionId: req.body.transactionId || `txn_${Date.now()}`,
          customerName: req.body.name || 'Guest',
          customerPhone: req.body.number || '',
          bookingIds: bookingIds || '',
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      console.log('Payment intent created:', paymentIntent.id);

      // If bookingIds are provided, link them to this payment intent
      if (bookingIds) {
        const ids = bookingIds.split(',');
        for (const bookingId of ids) {
          if (bookingId.trim()) {
            try {
              await storage.updateBookingPaymentIntent(bookingId.trim(), paymentIntent.id);
              console.log('Linked booking', bookingId.trim(), 'to payment intent', paymentIntent.id);
            } catch (error) {
              console.error('Failed to link booking', bookingId.trim(), 'to payment:', error);
            }
          }
        }
      }

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });

    } catch (error: any) {
      console.error('Payment intent creation error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || "Payment intent creation failed",
        error: error.message
      });
    }
  });

  // Confirm payment and handle success
  app.post("/api/confirm-payment", async (req, res) => {
    try {
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: "Payment intent ID is required"
        });
      }

      // Retrieve the payment intent to check its status
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Payment was successful
        console.log('Payment confirmed:', paymentIntentId);
        
        // Update booking status to completed
        try {
          await db.update(bookings)
            .set({ 
              stripePaymentStatus: 'completed',
              status: 'confirmed'
            })
            .where(eq(bookings.stripePaymentIntentId, paymentIntentId));
          
          console.log('Booking status updated for payment:', paymentIntentId);
        } catch (dbError) {
          console.error('Failed to update booking status:', dbError);
        }
        
        res.json({
          success: true,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata
        });
      } else {
        res.json({
          success: false,
          status: paymentIntent.status,
          message: `Payment status: ${paymentIntent.status}`
        });
      }

    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Payment confirmation failed"
      });
    }
  });

  // Get payment status
  app.get("/api/payment-status/:paymentIntentId", async (req, res) => {
    try {
      const { paymentIntentId } = req.params;

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      res.json({
        success: true,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      });

    } catch (error: any) {
      console.error('Payment status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to retrieve payment status"
      });
    }
  });

  // Create booking with payment intent
  app.post("/api/create-booking-payment", authenticateToken, async (req: any, res) => {
    try {
      const { facilityId, date, startTime, endTime, totalAmount, notes } = req.body;
      
      // Validate required fields
      if (!facilityId || !date || !startTime || !endTime || !totalAmount) {
        return res.status(400).json({
          message: "Missing required booking fields"
        });
      }

      // Create payment intent first
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to paise
        currency: 'inr',
        metadata: {
          facilityId,
          userId: req.user.userId,
          bookingDate: date,
          startTime,
          endTime
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create booking with payment intent ID
      const bookingData = insertBookingSchema.parse({
        userId: req.user.userId,
        facilityId,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        totalAmount: totalAmount.toString(), // Convert to string for decimal field
        notes: notes || '',
        stripePaymentIntentId: paymentIntent.id,
        stripePaymentStatus: 'pending',
        paymentMethod: 'stripe',
        status: 'pending'
      });

      const booking = await storage.createBooking(bookingData);

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        booking
      });

    } catch (error: any) {
      console.error('Booking payment creation error:', error);
      res.status(500).json({
        message: error.message || "Failed to create booking payment"
      });
    }
  });

  // Geocoding endpoint to avoid CORS issues
  app.get("/api/geocode/:pincode", async (req, res) => {
    const { pincode } = req.params;
    
    if (!pincode || pincode.length !== 6) {
      return res.status(400).json({ error: "Invalid pincode format" });
    }

    try {
      // Try OpenStreetMap Nominatim first
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pincode)}&countrycodes=in&limit=1`,
        {
          headers: {
            'User-Agent': 'QuickCourt-SportsBooking/1.0'
          }
        }
      );

      if (nominatimResponse.ok) {
        const nominatimData = await nominatimResponse.json();
        if (nominatimData && nominatimData.length > 0) {
          return res.json({
            latitude: parseFloat(nominatimData[0].lat),
            longitude: parseFloat(nominatimData[0].lon),
            source: 'nominatim'
          });
        }
      }

      // Fallback to postal pincode API
      const fallbackResponse = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`
      );

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData && fallbackData[0] && fallbackData[0].Status === 'Success' && fallbackData[0].PostOffice) {
          const postOffice = fallbackData[0].PostOffice[0];
          
          // State-based approximate coordinates
          const stateCoords = {
            'Gujarat': { lat: 23.0225, lng: 72.5714 },
            'Maharashtra': { lat: 19.7515, lng: 75.7139 },
            'Karnataka': { lat: 15.3173, lng: 75.7139 },
            'Tamil Nadu': { lat: 11.1271, lng: 78.6569 },
            'Delhi': { lat: 28.7041, lng: 77.1025 },
            'West Bengal': { lat: 22.9868, lng: 87.8550 },
            'Rajasthan': { lat: 27.0238, lng: 74.2179 },
            'Uttar Pradesh': { lat: 26.8467, lng: 80.9462 }
          };
          
          const coords = (stateCoords as any)[postOffice.State] || { lat: 20.5937, lng: 78.9629 };
          
          return res.json({
            latitude: coords.lat,
            longitude: coords.lng,
            source: 'postal-api',
            state: postOffice.State,
            district: postOffice.District
          });
        }
      }

      res.status(404).json({ error: "Location not found for this pincode" });
    } catch (error) {
      console.error('Geocoding server error:', error);
      res.status(500).json({ error: "Failed to geocode pincode" });
    }
  });

  // Admin-only routes
  app.get("/api/admin/users", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get pending facilities for approval
  app.get("/api/admin/facilities/pending", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const facilities = await storage.getPendingFacilities();
      res.json(facilities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending facilities", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get all facilities with approval status
  app.get("/api/admin/facilities/all", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const facilities = await storage.getAllFacilitiesForAdmin();
      res.json(facilities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all facilities", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get admin dashboard statistics
  app.get("/api/admin/dashboard/stats", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const stats = await storage.getAdminDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get recent activity for admin dashboard
  app.get("/api/admin/dashboard/recent-activity", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const activity = await storage.getRecentActivity();
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent activity", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get system health status
  app.get("/api/admin/dashboard/system-health", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const health = await storage.getSystemHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system health", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/admin/bookings", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/admin/users/:id/role", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const { role } = req.body;
      if (!['user', 'facility_owner', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const success = await storage.updateUserRole(req.params.id, role);
      if (success) {
        res.json({ message: "User role updated successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Update user details (name, phone, skill level, role)
  app.patch("/api/admin/users/:id", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const { firstName, lastName, phone, skillLevel, role } = req.body;
      
      // Validate role if provided
      if (role && !['user', 'facility_owner', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Validate skill level if provided
      if (skillLevel && !['beginner', 'intermediate', 'advanced'].includes(skillLevel)) {
        return res.status(400).json({ message: "Invalid skill level" });
      }

      const updates: any = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (phone !== undefined) updates.phone = phone;
      if (skillLevel !== undefined) updates.skillLevel = skillLevel;
      if (role !== undefined) updates.role = role;

      const updatedUser = await storage.updateUser(req.params.id, updates);
      if (updatedUser) {
        res.json({ message: "User updated successfully", user: updatedUser });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Upload profile image for user
  app.post("/api/admin/users/:id/profile-image", authenticateToken, requireRole(['admin']), upload.single('profileImage'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const uploadedImage = await imageUploadService.uploadImage(req.file, 'profile-images');
      
      // Update user's profile image
      const updatedUser = await storage.updateUser(req.params.id, { profileImage: uploadedImage.url });
      if (updatedUser) {
        res.json({ message: "Profile image updated successfully", imageUrl: uploadedImage.url });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to upload profile image", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Toggle facility visibility (unlist/relist)
  app.patch("/api/admin/facilities/:id/visibility", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean value" });
      }

      const updatedFacility = await storage.updateFacility(req.params.id, { isActive });
      if (updatedFacility) {
        const action = isActive ? 'relisted' : 'unlisted';
        res.json({ message: `Facility ${action} successfully`, facility: updatedFacility });
      } else {
        res.status(404).json({ message: "Facility not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle facility visibility", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/admin/facilities/:id/approve", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const { isApproved, rejectionReason } = req.body;
      const success = await storage.updateFacilityApproval(req.params.id, isApproved, rejectionReason, req.user.userId);
      if (success) {
        res.json({ message: `Facility ${isApproved ? 'approved' : 'rejected'} successfully` });
      } else {
        res.status(404).json({ message: "Facility not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update facility approval", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
