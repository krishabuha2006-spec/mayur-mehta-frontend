import { apiClient } from './apiClient';

/**
 * Master Categories & Architectural Lookup Data Service (Module M1.5)
 * Direct integration with Mayur-Maheta Backend API (Swagger v1.5.0)
 */
export const masterService = {
  /**
   * 1. GET /master/types - List All Master Types and Item Counts
   */
  getMasterTypes: async () => {
    const res = await apiClient.get('/master/types');
    const payload = res?.data || res;
    return Array.isArray(payload) ? payload : (payload?.data || payload?.types || []);
  },

  /**
   * 2. GET /master/{type} - List Master Items of a Type
   */
  getItemsByType: async (type, params = {}) => {
    const res = await apiClient.get(`/master/${type}`, { params });
    const payload = res?.data || res;
    return Array.isArray(payload) ? payload : (payload?.data || payload?.items || []);
  },

  /**
   * 3. POST /master/{type} - Create Master Item
   * Body: { name, code, color }
   */
  createItem: async (type, { name, code, color }) => {
    const res = await apiClient.post(`/master/${type}`, {
      name: name?.trim(),
      code: code?.trim() || undefined,
      color: color || undefined
    });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 4. PATCH /master/{type}/{id} - Update Master Item
   * Body: { name, code, color }
   */
  updateItem: async (type, id, { name, code, color }) => {
    const res = await apiClient.patch(`/master/${type}/${id}`, {
      name: name?.trim() || undefined,
      code: code?.trim() || undefined,
      color: color || undefined
    });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 5. DELETE /master/{type}/{id} - Delete Master Item
   */
  deleteItem: async (type, id) => {
    const res = await apiClient.delete(`/master/${type}/${id}`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 6. PUT /master/{type}/reorder - Reorder Master Items
   * Body: { orderedIds: string[] }
   */
  reorderItems: async (type, orderedIds = []) => {
    const res = await apiClient.put(`/master/${type}/reorder`, { orderedIds });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 7. PUT /master/{type}/{id}/activate - Activate Master Item
   */
  activateItem: async (type, id) => {
    const res = await apiClient.put(`/master/${type}/${id}/activate`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 8. PUT /master/{type}/{id}/deactivate - Deactivate Master Item
   */
  deactivateItem: async (type, id) => {
    const res = await apiClient.put(`/master/${type}/${id}/deactivate`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * 9. POST /master/{type}/restore-defaults - Restore Missing Default Master Items
   */
  restoreDefaults: async (type) => {
    const res = await apiClient.post(`/master/${type}/restore-defaults`);
    const payload = res?.data || res;
    return payload?.data || payload;
  }
};

export default masterService;
