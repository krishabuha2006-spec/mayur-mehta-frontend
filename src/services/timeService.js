import { apiClient } from './apiClient';

/**
 * Module M2.2: Time Tracking Service
 * Full integration with Swagger specification:
 * 1.  POST   /tasks/{id}/time         - Log manual time on task
 * 2.  GET    /tasks/{id}/time         - Get time logs on task
 * 3.  PATCH  /time/{logId}            - Edit time log entry
 * 4.  DELETE /time/{logId}            - Delete time log entry
 * 5.  POST   /time/timer/start        - Start real-time stopwatch timer on task
 * 6.  POST   /time/timer/stop         - Stop caller active timer and book rounded minutes
 * 7.  GET    /time/timer              - Get caller active running timer with elapsed seconds
 * 8.  GET    /time/my                 - Get caller time breakdown (grouped by day, task, or project)
 * 9.  GET    /time/summary            - Get today, week, month time totals and remaining daily allowance
 * 10. GET    /projects/{projectId}/time - Get project time summary and breakdown by user, task, or day
 */

function unwrap(res) {
  if (!res) return null;
  const body = res?.data !== undefined ? res.data : res;
  return body?.data !== undefined ? body.data : body;
}

export const timeService = {
  /**
   * 1. POST /tasks/{id}/time - Log manual worked time
   * @param {string} taskId
   * @param {Object} payload - { date?: string, workDate?: string, minutes: number, note?: string }
   */
  logManualTime: async (taskId, payload) => {
    const rawDate = payload.date || payload.workDate || new Date().toISOString();
    const dateStr = String(rawDate).slice(0, 10); // Format: YYYY-MM-DD
    const minutes = Math.max(1, Math.min(1440, Math.round(Number(payload.minutes) || 1)));

    const body = {
      date: dateStr,
      minutes
    };
    if (payload.note && payload.note.trim()) {
      body.note = payload.note.trim();
    }

    const res = await apiClient.post(`/tasks/${taskId}/time`, body);
    return unwrap(res);
  },

  /**
   * 2. GET /tasks/{id}/time - Get booked time entries on a task
   * @param {string} taskId
   */
  getTaskTimeLogs: async (taskId) => {
    try {
      const res = await apiClient.get(`/tasks/${taskId}/time`, { silent: true });
      const data = unwrap(res);
      return Array.isArray(data) ? data : (data?.logs || data?.entries || data?.items || []);
    } catch {
      return [];
    }
  },

  /**
   * 3. PATCH /time/{logId} - Edit booked time entry
   * @param {string} logId
   * @param {Object} payload - { minutes?: number, date?: string, workDate?: string, note?: string }
   */
  updateTimeLog: async (logId, payload) => {
    const body = {};
    if (payload.minutes !== undefined) {
      body.minutes = Math.max(1, Math.min(1440, Math.round(Number(payload.minutes) || 1)));
    }
    const rawDate = payload.date || payload.workDate;
    if (rawDate) {
      body.date = String(rawDate).slice(0, 10);
    }
    if (payload.note !== undefined) {
      body.note = String(payload.note).trim();
    }
    const res = await apiClient.patch(`/time/${logId}`, body);
    return unwrap(res);
  },

  /**
   * 4. DELETE /time/{logId} - Delete booked time entry
   * @param {string} logId
   */
  deleteTimeLog: async (logId) => {
    const res = await apiClient.delete(`/time/${logId}`);
    return unwrap(res);
  },

  /**
   * 5. POST /time/timer/start - Start live stopwatch timer on task
   * @param {Object} payload - { taskId: string, note?: string }
   */
  startTimer: async (payload) => {
    const body = {
      taskId: payload.taskId
    };
    if (payload.note && payload.note.trim()) {
      body.note = payload.note.trim();
    }
    const res = await apiClient.post('/time/timer/start', body);
    return unwrap(res);
  },

  /**
   * 6. POST /time/timer/stop - Stop active timer and book rounded minutes
   * @param {Object} payload - { note?: string }
   */
  stopTimer: async (payload = {}) => {
    const body = {};
    if (payload.note && payload.note.trim()) {
      body.note = payload.note.trim();
    }
    try {
      const res = await apiClient.post('/time/timer/stop', body, { silent: true, suppressNotFound: true });
      return unwrap(res);
    } catch (err) {
      if (err?.response?.status === 404) {
        return { running: false, minutes: 0 };
      }
      throw err;
    }
  },

  /**
   * 7. GET /time/timer - Get active running timer status & elapsed seconds
   */
  getActiveTimer: async () => {
    try {
      const res = await apiClient.get('/time/timer', { silent: true });
      return unwrap(res);
    } catch {
      return null;
    }
  },

  /**
   * 8. GET /time/my - Caller time breakdown report
   * @param {Object} params - { from?: string, to?: string, groupBy?: 'day' | 'task' | 'project' }
   */
  getMyTimeReport: async (params = {}) => {
    try {
      const res = await apiClient.get('/time/my', { params, silent: true });
      return unwrap(res) || [];
    } catch {
      return [];
    }
  },

  /**
   * 9. GET /time/summary - Today, week, month totals & daily allowance remainder
   */
  getTimeSummary: async () => {
    try {
      const res = await apiClient.get('/time/summary', { silent: true });
      return unwrap(res) || null;
    } catch {
      return null;
    }
  },

  /**
   * 10. GET /projects/{projectId}/time - Project-level time summary and breakdown
   * @param {string} projectId
   * @param {Object} params - { from?: string, to?: string, groupBy?: 'user' | 'task' | 'day' }
   */
  getProjectTimeReport: async (projectId, params = {}) => {
    try {
      const res = await apiClient.get(`/projects/${projectId}/time`, { params, silent: true });
      return unwrap(res) || null;
    } catch {
      return null;
    }
  }
};

export default timeService;
