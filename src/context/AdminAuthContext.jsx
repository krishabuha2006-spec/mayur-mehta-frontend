import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminAuthService } from '../services/adminAuthService';
import { getAdminToken } from '../services/apiClient';

export const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Page Refresh (F5): Authenticate via existing admin token or silent POST /api/v1/admin/auth/refresh
  const loadAdminProfile = useCallback(async () => {
    try {
      const path = window.location.pathname;
      const isAdminRoute = path.startsWith('/admin');
      if (!isAdminRoute) {
        setAdminUser(null);
        setLoading(false);
        return;
      }

      const isPublicAdminRoute =
        path === '/admin/login' ||
        path.startsWith('/admin/forgot-password') ||
        path.startsWith('/admin/reset-password') ||
        path.startsWith('/admin/set-password') ||
        path.startsWith('/admin/auth/');

      let user = null;
      const existingToken = getAdminToken();

      if (existingToken) {
        try {
          user = await adminAuthService.getProfile();
        } catch {
          user = null;
        }
      }

      // Only attempt silent refresh if we're on a protected admin page or an existing token expired
      if (!user && (!isPublicAdminRoute || existingToken)) {
        try {
          await adminAuthService.refreshToken();
          user = await adminAuthService.getProfile();
        } catch {
          // Expected on cold boot when no active session cookie exists
          user = null;
        }
      }

      if (user) {
        const role = (user.role || '').toUpperCase();
        if (role === 'SUPER_ADMIN' || role === 'SUPERADMIN') {
          setAdminUser({ ...user, mustChangePassword: false });
        } else {
          console.warn('Authenticated user does not have SUPER_ADMIN role:', role);
          setAdminUser(null);
        }
      } else {
        setAdminUser(null);
      }
    } catch {
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminProfile();

    const handleAdminLogout = () => {
      setAdminUser(null);
    };

    window.addEventListener('admin:logout', handleAdminLogout);
    return () => window.removeEventListener('admin:logout', handleAdminLogout);
  }, [loadAdminProfile]);

  const setAuthenticatedAdmin = (user) => {
    if (user) {
      setAdminUser({ ...user, mustChangePassword: false });
    } else {
      setAdminUser(null);
    }
  };

  const updateAdminUser = (updatedData) => {
    setAdminUser((prev) => (prev ? { ...prev, ...updatedData } : null));
  };

  const logout = async () => {
    await adminAuthService.logout();
    setAdminUser(null);
  };

  const logoutAll = async () => {
    await adminAuthService.logoutAll();
    setAdminUser(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        loading,
        isAuthenticated: !!adminUser,
        setAuthenticatedAdmin,
        updateAdminUser,
        refreshProfile: loadAdminProfile,
        logout,
        logoutAll
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
