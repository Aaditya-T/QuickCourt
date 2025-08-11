import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["user", "facility_owner", "admin"]);
export const sportTypeEnum = pgEnum("sport_type", ["badminton", "tennis", "basketball", "football", "table_tennis", "squash"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "cancelled", "completed"]);
export const matchStatusEnum = pgEnum("match_status", ["open", "full", "in_progress", "completed", "cancelled"]);
export const skillLevelEnum = pgEnum("skill_level", ["beginner", "intermediate", "advanced"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  profileImage: text("profile_image"),
  skillLevel: skillLevelEnum("skill_level").default("beginner"),
  isEmailVerified: boolean("is_email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(), // 'signup', 'login', 'password_reset'
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Games table with name and emoji for each sport
export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // e.g., "Badminton", "Tennis"
  emoji: text("emoji").notNull(), // e.g., "🏸", "🎾"
  sportType: sportTypeEnum("sport_type").notNull().unique(), // reference to existing sport types
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const facilities = pgTable("facilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  sportTypes: text("sport_types").array().notNull(), // Keep for backward compatibility
  pricePerHour: decimal("price_per_hour", { precision: 10, scale: 2 }).notNull(),
  images: text("images").array().default([]),
  amenities: text("amenities").array().default([]),
  operatingHours: text("operating_hours").notNull(), // JSON string: {"monday": {"open": "06:00", "close": "23:00"}, ...}
  isActive: boolean("is_active").default(true),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0.0"),
  totalReviews: integer("total_reviews").default(0),
  // Facility approval fields
  isApproved: boolean("is_approved").default(false),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Index for efficient querying of approved facilities
  approvedActiveIdx: index("idx_facilities_approved_active").on(table.isApproved, table.isActive).where(sql`${table.isApproved} = true AND ${table.isActive} = true`),
  // Index for admin queries on approval status
  approvalStatusIdx: index("idx_facilities_approval_status").on(table.isApproved, table.createdAt),
  // Index for rating-based queries (descending order for better performance)
  ratingIdx: index("idx_facilities_rating").on(table.rating),
}));

// Junction table for facilities and games with court count
export const facilityCourts = pgTable("facility_courts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id").references(() => facilities.id).notNull(),
  gameId: varchar("game_id").references(() => games.id).notNull(),
  courtCount: integer("court_count").notNull().default(1), // Number of courts for this game at this facility
  pricePerHour: decimal("price_per_hour", { precision: 10, scale: 2 }).notNull(), // Game-specific pricing
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate facility-game combinations
  facilityGameIdx: index("idx_facility_game").on(table.facilityId, table.gameId),
}));

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  facilityId: varchar("facility_id").references(() => facilities.id).notNull(),
  gameId: varchar("game_id").references(() => games.id).notNull(), // Now booking for a specific game
  courtNumber: integer("court_number").notNull(), // Auto-assigned court number
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: bookingStatusEnum("status").default("pending"),
  notes: text("notes"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripePaymentStatus: varchar("stripe_payment_status").default("pending"),
  paymentMethod: varchar("payment_method").default("stripe"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Index for efficient booking queries
  facilityGameTimeIdx: index("idx_booking_facility_game_time").on(table.facilityId, table.gameId, table.startTime, table.endTime),
  // Index for court availability checks
  courtTimeIdx: index("idx_booking_court_time").on(table.facilityId, table.gameId, table.courtNumber, table.startTime),
}));

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").references(() => users.id).notNull(),
  facilityId: varchar("facility_id").references(() => facilities.id).notNull(),
  gameId: varchar("game_id").references(() => games.id).notNull(), // Now matches are for specific games
  title: text("title").notNull(),
  description: text("description"),
  sportType: sportTypeEnum("sport_type").notNull(), // Keep for backward compatibility
  skillLevel: skillLevelEnum("skill_level").notNull(),
  maxPlayers: integer("max_players").notNull(),
  currentPlayers: integer("current_players").default(1),
  costPerPlayer: decimal("cost_per_player", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: matchStatusEnum("status").default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const matchParticipants = pgTable("match_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").references(() => matches.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  facilityId: varchar("facility_id").references(() => facilities.id).notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  facilities: many(facilities),
  bookings: many(bookings),
  createdMatches: many(matches),
  matchParticipants: many(matchParticipants),
  reviews: many(reviews),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  facilityCourts: many(facilityCourts),
  bookings: many(bookings),
  matches: many(matches),
}));

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  owner: one(users, { fields: [facilities.ownerId], references: [users.id] }),
  approver: one(users, { fields: [facilities.approvedBy], references: [users.id] }),
  facilityCourts: many(facilityCourts),
  bookings: many(bookings),
  matches: many(matches),
  reviews: many(reviews),
}));

export const facilityCourtsRelations = relations(facilityCourts, ({ one }) => ({
  facility: one(facilities, { fields: [facilityCourts.facilityId], references: [facilities.id] }),
  game: one(games, { fields: [facilityCourts.gameId], references: [games.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  facility: one(facilities, { fields: [bookings.facilityId], references: [facilities.id] }),
  game: one(games, { fields: [bookings.gameId], references: [games.id] }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  creator: one(users, { fields: [matches.creatorId], references: [users.id] }),
  facility: one(facilities, { fields: [matches.facilityId], references: [facilities.id] }),
  game: one(games, { fields: [matches.gameId], references: [games.id] }),
  participants: many(matchParticipants),
}));

export const matchParticipantsRelations = relations(matchParticipants, ({ one }) => ({
  match: one(matches, { fields: [matchParticipants.matchId], references: [matches.id] }),
  user: one(users, { fields: [matchParticipants.userId], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  facility: one(facilities, { fields: [reviews.facilityId], references: [facilities.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export const insertFacilitySchema = createInsertSchema(facilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  latitude: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
  longitude: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
  pricePerHour: z.union([z.string(), z.number()]).transform((val) => String(val)),
});

export const insertFacilityCourtSchema = createInsertSchema(facilityCourts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  pricePerHour: z.union([z.string(), z.number()]).transform((val) => String(val)),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMatchParticipantSchema = createInsertSchema(matchParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;
export type Facility = typeof facilities.$inferSelect;
export type InsertFacilityCourt = z.infer<typeof insertFacilityCourtSchema>;
export type FacilityCourt = typeof facilityCourts.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatchParticipant = z.infer<typeof insertMatchParticipantSchema>;
export type MatchParticipant = typeof matchParticipants.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;
