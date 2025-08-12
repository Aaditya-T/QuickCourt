import type { Express } from "express";
import { storage } from "../storage";
import { insertBookingSchema } from "@shared/schema";

export function registerBookingRoutes(app: Express, authenticateToken: any) {
  // Booking routes
  app.get("/api/bookings", authenticateToken, async (req: any, res) => {
    try {
      const bookings = await storage.getBookings(req.user.userId);
      console.log('Bookings returned:', JSON.stringify(bookings, null, 2));
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
}
