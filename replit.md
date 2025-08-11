# QuickCourt - Local Sports Booking Platform

## Overview

QuickCourt is a full-stack web application that connects sports enthusiasts with local sports facilities. The platform allows users to discover and book courts for various sports like badminton, tennis, basketball, and more, while also providing a community feature for organizing and joining matches with other players.

The application serves three main user types:
- **Regular users** who want to book facilities and join matches
- **Facility owners** who manage their courts and bookings
- **Administrators** who oversee the entire platform

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern component-based UI using functional components and hooks
- **Wouter**: Lightweight routing library for client-side navigation
- **Tailwind CSS + shadcn/ui**: Utility-first styling with a comprehensive component library
- **TanStack Query**: Server state management for API calls, caching, and data synchronization
- **React Hook Form**: Form handling with validation

### Backend Architecture
- **Express.js**: RESTful API server with middleware-based architecture
- **TypeScript**: Type-safe server-side development
- **JWT Authentication**: Token-based authentication with role-based access control
- **bcryptjs**: Password hashing for secure user authentication
- **Session Management**: Express sessions with PostgreSQL store

### Database Design
- **PostgreSQL**: Primary database with Neon serverless hosting
- **Drizzle ORM**: Type-safe database queries and schema management
- **Schema Structure**:
  - Users table with role-based permissions (user, facility_owner, admin)
  - Facilities table for sports venues with geolocation and pricing
  - Bookings table for facility reservations
  - Matches table for community sports events
  - Reviews table for facility feedback
  - Junction tables for many-to-many relationships (match participants)

### Authentication & Authorization
- **Multi-role system**: Different access levels for users, facility owners, and administrators
- **JWT tokens**: Stateless authentication with localStorage persistence
- **OTP Authentication**: Integrated email verification system using Resend API with toggle switches in login/signup forms
- **Dual auth methods**: Users can choose between traditional password or secure email code authentication
- **Protected routes**: Role-based route protection on both client and server
- **Middleware authentication**: Server-side token verification for API endpoints

### Key Features Architecture
- **Booking System**: Time-slot based reservations with availability checking - streamlined flow through facility detail pages
- **Match Organization**: Community-driven sports event creation and participation
- **Search & Filtering**: Multi-criteria facility and match discovery
- **Real-time Updates**: Optimistic updates with query invalidation
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Unified Booking Flow**: Facilities page links directly to facility detail page for viewing and booking

## External Dependencies

### Core Framework Dependencies
- **React 18**: Frontend framework with concurrent features
- **Express.js**: Node.js web application framework
- **TypeScript**: Static type checking for both frontend and backend

### Database & ORM
- **@neondatabase/serverless**: Serverless PostgreSQL connection driver
- **Drizzle ORM**: Type-safe database toolkit with schema management
- **drizzle-kit**: CLI tools for database migrations and schema updates

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **@radix-ui/***: Headless UI components for accessibility
- **shadcn/ui**: Pre-built component library built on Radix
- **Lucide React**: Icon library for consistent iconography

### Data Management
- **@tanstack/react-query**: Server state management and caching
- **React Hook Form**: Form handling with validation
- **@hookform/resolvers**: Form validation resolvers
- **Zod**: Schema validation for type safety

### Authentication & Security
- **jsonwebtoken**: JWT token creation and verification
- **bcryptjs**: Password hashing and comparison
- **connect-pg-simple**: PostgreSQL session store for Express

### Development & Build Tools
- **Vite**: Fast build tool and development server
- **ESBuild**: JavaScript bundler for production builds
- **PostCSS**: CSS processing with autoprefixer

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx & class-variance-authority**: Conditional CSS class management
- **nanoid**: Unique ID generation for database records