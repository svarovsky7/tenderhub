# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Available Agents

Claude Code can leverage specialized agents for complex tasks. Use them proactively when the task matches their expertise:

### 🎨 UI/UX Designer Agent (`ui-ux-designer`)
**Purpose**: Create beautiful, responsive, and user-friendly interfaces
**When to use**:
- Designing new pages or components with complex UI requirements
- Creating design systems and component libraries
- Improving user experience and visual appeal
- Implementing animations and micro-interactions
- Optimizing accessibility and responsive design

### 🏗️ Backend Architect Agent (`backend-architect`)
**Purpose**: Design robust backend systems and APIs
**When to use**:
- Creating new API endpoints or services
- Designing database schemas and migrations
- Implementing complex business logic
- Optimizing database queries and performance
- Setting up microservices architecture

### 📘 TypeScript Pro Agent (`typescript-pro`)
**Purpose**: Handle complex TypeScript implementations
**When to use**:
- Creating advanced type definitions and generics
- Implementing decorators and metadata reflection
- Setting up strict type safety patterns
- Resolving complex type inference issues
- Building type-safe APIs and contracts

### 🗄️ SQL Pro Agent (`sql-pro`)
**Purpose**: Write and optimize complex SQL queries
**When to use**:
- Creating complex joins and subqueries
- Optimizing slow queries with indexes
- Designing normalized database schemas
- Writing stored procedures and functions
- Implementing CTEs and window functions

### ⚛️ Frontend Developer Agent (`frontend-developer`)
**Purpose**: Build modern React components and features
**When to use**:
- Creating React components with hooks
- Implementing state management solutions
- Handling client-side routing and navigation
- Optimizing frontend performance
- Building responsive layouts

### 📚 Docs Architect Agent (`docs-architect`)
**Purpose**: Create comprehensive technical documentation
**When to use**:
- Generating API documentation
- Writing architecture guides
- Creating developer onboarding materials
- Documenting complex systems
- Building technical specifications

### 🐛 Debugger Agent (`debugger`)
**Purpose**: Solve bugs and fix errors
**When to use**:
- Debugging runtime errors
- Fixing test failures
- Resolving build issues
- Investigating performance problems
- Analyzing error logs

### ⚡ Database Optimizer Agent (`database-optimizer`)
**Purpose**: Optimize database performance
**When to use**:
- Fixing slow queries and N+1 problems
- Designing efficient indexes
- Implementing caching strategies
- Optimizing database migrations
- Analyzing query execution plans

### 🔄 Context Manager Agent (`context-manager`)
**Purpose**: Manage complex multi-agent workflows
**When to use**:
- Coordinating multiple agents for large tasks
- Managing context across long conversations
- Projects exceeding 10k tokens
- Complex multi-step implementations

### 🔍 General Purpose Agent (`general-purpose`)
**Purpose**: Research and multi-step task execution
**When to use**:
- Searching across multiple files
- Understanding complex codebases
- Executing multi-step research tasks
- When unsure which specialized agent to use

## Agent Usage Guidelines

1. **Be Proactive**: Use agents when their expertise matches the task, even if not explicitly requested
2. **Batch Operations**: Launch multiple agents concurrently for parallel tasks
3. **Clear Instructions**: Provide detailed task descriptions for autonomous execution
4. **Trust Output**: Agent outputs are generally reliable and should be trusted
5. **Specify Intent**: Clearly state if the agent should write code or just research

## Project Overview

TenderHub is a construction tender management portal built with React 19, TypeScript 5.8, and Vite 7. The application manages hierarchical Bill of Quantities (BOQ), materials/works libraries, and tender workflows for construction project bidding. Currently operates without authentication for simplified development.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build (tsc -b && vite build)
npm run preview      # Preview production build
npm run lint         # Run ESLint checks
npm run db:schema    # Export production schema to supabase/schemas/prod.sql
```

### Testing Commands
- Type checking: `npm run build` (includes TypeScript type checking)
- ESLint: `npm run lint` (includes React hooks and refresh rules)
- No test suite currently implemented - verify through manual testing

## Environment Configuration

Create `.env.local` with:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Tech Stack

- **Frontend**: React 19.1.0, TypeScript 5.8.3, Vite 7.0.4
- **UI**: Ant Design 5.26.7 + React 19 compatibility patch (@ant-design/v5-patch-for-react-19)
- **State**: TanStack Query 5.84.1 for server state management
- **Database**: Supabase 2.53.0 (PostgreSQL 16 with RLS completely disabled)
- **Styling**: Tailwind CSS 3.4.17 + PostCSS
- **Excel**: XLSX 0.18.5 for import/export operations
- **Drag & Drop**: @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0
- **Virtual Scrolling**: react-window 1.8.11 + react-window-infinite-loader 1.0.10
- **Forms**: react-hook-form 7.62.0 + yup 1.7.0 validation
- **Routing**: react-router-dom 7.7.1

## Architecture

### Database Schema
**🚨 CRITICAL DATABASE RULE 🚨**
```
ALL database schema information MUST be taken EXCLUSIVELY from:
supabase/schemas/prod.sql

This includes:
- Tables and their columns
- Functions and procedures  
- Views
- Triggers
- ENUMs and custom types
- Indexes
- Constraints

DO NOT rely on TypeScript types or any other source for database schema.
The prod.sql file is the SINGLE SOURCE OF TRUTH.
```

**RLS is completely disabled by design for simplified development.**

**⚠️ IMPORTANT**: The tables, functions, views, triggers, and enums listed below are EXAMPLES ONLY. 
Always verify actual schema from `supabase/schemas/prod.sql` before any database work.

### API Layer (`lib/supabase/api/`)
Modular structure with domain-specific modules (all < 600 lines):

- `boq/` - BOQ operations (crud, hierarchy, bulk, analytics, queries)
- `client-positions.ts` - Client position CRUD with auto-numbering
- `tenders.ts` - Tender lifecycle management
- `materials.ts` & `works.ts` - Library management
- `work-material-links.ts` - Work-Material relationships
- `client-works.ts` - Excel import functionality
- `hierarchy.ts` - Complete tender structure operations
- `construction-costs.ts` - Construction cost management
- `tender-construction-costs.ts` - Tender-specific cost operations
- `cost-categories.ts` & `cost-categories-v2.ts` - Cost category management
- `cost-nodes.ts` - Cost node hierarchy management
- `import-costs.ts` - Cost import functionality
- `subscriptions.ts` - Real-time subscriptions (infrastructure ready but disabled)
- `utils.ts` - Shared error handling and pagination
- `index.ts` - Barrel exports for backward compatibility

### Component Organization
```
src/components/tender/  # Core tender components
  - TenderBOQManagerNew.tsx # Main BOQ interface
  - BOQItemList/         # Virtualized item lists with drag-drop
  - LibrarySelector/     # Material/work selection with cart
  - MaterialLinkModal.tsx # Modal for linking materials to works
src/pages/              # Route components
  - TendersPage/         # Tender listing with filters & stats
  - Dashboard.tsx        # Main dashboard with statistics
  - admin/               # Admin pages for costs and users
lib/supabase/           # Supabase integration
  - api/                 # Domain-specific API modules
  - types/               # Comprehensive type definitions
```

### Routing Structure
```
/                       → Redirects to /dashboard
/dashboard              → Main dashboard with statistics
/tenders/*              → Tender management and listing
/tender/:tenderId/boq   → Specific tender's BOQ management
/boq                    → General BOQ page
/libraries/materials    → Materials library
/libraries/works        → Works library
/admin/users            → User management (admin)
/admin/construction-costs → Construction cost management
/admin/settings         → System settings
/profile                → User profile
```

## Critical Implementation Rules

### 1. Database Operations
- **NEVER enable RLS** - Disabled by design for simplified development
- **🚨 MANDATORY**: Check `supabase/schemas/prod.sql` for EVERY database operation
- **DO NOT ASSUME** any table structure, function signatures, or column names
- **VERIFY FIRST** - Always read prod.sql before writing any database-related code
- **Note**: Functions mentioned in code may not exist - always verify in prod.sql
- All tables use UUID primary keys (verify in prod.sql)
- Timestamps are usually auto-managed (verify exact column names in prod.sql)

### 2. File Size Limits
- **Maximum 600 lines per file** - Split larger files
- Extract hooks to separate files
- Use barrel exports

### 3. Logging Requirements
Every function must include comprehensive logging:

```typescript
console.log('🚀 [FunctionName] called with:', params);
console.log('✅ [FunctionName] completed:', result);
console.log('❌ [FunctionName] failed:', error);
```

Use emoji system: 🚀 Start, ✅ Success, ❌ Error, 📡 API call, 📦 Response, 🔍 Validation, 🔄 State change

### 4. Error Handling
```typescript
try {
  console.log('🔍 Checking existence...');
  // Perform operation
  console.log('✅ Success');
} catch (error) {
  console.error('💥 Error details:', {
    message: error.message,
    context: relevantData,
    timestamp: new Date().toISOString()
  });
}
```

## Development Workflow

### Before Starting
1. Ensure `.env.local` exists with Supabase credentials
2. Run `npm install` to get all dependencies
3. Start dev server with `npm run dev`

### Vite Configuration (vite.config.ts)
- Dev server runs on port 5173 with host enabled
- HMR overlay disabled for cleaner development experience
- HMR timeout set to 5000ms
- lucide-react excluded from dependency optimization

### Excel Import/Export
- Import: Drag-drop XLSX file to upload area in TendersPage
- System uses batch API operations for performance (via `client-works.ts`)
- Handles 5000+ rows efficiently with `UploadProgressModal`
- Export: Uses XLSX library to generate formatted spreadsheets
- Import target: 5000 rows in ≤ 30 seconds

### Database Schema Changes
1. Modify schema in Supabase dashboard
2. Run `npm run db:schema` to export updated schema to `supabase/schemas/prod.sql`
3. **CRITICAL**: Read the updated prod.sql to understand actual changes
4. Update TypeScript types in `lib/supabase/types/database/` to match prod.sql
5. **Never trust TypeScript types over prod.sql** - database is source of truth

### Performance Optimizations
- GIN indexes for full-text search on materials/works libraries
- Virtual scrolling with react-window for BOQ lists (handles 10,000+ items)
- Lazy loading with InfiniteLoader for pagination
- Debounced search inputs (300ms default)
- Code splitting by route with React.lazy()
- Dynamic imports for heavy components (Excel processing)
- Connection monitoring for Supabase connection status

## Project Conventions

### UI/UX
- **Language**: Russian UI throughout (all user-facing text)
- **Components**: Ant Design components with custom styling
- **Layout**: Responsive design with Tailwind utilities
- **Forms**: react-hook-form with yup validation
- **Tables**: Virtual scrolling for performance
- **Modals**: Used for all create/edit operations

### Code Organization
- **Components**: Grouped by feature in `components/tender/`
- **Pages**: Route components in `pages/` with subdirectories for complex pages
- **Hooks**: Custom hooks extracted to separate files
- **Types**: Centralized in `lib/supabase/types/`
- **API**: Domain-specific modules in `lib/supabase/api/`

### State Management
- **Server State**: TanStack Query with 5-minute cache
- **Local State**: React hooks (useState, useReducer)
- **Form State**: react-hook-form
- **No global state management** (Redux/Zustand not used)

## Current Status

### ✅ Implemented
- Hierarchical BOQ with drag-drop reordering
- Excel import/export with progress tracking
- Materials/Works libraries with search
- Dashboard with statistics
- Russian UI throughout
- Work-Material linking system with usage coefficients
- Virtual scrolling for large datasets
- Expandable search bars with autocomplete
- Construction cost management system
- Cost category import and management
- Tender-specific construction costs

### ⚠️ Disabled/Not Implemented
- Authentication (no login required)
- Real-time features (infrastructure ready but disabled)
- File storage/documents
- Edge Functions for commercial cost calculation
- Advanced analytics
- OAuth 2.0 integration

### Known Issues
- Large Excel imports (>10,000 rows) may timeout
- Drag-drop reordering can be slow with many items
- Some Ant Design components show React 19 compatibility warnings (patches applied)

## Testing

Currently no test suite implemented. Verify functionality through:
- Manual testing in development server
- Type checking via `npm run build`
- ESLint for code quality via `npm run lint`

## Important Notes

- **Modal-Based Material Linking**: Material to work linking now uses `MaterialLinkModal.tsx` instead of drag-drop
- **Tailwind Preflight Disabled**: Set to `false` in tailwind.config.js to avoid conflicts with Ant Design styles
- **Virtual Scrolling**: Essential for performance with large BOQ lists - always use react-window components
- **Connection Monitoring**: Built-in Supabase connection status tracking in layout
- **TypeScript Configuration**: Uses project references with separate configs for app (tsconfig.app.json) and node (tsconfig.node.json)
- **ESLint Configuration**: Uses typescript-eslint with React hooks and refresh plugins

## 🚨 DATABASE GOLDEN RULE 🚨

```sql
-- BEFORE ANY DATABASE WORK:
-- 1. Open supabase/schemas/prod.sql
-- 2. Search for the table/function/view you need
-- 3. Read the EXACT structure from prod.sql
-- 4. Use ONLY what you find in prod.sql

-- TypeScript types are SECONDARY and may be outdated
-- Code examples may reference non-existent structures
-- TRUST ONLY prod.sql
```

## IDE Integration

- **WebStorm Integration**: Project is set up for WebStorm development with IDE-specific configurations
- **Git Status**: Main branch is `main`, use for all pull requests
- **Code Style**: Follow existing patterns and conventions in neighboring files

Remember: This is a simplified development environment. Production deployment will require enabling authentication, RLS, and other security features.