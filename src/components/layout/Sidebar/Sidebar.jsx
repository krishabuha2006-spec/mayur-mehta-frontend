import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  X
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { MayurMehtaLogo } from '../../common/MayurMehtaLogo/MayurMehtaLogo';
import { ROUTES } from '../../../constants/routes';
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
  const [hoveredTooltip, setHoveredTooltip] = useState(null);

  // Filter navigation items by role/permission and sort by order
  const filteredNav = (navigation || [])
    .filter((item) => hasPermission(item.permission))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Separate main workflow items from bottom utilities (Settings)
  const mainNav = filteredNav.filter((item) => !['Settings', 'Settings2'].includes(item.iconKey));
  const bottomNav = filteredNav.filter((item) => ['Settings', 'Settings2'].includes(item.iconKey));

  const handleMouseEnter = (item, e) => {
    if (expanded) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      label: item.label,
      top: rect.top + rect.height / 2
    });
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
  };

  const renderNavItem = (item) => {
    const IconComponent = ICON_MAP[item.iconKey] || HelpCircle;

    return (
      <li
        key={item.id || item.route}
        className="sidebar-nav-item"
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

          {/* Inline CSS Tooltip (Desktop collapsed fallback) */}
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

      {/* Floating High-Z-Index Tooltip: Appears immediately on hover when collapsed */}
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
    </>
  );
}

export default Sidebar;
