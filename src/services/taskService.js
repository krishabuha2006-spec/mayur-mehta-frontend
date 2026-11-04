import { apiClient } from './apiClient';
import { taskTemplateService } from './taskTemplateService';
import { taskAdvancedService } from './taskAdvancedService';

/**
 * Task Service - Fully aligned with Swagger v1.6.0 Spec
 * Provides endpoints for Tasks, Projects Tasks, Kanban Boards,
 * Checklists, Summaries, Trash & Bulk Operations.
 */
export const taskService = {
  // 1. GET /tasks - List tasks across accessible projects with filters, sorting, and pagination
  getTasks: async (params = {}) => {
    try {
      const res = await apiClient.get('/tasks', { params });
      const body = res?.data || res;
      const list = Array.isArray(body)
        ? body
        : body?.data?.tasks || body?.tasks || body?.data || [];
      const meta = body?.meta || body?.data?.meta || body?.data?.pagination || body?.pagination;
      return {
        data: list,
        pagination: {
          page: meta?.page || Number(params.page) || 1,
          limit: meta?.limit || Number(params.limit) || list.length || 20,
          total: meta?.total ?? list.length,
          totalPages: meta?.totalPages || meta?.pages || 1
        }
      };
    } catch (err) {
      console.warn('GET /tasks API call notice:', err?.response?.status || err.message);
      return {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      };
    }
  },

  // 2. GET /projects/{projectId}/tasks - List tasks for a specific project
  getProjectTasks: async (projectId, params = {}) => {
    try {
      const res = await apiClient.get(`/projects/${projectId}/tasks`, { params });
      const body = res?.data || res;
      const list = Array.isArray(body)
        ? body
        : body?.data?.tasks || body?.tasks || body?.data || [];
      const meta = body?.meta || body?.data?.meta || body?.data?.pagination || body?.pagination;
      return {
        data: list,
        pagination: {
          page: meta?.page || Number(params.page) || 1,
          limit: meta?.limit || Number(params.limit) || list.length || 20,
          total: meta?.total ?? list.length,
          totalPages: meta?.totalPages || meta?.pages || 1
        }
      };
    } catch (err) {
      console.warn(`GET /projects/${projectId}/tasks error:`, err?.response?.status || err.message);
      return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  },

  // 3. POST /projects/{projectId}/tasks - Create a new task in project
  createProjectTask: async (projectId, data) => {
    const payload = {
      title: data.title?.trim(),
      priority: String(data.priority || 'MEDIUM').toUpperCase()
    };
    if (data.description?.trim()) payload.description = data.description.trim();
    if (data.taskTypeId) payload.taskTypeId = data.taskTypeId;
    if (data.stageId) payload.stageId = data.stageId;
    if (data.startDate && !isNaN(new Date(data.startDate).getTime())) {
      payload.startDate = new Date(data.startDate).toISOString();
    }
    if (data.dueDate && !isNaN(new Date(data.dueDate).getTime())) {
      payload.dueDate = new Date(data.dueDate).toISOString();
    }
    if (data.estimatedHours && !data.estimatedMinutes) {
      payload.estimatedMinutes = Math.round(Number(data.estimatedHours) * 60);
    } else if (data.estimatedMinutes) {
      payload.estimatedMinutes = Number(data.estimatedMinutes);
    }
    if (Array.isArray(data.assignees)) {
      const cleanAssignees = data.assignees.filter(Boolean);
      if (cleanAssignees.length > 0) payload.assignees = cleanAssignees;
    }
    if (Array.isArray(data.tags)) payload.tags = data.tags.filter(Boolean);
    if (Array.isArray(data.checklist)) payload.checklist = data.checklist.filter(Boolean);

    const res = await apiClient.post(`/projects/${projectId}/tasks`, payload);
    return res?.data?.data || res?.data || res;
  },

  // General Create Task helper: dispatches to project endpoint if projectId provided, else throws
  createTask: async (data) => {
    const projectId = data.projectId;
    if (!projectId) {
      throw new Error('Project ID is required to create a task in backend');
    }
    const payload = {
      title: data.title?.trim(),
      priority: String(data.priority || 'MEDIUM').toUpperCase()
    };
    if (data.description?.trim()) payload.description = data.description.trim();
    if (data.taskTypeId) payload.taskTypeId = data.taskTypeId;
    if (data.stageId) payload.stageId = data.stageId;
    if (data.startDate && !isNaN(new Date(data.startDate).getTime())) {
      payload.startDate = new Date(data.startDate).toISOString();
    }
    if (data.dueDate && !isNaN(new Date(data.dueDate).getTime())) {
      payload.dueDate = new Date(data.dueDate).toISOString();
    }
    if (data.estimatedHours && !data.estimatedMinutes) {
      payload.estimatedMinutes = Math.round(Number(data.estimatedHours) * 60);
    } else if (data.estimatedMinutes) {
      payload.estimatedMinutes = Number(data.estimatedMinutes);
    }
    if (Array.isArray(data.assignees)) {
      const cleanAssignees = data.assignees.filter(Boolean);
      if (cleanAssignees.length > 0) payload.assignees = cleanAssignees;
    }
    if (Array.isArray(data.tags)) payload.tags = data.tags.filter(Boolean);
    if (Array.isArray(data.checklist)) payload.checklist = data.checklist.filter(Boolean);

    const res = await apiClient.post(`/projects/${projectId}/tasks`, payload);
    return res?.data?.data || res?.data || res;
  },

  // 4. GET /tasks/{id} - Get single task by ID
  getTaskById: async (id) => {
    const res = await apiClient.get(`/tasks/${id}`);
    return res?.data?.data || res?.data || res;
  },

  // 5. PATCH /tasks/{id} - Update task fields
  updateTask: async (id, data) => {
    const res = await apiClient.patch(`/tasks/${id}`, data);
    return res?.data?.data || res?.data || res;
  },

  // 6. DELETE /tasks/{id} - Soft delete a task to trash
  deleteTask: async (id) => {
    try {
      const res = await apiClient.delete(`/tasks/${id}`);
      return res?.data?.data || res?.data || res;
    } catch (err) {
      if (err?.response?.status === 404) {
        // If task is not found on server or already soft-deleted, resolve gracefully
        return { ok: true, alreadyDeleted: true };
      }
      throw err;
    }
  },

  // Helper to normalize any status string to official Swagger enum
  normalizeStatus: (rawStatus) => {
    if (!rawStatus) return 'TODO';
    const upper = String(rawStatus).toUpperCase().trim();
    if (upper === 'DONE' || upper === 'COMPLETED') return 'DONE';
    if (upper === 'IN_PROGRESS' || upper === 'IN PROGRESS') return 'IN_PROGRESS';
    if (upper === 'IN_REVIEW' || upper === 'REVIEW') return 'IN_REVIEW';
    if (upper === 'CANCELLED' || upper === 'CANCELED') return 'CANCELLED';
    return 'TODO';
  },

  // 7. PUT /tasks/{id}/status - Update task status with transition validation
  updateTaskStatus: async (id, statusOrPayload, maybeReason = null) => {
    const rawStatus = typeof statusOrPayload === 'object' ? statusOrPayload.status : statusOrPayload;
    const normStatus = taskService.normalizeStatus(rawStatus);
    const payload = { status: normStatus };
    const reason = typeof statusOrPayload === 'object' ? statusOrPayload.reason : maybeReason;
    if (reason) payload.reason = reason;
    const res = await apiClient.put(`/tasks/${id}/status`, payload);
    return res?.data?.data || res?.data || res;
  },

  // 8. PUT /tasks/{id}/move - Move task in Kanban board or reorder between neighbours
  moveTask: async (id, movePayload) => {
    const normStatus = taskService.normalizeStatus(movePayload?.status);
    const payload = {
      status: normStatus
    };
    if (movePayload?.beforeTaskId) payload.beforeTaskId = movePayload.beforeTaskId;
    if (movePayload?.afterTaskId) payload.afterTaskId = movePayload.afterTaskId;
    if (movePayload?.reason) payload.reason = movePayload.reason;
    const res = await apiClient.put(`/tasks/${id}/move`, payload);
    return res?.data?.data || res?.data || res;
  },

  // 9. GET /projects/{projectId}/tasks/board - Get Kanban board view columns for a project
  getProjectTaskBoard: async (projectId) => {
    const res = await apiClient.get(`/projects/${projectId}/tasks/board`);
    return res?.data?.data || res?.data || res;
  },

  // 10. GET /tasks/my - Get My Tasks grouped into overdue, today, thisWeek, later, noDueDate
  getMyTasks: async (params = {}) => {
    try {
      const res = await apiClient.get('/tasks/my', { params });
      return res?.data?.data || res?.data || res;
    } catch (err) {
      console.warn('GET /tasks/my API notice:', err?.response?.status || err.message);
      return { overdue: [], today: [], thisWeek: [], later: [], noDueDate: [] };
    }
  },

  // 11. GET /tasks/summary - Get aggregate cross-project task statistics and facet counts
  getTasksSummary: async () => {
    try {
      const res = await apiClient.get('/tasks/summary');
      const payload = res?.data?.totalTasks !== undefined ? res.data : (res?.totalTasks !== undefined ? res : (res?.data || res));
      if (payload && payload.totalTasks !== undefined) {
        const rawStatus = payload.byStatus || {};
        payload.byStatus = {
          ...rawStatus,
          TODO: rawStatus.TODO ?? rawStatus.todo ?? 0,
          todo: rawStatus.todo ?? rawStatus.TODO ?? 0,
          IN_PROGRESS: rawStatus.IN_PROGRESS ?? rawStatus.inProgress ?? 0,
          inProgress: rawStatus.inProgress ?? rawStatus.IN_PROGRESS ?? 0,
          IN_REVIEW: rawStatus.IN_REVIEW ?? rawStatus.inReview ?? 0,
          inReview: rawStatus.inReview ?? rawStatus.IN_REVIEW ?? 0,
          COMPLETED: rawStatus.COMPLETED ?? rawStatus.completed ?? 0,
          completed: rawStatus.completed ?? rawStatus.COMPLETED ?? 0,
          CANCELLED: rawStatus.CANCELLED ?? rawStatus.cancelled ?? 0,
          cancelled: rawStatus.cancelled ?? rawStatus.CANCELLED ?? 0
        };
        return payload;
      }
      return payload;
    } catch (err) {
      console.warn('GET /tasks/summary API notice:', err?.response?.status || err.message);
      return null;
    }
  },

  // 12. GET /projects/{projectId}/tasks/summary - Get aggregate task statistics for a specific project
  getProjectTasksSummary: async (projectId) => {
    try {
      const res = await apiClient.get(`/projects/${projectId}/tasks/summary`);
      const payload = res?.data?.totalTasks !== undefined ? res.data : (res?.totalTasks !== undefined ? res : (res?.data || res));
      if (payload && payload.totalTasks !== undefined) {
        const rawStatus = payload.byStatus || {};
        payload.byStatus = {
          ...rawStatus,
          TODO: rawStatus.TODO ?? rawStatus.todo ?? 0,
          todo: rawStatus.todo ?? rawStatus.TODO ?? 0,
          IN_PROGRESS: rawStatus.IN_PROGRESS ?? rawStatus.inProgress ?? 0,
          inProgress: rawStatus.inProgress ?? rawStatus.IN_PROGRESS ?? 0,
          IN_REVIEW: rawStatus.IN_REVIEW ?? rawStatus.inReview ?? 0,
          inReview: rawStatus.inReview ?? rawStatus.IN_REVIEW ?? 0,
          COMPLETED: rawStatus.COMPLETED ?? rawStatus.completed ?? 0,
          completed: rawStatus.completed ?? rawStatus.COMPLETED ?? 0,
          CANCELLED: rawStatus.CANCELLED ?? rawStatus.cancelled ?? 0,
          cancelled: rawStatus.cancelled ?? rawStatus.CANCELLED ?? 0
        };
        return payload;
      }
      return payload;
    } catch (err) {
      console.warn(`GET /projects/${projectId}/tasks/summary API notice:`, err?.response?.status || err.message);
      return null;
    }
  },

  // 13. POST /tasks/bulk - Execute a bulk operation across up to 100 tasks
  bulkTasks: async (bulkPayload) => {
    let normValue = bulkPayload.value !== undefined ? bulkPayload.value : null;
    if (bulkPayload.action === 'SET_STATUS' && normValue) {
      normValue = taskService.normalizeStatus(normValue);
    }
    const payload = {
      ids: bulkPayload.ids || bulkPayload.taskIds || [],
      action: bulkPayload.action,
      value: normValue
    };
    if (bulkPayload.reason) payload.reason = bulkPayload.reason;
    const res = await apiClient.post('/tasks/bulk', payload);
    return res?.data?.data || res?.data || res;
  },

  // 14. GET /tasks/trash - List soft-deleted tasks with days remaining before permanent purge
  getTrashTasks: async (params = {}) => {
    try {
      const res = await apiClient.get('/tasks/trash', { params });
      const body = res?.data || res;
      const list = Array.isArray(body)
        ? body
        : body?.data?.tasks || body?.tasks || body?.data || [];
      return {
        data: list,
        pagination: body?.data?.pagination || body?.pagination || { page: 1, limit: 20, total: list.length }
      };
    } catch (err) {
      console.warn('GET /tasks/trash API notice:', err?.response?.status || err.message);
      return { data: [], pagination: { page: 1, limit: 20, total: 0 } };
    }
  },

  // 15. POST /tasks/{id}/restore - Restore a soft-deleted task from trash
  restoreTask: async (id) => {
    const res = await apiClient.post(`/tasks/${id}/restore`);
    return res?.data?.data || res?.data || res;
  },

  // 16. POST /tasks/{id}/checklist - Add a new checklist item to task
  addChecklistItem: async (id, itemPayload) => {
    const title = typeof itemPayload === 'string'
      ? itemPayload
      : (itemPayload.title || itemPayload.text || 'Checklist item');
    const res = await apiClient.post(`/tasks/${id}/checklist`, { title });
    return res?.data?.data || res?.data || res;
  },

  // 17. PATCH /tasks/{id}/checklist/{itemId} - Update or toggle checklist item
  updateChecklistItem: async (id, itemId, updatePayload) => {
    const res = await apiClient.patch(`/tasks/${id}/checklist/${itemId}`, updatePayload);
    return res?.data?.data || res?.data || res;
  },

  // 18. DELETE /tasks/{id}/checklist/{itemId} - Delete checklist item from task
  deleteChecklistItem: async (id, itemId) => {
    const res = await apiClient.delete(`/tasks/${id}/checklist/${itemId}`);
    return res?.data?.data || res?.data || res;
  },

  // =========================================================================
  // Module M2.2: Task Templates (Swagger v1.6.0)
  // =========================================================================
  getTemplates: (params) => taskTemplateService.getTemplates(params),
  getTemplateById: (id) => taskTemplateService.getTemplateById(id),
  createTemplate: (data) => taskTemplateService.createTemplate(data),
  updateTemplate: (id, data) => taskTemplateService.updateTemplate(id, data),
  deleteTemplate: (id) => taskTemplateService.deleteTemplate(id),
  createTemplateFromProject: (data) => taskTemplateService.createFromProject(data),
  applyTemplateToProject: (projectId, data) => taskTemplateService.applyTemplateToProject(projectId, data),

  // =========================================================================
  // Module M2.2: Task Advanced (Dependencies, Gantt, Reminders, Review, Time)
  // =========================================================================
  getDependencies: (taskId) => taskAdvancedService.getDependencies(taskId),
  setDependencies: (taskId, dependsOn) => taskAdvancedService.setDependencies(taskId, dependsOn),
  shiftTaskDates: (taskId, options) => taskAdvancedService.shiftTaskDates(taskId, options),
  getProjectGantt: (projectId) => taskAdvancedService.getProjectGantt(projectId),
  getReminders: (taskId) => taskAdvancedService.getReminders(taskId),
  createReminder: (taskId, payload) => taskAdvancedService.createReminder(taskId, payload),
  deleteReminder: (taskId, reminderId) => taskAdvancedService.deleteReminder(taskId, reminderId),
  reassignTask: (taskId, payload) => taskAdvancedService.reassignTask(taskId, payload),
  bulkReassignTasks: (payload) => taskAdvancedService.bulkReassignTasks(payload),
  submitForReview: (taskId, note) => taskAdvancedService.submitForReview(taskId, note),
  approveReview: (taskId, note) => taskAdvancedService.approveReview(taskId, note),
  rejectReview: (taskId, reason) => taskAdvancedService.rejectReview(taskId, reason),
  getReviewHistory: (taskId) => taskAdvancedService.getReviewHistory(taskId),
  getPendingReviewCount: () => taskAdvancedService.getPendingReviewCount(),
  logManualTime: (taskId, payload) => taskAdvancedService.logManualTime(taskId, payload),
  getTaskTimeLogs: (taskId) => taskAdvancedService.getTaskTimeLogs(taskId),
  updateTimeLog: (logId, payload) => taskAdvancedService.updateTimeLog(logId, payload),
  deleteTimeLog: (logId) => taskAdvancedService.deleteTimeLog(logId),
  startTimer: (payload) => taskAdvancedService.startTimer(payload),
  stopTimer: (payload) => taskAdvancedService.stopTimer(payload),
  getActiveTimer: () => taskAdvancedService.getActiveTimer(),
  getTimeSummary: () => taskAdvancedService.getTimeSummary(),
  getMyTimeReport: (params) => taskAdvancedService.getMyTimeReport(params),
  getProjectTimeReport: (projectId, params) => taskAdvancedService.getProjectTimeReport(projectId, params)
};

export { taskTemplateService, taskAdvancedService };
export default taskService;
