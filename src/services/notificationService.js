import { apiClient } from './apiClient';

/**
 * Notifications Service
 * Direct integration with Swagger API specifications:
 * - GET  /notifications
 * - GET  /notifications/unread-count
 * - PATCH /notifications/{id}/read
 * - PATCH /notifications/{id}/unread
 * - POST /notifications/read-all
 * - DELETE /notifications/{id}
 * - DELETE /notifications/clear-read
 * - DELETE /notifications/clear-all
 * - GET  /settings/notifications/preferences
 * - PATCH /settings/notifications/preferences
 */

function unwrapData(res) {
  if (!res) return null;
  const payload = res?.data !== undefined ? res.data : res;
  return payload?.data !== undefined ? payload.data : payload;
}

export const notificationService = {
  /**
   * 1. GET /notifications - List notifications for current user
   * @param {Object} params - { page, limit, unreadOnly }
   */
  getNotifications: async (params = {}) => {
    try {
      const res = await apiClient.get('/notifications', { params });
      const data = unwrapData(res);
      if (Array.isArray(data)) return { notifications: data, total: data.length };
      return {
        notifications: data?.notifications || data?.items || data?.list || [],
        total: data?.total || data?.pagination?.total || 0,
        unreadCount: data?.unreadCount ?? 0,
        pagination: data?.pagination || null
      };
    } catch (err) {
      console.warn('Failed to fetch notifications from backend:', err?.message);
      return { notifications: [], total: 0, unreadCount: 0 };
    }
  },

  /**
   * 2. GET /notifications/unread-count - Get current unread notification count
   */
  getUnreadCount: async () => {
    try {
      const res = await apiClient.get('/notifications/unread-count');
      const data = unwrapData(res);
      if (typeof data === 'number') return data;
      if (data?.unreadCount !== undefined) return Number(data.unreadCount);
      if (data?.count !== undefined) return Number(data.count);
      return 0;
    } catch (err) {
      console.warn('Failed to fetch unread count:', err?.message);
      return 0;
    }
  },

  /**
   * 3. PATCH /notifications/{id}/read - Mark single notification as read
   */
  markAsRead: async (id) => {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return unwrapData(res);
  },

  /**
   * 4. PATCH /notifications/{id}/unread - Mark single notification as unread
   */
  markAsUnread: async (id) => {
    const res = await apiClient.patch(`/notifications/${id}/unread`);
    return unwrapData(res);
  },

  /**
   * 5. POST /notifications/read-all - Mark all unread notifications as read
   */
  markAllAsRead: async () => {
    const res = await apiClient.post('/notifications/read-all');
    return unwrapData(res);
  },

  /**
   * 6. DELETE /notifications/{id} - Delete single notification
   */
  deleteNotification: async (id) => {
    const res = await apiClient.delete(`/notifications/${id}`);
    return unwrapData(res);
  },

  /**
   * 7. DELETE /notifications/clear-read - Delete all read notifications for current user
   */
  clearRead: async () => {
    const res = await apiClient.delete('/notifications/clear-read');
    return unwrapData(res);
  },

  /**
   * 8. DELETE /notifications/clear-all - Delete all notifications (read and unread) for current user
   */
  clearAll: async () => {
    const res = await apiClient.delete('/notifications/clear-all');
    return unwrapData(res);
  },

  /**
   * 9. GET /settings/notifications/preferences - Get user notification preferences and muted projects
   */
  getPreferences: async () => {
    const res = await apiClient.get('/settings/notifications/preferences');
    return unwrapData(res);
  },

  /**
   * 10. PATCH /settings/notifications/preferences - Update user notification preferences and project mutes
   */
  updatePreferences: async (preferences) => {
    const res = await apiClient.patch('/settings/notifications/preferences', preferences);
    return unwrapData(res);
  }
};

export default notificationService;

