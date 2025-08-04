# TenderHub Supabase Integration

This directory contains the complete Supabase integration for TenderHub, including authentication, database operations, and real-time functionality.

## 📁 File Structure

```
src/lib/supabase/
├── client.ts          # Supabase client configuration
├── types.ts           # TypeScript type definitions
├── auth.ts            # Authentication helpers
├── api.ts             # API service layer
├── hooks.ts           # React hooks for auth and data
├── index.ts           # Main exports
└── README.md          # This file
```

## 🚀 Quick Start

### 1. Environment Setup

Copy the `.env.local` file and fill in your Supabase credentials:

```bash
# Get these from your Supabase project dashboard
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Database Setup

Run the SQL schema from `/database/schema.sql` in your Supabase SQL editor to create all tables, policies, and functions.

### 3. Basic Usage

```tsx
import { useAuth, tendersApi, usePermissions } from '@/lib/supabase';

function App() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const { canManageTenders } = usePermissions();

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div>
      <h1>Welcome, {user?.full_name}</h1>
      {canManageTenders && (
        <button onClick={() => tendersApi.create({...})}>
          Create Tender
        </button>
      )}
    </div>
  );
}
```

## 🔐 Authentication

### Login/Register

```tsx
import { useAuth } from '@/lib/supabase';

function LoginForm() {
  const { login, register, loading, error } = useAuth();

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    if (result.error) {
      console.error('Login failed:', result.error);
    }
  };

  const handleRegister = async (credentials) => {
    const result = await register(credentials);
    if (result.error) {
      console.error('Registration failed:', result.error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {/* Form fields */}
    </form>
  );
}
```

### Permission Checking

```tsx
import { usePermissions } from '@/lib/supabase';

function TenderManagement() {
  const { canManageTenders, canViewTenders, isAdmin } = usePermissions();

  return (
    <div>
      {canViewTenders && <TenderList />}
      {canManageTenders && <CreateTenderButton />}
      {isAdmin && <AdminPanel />}
    </div>
  );
}
```

## 📊 Data Operations

### Tenders

```tsx
import { tendersApi, useApiResponse } from '@/lib/supabase';

function TendersList() {
  const { data, loading, error, execute } = useApiResponse();

  useEffect(() => {
    execute(() => tendersApi.getAll({
      status: ['active', 'draft'],
      search: 'construction'
    }, { page: 1, limit: 20 }));
  }, []);

  if (loading) return <Loading />;
  if (error) return <Error message={error} />;

  return (
    <div>
      {data?.data?.map(tender => (
        <TenderCard key={tender.id} tender={tender} />
      ))}
    </div>
  );
}
```

### BOQ Management

```tsx
import { boqApi } from '@/lib/supabase';

function BOQManager({ tenderId }) {
  const [items, setItems] = useState([]);

  const loadBOQ = async () => {
    const result = await boqApi.getByTenderId(tenderId);
    if (result.data) {
      setItems(result.data);
    }
  };

  const bulkImport = async (excelData) => {
    const result = await boqApi.bulkCreate(tenderId, excelData);
    if (result.data) {
      console.log(`Imported ${result.data} items`);
      loadBOQ(); // Refresh
    }
  };

  return (
    <div>
      <BOQTable items={items} />
      <ExcelImportButton onImport={bulkImport} />
    </div>
  );
}
```

## 🔄 Real-time Updates

```tsx
import { subscriptions, useRealtime } from '@/lib/supabase';

function RealTimeTendersList() {
  const [tenders, setTenders] = useState([]);
  const { subscribe, unsubscribe } = useRealtime();

  useEffect(() => {
    // Subscribe to tender changes
    const subscription = subscriptions.subscribeTenders((payload) => {
      console.log('Tender changed:', payload);
      // Update local state based on the change
      if (payload.eventType === 'INSERT') {
        setTenders(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setTenders(prev => prev.map(t => 
          t.id === payload.new.id ? payload.new : t
        ));
      } else if (payload.eventType === 'DELETE') {
        setTenders(prev => prev.filter(t => t.id !== payload.old.id));
      }
    });

    subscribe('tenders', subscription);

    return () => {
      unsubscribe('tenders');
    };
  }, []);

  return <TendersList tenders={tenders} />;
}
```

## 🛡️ User Roles & Permissions

The system supports three user roles:

- **Administrator**: Full access to all features
- **Engineer**: Can manage tenders, BOQ, and libraries
- **View-only**: Read-only access to data

### Permission Matrix

| Action | Administrator | Engineer | View-only |
|--------|---------------|----------|-----------|
| Manage Users | ✅ | ❌ | ❌ |
| Create/Edit Tenders | ✅ | ✅ | ❌ |
| View Tenders | ✅ | ✅ | ✅ |
| Manage BOQ | ✅ | ✅ | ❌ |
| Manage Libraries | ✅ | ✅ | ❌ |
| Export Data | ✅ | ✅ | ✅ |

## 🔧 Configuration

### Client Configuration

The Supabase client is configured with:
- PKCE authentication flow for better security
- Auto token refresh
- Session persistence
- Real-time subscriptions

### Database Policies

Row Level Security (RLS) is enabled on all tables with policies that:
- Restrict data access by organization
- Enforce role-based permissions
- Audit all changes

## 📈 Performance Optimizations

- **Pagination**: All list APIs support pagination
- **Indexing**: Optimized database indexes for common queries
- **Bulk Operations**: Efficient bulk inserts for Excel imports
- **Views**: Pre-computed views for complex queries
- **Caching**: Built-in query caching in React hooks

## 🐛 Error Handling

All API calls return a consistent `ApiResponse<T>` format:

```typescript
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
```

Error handling is built into the hooks:

```tsx
const { data, error, loading, execute } = useApiResponse();

// Execute API call
const result = await execute(() => tendersApi.getById(id));

if (result) {
  // Success - data is available
} else {
  // Error - check the error state
  console.error(error);
}
```

## 🔍 Type Safety

All database operations are fully typed with TypeScript:

```typescript
// Type-safe database operations
const tender: Tender = await tendersApi.create({
  title: 'New Tender',
  client_name: 'ABC Corp',
  tender_number: 'TND-2025-001',
  created_by: user.id
});

// Type-safe filters
const filters: TenderFilters = {
  status: ['active', 'draft'],
  date_from: '2025-01-01'
};
```

## 🚀 Deployment Notes

1. **Environment Variables**: Ensure all environment variables are set in production
2. **Database Migration**: Run the schema.sql file in your production Supabase instance
3. **RLS Policies**: Verify Row Level Security policies are enabled
4. **User Creation**: Set up initial admin users through Supabase Auth

## 📚 API Reference

For detailed API documentation, see the TypeScript definitions in `types.ts` and the implementation in `api.ts`.

### Main Exports

```typescript
// Client and types
import { supabase, type Database, type AuthUser } from '@/lib/supabase';

// Authentication
import { useAuth, usePermissions } from '@/lib/supabase';

// Data APIs
import { tendersApi, boqApi, materialsApi, worksApi } from '@/lib/supabase';

// Real-time
import { subscriptions, useRealtime } from '@/lib/supabase';

// Utilities
import { formatCurrency, formatDate, validateEmail } from '@/lib/supabase';
```

## 🆘 Troubleshooting

### Common Issues

1. **Auth not working**: Check environment variables and Supabase project settings
2. **Permission denied**: Verify user roles and RLS policies
3. **Real-time not updating**: Check subscription setup and network connectivity
4. **Type errors**: Ensure database schema matches TypeScript definitions

### Debug Mode

Enable debug logging by setting:

```typescript
// In development
localStorage.setItem('supabase.debug', 'true');
```

For additional support, refer to the [Supabase documentation](https://supabase.com/docs) or check the project's technical documentation.