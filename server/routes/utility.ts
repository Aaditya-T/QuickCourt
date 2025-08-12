import type { Express } from "express";
import { storage } from "../storage";
import { imageUploadService } from "../imageUploadService";
import multer from "multer";
import { insertGameSchema } from "@shared/schema";

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

export function registerUtilityRoutes(app: Express, authenticateToken: any, requireRole: any) {
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
}
