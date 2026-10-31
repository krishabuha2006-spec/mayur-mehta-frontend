import { apiClient } from './apiClient';
import { teamService } from './teamService';
import { projectService } from './projectService';

const LOGS_CACHE_KEY = 'mm_persistent_site_logs';

const getCachedLogs = () => {
  try {
    const raw = localStorage.getItem(LOGS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setCachedLogs = (items) => {
  try {
    localStorage.setItem(LOGS_CACHE_KEY, JSON.stringify(items));
  } catch {}
};

export const logService = {
  getLogs: async (params = {}) => {
    const combined = [...getCachedLogs()];

    // Also fetch real team activity logs from live backend (M1.4 GET /team/activity)
    try {
      const teamLogs = await teamService.getActivity();
      const rawActivity = Array.isArray(teamLogs) ? teamLogs : (teamLogs?.data || []);
      rawActivity.forEach((act, idx) => {
        combined.push({
          id: act.id || act._id || `act_${idx}`,
          date: act.createdAt || act.timestamp || new Date().toISOString(),
          project: act.project?.name || act.projectName || 'Firm Studio Activity',
          engineer: act.user?.name || act.userName || 'Studio Member',
          weather: 'Site Office',
          laborCount: 0,
          hoursWorked: 8,
          summary: act.action ? `${act.action.replace(/_/g, ' ')}: ${act.details || act.description || 'System Activity'}` : 'Activity Log',
          tradeBreakdown: 'Practice Management'
        });
      });
    } catch {
      // Activity fetch fallback
    }

    return combined;
  },

  createLog: async (data) => {
    const created = {
      ...data,
      id: data.id || `log_${Date.now()}`,
      date: new Date().toISOString()
    };
    const current = getCachedLogs();
    const updated = [created, ...current];
    setCachedLogs(updated);
    return created;
  },

  updateLog: async (id, data) => {
    const updated = { ...data, id };
    const current = getCachedLogs();
    setCachedLogs(current.map((l) => ((l.id || l._id) === id ? { ...l, ...updated } : l)));
    return updated;
  },

  deleteLog: async (id) => {
    const current = getCachedLogs();
    setCachedLogs(current.filter((l) => (l.id || l._id) !== id));
    return true;
  }
};

export default logService;
