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
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { ROUTES } from '../../../constants/routes';
import { projectService } from '../../../services/projectService';
import { taskService } from '../../../services/taskService';
import { teamService } from '../../../services/teamService';
import './UniversalSearchBar.css';

const QUICK_PAGES = [
  { id: 'p_dash', title: 'Dashboard', category: 'Page', route: ROUTES.DASHBOARD, icon: Compass, sub: 'Studio overview & statistics' },
  { id: 'p_proj', title: 'Projects', category: 'Page', route: ROUTES.PROJECTS, icon: Building2, sub: 'Active & archived projects' },
  { id: 'p_tasks', title: 'Tasks & Calendar', category: 'Page', route: ROUTES.TASKS, icon: CheckCircle2, sub: 'Deliverables & milestones' },
  { id: 'p_draw', title: 'Storage & Drive', category: 'Page', route: ROUTES.STORAGE, icon: FolderArchive, sub: 'Drawings & documents' },
  { id: 'p_dir', title: 'Directory & CRM', category: 'Page', route: ROUTES.DIRECTORY, icon: BookOpen, sub: 'Clients & consultants' },
  { id: 'p_team', title: 'Studio Team', category: 'Page', route: ROUTES.TEAM, icon: Users, sub: 'Team members & seats' },
  { id: 'p_bill', title: 'Billing & Invoices', category: 'Page', route: ROUTES.BILLING, icon: CreditCard, sub: 'Invoices & subscription' },
  { id: 'p_rep', title: 'Reports', category: 'Page', route: ROUTES.REPORTS, icon: FileText, sub: 'Practice analytics' },
  { id: 'p_sett', title: 'Settings', category: 'Page', route: ROUTES.SETTINGS, icon: Settings, sub: 'Company & master categories' }
];

const DEFAULT_SHORTCUTS = QUICK_PAGES.slice(0, 5);

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

  // Load initial dataset on focus
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

  // Debounced live search directly against backend for real-time results
  useEffect(() => {
    if (!query.trim()) return;

    const timer = setTimeout(async () => {
      try {
        const q = query.trim();
        const [projRes, taskRes, teamRes] = await Promise.allSettled([
          projectService.getProjects({ search: q, limit: 10 }),
          taskService.getTasks({ search: q, limit: 10 }),
          teamService.getDirectory({ search: q, limit: 10 })
        ]);

        if (projRes.status === 'fulfilled' && projRes.value?.data) {
          const fresh = Array.isArray(projRes.value.data) ? projRes.value.data : [];
          if (fresh.length > 0) {
            setLiveProjects((prev) => {
              const map = new Map();
              [...fresh, ...prev].forEach((item) => {
                const id = item?._id || item?.id;
                if (id) map.set(id, item);
              });
              return Array.from(map.values());
            });
          }
        }

        if (taskRes.status === 'fulfilled' && taskRes.value?.data) {
          const fresh = Array.isArray(taskRes.value.data) ? taskRes.value.data : [];
          if (fresh.length > 0) {
            setLiveTasks((prev) => {
              const map = new Map();
              [...fresh, ...prev].forEach((item) => {
                const id = item?._id || item?.id;
                if (id) map.set(id, item);
              });
              return Array.from(map.values());
            });
          }
        }

        if (teamRes.status === 'fulfilled' && Array.isArray(teamRes.value)) {
          const fresh = teamRes.value;
          if (fresh.length > 0) {
            setLiveMembers((prev) => {
              const map = new Map();
              [...fresh, ...prev].forEach((item) => {
                const id = item?._id || item?.id;
                if (id) map.set(id, item);
              });
              return Array.from(map.values());
            });
          }
        }
      } catch {
        // Silently preserve in-memory matches
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Clean grouped results
  const groupedResults = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) {
      return [
        {
          groupTitle: 'Quick Links',
          items: DEFAULT_SHORTCUTS
        }
      ];
    }

    const groups = [];

    // 1. Projects
    const matchedProjects = liveProjects
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const code = (p.projectCode || p.code || '').toLowerCase();
        const city = (p.site?.city || p.city || '').toLowerCase();
        const client = (p.client?.name || p.clientName || '').toLowerCase();
        return name.includes(clean) || code.includes(clean) || city.includes(clean) || client.includes(clean);
      })
      .slice(0, 5)
      .map((p) => ({
        id: `proj_${p._id || p.id}`,
        title: p.name || 'Untitled Project',
        category: 'Project',
        route: ROUTES.PROJECTS,
        icon: Building2,
        sub: `${p.projectCode || p.code || 'Project'} • ${p.status || 'Active'}`
      }));

    if (matchedProjects.length > 0) {
      groups.push({
        groupTitle: 'Projects',
        items: matchedProjects
      });
    }

    // 2. Tasks
    const matchedTasks = liveTasks
      .filter((t) => {
        const title = (t.title || t.name || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        return title.includes(clean) || desc.includes(clean);
      })
      .slice(0, 5)
      .map((t) => ({
        id: `task_${t._id || t.id}`,
        title: t.title || t.name || 'Untitled Task',
        category: 'Task',
        route: ROUTES.TASKS,
        icon: CheckCircle2,
        sub: `${t.priority || 'Medium'} Priority • ${t.status || 'Pending'}`
      }));

    if (matchedTasks.length > 0) {
      groups.push({
        groupTitle: 'Tasks',
        items: matchedTasks
      });
    }

    // 3. Team Members
    const matchedMembers = liveMembers
      .filter((m) => {
        const name = (m.name || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        const desig = (m.designation || '').toLowerCase();
        return name.includes(clean) || email.includes(clean) || desig.includes(clean);
      })
      .slice(0, 4)
      .map((m) => ({
        id: `usr_${m._id || m.id}`,
        title: m.name || 'Team Member',
        category: 'Team',
        route: ROUTES.TEAM,
        icon: Users,
        sub: `${m.designation || 'Staff'} • ${m.email || ''}`
      }));

    if (matchedMembers.length > 0) {
      groups.push({
        groupTitle: 'Team',
        items: matchedMembers
      });
    }

    // 4. Navigation Pages
    const matchedPages = QUICK_PAGES.filter(
      (p) => p.title.toLowerCase().includes(clean) || p.sub.toLowerCase().includes(clean)
    ).slice(0, 4);

    if (matchedPages.length > 0) {
      groups.push({
        groupTitle: 'Pages',
        items: matchedPages
      });
    }

    return groups;
  }, [query, liveProjects, liveTasks, liveMembers]);

  // Flattened items for keyboard index tracking
  const flatItems = useMemo(() => {
    return groupedResults.flatMap((g) => g.items);
  }, [groupedResults]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Outside click handler
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

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(flatItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % Math.max(flatItems.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flatItems[selectedIndex];
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

  const totalResults = flatItems.length;

  return (
    <div className="header-search-center" ref={containerRef}>
      {/* Search Input Bar */}
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

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div className="header-search-dropdown" role="listbox">
          <div className="search-dropdown-scroll">
            {totalResults === 0 ? (
              <div className="search-dropdown-empty">
                <Search size={22} className="search-empty-icon" />
                <div className="search-empty-title">No matching records found</div>
                <div className="search-empty-hint">Try searching for a project name, task title, or team member</div>
              </div>
            ) : (
              groupedResults.map((group) => (
                <div key={group.groupTitle} className="search-dropdown-group">
                  <div className="search-group-header">
                    <span>{group.groupTitle}</span>
                    {query && <span className="search-group-count">{group.items.length}</span>}
                  </div>

                  <div className="search-group-items">
                    {group.items.map((item) => {
                      const IconComponent = item.icon || Building2;
                      const isSelected = flatItems[selectedIndex]?.id === item.id;
                      const itemFlatIndex = flatItems.findIndex((fi) => fi.id === item.id);

                      return (
                        <div
                          key={item.id}
                          className={`search-dropdown-item ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => {
                            if (itemFlatIndex >= 0) setSelectedIndex(itemFlatIndex);
                          }}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="search-item-icon-box">
                            <IconComponent size={14} />
                          </div>

                          <div className="search-item-content">
                            <div className="search-item-title">{item.title}</div>
                            {item.sub && <div className="search-item-sub">{item.sub}</div>}
                          </div>

                          <span className="search-item-badge">{item.category}</span>
                          <ArrowRight size={13} className="search-item-arrow" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Minimalist studio footer */}
          <div className="search-dropdown-footer">
            <div className="search-footer-left">
              <span>Use <kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
              <span className="search-footer-dot">•</span>
              <span><kbd>↵</kbd> to open</span>
            </div>
            <div className="search-footer-right">
              <kbd>Esc</kbd> to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UniversalSearchBar;
