# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**⚠️ IMPORTANT: This file must always be kept synchronized with `AGENTS.md`. Any changes to CLAUDE.md should be immediately replicated to AGENTS.md to ensure consistency.**

## Project Overview

TenderHub is a comprehensive tender management portal for construction industry workflows built with React 19.1.0, TypeScript 5.8, and Vite 7. The application is currently fully functional without authentication for simplified development.

### Business Context

TenderHub manages construction tender operations with implemented features:
- **Hierarchical BOQ Management**: Client positions with nested BOQ items, automatic numbering
- **Excel Import/Export**: XLSX file processing for client works and BOQ data  
- **Materials & Works Libraries**: Comprehensive catalogs with categories and pricing
- **Tender Lifecycle**: Complete CRUD operations with status management and statistics
- **Advanced UI**: Drag-and-drop, virtualized tables, collapsible hierarchies
- **Russian Language Interface**: All UI text in Russian

### Current Implementation Status
- ✅ **Core Features**: Fully implemented tender, BOQ, and library management
- ✅ **Database Schema**: Complete with views, functions, and automatic calculations
- ✅ **API Layer**: Comprehensive TypeScript API (2000+ lines) with error handling
- ⚠️ **Authentication**: Currently disabled - all features accessible without login
- ⚠️ **Real-time Features**: Infrastructure prepared but not active
- ❌ **File Management**: Supabase Storage integration not implemented

## Development Commands

```bash
npm install          # Install all dependencies
npm run dev          # Start development server with HMR (http://localhost:5173)
npm run build        # Build for production (runs tsc -b && vite build)
npm run preview      # Preview production build locally
npm run lint         # Run ESLint for code quality checks
```

### Environment Setup
Requires `.env.local` file with Supabase credentials:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Database Schema Commands
```bash
npm run db:schema      # Dump current production schema to supabase/schemas/prod.sql
supabase db reset      # Reset database and apply migrations
supabase db push       # Push local schema changes to remote database
```

## Project Architecture

### Current Tech Stack (Implemented)
- **Frontend**: React 19.1.0 + TypeScript 5.8.3
- **Build Tool**: Vite 7.0.4 with @vitejs/plugin-react 4.6.0
- **UI Framework**: Ant Design 5.26.7 with icons (@ant-design/icons) + React 19 compatibility patch
- **State Management**: TanStack Query 5.84.1 + React Context
- **Routing**: React Router DOM v7.7.1
- **Backend**: Supabase 2.53.0 (PostgreSQL, Storage, Realtime) + CLI tools
- **Authentication**: Currently disabled (Supabase Auth available but not active)
- **Styling**: Tailwind CSS 3.4.17 + PostCSS + Autoprefixer
- **Code Quality**: ESLint 9 with TypeScript and React plugins

### Additional Dependencies
- **Excel Processing**: XLSX 0.18.5 for import/export functionality
- **Drag & Drop**: DnD Kit (@dnd-kit/core, sortable, utilities)
- **Virtualization**: react-window + react-window-infinite-loader for performance
- **Date Handling**: dayjs 1.11.13
- **React 19 Compatibility**: @ant-design/v5-patch-for-react-19 1.0.3
- **TypeScript**: Comprehensive type system (983 lines) with strict configuration
- **Database**: RLS disabled, optimized for hierarchical BOQ structure

### Project Structure (Current Implementation)
```
src/
├── components/           # React components (organized by feature)
│   ├── layout/          # Layout components
│   │   └── AppLayout.tsx         # Main navigation layout
│   └── tender/          # Tender-specific components
│       ├── AddPositionModal.tsx  # Modal for adding client positions
│       ├── BOQItemForm.tsx       # BOQ item creation/edit form
│       ├── BOQItemList.tsx       # BOQ items display and management
│       ├── ClientPositionCard.tsx # Position display card component
│       ├── ClientPositionForm.tsx # Client position creation form
│       ├── LibrarySelector.tsx   # Material/work library selector
│       ├── TenderBOQManager.tsx  # Main BOQ management interface
│       └── index.ts              # Component exports
├── lib/                 # External library configurations
│   └── supabase/        # Supabase integration layer (comprehensive)
│       ├── api.ts       # API service functions (2062 lines)
│       ├── client.ts    # Supabase client configuration
│       ├── hooks.ts     # Custom React hooks for Supabase
│       ├── types.ts     # TypeScript definitions (983 lines)
│       ├── index.ts     # Public exports
│       ├── README.md    # API documentation
│       ├── HIERARCHY_API_EXAMPLES.md  # Usage examples
│       └── HIERARCHY_API_SUMMARY.md   # API reference
├── pages/               # Page components (route handlers)
│   ├── admin/           # Admin interface pages
│   │   ├── SettingsPage.tsx      # System settings
│   │   └── UsersPage.tsx         # User management
│   ├── BOQPage.tsx      # BOQ management page
│   ├── Dashboard.tsx    # Main dashboard with statistics
│   ├── Materials.tsx    # Materials library (legacy)
│   ├── MaterialsPage.tsx # Materials library management
│   ├── ProfilePage.tsx  # User profile (placeholder)
│   ├── TenderBoq.tsx    # Tender BOQ interface (555 lines)
│   ├── TenderDetailPage.tsx # Individual tender details
│   ├── TendersPage.tsx  # Tenders listing and management (889 lines)
│   ├── Works.tsx        # Works library (legacy)
│   └── WorksPage.tsx    # Works library management
├── App.tsx              # Main application with routing
├── main.tsx             # Application entry point
└── vite-env.d.ts        # Vite environment types
```

### TypeScript Configuration
- Composite configuration with separate configs for app and node
- Strict mode enabled with all strict checks
- Target ES2022 for modern JavaScript features
- Module resolution set to bundler mode for Vite compatibility

## Key Features Status

### ✅ Implemented Features

#### 1. Hierarchical BOQ Management
- **Client Positions**: Top-level groupings with automatic numbering
- **BOQ Items**: Nested under positions with sub-numbering and sorting
- **Formula Calculation**: Automatic `total_amount = quantity × coefficient × price_unit`
- **UI Components**: `TenderBOQManager`, `BOQItemList`, `ClientPositionCard` with Ant Design
- **Drag & Drop**: DnD Kit integration for reordering items and positions

#### 2. Excel Integration
- **XLSX Import**: Client works and BOQ data import via XLSX 0.18.5
- **File Processing**: Drag-and-drop upload with validation
- **Bulk Operations**: `bulk_insert_boq_items()` database function for performance
- **Data Mapping**: Structured parsing from Excel to hierarchical BOQ structure

#### 3. Materials & Works Libraries
- **Full CRUD**: Complete management interface for catalogs
- **Categories**: Hierarchical categorization system
- **Search**: Full-text search with GIN indexes
- **Auto-complete**: `LibrarySelector` component for BOQ item selection

#### 4. Dashboard & Analytics
- **Tender Statistics**: Win-rate calculations and tender counts by status
- **Performance Metrics**: Basic analytics with Supabase aggregation queries
- **Russian UI**: Complete interface in Russian language

### ⚠️ Partially Implemented

#### 5. Real-time Collaboration (Infrastructure Ready)
- **Database Setup**: Realtime channels configured in Supabase
- **API Layer**: WebSocket event handling prepared in api.ts
- **Missing**: Active real-time synchronization and conflict resolution UI

### ❌ Not Yet Implemented

#### 6. Authentication System
- Database schema supports user roles but no active auth
- Supabase Auth configured but disabled
- All features accessible without login restrictions

#### 7. File Management & Storage
- Supabase Storage integration not active
- No file upload/download for tender documents
- Missing document preview capabilities

#### 8. Advanced Analytics & Edge Functions  
- No Supabase Edge Functions for commercial cost calculations
- Basic analytics only, missing complex reporting
- No XLSX/PDF export functionality

## Database Schema (Supabase PostgreSQL)

**Status**: Fully implemented with hierarchical BOQ structure and performance optimizations

**⚠️ CRITICAL**: The authoritative database schema is located in `supabase/schemas/prod.sql`. All database operations, API calls, and type definitions MUST align with this schema. Do not assume any table structure - always refer to `prod.sql` first.

### Core Tables (Implemented)
- `users` - User profiles with roles (Administrator, Engineer, View-only)
- `tenders` - Main tender projects with client details and status management
- `client_positions` - Top-level groupings for BOQ items with hierarchical numbering
- `boq_items` - Bill of Quantities with generated total_amount and hierarchical structure
- `tender_client_works` - Client work specifications with Excel import support
- `materials_library` - Master catalog with categories, pricing, and full-text search
- `works_library` - Work items catalog with labor components and categories
- `history_log` - Comprehensive audit trail with JSONB change tracking

### Advanced Database Features
- **Hierarchical BOQ Structure**: Client positions → BOQ items with automatic numbering
- **Generated Columns**: Automatic `total_amount` calculation (quantity × coefficient × price_unit)
- **Database Views**: `boq_summary`, `client_positions_summary`, `tender_hierarchy`, `tender_analytics`, `slow_queries`
- **Database Functions**: `bulk_insert_boq_items()`, `get_next_client_position_number()`, cost calculation triggers
- **Performance Indexes**: GIN indexes for full-text search, composite indexes for common queries
- **Audit System**: Automatic change tracking with old/new data snapshots in JSONB format

### Key Implementation Details
- **IMPORTANT: RLS is DISABLED** - All tables have RLS turned off for simplified development
- **Schema Source**: `supabase/schemas/prod.sql` contains complete table definitions, types, functions, and constraints
- **Bulk Operations**: Optimized `bulk_insert_boq_items()` function for Excel imports (5000+ rows)
- **Real-time Ready**: Infrastructure prepared for Supabase Realtime (channels configured but not active)
- **Hierarchical Data**: Support for work/sub-work, material/sub-material categorization
- **Excel Upload Fix**: Duplicate key error resolution for client_positions with automatic position numbering

## API Architecture

### Comprehensive API Layer (`lib/supabase/api.ts` - 2062 lines)

The API layer is extremely comprehensive and includes:

#### Core Operations
- **Tenders**: Full CRUD with status management, statistics, and filtering
- **Client Positions**: Hierarchical management with automatic numbering
- **BOQ Items**: Nested operations with bulk insert capabilities
- **Libraries**: Materials and Works with category management and search

#### Advanced Features
- **Bulk Operations**: Mass insert/update operations for Excel imports
- **Hierarchical Queries**: Complex joins for client positions → BOQ items relationships
- **Statistics**: Win-rate calculations, tender analytics, cost summaries
- **Search & Filtering**: Full-text search with pagination and sorting
- **Error Handling**: Comprehensive error catching with detailed error messages

#### TypeScript Integration (`lib/supabase/types.ts` - 983 lines)
- **Database Types**: Complete type definitions for all tables and views
- **API Response Types**: Typed responses for all operations
- **Hierarchical Types**: Complex nested types for BOQ structures
- **Search & Filter Types**: Typed parameters for all query operations

#### Key Architectural Patterns
- **Service Layer Pattern**: Centralized business logic in API functions
- **Type-Safe Operations**: All database operations are fully typed
- **Error Boundaries**: Consistent error handling across all operations
- **Pagination Support**: Built-in pagination for large datasets
- **Real-time Subscriptions**: Infrastructure ready for live updates

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
   - **CRITICAL**: Database schema is defined in `supabase/schemas/prod.sql` - this is the authoritative source
   - Additional schema info available in `database_structure.json` for reference
   - Tailwind CSS for styling system

2. **Code Quality**
   - TypeScript strict mode enabled
   - ESLint with React and TypeScript rules
   - Functional components with hooks pattern
   - Props interfaces for all components
   - **CRITICAL: Maximum 600 lines per file** - Files exceeding this limit must be refactored

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
- **ALWAYS refer to `supabase/schemas/prod.sql` for table structure** - this is the authoritative schema
- Never enable RLS on tables
- Don't write RLS policies
- Don't use RLS-related Supabase features
- Handle data access permissions in the application layer only
- Use `npm run db:schema` to export current production schema if changes are made

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
- **CRITICAL: Maximum 600 lines per file** - Split large files into smaller modules:
  - Extract hooks into separate files (`useCustomHook.ts`)
  - Split API functions by domain (`api/tenders.ts`, `api/boq.ts`)
  - Create utility files for complex logic (`utils/calculations.ts`)
  - Use barrel exports (`index.ts`) to maintain clean imports

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

### 🔍 Mandatory Logging for All Development

**EVERY function, API call, and user interaction MUST include detailed logging for rapid debugging and troubleshooting.**

### 📋 Logging Standards and Patterns

#### 1. **Function Entry/Exit Logging**
```typescript
// MANDATORY: Log at start of every function
console.log('🚀 [FunctionName] called with params:', { param1, param2 });

// MANDATORY: Log before return/completion
console.log('✅ [FunctionName] completed successfully:', result);
console.log('❌ [FunctionName] failed:', error);
```

#### 2. **API Operations Logging**
```typescript
// MANDATORY: Before API call
console.log('📡 Calling [apiName] with:', requestData);

// MANDATORY: After API response
console.log('📦 [apiName] response:', responseData);
console.log('❌ [apiName] error:', errorData);

// MANDATORY: Check existence before operations
console.log('🔍 Checking if [resource] exists...');
console.log('📋 [resource] check result:', { data, error });
```

#### 3. **User Interaction Logging**
```typescript
// MANDATORY: All button clicks and form submissions
console.log('🖱️ [ButtonName] clicked with data:', clickData);
console.log('📝 Form submitted:', formData);
console.log('✅ User confirmed action:', actionType);
console.log('❌ User cancelled action:', actionType);
```

#### 4. **State Changes Logging**
```typescript
// MANDATORY: Before state updates
console.log('🔄 Updating state:', { oldState, newState });
console.log('📊 Current items count:', items.length);
console.log('🎯 Target item:', targetItem);
```

#### 5. **Database Operations Logging**
```typescript
// MANDATORY: All CRUD operations
console.log('🔥 [tableName].delete called with ID:', id);
console.log('💾 [tableName].create called with data:', insertData);
console.log('📝 [tableName].update called with:', { id, updates });
console.log('📋 [tableName].select result:', { data, error, count });

// MANDATORY: Check related records
console.log('🔗 Checking for related [relatedTable]...');
console.log('📍 Related [relatedTable]:', { relatedData, error });
```

#### 6. **Error Context Logging**
```typescript
// MANDATORY: Comprehensive error logging
console.error('💥 [OperationName] error:', error);
console.error('💥 Error details:', {
  message: error instanceof Error ? error.message : 'Unknown error',
  stack: error instanceof Error ? error.stack : undefined,
  context: { userId, itemId, operationType },
  timestamp: new Date().toISOString()
});
```

### 🎯 Logging Emoji System for Quick Recognition

- 🚀 **Function Start**: Entry point of functions
- ✅ **Success**: Successful operations
- ❌ **Error**: Failed operations and errors
- 📡 **API Call**: External API requests
- 📦 **API Response**: API responses
- 🔍 **Check/Validation**: Existence checks, validations
- 📋 **Data Result**: Query results, data retrieval
- 🖱️ **User Action**: Button clicks, user interactions
- 📝 **Form/Input**: Form submissions, input changes
- 🔄 **State Change**: Component state updates
- 📊 **Count/Stats**: Data counts, statistics
- 🎯 **Target/Focus**: Specific item being processed
- 🔥 **Delete**: Delete operations
- 💾 **Create**: Create operations
- 📝 **Update**: Update operations
- 🔗 **Related Data**: Foreign key relationships
- 📍 **Location/Position**: Position-related data
- 💥 **Exception**: Caught exceptions
- 🏁 **Completion**: Operation completion
- ⚠️ **Warning**: Warning conditions
- 🔧 **Debug**: Debug information

## Recent Updates & Fixes

### ✅ Completed Fixes (2025-01-05)
1. **Excel Upload Duplicate Key Error**: Fixed `uq_client_positions_tender_number` constraint violation
   - Added existing position number checking before creation
   - Implemented automatic next available position number assignment
   - Enhanced logging for position creation process

2. **React 19 Compatibility**: Resolved Ant Design v5 compatibility warnings
   - Installed `@ant-design/v5-patch-for-react-19` package
   - Added compatibility import in `main.tsx`

3. **Deprecated Ant Design Props**: Updated to current API
   - `Modal`: `destroyOnClose` → `destroyOnHidden`
   - `Collapse`: `expandIconPosition="right"` → `expandIconPosition="end"`
   - `Collapse`: Migrated from `children` to `items` API structure

### 🛠 Implementation Guidelines

#### 1. **API Layer Logging (`lib/supabase/api.ts`)**
```typescript
export const exampleApi = {
  async delete(id: string): Promise<ApiResponse<null>> {
    console.log('🔥 exampleApi.delete called with ID:', id);
    
    try {
      // Check existence first
      console.log('🔍 Checking if record exists...');
      const { data: existing, error: checkError } = await supabase
        .from('table')
        .select('id, title')
        .eq('id', id)
        .single();
      
      console.log('📋 Existence check result:', { existing, checkError });
      
      if (!existing) {
        console.warn('⚠️ Record not found for deletion:', id);
        return { error: 'Record not found' };
      }

      // Check related records
      console.log('🔗 Checking for related records...');
      const { data: related } = await supabase
        .from('related_table')
        .select('id')
        .eq('parent_id', id);
      
      console.log('📍 Related records:', related);

      // Perform deletion
      console.log('🗑️ Performing deletion...');
      const { error } = await supabase
        .from('table')
        .delete()
        .eq('id', id);

      console.log('📤 Delete result:', { error });

      if (error) {
        console.error('❌ Delete error:', error);
        return { error: handleSupabaseError(error, 'Delete record') };
      }

      console.log('✅ Record deleted successfully:', id);
      return { data: null, message: 'Record deleted successfully' };
    } catch (error) {
      console.error('💥 Exception in delete:', error);
      return { error: handleSupabaseError(error, 'Delete record') };
    }
  }
};
```

#### 2. **Component Logging (React)**
```typescript
const handleAction = useCallback(async (itemId: string) => {
  console.log('🚀 handleAction called with itemId:', itemId);
  console.log('📊 Current items count:', items.length);
  
  if (!itemId) {
    console.error('❌ No itemId provided to handleAction');
    message.error('Error: Item ID not found');
    return;
  }

  const targetItem = items.find(item => item.id === itemId);
  console.log('🎯 Target item:', targetItem);

  try {
    console.log('📡 Calling API...');
    const result = await api.performAction(itemId);
    
    console.log('📦 API result:', result);
    
    if (result.error) {
      console.error('❌ API returned error:', result.error);
      throw new Error(result.error);
    }

    console.log('✅ Action successful');
    message.success('Action completed successfully');
    
    console.log('🔄 Reloading data...');
    await loadData();
    console.log('✅ Data reloaded successfully');
    
  } catch (error) {
    console.error('💥 Action error:', error);
    console.error('💥 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      itemId,
      itemTitle: targetItem?.title
    });
    
    message.error(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}, [items, loadData]);
```

#### 3. **Event Handler Logging**
```typescript
// MANDATORY logging for all click handlers
onClick: () => {
  console.log('🖱️ Delete button clicked for record:', record);
  console.log('🔑 Record ID:', record.id);
  console.log('📝 Record title:', record.title);
  handleDelete(record.id);
}
```

### 🚨 Critical Logging Requirements

1. **NEVER deploy without comprehensive logging** in development functions
2. **ALWAYS log function entry points** with parameters
3. **ALWAYS log API calls** before and after execution
4. **ALWAYS log user interactions** (clicks, form submissions)
5. **ALWAYS log state changes** with old/new values
6. **ALWAYS log error context** with full details
7. **ALWAYS check and log related data** before operations
8. **ALWAYS log completion status** of operations

### 🔧 Development Workflow with Logging

1. **Before Writing Code**: Plan logging points
2. **During Implementation**: Add logs at every step
3. **Before Testing**: Verify all critical paths have logs
4. **During Debugging**: Use logs to trace execution flow
5. **Before Code Review**: Ensure comprehensive logging coverage

### 📊 Performance Logging

```typescript
// MANDATORY: Log performance-critical operations
const startTime = performance.now();
console.log('⏱️ Starting [operationName]...');

// ... operation code ...

const endTime = performance.now();
console.log('⏱️ [operationName] completed in:', `${endTime - startTime}ms`);
```

### 🎯 Log Review Checklist

Before any code commit, verify:
- ✅ All function entry points logged
- ✅ All API calls logged (request + response)
- ✅ All user interactions logged
- ✅ All error scenarios logged with context
- ✅ All state changes logged
- ✅ All database operations logged
- ✅ All performance-critical operations timed

**Remember: Comprehensive logging is not optional - it's mandatory for maintainable code and rapid debugging in TenderHub.**