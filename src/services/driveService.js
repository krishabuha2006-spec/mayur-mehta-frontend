import { apiClient } from './apiClient';

/**
 * Storage Drive Service - Module M1.9: Storage Drive (Basic)
 * Folders, Files, Quota, Streaming & Trash Lifecycle
 */
export const driveService = {
  // ==========================================
  // 1. Browsing & Metrics
  // ==========================================

  /**
   * GET /drive/browse - Browse folders, files, and breadcrumbs in a space
   * @param {Object} params - { projectId, folderId }
   */
  browse: async (params = {}) => {
    const cleanParams = {};
    if (params.projectId) cleanParams.projectId = params.projectId;
    if (params.folderId) cleanParams.folderId = params.folderId;

    const res = await apiClient.get('/drive/browse', { params: cleanParams });
    const payload = res?.data || res;
    return {
      folders: Array.isArray(payload?.folders) ? payload.folders : (payload?.data?.folders || []),
      files: Array.isArray(payload?.files) ? payload.files : (payload?.data?.files || []),
      breadcrumbs: Array.isArray(payload?.breadcrumbs) ? payload.breadcrumbs : (payload?.data?.breadcrumbs || []),
      currentFolder: payload?.currentFolder || payload?.data?.currentFolder || null,
      space: payload?.space || (params.projectId ? 'PROJECT' : 'COMPANY')
    };
  },

  /**
   * GET /drive/search - Search files by query string, type, or date range
   * @param {Object} params - { q, projectId, type, from, to, page, limit }
   */
  search: async (params = {}) => {
    const res = await apiClient.get('/drive/search', { params });
    const payload = res?.data || res;
    return {
      files: Array.isArray(payload?.files) ? payload.files : (payload?.data?.files || payload?.data || []),
      total: payload?.total || payload?.data?.total || 0,
      page: payload?.page || 1
    };
  },

  /**
   * GET /drive/usage - Get storage usage and quota breakdown
   */
  getUsage: async () => {
    const res = await apiClient.get('/drive/usage');
    const payload = res?.data || res;
    const data = payload?.data || payload;
    return {
      usedBytes: Number(data?.usedBytes || 0),
      quotaBytes: Number(data?.quotaBytes || (5 * 1024 * 1024 * 1024)),
      quotaPercent: Number(data?.quotaPercent || 0),
      breakdown: data?.breakdown || {
        drawings: 0,
        documents: 0,
        images: 0,
        archives: 0,
        other: 0,
        trashBytes: 0
      }
    };
  },

  /**
   * GET /drive/trash - List soft-deleted items in trash with retention days left
   * @param {Object} params - { page, limit }
   */
  getTrash: async (params = {}) => {
    const res = await apiClient.get('/drive/trash', { params });
    const payload = res?.data || res;
    const data = payload?.data || payload;
    return {
      folders: Array.isArray(data?.folders) ? data.folders : [],
      files: Array.isArray(data?.files) ? data.files : [],
      total: data?.total || 0
    };
  },

  /**
   * DELETE /drive/trash - Permanently empty trash and release quota immediately
   */
  emptyTrash: async () => {
    const res = await apiClient.delete('/drive/trash');
    return res?.data || res;
  },

  // ==========================================
  // 2. Folder Operations
  // ==========================================

  /**
   * POST /drive/folders - Create a new folder (auto-disambiguates name collisions)
   * @param {Object} data - { name, parentId, projectId }
   */
  createFolder: async ({ name, parentId = null, projectId = null }) => {
    const payload = {
      name: name?.trim() || 'New Folder'
    };
    if (parentId) payload.parentId = parentId;
    if (projectId) payload.projectId = projectId;

    const res = await apiClient.post('/drive/folders', payload);
    const result = res?.data || res;
    return result?.data || result;
  },

  /**
   * PATCH /drive/folders/{id} - Rename a folder
   */
  renameFolder: async (id, name) => {
    const res = await apiClient.patch(`/drive/folders/${id}`, { name: name?.trim() });
    const result = res?.data || res;
    return result?.data || result;
  },

  /**
   * DELETE /drive/folders/{id} - Soft-delete a folder and its subtree
   */
  deleteFolder: async (id) => {
    const res = await apiClient.delete(`/drive/folders/${id}`);
    return res?.data || res;
  },

  /**
   * PUT /drive/folders/{id}/move - Move a folder to another parent within the same space
   */
  moveFolder: async (id, targetParentId = null) => {
    const res = await apiClient.put(`/drive/folders/${id}/move`, { targetParentId });
    const result = res?.data || res;
    return result?.data || result;
  },

  /**
   * GET /drive/folders/{id}/download - Download folder and all descendant files as ZIP
   */
  downloadFolderZip: async (id, folderName = 'folder') => {
    const res = await apiClient.get(`/drive/folders/${id}/download`, {
      responseType: 'blob'
    });

    const blob = res instanceof Blob ? res : new Blob([res], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  },

  /**
   * POST /drive/folders/{id}/restore - Restore a soft-deleted folder and its cascade-deleted items
   */
  restoreFolder: async (id) => {
    const res = await apiClient.post(`/drive/folders/${id}/restore`);
    const result = res?.data || res;
    return result?.data || result;
  },

  /**
   * POST /drive/projects/{projectId}/apply-template - Apply standard architectural folder template
   */
  applyProjectTemplate: async (projectId) => {
    const res = await apiClient.post(`/drive/projects/${projectId}/apply-template`);
    const result = res?.data || res;
    return result?.data || result;
  },

  // ==========================================
  // 3. File Operations & Streaming
  // ==========================================

  /**
   * POST /drive/files - Upload one or more files (multipart/form-data)
   * @param {FormData} formData - Contains files, folderId, projectId
   * @param {Function} onProgress - Upload progress callback
   */
  uploadFiles: async (formData, onProgress = null) => {
    const res = await apiClient.post('/drive/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
    const result = res?.data || res;
    return result?.data || result;
  },

  /**
   * GET /drive/files/{id} - Get file metadata
   */
  getFile: async (id) => {
    const res = await apiClient.get(`/drive/files/${id}`);
    const result = res?.data || res;
    return result?.data || result;
  },

  /**
   * PATCH /drive/files/{id} - Rename a file
   */
  renameFile: async (id, name) => {
    const res = await apiClient.patch(`/drive/files/${id}`, { name: name?.trim() });
    const result = res?.data || res;
    return result?.data || result;
  },

  /**
   * DELETE /drive/files/{id} - Soft-delete a file (moves to trash)
   */
  deleteFile: async (id) => {
    const res = await apiClient.delete(`/drive/files/${id}`);
    return res?.data || res;
  },

  /**
   * GET /drive/files/{id}/download - Stream authenticated byte-exact file download with RFC 5987 headers
   */
  downloadFile: async (id, fileName = 'download') => {
    const res = await apiClient.get(`/drive/files/${id}/download`, {
      responseType: 'blob'
    });

    const blob = res instanceof Blob ? res : new Blob([res]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  },

  /**
   * GET /drive/files/{id}/preview - Stream safe inline preview with sandbox CSP headers
   */
  getPreviewUrl: async (id) => {
    const res = await apiClient.get(`/drive/files/${id}/preview`, {
      responseType: 'blob'
    });
    const blob = res instanceof Blob ? res : new Blob([res]);
    return URL.createObjectURL(blob);
  },

  /**
   * PUT /drive/files/{id}/move - Move file to another folder in the same space
   */
  moveFile: async (id, targetFolderId = null) => {
    const res = await apiClient.put(`/drive/files/${id}/move`, { targetFolderId });
    const result = res?.data || res;
    return result?.data || result;
  },

  /**
   * PUT /drive/files/{id}/task - Attach or detach a task to/from a project file
   */
  linkTask: async (fileId, taskId, action = 'ATTACH') => {
    const res = await apiClient.put(`/drive/files/${fileId}/task`, { taskId, action });
    const result = res?.data || res;
    return result?.data || result;
  },

  /**
   * POST /drive/files/{id}/restore - Restore a soft-deleted file
   */
  restoreFile: async (id) => {
    const res = await apiClient.post(`/drive/files/${id}/restore`);
    const result = res?.data || res;
    return result?.data || result;
  },

  /**
   * GET /drive/tasks/{taskId}/files - List all files attached to a specific task
   */
  getTaskFiles: async (taskId) => {
    const res = await apiClient.get(`/drive/tasks/${taskId}/files`);
    const payload = res?.data || res;
    return Array.isArray(payload?.files) ? payload.files : (payload?.data?.files || []);
  },

  // ==========================================
  // 4. Admin Reconciliation
  // ==========================================

  /**
   * POST /admin/companies/{id}/reconcile-storage - Super Admin: Recompute and reconcile quota usage from disk
   */
  reconcileStorage: async (companyId) => {
    const res = await apiClient.post(`/admin/companies/${companyId}/reconcile-storage`);
    const result = res?.data || res;
    return result?.data || result;
  }
};

export default driveService;
