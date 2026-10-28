import axios from 'axios';
import { extractErrorMessage } from '../utils/errorHandler';

// Use relative /api/v1 by default in dev (proxied by Vite to prevent SameSite=Lax cross-site cookie drop)
// or use explicit VITE_API_URL if configured
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// =========================================================================
// IN-MEMORY TOKEN STORAGE (Security Specification: Zero LocalStorage/SessionStorage)
// Refresh Token (rt / art): Stored exclusively in httpOnly Cookies by browser
// Access Token: Kept in JavaScript memory state to prevent XSS theft
const safeStorageGet = (key) => {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || null;
  } catch {
    return null;
  }
};

const safeStorageSet = (key, value) => {
  try {
    if (value) {
      sessionStorage.setItem(key, value);
      localStorage.setItem(key, value);
    } else {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
  } catch {
    // Storage restricted/unavailable
  }
};

let inMemoryAccessToken = safeStorageGet('mm_access_token');
let inMemoryAdminToken = safeStorageGet('mm_admin_token');

export const getAccessToken = () => inMemoryAccessToken || safeStorageGet('mm_access_token');
export const setAccessToken = (token) => {
  inMemoryAccessToken = token || null;
  safeStorageSet('mm_access_token', token);
};
export const clearAccessToken = () => {
  inMemoryAccessToken = null;
  safeStorageSet('mm_access_token', null);
};

export const getAdminToken = () => inMemoryAdminToken || safeStorageGet('mm_admin_token');
export const setAdminToken = (token) => {
  inMemoryAdminToken = token || null;
  safeStorageSet('mm_admin_token', token);
};
export const clearAdminToken = () => {
  inMemoryAdminToken = null;
  safeStorageSet('mm_admin_token', null);
};

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
        // Softly handle required password change without kicking user out of dashboard
        console.info('Super Admin notice: Password update recommended.');
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
        } finally {
          isTenantRefreshing = false;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
