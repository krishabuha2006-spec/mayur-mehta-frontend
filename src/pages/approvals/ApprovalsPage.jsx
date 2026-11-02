import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileCheck2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  MessageSquare,
  Eye,
  Plus,
  Layers,
  FileSignature,
  FileEdit,
  FolderGit2
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { EmptyState } from '../../components/common/EmptyState/EmptyState';
import { formatDate } from '../../utils/formatDate';
import { approvalService } from '../../services/approvalService';
import { projectService } from '../../services/projectService';
import { useAuth } from '../../hooks/useAuth';
import './ApprovalsPage.css';

export function ApprovalsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(tabParam === 'approvals' ? 'pending' : (tabParam || 'pending'));
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [projectsList, setProjectsList] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  // New Request Form State
  const [newRequestForm, setNewRequestForm] = useState({
    projectId: '',
    projectName: '',
    title: '',
    drawingNo: '',
    version: 'R1',
    type: 'CLIENT_APPROVAL',
    clientName: '',
    notes: ''
  });

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam === 'approvals' ? 'pending' : tabParam);
    }
  }, [tabParam]);

  const fetchApprovals = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    setLoading(true);
    try {
      const list = await approvalService.getApprovals();
      setApprovals(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Approvals fetch error:', err?.message);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Load project options for the new request modal
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const loadProjects = async () => {
      try {
        const res = await projectService.getProjects({ limit: 50 });
        const list = Array.isArray(res) ? res : (res?.data || []);
        setProjectsList(list);
        if (list.length > 0 && !newRequestForm.projectId) {
          const first = list[0];
          setNewRequestForm((prev) => ({
            ...prev,
            projectId: first.id || first._id,
            projectName: first.name || first.title,
            clientName: first.client?.name || first.clientName || 'Private Client'
          }));
        }
      } catch (err) {
        console.warn('Projects lookup error in approvals:', err?.message);
      }
    };
    loadProjects();
  }, [authLoading, isAuthenticated]);

  const filtered = approvals.filter((item) => {
    const status = item.status || '';
    if (activeTab === 'pending') return status.includes('Pending') || status.includes('Review');
    if (activeTab === 'revisions') return status.includes('Revision');
    if (activeTab === 'approved') return status.includes('Approved');
    return true;
  });

  const handleApprove = async (item) => {
    try {
      await approvalService.approveDrawing(item);
      setApprovals((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: 'Approved & Sealed' } : a))
      );
    } catch (err) {
      console.warn('Approve drawing error:', err?.message);
    }
  };

  const openRevisionModal = (item) => {
    setSelectedApp(item);
    setRevisionModalOpen(true);
  };

  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      await approvalService.requestRevision(selectedApp, revisionNotes);
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === selectedApp.id ? { ...a, status: 'Revision Requested' } : a
        )
      );
    } catch (err) {
      console.warn('Revision submit error:', err?.message);
    }
    setRevisionModalOpen(false);
    setRevisionNotes('');
  };

  const handleNewRequestSubmit = async (e) => {
    e.preventDefault();
    if (!newRequestForm.title.trim()) return;
    setSubmitLoading(true);
    try {
      const selectedProj = projectsList.find((p) => (p.id || p._id) === newRequestForm.projectId);
      const isRevision = newRequestForm.type === 'REVISION';
      const created = await approvalService.createApprovalRequest({
        ...newRequestForm,
        projectName: selectedProj?.name || selectedProj?.title || newRequestForm.projectName,
        clientName: selectedProj?.client?.name || selectedProj?.clientName || newRequestForm.clientName || 'Client',
        submittedBy: user?.displayName || user?.name || 'Studio Architect',
        isRevision
      });

      setApprovals((prev) => [created, ...prev]);
      setNewRequestModalOpen(false);
      setNewRequestForm({
        projectId: projectsList[0]?.id || projectsList[0]?._id || '',
        projectName: projectsList[0]?.name || projectsList[0]?.title || '',
        title: '',
        drawingNo: '',
        version: 'R1',
        type: 'CLIENT_APPROVAL',
        clientName: projectsList[0]?.client?.name || projectsList[0]?.clientName || '',
        notes: ''
      });
      if (isRevision) {
        setActiveTab('revisions');
        setSearchParams({ tab: 'revisions' });
      } else {
        setActiveTab('pending');
        setSearchParams({ tab: 'pending' });
      }
    } catch (err) {
      console.warn('Create approval request error:', err?.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getEmptyStateDetails = () => {
    if (activeTab === 'revisions') {
      return {
        icon: FileEdit,
        title: 'No Pending Drawing Revisions',
        message: 'All architectural revisions, client markups, and structural modifications are up to date.',
        actionText: 'Request Drawing Revision'
      };
    }
    if (activeTab === 'approved') {
      return {
        icon: CheckCircle,
        title: 'No Approved & Sealed Drawings',
        message: 'Drawings approved by the client or principal architect with official seal will appear here.',
        actionText: 'Submit Approval Request'
      };
    }
    if (activeTab === 'all') {
      return {
        icon: Layers,
        title: 'No Approval Requests on Record',
        message: 'Submit working drawings, MEP sets, or structural packages for client or principal sign-off.',
        actionText: 'New Approval Request'
      };
    }
    return {
      icon: FileSignature,
      title: 'No Drawings Pending Approval',
      message: 'There are currently no drawing sheets waiting for client sign-off or structural clearance.',
      actionText: 'Submit Drawing for Approval'
    };
  };

  const emptyDetails = getEmptyStateDetails();

  return (
    <div className="approvals-page-container">
      <div className="approvals-header-row">
        <div>
          <h1 className="approvals-heading">Pending Requests & Approvals</h1>
          <p className="approvals-subheading">Manage client sign-offs, drawing revisions, and municipal clearances</p>
        </div>

        <div className="approvals-header-actions">
          <div className="tasks-tabs-container">
            {[
              { id: 'pending', label: 'Approvals', count: approvals.filter((a) => (a.status || '').includes('Pending')).length },
              { id: 'revisions', label: 'Revisions', count: approvals.filter((a) => (a.status || '').includes('Revision')).length },
              { id: 'all', label: 'All Requests', count: approvals.length },
              { id: 'approved', label: 'Approved & Sealed', count: approvals.filter((a) => (a.status || '').includes('Approved')).length }
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

          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setNewRequestModalOpen(true)}
            size="sm"
          >
            New Request
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="approvals-empty-wrap">
          <div className="approvals-loading-skeleton">
            <span className="btn-spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
            <span>Loading studio drawing approvals from database...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="approvals-empty-wrap">
          <EmptyState
            icon={emptyDetails.icon}
            title={emptyDetails.title}
            message={emptyDetails.message}
            actionButton={
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setNewRequestForm((prev) => ({
                    ...prev,
                    type: activeTab === 'revisions' ? 'REVISION' : 'CLIENT_APPROVAL'
                  }));
                  setNewRequestModalOpen(true);
                }}
              >
                {emptyDetails.actionText}
              </Button>
            }
          />
        </div>
      ) : (
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
                    item.status === 'Approved & Sealed' || item.status === 'Approved'
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
                  <span className="meta-value">{item.submittedBy || 'Studio Lead'}</span>
                </div>
                <div>
                  <span className="meta-label">Date:</span>
                  <span className="meta-value">{formatDate(item.submittedAt || item.date)}</span>
                </div>
              </div>

              <div className="approval-card-actions">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Download}
                  onClick={() => approvalService.downloadDrawingPdf(item)}
                >
                  Download PDF
                </Button>

                {item.status !== 'Approved' && item.status !== 'Approved & Sealed' && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={MessageSquare}
                      onClick={() => openRevisionModal(item)}
                    >
                      Request Revision
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={CheckCircle}
                      onClick={() => handleApprove(item)}
                    >
                      Approve Drawing
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revision Modal */}
      <Modal
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        title={`Request Revision for ${selectedApp?.drawingNo || 'Drawing'}`}
        maxWidth="540px"
      >
        <form onSubmit={handleRevisionSubmit} className="approval-modal-form">
          <p style={{ fontSize: '13px', color: '#7B6F62', margin: 0, lineHeight: 1.5 }}>
            Specify architectural markups, dimension amendments, or client change requests:
          </p>
          <div className="approval-form-group">
            <label className="approval-form-label" htmlFor="rev-notes">
              Revision Notes / Requested Changes <span className="required">*</span>
            </label>
            <textarea
              id="rev-notes"
              className="approval-form-textarea"
              placeholder="Enter detailed revision notes or requested changes..."
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              required
            />
          </div>
          <div className="approval-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setRevisionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Submit Revision Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Approval Request Modal */}
      <Modal
        isOpen={newRequestModalOpen}
        onClose={() => setNewRequestModalOpen(false)}
        title="Submit Drawing Approval / Revision Request"
        maxWidth="580px"
      >
        <form onSubmit={handleNewRequestSubmit} className="approval-modal-form">
          <div className="approval-form-group">
            <label className="approval-form-label" htmlFor="req-project">
              Associated Architectural Project <span className="required">*</span>
            </label>
            <select
              id="req-project"
              className="approval-form-select"
              value={newRequestForm.projectId}
              onChange={(e) => {
                const pId = e.target.value;
                const p = projectsList.find((item) => (item.id || item._id) === pId);
                setNewRequestForm((prev) => ({
                  ...prev,
                  projectId: pId,
                  projectName: p?.name || p?.title || '',
                  clientName: p?.client?.name || p?.clientName || ''
                }));
              }}
              required
            >
              {projectsList.length === 0 ? (
                <option value="">No active projects found</option>
              ) : (
                projectsList.map((p) => (
                  <option key={p.id || p._id} value={p.id || p._id}>
                    {p.name || p.title} ({p.code || 'PRJ'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="approval-form-row-title-no">
            <div className="approval-form-group">
              <label className="approval-form-label" htmlFor="req-title">
                Drawing Sheet Title <span className="required">*</span>
              </label>
              <Input
                id="req-title"
                placeholder="e.g. 2nd Floor Structural Reinforcement Layout"
                value={newRequestForm.title}
                onChange={(e) => setNewRequestForm({ ...newRequestForm, title: e.target.value })}
                required
              />
            </div>
            <div className="approval-form-group">
              <label className="approval-form-label" htmlFor="req-dwg-no">
                Drawing Number
              </label>
              <Input
                id="req-dwg-no"
                placeholder="MMD-S02"
                value={newRequestForm.drawingNo}
                onChange={(e) => setNewRequestForm({ ...newRequestForm, drawingNo: e.target.value })}
              />
            </div>
          </div>

          <div className="approval-form-row-2">
            <div className="approval-form-group">
              <label className="approval-form-label" htmlFor="req-type">
                Request Category
              </label>
              <select
                id="req-type"
                className="approval-form-select"
                value={newRequestForm.type}
                onChange={(e) => setNewRequestForm({ ...newRequestForm, type: e.target.value })}
              >
                <option value="CLIENT_APPROVAL">Client Sign-Off &amp; Approval</option>
                <option value="REVISION">Drawing Revision / Markup</option>
                <option value="MUNICIPAL_CLEARANCE">Municipal &amp; Structural Clearance</option>
              </select>
            </div>
            <div className="approval-form-group">
              <label className="approval-form-label" htmlFor="req-version">
                Sheet Revision Code
              </label>
              <select
                id="req-version"
                className="approval-form-select"
                value={newRequestForm.version}
                onChange={(e) => setNewRequestForm({ ...newRequestForm, version: e.target.value })}
              >
                <option value="R0">R0 (Initial Concept Release)</option>
                <option value="R1">R1 (Working Drawing Release)</option>
                <option value="R2">R2 (Structural Amendment)</option>
                <option value="R3">R3 (Site Execution Final)</option>
              </select>
            </div>
          </div>

          <div className="approval-form-group">
            <label className="approval-form-label" htmlFor="req-notes">
              Submission Remarks / Specific Instructions
            </label>
            <textarea
              id="req-notes"
              className="approval-form-textarea"
              placeholder="Provide notes regarding structural changes, MEP coordinates, or client requests..."
              value={newRequestForm.notes}
              onChange={(e) => setNewRequestForm({ ...newRequestForm, notes: e.target.value })}
            />
          </div>

          <div className="approval-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setNewRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitLoading}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ApprovalsPage;
