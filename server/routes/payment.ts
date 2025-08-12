import type { Express } from "express";
import { storage } from "../storage";
import { insertBookingSchema } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { bookings } from "@shared/schema";
import Stripe from "stripe";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export function registerPaymentRoutes(app: Express, authenticateToken: any) {
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
}
