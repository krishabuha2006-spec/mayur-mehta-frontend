import { apiClient, setAccessToken, clearAccessToken, getAccessToken } from './apiClient';
import { APP_NAVIGATION } from '../constants/navigation';
import { ROLES } from '../constants/enums';

/**
 * Normalizes user data from backend M1.2 schema
 * to ensure all UI layout components have access to firstName, lastName, role, etc.
 */
export const normalizeUser = (user) => {
  if (!user) return null;

  const rawName = (user.name || '').trim();
  const nameParts = rawName ? rawName.split(' ') : ['User'];
  const firstName = user.firstName || nameParts[0] || 'User';
  const lastName = user.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

  const roleUpper = (user.role || '').toUpperCase();
  let canonicalRole = user.role;
  if (roleUpper === 'OWNER') canonicalRole = ROLES.OWNER;
  else if (roleUpper === 'ADMIN') canonicalRole = ROLES.ADMIN;
  else if (roleUpper === 'MEMBER') canonicalRole = ROLES.MEMBER;
  else if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPERADMIN') canonicalRole = ROLES.SUPER_ADMIN;

  return {
    ...user,
    firstName,
    lastName,
    displayName: rawName || `${firstName} ${lastName}`.trim(),
    role: canonicalRole,
    rawRole: user.role,
    avatarLetter: (firstName[0] || 'M').toUpperCase()
  };
};

export const authService = {
  // =========================================================================
  // TENANT AUTH APIS (Module M1.2: /api/v1/auth/*)
  // =========================================================================

  /**
   * 1. POST /auth/login - Tenant User Login
   * Authenticates tenant user via email & password. Issues 15-minute access token (stored In-Memory) + httpOnly 'rt' cookie.
   */
  login: async ({ email, password }) => {
    const res = await apiClient.post('/auth/login', {
      email: email?.trim(),
      password
    });

    // Backend envelope: { success: true, message: "...", data: { accessToken, user, company, mustChangePassword } }
    const payload = res?.data || res;
    const token = payload?.accessToken || res?.accessToken;

    if (!token) {
      throw new Error(res?.message || 'Login failed: No access token returned');
    }

    // In-Memory Token Storage (Security Matrix: Zero localStorage/sessionStorage)
    setAccessToken(token);

    const normalized = normalizeUser({
      ...payload.user,
      mustChangePassword: !!payload.mustChangePassword,
      company: payload.company
    });

    return {
      token,
      user: normalized,
      company: payload.company || null,
      mustChangePassword: !!payload.mustChangePassword
    };
  },

  /**
   * 2. POST /auth/refresh - Refresh Tenant Access Token
   * Rotates presented refresh token from httpOnly 'rt' cookie via withCredentials: true.
   */
  refreshToken: async () => {
    try {
      const res = await apiClient.post('/auth/refresh');
      const payload = res?.data || res;
      const newToken = payload?.accessToken;
      if (newToken) {
        setAccessToken(newToken); // In-Memory
      }
      return payload || res;
    } catch (err) {
      clearAccessToken();
      throw err;
    }
  },

  /**
   * 3. POST /auth/logout - Tenant Logout (Current Device)
   * Revokes refresh token cookie 'rt' and clears in-memory tokens.
   */
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.warn('Backend logout notice:', err?.message);
    } finally {
      clearAccessToken();
    }
  },

  /**
   * 4. POST /auth/logout-all - Tenant Logout from All Devices
   * Revokes all active refresh token families and increments tokenVersion.
   */
  logoutAll: async () => {
    try {
      await apiClient.post('/auth/logout-all');
    } catch (err) {
      console.warn('Backend logout-all notice:', err?.message);
    } finally {
      clearAccessToken();
    }
  },

  /**
   * 5. GET /auth/me - Get Current Tenant User Profile
   * Returns current user information, company details, and role verified directly from DB.
   */
  getCurrentUser: async () => {
    const res = await apiClient.get('/auth/me');
    const payload = res?.data || res;

    if (payload?.user) {
      const normalized = normalizeUser({
        ...payload.user,
        mustChangePassword: !!payload.mustChangePassword,
        company: payload.company
      });

      return {
        user: normalized,
        company: payload.company || null,
        navigation: payload.navigation && payload.navigation.length > 0 ? payload.navigation : APP_NAVIGATION,
        headerBadges: payload.headerBadges || { mailCount: 0, chatCount: 0, notificationCount: 0 },
        permissions: payload.permissions || [],
        mustChangePassword: !!payload.mustChangePassword
      };
    }

    return { user: null, company: null };
  },

  /**
   * 6. POST /auth/forgot-password - Request Password Reset Email
   * Sends password reset email if account exists (Anti-enumeration response 200).
   */
  forgotPassword: async (email) => {
    return await apiClient.post('/auth/forgot-password', {
      email: email?.trim()
    });
  },

  /**
   * 7. POST /auth/reset-password - Reset Password (via One-Time Link Token)
   * Validates single-use reset token and updates password.
   */
  resetPassword: async ({ token, password }) => {
    return await apiClient.post('/auth/reset-password', {
      token: token?.trim(),
      password
    });
  },

  /**
   * 8. POST /auth/set-password - Initial Set Password (Activate Invited Account)
   * Activates invited user account (INVITED -> ACTIVE) and sets their password.
   */
  setPassword: async ({ token, password }) => {
    return await apiClient.post('/auth/set-password', {
      token: token?.trim(),
      password
    });
  },

  /**
   * 9. POST /auth/change-password - Change Password (Logged In User)
   * Updates authenticated user password after verifying current password.
   */
  changePassword: async ({ currentPassword, newPassword }) => {
    return await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
  },

  // =========================================================================
  // SUPER ADMIN AUTH APIS (Module M1.2: /api/v1/admin/auth/*)
  // =========================================================================

  adminLogin: async ({ email, password }) => {
    const res = await apiClient.post('/admin/auth/login', {
      email: email?.trim(),
      password
    });
    return res?.data || res;
  },

  adminVerifyOtp: async ({ challengeId, otp }) => {
    const res = await apiClient.post('/admin/auth/verify-otp', {
      challengeId,
      otp: otp?.trim()
    });
    return res?.data || res;
  },

  adminResendOtp: async ({ challengeId }) => {
    return await apiClient.post('/admin/auth/resend-otp', { challengeId });
  },

  adminRefreshToken: async () => {
    return await apiClient.post('/admin/auth/refresh');
  },

  adminLogout: async () => {
    return await apiClient.post('/admin/auth/logout');
  },

  adminLogoutAll: async () => {
    return await apiClient.post('/admin/auth/logout-all');
  },

  adminGetMe: async () => {
    return await apiClient.get('/admin/auth/me');
  },

  adminForgotPassword: async (email) => {
    return await apiClient.post('/admin/auth/forgot-password', { email: email?.trim() });
  },

  adminResetPassword: async ({ token, password }) => {
    return await apiClient.post('/admin/auth/reset-password', { token: token?.trim(), password });
  },

  adminSetPassword: async ({ token, password }) => {
    return await apiClient.post('/admin/auth/set-password', { token: token?.trim(), password });
  },

  adminChangePassword: async ({ currentPassword, newPassword }) => {
    return await apiClient.post('/admin/auth/change-password', { currentPassword, newPassword });
  }
};

export default authService;
