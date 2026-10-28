import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useGreeting } from '../../hooks/useGreeting';
import { SegmentedToggle } from '../../components/common/SegmentedToggle/SegmentedToggle';
import { IconButton } from '../../components/common/IconButton/IconButton';
import { WidgetGrid } from '../../components/dashboard/WidgetGrid/WidgetGrid';
import { WidgetPicker } from '../../components/dashboard/WidgetPicker/WidgetPicker';
import { Skeleton } from '../../components/common/Skeleton/Skeleton';
import { ErrorState } from '../../components/common/ErrorState/ErrorState';
import { dashboardService } from '../../services/dashboardService';
import { DASHBOARD_SCOPES } from '../../constants/enums';
import { MESSAGES } from '../../constants/messages';
import './DashboardPage.css';

export function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const greeting = useGreeting(user?.firstName || 'User');

  const [scope, setScope] = useState(DASHBOARD_SCOPES.USER);
  const [widgets, setWidgets] = useState([]);
  const [isLocked, setIsLocked] = useState(true);
  const [availableCount, setAvailableCount] = useState(19);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const canViewTeamScope = hasPermission('dashboard:team_scope');

  const scopeOptions = [
    { label: MESSAGES.DASHBOARD.USER_SCOPE, value: DASHBOARD_SCOPES.USER },
    ...(canViewTeamScope ? [{ label: MESSAGES.DASHBOARD.TEAM_SCOPE, value: DASHBOARD_SCOPES.TEAM }] : [])
  ];

  const fetchLayout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getWidgetsLayout(scope);
      setWidgets(data.widgets || []);
      setIsLocked(data.isLocked !== undefined ? data.isLocked : true);
      setAvailableCount(data.availableCount || 19);
    } catch {
      setError(MESSAGES.APP.NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  const handleToggleLock = () => {
    setIsLocked((prev) => !prev);
  };

  const handleHideWidget = async (widgetKey) => {
    const updated = widgets.map((w) =>
      w.key === widgetKey ? { ...w, visible: false } : w
    );
    setWidgets(updated);
    setAvailableCount((prev) => prev + 1);

    try {
      await dashboardService.updateLayout({ scope, widgets: updated });
    } catch {
      // rollback or notify
    }
  };

  const handleRemoveWidget = async (widgetKey) => {
    const updated = widgets.filter((w) => w.key !== widgetKey);
    setWidgets(updated);
    setAvailableCount((prev) => prev + 1);

    try {
      await dashboardService.updateLayout({ scope, widgets: updated });
    } catch {
      // rollback or notify
    }
  };

  const handleAddWidget = async (newWidget) => {
    const existingIndex = widgets.findIndex((w) => w.key === newWidget.key);
    let updated;

    if (existingIndex >= 0) {
      updated = [...widgets];
      updated[existingIndex] = { ...updated[existingIndex], visible: true };
    } else {
      updated = [
        ...widgets,
        {
          id: `w-${newWidget.key}`,
          key: newWidget.key,
          type: newWidget.type || 'list',
          title: newWidget.title,
          cols: 1,
          rows: 1,
          order: widgets.length + 1,
          visible: true
        }
      ];
    }

    setWidgets(updated);
    setAvailableCount((prev) => Math.max(prev - 1, 0));

    try {
      await dashboardService.updateLayout({ scope, widgets: updated });
    } catch {
      // rollback or notify
    }
  };

  return (
    <div className="dashboard-page">
      {/* 1. Header Banner & Context */}
      <div className="dashboard-header-banner">
        <div className="dashboard-greeting-block">
          <h1 className="dashboard-greeting-text">{greeting}</h1>
          <p className="dashboard-greeting-sub">
            Monitor real-time drawing deliverables, site logs, and pending approvals.
          </p>
        </div>

        {/* 2. Control Row: Scope toggle (left), Lock & +19 Widget Picker (right) */}
        <div className="dashboard-control-bar">
          <div className="control-left">
            <SegmentedToggle
              size="md"
              options={scopeOptions}
              value={scope}
              onChange={setScope}
            />
          </div>

          <div className="control-right">
            <IconButton
              icon={isLocked ? Lock : Unlock}
              variant="warm"
              size="md"
              onClick={handleToggleLock}
              title={isLocked ? MESSAGES.DASHBOARD.LOCK_TOOLTIP_LOCKED : MESSAGES.DASHBOARD.LOCK_TOOLTIP_UNLOCKED}
              ariaLabel={isLocked ? 'Unlock dashboard layout' : 'Lock dashboard layout'}
            />

            <WidgetPicker
              availableCount={availableCount}
              onAddWidget={handleAddWidget}
            />
          </div>
        </div>
      </div>

      {/* 3. Main Widget Grid */}
      <div className="dashboard-grid-area">
        {loading ? (
          <div className="dashboard-skeleton-grid">
            <Skeleton variant="rect" height="340px" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Skeleton variant="rect" height="160px" />
              <Skeleton variant="rect" height="160px" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Skeleton variant="rect" height="160px" />
              <Skeleton variant="rect" height="160px" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Skeleton variant="rect" height="72px" />
              <Skeleton variant="rect" height="72px" />
              <Skeleton variant="rect" height="72px" />
              <Skeleton variant="rect" height="72px" />
            </div>
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLayout} />
        ) : (
          <WidgetGrid
            widgets={widgets}
            scope={scope}
            isLocked={isLocked}
            onHideWidget={handleHideWidget}
            onRemoveWidget={handleRemoveWidget}
          />
        )}
      </div>
    </div>
  );
}
