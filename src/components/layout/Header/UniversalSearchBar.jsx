import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Building2,
  CheckCircle2,
  Users,
  FolderArchive,
  CreditCard,
  Settings,
  FileText,
  Compass,
  X,
  CornerDownLeft
} from 'lucide-react';
import { ROUTES } from '../../../constants/routes';
import { projectService } from '../../../services/projectService';
import { taskService } from '../../../services/taskService';
import { teamService } from '../../../services/teamService';
import './UniversalSearchBar.css';

const QUICK_PAGES = [
  { id: 'p_dash', title: 'Studio Dashboard', category: 'Pages', route: ROUTES.DASHBOARD, icon: Compass, sub: 'Practice pipeline & studio vitals' },
  { id: 'p_proj', title: 'Projects Registry', category: 'Pages', route: ROUTES.PROJECTS, icon: Building2, sub: 'All architectural & interior design commissions' },
  { id: 'p_tasks', title: 'Task Manager & Deadlines', category: 'Pages', route: ROUTES.TASKS, icon: CheckCircle2, sub: 'Milestone tasks, Kanban & drawing delivery calendar' },
  { id: 'p_draw', title: 'Drawings & Documents Drive', category: 'Pages', route: ROUTES.STORAGE, icon: FolderArchive, sub: 'GFC drawings, submissions & specifications' },
  { id: 'p_dir', title: 'Client CRM & Directory', category: 'Pages', route: ROUTES.DIRECTORY, icon: Users, sub: 'Client pipeline & consultant roster' },
  { id: 'p_team', title: 'Studio Team & Seats', category: 'Pages', route: ROUTES.TEAM, icon: Users, sub: 'Team members, roles & seat allocation' },
  { id: 'p_bill', title: 'Billing & Invoices', category: 'Pages', route: ROUTES.BILLING, icon: CreditCard, sub: 'Milestone invoices, proposals & payments' },
  { id: 'p_rep', title: 'Practice Reports', category: 'Pages', route: ROUTES.REPORTS, icon: FileText, sub: 'Project profitability & phase progress' },
  { id: 'p_sett', title: 'Studio Settings & Branding', category: 'Pages', route: ROUTES.SETTINGS, icon: Settings, sub: 'Firm profile, company logo & permissions' }
];

export function UniversalSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Dynamic live search cache
  const [liveProjects, setLiveProjects] = useState([]);
  const [liveTasks, setLiveTasks] = useState([]);
  const [liveMembers, setLiveMembers] = useState([]);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Load real data from live backend endpoints on first focus/open
  const loadDynamicSearchData = async () => {
    if (hasLoadedData) return;
    try {
      const [projRes, taskRes, teamRes] = await Promise.allSettled([
        projectService.getProjects({ limit: 50 }),
        taskService.getTasks({ limit: 50 }),
        teamService.getDirectory()
      ]);

      if (projRes.status === 'fulfilled' && projRes.value?.data) {
        setLiveProjects(Array.isArray(projRes.value.data) ? projRes.value.data : []);
      }
      if (taskRes.status === 'fulfilled' && taskRes.value?.data) {
        setLiveTasks(Array.isArray(taskRes.value.data) ? taskRes.value.data : []);
      }
      if (teamRes.status === 'fulfilled' && Array.isArray(teamRes.value)) {
        setLiveMembers(teamRes.value);
      }
      setHasLoadedData(true);
    } catch {
      // Graceful fallback
    }
  };

  // 100% Dynamic results mapped strictly from live database records
  const filteredResults = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) {
      return QUICK_PAGES;
    }

    // Dynamic live projects
    const matchedProjects = liveProjects
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const code = (p.projectCode || p.code || '').toLowerCase();
        const city = (p.site?.city || p.city || '').toLowerCase();
        const client = (p.client?.name || p.clientName || '').toLowerCase();
        return name.includes(clean) || code.includes(clean) || city.includes(clean) || client.includes(clean);
      })
      .map((p) => ({
        id: `proj_${p._id || p.id}`,
        title: p.name || 'Untitled Project',
        category: 'Project',
        route: ROUTES.PROJECTS,
        icon: Building2,
        sub: `${p.projectCode || p.code || 'Commission'} • ${p.site?.city || p.city || 'Studio'} (${p.status || 'Active'})`
      }));

    // Dynamic live tasks
    const matchedTasks = liveTasks
      .filter((t) => {
        const title = (t.title || t.name || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        return title.includes(clean) || desc.includes(clean);
      })
      .map((t) => ({
        id: `task_${t._id || t.id}`,
        title: t.title || t.name || 'Untitled Task',
        category: 'Task',
        route: ROUTES.TASKS,
        icon: CheckCircle2,
        sub: `Priority: ${t.priority || 'MEDIUM'} • Status: ${t.status || 'Pending'}`
      }));

    // Dynamic live team members
    const matchedMembers = liveMembers
      .filter((m) => {
        const name = (m.name || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        return name.includes(clean) || email.includes(clean);
      })
      .map((m) => ({
        id: `usr_${m._id || m.id}`,
        title: m.name || 'Team Member',
        category: 'Team',
        route: ROUTES.TEAM,
        icon: Users,
        sub: `${m.designation || 'Staff'} • ${m.email || ''}`
      }));

    // Navigation pages
    const matchedPages = QUICK_PAGES.filter(
      (p) => p.title.toLowerCase().includes(clean) || p.sub.toLowerCase().includes(clean)
    );

    return [...matchedProjects, ...matchedTasks, ...matchedMembers, ...matchedPages];
  }, [query, liveProjects, liveTasks, liveMembers]);

  // Keep selectedIndex within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Keyboard navigation within the search input
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filteredResults.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % Math.max(filteredResults.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredResults[selectedIndex];
      if (target) {
        navigate(target.route);
        setIsOpen(false);
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (item) => {
    navigate(item.route);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="header-search-center" ref={containerRef}>
      {/* Real Typable Input */}
      <div className={`header-search-input-wrapper ${isOpen ? 'is-focused' : ''}`}>
        <Search size={15} className="header-search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="header-search-input"
          placeholder="Search projects, drawings, tasks, clients..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            loadDynamicSearchData();
          }}
          onKeyDown={handleKeyDown}
          aria-label="Universal Search across studio records"
          autoComplete="off"
          spellCheck="false"
        />

        {query ? (
          <button
            type="button"
            className="header-search-clear-btn"
            onClick={handleClear}
            title="Clear search"
            aria-label="Clear search query"
          >
            <X size={13} />
          </button>
        ) : (
          <kbd className="header-search-shortcut">Ctrl K</kbd>
        )}
      </div>

      {/* Floating Live Results Dropdown */}
      {isOpen && (
        <div className="header-search-dropdown" role="listbox">
          <div className="search-dropdown-header">
            <span>{query ? 'Search Results' : 'Quick Navigation'}</span>
            <span className="search-dropdown-results-count">
              {filteredResults.length} {filteredResults.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          <div className="search-dropdown-scroll">
            {filteredResults.length === 0 ? (
              <div className="search-dropdown-empty">
                <div>No records matching "{query}"</div>
                <span style={{ fontSize: '0.72rem', color: '#A39889' }}>
                  Try searching for project name, client, or drawing task
                </span>
              </div>
            ) : (
              filteredResults.map((item, idx) => {
                const IconComponent = item.icon || Building2;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    className={`search-dropdown-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="search-item-icon-box">
                      <IconComponent size={16} />
                    </div>
                    <div className="search-item-content">
                      <div className="search-item-title">{item.title}</div>
                      <div className="search-item-sub">{item.sub}</div>
                    </div>
                    <span className="search-item-badge">{item.category}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="search-dropdown-footer">
            <div className="search-footer-hint">
              <span>Navigate with</span>
              <kbd className="search-footer-kbd">↑</kbd>
              <kbd className="search-footer-kbd">↓</kbd>
            </div>
            <div className="search-footer-hint">
              <span>Select</span>
              <kbd className="search-footer-kbd">
                <CornerDownLeft size={10} style={{ display: 'inline', verticalAlign: '-1px' }} /> Enter
              </kbd>
            </div>
            <div className="search-footer-hint">
              <span>Close</span>
              <kbd className="search-footer-kbd">Esc</kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UniversalSearchBar;

