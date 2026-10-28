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
import { apiClient } from '../../services/apiClient';
import './LogsPage.css';

export function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/logs');
        const list = Array.isArray(res) ? res : res?.data || [];
        setLogs(list);
      } catch (err) {
        console.warn('GET /logs API notice:', err?.response?.status || err.message);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);
  const [newLog, setNewLog] = useState({
    project: '',
    engineer: '',
    weather: 'Sunny (31°C)',
    laborCount: 14,
    hoursWorked: 8,
    summary: '',
    tradeBreakdown: 'Masons & Carpenters'
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newLog.summary) return;

    setLogs([
      {
        id: `log_${Date.now()}`,
        date: new Date().toISOString(),
        ...newLog
      },
      ...logs
    ]);

    setCreateModalOpen(false);
    setNewLog({
      project: 'The Courtyard Residence',
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
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <Select
            label="Project"
            id="log-proj"
            value={newLog.project}
            onChange={(e) => setNewLog({ ...newLog, project: e.target.value })}
            options={[
              { value: 'The Courtyard Residence', label: 'The Courtyard Residence', sublabel: 'Bodakdev, Ahmedabad • Villa' },
              { value: 'Skyline Penthouse 401', label: 'Skyline Penthouse 401', sublabel: 'Sindhu Bhavan • Penthouse' },
              { value: 'Linear Workspace Center', label: 'Linear Workspace Center', sublabel: 'GIFT City • Commercial' }
            ]}
          />


          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
            <Input
              label="Site Engineer / Architect"
              id="log-eng"
              value={newLog.engineer}
              onChange={(e) => setNewLog({ ...newLog, engineer: e.target.value })}
              required
            />
            <Input
              label="Total Labor Count"
              id="log-labor"
              type="number"
              value={newLog.laborCount}
              onChange={(e) => setNewLog({ ...newLog, laborCount: e.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="log-summary">Daily Inspection / Progress Summary</label>
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

          <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Save Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
