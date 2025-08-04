# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenderHub is a React + TypeScript + Vite web application for tender management and cost estimation. The project uses Supabase as the backend with PostgreSQL database and real-time capabilities.

## Essential Commands

```bash
# Development
npm run dev          # Start development server (http://localhost:5173)
npm run preview      # Preview production build

# Build
npm run build        # TypeScript compilation + Vite production build

# Code Quality
npm run lint         # Run ESLint with TypeScript checking
```

## Architecture Overview

### Frontend Stack
- **React 19.1.0** with functional components and hooks
- **TypeScript** with strict mode enabled
- **Vite 7.0.4** for development and building
- **ESLint 9.30.1** with TypeScript and React plugins

### Backend Stack
- **Supabase** for database, auth, storage, and real-time
- **PostgreSQL** with Row Level Security (RLS)
- **Edge Functions** (Deno) for custom logic

### Database Schema

**Core Tables:**
- `profiles` - User profiles extending Supabase auth (only `id`, `full_name`, `role`, timestamps)
- `tenders` - Main tender/project entities with status workflow (draft → active → closed)
- `tender_users` - Junction table linking users to tenders with role assignments
- `tender_rows` - BOQ items with hierarchical structure (parent_id self-reference)
- `tender_costs` - Commercial cost scenarios (base/best/worst case)
- `tender_files` - File attachments with versioning system

**Library Tables:**
- `lib_works` - Master library of standardized work items (code, name, unit, price)
- `lib_materials` - Master library of standardized materials (code, name, unit, price)

**Audit:**
- `history_log` - Complete audit trail with JSONB old/new data snapshots

**Key Enums:**
- `user_role`: 'admin', 'engineer', 'viewer'
- `tender_status`: 'draft', 'active', 'closed'  
- `item_type`: 'work', 'material', 'sub_work', 'sub_material'
- `cost_scenario`: 'base', 'best', 'worst'

**Important Notes:**
- All tables use UUID primary keys with `gen_random_uuid()`
- `tender_rows.total` is a computed column: `quantity * coef * price_unit`
- Row Level Security (RLS) controls access through tender assignments
- BOQ supports hierarchical work/material breakdown structure
- Version control for BOQ items and file attachments

### Project Structure
```
src/
├── components/     # React components
│   ├── AuthContainer.tsx    # Auth form switcher
│   ├── LoginForm.tsx        # Login form
│   ├── RegistrationForm.tsx # Registration form
│   ├── Dashboard.tsx        # Main dashboard page
│   ├── AppLayout.tsx        # App layout manager
│   └── *.css               # Component styles
├── contexts/       # React contexts
│   └── AuthContext.tsx     # Authentication context
├── hooks/          # Custom React hooks
│   └── useAuth.ts          # Authentication hook
├── lib/            # Configuration
│   └── supabase.ts         # Supabase client
├── services/       # API and business logic
│   └── auth.service.ts     # Authentication service
├── types/          # TypeScript definitions
│   ├── auth.types.ts       # Auth-related types
│   └── tender.types.ts     # Tender-related types
└── App.tsx         # Main application entry
```

## Development Guidelines

### TypeScript Requirements
- Strict mode is enabled - no `any` types without explicit justification
- All components must have proper TypeScript interfaces
- Use type inference where possible, explicit types where necessary

### React Patterns
- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for expensive components
- Follow React 19 best practices

### Database Operations
- All database queries go through Supabase client
- Use RLS policies for security
- Implement optimistic updates for real-time features
- Handle offline scenarios gracefully

### File Naming Conventions
- Components: PascalCase (e.g., `TenderRow.tsx`)
- Utilities: camelCase (e.g., `calculateCost.ts`)
- Types: PascalCase with `.types.ts` suffix
- Hooks: camelCase starting with 'use' (e.g., `useTender.ts`)

## Key Features to Implement

1. **Excel Import/Export** - Support for BOQ data in Excel format
2. **Real-time Collaboration** - Multiple users editing simultaneously
3. **Version Control** - Track changes to tender documents
4. **Libraries** - Reusable work and material components
5. **Cost Scenarios** - Base/best/worst case calculations

## Performance Requirements
- Load 5000 BOQ rows in ≤30 seconds
- API response time <300ms
- Support 50 concurrent users
- Real-time updates <100ms latency

## Supabase Integration
- Supabase client configured in `src/lib/supabase.ts`
- Authentication service in `src/services/auth.service.ts`
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- User registration creates both auth user and profile record
- Supports email confirmation workflow

## Security Considerations
- Environment variables for Supabase configuration
- Row Level Security (RLS) for all tables
- Input validation on both client and server
- Secure file upload with type restrictions

## Testing Strategy (To Be Implemented)
- Unit tests for utilities and hooks
- Integration tests for API services
- Component tests with React Testing Library
- E2E tests for critical user flows

## Notes for Development
- The project is in early development stage
- Database schema is fully designed but implementation is pending
- UI library (Ant Design) and state management (TanStack Query) are planned but not yet installed
- Comprehensive technical specifications available in `technicalTask.md` (in Russian)