import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal/Modal';
import { Input } from '../../common/Input/Input';
import { Select } from '../../common/Select/Select';
import { Button } from '../../common/Button/Button';
import { taskService } from '../../../services/taskService';
import { projectService } from '../../../services/projectService';
import { teamService } from '../../../services/teamService';
import { extractErrorMessage } from '../../../utils/errorHandler';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import './TaskModal.css';

const initialTaskState = {
  title: '',
  projectId: '',
  assigneeId: '',
  assignee: '',
  priority: 'MEDIUM',
  dueDate: '',
  estimatedHours: '',
  description: ''
};

export function TaskModal({ isOpen, onClose, onSaved, defaultProjectId = '' }) {
  const [taskData, setTaskData] = useState(initialTaskState);
  const [projectOptions, setProjectOptions] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch live projects and directory when opened
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    Promise.allSettled([
      projectService.getProjects({ limit: 100 }),
      teamService.getDirectory()
    ]).then(([projs, dir]) => {
      if (!isMounted) return;

      if (projs.status === 'fulfilled' && projs.value) {
        const list = Array.isArray(projs.value) ? projs.value : (projs.value?.data || []);
        const opts = list.map((p) => ({
          value: p.id || p._id,
          label: p.name || p.title || p.code || 'Untitled Project'
        }));
        setProjectOptions(opts);

        if (!taskData.projectId && (defaultProjectId || opts[0]?.value)) {
          setTaskData((prev) => ({ ...prev, projectId: defaultProjectId || opts[0]?.value }));
        }
      }

      if (dir.status === 'fulfilled' && Array.isArray(dir.value)) {
        setAssigneeOptions(
          dir.value.map((u) => ({
            value: u._id || u.id,
            label: u.name,
            sublabel: u.designation || u.role || 'Member'
          }))
        );
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, defaultProjectId]);

  // 2. Reset on open
  useEffect(() => {
    if (!isOpen) return;
    setTaskData({
      ...initialTaskState,
      projectId: defaultProjectId || ''
    });
    setErrors({});
    setServerError('');
    setSuccessMsg('');
  }, [isOpen, defaultProjectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const err = {};
    if (!taskData.title?.trim()) {
      err.title = 'Task title is required';
    } else if (taskData.title.trim().length < 2) {
      err.title = 'Task title must be at least 2 characters';
    }
    if (!taskData.projectId) {
      err.projectId = 'Please select a project for this task';
    }

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    setServerError('');
    setSuccessMsg('');

    try {
      const payload = {
        title: taskData.title.trim(),
        projectId: taskData.projectId,
        priority: String(taskData.priority || 'MEDIUM').toUpperCase(),
        dueDate: taskData.dueDate || undefined,
        estimatedHours: taskData.estimatedHours ? Number(taskData.estimatedHours) : undefined,
        assignees: taskData.assigneeId ? [taskData.assigneeId] : undefined,
        description: taskData.description || undefined
      };

      const created = await taskService.createTask(payload);
      setSuccessMsg('Task created and saved to backend');
      window.dispatchEvent(new CustomEvent('mm:entity-created', { detail: { type: 'task' } }));

      if (onSaved) {
        onSaved(created);
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setServerError(extractErrorMessage(err) || 'Failed to create task in backend');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Architectural Task"
      maxWidth="640px"
    >
      <form onSubmit={handleSubmit} noValidate className="task-modal-form">
        {serverError && (
          <div className="task-modal-alert danger">
            <AlertCircle size={16} />
            <span>{serverError}</span>
          </div>
        )}
        {successMsg && (
          <div className="task-modal-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="form-grid-2">
          <Input
            label="Task Title *"
            id="modal-task-title"
            placeholder="e.g. Ground floor electrical layout"
            value={taskData.title}
            onChange={(e) => {
              setTaskData({ ...taskData, title: e.target.value });
              if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
            }}
            error={errors.title}
            required
          />

          <Select
            label="Project *"
            id="modal-task-proj"
            value={taskData.projectId}
            onChange={(e) => {
              setTaskData({ ...taskData, projectId: e.target.value });
              if (errors.projectId) setErrors((prev) => ({ ...prev, projectId: '' }));
            }}
            placeholder="Select project..."
            options={projectOptions}
            error={errors.projectId}
            required
          />
        </div>

        <div className="form-grid-2">
          <Select
            label="Priority"
            id="modal-task-prio"
            value={taskData.priority || 'MEDIUM'}
            onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })}
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'URGENT', label: 'Urgent' }
            ]}
          />

          <Select
            label="Assignee"
            id="modal-task-assignee"
            value={taskData.assigneeId}
            onChange={(e) => {
              const selected = assigneeOptions.find((a) => a.value === e.target.value);
              setTaskData({
                ...taskData,
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
            id="modal-task-due"
            type="date"
            value={taskData.dueDate ? taskData.dueDate.slice(0, 10) : ''}
            onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })}
          />

          <Input
            label="Estimated Time (Hours)"
            id="modal-task-est-hours"
            type="number"
            placeholder="e.g. 4"
            value={taskData.estimatedHours || ''}
            onChange={(e) => setTaskData({ ...taskData, estimatedHours: e.target.value })}
          />
        </div>

        <div className="form-actions-row">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isSubmitting ? 'Creating Task...' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export default TaskModal;

