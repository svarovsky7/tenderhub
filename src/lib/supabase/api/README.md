# Supabase API Modular Structure

This directory contains the refactored Supabase API modules, split from the original massive 2,344-line api.ts file into smaller, domain-specific modules following the 600-line rule.

## Module Structure

### Core API Modules

- **`tenders.ts`** (234 lines) - Tender CRUD operations
- **`boq.ts`** (722 lines) - BOQ items management with hierarchical support
- **`materials.ts`** (147 lines) - Materials library API
- **`works.ts`** (143 lines) - Works library API
- **`hierarchy.ts`** (454 lines) - Complete tender structure management
- **`client-positions.ts`** (296 lines) - Client positions API
- **`users.ts`** (99 lines) - User management API
- **`client-works.ts`** (165 lines) - Excel import functionality

### Supporting Modules

- **`utils.ts`** (37 lines) - Shared utilities (error handling, pagination)
- **`subscriptions.ts`** (121 lines) - Real-time subscriptions
- **`index.ts`** (14 lines) - Barrel exports for backward compatibility

## Usage

All existing imports continue to work due to backward compatibility exports:

```typescript
// All of these still work
import { tendersApi, boqApi, materialsApi } from '../lib/supabase/api';
import { handleSupabaseError } from '../lib/supabase/api';
```

You can also import directly from specific modules:

```typescript
// Direct imports for better tree-shaking
import { tendersApi } from '../lib/supabase/api/tenders';
import { boqApi } from '../lib/supabase/api/boq';
```

## Key Benefits

1. **Maintainability** - Each module focuses on a single domain
2. **Performance** - Better tree-shaking and smaller bundle sizes
3. **Developer Experience** - Easier to navigate and understand
4. **Scalability** - Individual modules can be further split if needed
5. **Backward Compatibility** - No breaking changes to existing code

## File Size Breakdown

- Original api.ts: 2,344 lines
- Largest module (boq.ts): 722 lines
- All modules combined: 2,432 lines (includes new documentation)
- Main api.ts (now just re-exports): 4 lines

## Architecture Notes

- Removed circular dependencies by inlining database calls in hierarchy.ts
- Maintained comprehensive logging patterns
- Preserved all existing functionality and error handling
- Follows existing TypeScript patterns and naming conventions