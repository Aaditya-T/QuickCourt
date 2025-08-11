import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { AuthService } from "./authService";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { insertUserSchema, insertFacilitySchema, insertBookingSchema, insertMatchSchema, insertReviewSchema, bookings } from "@shared/schema";
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
      const { date, startTime, endTime, totalAmount, ...restData } = req.body;
      
      const bookingData = insertBookingSchema.parse({
        ...restData,
        userId: req.user.userId,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
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

  // Image upload routes
  app.post("/api/upload/image", authenticateToken, upload.single('image'), async (req: any, res) => {
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
        user: req.user
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

  const httpServer = createServer(app);
  return httpServer;
}
