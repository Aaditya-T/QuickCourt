import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { EmailService } from "./emailService";
import type { InsertUser, User } from "@shared/schema";

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
  private static readonly OTP_EXPIRY_MINUTES = 10;

  static async sendSignupOTP(email: string, userData: Omit<InsertUser, 'id'>) {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return { success: false, message: "User already exists with this email" };
    }

    // Generate and send OTP
    const code = EmailService.generateOTP();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP
    await storage.createOtpCode({
      email,
      code,
      type: 'signup',
      expiresAt,
    });

    // Send email
    const emailResult = await EmailService.sendOTP(email, code, 'signup');
    if (!emailResult.success) {
      return { success: false, message: "Failed to send verification email" };
    }

    return { success: true, message: "Verification code sent to your email" };
  }

  static async verifySignupOTP(email: string, code: string, userData: Omit<InsertUser, 'id'>) {
    // Verify OTP
    const otpCode = await storage.getValidOtpCode(email, code, 'signup');
    if (!otpCode) {
      return { success: false, message: "Invalid or expired verification code" };
    }

    // Mark OTP as used
    await storage.markOtpCodeAsUsed(otpCode.id);

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const user = await storage.createUser({
      ...userData,
      email,
      password: hashedPassword,
      isEmailVerified: true,
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      this.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return {
      success: true,
      message: "Account created successfully",
      user: { ...user, password: undefined },
      token,
    };
  }

  static async sendLoginOTP(email: string) {
    // Check if user exists
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return { success: false, message: "No account found with this email" };
    }

    // Generate and send OTP
    const code = EmailService.generateOTP();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP
    await storage.createOtpCode({
      email,
      code,
      type: 'login',
      expiresAt,
    });

    // Send email
    const emailResult = await EmailService.sendOTP(email, code, 'login');
    if (!emailResult.success) {
      return { success: false, message: "Failed to send login code" };
    }

    return { success: true, message: "Login code sent to your email" };
  }

  static async verifyLoginOTP(email: string, code: string) {
    // Verify OTP
    const otpCode = await storage.getValidOtpCode(email, code, 'login');
    if (!otpCode) {
      return { success: false, message: "Invalid or expired login code" };
    }

    // Mark OTP as used
    await storage.markOtpCodeAsUsed(otpCode.id);

    // Get user
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      this.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return {
      success: true,
      message: "Login successful",
      user: { ...user, password: undefined },
      token,
    };
  }

  static async traditionalLogin(email: string, password: string) {
    // Get user
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return { success: false, message: "Invalid email or password" };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return { success: false, message: "Invalid email or password" };
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      this.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return {
      success: true,
      message: "Login successful",
      user: { ...user, password: undefined },
      token,
    };
  }

  static verifyToken(token: string) {
    try {
      return jwt.verify(token, this.JWT_SECRET) as any;
    } catch (error) {
      return null;
    }
  }

  static async cleanupExpiredOTPs() {
    return await storage.cleanupExpiredOtpCodes();
  }
}