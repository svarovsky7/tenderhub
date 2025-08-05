/**
 * User and Authentication Types
 * Contains user profiles, authentication state, and role management types
 */

import type { Database, UserRole } from './database';

// Basic user types from database
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

// Extended user types
export interface AuthUser extends User {
  auth_id: string;
}

export interface CreateUserProfile {
  email: string;
  full_name: string;
  role?: UserRole;
  organization_id?: string;
}

// Auth state types
export interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  error: string | null;
}

// Session type (will be properly typed when auth is implemented)
export type Session = any;

// Permission and role types
export interface PermissionCheck {
  action: string;
  resource: string;
  userRole: UserRole;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}