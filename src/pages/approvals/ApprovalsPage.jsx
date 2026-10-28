import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  MessageSquare,
  Eye,
  Plus
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { formatDate } from '../../utils/formatDate';
import { apiClient } from '../../services/apiClient';
import './ApprovalsPage.css';

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');

  useEffect(() => {
    const fetchApprovals = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/approvals');
        const list = Array.isArray(res) ? res : res?.data || [];
        setApprovals(list);
      } catch (err) {
        console.warn('GET /approvals API notice:', err?.response?.status || err.message);
        setApprovals([]);
      } finally {
        setLoading(false);
      }
    };
    fetchApprovals();
  }, []);

  const filtered = approvals.filter((item) => {
    const status = item.status || '';
    if (activeTab === 'pending') return status.includes('Pending');
    if (activeTab === 'revisions') return status.includes('Revision');
    if (activeTab === 'approved') return status.includes('Approved');
    return true;
  });

  const handleApprove = (id) => {
    setApprovals(
      approvals.map((a) => (a.id === id ? { ...a, status: 'Approved' } : a))
    );
  };

  const openRevisionModal = (item) => {
    setSelectedApp(item);
    setRevisionModalOpen(true);
  };

  const handleRevisionSubmit = (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    setApprovals(
      approvals.map((a) =>
        a.id === selectedApp.id ? { ...a, status: 'Revision Requested' } : a
      )
    );
    setRevisionModalOpen(false);
    setRevisionNotes('');
  };

  return (
    <div className="approvals-page-container">
      <div className="approvals-header-row">
        <div>
          <h1 className="approvals-heading">Approvals & Drawing Revisions</h1>
          <p className="approvals-subheading">Manage architectural sign-offs, municipal clearances, and client feedback cycles</p>
        </div>

        <div className="tasks-tabs-container">
          {[
            { id: 'all', label: 'All Drawings', count: approvals.length },
            { id: 'pending', label: 'Pending Client', count: approvals.filter((a) => (a.status || '').includes('Pending')).length },
            { id: 'revisions', label: 'Revisions', count: approvals.filter((a) => (a.status || '').includes('Revision')).length },
            { id: 'approved', label: 'Approved & Sealed', count: approvals.filter((a) => (a.status || '').includes('Approved')).length }
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

      <div className="approvals-grid">
        {filtered.map((item) => (
          <div key={item.id} className="approval-card">
            <div className="approval-card-top">
              <div className="dwg-badge-wrap">
                <span className="dwg-number">{item.drawingNo}</span>
                <span className="dwg-version">{item.version}</span>
              </div>
              <Badge
                variant={
                  item.status === 'Approved'
                    ? 'success'
                    : item.status.includes('Revision')
                    ? 'danger'
                    : 'warning'
                }
              >
                {item.status}
              </Badge>
            </div>

            <h3 className="approval-card-title">{item.title}</h3>

            <div className="approval-meta-grid">
              <div>
                <span className="meta-label">Project:</span>
                <span className="meta-value">{item.project}</span>
              </div>
              <div>
                <span className="meta-label">Client:</span>
                <span className="meta-value">{item.client}</span>
              </div>
              <div>
                <span className="meta-label">Submitted by:</span>
                <span className="meta-value">{item.submittedBy}</span>
              </div>
              <div>
                <span className="meta-label">Date:</span>
                <span className="meta-value">{formatDate(item.submittedAt)}</span>
              </div>
            </div>

            <div className="approval-card-actions">
              <Button size="sm" variant="secondary" icon={Download} onClick={() => alert(`Downloading ${item.drawingNo}.pdf`)}>
                Download PDF
              </Button>

              {item.status !== 'Approved' && (
                <>
                  <Button size="sm" variant="secondary" icon={MessageSquare} onClick={() => openRevisionModal(item)}>
                    Request Revision
                  </Button>
                  <Button size="sm" variant="primary" icon={CheckCircle} onClick={() => handleApprove(item.id)}>
                    Approve Drawing
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Revision Modal */}
      <Modal
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        title={`Request Revision for ${selectedApp?.drawingNo}`}
      >
        <form onSubmit={handleRevisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Specify architectural markups, dimension amendments, or client change requests:
          </p>
          <textarea
            className="form-input"
            style={{ height: '110px', padding: '10px', resize: 'vertical' }}
            placeholder="Enter revision notes or requested changes..."
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            required
          />
          <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <Button variant="secondary" onClick={() => setRevisionModalOpen(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Submit Revision Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
