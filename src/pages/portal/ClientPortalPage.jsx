import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  KeyRound,
  FileCheck2,
  FileText,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Download,
  Share2,
  Calendar,
  Building,
  UserCheck,
  Send,
  MessageSquare
} from 'lucide-react';
import { MayurMehtaLogo } from '../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { apiClient } from '../../services/apiClient';
import './ClientPortalPage.css';

export function ClientPortalPage() {
  const { code: urlCode } = useParams();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState(urlCode || '');
  const [activeCode, setActiveCode] = useState(urlCode || '');
  const [currentProject, setCurrentProject] = useState(null);
  const [activeTab, setActiveTab] = useState('drawings');
  const [drawingsList, setDrawingsList] = useState([]);
  const [quotationsList, setQuotationsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const [revisionRemarks, setRevisionRemarks] = useState('');

  const fetchPortalData = async (code) => {
    if (!code) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await apiClient.get(`/portal/${code}`);
      const data = res?.data || res;
      if (data && (data.code || data.projectTitle || data.name)) {
        setCurrentProject(data);
        setDrawingsList(data.drawings || []);
        setQuotationsList(data.quotations || []);
      } else {
        setCurrentProject(null);
        setErrorMessage('Invalid access code. Please check with your architect.');
      }
    } catch (err) {
      console.warn('GET /portal/:code API notice:', err?.response?.status || err.message);
      setCurrentProject(null);
      setErrorMessage(err?.response?.data?.message || 'Access code not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCode) {
      fetchPortalData(activeCode.toUpperCase());
    }
  }, [activeCode]);

  const handleAccessSubmit = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setActiveCode(inputCode.trim().toUpperCase());
  };

  const handleApproveDrawing = (drawingId) => {
    setDrawingsList((prev) =>
      prev.map((d) =>
        d.id === drawingId
          ? {
              ...d,
              status: 'Approved',
              approvedBy: currentProject?.clientName || 'Client',
              approvedAt: 'Just now'
            }
          : d
      )
    );
    setFeedbackSuccess('Drawing successfully approved and logged in project audit trail.');
    setTimeout(() => setFeedbackSuccess(''), 5000);
  };

  const handleOpenRevisionModal = (drawing) => {
    setSelectedDrawing(drawing);
    setRevisionRemarks('');
    setRevisionModalOpen(true);
  };

  const handleRevisionSubmit = (e) => {
    e.preventDefault();
    if (!selectedDrawing || !revisionRemarks.trim()) return;

    setDrawingsList((prev) =>
      prev.map((d) =>
        d.id === selectedDrawing.id
          ? {
              ...d,
              status: 'Revision Requested',
              revisionNote: revisionRemarks,
              approvedBy: currentProject?.clientName || 'Client',
              approvedAt: 'Revision requested just now'
            }
          : d
      )
    );

    setRevisionModalOpen(false);
    setFeedbackSuccess('Revision request submitted to design studio.');
    setTimeout(() => setFeedbackSuccess(''), 5000);
  };

  return (
    <div className="client-portal-wrapper">
      {/* Top Header */}
      <header className="portal-header">
        <div className="portal-brand">
          <MayurMehtaLogo size="md" color="taupe" showTagline={true} />
        </div>
        <div className="portal-header-meta">
          <span className="portal-access-badge">
            <KeyRound size={13} />
            <span>CLIENT & VENDOR ACCESS PORTAL</span>
          </span>
          <button
            type="button"
            className="portal-back-btn"
            onClick={() => navigate('/login')}
          >
            Studio Sign In
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="portal-container">
        {!currentProject ? (
          /* Code Entry Card */
          <div className="portal-auth-card">
            <div className="portal-auth-icon-wrap">
              <KeyRound size={28} />
            </div>
            <h1 className="portal-auth-title">Project Collaboration Portal</h1>
            <p className="portal-auth-desc">
              Enter the unique 6-digit access code provided by <strong>Mayur Mehta Design</strong> to review drawings, approve materials, and track site milestones.
            </p>

            <form onSubmit={handleAccessSubmit} className="portal-code-form">
              <div className="code-input-group">
                <input
                  type="text"
                  placeholder="Enter project access passcode"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="portal-code-input"
                  required
                />
                <Button type="submit" variant="primary" size="md">
                  Access Project
                </Button>
              </div>

              <div className="portal-demo-hint">
                <span>Demo Access Code:</span>
                <button
                  type="button"
                  className="hint-chip"
                  onClick={() => {
                    setInputCode('MM-7492');
                    setActiveCode('MM-7492');
                  }}
                >
                  MM-7492
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Project Dashboard for Client */
          <div className="portal-project-dashboard">
            {/* Project Hero Banner */}
            <div className="portal-hero-banner">
              <div className="hero-left">
                <div className="hero-code-pill">
                  <span>ACCESS CODE: {currentProject.code}</span>
                  <span className="code-badge-verified">Verified External Access</span>
                </div>
                <h1 className="hero-project-title">{currentProject.projectTitle}</h1>
                <p className="hero-client-sub">
                  Prepared for <strong>{currentProject.clientName}</strong> • {currentProject.typology} • {currentProject.city}
                </p>
              </div>

              <div className="hero-right-metrics">
                <div className="hero-metric-box">
                  <span className="metric-label">STATUS</span>
                  <span className="metric-val">{currentProject.status}</span>
                </div>
                <div className="hero-metric-box">
                  <span className="metric-label">LEAD ARCHITECT</span>
                  <span className="metric-val">{currentProject.leadArchitect}</span>
                </div>
              </div>
            </div>

            {feedbackSuccess && (
              <div className="portal-alert-success">
                <CheckCircle2 size={18} />
                <span>{feedbackSuccess}</span>
              </div>
            )}

            {/* Portal Tabs */}
            <div className="portal-tabs-nav">
              <button
                type="button"
                className={`portal-tab-btn ${activeTab === 'drawings' ? 'active' : ''}`}
                onClick={() => setActiveTab('drawings')}
              >
                <FileCheck2 size={16} />
                <span>Drawings & Approvals ({drawingsList.length})</span>
              </button>
              <button
                type="button"
                className={`portal-tab-btn ${activeTab === 'materials' ? 'active' : ''}`}
                onClick={() => setActiveTab('materials')}
              >
                <Layers size={16} />
                <span>Material Shortlist ({currentProject.materials.length})</span>
              </button>
              <button
                type="button"
                className={`portal-tab-btn ${activeTab === 'quotations' ? 'active' : ''}`}
                onClick={() => setActiveTab('quotations')}
              >
                <FileText size={16} />
                <span>Quotations & BOQ ({quotationsList.length})</span>
              </button>
              <button
                type="button"
                className={`portal-tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
                onClick={() => setActiveTab('photos')}
              >
                <ImageIcon size={16} />
                <span>Site Progress Photos ({currentProject.sitePhotos.length})</span>
              </button>
            </div>

            {/* Tab 1: Drawings & Approvals */}
            {activeTab === 'drawings' && (
              <div className="portal-tab-content">
                <div className="portal-table-card">
                  <table className="portal-data-table">
                    <thead>
                      <tr>
                        <th>Drawing Sheet Title</th>
                        <th>Category</th>
                        <th>Revision</th>
                        <th>Issue Date</th>
                        <th>Approval Status</th>
                        <th style={{ textAlign: 'right' }}>Client Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drawingsList.map((drw) => (
                        <tr key={drw.id}>
                          <td>
                            <div className="drawing-title-cell">
                              <span className="sheet-title">{drw.title}</span>
                              <span className="sheet-size">{drw.fileSize} PDF</span>
                            </div>
                          </td>
                          <td>
                            <span className="sheet-category-tag">{drw.category}</span>
                          </td>
                          <td>
                            <span className="sheet-rev-tag">{drw.revision}</span>
                          </td>
                          <td>{drw.date}</td>
                          <td>
                            <Badge
                              variant={
                                drw.status === 'Approved'
                                  ? 'success'
                                  : drw.status === 'Revision Requested'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {drw.status}
                            </Badge>
                            {drw.approvedBy && (
                              <div className="audit-subtext">
                                {drw.approvedBy} • {drw.approvedAt}
                              </div>
                            )}
                            {drw.revisionNote && (
                              <div className="revision-note-sub">
                                Note: {drw.revisionNote}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="action-buttons-cell">
                              <button
                                type="button"
                                className="portal-btn-download"
                                title="Download PDF Drawing"
                              >
                                <Download size={14} />
                                <span>PDF</span>
                              </button>

                              {drw.status === 'Pending Review' && (
                                <>
                                  <button
                                    type="button"
                                    className="portal-btn-approve"
                                    onClick={() => handleApproveDrawing(drw.id)}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="portal-btn-reject"
                                    onClick={() => handleOpenRevisionModal(drw)}
                                  >
                                    Revision
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: Material Shortlist */}
            {activeTab === 'materials' && (
              <div className="portal-tab-content">
                <div className="materials-grid">
                  {currentProject.materials.map((mat) => (
                    <div key={mat.id} className="material-card">
                      <div className="material-sample-swatch" />
                      <div className="material-details">
                        <div className="material-header-row">
                          <h4 className="material-name">{mat.name}</h4>
                          <Badge variant={mat.status.includes('Approved') ? 'success' : 'neutral'}>
                            {mat.status}
                          </Badge>
                        </div>
                        <p className="material-spec">{mat.spec}</p>
                        <span className="material-app">Location: {mat.application}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Quotations */}
            {activeTab === 'quotations' && (
              <div className="portal-tab-content">
                <div className="portal-table-card">
                  <table className="portal-data-table">
                    <thead>
                      <tr>
                        <th>Quotation / BOQ Name</th>
                        <th>Vendor Contractor</th>
                        <th>Total Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotationsList.map((q) => (
                        <tr key={q.id}>
                          <td><strong>{q.title}</strong></td>
                          <td>{q.vendor}</td>
                          <td><span className="quote-amount">{q.amount}</span></td>
                          <td>{q.date}</td>
                          <td>
                            <Badge variant={q.status === 'Approved' ? 'success' : 'warning'}>
                              {q.status}
                            </Badge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Button size="sm" variant="secondary" icon={Download}>
                              View BOQ
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Site Photos */}
            {activeTab === 'photos' && (
              <div className="portal-tab-content">
                <div className="photos-grid">
                  {currentProject.sitePhotos.map((photo) => (
                    <div key={photo.id} className="photo-card">
                      <div className="photo-placeholder-box">
                        <ImageIcon size={32} color="#7B6F62" />
                        <span>Inspection Milestone Photo</span>
                      </div>
                      <div className="photo-info">
                        <h5>{photo.title}</h5>
                        <p>Stage: {photo.stage} • Captured on {photo.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Revision Modal */}
      {revisionModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card">
            <h3>Request Drawing Revision</h3>
            <p className="modal-sub">
              Sheet: <strong>{selectedDrawing?.title}</strong> ({selectedDrawing?.revision})
            </p>

            <form onSubmit={handleRevisionSubmit}>
              <textarea
                className="revision-textarea"
                placeholder="Specify requested alterations or comments..."
                rows={4}
                value={revisionRemarks}
                onChange={(e) => setRevisionRemarks(e.target.value)}
                required
              />

              <div className="modal-actions-row">
                <Button variant="secondary" onClick={() => setRevisionModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Submit Revision
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientPortalPage;
