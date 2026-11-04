import { apiClient } from './apiClient';

/**
 * Chat Service (Module M2.3)
 * Full integration with Swagger & Socket.io specification:
 * - GET    /chat/threads
 * - GET    /chat/{scopeType}/{scopeId}/messages
 * - POST   /chat/{scopeType}/{scopeId}/messages (REST fallback)
 * - PATCH  /chat/messages/{id}
 * - DELETE /chat/messages/{id}
 * - POST   /chat/{scopeType}/{scopeId}/read
 * - POST   /chat/{scopeType}/{scopeId}/mute
 * - GET    /chat/{scopeType}/{scopeId}/sync
 */

function unwrapData(res) {
  if (!res) return null;
  const payload = res?.data !== undefined ? res.data : res;
  return payload?.data !== undefined ? payload.data : payload;
}

export const chatService = {
  /**
   * 1. GET /chat/threads - List recent chat threads for user with unread counts
   * @param {Object} params - { scopeType, limit }
   */
  getThreads: async (params = {}) => {
    try {
      const res = await apiClient.get('/chat/threads', { params });
      const data = unwrapData(res);
      if (Array.isArray(data)) return data;
      return data?.threads || data?.items || [];
    } catch (err) {
      console.warn('Failed to fetch chat threads:', err?.message);
      return [];
    }
  },

  /**
   * 2. GET /chat/{scopeType}/{scopeId}/messages - Paginated message history
   * @param {string} scopeType - 'project' | 'task'
   * @param {string} scopeId - Project ID or Task ID
   * @param {Object} params - { beforeSeq, limit }
   */
  getMessages: async (scopeType, scopeId, params = {}) => {
    try {
      const res = await apiClient.get(`/chat/${scopeType}/${scopeId}/messages`, { params });
      const data = unwrapData(res);
      if (Array.isArray(data)) return { messages: data, hasMore: false };
      return {
        messages: data?.messages || data?.items || [],
        hasMore: !!data?.hasMore,
        lastSeq: data?.lastSeq ?? 0
      };
    } catch (err) {
      console.warn(`Failed to fetch messages for ${scopeType}:${scopeId}:`, err?.message);
      return { messages: [], hasMore: false, lastSeq: 0 };
    }
  },

  /**
   * 3. POST /chat/{scopeType}/{scopeId}/messages - Send message (REST fallback)
   * @param {string} scopeType - 'project' | 'task'
   * @param {string} scopeId
   * @param {Object} payload - { content, clientMessageId, attachments, mentions }
   */
  sendMessage: async (scopeType, scopeId, payload) => {
    const text = (payload.body !== undefined ? payload.body : payload.content || '').trim();
    const res = await apiClient.post(`/chat/${scopeType}/${scopeId}/messages`, {
      body: text,
      content: text,
      clientMessageId: payload.clientMessageId || `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      attachments: payload.attachments || [],
      mentions: payload.mentions || []
    });
    return unwrapData(res);
  },

  /**
   * 4. PATCH /chat/messages/{id} - Edit message (author only, within 15 min)
   */
  editMessage: async (id, content) => {
    const text = (typeof content === 'string' ? content : content?.body || content?.content || '').trim();
    const res = await apiClient.patch(`/chat/messages/${id}`, {
      body: text,
      content: text
    });
    return unwrapData(res);
  },

  /**
   * 5. DELETE /chat/messages/{id} - Delete message (author self-delete or moderator)
   */
  deleteMessage: async (id) => {
    const res = await apiClient.delete(`/chat/messages/${id}`);
    return unwrapData(res);
  },

  /**
   * 6. POST /chat/{scopeType}/{scopeId}/read - Mark thread read up to sequence number
   */
  markRead: async (scopeType, scopeId, seq) => {
    const res = await apiClient.post(`/chat/${scopeType}/${scopeId}/read`, { seq });
    return unwrapData(res);
  },

  /**
   * 7. POST /chat/{scopeType}/{scopeId}/mute - Mute or unmute notifications
   */
  toggleMute: async (scopeType, scopeId, isMuted) => {
    const res = await apiClient.post(`/chat/${scopeType}/${scopeId}/mute`, { muted: !!isMuted });
    return unwrapData(res);
  },

  /**
   * 8. GET /chat/{scopeType}/{scopeId}/sync - Sync missed messages after reconnection
   */
  syncMessages: async (scopeType, scopeId, sinceSeq) => {
    const res = await apiClient.get(`/chat/${scopeType}/${scopeId}/sync`, {
      params: { sinceSeq }
    });
    const data = unwrapData(res);
    return Array.isArray(data) ? data : data?.messages || [];
  }
};

export default chatService;

