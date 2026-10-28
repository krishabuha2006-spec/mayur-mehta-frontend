import { apiClient } from './apiClient';

/**
 * Module M1.4: Team & User Management Service
 * Direct integration with Mayur-Maheta Backend API (Swagger v1.4.0)
 * All operations map 1-to-1 with live MongoDB database collections and endpoints.
 */
export const teamService = {
  /**
   * 1. GET /team/seats - Get Seat Meter & Role Capabilities
   */
  getSeats: async () => {
    const res = await apiClient.get('/team/seats');
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 2. GET /team/directory - Lightweight Active User Directory
   */
  getDirectory: async (params = {}) => {
    const res = await apiClient.get('/team/directory', { params });
    const payload = res?.data || res;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.users)) return payload.data.users;
    if (Array.isArray(payload?.users)) return payload.users;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  },

  /**
   * 3. GET /team/users - List Team Users (with filtering, pagination)
   */
  getUsers: async (params = {}) => {
    const res = await apiClient.get('/team/users', { params });
    const payload = res?.data || res;
    const users = Array.isArray(payload) ? payload : (payload?.users || payload?.data || []);
    return {
      users,
      pagination: payload?.pagination || { total: users.length, page: 1, limit: 50 },
      seats: payload?.seats || null
    };
  },

  /**
   * 4. POST /team/users - Invite or Reactivate User
   * Body: { name, email, role: 'ADMIN' | 'MEMBER', mobile, designation }
   */
  inviteUser: async (formData) => {
    const payload = {
      name: formData.name?.trim(),
      email: formData.email?.trim(),
      role: formData.role || 'MEMBER',
      mobile: formData.mobile?.trim() || undefined,
      designation: formData.designation?.trim() || undefined
    };
    const res = await apiClient.post('/team/users', payload);
    const data = res?.data || res;
    return data?.data || data;
  },

  /**
   * 5. GET /team/users/{id} - Get Team User Detail
   */
  getUserDetail: async (id) => {
    const res = await apiClient.get(`/team/users/${id}`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 6. PATCH /team/users/{id} - Update User Profile Details
   * Body: { name, mobile, designation }
   */
  updateProfile: async (id, profileData) => {
    const payload = {
      name: profileData.name?.trim(),
      mobile: profileData.mobile?.trim() || undefined,
      designation: profileData.designation?.trim() || undefined
    };
    const res = await apiClient.patch(`/team/users/${id}`, payload);
    const data = res?.data || res;
    return data?.data || data;
  },

  /**
   * 7. PUT /team/users/{id}/role - Change User Role
   * Body: { role: 'ADMIN' | 'MEMBER' }
   */
  changeRole: async (id, role) => {
    const res = await apiClient.put(`/team/users/${id}/role`, { role });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 8. PUT /team/users/{id}/email - Change User Email
   * Body: { email }
   */
  changeEmail: async (id, email) => {
    const res = await apiClient.put(`/team/users/${id}/email`, { email: email?.trim() });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 9. PUT /team/users/{id}/remove - Remove User (Frees Seat)
   * Body: { reason }
   */
  removeUser: async (id, reason = 'Administrative removal') => {
    const res = await apiClient.put(`/team/users/${id}/remove`, { reason });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 10. PUT /team/users/{id}/unlock - Unlock User Account
   */
  unlockUser: async (id) => {
    const res = await apiClient.put(`/team/users/${id}/unlock`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 11. POST /team/users/{id}/resend-invite - Resend Invitation Email
   */
  resendInvite: async (id) => {
    const res = await apiClient.post(`/team/users/${id}/resend-invite`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 12. POST /team/ownership/transfer - Transfer Company Ownership
   * Body: { newOwnerUserId, password }
   */
  transferOwnership: async ({ newOwnerUserId, password }) => {
    const res = await apiClient.post('/team/ownership/transfer', {
      newOwnerUserId,
      password
    });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 13. PATCH /team/me - Update Self Profile Details
   * Body: { name, mobile, designation }
   */
  updateSelf: async (profileData) => {
    const res = await apiClient.patch('/team/me', profileData);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 14. GET /team/activity - Get Tenant Activity History
   */
  getActivity: async (params = {}) => {
    const res = await apiClient.get('/team/activity', { params });
    const payload = res?.data || res;
    return Array.isArray(payload) ? payload : (payload?.data || payload?.activities || []);
  }
};

export default teamService;
