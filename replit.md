# PayPilot - Financial Debt Management Platform

## Overview

PayPilot is a gamified financial debt management application that helps users organize their debts and discover optimal payment strategies using AI. Inspired by Duolingo's playful and encouraging approach, the application makes financial management feel approachable and motivating rather than intimidating.

The platform allows users to:
- Track multiple debts with interest rates and due dates
- Manage payment methods (credit cards) with limits and availability
- Generate AI-powered payment strategies
- Monitor progress toward becoming debt-free

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design tokens based on the Duolingo-inspired design system

**Design System**:
- Primary colors: Orange (#FF8C42) for actions and Green (#2E8B57) for success states
- Typography: Nunito for headings (friendly, rounded) and Inter for body text (clean, readable)
- Mobile-first responsive design with max-width containers
- Generous spacing and rounded corners (border-radius: 1rem to 2.5rem)

**Key Features**:
- Authentication flow with login/signup screens (Replit Auth + email/password)
- Dashboard with debt overview, income summary, and progress tracking
- Debt management (list, create, update, delete)
- Payment method (credit card) management
- Income tracking ("Receitas") - monthly income sources with recurring/one-time distinction
- AI-powered strategy generation screen

### Backend Architecture

**Framework**: Express.js with TypeScript
- **Runtime**: Node.js
- **Session Management**: express-session with PostgreSQL-backed store (connect-pg-simple)
- **Authentication**: Replit Auth (OIDC-based) supporting Google, GitHub, Apple, and email/password login

**API Structure**:
- RESTful API endpoints under `/api` prefix
- Authentication middleware that attaches user to request object
- CRUD operations for debts, payment methods, and incomes
- Strategy generation endpoint for AI recommendations

**Session Configuration**:
- HttpOnly cookies for security
- 7-day session expiration
- Secure cookies in production environment
- Session data includes userId for authenticated requests

### Data Storage

**Database**: PostgreSQL (via Neon serverless)
- **ORM**: Drizzle ORM for type-safe database queries
- **Connection**: WebSocket-based connection using @neondatabase/serverless with connection pooling

**Schema Design**:
Four main tables:
1. **users**: Stores user account information (id, email, name, passwordHash, createdAt)
2. **debts**: Tracks individual debts (id, userId, paymentMethodId, name, totalAmount, paidAmount, dueDate, isPaid, category, notes, createdAt)
3. **paymentMethods**: Manages credit cards and payment sources (id, userId, name, type, limit, availableLimit, closingDay, dueDay, createdAt)
4. **incomes**: Tracks monthly income sources (id, userId, name, amount, category, isRecurring, createdAt)

**Relationships**:
- Users have many debts (one-to-many)
- Users have many payment methods (one-to-many)
- Users have many incomes (one-to-many)
- Debts optionally reference payment methods (many-to-one with nullable foreign key)
- Cascade deletion: When a user is deleted, all associated debts, payment methods, and incomes are deleted

**Data Validation**: Zod schemas generated from Drizzle schema definitions for runtime validation

### External Dependencies

**UI Component Library**:
- Radix UI: Accessible, unstyled component primitives (dialogs, dropdowns, popovers, tooltips, etc.)
- shadcn/ui: Pre-styled components built on Radix UI

**State Management & Data Fetching**:
- TanStack Query: Server state management, caching, and automatic refetching
- Custom query client with credential-based fetching

**Database & ORM**:
- Neon Database: Serverless PostgreSQL hosting
- Drizzle ORM: Type-safe SQL query builder with schema migrations
- drizzle-kit: CLI tool for database migrations

**Development Tools**:
- Replit-specific plugins: Runtime error overlay, cartographer, dev banner
- tsx: TypeScript execution for development
- esbuild: Production build bundling

**Styling & Design**:
- Tailwind CSS: Utility-first CSS framework
- class-variance-authority: Type-safe variant handling for components
- clsx & tailwind-merge: Class name utilities

**Forms & Validation**:
- React Hook Form: Form state management
- @hookform/resolvers: Zod integration for form validation
- Zod: Schema validation library

**Utilities**:
- date-fns: Date manipulation and formatting
- nanoid: Unique ID generation
- lucide-react: Icon library
- react-icons: Additional icons (Google icon for OAuth button)

**Notable Design Decisions**:
- Session-based authentication chosen over JWT for simplicity and better security for web applications
- PostgreSQL-backed session store via connect-pg-simple for production-ready session persistence
- Neon serverless PostgreSQL chosen for automatic scaling and serverless architecture compatibility
- Mobile-first design approach with single-column layouts optimized for mobile devices
- AI strategy generation endpoint suggests using available credit to pay off high-interest debts