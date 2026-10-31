import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { companyService } from '../services/companyService';
import { permissionService } from '../services/permissionService';
import { billingService } from '../services/billingService';
import { getAccessToken } from '../services/apiClient';

export const AuthContext = createContext(null);

const getStoredTenantSession = () => {
  try {
    const raw = sessionStorage.getItem('mm_user_session') || localStorage.getItem('mm_user_session');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
};

export function AuthProvider({ children }) {
  const initialSession = getStoredTenantSession();
  const [user, setUser] = useState(initialSession?.user || null);
  const [company, setCompany] = useState(initialSession?.company || null);
  const [subscription, setSubscription] = useState(null);
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

      // Admin routes are isolated and managed exclusively by AdminAuthProvider
      if (path.startsWith('/admin')) {
        setLoading(false);
        return;
      }

      const isPublicRoute =
        path === '/login' ||
        path.startsWith('/forgot-password') ||
        path.startsWith('/reset-password') ||
        path.startsWith('/set-password') ||
        path.startsWith('/auth/') ||
        path.startsWith('/portal');

      // If user is on a public route and has no active token, mark unauthenticated
      if (isPublicRoute && !getAccessToken()) {
        setUser(null);
        setCompany(null);
        setSubscription(null);
        setLoading(false);
        return;
      }

      let data = null;
      const existingToken = getAccessToken();

      // 1. If token is present in memory/sessionStorage, verify directly with /auth/me
      if (existingToken) {
        try {
          data = await authService.getCurrentUser();
        } catch {
          data = null;
        }
      }

      // 2. If no valid user from existing token (e.g. token expired), silently refresh via httpOnly 'rt' cookie
      if (!data?.user) {
        try {
          await authService.refreshToken();
          data = await authService.getCurrentUser();
        } catch {
          data = null;
        }
      }

      if (data?.user) {
        setUser(data.user);
        setCompany(data.company || null);
        setNavigation(data.navigation || []);
        setHeaderBadges(data.headerBadges || { mailCount: 0, chatCount: 0, notificationCount: 0 });
        setPermissions(data.permissions || []);

        try {
          sessionStorage.setItem('mm_user_session', JSON.stringify({
            user: data.user,
            company: data.company
          }));
        } catch {}

        // Load Permissions Matrix from /permissions/me In-Memory
        try {
          const perms = await permissionService.getMyPermissions();
          if (perms) {
            const permList = Array.isArray(perms) ? perms : (perms.permissions || perms.modules || []);
            if (permList.length > 0) {
              setPermissions(permList);
            }
          }
        } catch (permErr) {
          console.debug('Permissions fetch notice:', permErr?.message);
        }

        // Load Company & Plan Info from /company/bootstrap
        try {
          const bootstrap = await companyService.getBootstrap();
          if (bootstrap) {
            setBootstrapData(bootstrap);
            if (bootstrap.company) {
              setCompany((prev) => ({ ...prev, ...bootstrap.company }));
            }
            setSubscription({
              plan: bootstrap.company?.plan || 'PRO',
              planCode: (bootstrap.company?.plan || 'pro').toLowerCase(),
              status: bootstrap.company?.status || 'ACTIVE',
              seats: bootstrap.seats?.limit || 10,
              seatsUsed: bootstrap.seats?.used || 1
            });
          }
        } catch (bootErr) {
          console.debug('Bootstrap load notice:', bootErr?.message);
        }
      } else {
        // Both token and silent refresh failed - clear invalid session
        clearAccessToken();
        setUser(null);
        setCompany(null);
        setSubscription(null);
        try {
          sessionStorage.removeItem('mm_user_session');
          localStorage.removeItem('mm_user_session');
        } catch {}
      }
    } catch {
      clearAccessToken();
      setUser(null);
      setCompany(null);
      setSubscription(null);
      setNavigation([]);
      setPermissions([]);
      try {
        sessionStorage.removeItem('mm_user_session');
        localStorage.removeItem('mm_user_session');
      } catch {}
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

    const handleRestrictedEvent = () => {
      setSubscription((prev) => ({
        ...(prev || {}),
        status: 'RESTRICTED'
      }));
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    window.addEventListener('app:upgrade-required', handleUpgradeEvent);
    window.addEventListener('billing:restricted', handleRestrictedEvent);

    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
      window.removeEventListener('app:upgrade-required', handleUpgradeEvent);
      window.removeEventListener('billing:restricted', handleRestrictedEvent);
    };
  }, [loadCurrentUser]);

  const login = async (credentials) => {
    // 1. Authenticate with backend and receive in-memory token + httpOnly cookie
    const data = await authService.login(credentials);
    setUser(data.user || null);
    setCompany(data.company || null);

    // 2. Fetch fresh user context, permissions, bootstrap and subscription
    try {
      const me = await authService.getCurrentUser();
      if (me?.user) {
        setUser(me.user);
        setCompany(me.company || data.company);
        setNavigation(me.navigation || []);
        setHeaderBadges(me.headerBadges || { mailCount: 0, chatCount: 0, notificationCount: 0 });
        setPermissions(me.permissions || []);
      }

      // In-Memory Permissions Matrix
      try {
        const perms = await permissionService.getMyPermissions();
        if (perms) {
          const permList = Array.isArray(perms) ? perms : (perms.permissions || perms.modules || []);
          if (permList.length > 0) setPermissions(permList);
        }
      } catch (permErr) {
        console.debug('Login permissions notice:', permErr?.message);
      }

      // In-Memory Company Bootstrap & Subscription
      try {
        const bootstrap = await companyService.getBootstrap();
        if (bootstrap) {
          setBootstrapData(bootstrap);
          if (bootstrap.company) {
            setCompany((prev) => ({ ...prev, ...bootstrap.company }));
          }
          setSubscription({
            plan: bootstrap.company?.plan || 'PRO',
            planCode: (bootstrap.company?.plan || 'pro').toLowerCase(),
            status: bootstrap.company?.status || 'ACTIVE',
            seats: bootstrap.seats?.limit || 10,
            seatsUsed: bootstrap.seats?.used || 1
          });
        }
      } catch (bootErr) {
        console.warn('Initial session bootstrap notice:', bootErr?.message);
      }

      try {
        sessionStorage.setItem('mm_user_session', JSON.stringify({
          user: me?.user || data.user,
          company: me?.company || data.company
        }));
      } catch {}
    } catch (err) {
      console.warn('Initial session bootstrap notice:', err?.message);
    }

    return data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Backend logout notice:', err?.message);
    } finally {
      clearAccessToken();
      setUser(null);
      setCompany(null);
      setSubscription(null);
      setBootstrapData(null);
      setNavigation([]);
      setPermissions([]);
      try {
        sessionStorage.removeItem('mm_user_session');
        localStorage.removeItem('mm_user_session');
      } catch {}
    }
  };

  const hasPermission = useCallback((permissionKey, actionName = null) => {
    if (!permissionKey) return true;
    const r = (user?.role || '').toUpperCase().replace(/[-\s]/g, '_');

    // Module M1.5 Section 1 & 4: Firm Owners always hold full access across all modules
    if (r === 'SUPERADMIN' || r === 'SUPER_ADMIN' || r === 'OWNER') return true;

    // Normalize module and action
    let mod = permissionKey;
    let act = actionName;
    if (!act && (permissionKey.includes(':') || permissionKey.includes('.'))) {
      const parts = permissionKey.split(/[:.]/);
      mod = parts[0];
      act = parts[1];
    }

    const modUpper = (mod || '').toUpperCase();
    const actLower = (act || '').toLowerCase();

    // Check custom permissions & overrides from backend (/permissions/me)
    if (Array.isArray(permissions)) {
      if (permissions.includes('*') || permissions.includes(permissionKey)) return true;

      // Object format from M1.5: { moduleKey: 'PROJECT', actions: ['view', 'edit'], dataScope: 'ALL' }
      const matchedMod = permissions.find(
        (p) => typeof p === 'object' && p?.moduleKey?.toUpperCase() === modUpper
      );
      if (matchedMod) {
        if (!actLower || matchedMod.actions?.includes('*') || matchedMod.actions?.map(a => a.toLowerCase()).includes(actLower)) {
          return true;
        }
      }

      // String format: 'PROJECT:view' or 'PROJECT.*'
      if (permissions.some(p => typeof p === 'string' && (p === `${modUpper}:${actLower}` || p === `${modUpper}:*` || p === `${modUpper}.*`))) {
        return true;
      }
    }

    // Role-based capability defaults (M1.5 standard role defaults)
    if (r === 'ADMIN' || r === 'FIRM_ADMIN') return true; // Admins default to full tenant access unless overridden

    // MEMBER role defaults: view and update on projects, tasks, drawings
    if (r === 'MEMBER') {
      if (!actLower || actLower === 'view' || actLower === 'read') return true;
      if (['PROJECT', 'TASK', 'DRAWING'].includes(modUpper) && ['create', 'edit'].includes(actLower)) return true;
    }

    return false;
  }, [user?.role, permissions]);

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        subscription,
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
