import { apiClient } from './apiClient';

export const taskService = {
  getTasks: async (params = {}) => {
    try {
      const res = await apiClient.get('/tasks', { params });
      const data = res?.data || res;
      const list = Array.isArray(data) ? data : data?.tasks || data?.data || [];
      return {
        data: list,
        pagination: data?.pagination || {
          page: 1,
          limit: list.length,
          total: list.length,
          totalPages: 1
        }
      };
    } catch (err) {
      console.warn('GET /tasks API call notice:', err?.response?.status || err.message);
      return {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      };
    }
  },

  createTask: async (data) => {
    const res = await apiClient.post('/tasks', data);
    return res?.data || res;
  }
};

export default taskService;
