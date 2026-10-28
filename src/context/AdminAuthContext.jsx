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
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      if (!isAdminRoute) {
        setAdminUser(null);
        setLoading(false);
        return;
      }

      let user = null;
      const existingToken = getAdminToken();

      if (existingToken) {
        try {
          user = await adminAuthService.getProfile();
        } catch {
          user = null;
        }
      }

      if (!user) {
        try {
          await adminAuthService.refreshToken();
          user = await adminAuthService.getProfile();
        } catch {
          // Expected on cold boot when no active session cookie exists
          user = null;
        }
      }
      const role = (user?.role || '').toUpperCase();
      if (user && (role === 'SUPER_ADMIN' || role === 'SUPERADMIN')) {
        setAdminUser(user);
      } else {
        console.warn('Authenticated user does not have SUPER_ADMIN role:', role);
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
    setAdminUser(user);
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
