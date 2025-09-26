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

# Database verification scripts
node src/scripts/checkPositionTotals.ts    # Verify position totals match calculated values
node src/scripts/applyPositionTotalsTrigger.ts  # Apply position totals trigger migration
```

**Excel Export Feature:**
- Available on `/boq` page via export button
- Exports client positions with BOQ items in hierarchical structure
- Single Excel sheet with color-coded rows by item type
- Loads cost categories asynchronously (Category → Detail → Location format)
- ДОП (additional) positions appear after their parent positions

**Single Component Testing:**
```bash
# Run dev server and manually test component at relevant route
npm run dev
# Navigate to specific route (e.g., /boq, /tenders, /admin/*)
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
- Config location: User-specific `%APPDATA%\Claude\mcp.json` (Windows) or `~/Library/Application Support/Claude/mcp.json` (Mac)
- Available after Claude Code restart
- Check connection: `/mcp list`
- Provides tools: `mcp__supabase__*` for CRUD operations (query, insert, update, delete, rpc, schema)

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

This is the SINGLE SOURCE OF TRUTH for:
- Tables, columns, types
- Functions and procedures
- Views and triggers
- ENUMs and indexes

NEVER trust TypeScript types over prod.sql
ALWAYS verify schema before ANY database work
```

**⚠️ WARNING**: If `prod.sql` is empty (0 bytes), you MUST run `npm run db:schema` first to generate the schema from the production database. Without this file, database operations cannot be properly validated.

## High-Level Architecture

### Core Database Tables
- `boq_items` - Bill of Quantities items with hierarchy
- `client_positions` - Customer position groupings
- `tenders` - Main tender records (includes currency rates: usd_rate, eur_rate, cny_rate)
- `materials_library` & `works_library` - Resource libraries
- `work_material_links` - M2M relationships between works and materials
- `work_material_templates` - Templates for work-material combinations
- `cost_categories` & `detail_cost_categories` - Cost categorization system
- `location` - Geographic locations for costs
- `tender_markup` & `markup_templates` - Tender markup configuration

### API Layer Architecture (`src/lib/supabase/api/`)
**Modular Domain-Specific Pattern** (all modules < 600 lines):
- Each domain has its own API module with consistent `{domain}Api` export
- Complex domains split into sub-modules (e.g., BOQ: crud, hierarchy, bulk, analytics, queries)
- Barrel exports (`index.ts`) for clean imports and backward compatibility
- Legacy compatibility maintained (e.g., `boqItemsApi` alongside `boqApi`)

Key modules (33 files total):
- `boq/` - BOQ operations split into specialized modules (crud, hierarchy, bulk, analytics, queries)
- `tenders.ts` - Tender lifecycle management
- `materials.ts` & `works.ts` - Library management
- `work-material-links.ts` - Work-Material relationships
- `work-material-templates.ts` - Template management for work-material combinations
- `client-works.ts` & `client-positions.ts` - Excel import (target: 5000 rows in ≤30s)
- Cost management modules (construction-costs, cost-categories, cost-structure, etc.)
- `tender-markup.ts` & `markup-templates.ts` - Markup management

### Type System Architecture (`src/lib/supabase/types/`)
- **Database Schema**: Split into modular files (tables.ts, views.ts, functions.ts, enums.ts)
- **Domain Types**: API types, BOQ types, cost types, tender types, UI types
- **Extended Types**: Additional helper types for better DX
- **Backward Compatibility**: Re-exports for legacy imports

### Component Organization
```
src/components/tender/     # Core BOQ components (46 components)
  TenderBOQManagerNew.tsx  # Main BOQ interface
  TenderBOQManagerLazy.tsx # Lazy loading variant for performance
  ClientPositionCardStreamlined.tsx # Position card with inline editing (1414 lines, reduced from 5020)
  ClientPositionStreamlined/  # Modular architecture for position card (28 files)
    hooks/               # 18 specialized hooks extracted for maintainability
      useMaterialEdit.ts         # Material editing operations (582 lines)
      useWorkEdit.ts             # Work editing operations (315 lines)
      useQuickAdd.ts             # Quick add functionality (364 lines)
      useMaterialHandlers.ts      # Material CRUD handlers
      useWorkHandlers.ts          # Work CRUD handlers
      useQuickAddHandlers.ts      # Quick add logic
      useTemplateHandlers.ts      # Template operations
      useItemOperations.ts        # Delete/update operations
      useCurrencyHandlers.ts      # Currency conversion logic
      useCoefficientHandlers.ts   # Coefficient calculations
      usePositionHandlers.ts      # Position-level operations
      usePositionState.ts         # Position state management
      usePositionActions.ts       # Position actions
      useDeleteHandlers.ts        # Delete operations
      useLinkingHandlers.ts       # Work-material linking
      useCommercialCost.ts        # Commercial cost calculations (reusable)
      useBOQSorting.ts            # BOQ item sorting logic
      useLocalState.ts            # Local state management with dynamic totals
      useMediaQueryFix.ts         # MediaQuery listener fix
      useSortedBOQItems.ts        # Sorted BOQ items with work-material relationships
    components/          # Extracted UI components
      EditRows/                   # Inline editing components
        WorkEditRow.tsx           # Work item inline editor
        MaterialEditRow.tsx       # Material item inline editor
      QuickAdd/
        QuickAddRow.tsx          # Quick add form component
      Template/
        TemplateAddForm.tsx      # Template insertion form
      Table/
        BOQTableColumns.tsx      # Table column definitions (578 lines)
      ActionButtons.tsx          # Action buttons component
      PositionSummary.tsx        # Position summary display
      BOQItemsTable.tsx          # Main table component
      AdditionalWorkInlineForm.tsx # Inline form for additional work positions
      getTableColumns.tsx        # Column configuration
      PositionTable.tsx          # Main table component
      PositionTableColumns.tsx   # Column specifications
    utils/
      calculateTotal.ts          # Shared total calculation function
    styles/             # Separated style definitions
      PositionStyles.tsx         # Styled components
  BOQItemList/          # Virtual scrolling with drag-drop
  LibrarySelector/      # Material/work selection with cart

src/components/template/   # Template management components
  TemplateList.tsx       # Template list with work-material hierarchy display
  InlineAddTemplateToBOQ.tsx # Inline template insertion with autocomplete
  EnhancedInlineTemplateForm.tsx # Template creation with work-material links

src/components/common/     # Shared components (7 components)
  CostDetailCascadeSelector.tsx # Combined cascade/search selector with caching

src/components/admin/      # Admin interfaces
  ModernImportModal.tsx  # Excel import with progress

src/components/financial/  # Financial components
  FinancialIndicatorsTab.tsx # Financial indicators tab
  ModernFinancialIndicators.tsx # Modern financial dashboard
  MarkupEditor.tsx # Tender markup percentage editor
```

### Routing (all lazy-loaded)
- `/` → `/dashboard` - Main dashboard with statistics
- `/tenders/*` - Tender management and listing
- `/tender/:tenderId/boq` - Standard BOQ interface for specific tender
- `/tender/:tenderId/construction-costs` - Construction costs for tender
- `/tender/:tenderId/commercial-costs` - Commercial costs calculation
- `/tender/:tenderId/markup` - Tender markup configuration
- `/boq` - Simplified BOQ interface (standalone) - uses TenderBOQManagerLazy for performance
- `/boq-classic` - Classic BOQ interface
- `/libraries/materials` - Materials library management
- `/libraries/works` - Works library management
- `/libraries/work-materials` - Template management (renamed from "Работы и Материалы" to "Шаблоны")
- `/construction-costs` - Global construction costs management
- `/financial-indicators` - Financial indicators dashboard
- `/commercial-costs` - Commercial costs page
- `/admin/users` - User management (placeholder)
- `/admin/settings` - System settings
- `/admin/construction-costs` - Admin construction costs
- `/admin/cost-selector-test` - Cost selector testing
- `/admin/markup-tables-setup` - Markup tables configuration

### Utility Functions (`src/utils/`)
- `calculateCommercialCost.ts` - Complex commercial cost calculations
- `currencyConverter.ts` - Currency conversion utilities
- `excel-templates.ts` - Excel import/export templates with BOQ export functionality
- `materialCalculations.ts` - Material quantity calculations
- `clientPositionHierarchy.ts` - Position hierarchy management
- `formatters.ts` - Number and date formatters
- `performanceMetrics.ts` - Performance monitoring utilities
- `lazyLoading.tsx` - Enhanced lazy loading components
- `debounce.ts` - Debounce utility functions

### Helper Scripts (`src/scripts/`)
- `checkPositionTotals.ts` - Verify database totals match calculated totals
- `applyPositionTotalsTrigger.ts` - Apply database trigger migrations

## Critical Implementation Patterns

### 1. Database Operations
- **NEVER enable RLS** - Disabled by design
- **ALWAYS check** `supabase/schemas/prod.sql` first
- All tables use UUID primary keys
- Timestamps are auto-managed
- **BOQ Items**: Uses `detail_cost_category_id` (not `cost_node_id`)
- **Base Quantity**: `base_quantity` field stores user input for unlinked materials
- **Total Amount**: Calculated as `(unit_rate + delivery_amount) × quantity` via database trigger
- **Currency Fields**: BOQ items support multi-currency (original_currency, original_amount, currency_rate)
- **Foreign Key Fields**: `work_id` and `material_id` reference library tables, not BOQ items
- **Position Totals**: `total_materials_cost` and `total_works_cost` in client_positions updated via trigger

### 2. Logging Pattern (Required)
```typescript
console.log('🚀 [FunctionName] starting:', params);
console.log('✅ [FunctionName] success:', result);
console.log('❌ [FunctionName] error:', error);
```
Emojis: 🚀 Start, ✅ Success, ❌ Error, 💥 Critical Error, 📡 API, 📦 Response, 🔍 Validation, 🔄 State, 📊 Statistics

### 3. Error Handling Pattern
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

### 4. File Size Limits & Modular Architecture
- **Maximum 600 lines per file** (target for new code)
- **Recent Refactoring Success**: ClientPositionCardStreamlined reduced from 5020 to 1414 lines (-72%)
- Extract hooks to separate files
- Extract table columns and configurations to separate modules
- Use barrel exports for organization
- **Component Extraction Pattern**:
  ```
  ClientPositionStreamlined/
  ├── hooks/               # Business logic hooks
  │   ├── use{Domain}.ts   # Single responsibility hooks
  │   └── use{Domain}Handlers.ts
  ├── components/          # UI components
  │   └── Table/          # Table-related components
  │       └── BOQTableColumns.tsx
  └── styles/             # Styled components
  ```
- **Hook Extraction Pattern**:
  - One hook per domain concern (materials, works, templates, etc.)
  - Consistent naming: `use{Domain}Handlers.ts` or `use{Domain}.ts`
  - Pass all dependencies via props interface
  - Return object with handler functions and state

### 5. Critical Bug Fixes Pattern (from Recent Refactoring)
When extracting business logic to hooks, watch for:
- **Import Path Issues**: When moving components deeper in folder structure, verify all import paths:
  ```typescript
  // WRONG - assuming common folder exists
  import CostCategoryDisplay from '../../../../common/CostCategoryDisplay';

  // CORRECT - use actual relative path
  import CostCategoryDisplay from '../../../CostCategoryDisplay';
  ```
- **TypeScript Type Imports**: Always use `type` keyword for type-only imports:
  ```typescript
  // WRONG - runtime import for type
  import { ColumnsType } from 'antd/es/table';

  // CORRECT - type-only import
  import type { ColumnsType } from 'antd/es/table';
  ```
- **Spread Operator Field Conflicts**:
  ```typescript
  // WRONG - fields from values override explicit settings
  const updateData = {
    ...values,
    detail_cost_category_id: validatedId  // gets overridden by undefined from values
  };

  // CORRECT - exclude conflicting fields first
  const { detail_cost_category_id: ignored, ...cleanValues } = values;
  const updateData = {
    ...cleanValues,
    detail_cost_category_id: validatedId  // now properly set
  };
  ```
- **Foreign Key Exclusions**: Always exclude `work_id` and `material_id` from BOQ item updates
- **Array Response Handling**: Supabase may return arrays even with `.single()`:
  ```typescript
  const actualData = Array.isArray(data) ? data[0] : data;
  ```
- **Currency Rate Handling**:
  ```typescript
  // CORRECT - null for RUB, calculated from tender for other currencies
  let calculatedCurrencyRate = null;
  if (values.currency_type && values.currency_type !== 'RUB') {
    calculatedCurrencyRate = getCurrencyRate(values.currency_type, tender);
  }
  ```
- **Cache Invalidation for Category Changes**: Invalidate both old and new category IDs:
  ```typescript
  if (oldCategoryId) queryClient.invalidateQueries(['costCategoryDisplay', oldCategoryId]);
  if (newCategoryId) queryClient.invalidateQueries(['costCategoryDisplay', newCategoryId]);
  ```

### 6. Optimistic Updates Pattern
- Use React Query's optimistic updates with temporary IDs (`temp-${Date.now()}`)
- Maintain local state maps (`optimisticItems`) merged with server data
- Rollback on failure with proper error recovery

### 7. Lazy Loading Pattern for Performance
- **Problem**: INP (Interaction to Next Paint) degradation with many BOQ items
- **Solution**: Load BOQ items only when position expands
- **Implementation**: `TenderBOQManagerLazy.tsx` with Map-based caching
- **Key Pattern**:
  ```typescript
  const loadPositionItems = useCallback(async (positionId: string) => {
    if (loadedPositionItems.has(positionId)) return;
    const { data } = await boqApi.getByClientPositionId(positionId);
    setLoadedPositionItems(prev => new Map(prev).set(positionId, data));
  }, []);
  ```

### 8. React.memo Deep Comparison Pattern
- **Problem**: React.memo blocking updates despite data changes
- **Solution**: Use checksum-based deep comparison
- **Implementation**:
  ```typescript
  const calculateBOQChecksum = (items: any[]) => {
    if (!items || items.length === 0) return '';
    return items.map(item =>
      `${item.id}-${item.quantity}-${item.unit_rate}-${item.total_amount}-${item.updated_at}`
    ).join('|');
  };
  ```

### 9. Number Formatting Pattern
- **Monetary Values**: Round to integers for display using `Math.round()`
- **Implementation**:
  ```typescript
  // For display in tables and summaries
  const formatAsInteger = (value: number): string => {
    return Math.round(value).toLocaleString('ru-RU');
  };

  // For inline display
  {Math.round(value).toLocaleString('ru-RU')} ₽
  ```
- **Applied to**: Commercial costs, financial indicators, markup editor tables

### 10. Excel Export Pattern (`utils/excel-templates.ts`)
- **Hierarchical Structure**: Single sheet with positions and their BOQ items
- **Async Category Loading**: Load cost categories with caching to avoid N+1 queries
  ```typescript
  const categoryCache = new Map<string, string>();
  for (const item of allItems) {
    if (!categoryCache.has(item.detail_cost_category_id)) {
      const { data } = await getDetailCategoryDisplay(item.detail_cost_category_id);
      categoryCache.set(item.detail_cost_category_id, data || '');
    }
  }
  ```
- **Color Coding by Item Type**:
  ```typescript
  const itemTypeColors = {
    'work': { rgb: 'FED7AA' },       // Orange
    'material': { rgb: 'BFDBFE' },   // Blue
    'sub_work': { rgb: 'E9D5FF' },   // Purple
    'sub_material': { rgb: 'BBF7D0' } // Green
  };
  ```
- **ДОП Position Handling**: Process additional positions after parent with full hierarchy
- **Column Order**: Matches reference BOQ.xlsx format with renamed types (Суб-раб, Суб-мат)

## Key Domain-Specific Patterns

### State Management Architecture
- **Server State**: TanStack Query with 5-minute staleTime
- **Cache Strategy**: Infinite cache for static data (categories, locations)
- **Optimistic Updates**: Consistent pattern across all mutations
- **Selection State**: Set-based storage for multi-select operations
- **No Redux/Zustand** - React Query handles all server state

### BOQ Quantity Calculations
- **Unlinked Materials**: `quantity = base_quantity * consumption_coefficient`
- **Linked Materials**: `quantity = work_quantity * consumption_coefficient * conversion_coefficient`
- **Base Quantity**: Stored only for unlinked materials, NULL for linked
- **Total Amount Formula**: `total_amount = (unit_rate + delivery_amount) × quantity`

### Delivery Cost System
- **Delivery Types**:
  - `included` - Delivery included in unit_rate (delivery_amount = 0)
  - `not_included` - Auto-calculated 3% of unit_rate
  - `amount` - Fixed delivery amount per unit
- **Database Calculation**: Handled by trigger `calculate_boq_amounts_trigger()`
- **Visual Rounding**: Whole numbers in UI, precise decimals in database

### Cost Categories Architecture
- **Three-Tier Structure**: Category → Detail → Location hierarchy
- **Dynamic Display Loading**: Loaded on-demand via `CostCategoryDisplay.tsx`
- **Combined Selector**: Cascade and search modes (min 2 chars)
- **Caching**: 30-minute staleTime for displays
- **Batch Loading**: `batchLoadCostCategories()` in helpers.ts to avoid N+1 queries

### Commercial Cost Calculation (`utils/calculateCommercialCost.ts`)
Complex formula-based calculations with step-by-step logging:
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

### Currency System
- **Multi-Currency Support**: BOQ items can store original currency and amounts
- **Exchange Rates**: Stored at tender level (usd_rate, eur_rate, cny_rate)
- **Fields**: `currency_type`, `currency_rate` in boq_items
- **Converter Utility**: `utils/currencyConverter.ts` for conversions
- **Rate Calculation**: Always fetch from tender, never trust form values
- **Rate Storage**: `currency_rate` is null for RUB positions, actual tender rate for foreign currencies

### Position Hierarchy System
- **Position Types**: `executable`, `section`, `subsection`, `not_executable`, etc.
- **Structural Positions**: Cannot contain BOQ items (checked via `canContainBOQItems`)
- **Client Data Display**: Volume, unit, and notes shown for structural positions
- **ДОП (Additional) Positions**: Special handling with restricted editing when collapsed
- **Inline Forms**: Additional work positions use inline forms instead of modals

### Drag-and-Drop Architecture
- **@dnd-kit Integration**: Modern drag-and-drop with virtual scrolling support
- **Hierarchical Support**: Move items between client positions
- **Conflict Resolution**: Modal-based for complex moves
- **Bulk Operations**: Batch moves and reordering

### Excel Integration
- **Template-Based Import**: Predefined templates in `utils/excel-templates.ts`
- **Batch Processing**: 5000+ rows with progress tracking
- **Progress Modals**: Real-time feedback via `UploadProgressModal.tsx`
- **Error Reporting**: Detailed per-row error messages
- **BOQ Export**: Hierarchical export with positions and items in single sheet
- **Color Coding**: Visual differentiation by item type (work, material, sub_work, sub_material)
- **Cost Categories**: Async loading with caching for Category → Detail → Location display
- **ДОП Support**: Additional positions exported after parent with full item hierarchy

### Template System for Work-Material Links
- **Template Structure**: Can contain linked pairs and/or standalone elements
- **Link Preservation**: Alternative link search always runs to handle combined templates
- **Duplicate Prevention**: Set-based checking for existing links
- **Order Independence**: Items matched by description, not index after DB insertion
- **Bulk Operations**: Efficient batch insertion with relationship preservation

### Performance Optimizations
- Code splitting with React.lazy() for all routes
- Virtual scrolling with react-window for lists >100 items
- Memoization with React.memo and custom comparisons
- GIN indexes for full-text search
- Batch API operations for Excel import
- React Query caching for static data
- Debounced search (300ms default)
- Performance monitoring via `performanceMetrics.ts`
- Lazy loading BOQ items (TenderBOQManagerLazy.tsx) for improved INP

### Build Optimization Strategy
**Vite Chunk Splitting**:
```javascript
manualChunks: {
  'xlsx': ['xlsx'],                    // 425KB - separate due to size
  'antd': ['antd'],                    // UI components
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'boq': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
  'tender': ['@tanstack/react-query'],
  'financial': ['recharts'],
  'admin': ['react-window', 'react-window-infinite-loader']
}
```

## UI/UX Standards
- **Language**: Russian UI throughout
- **Components**: Ant Design with Tailwind utilities
- **Modals**: All create/edit operations (except additional work positions which use inline forms)
- **Virtual Scrolling**: Required for large lists (>100 items)
- **Inline Editing**: Consistent edit-in-place pattern
- **Hover Effects**: Row highlighting with type-specific colors
- **Column Widths**: Optimized for readability (e.g., "Ед. изм." 90px for "Комплект")
- **Number Display**: Monetary values rounded to integers for readability

## Environment Setup

Create `.env.local`:
```
VITE_SUPABASE_URL=https://lkmgbizyyaaacetllbzr.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_APP_NAME=TenderHub  # Optional: Application name
VITE_APP_VERSION=0.0.0   # Optional: Version display
```

## Configuration Files

### Vite Configuration
- Dev server: port 5173, host enabled
- HMR: overlay disabled, 5s timeout
- lucide-react excluded from optimization
- Manual chunk splitting for optimal loading

### TypeScript Configuration
- **Project References**: Root tsconfig.json references tsconfig.app.json and tsconfig.node.json
- **Strict Mode**: All strict checks enabled
- **Target**: ES2022 with ESNext modules
- **Build Info**: `.tsbuildinfo` stored in `node_modules/.tmp/`
- **Path Aliases**: `@/*` maps to `./src/*`

### ESLint Configuration
- **Flat Config**: ESLint 9 format (`eslint.config.js`)
- **Plugins**: React hooks, React refresh, TypeScript ESLint
- **File Extensions**: `.ts` and `.tsx` files only

## Database Migrations

### Migration Files Location
- `supabase/migrations/` - SQL migration files
- `supabase/migrations/apply_now_*.sql` - Immediate fixes to apply via Supabase Dashboard

### Recent Critical Migrations
- **20250125_add_position_totals_trigger.sql** - Adds trigger for automatic position total recalculation
- **apply_now_position_totals_fix.sql** - Fixes incorrect totals in client_positions table

### Applying Migrations
1. For immediate fixes: Execute in Supabase SQL Editor
2. For standard migrations: Use Supabase CLI or dashboard
3. Always verify with: `node src/scripts/checkPositionTotals.ts`

## Current Status

### ✅ Working
- Hierarchical BOQ with drag-drop
- Excel import/export with progress and color coding
- Materials/Works libraries with template system
- Dashboard statistics
- Work-Material linking and templates
- Virtual scrolling
- Construction cost management
- Delivery cost auto-calculation (3% for "not included")
- Base quantity tracking for unlinked materials
- Tender markup management with templates
- Inline editing for BOQ items and templates
- ДОП (additional) positions with inline form creation
- Multi-currency support with exchange rates
- Financial indicators dashboard with integer rounding
- Template description editing
- Client data display for structural positions
- Lazy loading for BOQ items (improved INP)
- Dynamic total calculation with React.memo optimization
- BOQ Excel export with hierarchical structure and category display

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
- Position totals in database may be incorrect without trigger (run migration to fix)
- Total sum in position header shows zero when collapsed after BOQ item changes (display issue, DB values correct)
- HTTP 400 "numeric field overflow" may occur with certain BOQ item updates

## Important Implementation Notes

- **Material Linking**: Uses `MaterialLinkModal.tsx`, not drag-drop
- **Connection Monitoring**: Built-in Supabase status tracking via ConnectionStatus component
- **Excel Import**: Batch operations via `client-works.ts` and `client-positions.ts`
- **BOQ Pages**: Two interfaces - standard (`/tender/:id/boq`) and simplified (`/boq`)
- **Fetch Interceptor**: Custom retry logic with exponential backoff
- **Component Count**: 46 BOQ components, 7 shared components, 33 API modules
- **Error Translation**: `handleSupabaseError` provides user-friendly error messages
- **UUID Validation**: Special handling for UUID format errors
- **BOQ Additional Fields**: Support for quote_link, note, and is_additional (ДОП positions)
- **Template Link Fix**: Always runs alternative link search for combined templates
- **Performance Monitoring**: INP (Interaction to Next Paint) is key metric for user experience
- **Database Triggers**: Required for maintaining data consistency (position totals)
- **Inline Forms**: Additional work positions use inline forms for better UX

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
6. **Performance issues**: Check INP metrics, consider lazy loading pattern

## Project File Structure
```
TenderHUB/
├── src/
│   ├── components/         # UI components
│   │   ├── tender/        # BOQ-specific (46 components)
│   │   │   └── ClientPositionStreamlined/ # Modular refactoring (28 files)
│   │   ├── template/      # Template management
│   │   ├── common/        # Shared components
│   │   ├── admin/         # Admin interfaces
│   │   └── financial/     # Financial components
│   ├── lib/supabase/      # Database layer
│   │   ├── api/          # API modules (<600 lines each)
│   │   │   └── boq/      # BOQ sub-modules (crud, hierarchy, bulk, analytics, queries)
│   │   └── types/        # TypeScript types (modular)
│   ├── pages/            # Route components (lazy-loaded)
│   │   ├── TendersPage/  # Tender list with components
│   │   └── admin/        # Admin pages
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utilities (9+ modules)
│   └── scripts/          # Helper scripts for maintenance
├── supabase/
│   ├── schemas/
│   │   └── prod.sql      # 🚨 SOURCE OF TRUTH for DB schema
│   └── migrations/       # SQL migration files
├── .env.local            # Environment variables
├── package.json          # Dependencies & scripts
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript project references
├── tsconfig.app.json     # App TypeScript config
└── eslint.config.js      # ESLint flat config
```

## Git Workflow

- **Main branch**: `main` (for development and PRs)
- **Commit prefixes**: Use descriptive emoji prefixes
  - 🎯 Feature implementation
  - ✨ New features
  - 💰 Financial/cost features
  - 💱 Currency-related features
  - 🚀 Performance improvements
  - 🐛 Bug fixes
  - 🎨 UI/UX improvements
  - 🔧 Refactoring
  - 💥 Breaking changes
  - ⚡ Performance optimization

## Refactoring Guidelines

### When Refactoring Large Components (>1000 lines)
1. **Start with pure utilities**: Extract functions that don't use hooks first
2. **Extract custom hooks**: Move business logic to `hooks/` folder
3. **Extract sub-components**: Move UI components to `components/` folder
4. **Extract configurations**: Move table columns, form configs to separate files
5. **Test after each extraction**: Run `npm run dev` and test the page

### Extraction Priority (from least to most risky)
1. **Constants and configurations** (zero risk)
2. **Pure utility functions** (low risk)
3. **Custom hooks with clear dependencies** (medium risk)
4. **UI components with props drilling** (higher risk)
5. **State management logic** (highest risk)

## Common Troubleshooting

- **Empty prod.sql (Critical)**: Run `npm run db:schema` immediately to generate schema file - this is required for all database operations
- **Port Already in Use**: Dev server auto-assigns new port if 5173 is busy
- **React 19 Warnings**: Expected due to Ant Design compatibility patch
- **Type Errors**: Run `npm run build` to check all TypeScript errors
- **Database Schema Mismatch**: Always sync with `supabase/schemas/prod.sql`
- **MCP Not Working**: Restart Claude Code completely
- **ESLint Import Error**: If ESLint fails with import errors, ensure all packages are installed with `npm install`
- **Vite HMR Issues**: HMR timeout set to 5s, overlay disabled in vite.config.ts
- **Build Failures**: Check `.tsbuildinfo` cache in `node_modules/.tmp/` - delete if corrupt
- **Import Path Errors After Refactoring**: Double-check relative paths when moving files deeper in folder structure
- **Template Links Breaking**: Check that alternative link search is running in `convertTemplateToBOQItems`
- **Category Not Saving**: Check for spread operator conflicts when extracting to hooks
- **409 Foreign Key Errors**: Exclude `work_id` and `material_id` from BOQ item updates
- **String Interpolation in Tooltips**: Use `${variable}` not `{variable}` in template strings
- **Performance Issues (INP)**: Consider lazy loading pattern for heavy components
- **Position Totals Wrong**: Apply database trigger migration via SQL Editor
- **Visual Updates Not Showing**: Check React.memo comparison logic, use checksums
- **HTTP 400 Numeric Overflow**: Check for Infinity, NaN, or invalid number formats in numeric fields
- **Cost Category Not Updating**: Ensure cache invalidation for both old and new category IDs

## Additional Resources

- **Database Schema**: Always regenerate `supabase/schemas/prod.sql` after database changes
- **Type Generation**: TypeScript types in `src/lib/supabase/types/` should match prod.sql
- **Performance Tools**: Chrome DevTools Performance tab for INP measurement
- **Supabase Dashboard**: https://supabase.com/dashboard/project/lkmgbizyyaaacetllbzr

Remember: This is a simplified dev environment. Production will require authentication, RLS, and security features.