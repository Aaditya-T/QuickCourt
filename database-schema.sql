-- QuickCourt Database Schema
-- Sports Facility Booking Platform
-- Generated: 2024-08-11

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('user', 'facility_owner', 'admin');
CREATE TYPE sport_type AS ENUM ('badminton', 'tennis', 'basketball', 'football', 'table_tennis', 'squash');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE match_status AS ENUM ('open', 'full', 'in_progress', 'completed', 'cancelled');
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users: Core user management with role-based permissions
CREATE TABLE users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    profile_image TEXT,
    skill_level skill_level DEFAULT 'beginner',
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- OTP Codes: Email verification and authentication
CREATE TABLE otp_codes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL, -- 'signup', 'login', 'password_reset'
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Facilities: Sports venues and courts
CREATE TABLE facilities (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id VARCHAR NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    sport_type sport_type NOT NULL,
    price_per_hour DECIMAL(10,2) NOT NULL,
    images TEXT[] DEFAULT '{}',
    amenities TEXT[] DEFAULT '{}',
    operating_hours TEXT NOT NULL, -- JSON: {"monday": {"open": "06:00", "close": "23:00"}}
    is_active BOOLEAN DEFAULT TRUE,
    rating DECIMAL(2,1) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Bookings: Individual facility reservations
CREATE TABLE bookings (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    facility_id VARCHAR NOT NULL REFERENCES facilities(id),
    date TIMESTAMP NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status booking_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Matches: Community sports events and group games
CREATE TABLE matches (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id VARCHAR NOT NULL REFERENCES users(id),
    facility_id VARCHAR NOT NULL REFERENCES facilities(id),
    title TEXT NOT NULL,
    description TEXT,
    sport_type sport_type NOT NULL,
    skill_level skill_level NOT NULL,
    max_players INTEGER NOT NULL,
    current_players INTEGER DEFAULT 1,
    cost_per_player DECIMAL(10,2) NOT NULL,
    date TIMESTAMP NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status match_status DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Match Participants: Junction table for match membership
CREATE TABLE match_participants (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id VARCHAR NOT NULL REFERENCES matches(id),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Ensure unique participation
    UNIQUE(match_id, user_id)
);

-- Reviews: Facility ratings and feedback
CREATE TABLE reviews (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    facility_id VARCHAR NOT NULL REFERENCES facilities(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- One review per user per facility
    UNIQUE(user_id, facility_id)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- User lookup indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- OTP lookup indexes
CREATE INDEX idx_otp_codes_email ON otp_codes(email);
CREATE INDEX idx_otp_codes_type ON otp_codes(type);
CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at);

-- Facility search indexes
CREATE INDEX idx_facilities_owner_id ON facilities(owner_id);
CREATE INDEX idx_facilities_sport_type ON facilities(sport_type);
CREATE INDEX idx_facilities_city ON facilities(city);
CREATE INDEX idx_facilities_is_active ON facilities(is_active);

-- Booking query indexes
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_facility_id ON bookings(facility_id);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Match discovery indexes
CREATE INDEX idx_matches_creator_id ON matches(creator_id);
CREATE INDEX idx_matches_facility_id ON matches(facility_id);
CREATE INDEX idx_matches_sport_type ON matches(sport_type);
CREATE INDEX idx_matches_date ON matches(date);
CREATE INDEX idx_matches_status ON matches(status);

-- Match participation indexes
CREATE INDEX idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX idx_match_participants_user_id ON match_participants(user_id);

-- Review indexes
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_facility_id ON reviews(facility_id);

-- =============================================================================
-- RELATIONSHIPS SUMMARY
-- =============================================================================

/*
ENTITY RELATIONSHIPS:

1. USERS (Central entity)
   - One-to-Many: facilities (as owner)
   - One-to-Many: bookings (as customer)
   - One-to-Many: matches (as creator)
   - One-to-Many: match_participants (as participant)
   - One-to-Many: reviews (as reviewer)

2. FACILITIES
   - Many-to-One: users (owner)
   - One-to-Many: bookings
   - One-to-Many: matches
   - One-to-Many: reviews

3. MATCHES
   - Many-to-One: users (creator)
   - Many-to-One: facilities (venue)
   - One-to-Many: match_participants

4. BOOKINGS
   - Many-to-One: users (customer)
   - Many-to-One: facilities (venue)

5. REVIEWS
   - Many-to-One: users (reviewer)
   - Many-to-One: facilities (subject)

6. OTP_CODES
   - Independent verification table
   - Links to users via email

7. MATCH_PARTICIPANTS (Junction Table)
   - Many-to-One: matches
   - Many-to-One: users
*/

-- =============================================================================
-- BUSINESS RULES & CONSTRAINTS
-- =============================================================================

/*
KEY BUSINESS RULES:

1. User Roles:
   - 'user': Can book facilities, join matches, leave reviews
   - 'facility_owner': Can create/manage facilities + all user permissions
   - 'admin': Full system access and user management

2. Email Verification:
   - Required for all new signups
   - OTP codes expire after set time
   - Users must verify email before full access

3. Facility Management:
   - Only facility owners can create facilities
   - Facilities have operating hours stored as JSON
   - Multiple images and amenities supported

4. Booking System:
   - Time-based reservations with start/end times
   - Pricing calculated by hourly rate
   - Status tracking (pending → confirmed → completed)

5. Match System:
   - Group events with participant limits
   - Cost-sharing among participants
   - Skill-level filtering for fair matches

6. Review System:
   - One review per user per facility
   - 1-5 star rating system
   - Affects facility's overall rating

7. Data Integrity:
   - Unique constraints on email, username
   - Foreign key relationships maintained
   - Timestamps for audit trails
*/