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
    const rawMeta = response.meta || response.data?.meta || response.pagination;
    const total = rawMeta?.total ?? response.data.length;
    const limit = rawMeta?.limit ?? (Number(params.limit) || 10);
    const page = rawMeta?.page ?? (Number(params.page) || 1);
    const pages = rawMeta?.totalPages ?? rawMeta?.pages ?? Math.ceil(total / limit) ?? 1;

    return {
      data: response.data,
      pagination: {
        total,
        page,
        limit,
        pages
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
    const rawMeta = response.meta || response.data?.meta || response.data?.pagination || response.pagination;
    const total = rawMeta?.total ?? rawList.length;
    const limit = rawMeta?.limit ?? (Number(params.limit) || 10);
    const page = rawMeta?.page ?? (Number(params.page) || 1);
    const pages = rawMeta?.totalPages ?? rawMeta?.pages ?? Math.ceil(total / limit) ?? 1;

    return {
      data: rawList,
      pagination: {
        total,
        page,
        limit,
        pages
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
      const payload = (response && response.total !== undefined) ? response : (response?.data?.total !== undefined ? response.data : response);
      if (payload && payload.total !== undefined) {
        const rawStatus = payload.byStatus || {};
        const normalizedByStatus = {
          NOT_STARTED: rawStatus.NOT_STARTED ?? rawStatus.notStarted ?? 0,
          notStarted: rawStatus.notStarted ?? rawStatus.NOT_STARTED ?? 0,
          IN_PROGRESS: rawStatus.IN_PROGRESS ?? rawStatus.inProgress ?? 0,
          inProgress: rawStatus.inProgress ?? rawStatus.IN_PROGRESS ?? 0,
          ON_HOLD: rawStatus.ON_HOLD ?? rawStatus.onHold ?? 0,
          onHold: rawStatus.onHold ?? rawStatus.ON_HOLD ?? 0,
          COMPLETED: rawStatus.COMPLETED ?? rawStatus.completed ?? 0,
          completed: rawStatus.completed ?? rawStatus.COMPLETED ?? 0,
          CANCELLED: rawStatus.CANCELLED ?? rawStatus.cancelled ?? 0,
          cancelled: rawStatus.cancelled ?? rawStatus.CANCELLED ?? 0
        };
        return {
          ...payload,
          byStatus: normalizedByStatus
        };
      }
    } catch (err) {
      console.warn('Backend /projects/summary notice:', err?.response?.status || err?.message);
    }

    return {
      total: 0,
      byStatus: {
        NOT_STARTED: 0,
        notStarted: 0,
        IN_PROGRESS: 0,
        inProgress: 0,
        ON_HOLD: 0,
        onHold: 0,
        COMPLETED: 0,
        completed: 0,
        CANCELLED: 0,
        cancelled: 0
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
      const response = await apiClient.get('/projects/trash', { params, timeout: 3500 });
      return unwrapArray(response);
    } catch {
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
   * Helper to sanitize project payload according to backend Zod schema
   */
  sanitizeProjectPayload: (input) => {
    if (!input || typeof input !== 'object') return input;
    const payload = {};

    if (input.name) payload.name = String(input.name).trim();
    if (input.priority) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      const p = String(input.priority).toUpperCase();
      if (validPriorities.includes(p)) payload.priority = p;
    }

    // Description & Contact person handling
    let desc = typeof input.description === 'string' ? input.description.trim() : '';
    const contact = input.client?.contactPerson || input.contactPerson;
    if (contact && !desc.includes(contact.trim())) {
      desc = desc ? `${desc} | Contact: ${contact.trim()}` : `Contact: ${contact.trim()}`;
    }
    if (desc) payload.description = desc.slice(0, 2000);

    // Client (Strictly allowed: name, phone, email, company, address)
    if (input.client && typeof input.client === 'object') {
      const c = {};
      if (input.client.name) c.name = String(input.client.name).trim();
      if (input.client.phone) c.phone = String(input.client.phone).trim();
      if (input.client.email) c.email = String(input.client.email).trim();
      if (input.client.company) c.company = String(input.client.company).trim();
      if (input.client.address) c.address = String(input.client.address).trim();
      if (Object.keys(c).length > 0) payload.client = c;
    }

    // Site (Strictly allowed: line1, line2, city, state, pincode, country, mapLink)
    if (input.site && typeof input.site === 'object') {
      const s = {};
      const line1 = input.site.line1 || input.site.address;
      if (line1) s.line1 = String(line1).trim();
      if (input.site.line2) s.line2 = String(input.site.line2).trim();
      if (input.site.city) s.city = String(input.site.city).trim();
      if (input.site.state) s.state = String(input.site.state).trim();
      if (input.site.pincode) s.pincode = String(input.site.pincode).trim();
      if (input.site.country) s.country = String(input.site.country).trim();
      if (input.site.mapLink) s.mapLink = String(input.site.mapLink).trim();
      if (Object.keys(s).length > 0) payload.site = s;
    }

    // Dates (Strictly: startDate, expectedEndDate)
    const startDate = input.startDate || input.plannedStartDate;
    if (startDate) {
      try {
        payload.startDate = new Date(startDate).toISOString().slice(0, 10);
      } catch {}
    }
    const expectedEndDate = input.expectedEndDate || input.plannedEndDate || input.targetDate;
    if (expectedEndDate) {
      try {
        payload.expectedEndDate = new Date(expectedEndDate).toISOString().slice(0, 10);
      } catch {}
    }

    // Area (Strictly: { value: number, unit: 'SQFT' | 'SQM' })
    if (input.area && typeof input.area === 'object') {
      const val = Number(input.area.value ?? input.area.builtUp);
      if (!isNaN(val) && val > 0) {
        const u = String(input.area.unit || 'SQFT').toUpperCase();
        payload.area = {
          value: val,
          unit: u.includes('M') ? 'SQM' : 'SQFT'
        };
      }
    }

    // Budget
    if (input.budgetPaise !== undefined) {
      const bp = Number(input.budgetPaise);
      if (!isNaN(bp) && bp >= 0) payload.budgetPaise = Math.round(bp);
    } else if (input.budgetRupees !== undefined) {
      const br = Number(String(input.budgetRupees).replace(/[^0-9.]/g, ''));
      if (!isNaN(br) && br >= 0) payload.budgetPaise = Math.round(br * 100);
    }

    // Category & Typology (Only 24-character hex ObjectId)
    const isObjectId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val.trim());
    if (isObjectId(input.projectCategoryId)) payload.projectCategoryId = input.projectCategoryId.trim();
    if (isObjectId(input.projectTypeId)) payload.projectTypeId = input.projectTypeId.trim();

    // Tags
    if (Array.isArray(input.tags) && input.tags.length > 0) {
      payload.tags = input.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 20);
    }

    // Members
    if (Array.isArray(input.members) && input.members.length > 0) {
      payload.members = input.members.filter((m) => isObjectId(m.userId));
    }

    // Default stages
    if (input.applyDefaultStages === true || input.applyDefaultStagesOnInit === true) {
      payload.applyDefaultStages = true;
    }

    // Version for optimistic locking on update
    if (input.expectedVersion !== undefined) {
      payload.expectedVersion = input.expectedVersion;
    }

    return payload;
  },

  /**
   * 5. POST /projects — Create project
   */
  createProject: async (projectData) => {
    const cleanPayload = projectService.sanitizeProjectPayload(projectData);
    const response = await apiClient.post('/projects', cleanPayload);
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
    const cleanPayload = projectService.sanitizeProjectPayload(projectData);
    const response = await apiClient.patch(`/projects/${id}`, cleanPayload);
    return unwrapSingleItem(response);
  },

  /**
   * 8. PUT /projects/:id/status (or POST) — Transition project status
   * Body: { status, reason, confirmOpenStages }
   */
  updateProjectStatus: async (id, { status, reason, confirmOpenStages = false }) => {
    const payload = { status };
    if (reason && reason.trim()) payload.reason = reason.trim();
    if (confirmOpenStages) payload.confirmOpenStages = true;
    try {
      const response = await apiClient.put(`/projects/${id}/status`, payload);
      return unwrapSingleItem(response);
    } catch (err) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        const response = await apiClient.post(`/projects/${id}/status`, payload);
        return unwrapSingleItem(response);
      }
      throw err;
    }
  },

  /**
   * 9. POST /projects/:id/archive (or PUT) — Archive project (only COMPLETED or CANCELLED)
   */
  archiveProject: async (id) => {
    try {
      const response = await apiClient.post(`/projects/${id}/archive`);
      return unwrapSingleItem(response);
    } catch {
      const response = await apiClient.put(`/projects/${id}/archive`);
      return unwrapSingleItem(response);
    }
  },

  /**
   * 10. POST /projects/:id/unarchive (or PUT) — Unarchive project
   */
  unarchiveProject: async (id) => {
    try {
      const response = await apiClient.post(`/projects/${id}/unarchive`);
      return unwrapSingleItem(response);
    } catch {
      const response = await apiClient.put(`/projects/${id}/unarchive`);
      return unwrapSingleItem(response);
    }
  },

  /**
   * 11. DELETE /projects/:id — Soft-delete project to Trash (30-day retention)
   */
  deleteProject: async (id) => {
    return await apiClient.delete(`/projects/${id}`);
  },

  /**
   * 12. POST /projects/:id/restore (or PUT) — Restore soft-deleted project from Trash
   */
  restoreProject: async (id) => {
    try {
      const response = await apiClient.post(`/projects/${id}/restore`);
      return unwrapSingleItem(response);
    } catch (err) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        const response = await apiClient.put(`/projects/${id}/restore`);
        return unwrapSingleItem(response);
      }
      throw err;
    }
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
      if (err?.response?.status !== 401) {
        console.warn(`GET /projects/${projectId}/members notice:`, err?.response?.status || err?.message);
      }
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
      if (err?.response?.status !== 401) {
        console.warn(`GET /projects/${projectId}/stages notice:`, err?.response?.status || err?.message);
      }
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
  },

  /**
   * 25. GET /projects/:id/activity — Get Project Activity Logs
   */
  getProjectActivity: async (projectId, params = {}) => {
    const response = await apiClient.get(`/projects/${projectId}/activity`, { params });
    return unwrapArray(response);
  },

  // =========================================================================
  // Module M2.4: Project Directory & ACVC Partner Integration
  // =========================================================================
  /**
   * POST /projects/:id/client — Link directory client to project
   */
  linkClient: async (projectId, { clientId, copyAddressToSite = true }) => {
    const response = await apiClient.post(`/projects/${projectId}/client`, {
      clientId,
      copyAddressToSite
    });
    return unwrapSingleItem(response);
  },

  /**
   * DELETE /projects/:id/client — Unlink client from project
   */
  unlinkClient: async (projectId) => {
    const response = await apiClient.delete(`/projects/${projectId}/client`);
    return unwrapSingleItem(response);
  },

  /**
   * GET /projects/:id/partners — List partners associated with project
   */
  getPartners: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/partners`);
    return unwrapArray(response);
  },

  /**
   * POST /projects/:id/partners — Associate partner with project
   */
  addPartner: async (projectId, { partnerId, role, note }) => {
    const response = await apiClient.post(`/projects/${projectId}/partners`, {
      partnerId,
      role,
      note
    });
    return unwrapSingleItem(response);
  },

  /**
   * PATCH /projects/:id/partners/:partnerId — Update project partner role/note
   */
  updatePartner: async (projectId, partnerId, { role, note }) => {
    const response = await apiClient.patch(`/projects/${projectId}/partners/${partnerId}`, {
      role,
      note
    });
    return unwrapSingleItem(response);
  },

  /**
   * DELETE /projects/:id/partners/:partnerId — Remove partner from project
   */
  removePartner: async (projectId, partnerId) => {
    const response = await apiClient.delete(`/projects/${projectId}/partners/${partnerId}`);
    return unwrapSingleItem(response);
  },

  /**
   * POST /projects/:id/site/share — Share project site details and map link
   */
  shareSite: async (projectId, { channel = 'whatsapp' } = {}) => {
    const response = await apiClient.post(`/projects/${projectId}/site/share`, { channel });
    return unwrapSingleItem(response);
  }
};

export default projectService;
