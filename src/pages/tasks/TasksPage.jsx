import React, { useState, useEffect } from 'react';
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
  Calendar
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { Dropdown } from '../../components/common/Dropdown/Dropdown';
import { formatDate } from '../../utils/formatDate';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import { teamService } from '../../services/teamService';
import { masterService } from '../../services/masterService';
import './TasksPage.css';

export function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Dynamic dropdown options from backend APIs
  const [projectOptions, setProjectOptions] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Fetch tasks from backend (GET /tasks)
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await taskService.getTasks();
      if (res && res.data && res.data.length > 0) {
        // Format tasks from API
        const formatted = res.data.map((t, idx) => ({
          id: t.id || t._id || `task_${idx}`,
          title: t.title || t.name || 'Untitled Task',
          project: t.project || t.projectName || '-',
          assignee: t.assignee || t.assignedTo?.name || 'Unassigned',
          assigneeLetter: (t.assignee?.[0] || t.assignedTo?.name?.[0] || '-').toUpperCase(),
          priority: t.priority || 'Medium',
          category: t.category || 'General',
          dueDate: t.dueDate || '',
          status: t.status || 'Pending'
        }));
        setTasks(formatted);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.warn('Backend task fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Fetch projects for Task Project selector
    const loadProjects = async () => {
      try {
        const res = await projectService.getProjects();
        const projs = Array.isArray(res) ? res : (res?.data || []);
        if (projs.length > 0) {
          setProjectOptions(
            projs.map((p) => ({
              value: p.title || p.name || p.code,
              label: p.title || p.name || p.code,
              sublabel: `${p.city || 'Ahmedabad'} • ${p.type || 'Project'}`
            }))
          );
        }
      } catch (err) {
        console.warn('Backend projects notice:', err.message);
      }
    };
    loadProjects();

    // Fetch live directory for Assignee selector (M1.4 /team/directory)
    const loadTeam = async () => {
      try {
        const res = await teamService.getDirectory();
        const users = Array.isArray(res) ? res : (res?.data || res?.users || []);
        if (users.length > 0) {
          setAssigneeOptions(
            users.map((u) => ({
              value: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
              label: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
              sublabel: u.role || u.title || u.email
            }))
          );
        }
      } catch (err) {
        console.warn('Backend team directory notice:', err.message);
      }
    };
    loadTeam();

    // Fetch master category for Task Types (M1.5 /master/TASK_TYPE)
    const loadTaskTypes = async () => {
      try {
        const items = await masterService.getItemsByType('TASK_TYPE');
        if (Array.isArray(items) && items.length > 0) {
          setCategoryOptions(
            items.map((i) => ({
              value: i.name || i.code,
              label: i.name || i.code
            }))
          );
        }
      } catch (err) {
        console.warn('Backend master task types notice:', err.message);
      }
    };
    loadTaskTypes();
  }, []);

  const [newTask, setNewTask] = useState({
    title: '',
    project: 'The Courtyard Residence',
    assignee: 'Aarav Sharma',
    priority: 'Medium',
    category: 'Architecture',
    dueDate: ''
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      (task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.project || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.assignee || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === 'today') {
      return matchesSearch && task.status !== 'Completed';
    }
    if (activeTab === 'overdue') {
      return matchesSearch && task.status === 'Overdue';
    }
    if (activeTab === 'completed') {
      return matchesSearch && task.status === 'Completed';
    }
    return matchesSearch;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTasks(filteredTasks.map((t) => t.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleSelectTask = (id) => {
    if (selectedTasks.includes(id)) {
      setSelectedTasks(selectedTasks.filter((item) => item !== id));
    } else {
      setSelectedTasks([...selectedTasks, id]);
    }
  };

  const toggleTaskStatus = (id) => {
    setTasks(
      tasks.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'Completed' ? 'In Progress' : 'Completed' }
          : t
      )
    );
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;

    const created = {
      id: `t_${Date.now()}`,
      title: newTask.title,
      project: newTask.project,
      assignee: newTask.assignee,
      assigneeLetter: newTask.assignee[0] || 'U',
      priority: newTask.priority,
      category: newTask.category,
      dueDate: newTask.dueDate || new Date().toISOString(),
      status: 'Pending'
    };

    try {
      await taskService.createTask(created);
    } catch (err) {
      console.warn('Backend createTask notice:', err);
    }

    setTasks([created, ...tasks]);
    setCreateModalOpen(false);
    setNewTask({
      title: '',
      project: 'The Courtyard Residence',
      assignee: 'Aarav Sharma',
      priority: 'Medium',
      category: 'Architecture',
      dueDate: ''
    });
  };

  return (
    <div className="tasks-page-container">
      {/* 1. Header Row */}
      <div className="tasks-title-row">
        <div>
          <h1 className="tasks-heading">Task Manager</h1>
          <p className="tasks-subheading">Track drawing deadlines, revisions, site milestones, and team assignments</p>
        </div>

        <div className="tasks-header-actions">
          <Button size="sm" variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
            New Task
          </Button>
        </div>
      </div>

      {/* 2. Status Segmented Tabs */}
      <div className="tasks-tabs-row">
        <div className="tasks-tabs-container">
          {[
            { id: 'all', label: 'All Tasks', count: tasks.length },
            { id: 'today', label: 'Due Today', count: tasks.filter((t) => t.status !== 'Completed').length },
            { id: 'overdue', label: 'Overdue', count: tasks.filter((t) => t.status === 'Overdue').length },
            { id: 'completed', label: 'Completed', count: tasks.filter((t) => t.status === 'Completed').length }
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
      </div>

      {/* 3. Filter Bar matching Image 1 */}
      <div className="tasks-filter-bar">
        <div className="filter-left-controls">
          <button type="button" className="filter-funnel-btn" title="Filter options">
            <Filter size={18} strokeWidth={1.6} />
          </button>

          <div className="tasks-search-pill">
            <input
              type="text"
              placeholder="Search tasks by title, project, or assignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="tasks-search-input"
            />
          </div>
        </div>

        <div className="filter-right-controls">
          <Dropdown
            align="right"
            trigger={
              <button type="button" className="action-pill-btn" title="More options">
                <MoreVertical size={18} />
              </button>
            }
          >
            <button type="button" className="dropdown-item" onClick={() => alert('Exporting Tasks CSV...')}>
              Export CSV
            </button>
            <button type="button" className="dropdown-item" onClick={() => alert('Printing Task Schedule...')}>
              Print Schedule
            </button>
          </Dropdown>
        </div>
      </div>

      {/* 4. Meta Bar */}
      <div className="tasks-meta-bar">
        <div className="record-counts">
          <span>Total Tasks: <strong className="count-highlight">{tasks.length}</strong></span>
          <span className="meta-separator">|</span>
          <span>Showing: <strong className="count-highlight">{filteredTasks.length}</strong></span>
        </div>

        <div className="tasks-pagination">
          <span className="page-indicator">1 / 1 Pages</span>
          <div className="pagination-arrows">
            <button type="button" className="page-nav-arrow" disabled><ChevronLeft size={16} /></button>
            <button type="button" className="page-nav-arrow" disabled><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* 5. Data Table matching Charcoal Header */}
      <div className="tasks-table-wrapper">
        <table className="tasks-data-table">
          <thead>
            <tr>
              <th className="th-checkbox">
                <input
                  type="checkbox"
                  className="table-checkbox"
                  checked={selectedTasks.length > 0 && selectedTasks.length === filteredTasks.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Task Title</th>
              <th>Project</th>
              <th>Assignee</th>
              <th>Priority</th>
              <th>Category</th>
              <th>Due Date</th>
              <th>Status</th>
              <th className="th-action">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="no-data-cell">
                  <div className="no-data-container">
                    <AlertCircle size={44} color="var(--color-primary)" strokeWidth={1.5} />
                    <h3 className="no-data-title">No Tasks Found!</h3>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      There are currently no tasks matching your selected filter.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTasks.map((t) => (
                <tr key={t.id} className="task-data-row">
                  <td className="td-checkbox">
                    <input
                      type="checkbox"
                      className="table-checkbox"
                      checked={selectedTasks.includes(t.id)}
                      onChange={() => handleSelectTask(t.id)}
                    />
                  </td>
                  <td className="td-title-cell">
                    <button
                      type="button"
                      className={`task-check-circle ${t.status === 'Completed' ? 'checked' : ''}`}
                      onClick={() => toggleTaskStatus(t.id)}
                      title={t.status === 'Completed' ? 'Mark incomplete' : 'Mark completed'}
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
                          : t.status === 'Overdue'
                          ? 'danger'
                          : t.status === 'In Progress'
                          ? 'warning'
                          : 'primary'
                      }
                    >
                      {t.status}
                    </Badge>
                  </td>
                  <td className="td-action">
                    <div className="row-action-btns">
                      <button type="button" className="row-btn" title="View task"><Eye size={15} /></button>
                      <button
                        type="button"
                        className="row-btn btn-del"
                        title="Delete task"
                        onClick={() => setTasks(tasks.filter((item) => item.id !== t.id))}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 6. Modal: Create New Task */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Architectural Task">
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <Input
            label="Task Title"
            id="task-title-input"
            placeholder="Enter task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
            <Select
              label="Project"
              id="task-proj-select"
              value={newTask.project}
              onChange={(e) => setNewTask({ ...newTask, project: e.target.value })}
              options={projectOptions}
            />

            <Select
              label="Assignee"
              id="task-assignee-select"
              value={newTask.assignee}
              onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
              options={assigneeOptions}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
            <Select
              label="Priority"
              id="task-prio-select"
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Urgent', label: 'Urgent' }
              ]}
            />


            <Input
              label="Due Date"
              id="task-due-date"
              type="date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-2)' }}>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Save Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
