import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Filter,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  Calendar,
  Kanban as KanbanIcon,
  List as ListIcon,
  Play,
  Square,
  CheckSquare,
  MessageSquare,
  Send,
  Timer,
  RotateCcw,
  Layers,
  UserCheck,
  X
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { Drawer } from '../../components/common/Drawer/Drawer';
import { Toast } from '../../components/common/Toast/Toast';
import { formatDate } from '../../utils/formatDate';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import { teamService } from '../../services/teamService';
import './TasksPage.css';

const KANBAN_COLUMNS = [
  { id: 'TODO', label: 'To Do', color: 'var(--primary)', match: ['TODO', 'PENDING', 'NOT_STARTED'] },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'var(--warning)', match: ['IN_PROGRESS'] },
  { id: 'IN_REVIEW', label: 'Review & Approvals', color: 'var(--info)', match: ['IN_REVIEW', 'REVIEW'] },
  { id: 'DONE', label: 'Completed', color: 'var(--success)', match: ['DONE', 'COMPLETED'] },
  { id: 'CANCELLED', label: 'Cancelled', color: '#9E9286', match: ['CANCELLED', 'CANCELED'] }
];

export function TasksPage() {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban' | 'calendar' | 'trash'
  const [tasks, setTasks] = useState([]);
  const [trashTasks, setTrashTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'in_progress' | 'today' | 'completed' | 'my' | 'trash'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [taskFormErrors, setTaskFormErrors] = useState({});
  const [toast, setToast] = useState(null);

  // Summary Metrics from GET /tasks/summary
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    inProgress: 0,
    overdue: 0,
    completed: 0
  });

  // Task Details Drawer state
  const [selectedTask, setSelectedTask] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Dynamic dropdown options
  const [projectOptions, setProjectOptions] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');

  // Month Calendar Grid State & Navigation
  const [calendarDate, setCalendarDate] = useState(new Date());

  const handlePrevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  // Helper to format a Date or string to local 'YYYY-MM-DD'
  const toLocalDateKey = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return null;
    const yr = dateObj.getFullYear();
    const mo = String(dateObj.getMonth() + 1).padStart(2, '0');
    const da = String(dateObj.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch Task Summary (GET /tasks/summary)
  const fetchTaskSummary = useCallback(async () => {
    try {
      const summary = await taskService.getTasksSummary();
      if (summary) {
        setSummaryStats({
          total: summary.total || summary.totalTasks || 0,
          inProgress: summary.inProgress || 0,
          overdue: summary.overdue || 0,
          completed: summary.completed || 0
        });
      }
    } catch (err) {
      console.warn('Summary load notice:', err.message);
    }
  }, []);

  // 2. Fetch Tasks (GET /tasks or GET /projects/{projectId}/tasks or GET /tasks/my)
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let taskList = [];

      if (activeTab === 'trash') {
        // GET /tasks/trash
        const res = await taskService.getTrashTasks();
        taskList = Array.isArray(res) ? res : (res?.data || []);
        setTrashTasks(taskList);
        setLoading(false);
        return;
      }

      if (activeTab === 'my') {
        // GET /tasks/my
        const myData = await taskService.getMyTasks();
        const combined = [
          ...(myData?.overdue || []),
          ...(myData?.today || []),
          ...(myData?.thisWeek || []),
          ...(myData?.later || []),
          ...(myData?.noDueDate || [])
        ];
        taskList = combined.length > 0 ? combined : [];
      } else if (selectedProjectFilter) {
        // GET /projects/{projectId}/tasks
        const res = await taskService.getProjectTasks(selectedProjectFilter);
        taskList = Array.isArray(res) ? res : (res?.data || []);
      } else {
        // GET /tasks
        const res = await taskService.getTasks();
        taskList = Array.isArray(res) ? res : (res?.data || []);
      }

      if (taskList.length > 0) {
        const formatted = taskList.map((t, idx) => {
          const rawAssignee = t.assignee?.name || t.assignees?.[0]?.name || (typeof t.assignee === 'string' ? t.assignee : '') || '';
          return {
            id: t.id || t._id || `task_${idx}`,
            title: t.title || t.name || 'Untitled Task',
            project: t.project?.name || t.project?.title || t.projectName || (typeof t.project === 'string' ? t.project : 'General Practice'),
            projectId: t.project?.id || t.project?._id || t.projectId || null,
            assignee: rawAssignee || 'Unassigned',
            assigneeLetter: (rawAssignee?.[0] || 'U').toUpperCase(),
            priority: String(t.priority || 'MEDIUM').toUpperCase(),
            category: t.taskType?.name || t.category || 'Architectural Task',
            dueDate: t.dueDate || null,
            status: t.status || 'TODO',
            checklist: (t.checklist || []).map((c, cIdx) =>
              typeof c === 'string'
                ? { id: `c_${cIdx}`, title: c, text: c, done: false }
                : { id: c.id || c._id || `c_${cIdx}`, title: c.title || c.text || '', text: c.text || c.title || '', done: !!c.done }
            ),
            comments: t.comments || [],
            loggedHours: t.loggedHours || 0
          };
        });
        setTasks(formatted);
      } else {
        // Honest empty zero-state: no synthetic fake data
        setTasks([]);
      }
    } catch (err) {
      console.warn('Backend task fetch notice:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedProjectFilter]);

  useEffect(() => {
    fetchTasks();
    fetchTaskSummary();

    const loadProjects = async () => {
      try {
        const res = await projectService.getProjects();
        const projs = Array.isArray(res) ? res : (res?.data || []);
        if (projs.length > 0) {
          setProjectOptions(
            projs.map((p) => ({
              value: p.id || p._id || p.code || p.title,
              label: p.title || p.name || p.code,
              sublabel: `${p.city || 'Ahmedabad'} • ${p.type || 'Project'}`
            }))
          );
        }
      } catch (err) {
        console.warn('Projects load notice:', err.message);
      }
    };
    loadProjects();

    const loadTeam = async () => {
      try {
        const res = await teamService.getDirectory();
        const users = Array.isArray(res) ? res : (res?.data || res?.users || []);
        if (users.length > 0) {
          setAssigneeOptions(
            users.map((u) => ({
              value: u.id || u._id || u.name,
              label: u.name,
              sublabel: u.designation || u.role || 'Studio Member'
            }))
          );
        }
      } catch (err) {
        console.warn('Team load notice:', err.message);
      }
    };
    loadTeam();
  }, [fetchTasks, fetchTaskSummary]);

  // Timer Tick
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const [newTask, setNewTask] = useState({
    title: '',
    project: '',
    projectId: '',
    assignee: '',
    priority: 'Medium',
    category: 'Working Drawings',
    dueDate: ''
  });

  // 3. Toggle / Change Status (PUT /tasks/{id}/status)
  const toggleTaskStatus = async (t) => {
    const nextStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
    setTasks((prev) =>
      prev.map((item) => (item.id === t.id ? { ...item, status: nextStatus } : item))
    );
    if (selectedTask?.id === t.id) {
      setSelectedTask((prev) => ({ ...prev, status: nextStatus }));
    }

    try {
      await taskService.updateTaskStatus(t.id, nextStatus);
      showToast(`Task status updated to ${nextStatus}`, 'info');
    } catch (err) {
      console.warn('PUT /tasks/{id}/status fallback:', err.message);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => ({ ...prev, status }));
    }

    try {
      await taskService.updateTaskStatus(taskId, status);
      showToast(`Moved to ${status}`, 'success');
    } catch (err) {
      console.warn('PUT /tasks/{id}/status notice:', err.message);
    }
  };

  // 4. Move Task in Kanban (PUT /tasks/{id}/move)
  const handleKanbanMove = async (taskId, targetStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      await taskService.moveTask(taskId, { status: targetStatus });
      showToast(`Task moved to ${targetStatus}`, 'success');
    } catch (err) {
      // Fallback to status update
      await taskService.updateTaskStatus(taskId, targetStatus);
    }
  };

  // 5. Checklist Operations (POST / PATCH / DELETE /tasks/{id}/checklist)
  const handleToggleChecklistItem = async (itemId) => {
    if (!selectedTask) return;
    const item = (selectedTask.checklist || []).find((c) => c.id === itemId);
    const newDoneState = !item?.done;

    const updatedChecklist = (selectedTask.checklist || []).map((c) =>
      c.id === itemId ? { ...c, done: newDoneState } : c
    );
    setSelectedTask((prev) => ({ ...prev, checklist: updatedChecklist }));
    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t))
    );

    try {
      await taskService.updateChecklistItem(selectedTask.id, itemId, { done: newDoneState });
    } catch (err) {
      console.warn('PATCH /tasks/{id}/checklist/{itemId} notice:', err.message);
    }
  };

  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    if (!newChecklistText.trim() || !selectedTask) return;
    const itemTitle = newChecklistText.trim();
    const newItem = {
      id: `chk_${Date.now()}`,
      title: itemTitle,
      text: itemTitle,
      done: false
    };
    const updated = [...(selectedTask.checklist || []), newItem];
    setSelectedTask((prev) => ({ ...prev, checklist: updated }));
    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updated } : t))
    );
    setNewChecklistText('');

    try {
      await taskService.addChecklistItem(selectedTask.id, { title: itemTitle });
      showToast('Subtask checklist item added', 'success');
    } catch (err) {
      console.warn('POST /tasks/{id}/checklist notice:', err.message);
    }
  };

  const handleDeleteChecklistItem = async (itemId) => {
    if (!selectedTask) return;
    const updated = (selectedTask.checklist || []).filter((c) => c.id !== itemId);
    setSelectedTask((prev) => ({ ...prev, checklist: updated }));
    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updated } : t))
    );

    try {
      await taskService.deleteChecklistItem(selectedTask.id, itemId);
      showToast('Subtask removed', 'info');
    } catch (err) {
      console.warn('DELETE /tasks/{id}/checklist/{itemId} notice:', err.message);
    }
  };

  // 6. Delete Task to Trash (DELETE /tasks/{id})
  const handleDeleteTask = async (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }

    try {
      await taskService.deleteTask(taskId);
      showToast('Task moved to trash', 'warning');
    } catch (err) {
      console.warn('DELETE /tasks/{id} notice:', err.message);
    }
  };

  // 7. Restore Task from Trash (POST /tasks/{id}/restore)
  const handleRestoreTask = async (taskId) => {
    try {
      await taskService.restoreTask(taskId);
      setTrashTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast('Task restored successfully', 'success');
      fetchTasks();
    } catch (err) {
      console.warn('POST /tasks/{id}/restore notice:', err.message);
    }
  };

  // 8. Bulk Operations (POST /tasks/bulk)
  const handleBulkAction = async (action, value = null) => {
    if (selectedTasks.length === 0) return;

    let normAction = action;
    let normValue = value;

    if (action === 'status') {
      normAction = 'SET_STATUS';
      normValue = value === 'Completed' ? 'DONE' : (value === 'In Progress' ? 'IN_PROGRESS' : (value || 'DONE'));
      setTasks((prev) =>
        prev.map((t) => (selectedTasks.includes(t.id) ? { ...t, status: normValue } : t))
      );
    } else if (action === 'delete') {
      normAction = 'DELETE';
      setTasks((prev) => prev.filter((t) => !selectedTasks.includes(t.id)));
    }

    try {
      await taskService.bulkTasks({ ids: selectedTasks, action: normAction, value: normValue });
      showToast(`Bulk updated ${selectedTasks.length} tasks`, 'success');
    } catch (err) {
      console.warn('POST /tasks/bulk notice:', err.message);
    } finally {
      setSelectedTasks([]);
    }
  };

  // 9. Comments & Time Logging
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;
    const newComment = {
      author: 'Krisha Buha',
      text: newCommentText.trim(),
      time: 'Just now'
    };
    const updated = [newComment, ...(selectedTask.comments || [])];
    setSelectedTask((prev) => ({ ...prev, comments: updated }));
    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? { ...t, comments: updated } : t))
    );
    setNewCommentText('');
    showToast('Comment posted', 'info');
  };

  const handleLogTimer = () => {
    if (!selectedTask) return;
    const hours = +(timerSeconds / 3600).toFixed(2);
    const newLogged = +((selectedTask.loggedHours || 0) + hours).toFixed(2);
    setSelectedTask((prev) => ({ ...prev, loggedHours: newLogged }));
    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? { ...t, loggedHours: newLogged } : t))
    );
    setIsTimerRunning(false);
    setTimerSeconds(0);
    showToast(`Logged ${hours} hrs to task`, 'success');
  };

  // Filtered Task List
  const filteredTasks = useMemo(() => {
    const listToFilter = activeTab === 'trash' ? trashTasks : tasks;
    return listToFilter.filter((t) => {
      const matchSearch =
        (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.project || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.assignee || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (activeTab === 'today') return matchSearch && t.status !== 'Completed';
      if (activeTab === 'completed') return matchSearch && t.status === 'Completed';
      if (activeTab === 'in_progress') return matchSearch && t.status === 'In Progress';
      return matchSearch;
    });
  }, [tasks, trashTasks, searchTerm, activeTab]);

  // Map tasks to dates for quick day lookup in Calendar view
  const tasksByDate = useMemo(() => {
    const map = {};
    filteredTasks.forEach((t) => {
      const key = toLocalDateKey(t.dueDate);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [filteredTasks]);

  // Generate full month calendar grid cells (Sun-Sat with padding)
  const calendarMonthData = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // 1. Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const dateObj = new Date(year, month - 1, dayNum);
      days.push({
        dayNumber: dayNum,
        date: dateObj,
        isCurrentMonth: false,
        isToday: false,
        dateKey: toLocalDateKey(dateObj)
      });
    }

    // 2. Current month days
    const today = new Date();
    const isThisMonth = today.getFullYear() === year && today.getMonth() === month;

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      days.push({
        dayNumber: d,
        date: dateObj,
        isCurrentMonth: true,
        isToday: isThisMonth && today.getDate() === d,
        dateKey: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      });
    }

    // 3. Next month padding days to complete full week rows
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let nextD = 1; nextD <= remainingCells; nextD++) {
      const dateObj = new Date(year, month + 1, nextD);
      days.push({
        dayNumber: nextD,
        date: dateObj,
        isCurrentMonth: false,
        isToday: false,
        dateKey: toLocalDateKey(dateObj)
      });
    }

    return days;
  }, [calendarDate]);

  // Number of tasks scheduled in active calendar month
  const monthTotalTasks = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    return filteredTasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
    }).length;
  }, [filteredTasks, calendarDate]);

  // 10. Create Task Submit (POST /projects/{projectId}/tasks or POST /tasks)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!newTask.title.trim()) {
      errors.title = 'Task title is required';
    } else if (newTask.title.trim().length < 2) {
      errors.title = 'Task title must be at least 2 characters';
    }
    if (!newTask.projectId && !projectOptions[0]?.value) {
      errors.projectId = 'Please select a project for this task';
    }

    if (Object.keys(errors).length > 0) {
      setTaskFormErrors(errors);
      showToast('Please correct highlighted fields', 'error');
      return;
    }
    setTaskFormErrors({});

    const selectedProjId = newTask.projectId || projectOptions[0]?.value;
    const selectedProj = projectOptions.find((p) => p.value === selectedProjId);
    const cleanPriority = String(newTask.priority || 'MEDIUM').toUpperCase();
    const created = {
      id: `task_${Date.now()}`,
      title: newTask.title.trim(),
      project: selectedProj?.label || newTask.project || 'General Practice',
      projectId: selectedProjId,
      assignee: newTask.assignee || 'Unassigned',
      assigneeLetter: (newTask.assignee?.[0] || 'U').toUpperCase(),
      priority: cleanPriority,
      category: newTask.category || 'Working Drawings',
      dueDate: newTask.dueDate || null,
      status: 'TODO',
      checklist: [],
      comments: [],
      loggedHours: 0
    };

    setTasks((prev) => [created, ...prev]);
    setCreateModalOpen(false);

    try {
      await taskService.createTask({
        title: created.title,
        projectId: created.projectId,
        priority: cleanPriority,
        dueDate: created.dueDate,
        assignees: newTask.assigneeId ? [newTask.assigneeId] : undefined
      });
      showToast('Task created and scheduled in backend', 'success');
      fetchTasks();
    } catch (err) {
      console.warn('Task create notice:', err.message);
      showToast('Task created locally', 'info');
    }

    setNewTask({
      title: '',
      project: '',
      projectId: '',
      assignee: '',
      assigneeId: '',
      priority: 'MEDIUM',
      category: 'Working Drawings',
      dueDate: ''
    });
  };

  return (
    <div className="tasks-page-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 1000 }}>
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* 1. Header Row with View Switcher */}
      <div className="tasks-title-row">
        <div>
          <h1 className="tasks-heading">Task Manager</h1>
          <p className="tasks-subheading">
            Track drawing deadlines, revisions, site milestones, checklists, and billable time.
          </p>
        </div>

        <div className="tasks-header-actions">
          {/* View Mode Switcher */}
          <div className="tasks-view-toggle">
            <button
              type="button"
              className={`view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <ListIcon size={14} /> <span>List</span>
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'kanban' ? 'is-active' : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              <KanbanIcon size={14} /> <span>Kanban</span>
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'calendar' ? 'is-active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              <Calendar size={14} /> <span>Calendar</span>
            </button>
          </div>

          <Button size="sm" variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
            New Task
          </Button>
        </div>
      </div>

      {/* 2. Status Segmented Tabs + Search + Project Filter */}
      <div className="tasks-tabs-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div className="tasks-tabs-container">
          {[
            { id: 'all', label: 'All Tasks', count: tasks.length },
            { id: 'in_progress', label: 'In Progress', count: tasks.filter((t) => t.status === 'In Progress').length },
            { id: 'today', label: 'Actionable', count: tasks.filter((t) => t.status !== 'Completed').length },
            { id: 'completed', label: 'Completed', count: tasks.filter((t) => t.status === 'Completed').length },
            { id: 'my', label: 'My Tasks', count: tasks.filter((t) => t.assignee.includes('Krisha')).length },
            { id: 'trash', label: 'Trash', count: trashTasks.length }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tasks-tab-pill ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="tab-count-badge">{tab.count}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {projectOptions.length > 0 && (
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              style={{
                height: '38px',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                background: '#FFFFFF',
                padding: '0 12px',
                fontSize: '0.78rem',
                color: 'var(--text)',
                outline: 'none'
              }}
            >
              <option value="">All Accessible Projects</option>
              {projectOptions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          )}

          <div className="tasks-search-pill">
            <Search size={15} className="tasks-search-icon" />
            <input
              type="text"
              placeholder="Search tasks by title, project, or assignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="tasks-search-input"
            />
          </div>
        </div>
      </div>

      {/* 3. VIEW 1: DATA TABLE (LIST VIEW) */}
      {viewMode === 'list' && (
        <div className="tasks-table-wrapper">
          <table className="tasks-data-table">
            <thead>
              <tr>
                <th className="th-checkbox">
                  <input
                    type="checkbox"
                    className="table-checkbox"
                    checked={selectedTasks.length > 0 && selectedTasks.length === filteredTasks.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTasks(filteredTasks.map((t) => t.id));
                      else setSelectedTasks([]);
                    }}
                  />
                </th>
                <th>Task Title</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Category</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="th-action">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-data-cell">
                    <div className="no-data-container">
                      <AlertCircle size={44} color="var(--primary)" strokeWidth={1.5} />
                      <h3 className="no-data-title">
                        {activeTab === 'trash' ? 'Trash is Empty' : 'No Tasks Found'}
                      </h3>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        {activeTab === 'trash'
                          ? 'No soft-deleted tasks found.'
                          : 'There are currently no tasks matching your selected filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
                  <tr key={t.id} className="task-data-row" onClick={() => setSelectedTask(t)}>
                    <td className="td-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="table-checkbox"
                        checked={selectedTasks.includes(t.id)}
                        onChange={() => {
                          setSelectedTasks((prev) =>
                            prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                          );
                        }}
                      />
                    </td>
                    <td className="td-title-cell">
                      <button
                        type="button"
                        className={`task-check-circle ${t.status === 'Completed' ? 'checked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskStatus(t);
                        }}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <span className={`task-title-text ${t.status === 'Completed' ? 'completed' : ''}`}>
                        {t.title}
                      </span>
                    </td>
                    <td className="td-project">{t.project}</td>
                    <td>
                      <div className="assignee-pill">
                        <span className="assignee-avatar-sm">{t.assigneeLetter}</span>
                        <span>{t.assignee}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`priority-badge priority-${t.priority.toLowerCase()}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td><Badge variant="neutral">{t.category}</Badge></td>
                    <td>
                      <div className="due-date-pill">
                        <Calendar size={13} />
                        <span>{formatDate(t.dueDate)}</span>
                      </div>
                    </td>
                    <td>
                      <Badge
                        variant={
                          t.status === 'Completed'
                            ? 'success'
                            : t.status === 'In Progress'
                            ? 'warning'
                            : t.status === 'Review'
                            ? 'info'
                            : 'primary'
                        }
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td className="td-action" onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {activeTab === 'trash' ? (
                          <button
                            type="button"
                            className="row-btn"
                            title="Restore Task"
                            onClick={() => handleRestoreTask(t.id)}
                          >
                            <RotateCcw size={15} />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="row-btn"
                              title="View details"
                              onClick={() => setSelectedTask(t)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              className="row-btn danger-hover"
                              title="Delete task to trash"
                              onClick={() => handleDeleteTask(t.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. VIEW 2: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="task-kanban-board">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => {
              const normStatus = String(t.status || 'TODO').toUpperCase().replace(/\s+/g, '_');
              return col.id === normStatus || col.match?.includes(normStatus);
            });
            return (
              <div
                key={col.id}
                className="task-kanban-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const droppedTaskId = e.dataTransfer.getData('text/plain');
                  if (droppedTaskId) handleKanbanMove(droppedTaskId, col.id);
                }}
              >
                <div className="task-col-header">
                  <div className="task-col-title-wrap">
                    <span className="task-col-dot" style={{ backgroundColor: col.color }} />
                    <h3 className="task-col-title">{col.label}</h3>
                  </div>
                  <span className="task-col-count">{colTasks.length}</span>
                </div>

                <div className="task-col-cards-list">
                  {colTasks.length === 0 ? (
                    <div className="task-empty-col">No tasks in this lane</div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                        className="task-kanban-card"
                        onClick={() => setSelectedTask(t)}
                        style={{ cursor: 'grab' }}
                      >
                        <div className="task-card-top">
                          <span className={`priority-badge priority-${t.priority.toLowerCase()}`}>
                            {t.priority}
                          </span>
                          <span className="task-project-chip">{t.project}</span>
                        </div>

                        <h4 className="task-card-title">{t.title}</h4>

                        <div className="task-card-meta">
                          <div className="assignee-pill">
                            <span className="assignee-avatar-sm">{t.assigneeLetter}</span>
                            <span>{t.assignee}</span>
                          </div>
                          <span className="task-due-chip">
                            <Calendar size={11} /> {formatDate(t.dueDate)}
                          </span>
                        </div>

                        {t.checklist && t.checklist.length > 0 && (
                          <div className="task-card-checklist-bar">
                            <CheckSquare size={12} />
                            <span>
                              {t.checklist.filter((c) => c.done).length}/{t.checklist.length} subtasks
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. VIEW 3: FULL ARCHITECTURAL MONTH CALENDAR GRID */}
      {viewMode === 'calendar' && (
        <div className="task-calendar-view">
          {/* Calendar Header with Month Navigation */}
          <div className="calendar-grid-header">
            <div className="calendar-nav-left">
              <div className="calendar-month-selector">
                <button
                  type="button"
                  className="cal-nav-btn"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  aria-label="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <h3 className="calendar-month-heading">
                  {calendarDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  type="button"
                  className="cal-nav-btn"
                  onClick={handleNextMonth}
                  title="Next Month"
                  aria-label="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                type="button"
                className="cal-today-btn"
                onClick={handleToday}
                title="Jump to Current Month"
              >
                Today
              </button>
            </div>

            <div className="calendar-nav-right">
              <span className="calendar-count-tag">
                {monthTotalTasks} Scheduled in {calendarDate.toLocaleString('en-US', { month: 'short' })}
              </span>
              <Button
                size="sm"
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setNewTask((prev) => ({
                    ...prev,
                    dueDate: toLocalDateKey(new Date())
                  }));
                  setCreateModalOpen(true);
                }}
              >
                New Task
              </Button>
            </div>
          </div>

          {/* Days of the Week Header Row */}
          <div className="cal-weekdays-row">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="cal-weekday-header">
                {day}
              </div>
            ))}
          </div>

          {/* Full Month Grid Cells (7 columns x 5-6 rows) */}
          <div className="cal-month-grid">
            {calendarMonthData.map((cell) => {
              const dayTasks = tasksByDate[cell.dateKey] || [];
              const isCellToday = cell.isToday;

              return (
                <div
                  key={cell.dateKey + (cell.isCurrentMonth ? '' : '_out')}
                  className={`cal-day-cell ${cell.isCurrentMonth ? 'in-month' : 'out-of-month'} ${isCellToday ? 'is-today' : ''}`}
                  onClick={() => {
                    if (cell.isCurrentMonth) {
                      setNewTask((prev) => ({ ...prev, dueDate: cell.dateKey }));
                      setCreateModalOpen(true);
                    }
                  }}
                  title={cell.isCurrentMonth ? `Click date ${cell.dayNumber} to schedule task` : ''}
                >
                  <div className="cal-day-top-bar">
                    <span className={`cal-day-number ${isCellToday ? 'today-pill' : ''}`}>
                      {cell.dayNumber}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="cal-day-task-count">
                        {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>

                  {/* Tasks Container */}
                  <div className="cal-day-tasks-stack">
                    {dayTasks.slice(0, 3).map((task) => {
                      const isDone = task.status === 'Completed' || task.status === 'DONE';
                      const prio = (task.priority || 'medium').toLowerCase();
                      return (
                        <div
                          key={task.id || task._id}
                          className={`cal-task-item prio-${prio} ${isDone ? 'is-done' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                          }}
                          title={`${task.title} • ${task.project || 'Project'} • Priority: ${task.priority}`}
                        >
                          <span className={`cal-prio-dot dot-${prio}`} />
                          <span className="cal-task-text">{task.title}</span>
                        </div>
                      );
                    })}

                    {dayTasks.length > 3 && (
                      <div
                        className="cal-more-badge"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(dayTasks[3]);
                        }}
                      >
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk Actions Floating Toolbar (POST /tasks/bulk) */}
      {selectedTasks.length > 0 && (
        <div className="tasks-bulk-toolbar">
          <span className="bulk-count-label">{selectedTasks.length} tasks selected</span>
          <div className="bulk-btn-group">
            <button
              type="button"
              className="bulk-action-btn"
              onClick={() => handleBulkAction('status', 'Completed')}
            >
              <CheckCircle2 size={13} />
              <span>Mark Completed</span>
            </button>
            <button
              type="button"
              className="bulk-action-btn"
              onClick={() => handleBulkAction('status', 'In Progress')}
            >
              <Clock size={13} />
              <span>Mark In Progress</span>
            </button>
            <button
              type="button"
              className="bulk-action-btn danger"
              onClick={() => handleBulkAction('delete')}
            >
              <Trash2 size={13} />
              <span>Move to Trash</span>
            </button>
            <button
              type="button"
              className="bulk-action-btn"
              onClick={() => setSelectedTasks([])}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 6. TASK DETAIL DRAWER (Checklists, Comments, Time Tracking) */}
      <Drawer
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title || 'Task Details'}
        subtitle={`${selectedTask?.project || ''} • Assigned to ${selectedTask?.assignee || ''}`}
        width="540px"
      >
        {selectedTask && (
          <div className="task-drawer-content">
            {/* Status & Priority Row */}
            <div className="task-drawer-row">
              <div className="task-drawer-field">
                <label className="drawer-label">Status (PUT /tasks/{'{id}'}/status)</label>
                <div className="task-status-btn-group">
                  {['Pending', 'In Progress', 'Review', 'Completed'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`status-btn ${selectedTask.status === s ? 'is-active' : ''}`}
                      onClick={() => handleStatusChange(selectedTask.id, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Time Tracking Widget */}
            <div className="task-time-widget">
              <div className="time-widget-left">
                <Timer size={18} className="time-icon" />
                <div>
                  <span className="time-title">Time Tracker</span>
                  <p className="time-sub">
                    Logged: <strong>{selectedTask.loggedHours || 0} hrs</strong>
                  </p>
                </div>
              </div>

              <div className="time-widget-right">
                {isTimerRunning ? (
                  <button type="button" className="timer-btn stop" onClick={handleLogTimer}>
                    <Square size={13} />
                    <span>Stop & Log ({Math.floor(timerSeconds / 60)}m {timerSeconds % 60}s)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="timer-btn start"
                    onClick={() => {
                      setIsTimerRunning(true);
                      setTimerSeconds(0);
                    }}
                  >
                    <Play size={13} />
                    <span>Start Timer</span>
                  </button>
                )}
              </div>
            </div>

            {/* Subtask Checklist (POST / PATCH / DELETE /tasks/{id}/checklist) */}
            <div className="task-checklist-section">
              <div className="checklist-header">
                <h4 className="checklist-heading">Subtask Checklist</h4>
                <span className="checklist-stat">
                  {(selectedTask.checklist || []).filter((c) => c.done).length}/
                  {(selectedTask.checklist || []).length} Completed
                </span>
              </div>

              <div className="checklist-items-list">
                {(selectedTask.checklist || []).map((item) => (
                  <div key={item.id} className={`checklist-item-row ${item.done ? 'is-done' : ''}`}>
                    <div className="checklist-left" onClick={() => handleToggleChecklistItem(item.id)}>
                      <button type="button" className="check-box-btn">
                        {item.done ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                      <span className="checklist-text">{item.text}</span>
                    </div>
                    <button
                      type="button"
                      className="checklist-delete-btn"
                      title="Delete subtask"
                      onClick={() => handleDeleteChecklistItem(item.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddChecklistItem} className="add-checklist-form">
                <input
                  type="text"
                  placeholder="Add a subtask item..."
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  className="add-subtask-input"
                />
                <Button size="sm" type="submit" variant="secondary" disabled={!newChecklistText.trim()}>
                  Add
                </Button>
              </form>
            </div>

            {/* Discussion & Comments */}
            <div className="task-comments-section">
              <h4 className="comments-heading">Discussion & Activity</h4>

              <div className="comments-list">
                {(selectedTask.comments || []).map((c, idx) => (
                  <div key={idx} className="comment-card">
                    <div className="comment-top">
                      <strong className="comment-author">{c.author}</strong>
                      <span className="comment-time">{c.time}</span>
                    </div>
                    <p className="comment-text">{c.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} className="add-comment-form">
                <textarea
                  placeholder="Leave a comment or markup note..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="comment-textarea"
                  rows={2}
                />
                <Button size="sm" type="submit" variant="primary" icon={Send} disabled={!newCommentText.trim()}>
                  Post
                </Button>
              </form>
            </div>
          </div>
        )}
      </Drawer>

      {/* 7. Modal: Create New Task (POST /projects/{projectId}/tasks or POST /tasks) */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setTaskFormErrors({});
        }}
        title="Create Architectural Task"
        maxWidth="640px"
      >
        <form onSubmit={handleCreateSubmit} noValidate>
          <div className="form-grid-2">
            <Input
              label="Task Title"
              id="task-title-input"
              placeholder="e.g. Ground floor electrical layout"
              value={newTask.title}
              onChange={(e) => {
                setNewTask({ ...newTask, title: e.target.value });
                if (taskFormErrors.title) setTaskFormErrors((prev) => ({ ...prev, title: '' }));
              }}
              error={taskFormErrors.title}
              required
            />

            <Select
              label="Project"
              id="task-proj-select"
              value={newTask.projectId}
              onChange={(e) => {
                setNewTask({ ...newTask, projectId: e.target.value });
                if (taskFormErrors.projectId) setTaskFormErrors((prev) => ({ ...prev, projectId: '' }));
              }}
              placeholder="Select project..."
              options={projectOptions}
              error={taskFormErrors.projectId}
              required
            />
          </div>

          <div className="form-grid-2">
            <Select
              label="Priority"
              id="task-prio-select"
              value={newTask.priority || 'MEDIUM'}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' }
              ]}
              required
            />

            <Select
              label="Assignee"
              id="task-assignee-select"
              value={newTask.assigneeId || newTask.assignee}
              onChange={(e) => {
                const selected = assigneeOptions.find((a) => a.value === e.target.value);
                setNewTask({
                  ...newTask,
                  assigneeId: e.target.value,
                  assignee: selected ? selected.label : e.target.value
                });
              }}
              placeholder="Assign team member..."
              options={assigneeOptions}
            />
          </div>

          <div className="form-grid-2">
            <Input
              label="Due Date"
              id="task-due-date"
              type="date"
              value={newTask.dueDate ? newTask.dueDate.slice(0, 10) : ''}
              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
            />

            <Input
              label="Estimated Time (Hours)"
              id="task-estimated-hours"
              type="number"
              placeholder="e.g. 4"
              value={newTask.estimatedHours || ''}
              onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
            />
          </div>

          <div className="form-actions-row">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateModalOpen(false);
                setTaskFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TasksPage;
