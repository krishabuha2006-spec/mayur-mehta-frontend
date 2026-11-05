import { apiClient, setClientToken, clearClientToken, getClientToken } from './apiClient';

/**
 * Module M2.6: External Client Portal Service
 * Conforms 100% to Module M2.6 Specification:
 * - 4.1 Client Authentication (/api/v1/client/auth)
 * - 4.2 Client Profile (/api/v1/client/me)
 * - 4.3 Connect Codes (/api/v1/client/connect-codes)
 * - 4.4 Firm Connections & Curated Portal Reads (/api/v1/client/links)
 */

function unwrapPayload(res) {
  if (!res) return null;
  const payload = res.data !== undefined ? res.data : res;
  return payload?.data !== undefined ? payload.data : payload;
}

export const clientPortalService = {
  // =========================================================================
  // 1. Client Authentication (/api/v1/client/auth)
  // =========================================================================

  /**
   * POST /client/auth/register - Self-service registration with anti-enumeration
   */
  register: async ({ email, password, fullName, phone }) => {
    const res = await apiClient.post('/client/auth/register', {
      email: String(email).trim().toLowerCase(),
      password,
      fullName: String(fullName).trim(),
      phone: phone ? String(phone).trim() : undefined
    });
    return unwrapPayload(res);
  },

  /**
   * POST /client/auth/verify-email - Verify 6-digit email OTP
   */
  verifyEmail: async ({ email, otp }) => {
    const res = await apiClient.post('/client/auth/verify-email', {
      email: String(email).trim().toLowerCase(),
      otp: String(otp).trim()
    });
    const payload = unwrapPayload(res);
    if (payload?.accessToken) {
      setClientToken(payload.accessToken);
    }
    return payload;
  },

  /**
   * POST /client/auth/resend-otp - Resend verification email OTP
   */
  resendOtp: async (email) => {
    const res = await apiClient.post('/client/auth/resend-otp', {
      email: String(email).trim().toLowerCase()
    });
    return unwrapPayload(res);
  },

  /**
   * POST /client/auth/login - Password login with lockout protection
   */
  login: async ({ email, password }) => {
    const res = await apiClient.post('/client/auth/login', {
      email: String(email).trim().toLowerCase(),
      password
    });
    const payload = unwrapPayload(res);
    if (payload?.accessToken) {
      setClientToken(payload.accessToken);
    }
    return payload;
  },

  /**
   * POST /client/auth/refresh - Rotate refresh token via HTTP-only cookie
   */
  refresh: async () => {
    try {
      const res = await apiClient.post('/client/auth/refresh');
      const payload = unwrapPayload(res);
      if (payload?.accessToken) {
        setClientToken(payload.accessToken);
      }
      return payload;
    } catch (err) {
      clearClientToken();
      throw err;
    }
  },

  /**
   * POST /client/auth/logout - Invalidate current session and clear cookie
   */
  logout: async () => {
    try {
      await apiClient.post('/client/auth/logout').catch(() => null);
    } finally {
      clearClientToken();
    }
  },

  /**
   * POST /client/auth/forgot-password - Request password reset email
   */
  forgotPassword: async (email) => {
    const res = await apiClient.post('/client/auth/forgot-password', {
      email: String(email).trim().toLowerCase()
    });
    return unwrapPayload(res);
  },

  /**
   * POST /client/auth/reset-password - Complete password reset via token
   */
  resetPassword: async ({ token, newPassword }) => {
    const res = await apiClient.post('/client/auth/reset-password', {
      token,
      newPassword
    });
    return unwrapPayload(res);
  },

  isLoggedIn: () => {
    return Boolean(getClientToken());
  },

  // =========================================================================
  // 2. Client Profile (/api/v1/client/me)
  // =========================================================================

  /**
   * GET /client/me - Get client account profile
   */
  getProfile: async () => {
    const res = await apiClient.get('/client/me');
    return unwrapPayload(res);
  },

  /**
   * PATCH /client/me - Update name or phone
   */
  updateProfile: async (data) => {
    const res = await apiClient.patch('/client/me', data);
    return unwrapPayload(res);
  },

  /**
   * POST /client/me/change-password - Change password and revoke other sessions
   */
  changePassword: async ({ currentPassword, newPassword }) => {
    const res = await apiClient.post('/client/me/change-password', {
      currentPassword,
      newPassword
    });
    return unwrapPayload(res);
  },

  /**
   * DELETE /client/me - Soft delete account and revoke active links
   */
  deleteAccount: async () => {
    const res = await apiClient.delete('/client/me');
    clearClientToken();
    return unwrapPayload(res);
  },

  // =========================================================================
  // 3. Connect Codes (/api/v1/client/connect-codes)
  // =========================================================================

  /**
   * POST /client/connect-codes - Generate a new 10-character human-friendly connect code (e.g. ABCD-EFGH-99)
   */
  generateConnectCode: async () => {
    const res = await apiClient.post('/client/connect-codes');
    return unwrapPayload(res);
  },

  /**
   * GET /client/connect-codes/active - Get active code metadata (expiry, partial code)
   */
  getActiveConnectCode: async () => {
    try {
      const res = await apiClient.get('/client/connect-codes/active');
      return unwrapPayload(res);
    } catch {
      return null;
    }
  },

  /**
   * DELETE /client/connect-codes/active - Revoke active connect code
   */
  revokeActiveConnectCode: async () => {
    const res = await apiClient.delete('/client/connect-codes/active');
    return unwrapPayload(res);
  },

  // =========================================================================
  // 4. Firm Connections & Curated Portal Reads (/api/v1/client/links)
  // =========================================================================

  /**
   * GET /client/links - List all connected firms for the client account
   */
  getLinks: async () => {
    try {
      const res = await apiClient.get('/client/links');
      const payload = unwrapPayload(res);
      return Array.isArray(payload) ? payload : (payload?.links || []);
    } catch {
      return [];
    }
  },

  /**
   * DELETE /client/links/{linkId} - Disconnect firm link from client side
   */
  disconnectLink: async (linkId) => {
    const res = await apiClient.delete(`/client/links/${linkId}`);
    return unwrapPayload(res);
  },

  /**
   * GET /client/links/{linkId}/projects - List projects for firm matching linked clientRef
   */
  getLinkProjects: async (linkId) => {
    try {
      const res = await apiClient.get(`/client/links/${linkId}/projects`);
      const payload = unwrapPayload(res);
      return Array.isArray(payload) ? payload : (payload?.projects || []);
    } catch {
      return [];
    }
  },

  /**
   * GET /client/links/{linkId}/projects/{projectId} - Curated project detail (manager, site, stages)
   */
  getProjectDetail: async (linkId, projectId) => {
    const res = await apiClient.get(`/client/links/${linkId}/projects/${projectId}`);
    return unwrapPayload(res);
  },

  /**
   * GET /client/links/{linkId}/projects/{projectId}/files - List files explicitly shared with client
   */
  getProjectFiles: async (linkId, projectId) => {
    try {
      const res = await apiClient.get(`/client/links/${linkId}/projects/${projectId}/files`);
      const payload = unwrapPayload(res);
      return Array.isArray(payload) ? payload : (payload?.files || []);
    } catch {
      return [];
    }
  },

  /**
   * GET /client/links/{linkId}/projects/{projectId}/files/{fileId}/download - Stream shared file download
   */
  downloadProjectFile: async (linkId, projectId, fileId, fileName = 'shared-document') => {
    const response = await apiClient.get(
      `/client/links/${linkId}/projects/${projectId}/files/${fileId}/download`,
      { responseType: 'blob' }
    );
    const blob = response instanceof Blob ? response : new Blob([response.data || response]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    return true;
  },

  /**
   * GET /client/links/{linkId}/portfolio - List firm's shareable portfolio showcase items
   */
  getLinkPortfolio: async (linkId) => {
    try {
      const res = await apiClient.get(`/client/links/${linkId}/portfolio`);
      const payload = unwrapPayload(res);
      return Array.isArray(payload) ? payload : (payload?.items || payload?.portfolio || []);
    } catch {
      return [];
    }
  },

  /**
   * GET /client/projects - Cross-firm aggregated projects list
   */
  getAllProjects: async () => {
    try {
      const res = await apiClient.get('/client/projects');
      const payload = unwrapPayload(res);
      return Array.isArray(payload) ? payload : (payload?.projects || []);
    } catch {
      return [];
    }
  },

  /**
   * Legacy / direct portal access by code fallback
   */
  getPortalByCode: async (code) => {
    const res = await apiClient.get(`/portal/${code}`, { silent: true });
    return unwrapPayload(res);
  }
};

export default clientPortalService;

