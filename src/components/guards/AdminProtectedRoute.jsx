import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ROUTES } from '../../constants/routes';

import { LoadingScreen } from '../common/LoadingScreen/LoadingScreen';

export function AdminProtectedRoute({ children }) {
  const { adminUser, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Loading..." fullScreen />;
  }

  if (!adminUser) {
    return <Navigate to={ROUTES.ADMIN_LOGIN} state={{ from: location }} replace />;
  }

  // Ensure role is SUPER_ADMIN per Module M1.3 Section 2
  const role = (adminUser.role || '').toUpperCase();
  if (role !== 'SUPER_ADMIN' && role !== 'SUPERADMIN') {
    return (
      <Navigate
        to={ROUTES.ADMIN_LOGIN}
        state={{
          from: location,
          error: 'Access restricted: Your account does not have Super Admin platform privileges.'
        }}
        replace
      />
    );
  }

  return children;
}
