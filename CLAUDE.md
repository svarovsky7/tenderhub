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
Key tables with hierarchical relationships:
- `profiles` - User management with roles (admin/engineer/viewer)
- `tenders` - Main tender entities
- `tender_rows` - BOQ items with parent-child hierarchy
- `lib_works/lib_materials` - Reusable component libraries
- `tender_files` - File attachments with versioning
- `history_log` - Complete audit trail

### Project Structure
```
src/
├── components/     # React components
├── services/       # API and business logic
├── hooks/          # Custom React hooks  
├── types/          # TypeScript definitions
├── utils/          # Helper functions
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