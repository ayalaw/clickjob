# Overview

This is a recruitment management system built as a full-stack web application. The system manages candidates, clients, jobs, interviews, and email communications for recruitment agencies. It features a modern React frontend with a Node.js/Express backend, using PostgreSQL for data persistence and Drizzle ORM for database operations.

The application supports both Replit authentication and local password-based authentication, with a comprehensive role-based permission system. It includes advanced features like CV search, email integration, interview scheduling, and automated candidate status tracking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with custom Tailwind CSS styling
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite for development and production builds
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with TypeScript (tsx for development)
- **Framework**: Express.js for REST API endpoints
- **Authentication**: Dual authentication system supporting both Replit OIDC and local password-based auth
- **Session Management**: Express session with PostgreSQL session store
- **File Handling**: Multer for file uploads with support for CV/resume processing
- **Email Processing**: IMAP integration for incoming emails and SMTP for outgoing emails

## Database Design
- **Database**: PostgreSQL with connection pooling
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Comprehensive relational schema with proper foreign key relationships
- **Key Tables**:
  - Users with role-based permissions
  - Candidates with detailed tracking
  - Clients and client contacts
  - Jobs with status management
  - Email communications
  - Interview events and reminders
  - System settings for configuration

## Permission System
- **Role Types**: Super admin, admin, and user roles
- **Resource-Based Permissions**: Granular permissions for different resources (candidates, jobs, clients)
- **Action-Based Control**: Create, read, update, delete permissions per resource
- **Page-Level Security**: Permission checks for accessing different application pages
- **Data Filtering**: Role-based data visibility (e.g., hiding client names for certain users)

## File Management
- **Upload Handling**: Supports PDF, DOC, DOCX file uploads for CVs
- **File Processing**: Automatic text extraction from uploaded documents using mammoth for Word documents
- **Storage**: Local file system storage with proper MIME type validation

## Email Integration
- **Incoming Email**: IMAP integration for monitoring and processing incoming emails
- **Outgoing Email**: SMTP configuration for sending emails to candidates and clients
- **Email Templates**: Configurable message templates for common communications
- **cPanel Support**: Specific configurations for cPanel-based email hosting

## Development Configuration
- **Multiple Environments**: Support for Replit, standalone, and clean configurations
- **Hot Reload**: Vite development server with HMR
- **TypeScript**: Full TypeScript support across frontend and backend
- **Path Aliases**: Organized import structure with @ aliases

# External Dependencies

## Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form, TanStack Query
- **Backend Framework**: Express.js with TypeScript support via tsx
- **Database**: PostgreSQL with Drizzle ORM and connection pooling via @neondatabase/serverless
- **Authentication**: Passport.js with OpenID Connect strategy for Replit auth

## UI and Styling
- **Component Library**: Extensive Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with custom configuration
- **Icons**: Lucide React icon library
- **Utilities**: clsx and tailwind-merge for conditional styling

## File and Email Processing
- **File Upload**: Multer for handling multipart/form-data
- **Document Processing**: Mammoth for Word document text extraction
- **Email**: nodemailer for SMTP, imap for incoming email processing
- **Email Parsing**: mailparser for processing email content

## Development and Build Tools
- **Build Tool**: Vite with React plugin
- **Bundling**: esbuild for server-side bundling
- **Type Checking**: TypeScript with strict configuration
- **Database Migrations**: Drizzle Kit for schema management
- **Session Storage**: connect-pg-simple for PostgreSQL session store

## Authentication Services
- **Replit Integration**: OpenID Connect client for Replit authentication
- **Password Hashing**: bcrypt for secure password storage
- **Session Management**: express-session with PostgreSQL backing store

## External Integrations
- **Email Services**: Support for cPanel SMTP/IMAP configurations
- **Database Hosting**: Neon PostgreSQL with serverless connections
- **Development Platform**: Replit-specific plugins and error handling

## Security and Validation
- **Input Validation**: Zod schema validation for API endpoints and forms
- **MIME Type Detection**: mime-types for file validation
- **CORS and Security**: Standard Express security middleware
- **Environment Variables**: dotenv for configuration management