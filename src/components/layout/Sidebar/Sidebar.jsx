import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Package,
  CheckSquare,
  FileCheck2,
  ClipboardList,
  Layers,
  HardDrive,
  BookUser,
  Users,
  CreditCard,
  TrendingUp,
  Settings2,
  MessageSquare,
  ChevronDown,
  X,
  HelpCircle,
  FolderKanban,
  Building2,
  ListTodo,
  Contact,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { MayurMehtaLogo } from '../../common/MayurMehtaLogo/MayurMehtaLogo';
import { ROUTES } from '../../../constants/routes';
import { APP_NAVIGATION } from '../../../constants/navigation';
import { taskService } from '../../../services/taskService';
import { approvalService } from '../../../services/approvalService';
import './Sidebar.css';

// Unified 24x24 Outline Icons (Stroke Width 1.5, No Fill)
const ICON_MAP = {
  // Primary Reference Outline Icons
  LayoutGrid,
  Package,
  CheckSquare,
  FileCheck2,
  ClipboardList,
  Layers,
  HardDrive,
  BookUser,
  Users,
  CreditCard,
  TrendingUp,
  Settings2,
  MessageSquare,

  // Fallbacks & Aliases
  LayoutDashboard: LayoutGrid,
  Building2: Package,
  FolderKanban: Package,
  ListTodo: CheckSquare,
  Contact: BookUser,
  BarChart3: TrendingUp,
  Settings: Settings2,
  HelpCircle
};

// Global in-memory cache to prevent spamming backend API on route changes
let lastCountsFetchTime = 0;
let cachedCounts = { userTasks: 0, teamTasks: 0, approvals: 0, revisions: 0 };

export function Sidebar({
  expanded = true,
  onToggleExpand,
  mobileOpen = false,
  onCloseMobile
}) {
  const { user, navigation, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [activeFlyout, setActiveFlyout] = useState(null);

  // Dynamic live counters from backend records
  const [dynamicCounts, setDynamicCounts] = useState({
    userTasks: 0,
    teamTasks: 0,
    approvals: 0,
    revisions: 0
  });

  useEffect(() => {
    let isMounted = true;
    async function loadDynamicCounts() {
      // If fetched within 10 seconds, reuse cached counts to avoid tripping rate limits
      if (Date.now() - lastCountsFetchTime < 10000 && lastCountsFetchTime > 0) {
        setDynamicCounts(cachedCounts);
        return;
      }

      try {
        let uCount = 0;
        let tCount = 0;
        let appCount = 0;
        let revCount = 0;

        // 1. Fetch live task summary directly from backend endpoint GET /tasks/summary
        const summary = await taskService.getTasksSummary().catch(() => null);

        if (summary && summary.totalTasks !== undefined) {
          const byStatus = summary.byStatus || {};
          const openCount =
            (byStatus.TODO || 0) +
            (byStatus.IN_PROGRESS || 0) +
            (byStatus.IN_REVIEW || 0);

          tCount = openCount;
          uCount = summary.assignedToMeOpen ?? 0;
          appCount = byStatus.IN_REVIEW ?? 0;
        } else {
          // Fallback to GET /tasks if summary is unavailable
          const tasksRes = await taskService.getTasks({ limit: 100 }).catch(() => []);
          const list = Array.isArray(tasksRes) ? tasksRes : (tasksRes?.data || []);
          const activeTasks = list.filter(
            (t) => t && !['DONE', 'Completed', 'COMPLETED', 'CANCELLED'].includes(t.status)
          );
          tCount = activeTasks.length;
          uCount = activeTasks.filter(
            (t) =>
              t.assigneeId === user?.id ||
              t.assignedTo === user?.id ||
              t.assignedTo?._id === user?.id ||
              t.assignee?._id === user?.id
          ).length;
          appCount = activeTasks.filter((t) => t.status === 'IN_REVIEW' || t.reviewStatus === 'PENDING').length;
        }

        if (isMounted) {
          const fresh = {
            userTasks: uCount,
            teamTasks: tCount,
            approvals: appCount,
            revisions: revCount
          };
          cachedCounts = fresh;
          lastCountsFetchTime = Date.now();
          setDynamicCounts(fresh);
        }
      } catch (err) {
        console.warn('Sidebar dynamic count fetch notice:', err);
      }
    }

    loadDynamicCounts();

    const handleEntityCreated = () => {
      lastCountsFetchTime = 0;
      loadDynamicCounts();
    };
    window.addEventListener('mm:entity-created', handleEntityCreated);

    return () => {
      isMounted = false;
      window.removeEventListener('mm:entity-created', handleEntityCreated);
    };
  }, [user?.id, location.pathname]);

  // Merge navigation with default APP_NAVIGATION to guarantee sub-items and dynamic badges
  const baseNav = (navigation && navigation.length > 0) ? navigation : APP_NAVIGATION;
  const mergedNav = baseNav.map((item) => {
    const defaultItem = APP_NAVIGATION.find(
      (d) => d.id === item.id || d.route === item.route || d.label === item.label
    );
    const children = defaultItem?.children || item.children || null;

    // Dynamically assign real badge counts to child sub-items
    const dynamicChildren = children
      ? children.map((c) => {
          let badge = null;
          if (c.id === 'nav-3-1' || c.label === 'User - Task') {
            badge = dynamicCounts.userTasks > 0 ? { count: String(dynamicCounts.userTasks), variant: 'peach' } : null;
          } else if (c.id === 'nav-3-2' || c.label === 'Team - Task') {
            badge = dynamicCounts.teamTasks > 0 ? { count: String(dynamicCounts.teamTasks), variant: 'mint' } : null;
          } else if (c.id === 'nav-4-1' || c.label === 'Approvals') {
            badge = dynamicCounts.approvals > 0 ? { count: String(dynamicCounts.approvals), variant: 'peach' } : null;
          } else if (c.id === 'nav-4-2' || c.label === 'Revisions') {
            badge = dynamicCounts.revisions > 0 ? { count: String(dynamicCounts.revisions), variant: 'mint' } : null;
          }
          return { ...c, badge };
        })
      : null;

    // Parent badge when collapsed or overall indicator
    let parentBadge = null;
    if (item.id === 'nav-3' || item.label === 'Master Task') {
      parentBadge = dynamicCounts.teamTasks > 0 ? { count: String(dynamicCounts.teamTasks), variant: 'mint' } : null;
    } else if (item.id === 'nav-4' || item.label === 'Pending Request') {
      const totalPending = dynamicCounts.approvals + dynamicCounts.revisions;
      parentBadge = totalPending > 0 ? { count: String(totalPending), variant: 'peach' } : null;
    }

    return {
      ...item,
      label: defaultItem?.label || item.label,
      iconKey: defaultItem?.iconKey || item.iconKey,
      badge: parentBadge,
      children: dynamicChildren
    };
  });

  // Filter navigation items by role/permission and sort by order
  const filteredNav = mergedNav
    .filter((item) => hasPermission(item.permission))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Separate main workflow items from bottom utilities (Settings)
  const mainNav = filteredNav.filter((item) => !['Settings', 'Settings2'].includes(item.iconKey));
  const bottomNav = filteredNav.filter((item) => ['Settings', 'Settings2'].includes(item.iconKey));

  // Auto-expand only the currently active section based on current route (Strict Accordion behavior)
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    let matchedParentId = null;

    filteredNav.forEach((item) => {
      if (item.children && item.children.length > 0) {
        const matchesChild = item.children.some(
          (child) => currentPath === child.route || location.pathname === child.route.split('?')[0]
        );
        if (matchesChild) {
          matchedParentId = item.id;
        }
      }
    });

    if (matchedParentId) {
      setOpenDropdowns({ [matchedParentId]: true });
    } else {
      setOpenDropdowns({});
    }
  }, [location.pathname, location.search]);

  // Accordion toggle: close all other dropdowns, toggle this one
  const toggleDropdown = (itemId, isCurrentlyOpen, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrentlyOpen) {
      setOpenDropdowns({});
    } else {
      setOpenDropdowns({ [itemId]: true });
    }
  };

  const handleParentNavClick = (item, isCurrentlyOpen, e) => {
    // If not on any child of this parent, navigate to the first child and expand
    const isChildActive = item.children?.some(
      (c) => location.pathname === c.route.split('?')[0]
    );

    if (!isChildActive && item.children && item.children.length > 0) {
      navigate(item.children[0].route);
      setOpenDropdowns({ [item.id]: true });
    } else {
      // Toggle dropdown open/close (accordion)
      if (isCurrentlyOpen) {
        setOpenDropdowns({});
      } else {
        setOpenDropdowns({ [item.id]: true });
      }
    }
  };

  const handleMouseEnter = (item, e) => {
    if (expanded) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (item.children && item.children.length > 0) {
      setActiveFlyout({
        item,
        top: rect.top
      });
      setHoveredTooltip(null);
    } else {
      setActiveFlyout(null);
      setHoveredTooltip({
        label: item.label,
        top: rect.top + rect.height / 2
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
  };

  const handleFlyoutMouseLeave = () => {
    setActiveFlyout(null);
  };

  const renderBadge = (badge) => {
    if (!badge || !badge.count) return null;
    const variantClass = `badge-${badge.variant || 'attention'}`;
    return (
      <span className={`sidebar-badge ${variantClass}`}>
        {badge.count}
      </span>
    );
  };

  const renderNavItem = (item) => {
    const IconComponent = ICON_MAP[item.iconKey] || HelpCircle;
    const hasChildren = item.children && item.children.length > 0;
    const currentFullUrl = location.pathname + location.search;

    const isCurrentActive =
      location.pathname === item.route ||
      (hasChildren &&
        item.children.some((c) => currentFullUrl === c.route || location.pathname === c.route.split('?')[0]));

    const isOpen = Boolean(openDropdowns[item.id]);

    if (hasChildren && (expanded || mobileOpen)) {
      return (
        <li
          key={item.id || item.route}
          className={`sidebar-nav-item sidebar-has-dropdown ${isOpen ? 'dropdown-open' : ''} ${isCurrentActive ? 'parent-active' : ''}`}
        >
          {/* Top-Level Expandable Row */}
          <div
            className={`sidebar-nav-link sidebar-dropdown-toggle ${isCurrentActive && !isOpen ? 'parent-standalone-active' : ''}`}
            onClick={(e) => handleParentNavClick(item, isOpen, e)}
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
          >
            <IconComponent size={20} strokeWidth={1.5} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">{item.label}</span>

            {/* Badges on parent when collapsed or highlighted */}
            {renderBadge(item.badge)}

            <span
              className="sidebar-chevron-wrap"
              onClick={(e) => toggleDropdown(item.id, isOpen, e)}
              role="button"
              tabIndex={0}
              aria-label={`Toggle ${item.label} submenu`}
            >
              <ChevronDown
                size={16}
                strokeWidth={1.5}
                className={`sidebar-dropdown-chevron ${isOpen ? 'chevron-rotated' : ''}`}
              />
            </span>
          </div>

          {/* Submenu Tree with 1.5px vertical line & curved elbow connectors */}
          {isOpen && (
            <ul className="sidebar-submenu-list">
              {item.children.map((child) => {
                const isChildActive =
                  currentFullUrl === child.route ||
                  (location.search === '' && child.route.endsWith('?view=list') && location.pathname === item.route) ||
                  (location.search === '' && child.route.endsWith('?tab=my') && location.pathname === item.route) ||
                  (location.search === '' && child.route.endsWith('?tab=all') && location.pathname === item.route) ||
                  (location.search === '' && child.route.endsWith('?tab=pending') && location.pathname === item.route);

                return (
                  <li key={child.id || child.route} className="sidebar-submenu-item">
                    <NavLink
                      to={child.route}
                      onClick={() => {
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`sidebar-submenu-link ${isChildActive ? 'sub-active' : ''}`}
                    >
                      <span className="submenu-label">{child.label}</span>
                      {renderBadge(child.badge)}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      );
    }

    // Top-level standalone item without children OR item in collapsed rail mode
    return (
      <li
        key={item.id || item.route}
        className={`sidebar-nav-item ${isCurrentActive ? 'parent-active' : ''}`}
        onMouseEnter={(e) => handleMouseEnter(item, e)}
        onMouseLeave={handleMouseLeave}
      >
        <NavLink
          to={hasChildren ? (item.children[0]?.route || item.route) : item.route}
          onClick={() => {
            handleMouseLeave();
            if (onCloseMobile) onCloseMobile();
          }}
          className={({ isActive }) =>
            `sidebar-nav-link ${isActive || isCurrentActive ? 'active' : ''}`
          }
          aria-label={item.label}
        >
          <IconComponent size={20} strokeWidth={1.5} className="sidebar-nav-icon" />
          {expanded && <span className="sidebar-nav-label">{item.label}</span>}
          {expanded && renderBadge(item.badge)}
        </NavLink>
      </li>
    );
  };

  return (
    <>
      {mobileOpen && <div className="sidebar-mobile-backdrop" onClick={onCloseMobile} />}

      <aside className={`app-sidebar ${expanded ? 'sidebar-expanded' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        {/* Top Product Logo: Official Mayur Mehta Design Hallmark - Click toggles expand/collapse */}
        <div
          className={`sidebar-logo-container ${expanded ? 'sidebar-logo-expanded' : ''}`}
          onClick={onToggleExpand}
          role="button"
          tabIndex={0}
          title={expanded ? 'Click logo to collapse sidebar (icons only)' : 'Click logo to expand sidebar'}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse sidebar menu' : 'Expand sidebar menu'}
        >
          {expanded ? (
            <div className="sidebar-logo-full" title="Click to collapse sidebar">
              <MayurMehtaLogo size="sidebar" color="charcoal" />
            </div>
          ) : (
            <div className="sidebar-brand-mark" title="Click to expand sidebar">
              <MayurMehtaLogo variant="symbol" size={32} color="charcoal" />
            </div>
          )}

          {mobileOpen && (
            <button
              type="button"
              className="sidebar-mobile-close"
              onClick={(e) => {
                e.stopPropagation();
                if (onCloseMobile) onCloseMobile();
              }}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Dynamic Navigation Items */}
        <nav className="sidebar-nav" aria-label="Main Navigation">
          <ul className="sidebar-nav-list primary-nav-list">
            {mainNav.map(renderNavItem)}
          </ul>

          {bottomNav.length > 0 && (
            <div className="sidebar-bottom-section">
              <div className="sidebar-divider" aria-hidden="true" />
              <ul className="sidebar-nav-list bottom-nav-list">
                {bottomNav.map(renderNavItem)}
              </ul>
            </div>
          )}
        </nav>
      </aside>

      {/* Floating High-Z-Index Tooltip (Standard rail hover) */}
      {!expanded && hoveredTooltip && (
        <div
          className="sidebar-floating-tooltip"
          style={{ top: `${hoveredTooltip.top}px` }}
          role="tooltip"
          aria-hidden="true"
        >
          <span className="tooltip-arrow" aria-hidden="true" />
          <span className="tooltip-text">{hoveredTooltip.label}</span>
        </div>
      )}

      {/* Floating Flyout Popover for Dropdowns when Sidebar is Collapsed on Desktop */}
      {!expanded && activeFlyout && (
        <div
          className="sidebar-rail-flyout"
          style={{ top: `${Math.max(12, activeFlyout.top - 6)}px` }}
          onMouseEnter={() => {}}
          onMouseLeave={handleFlyoutMouseLeave}
        >
          <div className="flyout-header">
            <span className="flyout-title">{activeFlyout.item.label}</span>
          </div>
          <ul className="flyout-submenu-list">
            {(activeFlyout.item.children || []).map((child) => (
              <li key={child.id || child.route} className="flyout-item">
                <NavLink
                  to={child.route}
                  onClick={() => setActiveFlyout(null)}
                  className={({ isActive }) =>
                    `flyout-link ${isActive ? 'active' : ''}`
                  }
                >
                  <span>{child.label}</span>
                  {renderBadge(child.badge)}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default Sidebar;
