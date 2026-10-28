import { apiClient } from './apiClient';

/**
 * Company Profile, Branding & Bootstrap Service (Module M1.5)
 * Direct integration with Mayur-Maheta Backend API (Swagger v1.5.0)
 */
export const companyService = {
  /**
   * 1. GET /company/bootstrap - Bootstrap Company Application State
   * Returns company metadata, seat meter, settings, user permissions, and master category overviews in 1 call.
   */
  getBootstrap: async () => {
    const res = await apiClient.get('/company/bootstrap');
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 2. GET /company/profile - Get Company Profile
   */
  getProfile: async () => {
    try {
      const res = await apiClient.get('/company/profile');
      const payload = res?.data || res;
      return payload?.data || payload;
    } catch (err) {
      console.warn('GET /company/profile notice:', err?.response?.status || err.message);
      return null;
    }
  },

  /**
   * 3. PATCH /company/profile - Update Company Profile Details
   * Body: { legalName, phone, gstNumber, timezone, address: { line1, line2, city, state, pincode, country } }
   */
  updateProfile: async (data) => {
    const res = await apiClient.patch('/company/profile', data);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 4. PUT /company/support-access - Toggle Support Impersonation Access
   * Body: { enabled: boolean }
   */
  toggleSupportAccess: async (enabled) => {
    const res = await apiClient.put('/company/support-access', { enabled: Boolean(enabled) });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 5. PUT /company/logo - Upload Company Logo (Image file)
   */
  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await apiClient.put('/company/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 6. GET /company/logo - Stream / Fetch Company Logo
   */
  getLogoBlob: async () => {
    const res = await apiClient.get('/company/logo', {
      responseType: 'blob'
    });
    return res?.data || res;
  },

  /**
   * 7. DELETE /company/logo - Delete Company Logo
   */
  deleteLogo: async () => {
    const res = await apiClient.delete('/company/logo');
    const payload = res?.data || res;
    return payload?.data || payload;
  }
};

export default companyService;
