import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { companyService } from '../services/companyService';
import { getAccessToken } from '../services/apiClient';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [bootstrapData, setBootstrapData] = useState(null);
  const [navigation, setNavigation] = useState([]);
  const [headerBadges, setHeaderBadges] = useState({ mailCount: 0, chatCount: 0, notificationCount: 0 });
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState('');

  // Page Refresh (F5): Authenticate via existing token or silent POST /api/v1/auth/refresh
  const loadCurrentUser = useCallback(async () => {
    try {
      const path = window.location.pathname;
      const isPublicRoute =
        path.startsWith('/admin') ||
        path.startsWith('/login') ||
        path.startsWith('/forgot-password') ||
        path.startsWith('/reset-password') ||
        path.startsWith('/set-password') ||
        path.startsWith('/auth/') ||
        path.startsWith('/portal');

      if (isPublicRoute) {
        setUser(null);
        setCompany(null);
        setLoading(false);
        return;
      }

      let data = null;
      const existingToken = getAccessToken();

      // If token is already present, try fetching me profile first
      if (existingToken) {
        try {
          data = await authService.getCurrentUser();
        } catch {
          data = null;
        }
      }

      // If no token or expired, try silent refresh via httpOnly 'rt' cookie
      if (!data?.user) {
        await authService.refreshToken();
        data = await authService.getCurrentUser();
      }
      if (data?.user) {
        setUser(data.user);
        setCompany(data.company || null);
        setNavigation(data.navigation || []);
        setHeaderBadges(data.headerBadges || { mailCount: 0, chatCount: 0, notificationCount: 0 });
        setPermissions(data.permissions || []);

        // Step 3: Load consolidated M1.5 Bootstrap state (profile, seats, settings, permissions, masters)
        try {
          const bootstrap = await companyService.getBootstrap();
          if (bootstrap) {
            setBootstrapData(bootstrap);
            if (bootstrap.company) {
              setCompany((prev) => ({ ...prev, ...bootstrap.company }));
            }
          }
        } catch (bootErr) {
          console.warn('Bootstrap load notice:', bootErr?.message);
        }
      } else {
        setUser(null);
        setCompany(null);
      }
    } catch {
      // Refresh failed or no session -> user unauthenticated
      setUser(null);
      setCompany(null);
      setNavigation([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();

    const handleLogoutEvent = () => {
      setUser(null);
      setCompany(null);
      setBootstrapData(null);
      setNavigation([]);
      setPermissions([]);
    };

    const handleUpgradeEvent = (e) => {
      setUpgradeModalMessage(e.detail || 'Seat limit reached. Please upgrade your plan.');
      setUpgradeModalOpen(true);
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    window.addEventListener('app:upgrade-required', handleUpgradeEvent);

    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
      window.removeEventListener('app:upgrade-required', handleUpgradeEvent);
    };
  }, [loadCurrentUser]);

  const login = async (credentials) => {
    // 1. Authenticate with backend and receive in-memory token + httpOnly cookie
    const data = await authService.login(credentials);
    setUser(data.user || null);
    setCompany(data.company || null);

    // 2. Fetch fresh user context and bootstrap
    try {
      const me = await authService.getCurrentUser();
      if (me?.user) {
        setUser(me.user);
        setCompany(me.company || data.company);
        setNavigation(me.navigation || []);
        setHeaderBadges(me.headerBadges || { mailCount: 0, chatCount: 0, notificationCount: 0 });
        setPermissions(me.permissions || []);
      }
      const bootstrap = await companyService.getBootstrap();
      if (bootstrap) {
        setBootstrapData(bootstrap);
        if (bootstrap.company) {
          setCompany((prev) => ({ ...prev, ...bootstrap.company }));
        }
      }
    } catch (err) {
      console.warn('Initial session bootstrap notice:', err?.message);
    }

    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setCompany(null);
    setBootstrapData(null);
    setNavigation([]);
    setPermissions([]);
  };

  const hasPermission = (permissionKey) => {
    const r = (user?.role || '').toUpperCase();
    if (r === 'SUPERADMIN' || r === 'SUPER_ADMIN' || r === 'OWNER') return true;
    return permissions.includes(permissionKey);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        bootstrapData,
        navigation,
        headerBadges,
        permissions,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser: loadCurrentUser,
        hasPermission,
        upgradeModalOpen,
        setUpgradeModalOpen,
        upgradeModalMessage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
