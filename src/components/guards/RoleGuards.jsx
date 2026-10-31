import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';

export function RoleRoute({ allowedRoles = [], children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || (allowedRoles.length > 0 && !allowedRoles.includes(user.role))) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
}

export function PermissionGate({ permission, children, fallback = null }) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return <>{children}</>;
}

export function Can({ do: permission, children, fallback = null }) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return <>{children}</>;
}
