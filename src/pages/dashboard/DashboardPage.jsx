import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Unlock,
  Building2,
  CheckCircle2,
  Users,
  CreditCard,
  ArrowUpRight,
  Plus,
  Layers,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useGreeting } from '../../hooks/useGreeting';
import { SegmentedToggle } from '../../components/common/SegmentedToggle/SegmentedToggle';
import { IconButton } from '../../components/common/IconButton/IconButton';
import { WidgetGrid } from '../../components/dashboard/WidgetGrid/WidgetGrid';
import { WidgetPicker } from '../../components/dashboard/WidgetPicker/WidgetPicker';
import { Skeleton } from '../../components/common/Skeleton/Skeleton';
import { ErrorState } from '../../components/common/ErrorState/ErrorState';
import { Badge } from '../../components/common/Badge/Badge';
import { dashboardService } from '../../services/dashboardService';
import { DASHBOARD_SCOPES } from '../../constants/enums';
import { MESSAGES } from '../../constants/messages';
import { ROUTES } from '../../constants/routes';
import { TenantStudioAnalytics } from './TenantStudioAnalytics';
import './DashboardPage.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, company, subscription, hasPermission } = useAuth();
  const greeting = useGreeting(user?.firstName || 'Principal');

  const [scope, setScope] = useState(DASHBOARD_SCOPES.USER);
  const [widgets, setWidgets] = useState([]);
  const [isLocked, setIsLocked] = useState(true);
  const [availableCount, setAvailableCount] = useState(19);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Studio Real-Time Aggregate Metrics directly from live backend endpoints
  const [metrics, setMetrics] = useState({
    activeProjects: 0,
    totalProjects: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    totalTasks: 0,
    seatsUsed: 1,
    seatLimit: 10,
    plan: 'FREE',
    storageUsedGB: 0,
    storageQuotaGB: 5
  });

  const canViewTeamScope = hasPermission('dashboard:team_scope');

  const scopeOptions = [
    { label: MESSAGES.DASHBOARD.USER_SCOPE, value: DASHBOARD_SCOPES.USER },
    ...(canViewTeamScope ? [{ label: MESSAGES.DASHBOARD.TEAM_SCOPE, value: DASHBOARD_SCOPES.TEAM }] : [])
  ];

  const fetchLayoutAndMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [layoutData, summaryData] = await Promise.allSettled([
        dashboardService.getWidgetsLayout(scope),
        dashboardService.getSummaryMetrics()
      ]);

      if (layoutData.status === 'fulfilled' && layoutData.value) {
        setWidgets(layoutData.value.widgets || []);
        setIsLocked(layoutData.value.isLocked !== undefined ? layoutData.value.isLocked : true);
        setAvailableCount(layoutData.value.availableCount || 19);
      }

      if (summaryData.status === 'fulfilled' && summaryData.value) {
        setMetrics(summaryData.value);
      }
    } catch {
      setError(MESSAGES.APP.NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchLayoutAndMetrics();
  }, [fetchLayoutAndMetrics]);

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
      {/* 1. Header Banner & Architectural Studio Identity */}
      <div className="dashboard-header-banner">
        <div className="dashboard-greeting-block">
          <h1 className="dashboard-greeting-text">{greeting}</h1>
          <p className="dashboard-greeting-sub">
            Real-time architectural practice overview: project delivery pipeline, drawings approvals & team utilization.
          </p>
        </div>

        {/* 2. Control Row: Scope toggle (left), Lock & Widget Picker (right) */}
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

      {/* 2. Executive Architectural Practice KPI Ribbon */}
      <div className="dashboard-kpi-ribbon">
        {/* KPI 1: Active Projects */}
        <div className="kpi-card" onClick={() => navigate(ROUTES.PROJECTS)} role="button" tabIndex={0}>
          <div className="kpi-card-header">
            <div className="kpi-icon-box kpi-icon-projects">
              <Building2 size={20} />
            </div>
            <ArrowUpRight size={16} className="kpi-arrow" />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Active Studio Projects</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{metrics.activeProjects}</span>
              <span className="kpi-subvalue">/ {metrics.totalProjects} Total</span>
            </div>
          </div>
          <div className="kpi-footer">
            <span className="kpi-link-text">Browse Projects Pipeline →</span>
          </div>
        </div>

        {/* KPI 2: Pending Tasks & Deliverables */}
        <div className="kpi-card" onClick={() => navigate(ROUTES.TASKS)} role="button" tabIndex={0}>
          <div className="kpi-card-header">
            <div className="kpi-icon-box kpi-icon-tasks">
              <CheckCircle2 size={20} />
            </div>
            <ArrowUpRight size={16} className="kpi-arrow" />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Pending Deliverables</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{metrics.pendingTasks}</span>
              {metrics.overdueTasks > 0 ? (
                <span className="kpi-alert-pill">{metrics.overdueTasks} Overdue</span>
              ) : (
                <span className="kpi-subvalue">On Track</span>
              )}
            </div>
          </div>
          <div className="kpi-footer">
            <span className="kpi-link-text">Open Task Schedule →</span>
          </div>
        </div>

        {/* KPI 3: Studio Team & Seat Capacity */}
        <div className="kpi-card" onClick={() => navigate(ROUTES.TEAM)} role="button" tabIndex={0}>
          <div className="kpi-card-header">
            <div className="kpi-icon-box kpi-icon-team">
              <Users size={20} />
            </div>
            <ArrowUpRight size={16} className="kpi-arrow" />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Team & Seat Capacity</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{metrics.seatsUsed}</span>
              <span className="kpi-subvalue">/ {metrics.seatLimit} Allocated</span>
            </div>
          </div>
          <div className="kpi-footer">
            <span className="kpi-link-text">Manage Team Directory →</span>
          </div>
        </div>

        {/* KPI 4: Practice Plan & Subscription Tier */}
        <div className="kpi-card" onClick={() => navigate(ROUTES.BILLING)} role="button" tabIndex={0}>
          <div className="kpi-card-header">
            <div className="kpi-icon-box kpi-icon-billing">
              <CreditCard size={20} />
            </div>
            <ArrowUpRight size={16} className="kpi-arrow" />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">Subscription Tier</span>
            <div className="kpi-value-row">
              <span className="kpi-value" style={{ fontSize: '1.4rem', textTransform: 'capitalize' }}>
                {metrics.plan === 'PAID' ? 'Pro Tier' : 'Free Tier'}
              </span>
              <Badge variant={metrics.plan === 'PAID' ? 'primary' : 'outline'} size="sm">
                Active
              </Badge>
            </div>
          </div>
          <div className="kpi-footer">
            <span className="kpi-link-text">View Plan & Invoices →</span>
          </div>
        </div>
      </div>

      {/* 3. Architectural Practice Delivery Analytics & Quality Declaration */}
      <TenantStudioAnalytics
        projects={metrics.projects || []}
        tasks={metrics.tasks || []}
        projectsCount={metrics.activeProjects}
        tasksCount={metrics.totalTasks}
        teamCount={metrics.seatsUsed}
        plan={metrics.plan === 'PAID' ? 'Pro Tier' : 'Free Tier'}
      />

      {/* 4. Main Dynamic Widget Grid Area */}
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
          <ErrorState message={error} onRetry={fetchLayoutAndMetrics} />
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

export default DashboardPage;
