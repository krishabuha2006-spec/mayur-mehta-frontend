import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Clock,
  GitCommit,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  History,
  RotateCw,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Input } from '../../components/common/Input/Input';
import { taskAdvancedService } from '../../services/taskAdvancedService';
import { formatDate } from '../../utils/formatDate';
import { extractErrorMessage } from '../../utils/errorHandler';

/**
 * 1. REMINDERS WIDGET (GET, POST, DELETE /tasks/:id/reminders)
 */
export function TaskRemindersWidget({ taskId, showToast }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [remindAt, setRemindAt] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReminders = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const list = await taskAdvancedService.getReminders(taskId);
      setReminders(list || []);
    } catch {
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!remindAt) return;
    setSubmitting(true);
    try {
      await taskAdvancedService.createReminder(taskId, {
        remindAt: new Date(remindAt).toISOString(),
        note: note.trim() || undefined
      });
      showToast('Custom reminder scheduled', 'success');
      setRemindAt('');
      setNote('');
      fetchReminders();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to create reminder'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      await taskAdvancedService.deleteReminder(taskId, reminderId);
      showToast('Reminder cancelled', 'info');
      fetchReminders();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to cancel reminder'), 'error');
    }
  };

  return (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bell size={14} style={{ color: '#F59E0B' }} /> Task Reminders
        </h4>
        <span style={{ fontSize: '11px', color: '#6B7280' }}>{reminders.length} scheduled</span>
      </div>

      {loading ? (
        <div style={{ fontSize: '12px', color: '#6B7280', padding: '6px 0' }}>Loading reminders...</div>
      ) : reminders.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', marginBottom: '8px' }}>
          No reminders scheduled for this task yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
          {reminders.map((r) => {
            const rId = r.id || r._id;
            return (
              <div
                key={rId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  fontSize: '12px'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: '#92400E' }}>{formatDate(r.remindAt)}</span>
                  {r.note && <span style={{ marginLeft: '6px', color: '#B45309' }}>— {r.note}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteReminder(rId)}
                  style={{ border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer', padding: '2px' }}
                  title="Cancel reminder"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add reminder mini form */}
      <form onSubmit={handleAddReminder} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <input
          type="datetime-local"
          value={remindAt}
          onChange={(e) => setRemindAt(e.target.value)}
          required
          style={{
            flex: 1,
            padding: '5px 8px',
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            background: '#FFFFFF'
          }}
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{
            flex: 1,
            padding: '5px 8px',
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            background: '#FFFFFF'
          }}
        />
        <Button size="sm" type="submit" variant="secondary" disabled={submitting || !remindAt}>
          Add
        </Button>
      </form>
    </div>
  );
}

/**
 * 2. TASK DEPENDENCIES WIDGET (GET & PUT /tasks/:id/dependencies)
 */
export function TaskDependenciesWidget({ taskId, otherTasks = [], showToast }) {
  const [deps, setDeps] = useState({ predecessors: [], successors: [] });
  const [loading, setLoading] = useState(false);
  const [selectedPredId, setSelectedPredId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDeps = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await taskAdvancedService.getDependencies(taskId);
      if (res) {
        setDeps({
          predecessors: Array.isArray(res.predecessors) ? res.predecessors : (Array.isArray(res.dependsOn) ? res.dependsOn : []),
          successors: Array.isArray(res.successors) ? res.successors : []
        });
      }
    } catch {
      setDeps({ predecessors: [], successors: [] });
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchDeps();
  }, [fetchDeps]);

  const handleAddPredecessor = async () => {
    if (!selectedPredId) return;
    const currentIds = deps.predecessors.map((p) => p.id || p._id || p);
    if (currentIds.includes(selectedPredId)) {
      showToast('This dependency is already attached', 'info');
      return;
    }
    const updated = [...currentIds, selectedPredId];
    setSaving(true);
    try {
      await taskAdvancedService.setDependencies(taskId, updated);
      showToast('Predecessor dependency added', 'success');
      setSelectedPredId('');
      fetchDeps();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to add dependency (cycle detected)'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePredecessor = async (predId) => {
    const currentIds = deps.predecessors.map((p) => p.id || p._id || p).filter((id) => id !== predId);
    setSaving(true);
    try {
      await taskAdvancedService.setDependencies(taskId, currentIds);
      showToast('Predecessor dependency removed', 'info');
      fetchDeps();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to update dependencies'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GitCommit size={14} style={{ color: '#3B82F6' }} /> Task Dependencies & Workflow Links
        </h4>
      </div>

      {loading ? (
        <div style={{ fontSize: '12px', color: '#6B7280' }}>Loading dependencies...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Predecessors list */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
              Predecessors (Must complete before this task):
            </div>
            {deps.predecessors.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>
                No predecessor tasks linked.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {deps.predecessors.map((p) => {
                  const pId = p.id || p._id || p;
                  const title = p.title || p.name || 'Predecessor Task';
                  return (
                    <div
                      key={pId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '5px 8px',
                        borderRadius: '4px',
                        background: '#EFF6FF',
                        border: '1px solid #DBEAFE',
                        fontSize: '12px'
                      }}
                    >
                      <span style={{ color: '#1E40AF', fontWeight: 500 }}>{title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePredecessor(pId)}
                        style={{ border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer' }}
                        title="Remove dependency"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Predecessor selector */}
          {otherTasks.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <select
                value={selectedPredId}
                onChange={(e) => setSelectedPredId(e.target.value)}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  fontSize: '12px'
                }}
              >
                <option value="">Select predecessor task...</option>
                {otherTasks
                  .filter((t) => (t.id || t._id) !== taskId)
                  .map((t) => (
                    <option key={t.id || t._id} value={t.id || t._id}>{t.title || t.name}</option>
                  ))}
              </select>
              <Button size="sm" variant="secondary" onClick={handleAddPredecessor} disabled={saving || !selectedPredId}>
                Link
              </Button>
            </div>
          )}

          {/* Successors display */}
          {deps.successors.length > 0 && (
            <div style={{ marginTop: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
                Successors (Waiting on this task):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {deps.successors.map((s) => (
                  <div key={s.id || s._id} style={{ fontSize: '12px', color: '#4B5563', padding: '4px 6px', background: '#F3F4F6', borderRadius: '4px' }}>
                    {s.title || s.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 3. TASK REVIEW HISTORY WIDGET (GET /tasks/:id/review/history)
 */
export function TaskReviewHistoryWidget({ taskId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    taskAdvancedService.getReviewHistory(taskId)
      .then((res) => setHistory(res || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (history.length === 0) return null;

  return (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <History size={14} style={{ color: '#6B7280' }} /> Review Audit History
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {history.map((ev, idx) => (
          <div key={idx} style={{ padding: '6px 8px', borderRadius: '4px', background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '11.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span style={{ color: ev.action === 'APPROVED' ? '#10B981' : ev.action === 'REJECTED' ? '#EF4444' : '#F59E0B' }}>
                {ev.action}
              </span>
              <span style={{ color: '#9CA3AF' }}>{ev.createdAt ? formatDate(ev.createdAt) : ''}</span>
            </div>
            {ev.note && <div style={{ color: '#4B5563', marginTop: '2px' }}>{ev.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 4. TASK TIME LOGS WIDGET (GET & POST /tasks/:id/time, DELETE /time/:logId)
 */
export function TaskTimeLogsWidget({ taskId, onTimeLogged, showToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [minutes, setMinutes] = useState(30);
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const data = await taskAdvancedService.getTaskTimeLogs(taskId);
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleLogTime = async (e) => {
    e.preventDefault();
    const minVal = Number(minutes);
    if (!minVal || minVal <= 0) return;
    setSubmitting(true);
    try {
      await taskAdvancedService.logManualTime(taskId, {
        minutes: minVal,
        workDate: workDate ? new Date(workDate).toISOString() : new Date().toISOString(),
        note: note.trim() || undefined
      });
      showToast(`${minVal} minutes logged successfully`, 'success');
      setNote('');
      fetchLogs();
      if (onTimeLogged) onTimeLogged();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to log time'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    try {
      await taskAdvancedService.deleteTimeLog(logId);
      showToast('Time log removed', 'info');
      fetchLogs();
      if (onTimeLogged) onTimeLogged();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to delete time log'), 'error');
    }
  };

  const totalMinutes = logs.reduce((acc, curr) => acc + (Number(curr.minutes) || 0), 0);

  return (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} style={{ color: '#10B981' }} /> Logged Work Hours
        </h4>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>
          {(totalMinutes / 60).toFixed(1)} hrs total
        </span>
      </div>

      {loading ? (
        <div style={{ fontSize: '12px', color: '#6B7280', padding: '4px 0' }}>Loading time entries...</div>
      ) : logs.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', marginBottom: '8px' }}>
          No manual hours logged yet on this task.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
          {logs.slice(0, expanded ? logs.length : 3).map((item) => {
            const lId = item.id || item._id;
            return (
              <div
                key={lId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  background: '#F0FDF4',
                  border: '1px solid #DCFCE7',
                  fontSize: '12px'
                }}
              >
                <div>
                  <strong style={{ color: '#065F46' }}>{item.minutes} mins</strong>
                  <span style={{ marginLeft: '6px', color: '#6B7280' }}>
                    ({item.workDate ? formatDate(item.workDate) : 'Today'})
                  </span>
                  {item.note && <span style={{ marginLeft: '6px', color: '#374151' }}>— {item.note}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteLog(lId)}
                  style={{ border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer', padding: '2px' }}
                  title="Delete log"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          {logs.length > 3 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              style={{
                alignSelf: 'flex-start',
                border: 'none',
                background: 'transparent',
                color: '#2563EB',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '2px 0'
              }}
            >
              {expanded ? 'Show less' : `Show all ${logs.length} entries`}
            </button>
          )}
        </div>
      )}

      {/* Manual log form */}
      <form onSubmit={handleLogTime} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="number"
          min="1"
          max="720"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="Mins"
          style={{
            width: '65px',
            padding: '5px 8px',
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            background: '#FFFFFF'
          }}
          title="Minutes spent"
        />
        <input
          type="date"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
          style={{
            padding: '5px 8px',
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            background: '#FFFFFF'
          }}
        />
        <input
          type="text"
          placeholder="Activity note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{
            flex: 1,
            minWidth: '120px',
            padding: '5px 8px',
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            background: '#FFFFFF'
          }}
        />
        <Button size="sm" type="submit" variant="secondary" disabled={submitting || !minutes}>
          Log
        </Button>
      </form>
    </div>
  );
}

