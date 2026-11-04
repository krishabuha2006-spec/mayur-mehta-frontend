import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  GitCommit,
  ArrowRight,
  RotateCw,
  Plus,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { taskAdvancedService } from '../../services/taskAdvancedService';
import { formatDate } from '../../utils/formatDate';
import { extractErrorMessage } from '../../utils/errorHandler';

export function TaskGanttView({
  selectedProjectId,
  projectOptions = [],
  onSelectProject,
  onSelectTask,
  onTaskShifted
}) {
  const [ganttData, setGanttData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Shift Dates Modal State (POST /tasks/:id/shift)
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftTaskId, setShiftTaskId] = useState('');
  const [shiftDays, setShiftDays] = useState(1);
  const [shiftCascade, setShiftCascade] = useState(true);
  const [shiftSkipWeekends, setShiftSkipWeekends] = useState(true);
  const [shiftLoading, setShiftLoading] = useState(false);

  // 1. Fetch Gantt Data (GET /projects/:projectId/gantt)
  const fetchGantt = useCallback(async () => {
    if (!selectedProjectId) {
      setGanttData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await taskAdvancedService.getProjectGantt(selectedProjectId);
      setGanttData(res);
    } catch (err) {
      console.warn('Gantt fetch error:', err);
      setError(extractErrorMessage(err, 'Failed to load Gantt chart'));
      setGanttData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchGantt();
  }, [fetchGantt]);

  // 2. Shift Task Dates (POST /tasks/:id/shift)
  const handleShiftTask = async (e) => {
    e.preventDefault();
    if (!shiftTaskId) return;

    setShiftLoading(true);
    try {
      await taskAdvancedService.shiftTaskDates(shiftTaskId, {
        days: Number(shiftDays),
        cascade: Boolean(shiftCascade),
        skipWeekends: Boolean(shiftSkipWeekends)
      });
      setShiftModalOpen(false);
      await fetchGantt();
      if (onTaskShifted) onTaskShifted();
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to shift task dates'));
    } finally {
      setShiftLoading(false);
    }
  };

  // Scheduled tasks from payload
  const scheduledTasks = Array.isArray(ganttData?.tasks)
    ? ganttData.tasks
    : (Array.isArray(ganttData?.scheduled) ? ganttData.scheduled : []);

  const unscheduledTasks = Array.isArray(ganttData?.unscheduled) ? ganttData.unscheduled : [];

  // Compute timeline boundaries
  const allDates = scheduledTasks
    .flatMap((t) => [t.startDate ? new Date(t.startDate) : null, t.dueDate ? new Date(t.dueDate) : null])
    .filter((d) => d && !isNaN(d.getTime()));

  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date(Date.now() + 30 * 86400000);
  const totalSpanDays = Math.max(14, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 5);

  const getPositionPercent = (dateStr) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    const diff = Math.max(0, Math.ceil((d - minDate) / (1000 * 60 * 60 * 24)));
    return Math.min(100, Math.max(0, (diff / totalSpanDays) * 100));
  };

  const getStatusColor = (status) => {
    switch (String(status).toUpperCase()) {
      case 'DONE': return '#10b981';
      case 'IN_REVIEW': return '#f59e0b';
      case 'IN_PROGRESS': return '#3b82f6';
      case 'CANCELLED': return '#9ca3af';
      default: return '#6b7280';
    }
  };

  return (
    <div className="task-gantt-container" style={{
      background: 'var(--color-card, #FFFFFF)',
      borderRadius: '12px',
      border: '1px solid var(--color-border, #E8E0D5)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* TOP CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GitCommit size={20} style={{ color: 'var(--color-primary, #7B6F62)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Interactive Gantt & Timeline</h3>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              Project schedule, task dependencies, and cascade date shifting.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {projectOptions.length > 0 && (
            <select
              value={selectedProjectId || ''}
              onChange={(e) => onSelectProject(e.target.value)}
              style={{
                height: '34px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                padding: '0 10px',
                fontSize: '12.5px',
                fontWeight: 500,
                background: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="">Select Project for Gantt...</option>
              {projectOptions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchGantt}
            disabled={loading || !selectedProjectId}
          >
            <RotateCw size={13} className={loading ? 'spin-icon' : ''} style={{ marginRight: '4px' }} />
            Refresh
          </Button>
        </div>
      </div>

      {/* BODY */}
      {!selectedProjectId ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
          <GitCommit size={36} style={{ color: '#D1D5DB', margin: '0 auto 10px' }} />
          <h4 style={{ margin: '0 0 6px', fontWeight: 600 }}>Please select a project to view its Gantt timeline</h4>
          <p style={{ margin: 0, fontSize: '13px' }}>
            Choose a project from the dropdown above to load scheduled tasks, dependencies, and timelines.
          </p>
        </div>
      ) : loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
          <RotateCw size={24} className="spin-icon" style={{ margin: '0 auto 10px', color: 'var(--color-primary, #7B6F62)' }} />
          <div>Loading interactive Gantt schedule from backend...</div>
        </div>
      ) : error ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#DC2626', background: '#FEF2F2', borderRadius: '8px' }}>
          <AlertTriangle size={24} style={{ margin: '0 auto 8px' }} />
          <div>{error}</div>
        </div>
      ) : scheduledTasks.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
          <Calendar size={36} style={{ color: '#D1D5DB', margin: '0 auto 10px' }} />
          <h4 style={{ margin: '0 0 6px', fontWeight: 600 }}>No scheduled tasks in this project</h4>
          <p style={{ margin: '0 0 14px', fontSize: '13px' }}>
            Tasks must have a Start Date and Due Date to appear on the Gantt timeline.
          </p>
          {unscheduledTasks.length > 0 && (
            <div style={{ fontSize: '12.5px', color: '#4B5563' }}>
              ({unscheduledTasks.length} unscheduled tasks found without dates)
            </div>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          {/* TIMELINE HEADER */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            background: '#F9FAFB',
            borderBottom: '1px solid #E5E7EB',
            padding: '10px 14px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#4B5563'
          }}>
            <div>Task & Details</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{formatDate(minDate)}</span>
              <span style={{ color: '#9CA3AF' }}>Project Span ({totalSpanDays} Days)</span>
              <span>{formatDate(maxDate)}</span>
            </div>
          </div>

          {/* TASKS TIMELINE ROWS */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {scheduledTasks.map((t) => {
              const id = t.id || t._id;
              const title = t.title || t.name || 'Untitled';
              const leftPercent = getPositionPercent(t.startDate);
              const rightPercent = getPositionPercent(t.dueDate);
              const widthPercent = Math.max(2.5, rightPercent - leftPercent);
              const color = getStatusColor(t.status);

              return (
                <div
                  key={id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '260px 1fr',
                    alignItems: 'center',
                    borderBottom: '1px solid #F3F4F6',
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    transition: 'background 0.15s ease'
                  }}
                  className="gantt-task-row"
                >
                  {/* Left Label */}
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingRight: '12px',
                      cursor: 'pointer'
                    }}
                    onClick={() => onSelectTask && onSelectTask(t)}
                  >
                    <div style={{ fontWeight: 600, color: '#1F2937' }}>{title}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: color
                      }} />
                      <span>{t.status || 'TODO'}</span>
                      {t.assignee && <span>• {t.assignee.name || t.assignee}</span>}
                    </div>
                  </div>

                  {/* Right Timeline Bar */}
                  <div style={{ position: 'relative', height: '28px', background: '#FAFAFA', borderRadius: '4px' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        height: '20px',
                        top: '4px',
                        borderRadius: '4px',
                        background: color,
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      }}
                      title={`${title} (${formatDate(t.startDate)} – ${formatDate(t.dueDate)})`}
                      onClick={() => onSelectTask && onSelectTask(t)}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShiftTaskId(id);
                          setShiftModalOpen(true);
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.25)',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          padding: '1px 4px',
                          fontSize: '10px'
                        }}
                        title="Shift Schedule Dates"
                      >
                        Shift
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SHIFT TASK DATES MODAL (POST /tasks/:id/shift) */}
      <Modal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title="Shift Schedule Dates"
        maxWidth="440px"
      >
        <form onSubmit={handleShiftTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
            Advance or delay task dates with automatic dependency cascade and weekend skipping.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              Days to Shift (use positive for delay, negative for advance)
            </label>
            <Input
              type="number"
              value={shiftDays}
              onChange={(e) => setShiftDays(e.target.value)}
              required
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={shiftCascade}
              onChange={(e) => setShiftCascade(e.target.checked)}
            />
            <span>Cascade recursively to downstream successor tasks</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={shiftSkipWeekends}
              onChange={(e) => setShiftSkipWeekends(e.target.checked)}
            />
            <span>Skip weekends (advance Saturday / Sunday to Monday)</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setShiftModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={shiftLoading}>
              {shiftLoading ? 'Shifting...' : 'Shift Dates'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TaskGanttView;

