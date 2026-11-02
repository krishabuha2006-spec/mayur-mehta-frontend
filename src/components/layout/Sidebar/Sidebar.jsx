import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ListTodo,
  FileCheck2,
  ClipboardList,
  Layers,
  HardDrive,
  Contact,
  Users,
  BarChart3,
  Settings2,
  Home,
  FolderKanban,
  CheckSquare,
  FileText,
  BookUser,
  Settings,
  HelpCircle,
  CreditCard,
  ChevronDown,
  X
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { MayurMehtaLogo } from '../../common/MayurMehtaLogo/MayurMehtaLogo';
import { ROUTES } from '../../../constants/routes';
import { APP_NAVIGATION } from '../../../constants/navigation';
import './Sidebar.css';

const ICON_MAP = {
  // Primary Architectural Studio Icons
  LayoutDashboard,
  Building2,
  ListTodo,
  FileCheck2,
  ClipboardList,
  Layers,
  HardDrive,
  Contact,
  Users,
  CreditCard,
  BarChart3,
  Settings2,

  // Fallbacks & Aliases
  Home: LayoutDashboard,
  FolderKanban: Building2,
  CheckSquare: ListTodo,
  FileText: ClipboardList,
  BookUser: Contact,
  Settings: Settings2,
  HelpCircle
};

export function Sidebar({
  expanded = false,
  onToggleExpand,
  mobileOpen = false,
  onCloseMobile
}) {
  const { navigation, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [activeFlyout, setActiveFlyout] = useState(null);

  // Merge navigation with default APP_NAVIGATION to guarantee sub-items (children) exist
  const baseNav = (navigation && navigation.length > 0) ? navigation : APP_NAVIGATION;
  const mergedNav = baseNav.map((item) => {
    const defaultItem = APP_NAVIGATION.find(
      (d) => d.id === item.id || d.route === item.route || d.label === item.label
    );
    return {
      ...item,
      label: defaultItem?.label || item.label,
      children: item.children || defaultItem?.children || null
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
    // If user clicked directly on the link row
    if (location.pathname !== item.route && !item.children?.some(c => location.pathname === c.route.split('?')[0])) {
      // Navigate to the primary child or base route and open ONLY this dropdown
      navigate(item.children?.[0]?.route || item.route);
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
          <div
            className={`sidebar-nav-link sidebar-dropdown-toggle ${isCurrentActive ? 'active' : ''}`}
            onClick={(e) => handleParentNavClick(item, isOpen, e)}
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
          >
            <IconComponent size={20} strokeWidth={1.8} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">{item.label}</span>
            <span
              className="sidebar-chevron-wrap"
              onClick={(e) => toggleDropdown(item.id, isOpen, e)}
              role="button"
              tabIndex={0}
              aria-label={`Toggle ${item.label} submenu`}
            >
              <ChevronDown
                size={15}
                className={`sidebar-dropdown-chevron ${isOpen ? 'chevron-rotated' : ''}`}
              />
            </span>
          </div>

          {isOpen && (
            <ul className="sidebar-submenu-list">
              {item.children.map((child) => {
                const isChildActive =
                  currentFullUrl === child.route ||
                  (location.search === '' && child.route.endsWith('?view=list') && location.pathname === item.route) ||
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
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li
        key={item.id || item.route}
        className={`sidebar-nav-item ${isCurrentActive ? 'parent-active' : ''}`}
        onMouseEnter={(e) => handleMouseEnter(item, e)}
        onMouseLeave={handleMouseLeave}
      >
        <NavLink
          to={item.route}
          onClick={() => {
            handleMouseLeave();
            if (onCloseMobile) onCloseMobile();
          }}
          className={({ isActive }) =>
            `sidebar-nav-link ${isActive ? 'active' : ''}`
          }
          aria-label={item.label}
        >
          <IconComponent size={20} strokeWidth={1.8} className="sidebar-nav-icon" />
          <span className="sidebar-nav-label">{item.label}</span>

          {!expanded && (
            <span className="sidebar-inline-tooltip" role="tooltip" aria-hidden="true">
              {item.label}
            </span>
          )}
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
          title={expanded ? 'Click logo to collapse sidebar' : 'Click logo to expand sidebar'}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse sidebar menu' : 'Expand sidebar menu'}
        >
          <div className="sidebar-brand-mark" title="Mayur Mehta Design">
            <MayurMehtaLogo variant="symbol" size="sidebar" color="taupe" />
          </div>

          {expanded && (
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">MAYUR MEHTA</span>
              <span className="sidebar-brand-subtitle">design</span>
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
                  {child.label}
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
