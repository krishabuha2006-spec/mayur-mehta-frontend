import { apiClient, setAdminToken, clearAdminToken, getAdminToken } from './apiClient';

export const adminAuthService = {
  /**
   * 1. POST /admin/auth/login - Super Admin Login (Step 1)
   */
  login: async ({ email, password }) => {
    const res = await apiClient.post('/admin/auth/login', {
      email: email?.trim(),
      password
    });
    const payload = res?.data || res;

    if (payload?.accessToken) {
      setAdminToken(payload.accessToken); // In-Memory
    }
    return payload;
  },

  /**
   * 2. POST /admin/auth/verify-otp - Verify Admin OTP (Step 2)
   */
  verifyOtp: async ({ challengeId, otp }) => {
    const res = await apiClient.post('/admin/auth/verify-otp', {
      challengeId,
      otp: String(otp).trim()
    });
    const payload = res?.data || res;
    const token = payload?.accessToken;

    if (!token) {
      throw new Error(res?.message || 'OTP verification failed: No access token returned');
    }

    setAdminToken(token); // In-Memory
    return payload;
  },

  /**
   * 3. POST /admin/auth/resend-otp - Resend Admin OTP
   */
  resendOtp: async ({ challengeId }) => {
    const res = await apiClient.post('/admin/auth/resend-otp', { challengeId });
    return res?.data || res;
  },

  /**
   * 4. POST /admin/auth/refresh - Refresh Super Admin Access Token
   */
  refreshToken: async () => {
    try {
      const res = await apiClient.post('/admin/auth/refresh');
      const payload = res?.data || res;
      if (payload?.accessToken) {
        setAdminToken(payload.accessToken); // In-Memory
      }
      return payload || res;
    } catch (err) {
      clearAdminToken();
      throw err;
    }
  },

  /**
   * 5. POST /admin/auth/logout - Super Admin Logout
   */
  logout: async () => {
    try {
      await apiClient.post('/admin/auth/logout');
    } catch (err) {
      console.warn('Backend admin logout notice:', err?.message);
    } finally {
      clearAdminToken();
    }
  },

  /**
   * 6. POST /admin/auth/logout-all - Super Admin Logout All
   */
  logoutAll: async () => {
    try {
      await apiClient.post('/admin/auth/logout-all');
    } catch (err) {
      console.warn('Backend admin logout-all notice:', err?.message);
    } finally {
      clearAdminToken();
    }
  },

  /**
   * 7. GET /admin/auth/me - Get Super Admin Profile
   */
  getProfile: async () => {
    const res = await apiClient.get('/admin/auth/me');
    const payload = res?.data || res;
    return payload?.user || payload;
  },

  /**
   * 8. POST /admin/auth/forgot-password - Super Admin Forgot Password
   */
  forgotPassword: async (param) => {
    const email = typeof param === 'string' ? param : param?.email;
    const res = await apiClient.post('/admin/auth/forgot-password', {
      email: email?.trim()
    });
    return res?.data || res;
  },

  /**
   * 9. POST /admin/auth/reset-password - Super Admin Reset Password
   */
  resetPassword: async ({ token, password }) => {
    const res = await apiClient.post('/admin/auth/reset-password', {
      token,
      password
    });
    return res?.data || res;
  },

  /**
   * 10. POST /admin/auth/set-password - Super Admin Set Password
   */
  setPassword: async ({ token, password }) => {
    const res = await apiClient.post('/admin/auth/set-password', {
      token,
      password
    });
    return res?.data || res;
  },

  /**
   * 11. POST /admin/auth/change-password - Super Admin Change Password
   */
  changePassword: async ({ currentPassword, newPassword }) => {
    const res = await apiClient.post('/admin/auth/change-password', {
      currentPassword,
      newPassword
    });
    return res?.data || res;
  },

  /**
   * System Health Checks (Public)
   */
  getSystemHealth: async () => {
    const res = await apiClient.get('/health');
    return res?.data || res;
  },

  getDbHealth: async () => {
    const res = await apiClient.get('/health/db');
    return res?.data || res;
  }
};

export default adminAuthService;
