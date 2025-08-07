# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenderHub is a construction tender management system built with React 19, TypeScript 5.8, and Vite 7. The application manages Bill of Quantities (BOQ), materials/works libraries, and tender workflows. Currently operates without authentication.

## Development Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Start dev server (http://localhost:5173)
npm run build                  # Production build (runs tsc -b && vite build)
npm run lint                   # Run ESLint
npm run preview                # Preview production build
npm run db:schema              # Export schema to supabase/schemas/prod.sql
```

**Note**: No typecheck script exists. Type checking happens during `npm run build` via `tsc -b`.

## Environment Setup

Configure `.env.local` with Supabase credentials:
```
VITE_SUPABASE_URL=https://lkmgbizyyaaacetllbzr.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Security Note**: The `.env.local` file contains sensitive credentials (DB password). Never commit this file.

## Tech Stack

- **Frontend**: React 19.1.0, TypeScript 5.8.3, Vite 7.0.4
- **UI**: Ant Design 5.26.7 + React 19 compatibility patch (`@ant-design/v5-patch-for-react-19`)
- **State**: TanStack Query 5.84.1
- **Database**: Supabase (PostgreSQL 17, RLS disabled)
- **Styling**: Tailwind CSS 3.4.17
- **Excel**: XLSX 0.18.5
- **Lists**: react-window 1.8.11 (virtualization)
- **DnD**: @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0

## Architecture

### Core Modules

```
src/lib/supabase/api/          # API layer split by domain
  - boq/                       # BOQ operations - modular structure
    - analytics.ts             # Cost distribution, summaries
    - bulk.ts                  # Bulk create/update/delete
    - crud.ts                  # Basic CRUD operations
    - hierarchy.ts             # Move items between positions
    - queries.ts               # Fetch by tender/position
    - index.ts                 # Main boqApi export + legacy boqItemsApi
  - client-positions.ts        # Position management with auto-numbering
  - materials.ts               # Materials library CRUD
  - works.ts                   # Works library CRUD
  - work-material-links.ts    # Material-work relationships
  - tenders.ts                 # Tender CRUD operations
  - client-works.ts            # Client-specific work items
  - users.ts                   # User management (future use)
  - subscriptions.ts           # Realtime subscriptions
  - hierarchy.ts               # Generic hierarchy utilities
  - utils.ts                   # Shared utilities
  - index.ts                   # Barrel exports

src/components/tender/         # Tender UI components
  - TenderBOQManagerNew.tsx    # Main BOQ interface with material links
  - TenderBOQManager.tsx       # Legacy BOQ interface
  - BOQItemList/              # Virtualized list components
    - VirtualList.tsx         # react-window implementation
    - DraggableList.tsx       # Drag-and-drop support
    - SortableItem.tsx        # Individual draggable items
  - LibrarySelector/          # Material/work selection modal
    - MaterialSelector.tsx    # Material search and selection
    - WorkSelector.tsx        # Work search and selection
    - Cart.tsx               # Selection cart management

src/pages/                   # Page components
  - TendersPage/             # Main tender listing
    - components/            # Table, filters, modals
    - hooks/                 # Custom hooks for data fetching
  - TenderDetailPage.tsx     # Individual tender view
  - MaterialsPage.tsx        # Materials library management
  - WorksPage.tsx           # Works library management
```

### Database Schema

**Production Schema**: Available in `supabase/schemas/prod.sql` (exported via `npm run db:schema`)

Key tables:
- `tenders` - Main tender projects
- `client_positions` - BOQ groupings with auto-numbering (position_number)
- `boq_items` - Hierarchical items under positions
  - Auto-calculated: `total_amount = quantity × unit_rate`
  - Types: 'material' or 'work'
  - Sub-numbering: item_number format "X.Y" (X=position, Y=sub)
- `materials_library` & `works_library` - Searchable catalogs
- `work_material_links` - Material-work relationships (new feature)

Database features:
- PostgreSQL 17 with extensions enabled
- RLS disabled (no auth required)
- Auto-update triggers for `updated_at` columns
- Auto-recalculation trigger for position totals
- GIN indexes for full-text search (Russian language)
- Unique constraints on position/item numbering

### API Patterns

The API layer follows consistent patterns:

```typescript
// Standard CRUD operations
export const entityApi = {
  getAll: (filters?) => Promise<{ data, error }>,
  getById: (id) => Promise<{ data, error }>,
  create: (data) => Promise<{ data, error }>,
  update: (id, data) => Promise<{ data, error }>,
  delete: (id) => Promise<{ data, error }>
}

// BOQ API has modular structure
export const boqApi = {
  // From crud.ts
  getById, create, update, delete,
  // From queries.ts
  getByTenderId, getByClientPositionId,
  // From bulk.ts
  bulkCreate, bulkUpdate, bulkDelete,
  // From hierarchy.ts
  moveToPosition, batchMove, reorderInPosition,
  // From analytics.ts
  getSummary, getCategoryAnalytics, getCostDistribution
}
```

## Critical Rules

### 1. File Size Limits
- **Maximum 600 lines per file**
- Split large files into domain modules
- Use barrel exports (`index.ts`)

### 2. Logging Requirements
Every function must include comprehensive logging:

```typescript
console.log('🚀 [FunctionName] called with:', params);
console.log('✅ [FunctionName] completed:', result);
console.log('❌ [FunctionName] failed:', error);
```

Emoji system:
- 🚀 Function start
- ✅ Success
- ❌ Error  
- 📡 API call
- 📦 API response
- 🔍 Validation
- 🔄 State change
- 💥 Critical error (with full context)

### 3. Database Operations
- **RLS is disabled** - No authentication required
- Use bulk operations for large imports (5000+ rows)
- Check existence before create operations
- Auto-numbering handled by database functions
- Use transactions for multi-table operations

### 4. Error Handling
```typescript
try {
  console.log('🔍 Checking existence...');
  // Check first
  console.log('📡 Calling API...');
  // Perform operation
  console.log('✅ Success');
} catch (error) {
  console.error('💥 Error details:', {
    message: error.message,
    context: relevantData,
    timestamp: new Date().toISOString()
  });
  // Return error to caller
  return { data: null, error };
}
```

## Common Tasks

### Working with BOQ
1. BOQ items are hierarchical under client positions
2. Items auto-calculate: `total = quantity × unit_rate`
3. Coefficients available: `consumption_coefficient`, `conversion_coefficient`
4. Use `LibrarySelector` for material/work selection
5. Positions auto-number via database functions
6. Sub-items numbered as "position.sub" (e.g., "1.1", "1.2")

### Excel Import
1. Drag-drop XLSX file to `ExcelUpload` component
2. System uses bulk operations for performance
3. Handles 5000+ rows efficiently
4. Creates client positions from Excel structure
5. Preserves Excel fields: item_no, work_name, unit, volume

### Adding New API Endpoints
1. Add to appropriate file in `lib/supabase/api/`
2. For BOQ: use modular structure in `boq/` subdirectory
3. Follow existing CRUD patterns
4. Include comprehensive logging
5. Update barrel exports in `index.ts`
6. Handle both success and error cases

### Material-Work Links
New feature for linking materials to works:
- API: `workMaterialLinksApi` in `work-material-links.ts`
- Tables: `work_material_links` with detailed join views
- UI: Implemented in `TenderBOQManagerNew.tsx`
- Fields: quantity per work, usage coefficient, notes

## React 19 Compatibility

- Using `@ant-design/v5-patch-for-react-19` for Ant Design compatibility
- Updated Modal APIs: `destroyOnClose` → `destroyOnHidden`
- No React.FC usage - use explicit typing
- Strict mode enabled

## Performance Considerations

- **Virtualized lists**: react-window for large datasets
- **Bulk operations**: For Excel imports and mass updates
- **Indexes**: GIN for text search, btree for lookups
- **Generated columns**: Auto-calculations in database
- **Memoization**: Use React.memo for expensive components
- **Query optimization**: Use specific queries over generic ones

## Development Workflow

1. Check API modules in `lib/supabase/api/` for existing operations
2. Add comprehensive logging to all new functions
3. Keep files under 600 lines (split if needed)
4. Test with large datasets (5000+ rows)
5. Verify Russian UI text displays correctly
6. Use TypeScript strict mode
7. Handle loading and error states in UI

## Testing

Currently no test framework configured. Manual testing performed through UI.
For development testing:
- Use `npm run dev` for hot reload
- Test with production data via Supabase connection
- Verify bulk operations with large Excel files

## Deployment

- **Frontend**: Local development via Vite
- **Backend**: Supabase Cloud (production)
- **Build**: `npm run build` creates production bundle
- No CI/CD pipeline configured yet

## Supabase Configuration

Local Supabase setup available via `supabase/config.toml`:
- API port: 54321
- Database port: 54322  
- Studio port: 54323
- Major version: PostgreSQL 17
- Migrations enabled but folder empty (prod schema only)

## Notes

- Application designed for Russian market (UI text, search)
- No authentication implemented (future enhancement)
- Excel import is primary data entry method
- Focus on construction industry terminology