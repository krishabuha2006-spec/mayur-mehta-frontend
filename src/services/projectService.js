import { apiClient } from './apiClient';

/**
 * Module M1.7: Projects Service
 * Core Project Record, Team Management, Stages & Progress Tracking
 * Direct integration with Mayur Mehta Backend API
 * 100% Backend-driven, zero static mock data
 */

// =========================================================================
// RESPONSE UNWRAPPERS (Handles any backend envelope variant)
// =========================================================================

function unwrapListResponse(response, params = {}) {
  if (!response) return null;

  // 1. response is directly an array
  if (Array.isArray(response)) {
    return {
      data: response,
      pagination: {
        total: response.length,
        page: Number(params.page) || 1,
        limit: Number(params.limit) || 10,
        pages: Math.ceil(response.length / (Number(params.limit) || 10)) || 1
      }
    };
  }

  // 2. response.data is an array (Standard M1.1 envelope)
  if (Array.isArray(response.data)) {
    return {
      data: response.data,
      pagination: response.pagination || {
        total: response.data.length,
        page: Number(params.page) || 1,
        limit: Number(params.limit) || 10,
        pages: Math.ceil(response.data.length / (Number(params.limit) || 10)) || 1
      }
    };
  }

  // 3. Nested array under response.data or response
  const rawList =
    (response.data && (response.data.projects || response.data.items || response.data.docs || response.data.results || response.data.list)) ||
    response.projects ||
    response.items ||
    response.docs ||
    response.results ||
    response.list;

  if (Array.isArray(rawList)) {
    const rawPag = response.data?.pagination || response.pagination || response.data?.meta || response.meta;
    return {
      data: rawList,
      pagination: rawPag || {
        total: rawList.length,
        page: Number(params.page) || 1,
        limit: Number(params.limit) || 10,
        pages: Math.ceil(rawList.length / (Number(params.limit) || 10)) || 1
      }
    };
  }

  return null;
}

function unwrapSingleItem(response) {
  if (!response) return null;
  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data.project || response.data.item || response.data;
  }
  if (response.project && typeof response.project === 'object') {
    return response.project;
  }
  return response;
}

function unwrapArray(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && typeof response.data === 'object') {
    const arr = response.data.stages || response.data.members || response.data.projects || response.data.items || response.data.docs || response.data.list;
    if (Array.isArray(arr)) return arr;
  }
  if (Array.isArray(response.stages)) return response.stages;
  if (Array.isArray(response.members)) return response.members;
  if (Array.isArray(response.projects)) return response.projects;
  if (Array.isArray(response.items)) return response.items;
  return [];
}

export const projectService = {
  /**
   * 1. GET /projects — List projects with search, filter, sort, and pagination
   */
  getProjects: async (params = {}) => {
    try {
      const response = await apiClient.get('/projects', { params });
      const unwrapped = unwrapListResponse(response, params);
      if (unwrapped) return unwrapped;
    } catch (err) {
      console.warn('Backend /projects fetch notice:', err?.response?.status || err?.message);
    }

    return {
      data: [],
      pagination: {
        total: 0,
        page: Number(params.page) || 1,
        limit: Number(params.limit) || 10,
        pages: 0
      }
    };
  },

  /**
   * 2. GET /projects/summary — Dashboard summary facet counts
   */
  getProjectSummary: async () => {
    try {
      const response = await apiClient.get('/projects/summary');
      if (response && response.total !== undefined) return response;
      if (response?.data && response.data.total !== undefined) return response.data;
    } catch (err) {
      console.warn('Backend /projects/summary notice:', err?.response?.status || err?.message);
    }

    return {
      total: 0,
      byStatus: {
        NOT_STARTED: 0,
        IN_PROGRESS: 0,
        ON_HOLD: 0,
        COMPLETED: 0,
        CANCELLED: 0
      },
      overdue: 0,
      archived: 0
    };
  },

  /**
   * 3. GET /projects/trash — List soft-deleted projects
   */
  getTrashedProjects: async (params = {}) => {
    try {
      const response = await apiClient.get('/projects/trash', { params });
      return unwrapArray(response);
    } catch (err) {
      console.warn('Backend /projects/trash notice:', err?.response?.status || err?.message);
      return [];
    }
  },

  /**
   * 4. GET /projects/export — CSV Export
   */
  exportProjectsCsv: async (params = {}) => {
    return await apiClient.get('/projects/export', {
      params,
      responseType: 'blob'
    });
  },

  /**
   * 5. POST /projects — Create project
   */
  createProject: async (projectData) => {
    const response = await apiClient.post('/projects', projectData);
    return unwrapSingleItem(response);
  },

  /**
   * 6. GET /projects/:id — Get project details
   */
  getProjectById: async (id) => {
    const response = await apiClient.get(`/projects/${id}`);
    return unwrapSingleItem(response);
  },

  /**
   * 7. PATCH /projects/:id — Update project
   */
  updateProject: async (id, projectData) => {
    const response = await apiClient.patch(`/projects/${id}`, projectData);
    return unwrapSingleItem(response);
  },

  /**
   * 8. PUT /projects/:id/status — Transition project status
   */
  updateProjectStatus: async (id, { status, reason }) => {
    const response = await apiClient.put(`/projects/${id}/status`, { status, reason });
    return unwrapSingleItem(response);
  },

  /**
   * 9. PUT /projects/:id/archive — Archive project
   */
  archiveProject: async (id) => {
    const response = await apiClient.put(`/projects/${id}/archive`);
    return unwrapSingleItem(response);
  },

  /**
   * 10. PUT /projects/:id/unarchive — Unarchive project
   */
  unarchiveProject: async (id) => {
    const response = await apiClient.put(`/projects/${id}/unarchive`);
    return unwrapSingleItem(response);
  },

  /**
   * 11. DELETE /projects/:id — Soft-delete project
   */
  deleteProject: async (id) => {
    return await apiClient.delete(`/projects/${id}`);
  },

  /**
   * 12. PUT /projects/:id/restore — Restore soft-deleted project
   */
  restoreProject: async (id) => {
    const response = await apiClient.put(`/projects/${id}/restore`);
    return unwrapSingleItem(response);
  },

  /**
   * 13. POST /projects/:id/duplicate — Duplicate project
   */
  duplicateProject: async (id, options = {}) => {
    const response = await apiClient.post(`/projects/${id}/duplicate`, options);
    return unwrapSingleItem(response);
  },

  /**
   * 14. GET /projects/:id/members — List project members
   */
  getProjectMembers: async (projectId) => {
    try {
      const response = await apiClient.get(`/projects/${projectId}/members`);
      return unwrapArray(response);
    } catch (err) {
      console.warn(`GET /projects/${projectId}/members notice:`, err?.response?.status || err?.message);
      return [];
    }
  },

  /**
   * 15. POST /projects/:id/members — Add project member
   */
  addProjectMember: async (projectId, memberData) => {
    const response = await apiClient.post(`/projects/${projectId}/members`, memberData);
    return unwrapSingleItem(response);
  },

  /**
   * 16. PATCH /projects/:id/members/:userId — Update member role
   */
  updateProjectMemberRole: async (projectId, userId, role) => {
    const response = await apiClient.patch(`/projects/${projectId}/members/${userId}`, { role });
    return unwrapSingleItem(response);
  },

  /**
   * 17. DELETE /projects/:id/members/:userId — Remove project member
   */
  removeProjectMember: async (projectId, userId) => {
    return await apiClient.delete(`/projects/${projectId}/members/${userId}`);
  },

  /**
   * 18. GET /projects/:id/stages — List project stages
   */
  getProjectStages: async (projectId) => {
    try {
      const response = await apiClient.get(`/projects/${projectId}/stages`);
      return unwrapArray(response);
    } catch (err) {
      console.warn(`GET /projects/${projectId}/stages notice:`, err?.response?.status || err?.message);
      return [];
    }
  },

  /**
   * 19. POST /projects/:id/stages — Add custom stage
   */
  addProjectStage: async (projectId, stageData) => {
    const response = await apiClient.post(`/projects/${projectId}/stages`, stageData);
    return unwrapSingleItem(response);
  },

  /**
   * 20. POST /projects/:id/stages/apply-defaults — Apply default stages from category
   */
  applyDefaultStages: async (projectId) => {
    const response = await apiClient.post(`/projects/${projectId}/stages/apply-defaults`);
    return unwrapArray(response);
  },

  /**
   * 21. PUT /projects/:id/stages/reorder — Reorder stages
   */
  reorderProjectStages: async (projectId, stageIds) => {
    const response = await apiClient.put(`/projects/${projectId}/stages/reorder`, { stageIds });
    return unwrapArray(response);
  },

  /**
   * 22. PATCH /projects/:id/stages/:stageId — Update stage status/dates
   */
  updateProjectStage: async (projectId, stageId, stageData) => {
    const response = await apiClient.patch(`/projects/${projectId}/stages/${stageId}`, stageData);
    return unwrapSingleItem(response);
  },

  /**
   * 23. DELETE /projects/:id/stages/:stageId — Delete stage
   */
  deleteProjectStage: async (projectId, stageId) => {
    return await apiClient.delete(`/projects/${projectId}/stages/${stageId}`);
  },

  /**
   * 24. PUT /projects/:id/progress — Update progress mode or manual percent
   */
  updateProjectProgress: async (projectId, { mode, manualPercent }) => {
    const response = await apiClient.put(`/projects/${projectId}/progress`, { mode, manualPercent });
    return unwrapSingleItem(response);
  }
};

export default projectService;
