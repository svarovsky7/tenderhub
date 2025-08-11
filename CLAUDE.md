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

## Architecture

### Database Schema
**CRITICAL**: Always refer to `supabase/schemas/prod.sql` for authoritative schema. RLS is completely disabled by design.

Key tables:
- `tenders` - Main tender projects with status tracking
- `client_positions` - Top-level BOQ groupings with auto-numbering via `get_next_client_position_number()`, includes `manual_volume` field
- `boq_items` - Hierarchical items with auto-calculated totals, includes `consumption_coefficient` & `conversion_coefficient`
- `materials_library` & `works_library` - Searchable catalogs with GIN indexes for full-text search
- `work_material_links` - Links works to materials with usage coefficients, validated by `check_work_material_types()` trigger

Key database functions:
- `get_next_client_position_number()` - Auto-numbering for client positions
- `get_next_sub_number()` - Auto-numbering for hierarchical BOQ items
- `get_materials_for_work()` - Retrieves linked materials with calculations
- `get_works_using_material()` - Finds works that use a specific material
- `check_work_material_types()` - Validates work-material link types
- `recalculate_client_position_totals()` - Updates position totals based on child items
- `auto_assign_position_number()` - Trigger function for automatic position numbering

### API Layer (`lib/supabase/api/`)
Modular structure with domain-specific modules (all < 600 lines):

- `boq/` - BOQ operations (crud, hierarchy, bulk, analytics, queries)
- `client-positions.ts` - Client position CRUD with auto-numbering
- `tenders.ts` - Tender lifecycle management
- `materials.ts` & `works.ts` - Library management
- `work-material-links.ts` - Work-Material relationships
- `client-works.ts` - Excel import functionality
- `hierarchy.ts` - Complete tender structure operations
- `subscriptions.ts` - Real-time subscriptions (infrastructure ready but disabled)
- `utils.ts` - Shared error handling and pagination
- `index.ts` - Barrel exports for backward compatibility

### Component Organization
```
src/components/tender/  # Core tender components
  - TenderBOQManagerNew.tsx # Main BOQ interface
  - BOQItemList/         # Virtualized item lists with drag-drop
  - LibrarySelector/     # Material/work selection with cart
src/pages/              # Route components
  - TendersPage/         # Tender listing with filters & stats
lib/supabase/           # Supabase integration
  - api/                 # Domain-specific API modules
  - types/               # Comprehensive type definitions
```

## Critical Implementation Rules

### 1. Database Operations
- **NEVER enable RLS** - Disabled by design for simplified development
- **ALWAYS check** `supabase/schemas/prod.sql` for authoritative schema before database work
- **Note**: `bulk_insert_boq_items()` function may not exist in current schema - use batch inserts via API
- All tables use UUID primary keys
- Timestamps (`created_at`, `updated_at`) auto-managed

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

### Excel Import/Export
- Import: Drag-drop XLSX file to upload area in TendersPage
- System uses batch API operations for performance (via `client-works.ts`)
- Handles 5000+ rows efficiently with `UploadProgressModal`
- Export: Uses XLSX library to generate formatted spreadsheets
- Import target: 5000 rows in ≤ 30 seconds

### Database Schema Changes
1. Modify schema in Supabase dashboard
2. Run `npm run db:schema` to export updated schema
3. Update TypeScript types in `lib/supabase/types/database/`

### Performance Optimizations
- GIN indexes for full-text search on materials/works libraries
- Virtual scrolling with react-window for BOQ lists (handles 10,000+ items)
- Lazy loading with InfiniteLoader for pagination
- Debounced search inputs (300ms default)
- Code splitting by route
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

Remember: This is a simplified development environment. Production deployment will require enabling authentication, RLS, and other security features.