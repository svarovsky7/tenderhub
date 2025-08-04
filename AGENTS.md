# TenderHub Project

## Project Structure and Organization

```
tenderhub/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── services/          # Business logic and API services
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Main application component
│   ├── App.css            # Application styles
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
├── public/                # Static assets
├── node_modules/          # Dependencies
├── .gitignore            # Git ignore rules
├── eslint.config.js      # ESLint configuration
├── index.html            # HTML template
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite build configuration
├── README.md             # Project documentation
└── database_structure.json # Database schema definition
```

## Database Structure

- Always use the database schema defined in `database_structure.json`.

## Build, Test, and Development Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start development server
npm run preview         # Preview production build
```

### Build
```bash
npm run build           # Build for production
```

### Code Quality
```bash
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript type checking
```

### Testing
```bash
npm test               # Run tests (to be configured)
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
```

## Code Style and Conventions

### TypeScript
- Use TypeScript for all new code
- Prefer interfaces over types for object shapes
- Use explicit return types for functions
- Enable strict mode in tsconfig.json

### React
- Use functional components with hooks
- Follow React naming conventions (PascalCase for components)
- Keep components focused and single-purpose
- Use custom hooks for reusable logic

### File Naming
- Components: PascalCase (e.g., `DefectCard.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Types: PascalCase with `.types.ts` extension
- Tests: Same name with `.test.ts` or `.test.tsx` extension

### Code Organization
- One component per file
- Group related components in folders
- Keep business logic in services
- Separate concerns (UI, logic, data)

## Architecture and Design Patterns

### Frontend Architecture
- **React + TypeScript**: Type-safe component development
- **Vite**: Fast build tooling and HMR
- **Component-based**: Modular, reusable UI components

### State Management
- Local state with React hooks (useState, useReducer)
- Context API for global state
- Custom hooks for shared logic

### API Integration
- Service layer pattern for API calls
- Type-safe API responses
- Error handling and loading states

### Routing
- React Router for client-side routing
- Protected routes for authenticated areas
- Lazy loading for code splitting

## Testing Guidelines

### Unit Testing
- Test components in isolation
- Mock external dependencies
- Test user interactions
- Verify rendered output

### Integration Testing
- Test component interactions
- Verify data flow
- Test API integration

### E2E Testing
- Test critical user flows
- Verify full application behavior
- Cross-browser testing

### Test Structure
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Test implementation
  });

  it('should handle user interaction', () => {
    // Test implementation
  });
});
```

## Security Considerations

### Frontend Security
- Sanitize user inputs
- Validate data before submission
- Use HTTPS for all requests
- Implement Content Security Policy

### Authentication
- JWT token storage in secure cookies
- Token refresh mechanism
- Protected route implementation
- Session timeout handling

### Data Protection
- No sensitive data in local storage
- Encrypt sensitive information
- Implement proper CORS policies
- Regular security audits

### Dependencies
- Regular dependency updates
- Security vulnerability scanning
- Use npm audit regularly
- Pin dependency versions

## Development Workflow

### Git Workflow
- Feature branches from main
- Pull requests for code review
- Squash and merge strategy
- Semantic commit messages

### Code Review
- Required for all changes
- Check for code standards
- Verify test coverage
- Review security implications

### Deployment
- CI/CD pipeline with GitHub Actions
- Automated testing before deploy
- Staging environment validation
- Production deployment approval