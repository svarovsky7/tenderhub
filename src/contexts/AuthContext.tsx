import React, { createContext, useContext, useEffect, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AuthUser, ApiResponse } from '../lib/supabase/types';
import { 
  getCurrentUser, 
  loginUser, 
  registerUser, 
  logoutUser, 
  setupAuthStateListener,
  type AuthState 
} from '../lib/supabase/auth';
import { supabase } from '../lib/supabase/client';
import type { LoginCredentials, RegisterCredentials } from '../lib/supabase/types';

// Auth actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: AuthUser | null; session: Session | null } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        session: action.payload.session,
        loading: false,
        error: null,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

// Initial state
const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  error: null,
};

// Context interface
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<ApiResponse<AuthUser>>;
  register: (credentials: RegisterCredentials) => Promise<ApiResponse<AuthUser>>;
  logout: () => Promise<ApiResponse<null>>;
  clearError: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Login function
  const login = async (credentials: LoginCredentials): Promise<ApiResponse<AuthUser>> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const response = await loginUser(credentials);

    if (response.error) {
      dispatch({ type: 'SET_ERROR', payload: response.error });
    } else if (response.data) {
      // Note: The user state will be updated by the auth state listener
      // when Supabase auth state changes
    }

    dispatch({ type: 'SET_LOADING', payload: false });
    return response;
  };

  // Register function
  const register = async (credentials: RegisterCredentials): Promise<ApiResponse<AuthUser>> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const response = await registerUser(credentials);

    if (response.error) {
      dispatch({ type: 'SET_ERROR', payload: response.error });
    }

    dispatch({ type: 'SET_LOADING', payload: false });
    return response;
  };

  // Logout function
  const logout = async (): Promise<ApiResponse<null>> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    const response = await logoutUser();

    if (response.error) {
      dispatch({ type: 'SET_ERROR', payload: response.error });
    }

    dispatch({ type: 'SET_LOADING', payload: false });
    return response;
  };

  // Initialize auth state and set up listeners
  useEffect(() => {
    let mounted = true;
    let initializationComplete = false;

    // Get initial user with session recovery
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // First try to get existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Session check:', { session: !!session, error: sessionError });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (mounted) {
            dispatch({ 
              type: 'SET_USER', 
              payload: { user: null, session: null }
            });
          }
          initializationComplete = true;
          return;
        }
        
        if (session && session.user) {
          console.log('Found existing session, transforming user...');
          // We have a valid session, get user profile
          const response = await getCurrentUser();
          if (mounted) {
            console.log('User restored from session:', response.data);
            dispatch({ 
              type: 'SET_USER', 
              payload: { user: response.data || null, session }
            });
            initializationComplete = true;
            return;
          }
        }
        
        // No valid session found
        console.log('No valid session found');
        if (mounted) {
          dispatch({ 
            type: 'SET_USER', 
            payload: { user: null, session: null }
          });
        }
        initializationComplete = true;
        
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          dispatch({ 
            type: 'SET_USER', 
            payload: { user: null, session: null }
          });
        }
        initializationComplete = true;
      }
    };

    // Set up auth state listener with improved handling
    const { data: { subscription } } = setupAuthStateListener(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth event:', event, 'Session:', !!session);

        // Skip INITIAL_SESSION if we already initialized
        if (event === 'INITIAL_SESSION' && initializationComplete) {
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          // Only get user profile if we don't already have it or if it's different
          if (!state.user || state.user.auth_id !== session.user.id) {
            const response = await getCurrentUser();
            dispatch({ 
              type: 'SET_USER', 
              payload: { user: response.data || null, session }
            });
          } else {
            // Just update the session
            dispatch({ 
              type: 'SET_USER', 
              payload: { user: state.user, session }
            });
          }
        } else if (event === 'SIGNED_OUT') {
          dispatch({ 
            type: 'SET_USER', 
            payload: { user: null, session: null }
          });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('Token refreshed, updating session');
          // Update session on token refresh without calling getCurrentUser
          dispatch({ 
            type: 'SET_USER', 
            payload: { user: state.user, session }
          });
        } else if (event === 'INITIAL_SESSION' && !initializationComplete) {
          // Skip - we handle initialization manually
          console.log('Skipping INITIAL_SESSION, using manual initialization');
        }
      }
    );

    // Initialize auth immediately
    initializeAuth();

    // Fallback timer to ensure loading doesn't hang indefinitely
    const fallbackTimer = setTimeout(() => {
      if (mounted && !initializationComplete) {
        console.log('Auth initialization timeout, setting loading to false');
        dispatch({ 
          type: 'SET_USER', 
          payload: { user: null, session: null }
        });
        initializationComplete = true;
      }
    }, 3000); // 3 second timeout

    // Cleanup
    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Hook to check if user is authenticated
export const useIsAuthenticated = (): boolean => {
  const { user } = useAuth();
  return user !== null && user.is_active;
};

// Hook to check user permissions
export const useHasPermission = () => {
  const { user } = useAuth();
  
  return {
    canManageUsers: user?.role === 'Administrator',
    canManageTenders: user?.role === 'Administrator' || user?.role === 'Engineer',
    canViewTenders: user?.role === 'Administrator' || user?.role === 'Engineer' || user?.role === 'View-only',
    canManageBOQ: user?.role === 'Administrator' || user?.role === 'Engineer',
    canManageLibraries: user?.role === 'Administrator' || user?.role === 'Engineer',
  };
};