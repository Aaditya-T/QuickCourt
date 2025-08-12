import type { Express } from "express";
import { AuthService } from "../authService";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { insertUserSchema } from "@shared/schema";
import { storage } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Rate limiter for OTP requests: 2 requests per minute per IP
const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // limit each IP to 2 requests per windowMs
  message: {
    message: "Too many OTP requests, please try again later. Limit: 2 requests per minute."
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many OTP requests, please try again later. Limit: 2 requests per minute.",
      retryAfter: Math.ceil(60 / 1000)
    });
  }
});

export function registerAuthRoutes(app: Express) {
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

      // Check if user is banned
      if (user.isBanned) {
        return res.status(403).json({ message: "Your account has been banned. Please contact support." });
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
}
