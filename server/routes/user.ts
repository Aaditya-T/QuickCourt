import type { Express } from "express";
import { storage } from "../storage";
import { imageUploadService } from "../imageUploadService";
import multer from "multer";

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

export function registerUserRoutes(app: Express, authenticateToken: any) {
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
}
