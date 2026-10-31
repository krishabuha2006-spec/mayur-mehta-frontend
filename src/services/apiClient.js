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

// Request Interceptor: Attach in-memory / persistent JWT Bearer Token based on audience isolation
apiClient.interceptors.request.use(
  (config) => {
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

    // Rely on HTTP headers and Vite proxy header stripping to prevent caching
    // Do NOT inject _t query parameter into config.params because strict backend validation schemas reject unknown query parameters with 422 Unprocessable Entity

    const isAdmin = isAdminPath(config.url);

    if (isAdmin) {
      // Super Admin World (audience: 'platform') - Admin Token
      const token = getAdminToken();
      if (token) {
        if (config.headers.set) {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } else {
      // Tenant User World (audience: 'tenant') - Tenant Access Token with Admin fallback
      const token = getAccessToken() || getAdminToken();
      if (token) {
        if (config.headers.set) {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptors: Auto-refresh with isolated admin & tenant queues
let isTenantRefreshing = false;
let tenantQueue = [];

let isAdminRefreshing = false;
let adminQueue = [];

const processTenantQueue = (error, token = null) => {
  tenantQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  tenantQueue = [];
};

const processAdminQueue = (error, token = null) => {
  adminQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  adminQueue = [];
};

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

    if (error.response?.status === 422) {
      const respData = error.response?.data;
      console.error(
        `[422 Validation Error on ${originalRequest.method?.toUpperCase()} ${originalRequest.url}]:\n`,
        JSON.stringify(respData, null, 2)
      );
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

    // Handle 401 Unauthorized token rotation
    // Silently reject refresh endpoint failures — these are expected on cold boot when no session exists
    if (error.response?.status === 401 && isAuthRoute) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      if (isAdmin) {
        // ==========================================
        // SUPER ADMIN ROTATION (/api/v1/admin/auth/refresh with 'art' cookie)
        // ==========================================
        if (isAdminRefreshing) {
          return new Promise((resolve, reject) => {
            adminQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        isAdminRefreshing = true;

        try {
          const refreshRes = await axios.post(
            `${API_BASE_URL}/admin/auth/refresh`,
            {},
            { withCredentials: true }
          );

          const payload = refreshRes.data?.data || refreshRes.data;
          const newAccessToken = payload?.accessToken;

          if (newAccessToken) {
            setAdminToken(newAccessToken); // In-Memory
            processAdminQueue(null, newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshErr) {
          processAdminQueue(refreshErr, null);
          clearAdminToken();
          window.dispatchEvent(new CustomEvent('admin:logout'));
          if (!window.location.pathname.includes('/admin/auth') && !window.location.pathname.includes('/admin/login')) {
            window.location.href = '/admin/login?expired=1';
          }
        } finally {
          isAdminRefreshing = false;
        }
      } else {
        // ==========================================
        // TENANT USER ROTATION (/api/v1/auth/refresh with 'rt' cookie)
        // ==========================================
        if (isTenantRefreshing) {
          return new Promise((resolve, reject) => {
            tenantQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        isTenantRefreshing = true;

        try {
          const refreshRes = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          );

          const payload = refreshRes.data?.data || refreshRes.data;
          const newAccessToken = payload?.accessToken;

          if (newAccessToken) {
            setAccessToken(newAccessToken); // In-Memory
            processTenantQueue(null, newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshErr) {
          processTenantQueue(refreshErr, null);
          clearAccessToken();
          window.dispatchEvent(new CustomEvent('auth:logout'));
          if (!window.location.pathname.includes('/auth') && !window.location.pathname.includes('/login')) {
            window.location.href = '/login?expired=1';
          }
        } finally {
          isTenantRefreshing = false;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
