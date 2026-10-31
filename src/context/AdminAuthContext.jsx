import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminAuthService } from '../services/adminAuthService';
import { getAdminToken } from '../services/apiClient';

export const AdminAuthContext = createContext(null);

const getStoredAdminUser = () => {
  try {
    const raw = sessionStorage.getItem('mm_admin_user') || localStorage.getItem('mm_admin_user');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
};

export function AdminAuthProvider({ children }) {
  const initialAdmin = getStoredAdminUser();
  const [adminUser, setAdminUser] = useState(initialAdmin || null);
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
          const formatted = { ...user, mustChangePassword: !!user.mustChangePassword };
          setAdminUser(formatted);
          try {
            sessionStorage.setItem('mm_admin_user', JSON.stringify(formatted));
          } catch {}

          // Proactively fire the event so the password modal opens before any API fetches
          if (user.mustChangePassword) {
            window.dispatchEvent(new CustomEvent('admin:password_change_required'));
          }
        } else {
          console.warn('Authenticated user does not have SUPER_ADMIN role:', role);
          setAdminUser(null);
          try {
            sessionStorage.removeItem('mm_admin_user');
            localStorage.removeItem('mm_admin_user');
          } catch {}
        }
      } else {
        if (!existingToken) {
          setAdminUser(null);
          try {
            sessionStorage.removeItem('mm_admin_user');
            localStorage.removeItem('mm_admin_user');
          } catch {}
        }
      }
    } catch {
      setAdminUser(null);
      try {
        sessionStorage.removeItem('mm_admin_user');
        localStorage.removeItem('mm_admin_user');
      } catch {}
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
      const formatted = { ...user, mustChangePassword: !!user.mustChangePassword };
      setAdminUser(formatted);
      try {
        sessionStorage.setItem('mm_admin_user', JSON.stringify(formatted));
      } catch {}
    } else {
      setAdminUser(null);
      try {
        sessionStorage.removeItem('mm_admin_user');
        localStorage.removeItem('mm_admin_user');
      } catch {}
    }
  };

  const updateAdminUser = (updatedData) => {
    setAdminUser((prev) => {
      const updated = prev ? { ...prev, ...updatedData } : null;
      try {
        if (updated) {
          sessionStorage.setItem('mm_admin_user', JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });
  };

  const logout = async () => {
    try {
      await adminAuthService.logout();
    } catch (err) {
      console.warn('Admin logout notice:', err?.message);
    } finally {
      clearAdminToken();
      setAdminUser(null);
      try {
        sessionStorage.removeItem('mm_admin_user');
        localStorage.removeItem('mm_admin_user');
      } catch {}
    }
  };

  const logoutAll = async () => {
    try {
      await adminAuthService.logoutAll();
    } catch (err) {
      console.warn('Admin logoutAll notice:', err?.message);
    } finally {
      clearAdminToken();
      setAdminUser(null);
      try {
        sessionStorage.removeItem('mm_admin_user');
        localStorage.removeItem('mm_admin_user');
      } catch {}
    }
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
