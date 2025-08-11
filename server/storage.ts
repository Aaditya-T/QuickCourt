import {
  users, facilities, bookings, matches, matchParticipants, reviews, otpCodes,
  games, facilityCourts,
  type User, type InsertUser, type Facility, type InsertFacility,
  type Booking, type InsertBooking, type Match, type InsertMatch,
  type MatchParticipant, type InsertMatchParticipant, type Review, type InsertReview,
  type OtpCode, type InsertOtpCode, type Game, type InsertGame,
  type FacilityCourt, type InsertFacilityCourt
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, like, or, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Game operations
  getGames(): Promise<Game[]>;
  getGame(id: string): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;

  // Facility operations
  getFacilities(filters?: { city?: string; sportType?: string; searchTerm?: string; sortBy?: string; sortOrder?: string }): Promise<Facility[]>;
  getFacility(id: string): Promise<Facility | undefined>;
  getFacilitiesByOwner(ownerId: string): Promise<Facility[]>;
  createFacility(facility: InsertFacility): Promise<Facility>;
  updateFacility(id: string, updates: Partial<InsertFacility>): Promise<Facility | undefined>;
  deleteFacility(id: string): Promise<boolean>;
  hardDeleteFacility(id: string): Promise<boolean>;

  // Facility Court operations
  getFacilityCourts(facilityId: string): Promise<FacilityCourt[]>;
  createFacilityCourt(facilityCourt: InsertFacilityCourt): Promise<FacilityCourt>;
  updateFacilityCourt(id: string, updates: Partial<InsertFacilityCourt>): Promise<FacilityCourt | undefined>;
  deleteFacilityCourt(id: string): Promise<boolean>;

  // Booking operations
  getBookings(userId?: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByFacility(facilityId: string, date?: Date): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined>;
  cancelBooking(id: string): Promise<boolean>;
  updateBookingPaymentIntent(bookingId: string, paymentIntentId: string): Promise<boolean>;
  // New court-based booking methods
  checkCourtAvailability(facilityId: string, gameId: string, startTime: Date, endTime: Date): Promise<number | null>;
  getAvailableCourt(facilityId: string, gameId: string, startTime: Date, endTime: Date): Promise<number | null>;

  // Match operations
  getMatches(filters?: { city?: string; sportType?: string; skillLevel?: string }): Promise<Match[]>;
  getMatch(id: string): Promise<Match | undefined>;
  getMatchesByUser(userId: string): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: string, updates: Partial<InsertMatch>): Promise<Match | undefined>;
  deleteMatch(id: string): Promise<boolean>;

  // Match participant operations
  joinMatch(matchId: string, userId: string): Promise<MatchParticipant>;
  leaveMatch(matchId: string, userId: string): Promise<boolean>;
  getMatchParticipants(matchId: string): Promise<MatchParticipant[]>;

  // Review operations
  getReviewsByFacility(facilityId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // OTP operations
  createOtpCode(otpCode: InsertOtpCode): Promise<OtpCode>;
  getValidOtpCode(email: string, code: string, type: string): Promise<OtpCode | undefined>;
  markOtpCodeAsUsed(id: string): Promise<boolean>;
  cleanupExpiredOtpCodes(): Promise<boolean>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<boolean>;
  updateFacilityApproval(id: string, isApproved: boolean, rejectionReason?: string, approvedBy?: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Game operations
  async getGames(): Promise<Game[]> {
    return await db.select().from(games).orderBy(asc(games.name));
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || undefined;
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values(insertGame).returning();
    return game;
  }

  // Facility operations
  async getFacilities(filters?: { city?: string; sportType?: string; searchTerm?: string; sortBy?: string; sortOrder?: string }): Promise<Facility[]> {
    let conditions = [eq(facilities.isActive, true)];

    if (filters?.city) {
      conditions.push(like(facilities.city, `%${filters.city.toLowerCase()}%`));
    }
    if (filters?.sportType && filters.sportType !== "all" && filters.sportType !== "") {
      // Use SQL operator to check if the sport type is in the array
      conditions.push(sql`${filters.sportType} = ANY(${facilities.sportTypes})`);
    }
    if (filters?.searchTerm) {
      conditions.push(
        or(
          like(facilities.name, `%${filters.searchTerm.toLowerCase()}%`),
          like(facilities.description, `%${filters.searchTerm.toLowerCase()}%`)
        )!
      );
    }

    // Apply sorting - default to rating desc
    const sortBy = filters?.sortBy || 'rating';
    const sortOrder = filters?.sortOrder || 'desc';
    
    let orderByClause;
    switch (sortBy) {
      case 'rating':
        orderByClause = sortOrder === 'desc' ? desc(facilities.rating) : asc(facilities.rating);
        break;
      case 'price':
        orderByClause = sortOrder === 'desc' ? desc(facilities.pricePerHour) : asc(facilities.pricePerHour);
        break;
      case 'name':
        orderByClause = sortOrder === 'desc' ? desc(facilities.name) : asc(facilities.name);
        break;
      default:
        orderByClause = desc(facilities.rating);
    }

    return await db.select().from(facilities).where(and(...conditions)).orderBy(orderByClause);
  }

  async getFacility(id: string): Promise<Facility | undefined> {
    const [facility] = await db.select().from(facilities).where(eq(facilities.id, id));
    
    if (!facility) {
      return undefined;
    }

    // Get facility courts for this facility
    const courts = await this.getFacilityCourts(id);
    
    return {
      ...facility,
      facilityCourts: courts
    } as any;
  }

  async getFacilitiesByOwner(ownerId: string): Promise<Facility[]> {
    return await db.select().from(facilities).where(eq(facilities.ownerId, ownerId)).orderBy(desc(facilities.createdAt));
  }

  async createFacility(facility: InsertFacility): Promise<Facility> {
    const [newFacility] = await db.insert(facilities).values(facility).returning();
    return newFacility;
  }

  async updateFacility(id: string, updates: Partial<InsertFacility>): Promise<Facility | undefined> {
    console.log('Storage: Updating facility', id, 'with updates:', updates);
    const [facility] = await db.update(facilities).set({ ...updates, updatedAt: new Date() }).where(eq(facilities.id, id)).returning();
    console.log('Storage: Update result:', facility);
    return facility || undefined;
  }

  async deleteFacility(id: string): Promise<boolean> {
    const result = await db.update(facilities).set({ isActive: false, updatedAt: new Date() }).where(eq(facilities.id, id));
    return (result.rowCount || 0) > 0;
  }

  async hardDeleteFacility(id: string): Promise<boolean> {
    const result = await db.delete(facilities).where(eq(facilities.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Booking operations
  async getBookings(userId?: string): Promise<Booking[]> {
    if (userId) {
      return await db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.date));
    }
    return await db.select().from(bookings).orderBy(desc(bookings.date));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingsByFacility(facilityId: string, date?: Date): Promise<Booking[]> {
    let conditions = [eq(bookings.facilityId, facilityId)];

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      conditions.push(gte(bookings.date, startOfDay));
      conditions.push(lte(bookings.date, endOfDay));
    }

    return await db.select().from(bookings)
      .where(and(...conditions))
      .orderBy(asc(bookings.startTime));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set({ ...updates, updatedAt: new Date() }).where(eq(bookings.id, id)).returning();
    return booking || undefined;
  }

  async cancelBooking(id: string): Promise<boolean> {
    const result = await db.update(bookings).set({ status: "cancelled", updatedAt: new Date() }).where(eq(bookings.id, id));
    return (result.rowCount || 0) > 0;
  }

  async updateBookingPaymentIntent(bookingId: string, paymentIntentId: string): Promise<boolean> {
    const result = await db.update(bookings).set({ 
      stripePaymentIntentId: paymentIntentId,
      stripePaymentStatus: 'pending',
      updatedAt: new Date() 
    }).where(eq(bookings.id, bookingId));
    return (result.rowCount || 0) > 0;
  }

  // Facility Court operations
  async getFacilityCourts(facilityId: string): Promise<FacilityCourt[]> {
    return await db.select().from(facilityCourts).where(eq(facilityCourts.facilityId, facilityId));
  }

  async createFacilityCourt(facilityCourt: InsertFacilityCourt): Promise<FacilityCourt> {
    const [newFacilityCourt] = await db.insert(facilityCourts).values(facilityCourt).returning();
    return newFacilityCourt;
  }

  async updateFacilityCourt(id: string, updates: Partial<InsertFacilityCourt>): Promise<FacilityCourt | undefined> {
    const [facilityCourt] = await db.update(facilityCourts).set({ ...updates, updatedAt: new Date() }).where(eq(facilityCourts.id, id)).returning();
    return facilityCourt || undefined;
  }

  async deleteFacilityCourt(id: string): Promise<boolean> {
    const result = await db.delete(facilityCourts).where(eq(facilityCourts.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Court availability methods
  async checkCourtAvailability(facilityId: string, gameId: string, startTime: Date, endTime: Date): Promise<number | null> {
    // Get total courts available for this game at this facility
    const [facilityCourt] = await db.select().from(facilityCourts)
      .where(and(
        eq(facilityCourts.facilityId, facilityId),
        eq(facilityCourts.gameId, gameId)
      ));

    if (!facilityCourt) {
      return null; // No courts available for this game at this facility
    }

    // Get all bookings that overlap with the requested time slot
    const overlappingBookings = await db.select()
      .from(bookings)
      .where(and(
        eq(bookings.facilityId, facilityId),
        eq(bookings.gameId, gameId),
        eq(bookings.status, 'confirmed'),
        // Check for time overlap: booking overlaps if its start is before our end AND its end is after our start
        sql`${bookings.startTime} < ${endTime}`,
        sql`${bookings.endTime} > ${startTime}`
      ));

    const bookedCourts = overlappingBookings.length;
    const availableCourts = facilityCourt.courtCount - bookedCourts;
    
    return availableCourts > 0 ? availableCourts : null;
  }

  async getAvailableCourt(facilityId: string, gameId: string, startTime: Date, endTime: Date): Promise<number | null> {
    // Get total courts available for this game at this facility
    const [facilityCourt] = await db.select().from(facilityCourts)
      .where(and(
        eq(facilityCourts.facilityId, facilityId),
        eq(facilityCourts.gameId, gameId)
      ));

    if (!facilityCourt) {
      return null; // No courts available for this game at this facility
    }

    // Get all bookings that overlap with the requested time slot
    const overlappingBookings = await db.select()
      .from(bookings)
      .where(and(
        eq(bookings.facilityId, facilityId),
        eq(bookings.gameId, gameId),
        eq(bookings.status, 'confirmed'),
        sql`${bookings.startTime} < ${endTime}`,
        sql`${bookings.endTime} > ${startTime}`
      ));

    // Find which court numbers are already booked
    const bookedCourtNumbers = new Set(overlappingBookings.map(b => b.courtNumber));
    
    // Find the first available court number (starting from 1)
    for (let courtNumber = 1; courtNumber <= facilityCourt.courtCount; courtNumber++) {
      if (!bookedCourtNumbers.has(courtNumber)) {
        return courtNumber;
      }
    }

    return null; // All courts are booked
  }

  // Match operations
  async getMatches(filters?: { city?: string; sportType?: string; skillLevel?: string }): Promise<Match[]> {
    let conditions = [eq(matches.status, "open")];

    if (filters?.city) {
      conditions.push(like(facilities.city, `%${filters.city}%`));
    }
    if (filters?.sportType && filters.sportType !== "all" && filters.sportType !== "") {
      conditions.push(eq(matches.sportType, filters.sportType as any));
    }
    if (filters?.skillLevel && filters.skillLevel !== "all" && filters.skillLevel !== "") {
      conditions.push(eq(matches.skillLevel, filters.skillLevel as any));
    }

    return await db.select({
      id: matches.id,
      creatorId: matches.creatorId,
      facilityId: matches.facilityId,
      gameId: matches.gameId,
      title: matches.title,
      description: matches.description,
      sportType: matches.sportType,
      skillLevel: matches.skillLevel,
      maxPlayers: matches.maxPlayers,
      currentPlayers: matches.currentPlayers,
      costPerPlayer: matches.costPerPlayer,
      date: matches.date,
      startTime: matches.startTime,
      endTime: matches.endTime,
      status: matches.status,
      createdAt: matches.createdAt,
      updatedAt: matches.updatedAt,
      facilityName: facilities.name,
      facilityCity: facilities.city,
    }).from(matches)
      .leftJoin(facilities, eq(matches.facilityId, facilities.id))
      .where(and(...conditions))
      .orderBy(asc(matches.date));
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match || undefined;
  }

  async getMatchesByUser(userId: string): Promise<Match[]> {
    return await db.select().from(matches).where(eq(matches.creatorId, userId)).orderBy(desc(matches.createdAt));
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();

    // Automatically add the creator as a participant
    await db.insert(matchParticipants).values({
      matchId: newMatch.id,
      userId: match.creatorId,
    });

    return newMatch;
  }

  async updateMatch(id: string, updates: Partial<InsertMatch>): Promise<Match | undefined> {
    const [match] = await db.update(matches).set({ ...updates, updatedAt: new Date() }).where(eq(matches.id, id)).returning();
    return match || undefined;
  }

  async deleteMatch(id: string): Promise<boolean> {
    const result = await db.update(matches).set({ status: "cancelled", updatedAt: new Date() }).where(eq(matches.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Match participant operations
  async joinMatch(matchId: string, userId: string): Promise<MatchParticipant> {
    const [participant] = await db.insert(matchParticipants).values({ matchId, userId }).returning();

    // Update current player count
    await db.update(matches)
      .set({ currentPlayers: sql`${matches.currentPlayers} + 1` })
      .where(eq(matches.id, matchId));

    return participant;
  }

  async leaveMatch(matchId: string, userId: string): Promise<boolean> {
    const result = await db.delete(matchParticipants)
      .where(and(eq(matchParticipants.matchId, matchId), eq(matchParticipants.userId, userId)));

    if ((result.rowCount || 0) > 0) {
      // Update current player count
      await db.update(matches)
        .set({ currentPlayers: sql`${matches.currentPlayers} - 1` })
        .where(eq(matches.id, matchId));
      return true;
    }
    return false;
  }

  async getMatchParticipants(matchId: string): Promise<MatchParticipant[]> {
    return await db.select().from(matchParticipants).where(eq(matchParticipants.matchId, matchId));
  }

  // Review operations
  async getReviewsByFacility(facilityId: string): Promise<Review[]> {
    return await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        facilityId: reviews.facilityId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          profileImage: users.profileImage,
        },
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.facilityId, facilityId))
      .orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();

    // Update facility rating
    const [{ avgRating, totalReviews }] = await db
      .select({
        avgRating: sql<number>`AVG(${reviews.rating})::numeric`,
        totalReviews: count(reviews.id),
      })
      .from(reviews)
      .where(eq(reviews.facilityId, review.facilityId));

    await db.update(facilities)
      .set({
        rating: Number(avgRating).toFixed(1),
        totalReviews,
        updatedAt: new Date(),
      })
      .where(eq(facilities.id, review.facilityId));

    return newReview;
  }

  // OTP operations
  async createOtpCode(otpCodeData: InsertOtpCode): Promise<OtpCode> {
    const [otpCode] = await db.insert(otpCodes).values(otpCodeData).returning();
    return otpCode;
  }

  async getValidOtpCode(email: string, code: string, type: string): Promise<OtpCode | undefined> {
    const [otpCode] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.code, code),
          eq(otpCodes.type, type),
          eq(otpCodes.isUsed, false),
          gte(otpCodes.expiresAt, new Date())
        )
      );
    return otpCode || undefined;
  }

  async markOtpCodeAsUsed(id: string): Promise<boolean> {
    const result = await db
      .update(otpCodes)
      .set({ isUsed: true })
      .where(eq(otpCodes.id, id));
    return (result.rowCount || 0) > 0;
  }

  async cleanupExpiredOtpCodes(): Promise<boolean> {
    const result = await db
      .delete(otpCodes)
      .where(lte(otpCodes.expiresAt, new Date()));
    return (result.rowCount || 0) > 0;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(id: string, role: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async updateFacilityApproval(id: string, isApproved: boolean, rejectionReason?: string, approvedBy?: string): Promise<boolean> {
    const result = await db
      .update(facilities)
      .set({ 
        isApproved,
        rejectionReason,
        approvedBy,
        updatedAt: new Date() 
      })
      .where(eq(facilities.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();
