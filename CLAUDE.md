# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenderHub is a construction tender management portal built with React 19, TypeScript 5.8, and Vite 7. The application manages hierarchical Bill of Quantities (BOQ), materials/works libraries, and tender workflows for construction project bidding.

**Language**: Russian UI throughout
**React 19**: Using compatibility patch for Ant Design (`@ant-design/v5-patch-for-react-19`)
**Authentication**: Currently disabled for development

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
node src/scripts/updateCommercialCostsFunction.ts  # Update commercial costs function
```

## Tech Stack

- **Frontend**: React 19.1.0, TypeScript 5.8.3, Vite 7.0.4
- **UI**: Ant Design 5.26.7 + React 19 patch
- **State**: TanStack Query 5.84.1 (5-minute cache, no window refetch)
- **Database**: Supabase 2.53.0 (PostgreSQL 16, RLS disabled)
- **Styling**: Tailwind CSS 3.4.17 (preflight disabled for Ant Design)
- **Excel**: xlsx-js-style 1.2.0 for styled import/export
- **Drag & Drop**: @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0
- **Virtual Scrolling**: react-window 1.8.11 + react-window-infinite-loader
- **Forms**: react-hook-form 7.62.0 + yup 1.7.0 validation
- **Routing**: react-router-dom 7.7.1

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

**⚠️ If `prod.sql` is empty (0 bytes), run `npm run db:schema` first**

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
- `tender_markup` & `markup_templates` - Markup configuration
- `tender_version_mappings` - Version control mappings between tenders
- `tender_version_history` - Version control audit trail
- `boq_item_version_mappings` - BOQ item mappings between versions

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

### Routing (all lazy-loaded)
- `/` → `/dashboard` - Main dashboard
- `/tenders/*` - Tender management
- `/tender/:tenderId/boq` - BOQ interface for specific tender
- `/tender/:tenderId/construction-costs` - Construction costs
- `/tender/:tenderId/commercial-costs` - Commercial costs calculation
- `/boq` - Simplified BOQ interface (uses TenderBOQManagerLazy)
- `/libraries/materials`, `/libraries/works` - Resource libraries
- `/libraries/work-materials` - Template management
- `/construction-costs/tender` - Tender construction costs page
- `/financial-indicators` - Financial indicators dashboard
- `/admin/*` - Admin interfaces

## Critical Implementation Patterns

### 1. Database Operations
- **NEVER enable RLS** - Disabled by design
- **Foreign Key Fields**: `work_id` and `material_id` reference library tables
- **Position Totals**: Updated via database trigger
- **Currency System**: Exchange rates stored at tender level
- **Delivery Cost**: Auto-calculated 3% for "not included" type
- **Versioning**: New tender versions get unique `tender_number` with `_v{version}` suffix
- **Deletion Order**: When deleting tenders, first delete: tender_version_mappings, boq_item_version_mappings, DOP positions (is_additional=true)

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

### 5. Excel Integration
- Template-based import with progress tracking
- Batch processing for 5000+ rows (optimized to 500 items/batch)
- Real-time progress feedback
- Styled exports with xlsx-js-style
- Position grouping by number to handle duplicates

### 6. Critical Code Patterns
- **UUID Handling**: Always use actual database IDs, not generated keys
- **Pagination**: Use controlled state with `pageSize` and `current` props
- **Modal Cleanup**: Delete draft versions on cancel to prevent orphans
- **Mapping Save**: Check for existing IDs before re-saving to prevent duplicates
- **API Filtering**: Filter child versions at query level, not in UI
- **Error Messages**: Always include context in console logs with emojis

## Environment Setup

Create `.env.local`:
```
VITE_SUPABASE_URL=https://lkmgbizyyaaacetllbzr.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_APP_NAME=TenderHub
VITE_APP_VERSION=0.0.0
```

## Configuration Files

### Vite Configuration
- Dev server: port 5173 (auto-assigns if busy), host enabled
- HMR: overlay disabled, 5s timeout
- Manual chunk splitting for optimal loading
- lucide-react excluded from optimization

### TypeScript Configuration
- Project references: tsconfig.app.json and tsconfig.node.json
- Strict mode enabled
- Target: ES2022 with ESNext modules
- Build info: `.tsbuildinfo` in `node_modules/.tmp/`
- Path aliases: `@/*` maps to `./src/*`

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
- Automatic data transfer (BOQ items, DOP positions, work_material_links) on version creation
- Enhanced tender deletion handling with related data cleanup

### ⚠️ Disabled/Placeholder
- Authentication (no login required)
- Real-time features
- File storage
- Edge Functions

## Important Database Functions

### Versioning Functions (applied directly in database)
- **`create_tender_version`** - Creates new tender version with unique number
- **`complete_version_transfer`** - Basic transfer of BOQ items and DOP positions
- **`complete_version_transfer_with_links`** - Full transfer including work_material_links
- **`transfer_work_material_links`** - Transfers work-material relationships between positions
- **`cleanup_draft_versions`** - Removes empty draft versions

### Critical Fields
- **`is_additional`** - Boolean flag in `client_positions` for DOP positions (NOT `position_type = 'dop'`)
- **`parent_position_id`** - Links DOP positions to parent positions
- **`parent_version_id`** - Links child tender versions to parent tenders

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
5. Data automatically transfers after Excel upload (BOQ items, DOP positions, work_material_links)

### Important Notes
- Parent tenders have `parent_version_id = NULL`
- Child versions reference parent via `parent_version_id`
- Tender list page filters out child versions (only shows parents)
- Draft versions are deleted if cancelled before completion
- Unique constraint prevents duplicate mappings per position
- Data transfer happens automatically during Excel upload process

### Key Fixes Applied (January 2025)
1. **Automatic data transfer**: BOQ items, DOP positions, and work_material_links transfer automatically after Excel upload
2. **Enhanced deletion**: Cleans up related tables (version mappings, BOQ mappings, DOP positions) before tender deletion
3. **Improved error handling**: Better validation of old_tender_id and array result handling in mappings
4. **UI improvements**: Shows transfer progress and results to user

## Common Troubleshooting

- **Empty prod.sql**: Run `npm run db:schema` immediately
- **Port Already in Use**: Dev server auto-assigns new port
- **Type Errors**: Run `npm run build` to check all TypeScript errors
- **MCP Not Working**: Restart Claude Code completely
- **Position Totals Wrong**: Apply trigger migration via SQL Editor
- **Import Path Errors**: Verify relative paths when refactoring
- **Versioning SQL Errors**: Check table column names match prod.sql schema
- **Excel Export Slow**: Batch loading implemented (reduced from 10-15s to 1-2s)
- **Duplicate Key on Version Creation**: Check `create_tender_version` function generates unique tender_number
- **Mappings Not Saving**: Verify mappings don't already exist (check for IDs)
- **Deleted Versions Reappearing**: Ensure tender list filters by `parent_version_id IS NULL`
- **UUID Errors in Version Modal**: Use mapping.id, not generated keys
- **Missing Mapping Columns**: Ensure all migrations have been applied to database
- **DOP Positions Not Transferring**: Check parameter order and ensure parent positions exist
- **work_material_links Missing**: Functions handle transfer automatically after Excel upload
- **Deletion Error "Referenced record"**: Related tables are cleaned up automatically, if error persists check for new foreign key constraints