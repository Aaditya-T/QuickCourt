import { z } from "zod";

// Custom validation helpers
const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
const zipCodeRegex = /^\d{5}(-\d{4})?$/;
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Operating hours schema
const operatingHoursSchema = z.object({
  monday: z.union([
    z.object({ closed: z.literal(true) }),
    z.object({ 
      open: z.string().regex(timeRegex, "Invalid time format (HH:MM)"), 
      close: z.string().regex(timeRegex, "Invalid time format (HH:MM)") 
    })
  ]),
  tuesday: z.union([
    z.object({ closed: z.literal(true) }),
    z.object({ 
      open: z.string().regex(timeRegex, "Invalid time format (HH:MM)"), 
      close: z.string().regex(timeRegex, "Invalid time format (HH:MM)") 
    })
  ]),
  wednesday: z.union([
    z.object({ closed: z.literal(true) }),
    z.object({ 
      open: z.string().regex(timeRegex, "Invalid time format (HH:MM)"), 
      close: z.string().regex(timeRegex, "Invalid time format (HH:MM)") 
    })
  ]),
  thursday: z.union([
    z.object({ closed: z.literal(true) }),
    z.object({ 
      open: z.string().regex(timeRegex, "Invalid time format (HH:MM)"), 
      close: z.string().regex(timeRegex, "Invalid time format (HH:MM)") 
    })
  ]),
  friday: z.union([
    z.object({ closed: z.literal(true) }),
    z.object({ 
      open: z.string().regex(timeRegex, "Invalid time format (HH:MM)"), 
      close: z.string().regex(timeRegex, "Invalid time format (HH:MM)") 
    })
  ]),
  saturday: z.union([
    z.object({ closed: z.literal(true) }),
    z.object({ 
      open: z.string().regex(timeRegex, "Invalid time format (HH:MM)"), 
      close: z.string().regex(timeRegex, "Invalid time format (HH:MM)") 
    })
  ]),
  sunday: z.union([
    z.object({ closed: z.literal(true) }),
    z.object({ 
      open: z.string().regex(timeRegex, "Invalid time format (HH:MM)"), 
      close: z.string().regex(timeRegex, "Invalid time format (HH:MM)") 
    })
  ])
}).refine((data) => {
  // Validate that open time is before close time for each day
  const days = Object.keys(data) as Array<keyof typeof data>;
  for (const day of days) {
    const dayData = data[day];
    if (!('closed' in dayData)) {
      const openTime = dayData.open.split(':').map(Number);
      const closeTime = dayData.close.split(':').map(Number);
      const openMinutes = openTime[0] * 60 + openTime[1];
      const closeMinutes = closeTime[0] * 60 + closeTime[1];
      
      if (openMinutes >= closeMinutes) {
        return false;
      }
    }
  }
  return true;
}, {
  message: "Opening time must be before closing time for all days"
});

// Facility form validation schema
export const facilityFormSchema = z.object({
  name: z.string()
    .min(3, "Facility name must be at least 3 characters")
    .max(100, "Facility name must not exceed 100 characters")
    .regex(/^[a-zA-Z0-9\s\-'&.]+$/, "Facility name contains invalid characters"),
  
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must not exceed 1000 characters")
    .optional()
    .or(z.literal("")),
  
  address: z.string()
    .min(5, "Address must be at least 5 characters")
    .max(200, "Address must not exceed 200 characters"),
  
  city: z.string()
    .min(2, "City must be at least 2 characters")
    .max(50, "City must not exceed 50 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "City name contains invalid characters"),
  
  state: z.string()
    .min(2, "State must be at least 2 characters")
    .max(50, "State must not exceed 50 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "State name contains invalid characters"),
  
  zipCode: z.string()
    .regex(zipCodeRegex, "Invalid zip code format (12345 or 12345-6789)"),
  
  sportTypes: z.array(z.string())
    .min(1, "Select at least one sport type")
    .max(6, "Cannot select more than 6 sport types"),
  
  pricePerHour: z.number()
    .min(0.01, "Price must be greater than 0")
    .max(10000, "Price must not exceed ₹10,000 per hour"),
  
  amenities: z.array(z.string()).default([]),
  
  images: z.array(z.string().url("Invalid image URL")).default([]),
  
  operatingHours: z.union([
    z.string().transform((val) => {
      try {
        const parsed = JSON.parse(val);
        return operatingHoursSchema.parse(parsed);
      } catch {
        throw new Error("Invalid operating hours format");
      }
    }),
    operatingHoursSchema
  ])
});

// Login form validation schema
export const loginFormSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email must not exceed 255 characters"),
  
  password: z.string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must not exceed 128 characters")
});

// Signup form validation schema
export const signupFormSchema = z.object({
  firstName: z.string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must not exceed 50 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "First name contains invalid characters"),
  
  lastName: z.string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must not exceed 50 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Last name contains invalid characters"),
  
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email must not exceed 255 characters"),
  
  phone: z.string()
    .regex(phoneRegex, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
  
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  
  confirmPassword: z.string()
    .min(1, "Please confirm your password"),
  
  role: z.enum(["user", "facility_owner"], {
    errorMap: () => ({ message: "Please select a valid account type" })
  }),
  
  skillLevel: z.enum(["beginner", "intermediate", "advanced"], {
    errorMap: () => ({ message: "Please select a valid skill level" })
  }).optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
}).refine((data) => {
  // Skill level is required for regular users
  if (data.role === "user" && !data.skillLevel) {
    return false;
  }
  return true;
}, {
  message: "Skill level is required for user accounts",
  path: ["skillLevel"]
});

// OTP verification schema
export const otpVerificationSchema = z.object({
  code: z.string()
    .min(6, "OTP must be 6 digits")
    .max(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers")
});

// Booking form validation schema
export const bookingFormSchema = z.object({
  facilityId: z.string().min(1, "Facility ID is required"),
  date: z.date({
    required_error: "Please select a date",
    invalid_type_error: "Invalid date format"
  }).refine((date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }, "Cannot book for past dates"),
  
  startTime: z.date({
    required_error: "Please select a start time",
    invalid_type_error: "Invalid start time format"
  }),
  
  endTime: z.date({
    required_error: "Please select an end time",
    invalid_type_error: "Invalid end time format"
  }),
  
  notes: z.string()
    .max(500, "Notes must not exceed 500 characters")
    .optional()
    .or(z.literal(""))
}).refine((data) => data.endTime > data.startTime, {
  message: "End time must be after start time",
  path: ["endTime"]
}).refine((data) => {
  const duration = data.endTime.getTime() - data.startTime.getTime();
  const maxDuration = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  return duration <= maxDuration;
}, {
  message: "Booking duration cannot exceed 8 hours",
  path: ["endTime"]
});

// Match creation form validation schema
export const matchFormSchema = z.object({
  title: z.string()
    .min(5, "Match title must be at least 5 characters")
    .max(100, "Match title must not exceed 100 characters"),
  
  description: z.string()
    .max(500, "Description must not exceed 500 characters")
    .optional()
    .or(z.literal("")),
  
  facilityId: z.string().min(1, "Please select a facility"),
  
  sportType: z.enum(["badminton", "tennis", "basketball", "football", "table_tennis", "squash"], {
    errorMap: () => ({ message: "Please select a valid sport type" })
  }),
  
  skillLevel: z.enum(["beginner", "intermediate", "advanced"], {
    errorMap: () => ({ message: "Please select a valid skill level" })
  }),
  
  maxPlayers: z.number()
    .min(2, "Match must allow at least 2 players")
    .max(20, "Match cannot exceed 20 players"),
  
  costPerPlayer: z.number()
    .min(0, "Cost cannot be negative")
    .max(5000, "Cost per player cannot exceed ₹5,000"),
  
  date: z.date({
    required_error: "Please select a date",
    invalid_type_error: "Invalid date format"
  }).refine((date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }, "Cannot create match for past dates"),
  
  startTime: z.date({
    required_error: "Please select a start time",
    invalid_type_error: "Invalid start time format"
  }),
  
  endTime: z.date({
    required_error: "Please select an end time",
    invalid_type_error: "Invalid end time format"
  })
}).refine((data) => data.endTime > data.startTime, {
  message: "End time must be after start time",
  path: ["endTime"]
});

// Review form validation schema
export const reviewFormSchema = z.object({
  facilityId: z.string().min(1, "Facility ID is required"),
  rating: z.number()
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars")
    .int("Rating must be a whole number"),
  
  comment: z.string()
    .max(1000, "Comment must not exceed 1000 characters")
    .optional()
    .or(z.literal(""))
});

// Export types for TypeScript
export type FacilityFormData = z.infer<typeof facilityFormSchema>;
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type SignupFormData = z.infer<typeof signupFormSchema>;
export type OtpVerificationData = z.infer<typeof otpVerificationSchema>;
export type BookingFormData = z.infer<typeof bookingFormSchema>;
export type MatchFormData = z.infer<typeof matchFormSchema>;
export type ReviewFormData = z.infer<typeof reviewFormSchema>;