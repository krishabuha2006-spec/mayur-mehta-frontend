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
    (Array.isArray(payload.entries) ? payload.entries : null) ||
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
  return payload.item || payload.board || payload.data || payload;
}

/**
 * Design Library Service - Module M2.5
 * Full 100% Swagger & Specification Conformance:
 * 
 * 2.1 Items (PORTFOLIO, REFERENCE, MATERIAL)
 * - GET    /library/items
 * - POST   /library/items
 * - GET    /library/items/export
 * - GET    /library/facets
 * - GET    /library/tags
 * - GET    /library/trash
 * - GET    /library/usage
 * - GET    /library/portfolio/prefill/:projectId
 * - GET    /library/items/:id
 * - PATCH  /library/items/:id
 * - PUT    /library/items/:id/status
 * - POST   /library/items/:id/clone
 * - DELETE /library/items/:id
 * - POST   /library/items/:id/restore
 * - GET    /library/items/:id/usage
 * - PUT    /library/items/:id/favourite
 * - DELETE /library/items/:id/favourite
 * 
 * 2.2 Photos, Datasheets & Files
 * - POST   /library/items/:id/photos
 * - PUT    /library/items/:id/photos/order
 * - PUT    /library/items/:id/cover
 * - POST   /library/items/:id/datasheets
 * - PATCH  /library/photos/:fileId
 * - DELETE /library/photos/:fileId
 * - POST   /library/photos/:fileId/restore
 * - PATCH  /library/datasheets/:fileId
 * - DELETE /library/datasheets/:fileId
 * - POST   /library/datasheets/:fileId/restore
 * - GET    /library/files/:fileId/thumb
 * - GET    /library/files/:fileId/preview
 * - GET    /library/files/:fileId/download
 * 
 * 2.4 Mood Boards & Material Shortlists
 * - GET    /library/boards
 * - POST   /library/boards
 * - GET    /library/boards/:id
 * - PATCH  /library/boards/:id
 * - PUT    /library/boards/:id/status
 * - POST   /library/boards/:id/duplicate
 * - DELETE /library/boards/:id
 * - POST   /library/boards/:id/entries
 * - PATCH  /library/boards/:id/entries/:entryId
 * - DELETE /library/boards/:id/entries/:entryId
 * - PUT    /library/boards/:id/entries/order
 */
export const libraryService = {
  // ==========================================
  // 1. Library Items (Module M2.5 - Section 2.1)
  // ==========================================

  // GET /library/items - List items with filter, search, sort, favourites
  getItems: async (params = {}) => {
    const res = await apiClient.get('/library/items', { params });
    return unwrapLibraryList(res, 'items');
  },

  // POST /library/items - Create item (PORTFOLIO, REFERENCE, MATERIAL)
  createItem: async (data) => {
    const res = await apiClient.post('/library/items', data);
    return unwrapSingleItem(res, 'item');
  },

  // GET /library/items/{id} - Item detail with ordered photos, datasheets, usage
  getItem: async (id) => {
    const res = await apiClient.get(`/library/items/${id}`);
    return unwrapSingleItem(res, 'item');
  },

  // PATCH /library/items/{id} - Update item fields
  updateItem: async (id, data) => {
    const res = await apiClient.patch(`/library/items/${id}`, data);
    return unwrapSingleItem(res, 'item');
  },

  // PUT /library/items/{id}/status - Toggle ACTIVE / ARCHIVED
  updateItemStatus: async (id, status) => {
    const res = await apiClient.put(`/library/items/${id}/status`, { status });
    return unwrapSingleItem(res, 'item');
  },

  // POST /library/items/{id}/clone - Clone item data without photos
  cloneItem: async (id) => {
    const res = await apiClient.post(`/library/items/${id}/clone`);
    return unwrapSingleItem(res, 'item');
  },

  // DELETE /library/items/{id} - Soft-delete item and cascade to files
  deleteItem: async (id) => {
    const res = await apiClient.delete(`/library/items/${id}`);
    return res?.data || res;
  },

  // POST /library/items/{id}/restore - Retention restore soft-deleted item and files
  restoreItem: async (id) => {
    const res = await apiClient.post(`/library/items/${id}/restore`);
    return unwrapSingleItem(res, 'item');
  },

  // GET /library/items/{id}/usage - Check boards containing item and external checkers
  getItemUsage: async (id) => {
    try {
      const res = await apiClient.get(`/library/items/${id}/usage`);
      const payload = res?.data || res;
      return payload?.data || payload;
    } catch {
      return { boards: [], inUse: false };
    }
  },

  // PUT /library/items/{id}/favourite - Add item to user favourites
  addFavourite: async (id) => {
    const res = await apiClient.put(`/library/items/${id}/favourite`);
    return res?.data || res;
  },

  // DELETE /library/items/{id}/favourite - Remove item from user favourites
  removeFavourite: async (id) => {
    const res = await apiClient.delete(`/library/items/${id}/favourite`);
    return res?.data || res;
  },

  // GET /library/portfolio/prefill/:projectId - Suggested public fields from project
  getPortfolioPrefill: async (projectId) => {
    const res = await apiClient.get(`/library/portfolio/prefill/${projectId}`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  // GET /library/trash - List soft-deleted items & photos within retention
  getTrash: async (params = {}) => {
    const res = await apiClient.get('/library/trash', { params });
    return unwrapLibraryList(res, 'items');
  },

  // GET /library/usage - Total storage bytes & photo counts
  getStorageUsage: async () => {
    try {
      const res = await apiClient.get('/library/usage');
      const payload = res?.data || res;
      return payload?.data || payload;
    } catch {
      return null;
    }
  },

  // GET /library/facets - Aggregation facets (categories, top tags, brands, years, areas)
  getFacets: async () => {
    try {
      const res = await apiClient.get('/library/facets');
      const payload = res?.data || res;
      return payload?.facets || payload?.data || payload;
    } catch {
      return null;
    }
  },

  // GET /library/tags - Tag autocomplete suggestions
  getTags: async (q = '') => {
    try {
      const res = await apiClient.get('/library/tags', { params: { q } });
      const payload = res?.data || res;
      return Array.isArray(payload) ? payload : (payload?.tags || payload?.data || []);
    } catch {
      return [];
    }
  },

  // GET /library/items/export - Export formula-safe CSV stream
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

  // ==========================================
  // 2. Photos, Datasheets & Sharp Images (Section 2.2 & 2.3)
  // ==========================================

  // POST /library/items/{id}/photos - Multipart photo upload (generates thumb & preview)
  uploadPhotos: async (id, fileList) => {
    const formData = new FormData();
    if (Array.isArray(fileList)) {
      fileList.forEach((file) => formData.append('photos', file));
    } else if (fileList instanceof FileList) {
      Array.from(fileList).forEach((file) => formData.append('photos', file));
    } else if (fileList instanceof File) {
      formData.append('photos', fileList);
    }
    const res = await apiClient.post(`/library/items/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res?.data || res;
  },

  // PUT /library/items/{id}/photos/order - Reorder live photos (exact set of fileIds)
  reorderPhotos: async (id, fileIds) => {
    const res = await apiClient.put(`/library/items/${id}/photos/order`, { fileIds });
    return res?.data || res;
  },

  // PUT /library/items/{id}/cover - Explicitly set item cover photo
  setCoverPhoto: async (id, fileId) => {
    const res = await apiClient.put(`/library/items/${id}/cover`, { fileId });
    return res?.data || res;
  },

  // POST /library/items/{id}/datasheets - Multipart PDF datasheet upload
  uploadDatasheets: async (id, fileList) => {
    const formData = new FormData();
    if (Array.isArray(fileList)) {
      fileList.forEach((file) => formData.append('datasheets', file));
    } else if (fileList instanceof FileList) {
      Array.from(fileList).forEach((file) => formData.append('datasheets', file));
    } else if (fileList instanceof File) {
      formData.append('datasheets', fileList);
    }
    const res = await apiClient.post(`/library/items/${id}/datasheets`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res?.data || res;
  },

  // PATCH /library/photos/{fileId} - Update photo caption or name
  updatePhoto: async (fileId, data) => {
    const res = await apiClient.patch(`/library/photos/${fileId}`, data);
    return res?.data || res;
  },

  // DELETE /library/photos/{fileId} - Soft-delete a photo
  deletePhoto: async (fileId) => {
    const res = await apiClient.delete(`/library/photos/${fileId}`);
    return res?.data || res;
  },

  // POST /library/photos/{fileId}/restore - Restore a soft-deleted photo
  restorePhoto: async (fileId) => {
    const res = await apiClient.post(`/library/photos/${fileId}/restore`);
    return res?.data || res;
  },

  // PATCH /library/datasheets/{fileId} - Update datasheet caption or name
  updateDatasheet: async (fileId, data) => {
    const res = await apiClient.patch(`/library/datasheets/${fileId}`, data);
    return res?.data || res;
  },

  // DELETE /library/datasheets/{fileId} - Soft-delete a datasheet
  deleteDatasheet: async (fileId) => {
    const res = await apiClient.delete(`/library/datasheets/${fileId}`);
    return res?.data || res;
  },

  // POST /library/datasheets/{fileId}/restore - Restore a soft-deleted datasheet
  restoreDatasheet: async (fileId) => {
    const res = await apiClient.post(`/library/datasheets/${fileId}/restore`);
    return res?.data || res;
  },

  // File URL endpoints for streaming
  getThumbUrl: (fileId) => `/api/v1/library/files/${fileId}/thumb`,
  getPreviewUrl: (fileId) => `/api/v1/library/files/${fileId}/preview`,
  getDownloadUrl: (fileId) => `/api/v1/library/files/${fileId}/download`,

  // ==========================================
  // 3. Mood Boards & Material Shortlists (Section 2.4)
  // ==========================================

  // GET /library/boards - List company & accessible project boards
  getBoards: async (params = {}) => {
    const res = await apiClient.get('/library/boards', { params });
    return unwrapLibraryList(res, 'boards');
  },

  // POST /library/boards - Create company or project board
  createBoard: async (data) => {
    const res = await apiClient.post('/library/boards', data);
    return unwrapSingleItem(res, 'board');
  },

  // GET /library/boards/{id} - Get board with ordered entries
  getBoard: async (id) => {
    const res = await apiClient.get(`/library/boards/${id}`);
    return unwrapSingleItem(res, 'board');
  },

  // PATCH /library/boards/{id} - Update board name / description
  updateBoard: async (id, data) => {
    const res = await apiClient.patch(`/library/boards/${id}`, data);
    return unwrapSingleItem(res, 'board');
  },

  // PUT /library/boards/{id}/status - Toggle board ACTIVE / ARCHIVED
  updateBoardStatus: async (id, status) => {
    const res = await apiClient.put(`/library/boards/${id}/status`, { status });
    return unwrapSingleItem(res, 'board');
  },

  // POST /library/boards/{id}/duplicate - Duplicate board to another project or company space
  duplicateBoard: async (id, targetData = {}) => {
    const res = await apiClient.post(`/library/boards/${id}/duplicate`, targetData);
    return unwrapSingleItem(res, 'board');
  },

  // DELETE /library/boards/{id} - Hard delete board and entries
  deleteBoard: async (id) => {
    const res = await apiClient.delete(`/library/boards/${id}`);
    return res?.data || res;
  },

  // POST /library/boards/{id}/entries - Add REFERENCE or MATERIAL item to board
  addBoardEntry: async (boardId, { itemId, note, areaId }) => {
    const res = await apiClient.post(`/library/boards/${boardId}/entries`, { itemId, note, areaId });
    return unwrapSingleItem(res, 'entry');
  },

  // PATCH /library/boards/{id}/entries/{entryId} - Update entry note or area
  updateBoardEntry: async (boardId, entryId, data) => {
    const res = await apiClient.patch(`/library/boards/${boardId}/entries/${entryId}`, data);
    return unwrapSingleItem(res, 'entry');
  },

  // DELETE /library/boards/{id}/entries/{entryId} - Remove entry from board
  removeBoardEntry: async (boardId, entryId) => {
    const res = await apiClient.delete(`/library/boards/${boardId}/entries/${entryId}`);
    return res?.data || res;
  },

  // PUT /library/boards/{id}/entries/order - Reorder board entries
  reorderBoardEntries: async (boardId, entryIds) => {
    const res = await apiClient.put(`/library/boards/${boardId}/entries/order`, { entryIds });
    return res?.data || res;
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
