import { apiClient } from './apiClient';
import { DEFAULT_WIDGETS_LAYOUT, AVAILABLE_WIDGETS } from '../constants/widgets';

export const dashboardService = {
  getWidgetsLayout: async (scope = 'user') => {
    try {
      const res = await apiClient.get(`/dashboard/layout?scope=${scope}`);
      const payload = res?.data || res;
      if (payload?.widgets && Array.isArray(payload.widgets)) {
        return payload;
      }
    } catch {
      // Backend controller pending
    }
    return {
      scope,
      isLocked: true,
      availableCount: AVAILABLE_WIDGETS.length,
      widgets: DEFAULT_WIDGETS_LAYOUT
    };
  },

  getWidgetData: async (widgetKey, scope = 'user', range = 'today') => {
    try {
      const res = await apiClient.get(`/dashboard/widget/${widgetKey}?scope=${scope}&range=${range}`);
      const payload = res?.data || res;
      if (payload && typeof payload === 'object') {
        return payload;
      }
    } catch {
      // Backend controller pending
    }

    if (widgetKey === 'status-task' || widgetKey === 'pending-task') {
      return {
        key: widgetKey,
        range,
        series: [],
        emptyMessage: 'No tasks scheduled'
      };
    }

    if (['today-task', 'followup-task', 'project-task', 'office-task', 'overdue-task', 'personal-task'].includes(widgetKey)) {
      return {
        key: widgetKey,
        count: 0,
        changePercent: 0,
        targetRoute: `/tasks?filter=${widgetKey}`
      };
    }

    return {
      key: widgetKey,
      items: [],
      totalCount: 0,
      emptyMessage: `No ${widgetKey.replace('-', ' ')} records found`,
      targetRoute: '/projects'
    };
  },

  getAvailableWidgets: async () => {
    try {
      const res = await apiClient.get('/dashboard/available-widgets');
      const payload = res?.data || res;
      if (payload?.widgets) return payload;
    } catch {
      // Backend pending
    }
    return {
      count: AVAILABLE_WIDGETS.length,
      widgets: AVAILABLE_WIDGETS
    };
  },

  updateLayout: async (layoutData) => {
    try {
      const res = await apiClient.put('/dashboard/layout', layoutData);
      return res?.data || res;
    } catch {
      return { message: 'Layout updated locally' };
    }
  }
};

export default dashboardService;
