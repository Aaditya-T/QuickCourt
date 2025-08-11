# QuickCourt - Local Sports Booking Platform

## Overview

QuickCourt is a full-stack web application that connects sports enthusiasts with local sports facilities. The platform allows users to discover and book courts for various sports like badminton, tennis, basketball, and football. It serves three main user types: regular users who want to book facilities and join matches, facility owners who manage their courts and bookings, and administrators who oversee the entire platform.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern component-based UI using functional components and hooks for type-safe development
- **Wouter**: Lightweight client-side routing library for navigation between pages
- **Tailwind CSS + shadcn/ui**: Utility-first CSS framework combined with a comprehensive component library following the "new-york" design system
- **TanStack Query**: Server state management for API calls, caching, and data synchronization with optimistic updates
- **React Hook Form**: Form handling with validation and seamless user experience
- **Vite**: Fast build tool and development server with hot module replacement

### Backend Architecture
- **Express.js**: RESTful API server with middleware-based architecture for handling HTTP requests
- **TypeScript**: Type-safe server-side development ensuring consistency across the full stack
- **JWT Authentication**: Stateless token-based authentication system with role-based access control
- **bcryptjs**: Secure password hashing for user authentication
- **Middleware Pattern**: Custom authentication and role-based authorization middleware for protecting routes

### Database Design
- **PostgreSQL**: Primary relational database hosted on Neon serverless infrastructure
- **Drizzle ORM**: Type-safe database queries and schema management with automatic migrations
- **Multi-table Schema**: 
  - Users table with role-based permissions (user, facility_owner, admin)
  - Facilities table for sports venues with geolocation, pricing, and operating hours
  - Bookings table for facility reservations with time slots
  - Matches table for community sports events with participant management
  - Reviews table for facility feedback and ratings
  - OTP codes table for email verification
  - Junction tables for many-to-many relationships (match participants)

### Authentication & Authorization
- **Dual Authentication Methods**: Traditional password-based login and secure email OTP verification using Resend API
- **Multi-role System**: Granular access control with three user roles (user, facility_owner, admin)
- **JWT Token Management**: Secure token generation and validation with localStorage persistence
- **Protected Routes**: Both client-side and server-side route protection based on user roles
- **Email Integration**: Resend API integration for OTP delivery and user verification

## External Dependencies

- **Database**: PostgreSQL database hosted on Neon serverless platform
- **Email Service**: Resend API for transactional emails and OTP verification
- **UI Components**: Radix UI primitives for accessible, unstyled UI components
- **Font Services**: Google Fonts (Inter) and Font Awesome for icons
- **Image Hosting**: Unsplash for placeholder facility images
- **Development Tools**: ESBuild for production bundling, Drizzle Kit for database migrations