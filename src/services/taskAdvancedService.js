import { apiClient } from './apiClient';

/**
 * Module M2.2: Task Advanced Service
 * Handles:
 * - Task Dependencies & Interactive Gantt (/tasks/:id/dependencies, /tasks/:id/shift, /projects/:projectId/gantt)
 * - Task Reminders (/tasks/:id/reminders)
 * - Task Re-assignment (/tasks/:id/reassign, /tasks/reassign-bulk)
 * - Work Review Workflow (/tasks/:id/review/submit, /approve, /reject, /review/history, /company/review-tasks-pending)
 * - Time Tracking & Live Stopwatch (/tasks/:id/time, /time/timer/*, /time/summary, /projects/:projectId/time)
 */

function unwrap(res) {
  if (!res) return null;
  const body = res?.data !== undefined ? res.data : res;
  return body?.data !== undefined ? body.data : body;
}

export const taskAdvancedService = {
  // =========================================================================
  // 1. Task Dependencies & Gantt
  // =========================================================================

  /**
   * GET /tasks/:id/dependencies - Get task predecessors & successors
   */
  getDependencies: async (taskId) => {
    const res = await apiClient.get(`/tasks/${taskId}/dependencies`);
    return unwrap(res);
  },

  /**
   * PUT /tasks/:id/dependencies - Set task predecessors (cycle check enforced)
   * @param {string} taskId
   * @param {string[]} dependsOn - Array of predecessor task IDs
   */
  setDependencies: async (taskId, dependsOn = []) => {
    const res = await apiClient.put(`/tasks/${taskId}/dependencies`, { dependsOn });
    return unwrap(res);
  },

  /**
   * POST /tasks/:id/shift - Shift task dates with cascade & weekend skip
   * @param {string} taskId
   * @param {Object} options - { days, cascade, skipWeekends, expectedDepVersion }
   */
  shiftTaskDates: async (taskId, options = {}) => {
    const res = await apiClient.post(`/tasks/${taskId}/shift`, options);
    return unwrap(res);
  },

  /**
   * GET /projects/:projectId/gantt - Interactive Gantt chart feed
   */
  getProjectGantt: async (projectId) => {
    const res = await apiClient.get(`/projects/${projectId}/gantt`);
    return unwrap(res);
  },

  // =========================================================================
  // 2. Task Reminders
  // =========================================================================

  /**
   * GET /tasks/:id/reminders - List user's custom reminders on task
   */
  getReminders: async (taskId) => {
    const res = await apiClient.get(`/tasks/${taskId}/reminders`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : (data?.reminders || []);
  },

  /**
   * POST /tasks/:id/reminders - Create custom reminder on task
   * @param {string} taskId
   * @param {Object} payload - { remindAt, note }
   */
  createReminder: async (taskId, payload) => {
    const res = await apiClient.post(`/tasks/${taskId}/reminders`, payload);
    return unwrap(res);
  },

  /**
   * DELETE /tasks/:id/reminders/:reminderId - Cancel custom reminder
   */
  deleteReminder: async (taskId, reminderId) => {
    const res = await apiClient.delete(`/tasks/${taskId}/reminders/${reminderId}`);
    return unwrap(res);
  },

  // =========================================================================
  // 3. Task Re-assignment
  // =========================================================================

  /**
   * POST /tasks/:id/reassign - Reassign single task
   * @param {string} taskId
   * @param {Object} payload - { assigneeId, reason }
   */
  reassignTask: async (taskId, payload) => {
    const res = await apiClient.post(`/tasks/${taskId}/reassign`, payload);
    return unwrap(res);
  },

  /**
   * POST /tasks/reassign-bulk - Bulk reassign multiple tasks
   * @param {Object} payload - { taskIds, assigneeId, reason }
   */
  bulkReassignTasks: async (payload) => {
    const res = await apiClient.post('/tasks/reassign-bulk', payload);
    return unwrap(res);
  },

  // =========================================================================
  // 4. Work Review Workflow (QA Gate)
  // =========================================================================

  /**
   * POST /tasks/:id/review/submit - Submit task for review (moves to IN_REVIEW)
   */
  submitForReview: async (taskId, note = '') => {
    const res = await apiClient.post(`/tasks/${taskId}/review/submit`, { note });
    return unwrap(res);
  },

  /**
   * POST /tasks/:id/review/approve - Approve task work (moves to DONE)
   */
  approveReview: async (taskId, note = '') => {
    const res = await apiClient.post(`/tasks/${taskId}/review/approve`, { note });
    return unwrap(res);
  },

  /**
   * POST /tasks/:id/review/reject - Reject task work (moves to IN_PROGRESS)
   */
  rejectReview: async (taskId, reason = '') => {
    const res = await apiClient.post(`/tasks/${taskId}/review/reject`, { reason });
    return unwrap(res);
  },

  /**
   * GET /tasks/:id/review/history - Audit history of task review actions
   */
  getReviewHistory: async (taskId) => {
    const res = await apiClient.get(`/tasks/${taskId}/review/history`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : (data?.history || data?.events || []);
  },

  /**
   * GET /company/review-tasks-pending - Pending review tasks count for navbar badge
   */
  getPendingReviewCount: async () => {
    try {
      const res = await apiClient.get('/company/review-tasks-pending');
      const data = unwrap(res);
      if (typeof data === 'number') return data;
      return Number(data?.count ?? data?.pendingCount ?? 0);
    } catch {
      return 0;
    }
  },

  // =========================================================================
  // 5. Time Tracking & Live Stopwatch Timer
  // =========================================================================

  /**
   * POST /tasks/:id/time - Log manual worked time
   * @param {string} taskId
   * @param {Object} payload - { minutes, workDate, note }
   */
  logManualTime: async (taskId, payload) => {
    const res = await apiClient.post(`/tasks/${taskId}/time`, payload);
    return unwrap(res);
  },

  /**
   * GET /tasks/:id/time - Get booked time entries on a task
   */
  getTaskTimeLogs: async (taskId) => {
    const res = await apiClient.get(`/tasks/${taskId}/time`);
    const data = unwrap(res);
    return Array.isArray(data) ? data : (data?.logs || data?.entries || []);
  },

  /**
   * PATCH /time/:logId - Edit booked time entry
   */
  updateTimeLog: async (logId, payload) => {
    const res = await apiClient.patch(`/time/${logId}`, payload);
    return unwrap(res);
  },

  /**
   * DELETE /time/:logId - Delete booked time entry
   */
  deleteTimeLog: async (logId) => {
    const res = await apiClient.delete(`/time/${logId}`);
    return unwrap(res);
  },

  /**
   * POST /time/timer/start - Start live stopwatch timer
   * @param {Object} payload - { taskId, projectId }
   */
  startTimer: async (payload) => {
    const res = await apiClient.post('/time/timer/start', payload);
    return unwrap(res);
  },

  /**
   * POST /time/timer/stop - Stop active timer and book rounded minutes
   * @param {Object} payload - { note }
   */
  stopTimer: async (payload = {}) => {
    const res = await apiClient.post('/time/timer/stop', payload);
    return unwrap(res);
  },

  /**
   * GET /time/timer - Get active running timer status & elapsed seconds
   */
  getActiveTimer: async () => {
    try {
      const res = await apiClient.get('/time/timer');
      return unwrap(res);
    } catch {
      return null;
    }
  },

  /**
   * GET /time/summary - Today, week, month totals & daily allowance remainder
   */
  getTimeSummary: async () => {
    try {
      const res = await apiClient.get('/time/summary');
      return unwrap(res);
    } catch {
      return null;
    }
  },

  /**
   * GET /time/my - User time breakdown report
   */
  getMyTimeReport: async (params = {}) => {
    const res = await apiClient.get('/time/my', { params });
    return unwrap(res);
  },

  /**
   * GET /projects/:projectId/time - Project-level time summary and breakdown
   */
  getProjectTimeReport: async (projectId, params = {}) => {
    const res = await apiClient.get(`/projects/${projectId}/time`, { params });
    return unwrap(res);
  }
};

export default taskAdvancedService;

