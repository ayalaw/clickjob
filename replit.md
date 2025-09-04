# Overview

This is a comprehensive Recruitment Management System (RMS) built as a full-stack web application. The system manages candidates, clients, jobs, applications, and tasks for recruitment agencies. It features a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration using Drizzle ORM. The application supports Hebrew language interface and includes authentication, file uploads, and real-time data management capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript for type safety and modern development
- **Vite** for fast development server and optimized builds
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query)** for server state management and caching
- **React Hook Form** with Zod validation for form handling
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for styling with CSS variables for theming
- **Right-to-Left (RTL)** layout support for Hebrew interface

## Backend Architecture
- **Express.js** server with TypeScript
- **RESTful API** design with proper HTTP status codes and error handling
- **Modular route structure** separating concerns by resource type
- **Storage abstraction layer** for database operations
- **Middleware-based architecture** for authentication and request processing
- **File upload handling** with Multer for resume management

## Authentication System
- **Replit OAuth** integration for seamless authentication
- **Passport.js** with OpenID Connect strategy
- **Session-based authentication** with PostgreSQL session storage
- **User profile management** with automatic user creation/update

## Database Design
- **PostgreSQL** as the primary database
- **Drizzle ORM** for type-safe database operations
- **Schema-first approach** with shared type definitions
- **Relational data model** with proper foreign key constraints
- **Migration system** for database versioning

### Core Entities:
- **Users**: Authentication and profile management
- **Candidates**: Comprehensive candidate profiles with resume storage
- **Clients**: Company and contact management
- **Jobs**: Job postings with client relationships
- **Job Applications**: Candidate-job matching with status tracking
- **Tasks**: Task management for recruitment workflows
- **Sessions**: Secure session storage

## File Management
- **Resume upload** support for PDF and DOC formats
- **File validation** with size and type restrictions
- **Local file storage** with organized directory structure
- **File metadata** tracking in database
- **Automatic CV processing** from incoming emails with attachment extraction
- **Email integration** with cPanel IMAP for automatic candidate creation

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for Neon database hosting
- **drizzle-orm**: Type-safe SQL query builder and ORM
- **express**: Web application framework
- **react**: UI library
- **@tanstack/react-query**: Server state management

## UI and Styling
- **@radix-ui/***: Comprehensive set of UI primitives for accessible components
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

## Authentication and Security
- **passport**: Authentication middleware
- **openid-client**: OAuth/OpenID Connect implementation
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

## Form Handling and Validation
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Schema validation library

## Development and Build Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution engine
- **esbuild**: JavaScript bundler for production builds

## Utility Libraries
- **date-fns**: Date manipulation and formatting
- **multer**: File upload middleware
- **clsx**: Conditional className utility
- **cmdk**: Command menu component

The system is designed for deployment on Replit with environment-based configuration for database connections and authentication settings.