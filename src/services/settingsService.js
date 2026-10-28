import { apiClient } from './apiClient';

/**
 * Company Settings Service (Module M1.5)
 * Direct integration with Mayur-Maheta Backend API (Swagger v1.5.0)
 */
export const settingsService = {
  /**
   * 1. GET /settings - Get Registered Settings with Descriptors and Values
   */
  getSettings: async () => {
    const res = await apiClient.get('/settings');
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 2. PUT /settings - Update Company Settings
   * Body: { values: { "general.dateFormat": "YYYY-MM-DD", "general.timeFormat": "24h", ... } }
   */
  updateSettings: async (values = {}) => {
    const res = await apiClient.put('/settings', { values });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 3. GET /settings/values - Get Flat Settings Values
   */
  getFlatValues: async () => {
    const res = await apiClient.get('/settings/values');
    const payload = res?.data || res;
    return payload?.data || payload;
  }
};

export default settingsService;
