import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth, useHasPermission } from '../../contexts/AuthContext';
import type { UserRole } from '../../lib/supabase/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  fallbackPath = '/auth/login',
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spin size="large" />
          <div className="mt-4 text-gray-600">
            Проверка авторизации...
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // If user is inactive, redirect to login
  if (!user.is_active) {
    return (
      <Navigate 
        to="/auth/inactive" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // If specific roles are required, check user role
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <Navigate 
        to="/unauthorized" 
        state={{ from: location, requiredRoles }} 
        replace 
      />
    );
  }

  // User is authenticated and authorized
  return <>{children}</>;
};

// Specific role-based protected routes
interface RoleProtectedRouteProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export const AdminRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  fallbackPath 
}) => (
  <ProtectedRoute 
    requiredRoles={['Administrator']} 
    fallbackPath={fallbackPath}
  >
    {children}
  </ProtectedRoute>
);

export const EngineerRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  fallbackPath 
}) => (
  <ProtectedRoute 
    requiredRoles={['Administrator', 'Engineer']} 
    fallbackPath={fallbackPath}
  >
    {children}
  </ProtectedRoute>
);

export const ViewerRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  fallbackPath 
}) => (
  <ProtectedRoute 
    requiredRoles={['Administrator', 'Engineer', 'View-only']} 
    fallbackPath={fallbackPath}
  >
    {children}
  </ProtectedRoute>
);

// Component for checking permissions conditionally
interface ConditionalRenderProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  fallback?: React.ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  requiredRoles = [],
  fallback = null,
}) => {
  const { user } = useAuth();

  // If no roles specified, just check if user exists and is active
  if (requiredRoles.length === 0) {
    return user && user.is_active ? <>{children}</> : <>{fallback}</>;
  }

  // Check specific roles
  const hasPermission = user && user.is_active && requiredRoles.includes(user.role);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

// Permission checking hook wrapper component
interface PermissionGateProps {
  children: React.ReactNode;
  permission: keyof ReturnType<typeof useHasPermission>;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  fallback = null,
}) => {
  const permissions = useHasPermission();
  const hasPermission = permissions[permission];

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

export default ProtectedRoute;