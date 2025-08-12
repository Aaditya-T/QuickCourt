import type { Express } from "express";
import { storage } from "../storage";
import { imageUploadService } from "../imageUploadService";
import multer from "multer";
import { EmailService } from "../emailService";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export function registerAdminRoutes(app: Express, authenticateToken: any, requireRole: any) {
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

  // Ban user
  app.patch("/api/admin/users/:id/ban", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.user.userId;
      
      // Prevent admins from banning themselves
      if (targetUserId === currentUserId) {
        return res.status(400).json({ 
          message: "You cannot ban yourself" 
        });
      }

      // Get the target user to check their current role
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent admins from banning other admin accounts
      if (targetUser.role === 'admin') {
        return res.status(403).json({ 
          message: "Access denied: You cannot ban other admin accounts" 
        });
      }

      const success = await storage.banUser(targetUserId);
      if (success) {
        res.json({ message: "User banned successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to ban user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Unban user
  app.patch("/api/admin/users/:id/unban", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const targetUserId = req.params.id;
      
      // Get the target user to check their current role
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const success = await storage.unbanUser(targetUserId);
      if (success) {
        res.json({ message: "User unbanned successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to unban user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Update user details (name, phone, skill level, role)
  app.patch("/api/admin/users/:id", authenticateToken, requireRole(['admin']), async (req: any, res) => {
    try {
      const { firstName, lastName, phone, skillLevel, role } = req.body;
      const targetUserId = req.params.id;
      const currentUserId = req.user.userId;
      
      // Get the target user to check their current role
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent admins from editing other admin accounts
      if (targetUser.role === 'admin' && targetUserId !== currentUserId) {
        return res.status(403).json({ 
          message: "Access denied: You cannot edit other admin accounts" 
        });
      }
      
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

      const updatedUser = await storage.updateUser(targetUserId, updates);
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
        // Send email notification to facility owner
        try {
          const facility = await storage.getFacility(req.params.id);
          if (facility) {
            const owner = await storage.getUser(facility.ownerId);
            if (owner) {
              await EmailService.sendFacilityApprovalNotification(
                owner.email,
                facility.name,
                isApproved,
                rejectionReason
              );
            }
          }
        } catch (emailError) {
          console.error('Failed to send facility approval notification:', emailError);
          // Don't fail the request if email fails
        }
        
        res.json({ message: `Facility ${isApproved ? 'approved' : 'rejected'} successfully` });
      } else {
        res.status(404).json({ message: "Facility not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update facility approval", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
}
