import { apiClient } from './apiClient';

/**
 * Permissions Engine Service (Module M1.5)
 * Direct integration with Mayur-Maheta Backend API (Swagger v1.5.0)
 */
export const permissionService = {
  /**
   * 1. GET /permissions/modules - List Registered Permission Modules
   */
  getModules: async () => {
    const res = await apiClient.get('/permissions/modules');
    const payload = res?.data || res;
    return Array.isArray(payload) ? payload : (payload?.data || payload?.modules || []);
  },

  /**
   * 2. GET /permissions/me - Get Caller Effective Permissions
   */
  getMyPermissions: async () => {
    const res = await apiClient.get('/permissions/me');
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 3. GET /permissions/users/{id} - Get User Permissions & Overrides
   */
  getUserPermissions: async (userId) => {
    const res = await apiClient.get(`/permissions/users/${userId}`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 4. PUT /permissions/users/{id} - Set User Permission Overrides
   * Body: { overrides: [{ moduleKey: string, actions: string[], dataScope: 'OWN' | 'ALL' }] }
   */
  setUserPermissions: async (userId, overrides = []) => {
    const res = await apiClient.put(`/permissions/users/${userId}`, { overrides });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 5. POST /permissions/users/{id}/reset - Reset User Permissions to Role Defaults
   */
  resetUserPermissions: async (userId) => {
    const res = await apiClient.post(`/permissions/users/${userId}/reset`);
    const payload = res?.data || res;
    return payload?.data || payload;
  }
};

export default permissionService;
