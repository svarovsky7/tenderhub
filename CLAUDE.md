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
- Config location: `C:\Users\nekrasov.l.m\AppData\Roaming\Claude\mcp.json`
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

This is the SINGLE SOURCE OF TRUTH for:
- Tables, columns, types
- Functions and procedures
- Views and triggers
- ENUMs and indexes

NEVER trust TypeScript types over prod.sql
ALWAYS verify schema before ANY database work
```

**Note**: The prod.sql file must be generated using `npm run db:schema` command

## High-Level Architecture

### Core Database Tables
- `boq_items` - Bill of Quantities items with hierarchy
- `client_positions` - Customer position groupings
- `tenders` - Main tender records (includes currency rates: usd_rate, eur_rate, cny_rate)
- `materials_library` & `works_library` - Resource libraries
- `work_material_links` - M2M relationships between works and materials
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
  ClientPositionCardStreamlined.tsx # Position card with inline editing
  BOQItemList/            # Virtual scrolling with drag-drop
  LibrarySelector/        # Material/work selection with cart

src/components/common/     # Shared components (7 components)
  CostDetailCascadeSelector.tsx # Combined cascade/search selector with caching
  
src/components/admin/      # Admin interfaces
  ModernImportModal.tsx  # Excel import with progress
  
src/components/financial/  # Financial components
  FinancialIndicatorsTab.tsx # Financial indicators tab
  ModernFinancialIndicators.tsx # Modern financial dashboard
```

### Routing (all lazy-loaded)
- `/` → `/dashboard` - Main dashboard with statistics
- `/tenders/*` - Tender management and listing
- `/tender/:tenderId/boq` - Standard BOQ interface for specific tender
- `/tender/:tenderId/construction-costs` - Construction costs for tender
- `/tender/:tenderId/commercial-costs` - Commercial costs calculation
- `/tender/:tenderId/markup` - Tender markup configuration
- `/boq` - Simplified BOQ interface (standalone)
- `/boq-classic` - Classic BOQ interface
- `/libraries/materials` - Materials library management
- `/libraries/works` - Works library management
- `/libraries/work-materials` - Work-Material linking interface
- `/construction-costs` - Global construction costs management
- `/financial-indicators` - Financial indicators dashboard
- `/admin/users` - User management (placeholder)
- `/admin/settings` - System settings
- `/admin/construction-costs` - Admin construction costs
- `/admin/cost-selector-test` - Cost selector testing
- `/admin/markup-tables-setup` - Markup tables configuration

### Utility Functions (`src/utils/`)
- `calculateCommercialCost.ts` - Complex commercial cost calculations
- `currencyConverter.ts` - Currency conversion utilities
- `excel-templates.ts` - Excel import/export templates
- `materialCalculations.ts` - Material quantity calculations
- `clientPositionHierarchy.ts` - Position hierarchy management
- `formatters.ts` - Number and date formatters

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

### 4. File Size Limits
- **Maximum 600 lines per file**
- Extract hooks to separate files
- Use barrel exports for organization

### 5. Optimistic Updates Pattern
- Use React Query's optimistic updates with temporary IDs (`temp-${Date.now()}`)
- Maintain local state maps (`optimisticItems`) merged with server data
- Rollback on failure with proper error recovery

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

### Currency System (New)
- **Multi-Currency Support**: BOQ items can store original currency and amounts
- **Exchange Rates**: Stored at tender level (usd_rate, eur_rate, cny_rate)
- **Fields**: `original_currency`, `original_amount`, `currency_rate` in boq_items
- **Converter Utility**: `utils/currencyConverter.ts` for conversions

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

### Performance Optimizations
- Code splitting with React.lazy() for all routes
- Virtual scrolling with react-window for lists >100 items
- Memoization with React.memo and custom comparisons
- GIN indexes for full-text search
- Batch API operations for Excel import
- React Query caching for static data
- Debounced search (300ms default)

## UI/UX Standards
- **Language**: Russian UI throughout
- **Components**: Ant Design with Tailwind utilities
- **Modals**: All create/edit operations
- **Virtual Scrolling**: Required for large lists (>100 items)
- **Inline Editing**: Consistent edit-in-place pattern
- **Hover Effects**: Row highlighting with type-specific colors

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

### TypeScript Configuration
- **Project References**: Root tsconfig.json references tsconfig.app.json and tsconfig.node.json
- **Strict Mode**: All strict checks enabled
- **Target**: ES2022 with ESNext modules
- **Build Info**: `.tsbuildinfo` stored in `node_modules/.tmp/`

### ESLint Configuration
- **Flat Config**: ESLint 9 format (`eslint.config.js`)
- **Plugins**: React hooks, React refresh, TypeScript ESLint
- **File Extensions**: `.ts` and `.tsx` files only

## Current Status

### ✅ Working
- Hierarchical BOQ with drag-drop
- Excel import/export with progress
- Materials/Works libraries
- Dashboard statistics
- Work-Material linking
- Virtual scrolling
- Construction cost management
- Delivery cost auto-calculation (3% for "not included")
- Base quantity tracking for unlinked materials
- Tender markup management with templates
- Inline editing for BOQ items
- ДОП (additional) positions with restricted editing when collapsed
- Multi-currency support with exchange rates
- Financial indicators dashboard

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
│   │   └── financial/     # Financial components
│   ├── lib/supabase/      # Database layer
│   │   ├── api/          # API modules (<600 lines each)
│   │   │   └── boq/      # BOQ sub-modules (crud, hierarchy, bulk, analytics, queries)
│   │   └── types/        # TypeScript types (modular)
│   ├── pages/            # Route components (lazy-loaded)
│   │   ├── TendersPage/  # Tender list with components
│   │   └── admin/        # Admin pages
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utilities (7 modules)
├── supabase/
│   └── schemas/
│       └── prod.sql      # 🚨 SOURCE OF TRUTH for DB schema
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
  - 💥 Breaking changes

## Common Troubleshooting

- **Port Already in Use**: Dev server auto-assigns new port if 5173 is busy
- **React 19 Warnings**: Expected due to Ant Design compatibility patch
- **Type Errors**: Run `npm run build` to check all TypeScript errors
- **Database Schema Mismatch**: Always sync with `supabase/schemas/prod.sql`
- **MCP Not Working**: Restart Claude Code completely (see MCP_SETUP.md)
- **Empty prod.sql**: Run `npm run db:schema` to generate schema file
- **ESLint Import Error**: If ESLint fails with import errors, ensure all packages are installed with `npm install`
- **Vite HMR Issues**: HMR timeout set to 5s, overlay disabled in vite.config.ts

## Additional Resources

- **MCP Setup**: See `MCP_SETUP.md` for MCP server configuration details
- **Database Schema**: Always regenerate `supabase/schemas/prod.sql` after database changes
- **Type Generation**: TypeScript types in `src/lib/supabase/types/` should match prod.sql

Remember: This is a simplified dev environment. Production will require authentication, RLS, and security features.