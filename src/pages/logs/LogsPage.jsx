import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Sun,
  Users,
  Clock,
  Camera,
  Plus,
  CheckCircle,
  MapPin
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { formatDate } from '../../utils/formatDate';
import { logService } from '../../services/logService';
import { projectService } from '../../services/projectService';
import './LogsPage.css';

export function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [newLog, setNewLog] = useState({
    project: '',
    engineer: '',
    weather: 'Sunny (31°C)',
    laborCount: 14,
    hoursWorked: 8,
    summary: '',
    tradeBreakdown: 'Masons & Carpenters'
  });

  useEffect(() => {
    const fetchLogsAndProjects = async () => {
      setLoading(true);
      try {
        const [logsRes, projsRes] = await Promise.allSettled([
          logService.getLogs(),
          projectService.getProjects({ limit: 50 })
        ]);

        if (logsRes.status === 'fulfilled') {
          setLogs(Array.isArray(logsRes.value) ? logsRes.value : []);
        }

        if (projsRes.status === 'fulfilled') {
          const rawProjs = projsRes.value?.data || (Array.isArray(projsRes.value) ? projsRes.value : []);
          const formatted = rawProjs.map((p) => ({
            value: p.name || p.title || p.code,
            label: p.name || p.title || p.code,
            sublabel: `${p.site?.city || p.city || 'Site'} • ${p.category?.name || p.type || 'Project'}`
          }));
          setProjectsList(formatted);
          if (formatted.length > 0) {
            setNewLog((prev) => ({ ...prev, project: formatted[0].value }));
          }
        }
      } catch (err) {
        console.warn('Logs and projects load notice:', err?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogsAndProjects();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newLog.summary) return;

    try {
      const created = await logService.createLog(newLog);
      setLogs([created, ...logs]);
    } catch (err) {
      console.warn('Create log notice:', err);
    }

    setCreateModalOpen(false);
    setNewLog({
      project: 'The Courtyard Villa',
      engineer: 'Rohan Mehta',
      weather: 'Sunny (31°C)',
      laborCount: 14,
      hoursWorked: 8,
      summary: '',
      tradeBreakdown: 'Masons & Carpenters'
    });
  };

  return (
    <div className="logs-page-container">
      <div className="logs-title-row">
        <div>
          <h1 className="logs-heading">Daily Site Logs & Timesheets</h1>
          <p className="logs-subheading">Track daily site progress, contractor labor count, site weather, and project hours</p>
        </div>

        <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
          New Site Entry
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="logs-metrics-row">
        <div className="log-metric-card">
          <div className="log-metric-icon"><Users size={22} /></div>
          <div>
            <p className="metric-label">Active On-Site Labor</p>
            <p className="metric-num">24 Workers</p>
          </div>
        </div>

        <div className="log-metric-card">
          <div className="log-metric-icon"><Clock size={22} /></div>
          <div>
            <p className="metric-label">Hours Logged This Week</p>
            <p className="metric-num">152.5 Hrs</p>
          </div>
        </div>

        <div className="log-metric-card">
          <div className="log-metric-icon"><Sun size={22} /></div>
          <div>
            <p className="metric-label">Site Weather</p>
            <p className="metric-num">Optimal for Concrete</p>
          </div>
        </div>
      </div>

      {/* Timeline of Logs */}
      <div className="logs-list">
        {logs.map((log) => (
          <div key={log.id} className="log-entry-card">
            <div className="log-entry-header">
              <div className="log-project-title-wrap">
                <MapPin size={18} color="var(--color-primary)" />
                <h3 className="log-project-title">{log.project}</h3>
                <span className="log-engineer-tag">by {log.engineer}</span>
              </div>
              <span className="log-date-tag">{formatDate(log.date)}</span>
            </div>

            <p className="log-summary-text">{log.summary}</p>

            <div className="log-details-strip">
              <div className="detail-item">
                <Sun size={15} /> <span>{log.weather}</span>
              </div>
              <div className="detail-item">
                <Users size={15} /> <span>{log.laborCount} Laborers ({log.tradeBreakdown})</span>
              </div>
              <div className="detail-item">
                <Clock size={15} /> <span>{log.hoursWorked} hrs recorded</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Log Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Log Daily Site Entry">
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-grid-2">
            <div style={{ gridColumn: 'span 2' }}>
              <Select
                label="Project *"
                id="log-proj"
                value={newLog.project}
                onChange={(e) => setNewLog({ ...newLog, project: e.target.value })}
                options={projectsList.length > 0 ? projectsList : [
                  { value: 'Studio Project', label: 'Studio Architecture Project' }
                ]}
                placeholder="Select project..."
                required
              />
            </div>

            <Input
              label="Site Engineer / Architect *"
              id="log-eng"
              value={newLog.engineer}
              onChange={(e) => setNewLog({ ...newLog, engineer: e.target.value })}
              required
            />
            <Input
              label="Total Labor Count *"
              id="log-labor"
              type="number"
              value={newLog.laborCount}
              onChange={(e) => setNewLog({ ...newLog, laborCount: e.target.value })}
              required
            />

            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="log-summary">
                Daily Inspection / Progress Summary <span className="required-indicator">*</span>
              </label>
              <textarea
                id="log-summary"
                className="form-input"
                style={{ height: '90px', padding: '10px', resize: 'vertical' }}
                placeholder="Enter daily site log description or inspection details..."
                value={newLog.summary}
                onChange={(e) => setNewLog({ ...newLog, summary: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-actions-row">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
