import jwt from "jsonwebtoken";
import { storage } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
export const authenticateToken = (req: any, res: any, next: any) => {
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
export const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};
