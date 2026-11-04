import { apiClient } from './apiClient';

/**
 * Robust response unwrappers for Library API
 */
function unwrapLibraryList(response, key = 'items') {
  if (!response) return { items: [], pagination: { total: 0, page: 1, limit: 20 } };
  
  if (Array.isArray(response)) {
    return { items: response, pagination: { total: response.length, page: 1, limit: response.length } };
  }
  
  const payload = response.data || response;
  
  if (Array.isArray(payload)) {
    return { items: payload, pagination: response.pagination || { total: payload.length, page: 1, limit: payload.length } };
  }
  
  const list =
    (key && Array.isArray(payload[key]) ? payload[key] : null) ||
    (Array.isArray(payload.items) ? payload.items : null) ||
    (Array.isArray(payload.docs) ? payload.docs : null) ||
    (Array.isArray(payload.list) ? payload.list : null) ||
    (Array.isArray(payload.records) ? payload.records : null) ||
    (Array.isArray(payload.boards) ? payload.boards : null) ||
    (Array.isArray(payload.data) ? payload.data : null) ||
    [];

  const pagination =
    payload.pagination ||
    response.pagination ||
    response.meta ||
    payload.meta || {
      total: list.length,
      page: 1,
      limit: 20
    };

  return { items: list, pagination };
}

function unwrapSingleItem(response, key = 'item') {
  if (!response) return null;
  const payload = response.data || response;
  if (key && payload[key]) return payload[key];
  return payload.item || payload.board || payload;
}

/**
 * Design Library Service
 * Conforms 100% to Mayur Mehta Swagger v2.3.0 Specification:
 * - GET    /library/items
 * - POST   /library/items
 * - GET    /library/items/export
 * - GET    /library/facets
 * - GET    /library/tags
 * - GET    /library/items/{id}
 * - PATCH  /library/items/{id}
 * - DELETE /library/items/{id}
 * - POST   /library/items/{id}/photos
 * - GET    /library/files/{fileId}/thumb
 * - GET    /library/files/{fileId}/preview
 * - GET    /library/files/{fileId}/download
 * - GET    /library/boards
 * - POST   /library/boards
 */
export const libraryService = {
  // 1. GET /library/items - List items with filter, search, sort
  getItems: async (params = {}) => {
    const res = await apiClient.get('/library/items', { params });
    return unwrapLibraryList(res, 'items');
  },

  // 2. POST /library/items - Create a new library item (MATERIAL, PORTFOLIO, REFERENCE)
  createItem: async (data) => {
    const res = await apiClient.post('/library/items', data);
    return unwrapSingleItem(res, 'item');
  },

  // 3. GET /library/items/{id} - Get detailed item with photos and specs
  getItem: async (id) => {
    const res = await apiClient.get(`/library/items/${id}`);
    return unwrapSingleItem(res, 'item');
  },

  // 4. PATCH /library/items/{id} - Update item fields
  updateItem: async (id, data) => {
    const res = await apiClient.patch(`/library/items/${id}`, data);
    return unwrapSingleItem(res, 'item');
  },

  // 5. DELETE /library/items/{id} - Soft-delete item
  deleteItem: async (id) => {
    const res = await apiClient.delete(`/library/items/${id}`);
    return res?.data || res;
  },

  // 6. GET /library/facets - Aggregation facets for categories and counts
  getFacets: async () => {
    try {
      const res = await apiClient.get('/library/facets');
      const payload = res?.data || res;
      return payload?.facets || payload?.data || payload;
    } catch {
      return null;
    }
  },

  // 7. GET /library/tags - Tag autocomplete suggestions
  getTags: async (q = '') => {
    try {
      const res = await apiClient.get('/library/tags', { params: { q } });
      const payload = res?.data || res;
      return Array.isArray(payload) ? payload : (payload?.tags || payload?.data || []);
    } catch {
      return [];
    }
  },

  // 8. GET /library/items/export - Export CSV stream
  exportCsv: async () => {
    const res = await apiClient.get('/library/items/export', { responseType: 'blob' });
    const blob = res instanceof Blob ? res : new Blob([res], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Library_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  // 9. POST /library/items/{id}/photos - Upload photos to item
  uploadPhotos: async (id, fileList) => {
    const formData = new FormData();
    if (Array.isArray(fileList)) {
      fileList.forEach((file) => formData.append('photos', file));
    } else if (fileList instanceof FileList) {
      Array.from(fileList).forEach((file) => formData.append('photos', file));
    } else if (fileList instanceof File) {
      formData.append('photos', fileList);
    }
    const res = await apiClient.post(`/library/items/${id}/photos`, formData);
    return res?.data || res;
  },

  // File URL helpers
  getThumbUrl: (fileId) => `/api/v1/library/files/${fileId}/thumb`,
  getPreviewUrl: (fileId) => `/api/v1/library/files/${fileId}/preview`,
  getDownloadUrl: (fileId) => `/api/v1/library/files/${fileId}/download`,

  // 10. GET /library/boards - List mood boards
  getBoards: async (params = {}) => {
    const res = await apiClient.get('/library/boards', { params });
    return unwrapLibraryList(res, 'boards');
  },

  // 11. POST /library/boards - Create a mood board
  createBoard: async (data) => {
    const res = await apiClient.post('/library/boards', data);
    return unwrapSingleItem(res, 'board');
  },

  // Backward compatibility alias for existing code
  getMaterials: async (params = {}) => {
    const res = await libraryService.getItems({ kind: 'MATERIAL', ...params });
    return res.items || [];
  },
  createMaterial: async (data) => {
    return libraryService.createItem({ kind: 'MATERIAL', ...data });
  },
  updateMaterial: async (id, data) => {
    return libraryService.updateItem(id, data);
  },
  deleteMaterial: async (id) => {
    return libraryService.deleteItem(id);
  }
};

export default libraryService;
