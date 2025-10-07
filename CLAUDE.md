# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenderHub is a construction tender management portal built with React 18, TypeScript 5.8, and Vite 7. The application manages hierarchical Bill of Quantities (BOQ), materials/works libraries, and tender workflows for construction project bidding.

**Language**: Russian UI throughout
**React Version**: React 18.3.1 (stable, compatible with Ant Design 5)
**Authentication**: Currently disabled for development

## Development Commands

```bash
# Core development
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173, auto-assigns port if busy)
npm run build        # Production build (Vite only, NO TypeScript checking for faster builds)
npm run build:check  # Production build WITH TypeScript type checking (use for validation)
npm run preview      # Preview production build locally
npm run lint         # Run ESLint checks (flat config)

# Database management
npm run db:schema    # Export production schema to supabase/schemas/prod.sql

# Database verification scripts
node src/scripts/checkPositionTotals.ts           # Verify position totals match calculated values
node src/scripts/applyPositionTotalsTrigger.ts    # Apply position totals trigger migration
node src/scripts/updateCommercialCostsFunction.ts # Update commercial costs function
node src/scripts/recalculatePositionTotals.ts [tenderId]  # Force recalculate position totals (optional tender ID)
npx tsx src/scripts/updateDefaultMarkupPercentages.ts     # Update existing markup percentages to new defaults
npx tsx src/scripts/recalculateCommercialCosts.ts        # Recalculate commercial costs with correct formulas
npx tsx src/scripts/fixCommercialCosts.ts                # Fix astronomical commercial costs in database
npx tsx src/scripts/checkPosition8.ts                    # Check position 8 calculation details

# Deployment
vercel --prod        # Deploy to production (requires VERCEL_TOKEN env var or login)
```

## Tech Stack

- **Frontend**: React 18.3.1, TypeScript 5.8.3, Vite 7.0.4
- **UI**: Ant Design 5.26.7 (no patch needed for React 18)
- **State**: TanStack Query 5.84.1 (5-minute cache, no window refetch)
- **Database**: Supabase 2.53.0 (PostgreSQL 16, RLS disabled)
- **Styling**: Tailwind CSS 3.4.17 (preflight disabled for Ant Design)
- **Excel**: xlsx-js-style 1.2.0 for styled import/export
- **Drag & Drop**: @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0
- **Virtual Scrolling**: react-window 1.8.11 + react-window-infinite-loader
- **Forms**: react-hook-form 7.62.0 + yup 1.7.0 validation
- **Routing**: react-router-dom 7.7.1
- **Deployment**: Vercel (production deployment platform)

## MCP (Model Context Protocol) Integration

**Supabase MCP Server** configured for direct database access:
- Available tools: `mcp__supabase__*` (query, insert, update, delete, rpc, schema)
- Check connection: `/mcp list`

**GitHub MCP Server** configured for repository operations:
- Available tools: `mcp__github__*`

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

**⚠️ IMPORTANT**: If `prod.sql` is empty (0 bytes), run `npm run db:schema` IMMEDIATELY before any database work

## High-Level Architecture

### Core Database Tables
- `boq_items` - Bill of Quantities items with hierarchy
- `client_positions` - Position groupings with totals
- `tenders` - Main tender records (includes currency rates: usd_rate, eur_rate, cny_rate)
- `materials_library` & `works_library` - Resource libraries
- `work_material_links` - M2M work-material relationships
- `work_material_templates` - Templates for work-material combinations
- `commercial_costs_by_category` - Aggregated costs by category (auto-updated via trigger)
- `cost_categories` & `detail_cost_categories` - Cost categorization system
- `tender_markup_percentages` - Markup configuration (unique active record per tender)
- `markup_templates` - Reusable markup templates
- `tender_version_mappings` - Version control mappings between tenders
- `tender_version_history` - Version control audit trail

### API Layer Architecture (`src/lib/supabase/api/`)
**Modular Domain Pattern** (all modules < 600 lines):
- Domain-specific modules with `{domain}Api` exports
- Complex domains split into sub-modules (e.g., BOQ: crud, hierarchy, bulk, analytics, queries)
- Barrel exports for clean imports
- Key modules: `boq/`, `tenders.ts`, `materials.ts`, `works.ts`, `client-positions.ts`, `commercial-costs.ts`, `tender-versioning.ts`, `client-works-versioning.ts`

### Component Architecture
```
src/components/tender/     # Core BOQ components (46 components)
  TenderBOQManagerNew.tsx  # Main BOQ interface
  TenderBOQManagerLazy.tsx # Lazy loading variant for performance
  ClientPositionCardStreamlined.tsx # Position card (1414 lines, reduced from 5020)
  TenderVersionManager.tsx # Tender versioning UI wizard
  ClientPositionStreamlined/  # Modular architecture (28 files)
    hooks/               # 18 specialized hooks extracted
    components/          # UI components
    utils/              # Shared utilities
    styles/             # Styled components

src/components/template/   # Template management
src/components/common/     # Shared components
src/components/admin/      # Admin interfaces
src/components/financial/  # Financial components
```

### Custom Hooks (`src/hooks/`)
- `useBOQItems` - BOQ item CRUD operations
- `useBOQManagement` - BOQ hierarchy management
- `useClientPositions` - Position management
- `useTenderVersioning` - Version control operations
- `useWorkMaterialLinks` - Work-material relationship management
- `useMaterialDragDrop` - Drag-drop functionality
- `usePositionClipboard` - Copy/paste position contents with BOQ items and links

### Routing (all lazy-loaded)
- `/` → `/dashboard` - Main dashboard
- `/tenders/*` - Tender management
- `/tender/:tenderId/boq` - BOQ interface for specific tender
- `/tender/:tenderId/construction-costs` - Construction costs
- `/tender/:tenderId/commercial-costs` - Commercial costs calculation
- `/boq` - Simplified BOQ interface (uses TenderBOQManagerLazy)
- `/materials-works` - Materials and works list for selected tender (grouped view with statistics)
- `/libraries/materials`, `/libraries/works` - Resource libraries
- `/libraries/work-materials` - Template management
- `/construction-costs/tender` - Tender construction costs page
- `/commercial-costs` - Commercial costs page (includes versions with `includeVersions: true`)
- `/financial-indicators` - Financial indicators dashboard
- `/admin/*` - Admin interfaces

## Critical Implementation Patterns

### 1. Database Operations
- **NEVER enable RLS** - Disabled by design
- **Foreign Key Fields**: `work_id` and `material_id` reference library tables
- **Position Totals**: Updated via dual-trigger system:
  1. `update_linked_material_total_amount()` on work_material_links - Updates boq_items.total_amount for linked materials
  2. `trigger_recalc_position_on_wml_change()` on work_material_links - Recalculates position totals via SUM(total_amount)
  3. `recalculate_client_position_totals()` on boq_items - Recalculates when BOQ items change
- **Linked Materials**: Quantity and total_amount automatically calculated from work.quantity * coefficients
- **Currency System**: Exchange rates stored at tender level
- **Delivery Cost**: Auto-calculated 3% for "not included" type
- **Versioning**: New tender versions get unique `tender_number` with `_v{version}` suffix
- **Migration Workflow**: Apply migrations directly in Supabase SQL Editor, then delete migration files after application
- **Markup Records**: Only one active markup record per tender (enforced by unique constraint)

### 2. Logging Pattern (Required)
```typescript
console.log('🚀 [FunctionName] starting:', params);
console.log('✅ [FunctionName] success:', result);
console.log('❌ [FunctionName] error:', error);
```

### 3. File Size Limits
- **Maximum 600 lines per file** (target for new code)
- Extract hooks, components, and utilities to separate files
- Use barrel exports for organization

### 4. Performance Optimizations
- Lazy loading for routes and heavy components
- Virtual scrolling for lists >100 items
- React Query caching with 5-minute staleTime
- Debounced search (300ms default)
- Map-based caching for BOQ items
- Manual chunks in Vite for optimal loading (xlsx, antd, react-vendor, etc.)

### 5. Excel Integration
- Template-based import with progress tracking
- Batch processing for 5000+ rows (optimized to 500 items/batch)
- Real-time progress feedback
- Styled exports with xlsx-js-style
- Position grouping by number to handle duplicates
- **Export naming conventions**:
  - BOQ exports: `{TenderName} (Версия {version}).xlsx`
  - Commercial costs: `Коммерческие стоимости {TenderName} (Версия {version}).xlsx`

### 6. Critical Code Patterns
- **UUID Handling**: Always use actual database IDs, not generated keys
- **Pagination**: Use controlled state with `pageSize` and `current` props (default 100 rows)
- **Modal Cleanup**: Delete draft versions on cancel to prevent orphans
- **Mapping Save**: Check for existing IDs before re-saving to prevent duplicates
- **API Filtering**: Filter child versions at query level, not in UI (`includeVersions` parameter)
- **Error Messages**: Always include context in console logs with emojis
- **Function Order**: Define functions before use to avoid initialization errors
- **Duplicate Prevention**: Use unique constraints (e.g., active markup records)
- **API Response Handling**: Some APIs return objects with numeric keys (e.g., `{0: {...}}`), access via `data[0]` or `data?.["0"]`
- **Excel Export Naming**: Include tender name and version in filename format
- **Position Copy/Paste**: Uses array index mapping (not sort_order) for reliable ID mapping on repeated paste; links accumulate (not replaced)

## Environment Setup

### Local Development
Create `.env.local`:
```
VITE_SUPABASE_URL=https://lkmgbizyyaaacetllbzr.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_APP_NAME=TenderHub
VITE_APP_VERSION=0.0.0
```

### Vercel Deployment
Environment variables must be configured in Vercel dashboard:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_APP_NAME` - Application name (optional)
- `VITE_APP_VERSION` - Application version (optional)

**Important**: Both local and Vercel use the SAME production Supabase database. Data changes are synchronized, but code updates require redeployment.

**Vercel Configuration** (`vercel.json`):
- SPA routing: All routes rewritten to `/index.html`
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

## Configuration Files

### Vite Configuration
- Dev server: port 5173 (auto-assigns if busy), host enabled
- HMR: overlay disabled, 5s timeout
- **Optimize Dependencies**:
  - Excluded: `lucide-react` (to avoid pre-bundling issues)
  - Included: `lodash-es`, `antd`, `react`, `react-dom` (for faster dev startup)
- **Manual chunking**: Simplified to avoid circular dependencies
  - `vendor` chunk: All node_modules (except xlsx)
  - `xlsx` chunk: Separate due to large size (869KB)
  - Application code: Single bundle (no manual splits to prevent initialization errors)
- Build: `process.env` defined as empty object to prevent undefined errors
- **Important**: Complex chunking (splitting react, antd, app modules) causes module initialization errors in production

### TypeScript Configuration
- Project references: tsconfig.app.json and tsconfig.node.json
- Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- Target: ES2022 with ESNext modules
- Module resolution: bundler mode with `allowImportingTsExtensions`
- Build info: `.tsbuildinfo` in `node_modules/.tmp/`
- **Note**: No path aliases configured - use relative imports

### ESLint Configuration
- Flat config format (ESLint 9)
- React hooks and React refresh plugins
- TypeScript ESLint integration

## Current Status

### ✅ Working
- Hierarchical BOQ with drag-drop
- Excel import/export with styling (optimized batch loading)
- Materials/Works libraries with templates
- Multi-currency support with exchange rates
- Commercial cost calculations with markup
- Inline editing throughout
- Virtual scrolling for large datasets
- Lazy loading for improved performance
- Tender versioning with automatic position mapping
- Fuzzy matching for position comparison between versions
- Manual fields (manual_volume, manual_note) transfer between versions
- Filtering by confidence score and mapping type in version modal
- Single active markup record per tender enforcement
- Position copy/paste with BOQ items and work_material_links (supports repeated paste)

### ⚠️ Disabled/Placeholder
- Authentication (no login required)
- Real-time features
- File storage
- Edge Functions

## Important Database Functions

### Totals Calculation Functions (in prod.sql)
- **`update_linked_material_total_amount()`** - Trigger function that updates boq_items.total_amount for linked materials when work_material_links change
- **`trigger_recalc_position_on_wml_change()`** - Trigger function that recalculates client_positions totals via simple SUM(total_amount)
- **`recalculate_client_position_totals()`** - Trigger function on boq_items that recalculates position totals when BOQ items change

### Versioning Functions (in prod.sql)
- **`create_tender_version`** - Creates new tender version with unique number
- **`complete_version_transfer`** - Transfers all data including manual_volume and manual_note
- **`complete_version_transfer_with_links`** - Full transfer with work_material_links and manual fields
- **`transfer_boq_with_mapping`** - Transfers BOQ items and manual fields based on mapping
- **`transfer_dop_positions`** - Transfers additional (DOP) positions including manual fields
- **`transfer_work_material_links`** - Transfers work-material relationships between positions
- **`transfer_all_tender_data`** - Comprehensive transfer of all data including links and DOP positions
- **`cleanup_draft_versions`** - Removes empty draft versions

### Critical Fields
- **`is_additional`** - Boolean flag in `client_positions` for DOP positions (NOT `position_type = 'dop'`)
- **`parent_position_id`** - Links DOP positions to parent positions
- **`parent_version_id`** - Links child tender versions to parent tenders
- **`is_active`** - Boolean flag in `tender_markup_percentages` (unique when true)

## Git Workflow

- **Main branch**: `main` (for development and PRs)
- **Commit prefixes**: Use descriptive emoji prefixes
  - 📎 Document/link features
  - ✨ New features
  - 🚀 Performance improvements
  - 🐛 Bug fixes
  - 🔧 Refactoring
  - 💥 Breaking changes

## Tender Versioning System

### Overview
The application supports creating new versions of tenders with position comparison and automatic mapping.

### Key Components
- **TenderVersionManager.tsx** - UI wizard for version creation and position mapping
- **tender-versioning.ts** - Core API for version operations
- **client-works-versioning.ts** - Excel upload as new version with auto-matching
- **tender_version_mappings** table - Stores position mappings between versions
- **tender_version_history** table - Audit trail of version operations

### Versioning Workflow
1. Create new version from parent tender (copies tender metadata)
2. Upload Excel with new positions
3. Auto-match positions using fuzzy algorithm:
   - 60% weight: name similarity (calculateFuzzyScore)
   - 30% weight: context (position numbers)
   - 10% weight: hierarchy level
4. Manual review/adjustment of mappings
5. Apply mappings to transfer BOQ items and DOP positions

### Important Notes
- Parent tenders have `parent_version_id = NULL`
- Child versions reference parent via `parent_version_id`
- Tender list page filters out child versions (only shows parents)
- Draft versions are deleted if cancelled before completion
- Unique constraint prevents duplicate mappings per position
- CommercialCostsPage requires `includeVersions: true` to show versions

### Key Fixes Applied (2025)
1. **TenderVersionManager.tsx**: Restructured table from 4 to 12 columns for full data display
2. **tenders.ts API**: Added `.is('parent_version_id', null)` filter to exclude versions
3. **tender-versioning.ts**: Fixed null handling in `calculateContextScore`
4. **saveMappings**: Excludes 'key' field and returns saved mappings with IDs
5. **Pagination**: Changed to controlled state with `pagination` prop
6. **DOP Position Transfer**: Fixed parameter order in `transfer_dop_positions` calls (now p_new_tender_id, p_old_tender_id)
7. **work_material_links Transfer**: Added comprehensive transfer function for all position types
8. **SQL Functions**: Removed dependency on tender_version_mappings for DOP position transfers
9. **Manual Fields Transfer**: Added transfer of manual_volume and manual_note for regular positions
10. **Markup Records**: Fixed duplicate active records issue, enforced single active record per tender
11. **CommercialCostsPage**: Added `includeVersions: true` parameter to show all tender versions
12. **Position Totals Trigger**: Updated to properly account for linked materials with work_material_links (migration 20250131_fix_position_totals_trigger.sql)
13. **Position Totals Trigger**: Removed `UPDATE OF` clause to fire on all updates including currency rate changes (October 2025)
14. **Excel Export Naming**: Fixed tender name/version loading in TenderCommercialManager (API returns `{0: {...}}` format) (October 2025)
15. **Position Copy/Paste**: Implemented usePositionClipboard hook with index-based ID mapping; removed deleteByPosition call to preserve links on repeated paste (October 2025)
16. **Position Totals with Links**: Added dual-trigger system for correct totals calculation (October 2025):
    - `update_linked_material_total_amount()` - Updates boq_items.total_amount when work_material_links change
    - `trigger_recalc_position_on_wml_change()` - Simple SUM(total_amount) for position totals
    - Migration `20251001_FINAL_fix_totals_calculation.sql` fixes existing data and implements both triggers

## Common Troubleshooting

### Development & Build Issues
- **Empty prod.sql**: Run `npm run db:schema` immediately
- **Port Already in Use**: Dev server auto-assigns new port
- **Type Errors**: Run `npm run build:check` to check all TypeScript errors (NOT `npm run build`)
- **MCP Not Working**: Restart Claude Code completely
- **Import Path Errors**: Verify relative paths when refactoring

### Database & Position Totals
- **Position Totals Wrong**: Apply trigger migration via SQL Editor
- **Position Totals Incorrect**: Run `node src/scripts/recalculatePositionTotals.ts` to force DB recalculation
- **Collapsed Card Shows Wrong Total**: DB totals outdated when work_material_links change, need trigger update
- **recalculatePositionTotals.ts Doesn't Work**: Trigger watches specific fields (total_amount, quantity, unit_rate, item_type, client_position_id), not updated_at. Update quantity field to trigger recalculation.
- **Totals Wrong After work_material_links Change**: Apply migration `20251001_FINAL_fix_totals_calculation.sql` for complete fix (updates both boq_items.total_amount and position totals)
- **Linked Material Quantity Wrong**: The dual-trigger system automatically updates linked material quantities based on work quantities; boq_items.total_amount reflects calculated quantity, not stored quantity

### Versioning & Mapping
- **Versioning SQL Errors**: Check table column names match prod.sql schema
- **Duplicate Key on Version Creation**: Check `create_tender_version` function generates unique tender_number
- **Mappings Not Saving**: Verify mappings don't already exist (check for IDs)
- **Deleted Versions Reappearing**: Ensure tender list filters by `parent_version_id IS NULL`
- **UUID Errors in Version Modal**: Use mapping.id, not generated keys
- **Missing Mapping Columns**: Run migration `20250129_add_mapping_columns.sql`
- **DOP Positions Not Transferring**: Check parameter order (p_new_tender_id, p_old_tender_id) and ensure parent positions exist
- **work_material_links Missing**: Run migration `20250130_transfer_work_material_links.sql` for comprehensive transfer
- **Versions Not Showing**: Ensure API calls include `includeVersions: true` parameter

### Excel & Export
- **Excel Export Slow**: Batch loading implemented (reduced from 10-15s to 1-2s)
- **Excel Export Wrong Filename**: Check API response structure (may return `{0: {...}}` instead of direct object)

### Copy/Paste & UI
- **Position Copy Button Shows Everywhere**: Check logic uses `(!hasCopiedData || copiedFromPositionId === position.id)`
- **Links Wrong on Repeated Paste**: Ensure no `deleteByPosition` call in paste flow; links should accumulate
- **Copy/Paste ID Mapping Fails**: Use array index mapping, not sort_order (which gets overwritten by bulkCreateInPosition)

### Deployment (Vercel)
- **Module Initialization Errors**: Use simplified chunking (vendor + xlsx only)
- **React.version Undefined**: Ensure React is not split across chunks
- **Circular Dependency Errors**: Don't split application code into manual chunks
- **Vercel Build Fails**: Check that `npm run build` works locally first
- **Environment Variables Missing**: Configure in Vercel dashboard, not .env files
- **Database Changes Not Reflected**: Database is shared; code changes need redeploy via `vercel --prod`

### Other
- **Markup Not Saving**: Check for duplicate active records in tender_markup_percentages table
- **Trigger Not Firing on Currency Change**: Remove `UPDATE OF` clause to fire on all column updates