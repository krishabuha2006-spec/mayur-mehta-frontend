import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  X,
  Sparkles,
  FileText,
  Bell,
  GitCommit,
  RefreshCw,
  Download,
  Paperclip
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { Drawer } from '../../components/common/Drawer/Drawer';
import { Toast } from '../../components/common/Toast/Toast';
import { TaskModal } from '../../components/tasks/TaskModal/TaskModal';
import { useConfirm } from '../../context/ConfirmationContext';
import { extractErrorMessage } from '../../utils/errorHandler';
import { formatDate } from '../../utils/formatDate';
import { useAuth } from '../../hooks/useAuth';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import { teamService } from '../../services/teamService';
import { taskAdvancedService } from '../../services/taskAdvancedService';
import { timeService } from '../../services/timeService';
import { chatService } from '../../services/chatService';
import { driveService } from '../../services/driveService';
import { TaskTemplatesView } from './TaskTemplatesView';
import { TaskGanttView } from './TaskGanttView';
import {
  TaskRemindersWidget,
  TaskDependenciesWidget,
  TaskReviewHistoryWidget,
  TaskTimeLogsWidget
} from './TaskAdvancedWidgets';
import './TasksPage.css';

export const TASK_STATUS_CONFIG = {
  TODO: { label: 'To Do', badge: 'neutral', isDone: false },
  IN_PROGRESS: { label: 'In Progress', badge: 'warning', isDone: false },
  IN_REVIEW: { label: 'Review & Approvals', badge: 'info', isDone: false },
  DONE: { label: 'Completed', badge: 'success', isDone: true },
  CANCELLED: { label: 'Cancelled', badge: 'danger', isDone: false }
};

export const normalizeTaskStatus = (raw) => {
  if (!raw) return 'TODO';
  const upper = String(raw).toUpperCase().trim();
  if (upper === 'DONE' || upper === 'COMPLETED') return 'DONE';
  if (upper === 'IN_PROGRESS' || upper === 'IN PROGRESS') return 'IN_PROGRESS';
  if (upper === 'IN_REVIEW' || upper === 'REVIEW') return 'IN_REVIEW';
  if (upper === 'CANCELLED' || upper === 'CANCELED') return 'CANCELLED';
  return 'TODO';
};

const KANBAN_COLUMNS = [
  { id: 'TODO', label: 'To Do', color: 'var(--primary)', match: ['TODO', 'PENDING', 'NOT_STARTED'] },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'var(--warning)', match: ['IN_PROGRESS'] },
  { id: 'IN_REVIEW', label: 'Review & Approvals', color: 'var(--info)', match: ['IN_REVIEW', 'REVIEW'] },
  { id: 'DONE', label: 'Completed', color: 'var(--success)', match: ['DONE', 'COMPLETED'] },
  { id: 'CANCELLED', label: 'Cancelled', color: '#9E9286', match: ['CANCELLED', 'CANCELED'] }
];

export function TasksPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban' | 'calendar' | 'trash'
  const [tasks, setTasks] = useState([]);
  const [trashTasks, setTrashTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(tabParam || 'all'); // 'all' | 'in_progress' | 'today' | 'completed' | 'my' | 'templates' | 'trash'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [taskFormErrors, setTaskFormErrors] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Summary Metrics from GET /tasks/summary
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    inProgress: 0,
    overdue: 0,
    completed: 0
  });

  // Task Details Drawer state
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerActiveTab, setDrawerActiveTab] = useState('overview'); // 'overview' | 'time' | 'links' | 'activity'
  const [newCommentText, setNewCommentText] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const [timeSummary, setTimeSummary] = useState(null);
  const [activeTimerTask, setActiveTimerTask] = useState(null);
  const [timeReportModalOpen, setTimeReportModalOpen] = useState(false);
  const [timeReportData, setTimeReportData] = useState([]);
  const [timeReportGroupBy, setTimeReportGroupBy] = useState('day');
  const [timeReportProjectId, setTimeReportProjectId] = useState('');
  const [loadingTimeReport, setLoadingTimeReport] = useState(false);
  const [taskFiles, setTaskFiles] = useState([]);
  const [loadingTaskFiles, setLoadingTaskFiles] = useState(false);

  // Sync live task detail (GET /tasks/{id}) & attached Drive files (GET /drive/tasks/{taskId}/files) when drawer opens
  useEffect(() => {
    const taskId = selectedTask?.id;
    if (!taskId || !/^[0-9a-fA-F]{24}$/.test(String(taskId))) {
      setTaskFiles([]);
      return;
    }
    let active = true;
    taskService.getTaskById(taskId)
      .then((fresh) => {
        if (!active || !fresh) return;
        setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, ...fresh, id: fresh._id || fresh.id || taskId } : prev));
      })
      .catch(() => {});

    setLoadingTaskFiles(true);
    driveService.getTaskFiles(taskId)
      .then((files) => {
        if (active) setTaskFiles(Array.isArray(files) ? files : []);
      })
      .catch(() => {
        if (active) setTaskFiles([]);
      })
      .finally(() => {
        if (active) setLoadingTaskFiles(false);
      });

    return () => {
      active = false;
    };
  }, [selectedTask?.id]);

  // Chat & Discussion Thread State (Module M2.3)
  const [taskMessages, setTaskMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Dynamic dropdown options
  const [projectOptions, setProjectOptions] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');

  const projectOptionsRef = useRef([]);
  const assigneeOptionsRef = useRef([]);
  projectOptionsRef.current = projectOptions;
  assigneeOptionsRef.current = assigneeOptions;

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

  const showToast = (message, type = 'success', title = null) => {
    setToast({ message, type, title });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch Task Summary (GET /tasks/summary or GET /projects/{projectId}/tasks/summary)
  const fetchTaskSummary = useCallback(async () => {
    try {
      const summary = selectedProjectFilter
        ? await taskService.getProjectTaskSummary(selectedProjectFilter)
        : await taskService.getTasksSummary();
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
  }, [selectedProjectFilter]);

  // 2. Fetch Tasks (GET /tasks or GET /projects/{projectId}/tasks or GET /tasks/my)
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let taskList = [];

      if (activeTab === 'trash') {
        // GET /tasks/trash
        const res = await taskService.getTrashTasks();
        taskList = Array.isArray(res) ? res : (res?.data || []);
        const formattedTrash = taskList.map((t, idx) => ({
          id: t.id || t._id || `trash_${idx}`,
          title: t.title || t.name || 'Untitled Task',
          project: t.project?.name || t.project?.title || t.projectName || 'Studio Project',
          projectId: t.project?.id || t.project?._id || t.projectId || null,
          assignee: t.assignee?.name || t.assignees?.[0]?.name || 'Unassigned',
          assigneeLetter: ((t.assignee?.name || t.assignees?.[0]?.name || 'U')[0] || 'U').toUpperCase(),
          priority: String(t.priority || 'MEDIUM').toUpperCase(),
          category: t.taskType?.name || t.category || 'Architectural Task',
          dueDate: t.dueDate || null,
          status: normalizeTaskStatus(t.status),
          checklist: [],
          comments: [],
          loggedHours: 0
        }));
        setTrashTasks(formattedTrash);
        setLoading(false);
        return;
      }

      if (activeTab === 'my') {
        // GET /tasks/my
        const myData = await taskService.getMyTasks();
        if (Array.isArray(myData)) {
          taskList = myData;
        } else if (myData && typeof myData === 'object') {
          const toArr = (val) => {
            if (Array.isArray(val)) return val;
            if (val && typeof val === 'object') {
              if (Array.isArray(val.items)) return val.items;
              if (Array.isArray(val.tasks)) return val.tasks;
              if (Array.isArray(val.data)) return val.data;
            }
            return [];
          };
          const combined = [
            ...toArr(myData.overdue),
            ...toArr(myData.today),
            ...toArr(myData.thisWeek),
            ...toArr(myData.later),
            ...toArr(myData.noDueDate),
            ...toArr(myData.tasks),
            ...toArr(myData.data),
            ...toArr(myData.items)
          ];
          taskList = combined;
        } else {
          taskList = [];
        }
      } else if (selectedProjectFilter) {
        // GET /projects/{projectId}/tasks
        const res = await taskService.getProjectTasks(selectedProjectFilter);
        taskList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.tasks) ? res.tasks : []));
      } else {
        // GET /tasks
        const res = await taskService.getTasks();
        taskList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.tasks) ? res.tasks : []));
      }

      if (taskList.length > 0) {
        const formatted = taskList.map((t, idx) => {
          // Resolve assignee
          const rawAssigneeObj = (Array.isArray(t.assignees) && t.assignees[0]) || t.assignee;
          let assigneeName = '';
          let assigneeId = null;

          if (typeof rawAssigneeObj === 'string') {
            assigneeId = rawAssigneeObj;
            const matchedUser = assigneeOptionsRef.current.find((u) => u.value === assigneeId || u.id === assigneeId || u._id === assigneeId);
            assigneeName = matchedUser?.label || matchedUser?.name || '';
          } else if (rawAssigneeObj && typeof rawAssigneeObj === 'object') {
            assigneeId = rawAssigneeObj.id || rawAssigneeObj._id;
            assigneeName = rawAssigneeObj.name || '';
            if (!assigneeName && assigneeId) {
              const matchedUser = assigneeOptionsRef.current.find((u) => u.value === assigneeId || u.id === assigneeId || u._id === assigneeId);
              assigneeName = matchedUser?.label || matchedUser?.name || '';
            }
          }

          // Resolve project name dynamically from project record or loaded projects
          const projId = t.project?.id || t.project?._id || t.projectId || (typeof t.project === 'string' ? t.project : null);
          const matchedProj = projectOptionsRef.current.find((p) => p.value === projId || p.id === projId || p._id === projId);
          const filterProj = selectedProjectFilter ? projectOptionsRef.current.find((p) => p.value === selectedProjectFilter) : null;
          const projName = t.project?.name || t.project?.title || matchedProj?.label || t.projectName || (filterProj ? filterProj.label : '') || 'Studio Project';

          const isMine = !!(
            (assigneeId && (assigneeId === user?.id || assigneeId === user?._id)) ||
            (user?.name && assigneeName && assigneeName.toLowerCase().includes(user.name.toLowerCase()))
          );

          return {
            id: t.id || t._id || `task_${idx}`,
            title: t.title || t.name || 'Untitled Task',
            project: projName,
            projectId: projId,
            assignee: assigneeName || 'Unassigned',
            assigneeLetter: (assigneeName?.[0] || 'U').toUpperCase(),
            isMyTask: isMine,
            priority: String(t.priority || 'MEDIUM').toUpperCase(),
            category: t.taskType?.name || t.category || 'Architectural Task',
            dueDate: t.dueDate || null,
            status: normalizeTaskStatus(t.status),
            checklist: (t.checklist || []).map((c, cIdx) =>
              typeof c === 'string'
                ? { id: `c_${cIdx}`, title: c, text: c, done: false }
                : { id: c.id || c._id || `c_${cIdx}`, title: c.title || c.text || '', text: c.text || c.title || '', done: !!c.done }
            ),
            comments: t.comments || [],
            loggedHours: t.loggedHours || (t.estimatedMinutes ? +(t.estimatedMinutes / 60).toFixed(1) : 0)
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
  }, [activeTab, selectedProjectFilter, user]);

  // Initial Metadata Load: Projects & Team Directory (strictly 1 time on mount)
  useEffect(() => {
    let isMounted = true;
    const loadMetadata = async () => {
      try {
        const [projRes, teamRes] = await Promise.allSettled([
          projectService.getProjects(),
          teamService.getDirectory()
        ]);

        if (!isMounted) return;

        if (projRes.status === 'fulfilled') {
          const projs = Array.isArray(projRes.value) ? projRes.value : (projRes.value?.data || []);
          if (projs.length > 0) {
            setProjectOptions(
              projs
                .filter((p) => p && (p._id || p.id))
                .map((p) => ({
                  value: p._id || p.id,
                  label: p.title || p.name || p.code || 'Untitled Project',
                  sublabel: `${p.city || 'Ahmedabad'} • ${p.type || 'Project'}`
                }))
            );
          }
        }

        if (teamRes.status === 'fulfilled') {
          const users = Array.isArray(teamRes.value) ? teamRes.value : (teamRes.value?.data || teamRes.value?.users || []);
          if (users.length > 0) {
            setAssigneeOptions(
              users
                .filter((u) => u && (u._id || u.id))
                .map((u) => ({
                  value: u._id || u.id,
                  label: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Team Member',
                  sublabel: u.designation || u.role || 'Studio Member'
                }))
            );
          }
        }
      } catch (err) {
        console.warn('Metadata load notice:', err?.message);
      }
    };

    loadMetadata();
    return () => { isMounted = false; };
  }, []);

  // Fetch Tasks & Summary when Tab or Project Filter changes
  useEffect(() => {
    if (activeTab === 'templates') return;
    fetchTasks();
    fetchTaskSummary();
  }, [activeTab, selectedProjectFilter, fetchTasks, fetchTaskSummary]);

  // Live Timer & Summary sync from backend (M2.2)
  const fetchTimeSummary = useCallback(async () => {
    try {
      const summary = await timeService.getTimeSummary();
      if (summary) setTimeSummary(summary);
    } catch {}
    try {
      const count = await taskAdvancedService.getPendingReviewCount();
      if (typeof count === 'number') setPendingReviewsCount(count);
    } catch {}
  }, []);

  const syncActiveTimer = useCallback(async () => {
    try {
      const active = await timeService.getActiveTimer();
      if (active && (active.isRunning || active.startedAt || active.taskId)) {
        setIsTimerRunning(true);
        const elapsed = active.elapsedSeconds || (active.startedAt ? Math.max(0, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000)) : 0);
        setTimerSeconds(elapsed);
        setActiveTimerTask({
          id: active.taskId,
          title: active.taskTitle || active.task?.title || 'Active Task'
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    syncActiveTimer();
    fetchTimeSummary();
  }, [syncActiveTimer, fetchTimeSummary]);

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
    assigneeId: '',
    priority: 'MEDIUM',
    category: 'Working Drawings',
    dueDate: '',
    estimatedHours: '',
    description: ''
  });

  // 3. Toggle / Change Status (PUT /tasks/{id}/status)
  const toggleTaskStatus = async (t) => {
    const nextStatus = t.status === 'DONE' ? 'TODO' : 'DONE';
    const prevStatus = t.status;

    setTasks((prev) =>
      prev.map((item) => (item.id === t.id ? { ...item, status: nextStatus } : item))
    );
    if (selectedTask?.id === t.id) {
      setSelectedTask((prev) => ({ ...prev, status: nextStatus }));
    }

    try {
      await taskService.updateTaskStatus(t.id, nextStatus);
      showToast(`Task marked as ${TASK_STATUS_CONFIG[nextStatus]?.label || nextStatus}`, 'success');
      fetchTaskSummary();
    } catch (err) {
      // Revert optimistic update on failure
      setTasks((prev) =>
        prev.map((item) => (item.id === t.id ? { ...item, status: prevStatus } : item))
      );
      if (selectedTask?.id === t.id) {
        setSelectedTask((prev) => ({ ...prev, status: prevStatus }));
      }
      showToast(extractErrorMessage(err) || 'Failed to update task status in backend', 'error');
    }
  };

  const handleStatusChange = async (taskId, status) => {
    const normStatus = normalizeTaskStatus(status);
    const targetTask = tasks.find((t) => t.id === taskId);
    const prevStatus = targetTask?.status || 'TODO';

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: normStatus } : t))
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => ({ ...prev, status: normStatus }));
    }

    try {
      await taskService.updateTaskStatus(taskId, normStatus);
      showToast(`Moved to ${TASK_STATUS_CONFIG[normStatus]?.label || normStatus}`, 'success');
      fetchTaskSummary();
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t))
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => ({ ...prev, status: prevStatus }));
      }
      showToast(extractErrorMessage(err) || 'Status update failed in backend', 'error');
    }
  };

  // 4. Move Task in Kanban (PUT /tasks/{id}/move with fallback to PUT /tasks/{id}/status)
  const handleKanbanMove = async (taskId, targetStatus) => {
    const normStatus = normalizeTaskStatus(targetStatus);
    const targetTask = tasks.find((t) => t.id === taskId);
    const prevStatus = targetTask?.status || 'TODO';

    if (prevStatus === normStatus) return;

    // Optimistically update status on the board
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: normStatus } : t))
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => ({ ...prev, status: normStatus }));
    }

    let moved = false;
    try {
      await taskService.moveTask(taskId, { status: normStatus });
      moved = true;
    } catch (moveErr) {
      // If move failed (e.g. 404 Project not found or project-level ordering restriction), fallback to status update
      try {
        await taskService.updateTaskStatus(taskId, normStatus);
        moved = true;
      } catch (statusErr) {
        const isProjectMissing =
          moveErr?.response?.status === 404 ||
          statusErr?.response?.status === 404 ||
          moveErr?.response?.data?.message === 'Project not found' ||
          statusErr?.response?.data?.message === 'Project not found';

        if (isProjectMissing) {
          // Task belongs to a deleted/missing project: remove orphan task from board cleanly
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          if (selectedTask?.id === taskId) setSelectedTask(null);
          showToast('Orphan task removed from board', 'info');
          return;
        }

        // Both failed: revert to previous status on the board
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t))
        );
        if (selectedTask?.id === taskId) {
          setSelectedTask((prev) => ({ ...prev, status: prevStatus }));
        }
        showToast(
          extractErrorMessage(statusErr || moveErr) || 'Failed to move task',
          'error'
        );
      }
    }

    if (moved) {
      showToast(`Task moved to ${TASK_STATUS_CONFIG[normStatus]?.label || normStatus}`, 'success');
      fetchTaskSummary();
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
      // Revert on error
      const reverted = (selectedTask.checklist || []).map((c) =>
        c.id === itemId ? { ...c, done: !newDoneState } : c
      );
      setSelectedTask((prev) => ({ ...prev, checklist: reverted }));
      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTask.id ? { ...t, checklist: reverted } : t))
      );
      showToast(extractErrorMessage(err) || 'Failed to update checklist item', 'error');
    }
  };

  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    if (!newChecklistText.trim() || !selectedTask) return;
    const itemTitle = newChecklistText.trim();
    setNewChecklistText('');

    try {
      const res = await taskService.addChecklistItem(selectedTask.id, { title: itemTitle });
      const serverItem = res?.data || res;
      const newItem = {
        id: serverItem?.id || serverItem?._id || `chk_${Date.now()}`,
        title: serverItem?.title || itemTitle,
        text: serverItem?.title || itemTitle,
        done: !!serverItem?.done
      };
      const updated = [...(selectedTask.checklist || []), newItem];
      setSelectedTask((prev) => ({ ...prev, checklist: updated }));
      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updated } : t))
      );
      showToast('Subtask checklist item saved to backend', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err) || 'Failed to add checklist item in backend', 'error');
    }
  };

  const handleDeleteChecklistItem = async (itemId) => {
    if (!selectedTask) return;
    const previousChecklist = selectedTask.checklist || [];
    const updated = previousChecklist.filter((c) => c.id !== itemId);
    setSelectedTask((prev) => ({ ...prev, checklist: updated }));
    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updated } : t))
    );

    try {
      await taskService.deleteChecklistItem(selectedTask.id, itemId);
      showToast('Subtask removed from backend', 'info');
    } catch (err) {
      setSelectedTask((prev) => ({ ...prev, checklist: previousChecklist }));
      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTask.id ? { ...t, checklist: previousChecklist } : t))
      );
      showToast(extractErrorMessage(err) || 'Failed to delete checklist item', 'error');
    }
  };

  // 6. Delete Task to Trash (DELETE /tasks/{id})
  const handleDeleteTask = async (taskId) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    const taskTitle = targetTask?.title ? `"${targetTask.title}"` : 'this task';

    const ok = await confirm({
      title: 'Move Task to Trash?',
      message: `Are you sure you want to move ${taskTitle} to trash? Tasks can be restored from the Trash tab within 30 days.`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    const previousTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }

    try {
      const res = await taskService.deleteTask(taskId);
      showToast('Task moved to trash', 'success');
      fetchTaskSummary();
    } catch (err) {
      setTasks(previousTasks);
      const isImp =
        err?.code === 'IMPERSONATION_READ_ONLY' ||
        err?.error?.code === 'IMPERSONATION_READ_ONLY' ||
        err?.message?.includes('IMPERSONATION_READ_ONLY') ||
        err?.response?.data?.error?.code === 'IMPERSONATION_READ_ONLY';

      if (isImp) {
        showToast('Support access is strictly read-only. Modifications & deletions are blocked during Super Admin impersonation.', 'error');
      } else {
        const errMsg = extractErrorMessage(err) || 'Failed to delete task';
        showToast(errMsg, 'error');
      }
      fetchTasks();
    }
  };

  // 7. Restore Task from Trash (POST /tasks/{id}/restore)
  const handleRestoreTask = async (taskId) => {
    try {
      await taskService.restoreTask(taskId);
      setTrashTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast('Task restored successfully in backend', 'success');
      fetchTasks();
      fetchTaskSummary();
    } catch (err) {
      const errMsg = extractErrorMessage(err) || 'Failed to restore task';
      showToast(errMsg, 'error');
    }
  };

  // 8. Bulk Operations (POST /tasks/bulk)
  const handleBulkAction = async (action, value = null) => {
    if (selectedTasks.length === 0) return;

    if (action === 'delete') {
      const ok = await confirm({
        title: `Move ${selectedTasks.length} Tasks to Trash?`,
        message: `Are you sure you want to move ${selectedTasks.length} selected tasks to trash? They can be restored from the Trash tab within 30 days.`,
        confirmText: 'Move to Trash',
        cancelText: 'Cancel',
        variant: 'danger'
      });
      if (!ok) return;
    }

    let normAction = action;
    let normValue = value;

    if (action === 'status') {
      normAction = 'SET_STATUS';
      normValue = normalizeTaskStatus(value || 'DONE');
      setTasks((prev) =>
        prev.map((t) => (selectedTasks.includes(t.id) ? { ...t, status: normValue } : t))
      );
    } else if (action === 'delete') {
      normAction = 'DELETE';
      setTasks((prev) => prev.filter((t) => !selectedTasks.includes(t.id)));
    }

    try {
      await taskService.bulkTasks({ ids: selectedTasks, action: normAction, value: normValue });
      showToast(
        action === 'delete'
          ? `Moved ${selectedTasks.length} tasks to trash`
          : `Bulk updated ${selectedTasks.length} tasks in backend`,
        'success'
      );
      fetchTaskSummary();
    } catch (err) {
      showToast(extractErrorMessage(err) || 'Bulk operation failed in backend', 'error');
      fetchTasks();
    } finally {
      setSelectedTasks([]);
    }
  };

  // Bulk Reassign (POST /tasks/reassign-bulk)
  const handleBulkReassign = async (assigneeId) => {
    if (selectedTasks.length === 0 || !assigneeId) return;
    try {
      await taskAdvancedService.bulkReassignTasks({
        taskIds: selectedTasks,
        assigneeId,
        reason: 'Bulk team reassignment'
      });
      const matched = assigneeOptionsRef.current.find((u) => u.value === assigneeId || u.id === assigneeId);
      const newName = matched?.label || 'Assigned Member';
      setTasks((prev) =>
        prev.map((t) => (selectedTasks.includes(t.id) ? { ...t, assignee: newName, assigneeId } : t))
      );
      showToast(`Reassigned ${selectedTasks.length} tasks to ${newName}`, 'success');
      setSelectedTasks([]);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to bulk reassign tasks'), 'error');
    }
  };

  // 9. Real-Time Chat & Discussion (Module M2.3)
  const fetchTaskMessages = useCallback(async (taskId) => {
    if (!taskId) return;
    setIsLoadingMessages(true);
    try {
      const data = await chatService.getMessages('task', taskId);
      const list = Array.isArray(data) ? data : data?.messages || [];
      setTaskMessages(list);
      if (data?.lastSeq) {
        chatService.markRead('task', taskId, data.lastSeq).catch(() => {});
      }
    } catch (err) {
      console.warn('Failed to fetch task messages:', err?.message);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTask?.id && drawerActiveTab === 'activity') {
      fetchTaskMessages(selectedTask.id);
    }
  }, [selectedTask?.id, drawerActiveTab, fetchTaskMessages]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    const content = newCommentText.trim();
    if (!content || !selectedTask?.id || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      await chatService.sendMessage('task', selectedTask.id, { content });
      setNewCommentText('');
      await fetchTaskMessages(selectedTask.id);
      showToast('Message sent to task thread', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to post message'), 'error');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleDeleteComment = async (messageId) => {
    if (!messageId) return;
    try {
      await chatService.deleteMessage(messageId);
      setTaskMessages((prev) => prev.filter((m) => (m.id || m._id) !== messageId));
      showToast('Message deleted', 'info');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to delete message'), 'error');
    }
  };

  // Live Backend Stopwatch Timer (M2.2: POST /time/timer/start & POST /time/timer/stop)
  const handleStartTimer = async (targetTask = selectedTask) => {
    if (!targetTask) return;
    try {
      await timeService.startTimer({
        taskId: targetTask.id,
        note: `Working on ${targetTask.title || 'task'}`
      });
      setIsTimerRunning(true);
      setTimerSeconds(0);
      setActiveTimerTask({ id: targetTask.id, title: targetTask.title });
      showToast('Live stopwatch timer started on server', 'success');
      fetchTimeSummary();
    } catch {
      setIsTimerRunning(true);
      setTimerSeconds(0);
      setActiveTimerTask({ id: targetTask.id, title: targetTask.title });
    }
  };

  const handleStopTimer = async () => {
    const elapsedMins = Math.max(1, Math.ceil(timerSeconds / 60));
    try {
      const res = await timeService.stopTimer({ note: 'Stopwatch time log' });
      const booked = res?.minutes || elapsedMins;
      const hours = +(booked / 60).toFixed(2);
      if (selectedTask) {
        const newLogged = +((selectedTask.loggedHours || 0) + hours).toFixed(2);
        setSelectedTask((prev) => ({ ...prev, loggedHours: newLogged }));
        setTasks((prev) =>
          prev.map((t) => (t.id === selectedTask.id ? { ...t, loggedHours: newLogged } : t))
        );
      }
      setIsTimerRunning(false);
      setTimerSeconds(0);
      setActiveTimerTask(null);
      showToast(`Booked ${booked} mins (${hours} hrs) to server`, 'success');
      fetchTimeSummary();
      fetchTasks();
    } catch {
      // Fallback to manual time booking
      const targetTaskId = selectedTask?.id || activeTimerTask?.id;
      if (targetTaskId) {
        try {
          await timeService.logManualTime(targetTaskId, {
            minutes: elapsedMins,
            date: new Date().toISOString().slice(0, 10),
            note: 'Stopwatch time log'
          });
          const hours = +(elapsedMins / 60).toFixed(2);
          if (selectedTask) {
            const newLogged = +((selectedTask.loggedHours || 0) + hours).toFixed(2);
            setSelectedTask((prev) => ({ ...prev, loggedHours: newLogged }));
            setTasks((prev) =>
              prev.map((t) => (t.id === selectedTask.id ? { ...t, loggedHours: newLogged } : t))
            );
          }
          showToast(`Booked ${elapsedMins} mins to server`, 'success');
          fetchTasks();
          fetchTimeSummary();
        } catch (err) {
          showToast(extractErrorMessage(err, 'Failed to book time'), 'error');
        }
      }
      setIsTimerRunning(false);
      setTimerSeconds(0);
      setActiveTimerTask(null);
    }
  };

  const handleOpenTimeReport = async (groupBy = 'day', projectId = timeReportProjectId) => {
    setTimeReportGroupBy(groupBy);
    setTimeReportProjectId(projectId);
    setTimeReportModalOpen(true);
    setLoadingTimeReport(true);
    try {
      const rep = projectId
        ? await timeService.getProjectTimeReport(projectId, { groupBy })
        : await timeService.getMyTimeReport({ groupBy });
      setTimeReportData(Array.isArray(rep) ? rep : (rep?.data || rep?.items || rep?.breakdown || []));
    } catch {
      setTimeReportData([]);
    } finally {
      setLoadingTimeReport(false);
    }
  };

  // Work Review Workflow Actions (M2.2 QA Gate)
  const handleSubmitForReview = async () => {
    if (!selectedTask) return;
    try {
      await taskAdvancedService.submitForReview(selectedTask.id, 'Work completed, submitted for review');
      handleStatusChange(selectedTask.id, 'IN_REVIEW');
      showToast('Task submitted for review', 'success');
    } catch (err) {
      handleStatusChange(selectedTask.id, 'IN_REVIEW');
    }
  };

  const handleApproveReview = async () => {
    if (!selectedTask) return;
    try {
      await taskAdvancedService.approveReview(selectedTask.id, 'Approved by lead');
      handleStatusChange(selectedTask.id, 'DONE');
      showToast('Task review approved and completed!', 'success');
    } catch (err) {
      handleStatusChange(selectedTask.id, 'DONE');
    }
  };

  const handleRejectReview = async () => {
    if (!selectedTask) return;
    const reason = window.prompt('Specify reason / changes requested:');
    if (reason === null) return;
    try {
      await taskAdvancedService.rejectReview(selectedTask.id, reason || 'Revisions required');
      handleStatusChange(selectedTask.id, 'IN_PROGRESS');
      showToast('Task returned to In Progress for revision', 'info');
    } catch (err) {
      handleStatusChange(selectedTask.id, 'IN_PROGRESS');
    }
  };

  // Reassign Task (POST /tasks/:id/reassign)
  const handleReassignTask = async (newAssigneeId) => {
    if (!selectedTask || !newAssigneeId) return;
    try {
      await taskAdvancedService.reassignTask(selectedTask.id, { assigneeId: newAssigneeId });
      const matched = assigneeOptionsRef.current.find((u) => u.value === newAssigneeId || u.id === newAssigneeId);
      const newName = matched?.label || 'Assigned Member';
      setSelectedTask((prev) => ({ ...prev, assignee: newName, assigneeId: newAssigneeId }));
      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTask.id ? { ...t, assignee: newName, assigneeId: newAssigneeId } : t))
      );
      showToast(`Task reassigned to ${newName}`, 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to reassign task'), 'error');
    }
  };

  // Filtered Task List
  const filteredTasks = useMemo(() => {
    const listToFilter = activeTab === 'trash' ? trashTasks : tasks;
    return listToFilter.filter((t) => {
      const matchSearch =
        (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.project || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.assignee || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (activeTab === 'today') return matchSearch && t.status !== 'DONE' && t.status !== 'CANCELLED';
      if (activeTab === 'completed') return matchSearch && t.status === 'DONE';
      if (activeTab === 'in_progress') return matchSearch && t.status === 'IN_PROGRESS';
      if (activeTab === 'review') return matchSearch && (t.status === 'IN_REVIEW' || t.status === 'REVIEW' || t.reviewStatus === 'PENDING');
      if (activeTab === 'my') return matchSearch && t.isMyTask;
      return matchSearch;
    });
  }, [tasks, trashTasks, searchTerm, activeTab]);

  // Pagination for tasks table view
  const [taskPage, setTaskPage] = useState(1);
  const TASKS_PER_PAGE = 25;

  useEffect(() => {
    setTaskPage(1);
  }, [searchTerm, activeTab, selectedProjectFilter]);

  const totalTaskPages = Math.max(1, Math.ceil(filteredTasks.length / TASKS_PER_PAGE));
  const safeTaskPage = Math.min(taskPage, totalTaskPages);
  const displayedTasks = useMemo(() => {
    const start = (safeTaskPage - 1) * TASKS_PER_PAGE;
    return filteredTasks.slice(start, start + TASKS_PER_PAGE);
  }, [filteredTasks, safeTaskPage]);

  // Sync selectedTask with ?taskId= in URL query params
  const hasInitializedFromUrl = useRef(false);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (selectedTask) {
        next.set('taskId', selectedTask.code || selectedTask.id);
      } else {
        next.delete('taskId');
      }
      return next;
    }, { replace: true });
  }, [selectedTask, setSearchParams]);

  // Auto-open task if ?taskId= is in URL on initial mount only
  useEffect(() => {
    if (hasInitializedFromUrl.current) return;
    const taskIdParam = searchParams.get('taskId');
    if (taskIdParam && tasks.length > 0) {
      const matched = tasks.find(
        (t) => String(t.id) === String(taskIdParam) || String(t.code) === String(taskIdParam)
      );
      if (matched) {
        hasInitializedFromUrl.current = true;
        setSelectedTask(matched);
      }
    }
  }, [tasks, searchParams]);

  const handleCloseDrawer = useCallback(() => {
    hasInitializedFromUrl.current = true;
    setSelectedTask(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('taskId');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

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

  // 10. Create Task Submit (POST /projects/{projectId}/tasks)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!newTask.title.trim()) {
      errors.title = 'Task title is required';
    } else if (newTask.title.trim().length < 2) {
      errors.title = 'Task title must be at least 2 characters';
    }
    if (!newTask.projectId) {
      errors.projectId = 'Please select a project for this task';
    }

    if (Object.keys(errors).length > 0) {
      setTaskFormErrors(errors);
      showToast('Please correct highlighted fields', 'error');
      return;
    }
    setTaskFormErrors({});

    const cleanPriority = String(newTask.priority || 'MEDIUM').toUpperCase();

    setIsSubmitting(true);
    try {
      await taskService.createTask({
        title: newTask.title.trim(),
        projectId: newTask.projectId,
        priority: cleanPriority,
        dueDate: newTask.dueDate || undefined,
        estimatedHours: newTask.estimatedHours || undefined,
        assignees: newTask.assigneeId ? [newTask.assigneeId] : undefined,
        description: newTask.description || undefined
      });

      showToast('Task created and saved to backend', 'success');
      setCreateModalOpen(false);
      setNewTask({
        title: '',
        project: '',
        projectId: '',
        assignee: '',
        assigneeId: '',
        priority: 'MEDIUM',
        category: 'Working Drawings',
        dueDate: '',
        estimatedHours: '',
        description: ''
      });
      fetchTasks();
      fetchTaskSummary();
    } catch (err) {
      const errMsg = extractErrorMessage(err) || 'Failed to create task in backend';
      showToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tasks-page-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999999 }}>
          <Toast
            type={toast.type || 'info'}
            title={toast.title}
            message={toast.message}
            onClose={() => setToast(null)}
          />
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
            <button
              type="button"
              className={`view-btn ${viewMode === 'gantt' ? 'is-active' : ''}`}
              onClick={() => setViewMode('gantt')}
            >
              <GitCommit size={14} /> <span>Gantt</span>
            </button>
          </div>

          <Button size="sm" variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
            New Task
          </Button>
        </div>
      </div>

      {/* Time Tracking Overview Strip (Image 3) */}
      <div className="tasks-time-summary-strip">
        <div className="tasks-time-summary-left">
          <Clock size={16} className="time-strip-clock-icon" />
          <span className="time-strip-label">Time Tracking</span>
          <span className="time-strip-metric">
            Today: <strong>{+((timeSummary?.todayHours ?? ((timeSummary?.todayMinutes || 0) / 60))).toFixed(1)}h</strong>
          </span>
          <span className="time-strip-dot">•</span>
          <span className="time-strip-metric">
            This Week: <strong>{+((timeSummary?.weekHours ?? timeSummary?.thisWeekHours ?? ((timeSummary?.weekMinutes || 0) / 60))).toFixed(1)}h</strong>
          </span>
          <span className="time-strip-dot">•</span>
          <span className="time-strip-metric">
            This Month: <strong>{+((timeSummary?.monthHours ?? timeSummary?.thisMonthHours ?? ((timeSummary?.monthMinutes || 0) / 60))).toFixed(1)}h</strong>
          </span>
        </div>
        <button
          type="button"
          className="tasks-time-breakdown-btn"
          onClick={() => handleOpenTimeReport('day')}
        >
          <Clock size={13} />
          <span>My Time Log Breakdown</span>
        </button>
      </div>

      {/* 2. Status Segmented Tabs + Search + Project Filter */}
      <div className="tasks-tabs-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="tasks-tabs-container">
          {[
            { id: 'all', label: 'All Tasks', count: summaryStats.total || tasks.length },
            { id: 'my', label: 'My Tasks', count: tasks.filter((t) => t.isMyTask).length },
            { id: 'templates', label: 'Templates' },
            { id: 'in_progress', label: 'In Progress', count: summaryStats.inProgress || tasks.filter((t) => t.status === 'IN_PROGRESS').length },
            { id: 'review', label: 'In Review', count: pendingReviewsCount || tasks.filter((t) => t.status === 'IN_REVIEW').length },
            { id: 'today', label: 'Active', count: tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED').length },
            { id: 'completed', label: 'Completed', count: summaryStats.completed || tasks.filter((t) => t.status === 'DONE').length },
            { id: 'trash', label: 'Trash', count: trashTasks.length }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tasks-tab-pill ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchParams({ tab: tab.id });
              }}
            >
              <span>{tab.label}</span>
              <span className="tab-count-badge">{tab.count}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: '1', justifyContent: 'flex-end' }}>
          {projectOptions.length > 0 && activeTab !== 'templates' && (
            <div style={{ minWidth: 210 }}>
              <Select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                placeholder="All Accessible Projects"
                options={[
                  { value: '', label: 'All Accessible Projects' },
                  ...projectOptions
                ]}
              />
            </div>
          )}

          {activeTab !== 'templates' && (
            <div className="tasks-search-pill" style={{ minWidth: 240, maxWidth: 360 }}>
              <Search size={15} className="tasks-search-icon" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="tasks-search-input"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2.5 ARCHITECTURAL MASTER TASK TEMPLATES (Module M2.2) */}
      {activeTab === 'templates' && (
        <TaskTemplatesView
          projectOptions={projectOptions}
          onTemplateApplied={() => {
            fetchTasks();
            fetchTaskSummary();
          }}
        />
      )}

      {/* 3. VIEW 1: DATA TABLE (LIST VIEW) */}
      {activeTab !== 'templates' && viewMode === 'list' && (
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
                displayedTasks.map((t, idx) => (
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
                        className={`task-check-circle ${t.status === 'DONE' ? 'checked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskStatus(t);
                        }}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className="card-code-pill">
                          {t.code || `TSK-${String(t.taskNumber || (safeTaskPage - 1) * TASKS_PER_PAGE + idx + 1).padStart(4, '0')}`}
                        </span>
                        <span className={`task-title-text ${t.status === 'DONE' ? 'completed' : ''}`}>
                          {t.title}
                        </span>
                      </div>
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
                      <Badge variant={TASK_STATUS_CONFIG[t.status]?.badge || 'neutral'}>
                        {TASK_STATUS_CONFIG[t.status]?.label || t.status}
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

          {totalTaskPages > 1 && (
            <div className="studio-pagination-bar">
              <div className="studio-pagination-info">
                Showing <strong>{(safeTaskPage - 1) * TASKS_PER_PAGE + 1}</strong> –{' '}
                <strong>{Math.min(safeTaskPage * TASKS_PER_PAGE, filteredTasks.length)}</strong> of{' '}
                <strong>{filteredTasks.length}</strong> tasks
              </div>
              <div className="studio-pagination-controls">
                <button
                  type="button"
                  className="studio-page-btn"
                  disabled={safeTaskPage <= 1}
                  onClick={() => setTaskPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="studio-page-current">
                  Page {safeTaskPage} of {totalTaskPages}
                </span>
                <button
                  type="button"
                  className="studio-page-btn"
                  disabled={safeTaskPage >= totalTaskPages}
                  onClick={() => setTaskPage((p) => Math.min(totalTaskPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
                          <span className="card-code-pill">{t.code || `TSK-${String(t.taskNumber || 1).padStart(4, '0')}`}</span>
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

      {/* 5. GANTT / TIMELINE VIEW */}
      {viewMode === 'gantt' && activeTab !== 'templates' && (
        <TaskGanttView
          selectedProjectId={selectedProjectFilter || projectOptions[0]?.value}
          projectOptions={projectOptions}
          onSelectProject={(pId) => setSelectedProjectFilter(pId)}
          onSelectTask={(t) => setSelectedTask(t)}
          onTaskShifted={() => {
            fetchTasks();
            fetchTaskSummary();
          }}
        />
      )}

      {/* Bulk Actions Floating Toolbar (POST /tasks/bulk) */}
      {selectedTasks.length > 0 && (
        <div className="tasks-bulk-toolbar">
          <span className="bulk-count-label">{selectedTasks.length} tasks selected</span>
          <div className="bulk-btn-group">
            <button
              type="button"
              className="bulk-action-btn"
              onClick={() => handleBulkAction('status', 'DONE')}
            >
              <CheckCircle2 size={13} />
              <span>Mark Completed</span>
            </button>
            <button
              type="button"
              className="bulk-action-btn"
              onClick={() => handleBulkAction('status', 'IN_PROGRESS')}
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

            {assigneeOptions.length > 0 && (
              <select
                onChange={(e) => {
                  if (!e.target.value) return;
                  handleBulkReassign(e.target.value);
                  e.target.value = '';
                }}
                defaultValue=""
                style={{
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  fontSize: '12px',
                  padding: '0 8px',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                <option value="" disabled>Reassign All To...</option>
                {assigneeOptions.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            )}
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
        onClose={handleCloseDrawer}
        title={selectedTask?.title || 'Task Details'}
        subtitle={`${selectedTask?.project || ''} • Assigned to ${selectedTask?.assignee || ''}`}
        width="540px"
      >
        {selectedTask && (
          <div className="task-drawer-content">
            {/* Status & Review Workflow Row */}
            <div className="task-drawer-row" style={{ marginBottom: '12px' }}>
              <div className="task-drawer-field" style={{ width: '100%' }}>
                <label className="drawer-label">Task Status</label>
                <div className="task-status-btn-group">
                  {[
                    { id: 'TODO', label: 'To Do' },
                    { id: 'IN_PROGRESS', label: 'In Progress' },
                    { id: 'IN_REVIEW', label: 'In Review' },
                    { id: 'DONE', label: 'Completed' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`status-btn ${selectedTask.status === s.id ? 'is-active' : ''}`}
                      onClick={() => handleStatusChange(selectedTask.id, s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clean Drawer Sub-Navigation Tabs */}
            <div style={{
              display: 'flex',
              gap: '4px',
              padding: '4px',
              borderRadius: '8px',
              background: '#F3F4F6',
              marginBottom: '16px'
            }}>
              {[
                { id: 'overview', label: 'Overview', icon: FileText },
                { id: 'time', label: 'Time Tracking', icon: Timer },
                { id: 'links', label: 'Dependencies', icon: GitCommit },
                { id: 'activity', label: 'Reviews & Activity', icon: MessageSquare }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = drawerActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDrawerActiveTab(tab.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '7px 6px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isActive ? '#FFFFFF' : 'transparent',
                      color: isActive ? '#1F2937' : '#6B7280',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={13} style={{ color: isActive ? '#7A6A58' : 'inherit' }} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: OVERVIEW & SUBTASKS */}
            {drawerActiveTab === 'overview' && (
              <div>
                {/* Reassign Member Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  marginBottom: '14px',
                  fontSize: '12.5px'
                }}>
                  <span style={{ fontWeight: 600, color: '#4B5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserCheck size={15} /> Assignee:
                  </span>
                  <div style={{ width: '220px' }}>
                    <Select
                      value={selectedTask.assigneeId || ''}
                      onChange={(e) => handleReassignTask(e.target.value)}
                      options={[
                        { value: '', label: 'Unassigned' },
                        ...assigneeOptions
                      ]}
                      placeholder="Select assignee..."
                    />
                  </div>
                </div>

                {/* Subtask Checklist */}
                <div className="task-checklist-section" style={{ marginTop: '0', paddingTop: '0', borderTop: 'none' }}>
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

                {/* Attached Drive Files (GET /drive/tasks/{taskId}/files) */}
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #E8E3DB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1E1A17', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Paperclip size={14} color="#B89A74" /> Attached Drive Files
                    </h4>
                    <span style={{ fontSize: '11.5px', color: '#7B6F62' }}>{taskFiles.length} file(s)</span>
                  </div>
                  {loadingTaskFiles ? (
                    <div style={{ fontSize: '12px', color: '#7B6F62' }}>Loading attached files...</div>
                  ) : taskFiles.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#7B6F62', background: '#FAF8F5', border: '1px solid #E8E3DB', borderRadius: '8px', padding: '10px 12px' }}>
                      No Drive files linked to this task yet. Link files from Studio Storage.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {taskFiles.map((f) => (
                        <div
                          key={f._id || f.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            background: '#FAF8F5',
                            border: '1px solid #E8E3DB',
                            borderRadius: '8px',
                            fontSize: '12.5px'
                          }}
                        >
                          <span style={{ fontWeight: 500, color: '#1E1A17', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name || f.originalName || 'Attached File'}
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Download}
                            onClick={() => driveService.downloadFile(f._id || f.id, f.name || 'file')}
                          >
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: TIME TRACKING */}
            {drawerActiveTab === 'time' && (
              <div>
                <div className="task-time-widget">
                  <div className="time-widget-left">
                    <Timer size={18} className="time-icon" />
                    <div>
                      <span className="time-title">Live Stopwatch Timer</span>
                      <p className="time-sub">
                        Total Logged: <strong>{selectedTask.loggedHours || 0} hrs</strong>
                      </p>
                    </div>
                  </div>

                  <div className="time-widget-right">
                    {isTimerRunning ? (
                      <button type="button" className="timer-btn stop" onClick={handleStopTimer}>
                        <Square size={13} />
                        <span>Stop & Book ({Math.floor(timerSeconds / 60)}m {timerSeconds % 60}s)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="timer-btn start"
                        onClick={handleStartTimer}
                      >
                        <Play size={13} />
                        <span>Start Timer</span>
                      </button>
                    )}
                  </div>
                </div>

                <TaskTimeLogsWidget
                  taskId={selectedTask.id}
                  onTimeLogged={fetchTasks}
                  showToast={showToast}
                />
              </div>
            )}

            {/* TAB 3: DEPENDENCIES & REMINDERS */}
            {drawerActiveTab === 'links' && (
              <div>
                <TaskDependenciesWidget
                  taskId={selectedTask.id}
                  otherTasks={tasks}
                  showToast={showToast}
                />
                <TaskRemindersWidget
                  taskId={selectedTask.id}
                  showToast={showToast}
                />
              </div>
            )}

            {/* TAB 4: REVIEWS & ACTIVITY */}
            {drawerActiveTab === 'activity' && (
              <div>
                {/* QA Gate / Review Workflow Actions */}
                {selectedTask.status === 'IN_REVIEW' && (
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={16} /> Work Review Required
                    </div>
                    <div style={{ fontSize: '12px', color: '#B45309' }}>
                      This task is pending sign-off. Please review work deliverables before completing.
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={CheckCircle2}
                        onClick={handleApproveReview}
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        Approve Work
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleRejectReview}
                        style={{ flex: 1, justifyContent: 'center', color: '#DC2626' }}
                      >
                        Request Changes
                      </Button>
                    </div>
                  </div>
                )}

                {selectedTask.status === 'IN_PROGRESS' && (
                  <div style={{ marginBottom: '14px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Send}
                      onClick={handleSubmitForReview}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Submit for Lead Review
                    </Button>
                  </div>
                )}

                <TaskReviewHistoryWidget
                  taskId={selectedTask.id}
                />

                <div className="task-comments-section">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h4 className="comments-heading" style={{ margin: 0 }}>Discussion & Task Chat</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary, #888)' }}>
                      {taskMessages.length} {taskMessages.length === 1 ? 'message' : 'messages'}
                    </span>
                  </div>

                  {isLoadingMessages ? (
                    <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Loading discussion...
                    </div>
                  ) : taskMessages.length === 0 ? (
                    <div style={{ padding: '1.25rem', textAlign: 'center', background: 'var(--bg-subtle, rgba(255,255,255,0.02))', borderRadius: '8px', border: '1px dashed var(--border-subtle, rgba(255,255,255,0.08))', marginBottom: '1rem' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        No messages yet in this task thread.
                      </p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        Type a note below to start the live discussion with assigned members.
                      </span>
                    </div>
                  ) : (
                    <div className="comments-list">
                      {taskMessages.map((c, idx) => {
                        const msgId = c.id || c._id || `msg_${idx}`;
                        const author = c.authorName || c.senderName || c.author?.name || c.user?.name || c.author || 'Team Member';
                        const time = c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : (c.time || 'Recently');
                        const isDeleted = c.isDeleted || c.deleted;
                        const isOwn = (c.authorId && c.authorId === user?.id) || (c.senderId && c.senderId === user?.id) || author === user?.name;

                        return (
                          <div key={msgId} className="comment-card" style={{ opacity: isDeleted ? 0.6 : 1, position: 'relative' }}>
                            <div className="comment-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <strong className="comment-author">{author}</strong>
                                <span className="comment-time" style={{ marginLeft: '0.5rem' }}>{time}</span>
                              </div>
                              {isOwn && !isDeleted && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(msgId)}
                                  title="Delete message"
                                  style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            <p className="comment-text" style={{ fontStyle: isDeleted ? 'italic' : 'normal', margin: '0.35rem 0 0' }}>
                              {isDeleted ? 'This message was deleted' : (c.content || c.text)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <form onSubmit={handleAddComment} className="add-comment-form">
                    <textarea
                      placeholder="Write a message to task assignees... (Enter to send)"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(e);
                        }
                      }}
                      className="comment-textarea"
                      rows={2}
                      disabled={isSendingMessage}
                    />
                    <Button
                      size="sm"
                      type="submit"
                      variant="primary"
                      icon={Send}
                      disabled={!newCommentText.trim() || isSendingMessage}
                    >
                      {isSendingMessage ? 'Sending...' : 'Send'}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* 7. Modal: Create New Task (POST /projects/{projectId}/tasks or POST /tasks) */}
      <TaskModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSaved={() => {
          fetchTasks();
          fetchTaskSummary();
        }}
        defaultProjectId={selectedProjectFilter || ''}
      />

      {/* 8. Modal: My Time Log Breakdown (GET /time/my & GET /projects/{projectId}/time) */}
      <Modal
        isOpen={timeReportModalOpen}
        onClose={() => setTimeReportModalOpen(false)}
        title="My Time Log Breakdown"
        size="lg"
      >
        <div style={{ padding: '4px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['day', 'task', 'project'].map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => handleOpenTimeReport(grp)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: timeReportGroupBy === grp ? '1px solid #7B6F62' : '1px solid #E5E7EB',
                    background: timeReportGroupBy === grp ? '#7B6F62' : '#FFF',
                    color: timeReportGroupBy === grp ? '#FFF' : '#4B5563'
                  }}
                >
                  Group by {grp.charAt(0).toUpperCase() + grp.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {projectOptions.length > 0 && (
                <div style={{ minWidth: '185px' }}>
                  <Select
                    value={timeReportProjectId}
                    onChange={(e) => handleOpenTimeReport(timeReportGroupBy, e.target.value)}
                    options={[
                      { value: '', label: 'My Personal Time' },
                      ...projectOptions
                    ]}
                    placeholder="My Personal Time"
                  />
                </div>
              )}
              <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => handleOpenTimeReport(timeReportGroupBy, timeReportProjectId)}>
                Refresh
              </Button>
            </div>
          </div>

          {loadingTimeReport ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#6B7280' }}>Loading report from server...</div>
          ) : timeReportData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF', fontStyle: 'italic' }}>
              No time logged yet in this grouping range on the database.
            </div>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>
                      {timeReportGroupBy === 'day' ? 'Date' : timeReportGroupBy === 'task' ? 'Task' : 'Project'}
                    </th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>Logged Minutes</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>Hours</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {timeReportData.map((row, idx) => {
                    const rowKey = row.date || row.day || row.taskId || row.taskName || row.projectId || row.projectName || `row_${idx}`;
                    const label = row.date || row.day || row.taskTitle || row.taskName || row.projectName || row.projectTitle || row._id || 'Entry';
                    const mins = Number(row.minutes || row.totalMinutes || 0);
                    const hrs = (mins / 60).toFixed(2);
                    const count = row.count || row.entriesCount || 1;

                    return (
                      <tr key={rowKey} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: '#111827' }}>{label}</td>
                        <td style={{ padding: '8px 12px', color: '#4B5563' }}>{mins} mins</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#047857' }}>{hrs} hrs</td>
                        <td style={{ padding: '8px 12px', color: '#6B7280' }}>{count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default TasksPage;
