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
- **Virtual Scrolling**: react-window 1.8.11 + infinite-loader
- **Forms**: react-hook-form 7.62.0 + yup validation
- **Routing**: react-router-dom 7.7.1

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
- Real-time subscriptions ready but disabled

### Component Organization
```
src/components/tender/     # Core BOQ components
  TenderBOQManagerNew.tsx  # Main BOQ interface
  BOQItemList/            # Virtual scrolling lists
  LibrarySelector/        # Material/work selection
  MaterialLinkModal.tsx   # Material linking UI

src/pages/                # Route components
  TendersPage/            # Tender management
  Dashboard.tsx           # Statistics dashboard
  admin/                  # Admin interfaces
```

### Routing (all lazy-loaded)
- `/` → `/dashboard`
- `/tenders/*` - Tender management
- `/tender/:tenderId/boq` - Specific tender BOQ
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
- **Local State**: React hooks only
- **Form State**: react-hook-form + yup
- **No Redux/Zustand** - Keep it simple

### UI/UX Standards
- **Language**: Russian UI throughout
- **Components**: Ant Design with Tailwind utilities
- **Modals**: All create/edit operations
- **Virtual Scrolling**: Required for large lists (>100 items)
- **Debounced Search**: 300ms default

### Performance Optimizations
- Code splitting with React.lazy() for all routes
- Virtual scrolling with react-window for BOQ lists
- GIN indexes for full-text search
- Dynamic imports for heavy operations
- Batch API operations for Excel import

### Code Organization
- Components grouped by feature in `components/tender/`
- Custom hooks extracted to separate files
- Types centralized in `lib/supabase/types/`
- Domain-specific API modules

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
- Strict mode enabled with all strict checks
- Target: ES2022
- Module: ESNext with bundler resolution
- Project references: tsconfig.app.json (source code), tsconfig.node.json (config files)

## Current Status

### ✅ Working
- Hierarchical BOQ with drag-drop
- Excel import/export with progress
- Materials/Works libraries
- Dashboard statistics
- Work-Material linking
- Virtual scrolling
- Construction cost management
- Delivery cost management for materials

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
- **ESLint**: Flat config with React hooks/refresh plugins (note: globalIgnores import on line 6 may need adjustment)
- **Connection Monitoring**: Built-in Supabase status tracking via ConnectionStatus component
- **Excel Import**: Batch operations via `client-works.ts` and `client-positions.ts`
- **BOQ Simplified Page**: Alternative interface available at `/boq` (see BOQ_SIMPLIFIED_GUIDE.md)

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