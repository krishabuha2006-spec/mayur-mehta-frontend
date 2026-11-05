import axios from 'axios';
import { extractErrorMessage } from '../utils/errorHandler';

// Use relative /api/v1 by default in dev (proxied by Vite to prevent SameSite=Lax cross-site cookie drop)
// or use explicit VITE_API_URL if configured
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// =========================================================================
// RESILIENT TOKEN STORAGE (In-Memory + SessionStorage Persistence on Refresh)
// Refresh Token (rt / art): Managed via httpOnly Cookies
// Access Token: Stored In-Memory with SessionStorage persistence across F5 reloads
// =========================================================================

let inMemoryAccessToken = null;
let inMemoryAdminToken = null;

export const getAccessToken = () => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  try {
    const saved = sessionStorage.getItem('mm_access_token') || localStorage.getItem('mm_access_token');
    if (saved) {
      inMemoryAccessToken = saved;
      return saved;
    }
  } catch {
    // Restricted browser storage environment
  }
  return null;
};

export const setAccessToken = (token) => {
  inMemoryAccessToken = token || null;
  try {
    if (token) {
      sessionStorage.setItem('mm_access_token', token);
      localStorage.setItem('mm_access_token', token);
    } else {
      sessionStorage.removeItem('mm_access_token');
      localStorage.removeItem('mm_access_token');
    }
  } catch {
    // Restricted browser storage environment
  }
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
  try {
    sessionStorage.removeItem('mm_access_token');
    localStorage.removeItem('mm_access_token');
  } catch {
    // Restricted browser storage environment
  }
};

export const getAdminToken = () => {
  if (inMemoryAdminToken) return inMemoryAdminToken;
  try {
    const saved = sessionStorage.getItem('mm_admin_token') || localStorage.getItem('mm_admin_token');
    if (saved) {
      inMemoryAdminToken = saved;
      return saved;
    }
  } catch {
    // Restricted browser storage environment
  }
  return null;
};

export const setAdminToken = (token) => {
  inMemoryAdminToken = token || null;
  try {
    if (token) {
      sessionStorage.setItem('mm_admin_token', token);
      localStorage.setItem('mm_admin_token', token);
    } else {
      sessionStorage.removeItem('mm_admin_token');
      localStorage.removeItem('mm_admin_token');
    }
  } catch {
    // Restricted browser storage environment
  }
};

export const clearAdminToken = () => {
  inMemoryAdminToken = null;
  try {
    sessionStorage.removeItem('mm_admin_token');
    localStorage.removeItem('mm_admin_token');
  } catch {
    // Restricted browser storage environment
  }
};

// ==========================================
// External Client Realm Tokens (Module M2.6)
// ==========================================
let inMemoryClientToken = null;

export const getClientToken = () => {
  if (inMemoryClientToken) return inMemoryClientToken;
  try {
    const saved = sessionStorage.getItem('mm_client_token') || localStorage.getItem('mm_client_token');
    if (saved) {
      inMemoryClientToken = saved;
      return saved;
    }
  } catch {
    // Restricted browser storage environment
  }
  return null;
};

export const setClientToken = (token) => {
  inMemoryClientToken = token || null;
  try {
    if (token) {
      sessionStorage.setItem('mm_client_token', token);
      localStorage.setItem('mm_client_token', token);
    } else {
      sessionStorage.removeItem('mm_client_token');
      localStorage.removeItem('mm_client_token');
    }
  } catch {
    // Restricted browser storage environment
  }
};

export const clearClientToken = () => {
  inMemoryClientToken = null;
  try {
    sessionStorage.removeItem('mm_client_token');
    localStorage.removeItem('mm_client_token');
  } catch {
    // Restricted browser storage environment
  }
};

export const isClientPath = (url = '') => {
  return url.includes('/client/') || url.startsWith('/client');
};

// Image 2 Rule 1: Set withCredentials: true so browser automatically sends httpOnly rt / art cookies
axios.defaults.withCredentials = true;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  },
  withCredentials: true, // Sends httpOnly cookies (rt / art) automatically on refresh and logout
  timeout: 15000
});

// Helper: Determine if URL is scoped to Super Admin (audience: platform)
export const isAdminPath = (url = '') => {
  return url.includes('/admin/') || url.startsWith('/admin') || url.includes('/admin/auth');
};

/**
 * Decode JWT payload safely without external dependencies
 */
export const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr);
  } catch {
    // Fallback standard atob in case of custom UTF-8 sequences
    try {
      const parts = token.split('.');
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }
};

/**
 * Check if token is expired or within proactive refresh buffer (default 25s)
 */
export const isTokenExpired = (token, bufferSeconds = 25) => {
  if (!token || typeof token !== 'string') return true;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return (Date.now() / 1000) >= (payload.exp - bufferSeconds);
};

// Singleton active refresh promises for proactive & reactive deduplication
let activeTenantRefreshPromise = null;
let activeAdminRefreshPromise = null;

export const refreshTenantToken = async () => {
  if (activeTenantRefreshPromise) return activeTenantRefreshPromise;

  activeTenantRefreshPromise = (async () => {
    try {
      const refreshRes = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const payload = refreshRes.data?.data || refreshRes.data;
      const newToken = payload?.accessToken;
      if (newToken) {
        setAccessToken(newToken);
        return newToken;
      }
      throw new Error('No access token returned from refresh');
    } catch (err) {
      clearAccessToken();
      window.dispatchEvent(new CustomEvent('auth:logout'));
      if (!window.location.pathname.includes('/auth') && !window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=1';
      }
      throw err;
    } finally {
      activeTenantRefreshPromise = null;
    }
  })();

  return activeTenantRefreshPromise;
};

export const refreshAdminToken = async () => {
  if (activeAdminRefreshPromise) return activeAdminRefreshPromise;

  activeAdminRefreshPromise = (async () => {
    try {
      const refreshRes = await axios.post(
        `${API_BASE_URL}/admin/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const payload = refreshRes.data?.data || refreshRes.data;
      const newToken = payload?.accessToken;
      if (newToken) {
        setAdminToken(newToken);
        return newToken;
      }
      throw new Error('No admin token returned from refresh');
    } catch (err) {
      clearAdminToken();
      window.dispatchEvent(new CustomEvent('admin:logout'));
      if (!window.location.pathname.includes('/admin/auth') && !window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login?expired=1';
      }
      throw err;
    } finally {
      activeAdminRefreshPromise = null;
    }
  })();

  return activeAdminRefreshPromise;
};

// Request Interceptor: Attach in-memory / persistent JWT Bearer Token based on audience isolation
apiClient.interceptors.request.use(
  async (config) => {
    // Inject client tracing requestId conformant with M1.1 Section 4.1 & 5.2
    if (!config.headers['X-Request-Id']) {
      const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      config.headers['X-Request-Id'] = generatedId;
    }

    // Enforce fresh 200 OK responses: Prevent 304 Not Modified caching
    if (config.headers.set) {
      config.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      config.headers.set('Pragma', 'no-cache');
      config.headers.set('Expires', '0');
    } else {
      config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      config.headers['Pragma'] = 'no-cache';
      config.headers['Expires'] = '0';
    }

    // Automatic multipart FormData header handling:
    // Remove explicit 'Content-Type' so Axios and the browser automatically compute 'multipart/form-data; boundary=...'
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers?.delete) {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete config.headers['Content-Type'];
      }
    }

    const url = config.url || '';
    const isUnauthenticatedAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/admin/auth/login') ||
      url.includes('/admin/auth/refresh');

    const isAuthRoute =
      url.includes('/auth/') ||
      url.includes('/admin/auth/') ||
      url.startsWith('/auth') ||
      url.startsWith('/admin/auth') ||
      url.includes('/health');

    const isAdmin = isAdminPath(url);
    const isClient = isClientPath(url);
    const isClientAuthRoute = url.includes('/client/auth/');

    if (isAdmin) {
      // Super Admin World (audience: 'platform')
      let token = getAdminToken();
      if (!isAuthRoute && (!token || isTokenExpired(token))) {
        try {
          token = await refreshAdminToken();
        } catch {
          // Admin session ended - cancel request before network call to prevent 401 error cascades
          return Promise.reject(new axios.Cancel('Super Admin session expired. Redirecting to login...'));
        }
      }

      if (token && !isUnauthenticatedAuthRoute) {
        if (config.headers.set) {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } else if (isClient) {
      // External Client World (audience: 'client' - Module M2.6)
      const clientToken = getClientToken();
      if (clientToken && !isClientAuthRoute) {
        if (config.headers.set) {
          config.headers.set('Authorization', `Bearer ${clientToken}`);
        } else {
          config.headers.Authorization = `Bearer ${clientToken}`;
        }
      }
    } else {
      // Tenant User World (audience: 'tenant')
      let token = getAccessToken();

      // Proactive silent refresh: if token is missing or expired, attempt refresh before network call
      if (!isAuthRoute && (!token || isTokenExpired(token))) {
        try {
          token = await refreshTenantToken();
        } catch {
          // Tenant session ended - cancel request before network call to prevent 401 error cascades
          return Promise.reject(new axios.Cancel('Session expired or unauthorized. Redirecting to login...'));
        }
      }

      const activeToken = token || getAccessToken() || getAdminToken();
      if (activeToken && !isUnauthenticatedAuthRoute) {
        if (config.headers.set) {
          config.headers.set('Authorization', `Bearer ${activeToken}`);
        } else {
          config.headers.Authorization = `Bearer ${activeToken}`;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);



apiClient.interceptors.response.use(
  (response) => {
    // Standard M1.1 envelope unwrapping
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Attach parsed human-readable message for easy consumption across components
    error.userMessage = extractErrorMessage(error);

    if (!originalRequest.silent) {
      if (error.response?.status === 422) {
        const respData = error.response?.data;
        console.error(
          `[422 Validation Error on ${originalRequest.method?.toUpperCase()} ${originalRequest.url}]:\n`,
          JSON.stringify(respData, null, 2)
        );
      } else if (error.response?.status >= 400) {
        const respData = error.response?.data;
        console.error(
          `[${error.response.status} Error on ${originalRequest.method?.toUpperCase()} ${originalRequest.url}]:\n` +
          (typeof respData === 'object' ? JSON.stringify(respData, null, 2) : (respData || error.message))
        );
      }
    }

    const url = originalRequest.url || '';
    const isAdmin = isAdminPath(url);

    // Skip auto-refresh on authentication initiation/refresh endpoints to avoid infinite loops
    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/admin/auth/login') ||
      url.includes('/admin/auth/refresh');

    // Handle 403 Forbidden on admin paths (wrong role / must change password)
    if (isAdmin && error.response?.status === 403 && !isAuthRoute) {
      const errCode = error.response?.data?.error?.code || error.response?.data?.code;
      if (errCode === 'PASSWORD_CHANGE_REQUIRED') {
        window.dispatchEvent(new CustomEvent('admin:password_change_required'));
      } else if (errCode === 'ADMIN_DISABLED' || errCode === 'FORBIDDEN_PLATFORM' || errCode === 'INSUFFICIENT_ROLE') {
        clearAdminToken();
        window.dispatchEvent(new CustomEvent('admin:logout'));
      }
    }

    // Handle 402 Payment Required (M1.6 Billing Gate - SUBSCRIPTION_EXPIRED)
    if (error.response?.status === 402) {
      window.dispatchEvent(
        new CustomEvent('billing:restricted', {
          detail: error.response?.data?.error?.details || error.response?.data
        })
      );
    }

    // Handle M1.1 Foundation & M1.4 Seat Limits & Suspensions
    const responseErrCode = error.response?.data?.error?.code || error.response?.data?.code;
    if (responseErrCode === 'SEAT_LIMIT_REACHED') {
      window.dispatchEvent(
        new CustomEvent('app:upgrade-required', {
          detail: error.response?.data?.error?.message || 'Seat limit reached (10/10). Please upgrade your plan to add more members.'
        })
      );
    } else if (responseErrCode === 'COMPANY_SUSPENDED') {
      window.dispatchEvent(
        new CustomEvent('company:suspended', {
          detail: error.response?.data?.error?.message || 'Workspace has been suspended by platform administration.'
        })
      );
    }

    // Handle 401 Unauthorized token rotation
    // Silently reject refresh endpoint failures — these are expected on cold boot when no session exists
    if (error.response?.status === 401 && isAuthRoute) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      try {
        if (isAdmin) {
          const newAccessToken = await refreshAdminToken();
          if (newAccessToken) {
            if (originalRequest.headers?.set) {
              originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
            } else {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return apiClient(originalRequest);
          }
        } else {
          const newAccessToken = await refreshTenantToken();
          if (newAccessToken) {
            if (originalRequest.headers?.set) {
              originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
            } else {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return apiClient(originalRequest);
          }
        }
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
