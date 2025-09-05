# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenderHub is a construction tender management portal built with React 19, TypeScript 5.8, and Vite 7. The application manages hierarchical Bill of Quantities (BOQ), materials/works libraries, and tender workflows for construction project bidding. Currently operates without authentication for simplified development.

**Language**: Russian UI throughout the application  
**React 19 Note**: Using compatibility patch for Ant Design (`@ant-design/v5-patch-for-react-19`)

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173, auto-assigns port if busy)
npm run build        # Production build with TypeScript checking (tsc -b && vite build)
npm run preview      # Preview production build
npm run lint         # Run ESLint checks (flat config)
npm run db:schema    # Export production schema to supabase/schemas/prod.sql
```

**Testing:** No test suite implemented. Verify through:
- Type checking: `npm run build` (will fail on type errors)
- ESLint: `npm run lint`
- Manual testing in dev server
- Database schema validation against `supabase/schemas/prod.sql`

**Build Process:**
- TypeScript compilation first (`tsc -b`) using project references
- Then Vite bundling if TypeScript succeeds
- Build will fail on any TypeScript errors
- `.tsbuildinfo` cached in `node_modules/.tmp/`

## MCP (Model Context Protocol) Integration

**Supabase MCP Server** is configured for direct database access:
- Config location: `C:\Users\odintsov.a.a\AppData\Roaming\Claude\mcp.json`
- Available after Claude Code restart
- Check connection: `/mcp list`
- Provides tools: `mcp__supabase__*` for CRUD operations
- See `MCP_SETUP.md` for troubleshooting

**GitHub MCP Server** is also configured:
- Provides tools: `mcp__github__*` for repository operations
- Package: `@modelcontextprotocol/server-github` (devDependency)

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

This is the SINGLE SOURCE OF TRUTH (7000+ lines) for:
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
- `tender_markup` & `markup_templates` - Tender markup configuration

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
- `tender-markup.ts` - Markup management
- `users.ts` - User management
- `work-materials-management.ts` - Combined work-material operations
- `financial-indicators.ts` - Financial metrics management
- Real-time subscriptions ready but disabled

### Type System (`src/lib/supabase/types/`)
- **Database Schema**: Split into modular files (tables.ts, views.ts, functions.ts, enums.ts)
- **Domain Types**: API types, BOQ types, cost types, tender types, UI types
- **Extended Types**: Additional helper types for better DX
- **Backward Compatibility**: Re-exports for legacy imports

### Component Organization
```
src/components/tender/     # Core BOQ components (46 components)
  TenderBOQManagerNew.tsx  # Main BOQ interface
  TenderBOQManagerSimplified.tsx # Alternative simplified BOQ
  ClientPositionCardStreamlined.tsx # Position card with inline editing
  BOQItemList/            # Virtual scrolling with drag-drop
  LibrarySelector/        # Material/work selection with cart
  MaterialLinkModal.tsx   # Material linking UI
  CostCategoryDisplay.tsx # Dynamic cost category display

src/components/common/     # Shared components (7 components)
  CostDetailCascadeSelector.tsx # Combined cascade/search selector with caching
  AutoCompleteSearch.tsx # Debounced autocomplete component
  DecimalInput.tsx       # Formatted decimal input
  UploadProgressModal.tsx # File upload progress

src/components/admin/      # Admin interfaces
  ModernImportModal.tsx  # Excel import with progress
  EditableTable.tsx     # In-place table editing

src/components/financial/  # Financial components
  FinancialIndicatorsTab.tsx # Financial indicators tab
  MarkupEditor.tsx        # Markup editing component
  MarkupTemplateSelector.tsx # Template selection

src/pages/                # Route components (40+ pages)
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
- `/financial-indicators` - Financial indicators management

## Critical Implementation Rules

### 1. Database Operations
- **NEVER enable RLS** - Disabled by design
- **ALWAYS check** `supabase/schemas/prod.sql` first
- **VERIFY** table structure before any query
- All tables use UUID primary keys
- Timestamps are auto-managed
- **BOQ Items**: Uses `detail_cost_category_id` (not `cost_node_id`)
- **Base Quantity**: `base_quantity` field stores user input for unlinked materials
- **Total Amount**: Calculated as `(unit_rate + delivery_amount) × quantity` via database trigger
- **Database Triggers**: Auto-calculate delivery amounts (`calculate_boq_amounts_trigger`)

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
- **Total Amount Formula**: `total_amount = (unit_rate + delivery_amount) × quantity`

### Delivery Cost System
- **Delivery Types**: 
  - `included` - Delivery included in unit_rate (delivery_amount = 0)
  - `not_included` - Auto-calculated 3% of unit_rate (delivery_amount = unit_rate × 0.03)
  - `amount` - Fixed delivery amount per unit (user-specified delivery_amount)
- **Database Calculation**: Handled by trigger `calculate_boq_amounts_trigger()` 
- **UI Display**: Shows "(3%)" label for `not_included` type for clarity
- **Rounding**: Visual rounding to whole numbers in UI, precise decimals in database

### Cost Categories Architecture
- **Detail Categories**: Central connecting table between categories and locations
- **Display Format**: "Category → Detail → Location"
- **Dynamic Loading**: Cost category displays loaded on-demand, not stored in DB
- **Selector Modes**: Combined cascade selection and search (min 2 chars)
- **Grouping**: Details grouped by name to avoid duplicates with different locations

### Commercial Cost Calculation System (`utils/calculateCommercialCost.ts`)
- **Own Forces Work Formula** (uses `tender_markup_percentages` table):
  1. Служба механизации = Работа ПЗ × % механизации
  2. МБП+ГСМ = Работа ПЗ × % МБП+ГСМ
  3. Гарантийный период = Работа ПЗ × % гарантии
  4. Работа 1,6 = (Работа ПЗ + СМ) × (1 + % works_16_markup/100)
  5. Работы Рост = (Работа 1,6 + МБП+ГСМ) × (1 + % роста)
  6. Непредвиденные = (Работа 1,6 + МБП+ГСМ) × (1 + % непредвиденных)
  7. ООЗ = (Работы Рост + Непредвиденные - Работа 1,6 - МБП+ГСМ) × (1 + % ООЗ)
  8. ОФЗ = ООЗ × (1 + % ОФЗ)
  9. Прибыль = ОФЗ × (1 + % прибыли)
  10. Итого = Прибыль + Гарантийный период
- **Material Types**:
  - **Main Materials** (linked): Base cost stays, markup transfers to works
  - **Auxiliary Materials** (unlinked): Entire cost transfers to works
- **Subcontract Works**: Sequential multiplication with growth, overhead, profit percentages
- **Subcontract Materials**: Base cost stays, markup transfers to subcontract works
- **Logging**: Detailed console logs with emojis for each calculation step
- **Database Tables Used**: `tender_markup_percentages`, `boq_items`, `materials_library`, `works_library`

### Performance Optimizations
- Code splitting with React.lazy() for all routes
- Virtual scrolling with react-window for BOQ lists
- GIN indexes for full-text search
- Dynamic imports for heavy operations
- Batch API operations for Excel import
- React Query caching for static data
- Memoization with React.memo for expensive components

### Code Organization
- Components grouped by feature in `components/tender/` (46 BOQ-related components)
- Custom hooks extracted to separate files (`hooks/useBOQManagement.ts`, `hooks/useMaterialDragDrop.tsx`)
- Types centralized in modular `lib/supabase/types/` structure
- Domain-specific API modules with barrel exports (`src/lib/supabase/api/index.ts`)
- Utility functions in `utils/` (excel templates, formatters, calculations)
- Page components organized by feature with hooks/components subfolders

## Environment Setup

Create `.env.local`:
```
VITE_SUPABASE_URL=https://lkmgbizyyaaacetllbzr.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_APP_NAME=TenderHub  # Optional: Application name
VITE_APP_VERSION=0.0.0   # Optional: Version display (matches package.json)
```

## Vite Configuration
- Dev server: port 5173, host enabled
- HMR: overlay disabled, 5s timeout
- lucide-react excluded from optimization

## TypeScript Configuration
- **Project References**: Root tsconfig.json references tsconfig.app.json (src/) and tsconfig.node.json (config files)
- **Strict Mode**: All strict checks enabled (including noUnusedLocals, noUnusedParameters)
- **Target**: ES2022 with ESNext modules and bundler resolution
- **Type Safety**: Modular database types in `src/lib/supabase/types/database/`
- **Path Resolution**: Configured for absolute imports from src/
- **Build Info**: `.tsbuildinfo` stored in `node_modules/.tmp/`

## ESLint Configuration
- **Flat Config**: Using ESLint 9 flat config format (`eslint.config.js`)
- **Plugins**: React hooks, React refresh, TypeScript ESLint
- **Globals**: Browser environment
- **Ignores**: `dist` directory
- **File Extensions**: `.ts` and `.tsx` files only

## Current Status

### ✅ Working
- Hierarchical BOQ with drag-drop
- Excel import/export with progress
- Materials/Works libraries
- Dashboard statistics
- Work-Material linking
- Virtual scrolling
- Construction cost management with cascade/search selector
- Delivery cost auto-calculation with 3% for "not included" type
- Base quantity tracking for unlinked materials
- Hover effects and visual feedback
- React Query caching for performance
- Visual amount rounding in UI (whole numbers)
- Automatic total_amount calculation including delivery
- Tender markup management with templates

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

### Recent Improvements (December 2024 - January 2025)
- Fixed total_amount calculation to include delivery costs
- Added "(3%)" labels for "not included" delivery type
- Implemented visual rounding to whole numbers in UI
- Database trigger for automatic delivery amount calculation
- Added tender markup functionality with templates
- Improved inline editing for BOQ items and works
- Added version and area fields to tenders (area_sp, area_client)
- Fixed infinite render loops in material synchronization
- Optimized financial calculations and cost percentage handling
- Implemented hierarchical client positions system
- Enhanced BOQ header UI with inline total cost display

## Important Notes

- **Material Linking**: Uses `MaterialLinkModal.tsx`, not drag-drop
- **TypeScript**: Strict mode with project references (tsconfig.app.json, tsconfig.node.json)
- **ESLint**: Flat config with React hooks/refresh plugins
- **Connection Monitoring**: Built-in Supabase status tracking via ConnectionStatus component
- **Excel Import**: Batch operations via `client-works.ts` and `client-positions.ts`
- **BOQ Pages**: Two interfaces - standard (`/tender/:id/boq`) and simplified (`/boq`)
- **Fetch Interceptor**: Custom retry logic with exponential backoff for all Supabase calls
- **Component Count**: 46 BOQ components, 7 shared components, 20+ API modules
- **Utilities**: Key utilities in `src/utils/`:
  - `calculateCommercialCost.ts` - Commercial cost calculation logic
  - `clientPositionHierarchy.ts` - Client position hierarchy helpers
  - `excel-templates.ts` - Excel import/export templates
  - `formatters.ts` - Number and date formatting
  - `materialCalculations.ts` - Material quantity calculations

## Development Workflow

1. **Setup**: Ensure `.env.local` exists with Supabase credentials
2. **Start**: `npm install` → `npm run dev`
3. **Database changes**:
   - Modify in Supabase dashboard
   - Export: `npm run db:schema`
   - Update TypeScript types to match `prod.sql`
4. **Testing**:
   - Type check: `npm run build`
   - Lint: `npm run lint`
   - Manual testing in dev server
5. **MCP tools**: Use `mcp__supabase__*` for direct database operations

## Project File Structure
```
TenderHUB/
├── src/
│   ├── components/         # UI components
│   │   ├── tender/        # BOQ-specific (46 components)
│   │   ├── common/        # Shared components
│   │   ├── admin/         # Admin interfaces
│   │   ├── financial/     # Financial indicators components
│   │   └── layout/        # Layout components (AppLayout)
│   ├── lib/supabase/      # Database layer
│   │   ├── api/          # API modules (<600 lines each)
│   │   │   └── boq/      # BOQ split: crud, hierarchy, bulk, analytics, queries
│   │   └── types/        # TypeScript types (modular)
│   │       └── database/ # Database schema types
│   ├── pages/            # Route components (lazy-loaded)
│   │   ├── admin/        # Admin pages
│   │   └── TendersPage/  # Tender page with components
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.ts    # Auth hook (currently disabled)
│   │   └── useBOQManagement.ts # BOQ state management
│   └── utils/            # Utilities
├── supabase/
│   └── schemas/
│       └── prod.sql      # 🚨 SOURCE OF TRUTH for DB schema (7000+ lines)
├── .env.local            # Environment variables
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS config
├── tsconfig.json         # TypeScript project references
├── tsconfig.app.json     # TypeScript app config
└── package.json          # Dependencies & scripts
```

## Git Workflow

- **Main branch**: `main` (for development and PRs)
- **Commit prefixes**: Use descriptive emoji prefixes
  - 🎯 Feature implementation
  - ✨ New features
  - 💰 Financial/cost features
  - 🚀 Performance improvements
  - 🐛 Bug fixes
  - 🎨 UI/UX improvements
  - 💥 Breaking changes
- **Recent focus areas** (from commit history):
  - Commercial cost calculations
  - BOQ interface improvements
  - Inline editing capabilities
  - Database synchronization fixes
  - Financial calculations optimization

## Common Troubleshooting

- **Port Already in Use**: Dev server auto-assigns new port if 5173 is busy
- **React 19 Warnings**: Expected due to Ant Design compatibility patch
- **Type Errors**: Run `npm run build` to check all TypeScript errors
- **Database Schema Mismatch**: Always sync with `supabase/schemas/prod.sql`
- **MCP Not Working**: Restart Claude Code completely (see MCP_SETUP.md)

Remember: This is a simplified dev environment. Production will require authentication, RLS, and security features.