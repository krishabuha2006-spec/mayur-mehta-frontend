import { apiClient } from './apiClient';

/**
 * Module M2.2: Task Templates Service
 * Full integration with Mayur Mehta Backend Swagger v1.6.0
 * 
 * Endpoints:
 * 1. POST   /task-templates                         - Create task template
 * 2. GET    /task-templates                          - List task templates
 * 3. GET    /task-templates/{id}                     - Get task template by ID
 * 4. PATCH  /task-templates/{id}                     - Update task template
 * 5. DELETE /task-templates/{id}                     - Delete task template
 * 6. POST   /task-templates/from-project             - Create template from existing project tasks
 * 7. POST   /projects/{projectId}/tasks/apply-template - Apply template to project
 */

function unwrap(res) {
  if (!res) return null;
  const body = res?.data !== undefined ? res.data : res;
  return body?.data !== undefined ? body.data : body;
}

export const taskTemplateService = {
  /**
   * 1. GET /task-templates - List all task templates with filtering
   * @param {Object} params - { search, category, page, limit }
   */
  getTemplates: async (params = {}) => {
    try {
      const res = await apiClient.get('/task-templates', { params });
      const body = unwrap(res);
      const list = Array.isArray(body)
        ? body
        : (body?.templates || body?.items || body?.docs || body?.list || []);
      const total = Number(body?.total ?? body?.pagination?.total ?? list.length);
      const pages = Number(body?.totalPages ?? body?.pagination?.totalPages ?? Math.max(1, Math.ceil(total / (Number(params.limit) || 20))));

      return {
        templates: list,
        total,
        totalPages: pages,
        pagination: body?.pagination || { page: Number(params.page) || 1, limit: Number(params.limit) || 20, total }
      };
    } catch (err) {
      console.warn('GET /task-templates error notice:', err?.response?.status || err.message);
      return { templates: [], total: 0, totalPages: 1 };
    }
  },

  /**
   * 2. GET /task-templates/{id} - Get single task template with its tasks checklist
   * @param {string} id - Template ID
   */
  getTemplateById: async (id) => {
    const res = await apiClient.get(`/task-templates/${id}`);
    const data = unwrap(res);
    return data?.template || data;
  },

  /**
   * 3. POST /task-templates - Create a new task template
   * @param {Object} payload - { name, description, category, tasks }
   */
  createTemplate: async (payload) => {
    const body = {
      name: payload.name?.trim(),
      description: payload.description?.trim() || '',
      category: payload.category || 'GENERAL',
      tasks: Array.isArray(payload.tasks) ? payload.tasks : []
    };
    const res = await apiClient.post('/task-templates', body);
    return unwrap(res);
  },

  /**
   * 4. PATCH /task-templates/{id} - Update an existing task template
   * @param {string} id - Template ID
   * @param {Object} payload - Partial update fields
   */
  updateTemplate: async (id, payload) => {
    const res = await apiClient.patch(`/task-templates/${id}`, payload);
    return unwrap(res);
  },

  /**
   * 5. DELETE /task-templates/{id} - Delete task template
   * @param {string} id - Template ID
   */
  deleteTemplate: async (id) => {
    const res = await apiClient.delete(`/task-templates/${id}`);
    return unwrap(res);
  },

  /**
   * 6. POST /task-templates/from-project - Create reusable template from existing project tasks
   * @param {Object} payload - { projectId, name, description, category, includeCompleted }
   */
  createFromProject: async (payload) => {
    const body = {
      projectId: payload.projectId,
      name: payload.name?.trim(),
      description: payload.description?.trim() || '',
      category: payload.category || 'PROJECT_DERIVED',
      includeCompleted: Boolean(payload.includeCompleted)
    };
    const res = await apiClient.post('/task-templates/from-project', body);
    return unwrap(res);
  },

  /**
   * 7. POST /projects/{projectId}/tasks/apply-template - Clone template tasks into a project
   * @param {string} projectId - Target project ID
   * @param {Object} payload - { templateId, stageId, startDate }
   */
  applyTemplateToProject: async (projectId, payload) => {
    const body = {
      templateId: payload.templateId,
      ...(payload.stageId ? { stageId: payload.stageId } : {}),
      ...(payload.startDate ? { startDate: new Date(payload.startDate).toISOString() } : {})
    };
    const res = await apiClient.post(`/projects/${projectId}/tasks/apply-template`, body);
    return unwrap(res);
  }
};

export default taskTemplateService;

