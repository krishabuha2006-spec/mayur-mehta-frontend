import { apiClient } from './apiClient';

/**
 * Chat Service (Module M2.3)
 * Full integration with Swagger & WebSocket specification:
 * 1. GET    /chat/threads - List recent chat threads for user with unread counts
 * 2. GET    /chat/{scopeType}/{scopeId}/messages - Get paginated message history
 * 3. POST   /chat/{scopeType}/{scopeId}/messages - Send a new message (REST fallback)
 * 4. PATCH  /chat/messages/{id} - Edit an existing message (author only, within 15 min)
 * 5. DELETE /chat/messages/{id} - Delete a message (author self-delete or moderator deletion)
 * 6. POST   /chat/{scopeType}/{scopeId}/read - Mark thread as read up to given sequence
 * 7. POST   /chat/{scopeType}/{scopeId}/mute - Mute or unmute notifications for a thread
 * 8. GET    /chat/{scopeType}/{scopeId}/sync - Sync missed messages after reconnection
 */

function unwrapData(res) {
  if (!res) return null;
  const payload = res?.data !== undefined ? res.data : res;
  return payload?.data !== undefined ? payload.data : payload;
}

function normalizeScope(scope) {
  if (!scope) return 'PROJECT';
  const upper = String(scope).toUpperCase();
  return upper === 'TASK' ? 'TASK' : 'PROJECT';
}

export const chatService = {
  /**
   * 1. GET /chat/threads - List recent chat threads for user with unread counts
   * @param {Object} params - { projectId, limit, cursor }
   */
  getThreads: async (params = {}) => {
    try {
      const res = await apiClient.get('/chat/threads', { params, silent: true });
      const data = unwrapData(res);
      if (Array.isArray(data)) return data;
      return data?.threads || data?.items || [];
    } catch {
      return [];
    }
  },

  /**
   * 2. GET /chat/{scopeType}/{scopeId}/messages - Paginated message history
   * @param {string} scopeType - 'PROJECT' | 'TASK' | 'project' | 'task'
   * @param {string} scopeId - Project ID or Task ID
   * @param {Object} params - { beforeSeq, limit }
   */
  getMessages: async (scopeType, scopeId, params = {}) => {
    if (!scopeId) return { messages: [], hasMore: false, lastSeq: 0 };
    const scope = normalizeScope(scopeType);
    try {
      const res = await apiClient.get(`/chat/${scope}/${scopeId}/messages`, { params, silent: true });
      const data = unwrapData(res);
      if (Array.isArray(data)) return { messages: data, hasMore: false, lastSeq: 0 };
      return {
        messages: data?.messages || data?.items || [],
        hasMore: !!data?.hasMore,
        lastSeq: data?.lastSeq ?? 0
      };
    } catch {
      return { messages: [], hasMore: false, lastSeq: 0 };
    }
  },

  /**
   * 3. POST /chat/{scopeType}/{scopeId}/messages - Send a new message
   * @param {string} scopeType - 'PROJECT' | 'TASK'
   * @param {string} scopeId - Project ID or Task ID
   * @param {Object} payload - { body, clientMessageId, mentions, attachments }
   */
  sendMessage: async (scopeType, scopeId, payload) => {
    if (!scopeId) return null;
    const scope = normalizeScope(scopeType);
    const text = (payload.body !== undefined ? payload.body : payload.content || '').trim();
    const clientMessageId =
      payload.clientMessageId || `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const res = await apiClient.post(`/chat/${scope}/${scopeId}/messages`, {
      body: text,
      content: text,
      clientMessageId,
      mentions: payload.mentions || [],
      attachments: payload.attachments || []
    });
    return unwrapData(res);
  },

  /**
   * 4. PATCH /chat/messages/{id} - Edit message within 15 minutes
   * @param {string} id - Message ID
   * @param {string|Object} content - Updated message body string or object { body }
   */
  editMessage: async (id, content) => {
    const text = (typeof content === 'string' ? content : content?.body || content?.content || '').trim();
    const res = await apiClient.patch(`/chat/messages/${id}`, {
      body: text
    });
    return unwrapData(res);
  },

  /**
   * 5. DELETE /chat/messages/{id} - Delete message
   * @param {string} id - Message ID
   * @param {string} [reason] - Optional deletion reason
   */
  deleteMessage: async (id, reason = '') => {
    const config = reason ? { data: { reason } } : {};
    const res = await apiClient.delete(`/chat/messages/${id}`, config);
    return unwrapData(res);
  },

  /**
   * 6. POST /chat/{scopeType}/{scopeId}/read - Mark thread as read
   * @param {string} scopeType - 'PROJECT' | 'TASK'
   * @param {string} scopeId - Project ID or Task ID
   * @param {number} readSeq - Sequence number
   */
  markRead: async (scopeType, scopeId, readSeq) => {
    if (!scopeId) return null;
    const scope = normalizeScope(scopeType);
    const seq = Number(readSeq) || 1;
    const res = await apiClient.post(`/chat/${scope}/${scopeId}/read`, {
      readSeq: seq
    });
    return unwrapData(res);
  },

  /**
   * 7. POST /chat/{scopeType}/{scopeId}/mute - Mute or unmute notifications
   * @param {string} scopeType - 'PROJECT' | 'TASK'
   * @param {string} scopeId - Project ID or Task ID
   * @param {boolean} isMuted - Next muted state
   */
  toggleMute: async (scopeType, scopeId, isMuted) => {
    if (!scopeId) return null;
    const scope = normalizeScope(scopeType);
    const res = await apiClient.post(`/chat/${scope}/${scopeId}/mute`, {
      isMuted: !!isMuted
    });
    return unwrapData(res);
  },

  /**
   * 8. GET /chat/{scopeType}/{scopeId}/sync - Sync missed messages
   * @param {string} scopeType - 'PROJECT' | 'TASK'
   * @param {string} scopeId - Project ID or Task ID
   * @param {number} sinceSeq - Sequence number to sync from
   */
  syncMessages: async (scopeType, scopeId, sinceSeq) => {
    if (!scopeId) return [];
    const scope = normalizeScope(scopeType);
    const res = await apiClient.get(`/chat/${scope}/${scopeId}/sync`, {
      params: { sinceSeq: Number(sinceSeq) || 0 }
    });
    const data = unwrapData(res);
    return Array.isArray(data) ? data : data?.messages || [];
  }
};

export default chatService;
