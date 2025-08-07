# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**⚠️ IMPORTANT: This file must always be kept synchronized with `AGENTS.md`. Any changes to CLAUDE.md should be immediately replicated to AGENTS.md to ensure consistency.**

## Project Overview

TenderHub is a construction tender management portal built with React 19, TypeScript 5.8, and Vite 7. The application manages hierarchical Bill of Quantities (BOQ), materials/works libraries, and tender workflows. Currently operates without authentication for simplified development.

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
- **UI**: Ant Design 5.26.7 + React 19 compatibility patch
- **State**: TanStack Query 5.84.1
- **Database**: Supabase 2.53.0 (PostgreSQL with RLS disabled)
- **Styling**: Tailwind CSS 3.4.17
- **Excel**: XLSX 0.18.5 for import/export

## Architecture Highlights

### Database Schema
**CRITICAL**: Always refer to `supabase/schemas/prod.sql` for authoritative schema. RLS is completely disabled.

Key tables:
- `tenders` - Main tender projects
- `client_positions` - Top-level BOQ groupings with auto-numbering
- `boq_items` - Hierarchical items with auto-calculated totals
- `materials_library` & `works_library` - Searchable catalogs

### API Layer (`lib/supabase/api.ts`)
Comprehensive 2000+ line TypeScript API with:
- Full CRUD for all entities
- Bulk operations for Excel imports
- Hierarchical data queries
- Error handling with detailed messages
- Type-safe operations via `types.ts` (983 lines)

### Component Organization
```
src/components/tender/  # Core tender components
  - TenderBOQManager.tsx # Main BOQ interface
  - BOQItemList/         # Virtualized item lists
  - LibrarySelector/     # Material/work selection
src/pages/              # Route components
lib/supabase/           # Supabase integration
```

## Critical Implementation Rules

### 1. Database Operations
- **NEVER enable RLS** - It's disabled by design
- **ALWAYS check** `supabase/schemas/prod.sql` for schema
- Use `bulk_insert_boq_items()` for large imports
- Auto-numbering handled by database functions

### 2. File Size Limits
- **Maximum 600 lines per file** - Split larger files
- Extract hooks to separate files
- Split API by domain
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
- Hierarchical BOQ with drag-drop
- Excel import/export
- Materials/Works libraries with search
- Dashboard with statistics
- Russian UI

### ⚠️ Disabled
- Authentication (no login required)
- Real-time features (infrastructure ready)

### ❌ Not Implemented
- File storage/documents
- Edge Functions
- Advanced analytics

## Common Tasks

### Adding BOQ Items
1. Use `LibrarySelector` for material/work selection
2. Items auto-calculate: `total = quantity × coefficient × price`
3. Positions auto-number via `get_next_client_position_number()`

### Excel Import
1. Drag-drop XLSX file
2. System uses `bulk_insert_boq_items()` for performance
3. Handles 5000+ rows efficiently

### Database Changes
1. Modify schema in Supabase dashboard
2. Run `npm run db:schema` to export
3. Update types in `lib/supabase/types.ts`

## Performance Optimizations
- GIN indexes for full-text search
- Virtualized lists for large datasets
- Bulk operations for Excel imports
- Generated columns for auto-calculations

## Recent Fixes (2025-01-05)
- Fixed duplicate key errors in Excel uploads
- Added React 19 compatibility patch
- Updated deprecated Ant Design APIs

## Development Workflow
1. Check `supabase/schemas/prod.sql` before database work
2. Add comprehensive logging to all functions
3. Keep files under 600 lines
4. Test with large datasets (5000+ rows)
5. Verify Russian UI text displays correctly

Remember: This is a simplified development environment without authentication. All features are accessible without login.