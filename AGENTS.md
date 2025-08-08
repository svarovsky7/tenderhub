# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**⚠️ IMPORTANT: This file must always be kept synchronized with `AGENTS.md`. Any changes to CLAUDE.md should be immediately replicated to AGENTS.md to ensure consistency.**

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
- **Virtual Scrolling**: react-window 1.8.11 for large lists
- **Forms**: react-hook-form 7.62.0 + yup 1.7.0 validation
- **Routing**: react-router-dom 7.7.1

## Architecture Highlights

### Database Schema
**CRITICAL**: Always refer to `supabase/schemas/prod.sql` for authoritative schema. RLS is completely disabled by design.

Key tables:
- `tenders` - Main tender projects with status tracking
- `client_positions` - Top-level BOQ groupings with auto-numbering via `get_next_client_position_number()`, includes `manual_volume` field
- `boq_items` - Hierarchical items with auto-calculated totals, includes `consumption_coefficient` & `conversion_coefficient`
- `materials_library` & `works_library` - Searchable catalogs with GIN indexes for full-text search
- `work_material_links` - Links works to materials with usage coefficients, validated by `check_work_material_types()` trigger

Key functions:
- `bulk_insert_boq_items()` - Optimized for Excel imports (5000+ rows)
- `get_next_sub_number()` - Auto-numbering for hierarchical items
- `get_materials_for_work()` - Retrieves linked materials with calculations

### API Layer (`lib/supabase/api/`)
Modular structure split from original 2,344-line file into domain-specific modules (all < 600 lines):

Core modules:
- `boq/` - BOQ operations subdirectory:
  - `crud.ts` - Create, read, update, delete operations
  - `hierarchy.ts` - Tree structure management
  - `bulk.ts` - Batch operations for Excel imports
  - `analytics.ts` - Statistics and calculations
  - `queries.ts` - Complex search queries
- `client-positions.ts` (296 lines) - Client position CRUD with auto-numbering
- `tenders.ts` (234 lines) - Tender lifecycle management
- `materials.ts` (147 lines) & `works.ts` (143 lines) - Library management
- `work-material-links.ts` - Work-Material relationships
- `client-works.ts` (165 lines) - Excel import functionality
- `hierarchy.ts` (454 lines) - Complete tender structure operations
- `subscriptions.ts` (121 lines) - Real-time subscriptions (infrastructure ready)
- `utils.ts` (37 lines) - Shared error handling and pagination
- `index.ts` - Barrel exports for backward compatibility

### Component Organization
```
src/components/tender/  # Core tender components
  - TenderBOQManager.tsx # Main BOQ interface
  - BOQItemList/         # Virtualized item lists with drag-drop
  - LibrarySelector/     # Material/work selection with cart
src/pages/              # Route components
  - TendersPage/         # Tender listing with filters & stats
lib/supabase/           # Supabase integration
  - api/                 # Domain-specific API modules
  - types/               # Comprehensive type definitions
```

## Testing Commands

```bash
npm run lint          # Run ESLint with configured rules
npm run build         # Type-check and build (will fail on type errors)
```

**Note**: No test suite currently implemented. Verify functionality through:
- Manual testing in development server
- Type checking via `npm run build`
- ESLint for code quality

## Critical Implementation Rules

### 1. Database Operations
- **NEVER enable RLS** - Disabled by design for simplified development
- **ALWAYS check** `supabase/schemas/prod.sql` for authoritative schema before database work
- Use `bulk_insert_boq_items()` for large imports (handles 5000+ rows efficiently)
- Auto-numbering handled by database functions:
  - `get_next_client_position_number()` for positions
  - `get_next_sub_number()` for hierarchical items
- Work-Material links validated by `check_work_material_types()` trigger
- All tables use UUID primary keys
- Timestamps (`created_at`, `updated_at`) auto-managed

### 2. File Size Limits
- **Maximum 600 lines per file** - Split larger files
- Extract hooks to separate files
- Split API by domain (already implemented in `api/` folder)
- Use barrel exports

### 3. Logging Requirements
**MANDATORY**: Every function must include comprehensive logging:

```typescript
console.log('🚀 [FunctionName] called with:', params);
console.log('✅ [FunctionName] completed:', result);
console.log('❌ [FunctionName] failed:', error);
```

Use emoji system:
- 🚀 Function start
- ✅ Success
- ❌ Error
- 📡 API call
- 📦 API response
- 🔍 Validation
- 🔄 State change

### 4. Error Handling
```typescript
try {
  console.log('🔍 Checking existence...');
  // Check existence before operations
  console.log('📡 Calling API...');
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

### ⚠️ Disabled
- Authentication (no login required)
- Real-time features (infrastructure ready)

### ❌ Not Implemented
- File storage/documents
- Edge Functions for commercial cost calculation
- Advanced analytics
- OAuth 2.0 integration

## Common Development Tasks

### Running the Application
```bash
npm install          # Install all dependencies
npm run dev          # Start development server at http://localhost:5173
```

### Adding BOQ Items
1. Use `LibrarySelector` component for material/work selection with cart functionality
2. Items auto-calculate: `total = quantity × consumption_coefficient × conversion_coefficient × price`
3. Positions auto-number via `get_next_client_position_number()` database function

### Excel Import/Export
1. Import: Drag-drop XLSX file to upload area in TendersPage
2. System uses `bulk_insert_boq_items()` for performance
3. Handles 5000+ rows efficiently with `UploadProgressModal`
4. Export: Uses XLSX library to generate formatted spreadsheets

### Database Schema Changes
1. Modify schema in Supabase dashboard (https://supabase.com/dashboard)
2. Run `npm run db:schema` to export updated schema to `supabase/schemas/prod.sql`
3. Update TypeScript types in `lib/supabase/types/database/`
4. Regenerate types if needed using Supabase CLI

### Working with Real-time Features
Real-time infrastructure is ready but currently disabled. To enable:
1. Uncomment subscription code in `lib/supabase/api/subscriptions.ts`
2. Add channel management in components
3. Handle optimistic updates for better UX

## Performance Optimizations

### Database Level
- GIN indexes on `materials_library` and `works_library` for full-text search
- Generated columns for auto-calculations (reduces client-side computation)
- Bulk operations via `bulk_insert_boq_items()` function
- Optimized queries with proper indexing on foreign keys

### Frontend Level
- Virtual scrolling with react-window for BOQ lists (handles 10,000+ items)
- Lazy loading with InfiniteLoader for pagination
- Memoization of expensive calculations
- Debounced search inputs (300ms default)
- Optimistic updates prepared for real-time features

### Bundle Optimization
- Code splitting by route
- Tree-shaking enabled via modular API structure
- Dynamic imports for heavy components (Excel processing)

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

## Development Workflow

### Before Starting
1. Ensure `.env.local` exists with Supabase credentials
2. Run `npm install` to get all dependencies
3. Start dev server with `npm run dev`

### When Making Changes
1. **Database**: Always check `supabase/schemas/prod.sql` first
2. **Logging**: Add comprehensive logging to all functions (see Logging Requirements)
3. **File Size**: Keep files under 600 lines - split if larger
4. **Testing**: Test with large datasets (5000+ rows) for performance
5. **UI**: Verify Russian text displays correctly
6. **Types**: Run `npm run build` to catch type errors
7. **Linting**: Run `npm run lint` before committing

### Current Limitations
- **No Authentication**: All features accessible without login (development mode)
- **No Real-time**: Infrastructure ready but disabled
- **No File Storage**: Document upload UI exists but not connected
- **No Edge Functions**: Commercial cost calculation not implemented
- **No Tests**: Manual testing only

### Known Issues
- Large Excel imports (>10,000 rows) may timeout
- Drag-drop reordering can be slow with many items
- Some Ant Design components show React 19 compatibility warnings (patches applied)

Remember: This is a simplified development environment. Production deployment will require enabling authentication, RLS, and other security features.