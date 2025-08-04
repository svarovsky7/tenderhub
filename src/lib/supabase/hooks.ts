import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  setupAuthStateListener,
  getSession,
} from './auth';
import type {
  AuthUser,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  ApiResponse,
} from './types';

// Auth state management hook
export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session
        const session = await getSession();
        
        if (session?.user) {
          // Get user profile
          const userResponse = await getCurrentUser();
          
          if (isMounted) {
            setState({
              user: userResponse.data || null,
              session,
              loading: false,
              error: userResponse.error || null,
            });
          }
        } else {
          if (isMounted) {
            setState({
              user: null,
              session: null,
              loading: false,
              error: null,
            });
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setState({
            user: null,
            session: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to initialize auth',
          });
        }
      }
    };

    initializeAuth();

    // Setup auth state listener
    const { data: { subscription } } = setupAuthStateListener(
      async (event, session) => {
        if (!isMounted) return;

        console.log('Auth state changed:', event, session?.user?.id);

        if (event === 'SIGNED_IN' && session?.user) {
          const userResponse = await getCurrentUser();
          setState({
            user: userResponse.data || null,
            session,
            loading: false,
            error: userResponse.error || null,
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            loading: false,
            error: null,
          });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setState((prev: AuthState) => ({
            ...prev,
            session,
            error: null,
          }));
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<ApiResponse<AuthUser>> => {
    setState((prev: AuthState) => ({ ...prev, loading: true, error: null }));
    
    const response = await loginUser(credentials);
    
    if (response.error) {
      setState((prev: AuthState) => ({ ...prev, loading: false, error: response.error || null }));
    }
    // Note: State will be updated by the auth state listener
    
    return response;
  }, []);

  // Register function
  const register = useCallback(async (credentials: RegisterCredentials): Promise<ApiResponse<AuthUser>> => {
    setState((prev: AuthState) => ({ ...prev, loading: true, error: null }));
    
    const response = await registerUser(credentials);
    
    if (response.error) {
      setState((prev: AuthState) => ({ ...prev, loading: false, error: response.error || null }));
    }
    // Note: State will be updated by the auth state listener
    
    return response;
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<ApiResponse<null>> => {
    setState((prev: AuthState) => ({ ...prev, loading: true, error: null }));
    
    const response = await logoutUser();
    
    // Note: State will be updated by the auth state listener
    
    return response;
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    clearError,
    isAuthenticated: !!state.user && !!state.session,
    isLoading: state.loading,
  };
};

// Hook for checking user permissions
export const usePermissions = () => {
  const { user } = useAuth();

  const hasRole = useCallback((roles: string | string[]): boolean => {
    if (!user || !user.is_active) return false;
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }, [user]);

  const can = useCallback((action: string): boolean => {
    if (!user || !user.is_active) return false;

    switch (action) {
      case 'manage_users':
        return hasRole('Administrator');
      
      case 'manage_tenders':
      case 'create_tender':
      case 'edit_tender':
      case 'manage_boq':
      case 'edit_boq':
      case 'manage_libraries':
      case 'edit_materials':
      case 'edit_works':
        return hasRole(['Administrator', 'Engineer']);
      
      case 'view_tenders':
      case 'view_boq':
      case 'view_materials':
      case 'view_works':
      case 'export_data':
        return hasRole(['Administrator', 'Engineer', 'View-only']);
      
      default:
        return false;
    }
  }, [user, hasRole]);

  const canManage = useCallback((resource: string): boolean => {
    return can(`manage_${resource}`);
  }, [can]);

  const canView = useCallback((resource: string): boolean => {
    return can(`view_${resource}`);
  }, [can]);

  const canEdit = useCallback((resource: string): boolean => {
    return can(`edit_${resource}`);
  }, [can]);

  return {
    user,
    hasRole,
    can,
    canManage,
    canView,
    canEdit,
    isAdmin: hasRole('Administrator'),
    isEngineer: hasRole('Engineer'),
    isViewOnly: hasRole('View-only'),
    canManageUsers: can('manage_users'),
    canManageTenders: can('manage_tenders'),
    canManageBOQ: can('manage_boq'),
    canManageLibraries: can('manage_libraries'),
  };
};

// Hook for real-time data subscriptions
export const useRealtime = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    // Monitor connection status
    const checkConnection = () => {
      // This is a simplified check - you might want to implement proper connection monitoring
      setIsConnected(true);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
      // Cleanup all subscriptions
      subscriptions.forEach(sub => {
        sub.unsubscribe();
      });
    };
  }, [subscriptions]);

  const subscribe = useCallback((key: string, channel: any) => {
    // Unsubscribe existing subscription with the same key
    const existing = subscriptions.get(key);
    if (existing) {
      existing.unsubscribe();
    }

    // Subscribe to new channel
    const subscription = channel;
    setSubscriptions(prev => new Map(prev).set(key, subscription));

    return subscription;
  }, [subscriptions]);

  const unsubscribe = useCallback((key: string) => {
    const subscription = subscriptions.get(key);
    if (subscription) {
      subscription.unsubscribe();
      setSubscriptions(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    }
  }, [subscriptions]);

  const unsubscribeAll = useCallback(() => {
    subscriptions.forEach(sub => {
      sub.unsubscribe();
    });
    setSubscriptions(new Map());
  }, [subscriptions]);

  return {
    isConnected,
    subscribe,
    unsubscribe,
    unsubscribeAll,
    activeSubscriptions: subscriptions.size,
  };
};

// Hook for loading states
export const useLoading = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);
  const [error, setError] = useState<string | null>(null);

  const withLoading = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Loading error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    withLoading,
    clearError,
    reset,
  };
};

// Hook for API responses with error handling
export const useApiResponse = <T = any>() => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (
    apiCall: () => Promise<ApiResponse<T>>
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall();
      
      if (response.error) {
        setError(response.error);
        setData(null);
        return null;
      }
      
      setData(response.data || null);
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setData(null);
      console.error('API call error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    error,
    loading,
    execute,
    reset,
    clearError,
  };
};