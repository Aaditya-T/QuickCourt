import type { Express } from "express";
import { storage } from "../storage";
import { insertFacilitySchema, insertFacilityCourtSchema, insertReviewSchema } from "@shared/schema";
import { EmailService } from "../emailService";

export function registerFacilityRoutes(app: Express, authenticateToken: any, requireRole: any) {
  // Facility routes
  app.get("/api/facilities", async (req, res) => {
    try {
      const { city, sportType, searchTerm, sortBy, sortOrder } = req.query;
      console.log('🔍 API: Searching facilities with filters:', { city, sportType, searchTerm, sortBy, sortOrder });
      
      const facilities = await storage.getFacilities({
        city: city as string,
        sportType: sportType as string,
        searchTerm: searchTerm as string,
        sortBy: sortBy as 'rating' | 'price' | 'name',
        sortOrder: sortOrder as 'asc' | 'desc',
      });
      
      console.log('📊 API: Found facilities:', facilities.length);
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

      console.log('🔍 Facility fields:', facilityFields);
      
      const facilityData = insertFacilitySchema.parse({
        ...facilityFields,
        ownerId: req.user.userId,
      });
      
      const facility = await storage.createFacility(facilityData);
      console.log('🔍 Facility created:', facility);
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
      } else {
        console.log('🔍 No game courts provided');
      }

      //send email to admins about new facility pending approval
      const admins = await storage.getAllUsers();
      const adminEmails = admins.filter(user => user.role === 'admin').map(user => user.email);
      if (adminEmails.length > 0) {
        await EmailService.sendFacilityCreationNotification(adminEmails, facility.name, `${req.user.firstName} ${req.user.lastName}`, facility.id);
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

      // Check if there are any active bookings for this facility (only if facility is approved)
      if (facility.isApproved) {
        const activeBookings = await storage.getBookingsByFacility(req.params.id);
        const hasActiveBookings = activeBookings.some((booking: any) => 
          new Date(booking.date) > new Date() && booking.status !== "cancelled"
        );

        if (hasActiveBookings) {
          return res.status(400).json({ 
            message: "Cannot delete facility with active or future bookings. Please cancel all bookings first." 
          });
        }
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
      const { insertReviewSchema } = await import("@shared/schema");
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
}
