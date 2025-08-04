import { supabase } from './client';
import type {
  User,
  Session,
  SignUpWithPasswordCredentials,
  SignInWithPasswordCredentials,
} from '@supabase/supabase-js';
import type {
  AuthUser,
  CreateUserProfile,
  LoginCredentials,
  RegisterCredentials,
  ApiResponse,
  UserRole,
} from './types';

// Auth state management
export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

// Helper function to transform Supabase user to AuthUser
const transformUser = async (user: User): Promise<AuthUser | null> => {
  if (!user) return null;

  try {
    // Fetch user profile from our users table
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Failed to fetch user profile:', error);
      
      // If profile doesn't exist, create it from auth user data
      if (error.code === 'PGRST116') { // No rows returned
        console.log('Creating missing user profile for:', user.email);
        
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email || 'User',
            role: (user.user_metadata?.role as any) || 'View-only',
            is_active: true,
          })
          .select()
          .single();

        if (createError) {
          console.error('Failed to create user profile:', createError);
          return null;
        }

        return {
          ...newProfile,
          auth_id: user.id,
        };
      }
      
      return null;
    }

    if (!profile) {
      console.error('No profile found for user:', user.id);
      return null;
    }

    return {
      ...profile,
      auth_id: user.id,
    };
  } catch (err) {
    console.error('Error in transformUser:', err);
    return null;
  }
};

// Registration helper
export const registerUser = async (
  credentials: RegisterCredentials
): Promise<ApiResponse<AuthUser>> => {
  try {
    const { email, password, full_name, role = 'View-only' } = credentials;

    console.log('Starting registration for:', email);

    // Step 1: Register with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role,
        },
      },
    } as SignUpWithPasswordCredentials);

    if (authError) {
      console.error('Auth signup error:', authError);
      return {
        error: authError.message,
        message: 'Failed to create account',
      };
    }

    if (!authData.user) {
      return {
        error: 'No user returned from registration',
        message: 'Registration failed',
      };
    }

    console.log('Auth user created:', authData.user.id);

    // Step 2: Create profile manually
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role,
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail completely, user might still be able to login
      return {
        data: undefined,
        message: 'Account created but profile setup incomplete. Please try logging in.',
      };
    }

    console.log('Profile created:', profile);

    const authUser: AuthUser = {
      ...profile,
      auth_id: authData.user.id,
    };

    return {
      data: authUser,
      message: 'Account created successfully. Please check your email for verification.',
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Registration failed',
    };
  }
};

// Login helper
export const loginUser = async (
  credentials: LoginCredentials
): Promise<ApiResponse<AuthUser>> => {
  try {
    const { email, password } = credentials;

    // Step 1: Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    } as SignInWithPasswordCredentials);

    if (authError) {
      return {
        error: authError.message,
        message: 'Login failed',
      };
    }

    if (!authData.user) {
      return {
        error: 'No user returned from login',
        message: 'Login failed',
      };
    }

    // Step 2: Transform to AuthUser
    const authUser = await transformUser(authData.user);

    if (!authUser) {
      return {
        error: 'Failed to load user profile',
        message: 'Login successful but profile loading failed',
      };
    }

    // Check if user is active
    if (!authUser.is_active) {
      await supabase.auth.signOut();
      return {
        error: 'Account is deactivated',
        message: 'Please contact your administrator',
      };
    }

    return {
      data: authUser,
      message: 'Login successful',
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Login failed',
    };
  }
};

// Logout helper
export const logoutUser = async (): Promise<ApiResponse<null>> => {
  try {
    const { error } = await supabase.auth.signOut();

    // Clear user cache on logout
    userCache = null;

    if (error) {
      return {
        error: error.message,
        message: 'Logout failed',
      };
    }

    return {
      data: null,
      message: 'Logged out successfully',
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Logout failed',
    };
  }
};

// Get current user with improved session persistence and caching
let userCache: { user: AuthUser | null; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 seconds cache

export const getCurrentUser = async (): Promise<ApiResponse<AuthUser>> => {
  try {
    console.log('Getting current user from Supabase...');
    
    // Check cache first
    const now = Date.now();
    if (userCache && (now - userCache.timestamp) < CACHE_DURATION && userCache.user) {
      console.log('Returning cached user');
      return {
        data: userCache.user,
        message: 'User loaded from cache',
      };
    }
    
    // Try to get session first to avoid unnecessary API calls
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      userCache = { user: null, timestamp: now };
      return {
        data: undefined,
        message: 'Session error',
      };
    }
    
    if (!session || !session.user) {
      console.log('No active session found');
      userCache = { user: null, timestamp: now };
      return {
        data: undefined,
        message: 'No active session',
      };
    }
    
    // We have a valid session, now get user details
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('Supabase auth.getUser result:', { user: !!user, error });

    if (error) {
      console.error('Supabase auth error:', error);
      // Check if it's a session missing error - this is common on initial load
      if (error.message?.includes('Auth session missing')) {
        console.log('No active session found');
        return {
          data: undefined,
          message: 'No active session',
        };
      }
      return {
        data: undefined,
        message: 'Auth error, showing login',
      };
    }

    if (!user) {
      console.log('No user found in Supabase auth');
      return {
        data: undefined,
        message: 'No user logged in',
      };
    }

    console.log('User found, transforming...', user.id);
    const authUser = await transformUser(user);

    if (!authUser) {
      console.log('Transform user failed');
      userCache = { user: null, timestamp: now };
      return {
        data: undefined,
        message: 'No user profile found',
      };
    }

    console.log('User transformed successfully:', authUser);
    // Cache the successful result
    userCache = { user: authUser, timestamp: now };
    return {
      data: authUser,
      message: 'User loaded successfully',
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return {
      data: undefined,
      message: 'Auth check failed',
    };
  }
};

// Update user profile
export const updateUserProfile = async (
  updates: Partial<CreateUserProfile>
): Promise<ApiResponse<AuthUser>> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: 'Not authenticated',
        message: 'Please log in to update profile',
      };
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      return {
        error: updateError.message,
        message: 'Failed to update profile',
      };
    }

    const authUser: AuthUser = {
      ...updatedProfile,
      auth_id: user.id,
    };

    return {
      data: authUser,
      message: 'Profile updated successfully',
    };
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to update profile',
    };
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<ApiResponse<null>> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return {
        error: error.message,
        message: 'Failed to send reset email',
      };
    }

    return {
      data: null,
      message: 'Password reset email sent',
    };
  } catch (error) {
    console.error('Reset password error:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to send reset email',
    };
  }
};

// Update password
export const updatePassword = async (newPassword: string): Promise<ApiResponse<null>> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        error: error.message,
        message: 'Failed to update password',
      };
    }

    return {
      data: null,
      message: 'Password updated successfully',
    };
  } catch (error) {
    console.error('Update password error:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to update password',
    };
  }
};

// Check if user has permission for action
export const hasPermission = (user: AuthUser | null, requiredRoles: UserRole[]): boolean => {
  if (!user || !user.is_active) return false;
  return requiredRoles.includes(user.role);
};

// Permission helpers
export const canManageUsers = (user: AuthUser | null): boolean => {
  return hasPermission(user, ['Administrator']);
};

export const canManageTenders = (user: AuthUser | null): boolean => {
  return hasPermission(user, ['Administrator', 'Engineer']);
};

export const canViewTenders = (user: AuthUser | null): boolean => {
  return hasPermission(user, ['Administrator', 'Engineer', 'View-only']);
};

export const canManageBOQ = (user: AuthUser | null): boolean => {
  return hasPermission(user, ['Administrator', 'Engineer']);
};

export const canManageLibraries = (user: AuthUser | null): boolean => {
  return hasPermission(user, ['Administrator', 'Engineer']);
};

// Auth state listener setup
export const setupAuthStateListener = (
  callback: (event: string, session: Session | null) => void
) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Session helpers
export const getSession = async (): Promise<Session | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const refreshSession = async (): Promise<ApiResponse<Session>> => {
  try {
    console.log('Attempting to refresh session...');
    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Session refresh error:', error);
      return {
        error: error.message,
        message: 'Failed to refresh session',
      };
    }

    console.log('Session refreshed successfully:', !!session);
    return {
      data: session || undefined,
      message: 'Session refreshed successfully',
    };
  } catch (error) {
    console.error('Refresh session error:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to refresh session',
    };
  }
};

// Force session recovery - try to recover from localStorage
export const recoverSession = async (): Promise<ApiResponse<AuthUser>> => {
  try {
    console.log('Attempting session recovery...');
    
    // Try to get session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session recovery error:', sessionError);
      return {
        data: undefined,
        message: 'Session recovery failed',
      };
    }
    
    if (!session || !session.user) {
      console.log('No session to recover');
      return {
        data: undefined,
        message: 'No session found',
      };
    }
    
    console.log('Session recovered, getting user profile...');
    return await getCurrentUser();
    
  } catch (error) {
    console.error('Session recovery error:', error);
    return {
      data: undefined,
      message: 'Session recovery failed',
    };
  }
};

// Check if session is valid without making unnecessary API calls
export const isSessionValid = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return Boolean(session && session.user && session.expires_at && 
                   new Date(session.expires_at * 1000) > new Date());
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
};

// Optimized user session check that avoids unnecessary network calls
export const getStoredUser = async (): Promise<AuthUser | null> => {
  try {
    // First check if we have a valid session in storage
    const valid = await isSessionValid();
    if (!valid) {
      return null;
    }
    
    // Get user from current session
    const response = await getCurrentUser();
    return response.data || null;
  } catch (error) {
    console.error('Get stored user error:', error);
    return null;
  }
};