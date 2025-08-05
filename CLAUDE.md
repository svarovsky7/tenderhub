# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenderHub is a comprehensive tender management portal for construction industry workflows. Currently in initial setup phase with React 19, TypeScript 5.8, and Vite 7.

### Business Context

TenderHub is designed for tender department operations with features including:
- BOQ (Bill of Quantities) management with Excel import (xlsx, xls, csv)
- Real-time collaborative editing using Supabase Realtime
- User roles: Administrator, Engineer, View-only
- File management with drag-and-drop support (up to 250MB)
- Analytics dashboard with win-rate tracking
- Commercial cost calculations with markup scenarios (Base/Best-Case/Worst-Case)

Performance targets:
- Import 5,000 Excel rows in ≤30 seconds
- Render 10,000 rows smoothly (≤100ms)
- Real-time sync latency <300ms
- Support 100 concurrent users

## Development Commands

```bash
npm install          # Install all dependencies
npm run dev          # Start development server with HMR
npm run build        # Build for production (runs tsc -b && vite build)
npm run preview      # Preview production build locally
npm run lint         # Run ESLint for code quality checks
```

## Project Architecture

### Current Tech Stack (Implemented)
- **Frontend**: React 19 + TypeScript 5.8
- **Build Tool**: Vite 7 with @vitejs/plugin-react
- **UI Framework**: Ant Design 5 with icons (@ant-design/icons)
- **State Management**: TanStack Query (React Query) + React Context
- **Routing**: React Router DOM v7
- **Backend**: Supabase (PostgreSQL 16, Auth, Storage, Realtime)
- **Authentication**: Supabase Auth with PKCE flow for security
- **Styling**: Tailwind CSS 3.4 + PostCSS + Autoprefixer
- **Code Quality**: ESLint 9 with TypeScript and React plugins

### Additional Dependencies
- **Database**: Comprehensive PostgreSQL schema with RLS policies
- **TypeScript**: Strict configuration with composite project structure
- **Performance**: Optimized for 5000+ row imports and real-time collaboration

### Project Structure (Current Implementation)
```
src/
├── components/           # React components (organized by feature)
│   ├── layout/          # Layout components
│   │   └── AppLayout.tsx
│   └── tender/          # Tender-specific components
│       ├── AddPositionModal.tsx
│       ├── BOQItemList.tsx
│       ├── ClientPositionCard.tsx
│       ├── LibrarySelector.tsx
│       └── index.ts
├── lib/                 # External library configurations
│   └── supabase/        # Supabase client and utilities
│       ├── api.ts       # API service functions
│       ├── client.ts    # Supabase client configuration
│       ├── hooks.ts     # Custom Supabase hooks
│       ├── index.ts     # Public exports
│       ├── types.ts     # TypeScript type definitions
│       ├── HIERARCHY_API_EXAMPLES.md
│       ├── HIERARCHY_API_SUMMARY.md
│       └── README.md
├── pages/               # Page components (route handlers)
│   ├── admin/           # Admin-only pages
│   │   ├── SettingsPage.tsx
│   │   └── UsersPage.tsx
│   ├── BOQPage.tsx
│   ├── Dashboard.tsx
│   ├── Materials.tsx
│   ├── MaterialsPage.tsx
│   ├── ProfilePage.tsx
│   ├── TenderBoq.tsx
│   ├── TenderDetailPage.tsx
│   ├── TendersPage.tsx
│   ├── Works.tsx
│   └── WorksPage.tsx
├── App.tsx              # Main application component
├── main.tsx             # Application entry point
├── App.css              # Application styles
├── index.css            # Global styles
└── vite-env.d.ts        # Vite environment types
```

### TypeScript Configuration
- Composite configuration with separate configs for app and node
- Strict mode enabled with all strict checks
- Target ES2022 for modern JavaScript features
- Module resolution set to bundler mode for Vite compatibility

## Key Features to Implement

### 1. BOQ Table Management
- Ant Design Editable VirtualTable with react-window for performance
- Row types: work (раб), material (мат), sub-work (суб-раб), sub-material (суб-мат)
- Formula calculation: quantity × coefficient × price_unit
- Auto-complete from position library
- Mass insert and copy/paste support

### 2. Real-time Collaboration
- Supabase Realtime channels (tender:{id})
- Optimistic locking with updated_at timestamp
- Conflict resolver: Merge/Overwrite/Rollback options
- WebSocket-based synchronization

### 3. File Management
- Drag-and-drop upload interface
- Support for PDF, images, drawings (DWG)
- Version control with date-based subfolders
- Preview capabilities for common formats

### 4. Analytics & Reporting
- Dashboard with win-rate, cost dynamics
- Export to XLSX/PDF formats
- Reports: Direct costs, Commercial proposals, Change history
- Visualization with charts for win-rate and margin distribution

### 5. Commercial Cost Calculation
- Supabase Edge Function /calcCommercialCost
- Markup parameters: overhead %, risk %, margin %
- Multiple scenarios support
- History snapshots in history_log

## Database Schema (Supabase PostgreSQL)

**Status**: Fully implemented with performance optimizations

### Core Tables (Implemented)
- `users` - User profiles extending Supabase auth with roles and organization mapping
- `tenders` - Main tender projects with client and submission details  
- `boq_items` - Bill of Quantities line items with generated total_amount column
- `materials_library` - Master catalog of materials with pricing and full-text search
- `works_library` - Master catalog of work items with labor components
- `history_log` - Comprehensive audit trail with JSONB change tracking

### Key Features
- **IMPORTANT: RLS is DISABLED** - All tables have RLS turned off for simplified development
- **Performance Indexes**: Optimized for 5000+ row imports and 10000 row rendering
- **Audit System**: Automatic change tracking with old/new data snapshots
- **Bulk Operations**: `bulk_insert_boq_items()` function for Excel imports
- **Full-text Search**: GIN indexes on material/work names
- **Composite Indexes**: Optimized for common query patterns

### Performance Monitoring
- `slow_queries` view for identifying bottlenecks
- Partial indexes for expensive items
- Generated columns for automatic calculations

## Security & Compliance

- TLS 1.3 for all connections
- **IMPORTANT: Row Level Security (RLS) is DISABLED for this project**
- MFA support for authentication
- WCAG 2.1 AA accessibility compliance
- OWASP security best practices
- No critical vulnerabilities allowed

## Development Guidelines

### Architecture Patterns (Current Implementation)
1. **No Authentication System**
   - **IMPORTANT**: Currently runs without authentication
   - All features accessible without login
   - Role-based access control removed for simplified development
   - Future authentication can be added via Supabase Auth

2. **Supabase Integration**
   - Centralized client configuration (`lib/supabase/client.ts`)
   - Service layer for API operations (`lib/supabase/api.ts`)
   - Custom hooks for common operations (`lib/supabase/hooks.ts`)
   - Comprehensive TypeScript types (`lib/supabase/types.ts`)
   - Hierarchical data handling with specialized API examples

3. **Component Organization**
   - Feature-based component structure (tender components)
   - Separation of layout, tender, and page components
   - Admin-specific components in dedicated directory
   - Tender-specific reusable components (BOQItemList, LibrarySelector)

### Development Workflow
1. **Environment Setup**
   - Requires `.env.local` with Supabase credentials
   - Database schema must be deployed from `database/schema.sql`
   - Tailwind CSS for styling system

2. **Code Quality**
   - TypeScript strict mode enabled
   - ESLint with React and TypeScript rules
   - Functional components with hooks pattern
   - Props interfaces for all components

3. **State Management Patterns**
   - TanStack Query for server state management
   - Local state with useState/useReducer for component state
   - Custom hooks for reusable logic and Supabase operations
   - No global authentication state (authentication disabled)

## Important Implementation Details

### ⚠️ CRITICAL: Row Level Security (RLS) Policy
**RLS is COMPLETELY DISABLED in this project.** Do not implement any RLS policies or enable RLS on any tables. The database schema is designed without authentication or authorization. All data access is unrestricted since:
- No authentication system is currently implemented
- All features are accessible without login restrictions
- Data access is controlled entirely at the application UI level
- Future access control can be added when authentication is implemented

When working on database queries or Supabase operations:
- Never enable RLS on tables
- Don't write RLS policies
- Don't use RLS-related Supabase features
- Handle data access permissions in the application layer only

### Supabase Configuration
- Client configured with PKCE flow for enhanced security
- Realtime enabled with rate limiting (10 events/second)
- Custom headers for client identification
- Automatic token refresh and session persistence

### Authentication System Status
- **CURRENTLY DISABLED**: No authentication system implemented
- Database schema supports future role-based access control (Administrator, Engineer, View-only)
- No user management or session handling
- All tender operations accessible without restrictions
- Authentication can be added later using Supabase Auth when needed

### Database Performance
- **RLS is DISABLED** - No Row Level Security policies active
- Optimized for 5000+ Excel row imports via `bulk_insert_boq_items()`
- Full-text search on materials/works with GIN indexes
- Partial indexes for expensive BOQ items (>10,000 value)
- Audit triggers with JSONB change tracking
- Generated columns for automatic total calculations

### File Structure Conventions
- Pages in `/pages/` directory map to routes
- Components organized by feature in `/components/` (layout, tender)
- Supabase utilities centralized in `/lib/supabase/` with comprehensive API documentation
- Admin components separated in `/pages/admin/`
- Tender-specific components in `/components/tender/` with re-exportable index

## Deployment

- Frontend: Vercel deployment via GitHub Actions
- Backend: Supabase Cloud
- CI/CD pipeline with automated testing
- Environment variables management
- Staging environment for validation

## Agent Delegation Strategy

When working on TenderHub tasks, Claude Code should automatically delegate to specialized agents based on the task context. Use the following decision matrix:

### Primary Agent Selection

1. **database-optimizer** - For any Supabase/PostgreSQL work:
   - Creating database schemas for users, tenders, boq_items, files tables
   - Optimizing queries for 5,000+ row imports
   - Implementing Row Level Security (RLS) policies
   - Setting up indexes for real-time performance

2. **backend-architect** - For API and backend design:
   - Designing Supabase Edge Functions (e.g., /calcCommercialCost)
   - Setting up authentication flow with OAuth 2.0
   - Creating RESTful endpoints for tender operations
   - Implementing real-time WebSocket channels

3. **frontend-developer** - For React UI implementation:
   - Building Ant Design components (Editable VirtualTable)
   - Implementing drag-and-drop file upload
   - Creating responsive layouts (WCAG 2.1 AA)
   - Setting up TanStack Query for state management

4. **typescript-pro** - For complex TypeScript patterns:
   - Defining type systems for BOQ items, user roles, tender states
   - Creating generic components with proper type inference
   - Setting up strict type safety for API responses

5. **sql-pro** - For complex SQL operations:
   - Writing CTEs for hierarchical BOQ data (work/sub-work)
   - Creating materialized views for analytics dashboard
   - Implementing history_log audit triggers

### Multi-Agent Workflows

For complex features, use agent sequences:

#### BOQ Table Implementation
1. **database-optimizer** → Design boq_items schema with performance indexes
2. **sql-pro** → Create complex queries for hierarchical data
3. **backend-architect** → Design API endpoints for CRUD operations
4. **typescript-pro** → Define comprehensive type system
5. **frontend-developer** → Implement Ant Design VirtualTable

#### Real-time Collaboration
1. **backend-architect** → Design WebSocket architecture
2. **database-optimizer** → Implement optimistic locking strategy
3. **frontend-developer** → Build conflict resolver UI
4. **typescript-pro** → Type-safe real-time event handling

#### Analytics Dashboard
1. **sql-pro** → Create aggregation queries for win-rate
2. **database-optimizer** → Optimize for dashboard performance
3. **frontend-developer** → Implement charts and visualizations

### Context-Based Auto-Selection

Claude Code should analyze the user's request and automatically select agents when keywords are detected:

- "database", "schema", "table", "index" → **database-optimizer**
- "API", "endpoint", "Edge Function", "auth" → **backend-architect**
- "component", "UI", "layout", "responsive" → **frontend-developer**
- "types", "interface", "generic", "type-safe" → **typescript-pro**
- "query", "SQL", "aggregate", "join" → **sql-pro**
- "slow", "performance", "optimize" → **database-optimizer** or **debugger**

### Proactive Agent Usage

Always use agents proactively for:
- Database schema changes (even minor ones)
- New API endpoint creation
- Complex React component development
- Performance optimization tasks
- Type system architecture decisions

This ensures consistent, high-quality implementation aligned with TenderHub's technical requirements.

## Application Logging Requirements

**CRITICAL: All operations and events must be comprehensively logged during application development and execution.**

### Logging Strategy

1. **Authentication & Session Management**
   - All login/logout attempts with success/failure status
   - Session creation, expiration, and renewal events
   - Token refresh operations and failures
   - Permission checks and access control decisions
   - User role changes and activation/deactivation

2. **Database Operations**
   - All database queries with execution time and result counts
   - Transaction begin/commit/rollback events
   - Connection pool status and connection failures
   - Bulk operations progress (especially BOQ imports)
   - Data validation errors and constraint violations

3. **API and Service Layer**
   - All HTTP requests/responses with status codes and timing
   - Supabase client operations and their outcomes
   - Real-time WebSocket connection events
   - File upload/download operations with sizes and status
   - External service integrations and their responses

4. **Business Logic Events**
   - Tender lifecycle state changes
   - BOQ calculations and formula evaluations
   - Commercial cost calculations with all parameters
   - Library item creation, updates, and archiving
   - User permission evaluations for specific actions

5. **Performance Monitoring**
   - Component render times and re-renders
   - Large dataset operations (5000+ rows)
   - Memory usage during intensive operations
   - Network latency for real-time features
   - Error boundaries and component failures

6. **Error Handling**
   - All caught exceptions with full stack traces
   - Validation errors with field-specific details
   - Network timeouts and connection failures
   - Data integrity issues and recovery actions
   - User-facing error messages and their underlying causes

### Implementation Requirements

- Use structured logging (JSON format preferred)
- Include request IDs for tracing across components
- Log at appropriate levels: DEBUG, INFO, WARN, ERROR
- Implement log rotation and retention policies
- Never log sensitive data (passwords, tokens, PII)
- Include user context (ID, role) in relevant logs
- Timestamp all log entries with UTC timezone