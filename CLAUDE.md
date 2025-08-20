# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenderHub is a construction tender management portal built with React 19, TypeScript 5.8, and Vite 7. The application manages hierarchical Bill of Quantities (BOQ), materials/works libraries, and tender workflows for construction project bidding. Currently operates without authentication for simplified development.

**Language**: Russian UI throughout the application

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build (tsc -b && vite build)
npm run preview      # Preview production build
npm run lint         # Run ESLint checks
npm run db:schema    # Export production schema to supabase/schemas/prod.sql
```

**Testing:** No test suite implemented. Verify through:
- Type checking: `npm run build`
- ESLint: `npm run lint`
- Manual testing in dev server

## Tech Stack

- **Frontend**: React 19.1.0, TypeScript 5.8.3, Vite 7.0.4
- **UI**: Ant Design 5.26.7 + React 19 patch (@ant-design/v5-patch-for-react-19)
- **State**: TanStack Query 5.84.1 (5-minute cache, no window refetch)
- **Database**: Supabase 2.53.0 (PostgreSQL 16, RLS disabled)
- **Styling**: Tailwind CSS 3.4.17 (preflight disabled for Ant Design)
- **Excel**: XLSX 0.18.5 for import/export
- **Drag & Drop**: @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0
- **Virtual Scrolling**: react-window 1.8.11 + react-window-infinite-loader 1.0.10
- **Forms**: react-hook-form 7.62.0 + yup 1.7.0 validation
- **Routing**: react-router-dom 7.7.1
- **Utilities**: lodash 4.17.21, dayjs 1.11.13

## 🚨 CRITICAL DATABASE RULE 🚨

```
ALL database operations MUST reference:
supabase/schemas/prod.sql

This is the SINGLE SOURCE OF TRUTH for:
- Tables, columns, types
- Functions and procedures
- Views and triggers
- ENUMs and indexes

NEVER trust TypeScript types over prod.sql
ALWAYS verify schema before ANY database work
```

## Architecture

### Core Database Tables
- `boq_items` - Bill of Quantities items with hierarchy
- `client_positions` - Customer position groupings
- `tenders` - Main tender records
- `materials_library` & `works_library` - Resource libraries
- `work_material_links` - M2M relationships between works and materials
- `cost_categories` & `detail_cost_categories` - Cost categorization system
- `location` - Geographic locations for costs

### API Layer (`src/lib/supabase/api/`)
Modular domain-specific modules (all < 600 lines):
- `boq/` - BOQ operations split into: crud, hierarchy, bulk, analytics, queries
- `tenders.ts` - Tender lifecycle management
- `materials.ts` & `works.ts` - Library management
- `work-material-links.ts` - Work-Material relationships
- `client-works.ts` & `client-positions.ts` - Excel import (target: 5000 rows in ≤30s)
- Cost management modules:
  - `construction-costs.ts` - Main cost operations
  - `cost-categories.ts` & `cost-categories-v2.ts` - Category management
  - `cost-structure.ts` & `cost-structure-fixed.ts` - Cost structures
  - `tender-construction-costs.ts` - Tender-specific costs
  - `import-costs.ts` - Cost data import
- `users.ts` - User management
- `work-materials-management.ts` - Combined work-material operations
- Real-time subscriptions ready but disabled

### Type System (`src/lib/supabase/types/`)
- **Database Schema**: Split into modular files (tables.ts, views.ts, functions.ts, enums.ts)
- **Domain Types**: API types, BOQ types, cost types, tender types, UI types
- **Extended Types**: Additional helper types for better DX
- **Backward Compatibility**: Re-exports for legacy imports

### Component Organization
```
src/components/tender/     # Core BOQ components (40+ components)
  TenderBOQManagerNew.tsx  # Main BOQ interface
  TenderBOQManagerSimplified.tsx # Alternative simplified BOQ
  ClientPositionCardStreamlined.tsx # Position card with inline editing
  BOQItemList/            # Virtual scrolling with drag-drop
  LibrarySelector/        # Material/work selection with cart
  MaterialLinkModal.tsx   # Material linking UI
  CostCategoryDisplay.tsx # Dynamic cost category display

src/components/common/     # Shared components
  CostDetailCascadeSelector.tsx # Combined cascade/search selector with caching
  AutoCompleteSearch.tsx # Debounced autocomplete component
  DecimalInput.tsx       # Formatted decimal input
  UploadProgressModal.tsx # File upload progress

src/components/admin/      # Admin interfaces
  ModernImportModal.tsx  # Excel import with progress
  EditableTable.tsx     # In-place table editing

src/pages/                # Route components
  TendersPage/            # Tender management with filters/stats
  Dashboard.tsx           # Statistics dashboard
  admin/                  # Admin interfaces for costs/categories
```

### Routing (all lazy-loaded)
- `/` → `/dashboard`
- `/tenders/*` - Tender management
- `/tender/:tenderId/boq` - Standard BOQ interface
- `/boq` - Simplified BOQ interface
- `/libraries/materials` - Materials library
- `/libraries/works` - Works library
- `/admin/*` - Admin pages

## Critical Implementation Rules

### 1. Database Operations
- **NEVER enable RLS** - Disabled by design
- **ALWAYS check** `supabase/schemas/prod.sql` first
- **VERIFY** table structure before any query
- All tables use UUID primary keys
- Timestamps are auto-managed
- **BOQ Items**: Uses `detail_cost_category_id` (not `cost_node_id`)
- **Base Quantity**: `base_quantity` field stores user input for unlinked materials

### 2. File Size Limits
- **Maximum 600 lines per file**
- Extract hooks to separate files
- Use barrel exports for organization

### 3. Logging Requirements
```typescript
console.log('🚀 [FunctionName] starting:', params);
console.log('✅ [FunctionName] success:', result);
console.log('❌ [FunctionName] error:', error);
```
Emojis: 🚀 Start, ✅ Success, ❌ Error, 💥 Critical Error, 📡 API, 📦 Response, 🔍 Validation, 🔄 State

### 4. Error Handling
```typescript
try {
  console.log('🔍 Validating...');
  // operation
  console.log('✅ Success');
} catch (error) {
  console.error('💥 Error:', {
    message: error.message,
    context: data,
    timestamp: new Date().toISOString()
  });
}
```

## Key Patterns & Conventions

### State Management
- **Server State**: TanStack Query with 5-minute staleTime
- **Cache Strategy**: Infinite cache for static data (categories, locations)
- **Local State**: React hooks only
- **Form State**: react-hook-form + yup
- **No Redux/Zustand** - Keep it simple

### UI/UX Standards
- **Language**: Russian UI throughout
- **Components**: Ant Design with Tailwind utilities
- **Modals**: All create/edit operations
- **Virtual Scrolling**: Required for large lists (>100 items)
- **Debounced Search**: 300ms default
- **Hover Effects**: Row highlighting with type-specific colors

### BOQ Quantity Calculations
- **Unlinked Materials**: `quantity = base_quantity * consumption_coefficient`
- **Linked Materials**: `quantity = work_quantity * consumption_coefficient * conversion_coefficient`
- **Base Quantity**: Stored only for unlinked materials, NULL for linked
- **Delivery Costs**: Calculated based on `delivery_price_type` (amount/percentage/not_included)

### Cost Categories Architecture
- **Detail Categories**: Central connecting table between categories and locations
- **Display Format**: "Category → Detail → Location"
- **Dynamic Loading**: Cost category displays loaded on-demand, not stored in DB
- **Selector Modes**: Combined cascade selection and search (min 2 chars)
- **Grouping**: Details grouped by name to avoid duplicates with different locations

### Performance Optimizations
- Code splitting with React.lazy() for all routes
- Virtual scrolling with react-window for BOQ lists
- GIN indexes for full-text search
- Dynamic imports for heavy operations
- Batch API operations for Excel import
- React Query caching for static data
- Memoization with React.memo for expensive components

### Code Organization
- Components grouped by feature in `components/tender/` (40+ BOQ-related components)
- Custom hooks extracted to separate files (`hooks/useBOQManagement.ts`, `hooks/useMaterialDragDrop.tsx`)
- Types centralized in modular `lib/supabase/types/` structure
- Domain-specific API modules with barrel exports (`src/lib/supabase/api/index.ts`)
- Utility functions in `utils/` (excel templates, formatters, calculations)
- Page components organized by feature with hooks/components subfolders

## Environment Setup

Create `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Vite Configuration
- Dev server: port 5173, host enabled
- HMR: overlay disabled, 5s timeout
- lucide-react excluded from optimization

## TypeScript Configuration
- **Project References**: Root tsconfig.json references tsconfig.app.json (src/) and tsconfig.node.json (config files)
- **Strict Mode**: All strict checks enabled
- **Target**: ES2022 with ESNext modules and bundler resolution
- **Type Safety**: Modular database types in `src/lib/supabase/types/database/`
- **Path Resolution**: Configured for absolute imports from src/

## Current Status

### ✅ Working
- Hierarchical BOQ with drag-drop
- Excel import/export with progress
- Materials/Works libraries
- Dashboard statistics
- Work-Material linking
- Virtual scrolling
- Construction cost management with cascade/search selector
- Delivery cost management for materials
- Base quantity tracking for unlinked materials
- Hover effects and visual feedback
- React Query caching for performance

### ⚠️ Disabled
- Authentication (no login)
- Real-time features
- File storage
- Edge Functions
- Advanced analytics

### Known Issues
- Large Excel imports (>10K rows) may timeout
- Drag-drop slow with many items
- Some Ant Design React 19 warnings (patches applied)

## Important Notes

- **Material Linking**: Uses `MaterialLinkModal.tsx`, not drag-drop
- **TypeScript**: Strict mode with project references (tsconfig.app.json, tsconfig.node.json)
- **ESLint**: Flat config with React hooks/refresh plugins
- **Connection Monitoring**: Built-in Supabase status tracking via ConnectionStatus component
- **Excel Import**: Batch operations via `client-works.ts` and `client-positions.ts`
- **BOQ Pages**: Two interfaces - standard (`/tender/:id/boq`) and simplified (`/boq`)

## Development Workflow

1. Check `.env.local` exists with Supabase credentials
2. Run `npm install` then `npm run dev`
3. For DB changes:
   - Modify in Supabase dashboard
   - Run `npm run db:schema` to export
   - Update types to match prod.sql
4. Always verify against `supabase/schemas/prod.sql`
5. Test with manual testing + type checking

## Specialized Agents Available

When working with complex tasks, consider using these specialized agents via the Task tool:

- **ui-ux-designer**: For creating new UI components, design systems, or improving user experience
- **backend-architect**: For designing API endpoints, database schemas, or complex business logic
- **typescript-pro**: For complex TypeScript patterns, advanced types, or generics
- **sql-pro**: For optimizing database queries, designing schemas, or complex SQL operations
- **database-optimizer**: For performance tuning, indexing strategies, or query optimization
- **debugger**: For troubleshooting errors, test failures, or unexpected behavior
- **docs-architect**: For creating comprehensive technical documentation

Remember: This is a simplified dev environment. Production will require authentication, RLS, and security features.