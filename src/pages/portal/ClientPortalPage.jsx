import React, { useState, useEffect, useCallback } from 'react';
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
  MessageSquare,
  Lock,
  Mail,
  Phone,
  User,
  Shield,
  LogOut,
  ExternalLink,
  ChevronRight,
  Briefcase,
  Copy,
  Clock,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Plus
} from 'lucide-react';
import { MayurMehtaLogo } from '../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Input } from '../../components/common/Input/Input';
import { clientPortalService } from '../../services/clientPortalService';
import { extractErrorMessage } from '../../utils/errorHandler';
import './ClientPortalPage.css';

export function ClientPortalPage() {
  const { code: urlCode } = useParams();
  const navigate = useNavigate();

  // Navigation / View state: 'CODE_ENTRY' | 'LOGIN' | 'REGISTER' | 'VERIFY_OTP' | 'FORGOT_PW' | 'PORTAL'
  const [viewMode, setViewMode] = useState(clientPortalService.isLoggedIn() ? 'PORTAL' : (urlCode ? 'CODE_ENTRY' : 'CODE_ENTRY'));
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  // Direct Connect Code Access
  const [inputCode, setInputCode] = useState(urlCode || '');
  const [directProject, setDirectProject] = useState(null);

  // Client Auth State
  const [clientProfile, setClientProfile] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [otpCode, setOtpCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');

  // Portal Hub Data (When logged in as Client)
  const [firmLinks, setFirmLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [firmProjects, setFirmProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [firmPortfolio, setFirmPortfolio] = useState([]);
  const [activePortalTab, setActivePortalTab] = useState('projects'); // 'projects' | 'files' | 'portfolio' | 'connect_code'

  // Connect Code State for Client
  const [activeConnectCode, setActiveConnectCode] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const showAlert = (message, type = 'success') => {
    setAlertMessage({ message, type });
    setTimeout(() => setAlertMessage(null), 5000);
  };

  // 1. Initial Profile & Links Load if logged in
  const loadClientPortalData = useCallback(async () => {
    if (!clientPortalService.isLoggedIn()) return;
    setLoading(true);
    try {
      const [profileRes, linksRes, codeRes] = await Promise.all([
        clientPortalService.getProfile().catch(() => null),
        clientPortalService.getLinks().catch(() => []),
        clientPortalService.getActiveConnectCode().catch(() => null)
      ]);

      if (profileRes) setClientProfile(profileRes);
      const links = Array.isArray(linksRes) ? linksRes : [];
      setFirmLinks(links);
      if (links.length > 0 && !selectedLink) {
        setSelectedLink(links[0]);
      }
      if (codeRes) setActiveConnectCode(codeRes);
    } catch (err) {
      console.warn('Portal initialization error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedLink]);

  useEffect(() => {
    if (viewMode === 'PORTAL') {
      loadClientPortalData();
    }
  }, [viewMode, loadClientPortalData]);

  // 2. Load Projects & Portfolio when Selected Link changes
  useEffect(() => {
    if (!selectedLink) return;
    const linkId = selectedLink._id || selectedLink.id;

    clientPortalService.getLinkProjects(linkId).then((projects) => {
      const list = Array.isArray(projects) ? projects : [];
      setFirmProjects(list);
      if (list.length > 0) {
        setSelectedProject(list[0]);
      } else {
        setSelectedProject(null);
      }
    }).catch(() => setFirmProjects([]));

    clientPortalService.getLinkPortfolio(linkId).then((items) => {
      setFirmPortfolio(Array.isArray(items) ? items : []);
    }).catch(() => setFirmPortfolio([]));
  }, [selectedLink]);

  // 3. Load Shared Files when Selected Project changes
  useEffect(() => {
    if (!selectedLink || !selectedProject) return;
    const linkId = selectedLink._id || selectedLink.id;
    const projectId = selectedProject._id || selectedProject.id;

    clientPortalService.getProjectFiles(linkId, projectId).then((files) => {
      setProjectFiles(Array.isArray(files) ? files : []);
    }).catch(() => setProjectFiles([]));
  }, [selectedLink, selectedProject]);

  // ==========================================
  // Direct Code Access Flow
  // ==========================================
  const handleDirectCodeSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    try {
      const data = await clientPortalService.getPortalByCode(cleanCode);
      if (data && (data.code || data.projectTitle || data.name || data.title)) {
        setDirectProject(data);
        showAlert(`Access granted to ${data.projectTitle || data.title || 'Project'}.`);
      } else {
        showAlert('Invalid access code or portal link expired. Please contact your architect.', 'error');
      }
    } catch {
      showAlert('Portal access code not found or expired. Please contact your design studio.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Client Authentication Handlers
  // ==========================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await clientPortalService.login(loginForm);
      showAlert('Signed in successfully to Client Portal.');
      setViewMode('PORTAL');
    } catch (err) {
      showAlert(extractErrorMessage(err, 'Failed to sign in'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await clientPortalService.register(registerForm);
      setPendingEmail(registerForm.email);
      showAlert('Account registered. Please enter the 6-digit OTP sent to your email.');
      setViewMode('VERIFY_OTP');
    } catch (err) {
      showAlert(extractErrorMessage(err, 'Registration failed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await clientPortalService.verifyEmail({
        email: pendingEmail || registerForm.email,
        otp: otpCode.trim()
      });
      showAlert('Email verified successfully! Welcome to your Client Portal.');
      setViewMode('PORTAL');
    } catch (err) {
      showAlert(extractErrorMessage(err, 'OTP verification failed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const targetEmail = pendingEmail || registerForm.email;
    if (!targetEmail) return;
    try {
      await clientPortalService.resendOtp(targetEmail);
      showAlert('New verification OTP sent to your email.');
    } catch (err) {
      showAlert(extractErrorMessage(err, 'Failed to resend OTP'), 'error');
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await clientPortalService.forgotPassword(forgotEmail);
      showAlert('Password reset instructions sent to your email.');
      setViewMode('LOGIN');
    } catch (err) {
      showAlert(extractErrorMessage(err, 'Reset request failed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await clientPortalService.logout();
    setClientProfile(null);
    setFirmLinks([]);
    setSelectedLink(null);
    setSelectedProject(null);
    setViewMode('LOGIN');
    showAlert('Signed out of Client Portal.');
  };

  // ==========================================
  // Connect Code Generation for Client
  // ==========================================
  const handleGenerateCode = async () => {
    setActionLoading(true);
    try {
      const codeData = await clientPortalService.generateConnectCode();
      setActiveConnectCode(codeData);
      showAlert('New 10-character Connect Code generated. Share this with your architect.');
    } catch (err) {
      showAlert(extractErrorMessage(err, 'Failed to generate code'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeCode = async () => {
    setActionLoading(true);
    try {
      await clientPortalService.revokeActiveConnectCode();
      setActiveConnectCode(null);
      showAlert('Connect Code revoked.');
    } catch (err) {
      showAlert(extractErrorMessage(err, 'Failed to revoke code'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyCode = (codeStr) => {
    if (!codeStr) return;
    navigator.clipboard.writeText(codeStr);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Handle File Download
  const handleDownloadFile = async (file) => {
    if (!selectedLink || !selectedProject) return;
    try {
      await clientPortalService.downloadProjectFile(
        selectedLink._id || selectedLink.id,
        selectedProject._id || selectedProject.id,
        file._id || file.id,
        file.name || 'Project-File'
      );
      showAlert(`Downloaded "${file.name}".`);
    } catch (err) {
      showAlert(extractErrorMessage(err, 'Failed to download file'), 'error');
    }
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
            <span>MODULE M2.6 • CLIENT SELF-SERVICE PORTAL</span>
          </span>

          {clientPortalService.isLoggedIn() ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="client-user-pill">
                <User size={13} />
                <span>{clientProfile?.fullName || 'Client'}</span>
              </span>
              <button type="button" className="portal-back-btn" onClick={handleLogout}>
                <LogOut size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              {viewMode !== 'CODE_ENTRY' && (
                <button
                  type="button"
                  className="portal-back-btn"
                  onClick={() => setViewMode('CODE_ENTRY')}
                >
                  Enter Connect Code
                </button>
              )}
              {viewMode !== 'LOGIN' && (
                <button
                  type="button"
                  className="portal-back-btn"
                  onClick={() => setViewMode('LOGIN')}
                >
                  Client Sign In
                </button>
              )}
              <button
                type="button"
                className="portal-back-btn primary-back"
                onClick={() => navigate('/login')}
              >
                Studio Team Sign In
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="portal-container">
        {/* Toast / Alert Message */}
        {alertMessage && (
          <div className={`portal-alert-box alert-${alertMessage.type}`}>
            {alertMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{alertMessage.message}</span>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 1: Connect Code Quick Access                     */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'CODE_ENTRY' && !directProject && (
          <div className="portal-auth-card">
            <div className="portal-auth-icon-wrap">
              <KeyRound size={28} />
            </div>
            <h1 className="portal-auth-title">Architectural Project Portal</h1>
            <p className="portal-auth-desc">
              Enter the 10-character human-friendly Connect Code (e.g. <code>ABCD-EFGH-99</code>) provided by your architectural or interior design studio.
            </p>

            <form onSubmit={handleDirectCodeSubmit} className="portal-code-form">
              <div className="code-input-group">
                <input
                  type="text"
                  placeholder="Enter 10-char Connect Code"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  maxLength={14}
                  className="portal-code-input"
                  required
                />
                <Button type="submit" variant="primary" size="md" disabled={loading}>
                  {loading ? 'Verifying...' : 'Access Project'}
                </Button>
              </div>

              <div className="portal-switch-row">
                <span>Already have a client account?</span>
                <button type="button" className="link-text-btn" onClick={() => setViewMode('LOGIN')}>
                  Sign in with Email
                </button>
                <span>or</span>
                <button type="button" className="link-text-btn" onClick={() => setViewMode('REGISTER')}>
                  Create Client Account
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Direct Project Preview (if accessed via code) */}
        {viewMode === 'CODE_ENTRY' && directProject && (
          <div className="portal-project-dashboard">
            <div className="portal-hero-banner">
              <div className="hero-left">
                <div className="hero-code-pill">
                  <span>ACCESS CODE: {inputCode}</span>
                  <span className="code-badge-verified">Verified External Access</span>
                </div>
                <h1 className="hero-project-title">{directProject.projectTitle || directProject.title || 'Project Showcase'}</h1>
                <p className="hero-client-sub">
                  Curated for <strong>{directProject.clientName || 'Client'}</strong> • {directProject.city || 'Gujarat'}
                </p>
              </div>
              <div className="hero-right-metrics">
                <div className="hero-metric-box">
                  <span className="metric-label">STATUS</span>
                  <span className="metric-val">{directProject.status || 'ACTIVE'}</span>
                </div>
              </div>
            </div>

            <div className="portal-auth-card" style={{ maxWidth: '600px', margin: '24px auto' }}>
              <Sparkles size={32} color="#7B6F62" style={{ margin: '0 auto 12px' }} />
              <h3>Connect Code Linked</h3>
              <p className="portal-auth-desc">
                This project is verified under Module M2.6 External Portal. Sign in or register your client account to save this connection permanently and access drawings, files, and milestones.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
                <Button variant="secondary" onClick={() => setDirectProject(null)}>
                  Back
                </Button>
                <Button variant="primary" onClick={() => setViewMode('LOGIN')}>
                  Sign in to View Full Portal
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 2: Client Login                                 */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'LOGIN' && (
          <div className="portal-auth-card">
            <div className="portal-auth-icon-wrap">
              <Lock size={26} />
            </div>
            <h1 className="portal-auth-title">Client Account Sign In</h1>
            <p className="portal-auth-desc">
              External client self-service portal. Manage your projects, site milestones, and design drawings across architectural firms.
            </p>

            <form onSubmit={handleLoginSubmit} className="portal-modal-form">
              <Input
                label="Email Address"
                type="email"
                placeholder="client@example.com"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••••••"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="link-text-btn"
                  onClick={() => setViewMode('FORGOT_PW')}
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" variant="primary" size="lg" disabled={actionLoading}>
                {actionLoading ? 'Signing In...' : 'Sign In to Portal'}
              </Button>

              <div className="portal-switch-row" style={{ marginTop: '16px' }}>
                <span>Don't have an account?</span>
                <button type="button" className="link-text-btn" onClick={() => setViewMode('REGISTER')}>
                  Register as Client
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 3: Client Self-Service Registration             */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'REGISTER' && (
          <div className="portal-auth-card">
            <div className="portal-auth-icon-wrap">
              <UserCheck size={26} />
            </div>
            <h1 className="portal-auth-title">Create Client Account</h1>
            <p className="portal-auth-desc">
              Register for external project access. Connect with your architects without consuming team user seats.
            </p>

            <form onSubmit={handleRegisterSubmit} className="portal-modal-form">
              <Input
                label="Full Name *"
                placeholder="e.g. Rahul Sharma"
                value={registerForm.fullName}
                onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                required
              />

              <Input
                label="Email Address *"
                type="email"
                placeholder="rahul@example.com"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="+91 98765 43210"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
              />

              <Input
                label="Password *"
                type="password"
                placeholder="At least 8 characters"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                required
                minLength={8}
              />

              <Button type="submit" variant="primary" size="lg" disabled={actionLoading}>
                {actionLoading ? 'Creating Account...' : 'Register Account'}
              </Button>

              <div className="portal-switch-row" style={{ marginTop: '16px' }}>
                <span>Already registered?</span>
                <button type="button" className="link-text-btn" onClick={() => setViewMode('LOGIN')}>
                  Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 4: Verify 6-digit Email OTP                     */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'VERIFY_OTP' && (
          <div className="portal-auth-card">
            <div className="portal-auth-icon-wrap">
              <Mail size={26} />
            </div>
            <h1 className="portal-auth-title">Verify Email OTP</h1>
            <p className="portal-auth-desc">
              Enter the 6-digit verification code sent to <strong>{pendingEmail || registerForm.email}</strong>.
            </p>

            <form onSubmit={handleVerifyOtpSubmit} className="portal-modal-form">
              <Input
                label="6-Digit Verification Code *"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                required
                style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '4px' }}
              />

              <Button type="submit" variant="primary" size="lg" disabled={actionLoading}>
                {actionLoading ? 'Verifying OTP...' : 'Verify & Continue'}
              </Button>

              <div className="portal-switch-row" style={{ marginTop: '16px' }}>
                <button type="button" className="link-text-btn" onClick={handleResendOtp}>
                  Didn't receive code? Resend OTP
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 5: Forgot Password                              */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'FORGOT_PW' && (
          <div className="portal-auth-card">
            <div className="portal-auth-icon-wrap">
              <KeyRound size={26} />
            </div>
            <h1 className="portal-auth-title">Reset Password</h1>
            <p className="portal-auth-desc">
              Enter your registered email address and we'll send you secure password reset instructions.
            </p>

            <form onSubmit={handleForgotPasswordSubmit} className="portal-modal-form">
              <Input
                label="Email Address *"
                type="email"
                placeholder="client@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" size="lg" disabled={actionLoading}>
                {actionLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="portal-switch-row" style={{ marginTop: '16px' }}>
                <button type="button" className="link-text-btn" onClick={() => setViewMode('LOGIN')}>
                  Back to Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 6: Authenticated Client Portal Hub (Module M2.6) */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'PORTAL' && (
          <div className="portal-hub-container">
            {/* Firm Selector & Welcome Row */}
            <div className="portal-welcome-row">
              <div>
                <h1 className="portal-heading">Welcome, {clientProfile?.fullName || 'Client'}</h1>
                <p className="portal-subheading">
                  Multi-firm collaboration hub • Zero-seat billing integration • Curated project access
                </p>
              </div>

              {/* Connected Firm Switcher */}
              <div className="portal-firm-switcher">
                <span className="firm-switcher-label">Connected Firm:</span>
                {firmLinks.length === 0 ? (
                  <Badge variant="neutral">No Firms Linked Yet</Badge>
                ) : (
                  <select
                    className="firm-select-dropdown"
                    value={selectedLink?._id || selectedLink?.id || ''}
                    onChange={(e) => {
                      const match = firmLinks.find((l) => (l._id || l.id) === e.target.value);
                      if (match) setSelectedLink(match);
                    }}
                  >
                    {firmLinks.map((link) => (
                      <option key={link._id || link.id} value={link._id || link.id}>
                        {link.companyName || link.company?.name || 'Architectural Studio'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Portal Hub Navigation Tabs */}
            <div className="portal-tabs-nav">
              <button
                type="button"
                className={`portal-tab-btn ${activePortalTab === 'projects' ? 'active' : ''}`}
                onClick={() => setActivePortalTab('projects')}
              >
                <Briefcase size={16} />
                <span>Curated Projects ({firmProjects.length})</span>
              </button>

              <button
                type="button"
                className={`portal-tab-btn ${activePortalTab === 'files' ? 'active' : ''}`}
                onClick={() => setActivePortalTab('files')}
              >
                <FileCheck2 size={16} />
                <span>Shared Drawings & Files ({projectFiles.length})</span>
              </button>

              <button
                type="button"
                className={`portal-tab-btn ${activePortalTab === 'portfolio' ? 'active' : ''}`}
                onClick={() => setActivePortalTab('portfolio')}
              >
                <Sparkles size={16} />
                <span>Firm Portfolio ({firmPortfolio.length})</span>
              </button>

              <button
                type="button"
                className={`portal-tab-btn ${activePortalTab === 'connect_code' ? 'active' : ''}`}
                onClick={() => setActivePortalTab('connect_code')}
              >
                <KeyRound size={16} />
                <span>My Connect Code</span>
              </button>
            </div>

            {/* Tab 1: Curated Projects View */}
            {activePortalTab === 'projects' && (
              <div className="portal-tab-content">
                {firmProjects.length === 0 ? (
                  <div className="portal-empty-card">
                    <Building size={44} strokeWidth={1.2} />
                    <h3>No Active Projects</h3>
                    <p>There are currently no active projects linked to this firm account.</p>
                  </div>
                ) : (
                  <div className="portal-projects-grid">
                    {firmProjects.map((p) => {
                      const isSelected = (selectedProject?._id || selectedProject?.id) === (p._id || p.id);
                      return (
                        <div
                          key={p._id || p.id}
                          className={`portal-project-card ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => setSelectedProject(p)}
                        >
                          <div className="project-card-header">
                            <span className="project-code-badge">{p.code || 'PRJ'}</span>
                            <Badge variant={p.status === 'ACTIVE' ? 'success' : 'neutral'}>
                              {p.status || 'ACTIVE'}
                            </Badge>
                          </div>
                          <h3 className="project-title">{p.title || p.name}</h3>
                          <p className="project-loc">{p.siteAddress || p.city || 'Gujarat, India'}</p>

                          {/* Curated allow-list fields only: Site, Manager, Stages */}
                          <div className="project-specs-list">
                            {p.projectManager && (
                              <div className="spec-row">
                                <span className="spec-label">Project Manager:</span>
                                <span className="spec-val">{p.projectManager.name || p.projectManager}</span>
                              </div>
                            )}
                            {p.currentStage && (
                              <div className="spec-row">
                                <span className="spec-label">Current Stage:</span>
                                <span className="spec-val">{p.currentStage}</span>
                              </div>
                            )}
                          </div>

                          <div className="project-card-footer">
                            <span className="view-detail-link">
                              {isSelected ? 'Viewing Project &rarr;' : 'Select Project'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Selected Project Full Curated View */}
                {selectedProject && (
                  <div className="selected-project-detail-box">
                    <h2 className="detail-heading">Project Scope & Milestones</h2>
                    <p className="detail-sub">{selectedProject.title || selectedProject.name}</p>

                    <div className="detail-grid-3">
                      <div className="detail-kpi-card">
                        <span className="kpi-label">LOCATION</span>
                        <span className="kpi-val">{selectedProject.siteAddress || selectedProject.city || '-'}</span>
                      </div>
                      <div className="detail-kpi-card">
                        <span className="kpi-label">STATUS</span>
                        <span className="kpi-val">{selectedProject.status || 'ACTIVE'}</span>
                      </div>
                      <div className="detail-kpi-card">
                        <span className="kpi-label">PORTAL ACCESS</span>
                        <span className="kpi-val">Verified Secure</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Shared Drawings & Files */}
            {activePortalTab === 'files' && (
              <div className="portal-tab-content">
                <div className="portal-table-card">
                  <div className="table-header-row">
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px' }}>
                        Curated Files for {selectedProject?.title || 'Selected Project'}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#7B6F62' }}>
                        Files explicitly shared with you by your design firm (RFC 5987 secure streaming)
                      </p>
                    </div>
                  </div>

                  {projectFiles.length === 0 ? (
                    <div className="portal-empty-card" style={{ border: 'none' }}>
                      <FolderOpen size={40} strokeWidth={1.2} />
                      <p>No documents or drawings have been shared yet for this project.</p>
                    </div>
                  ) : (
                    <table className="portal-data-table">
                      <thead>
                        <tr>
                          <th>Document Title</th>
                          <th>Shared Date</th>
                          <th>Size</th>
                          <th style={{ textAlign: 'right' }}>Download</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectFiles.map((f) => (
                          <tr key={f._id || f.id}>
                            <td>
                              <div className="drawing-title-cell">
                                <span className="sheet-title">{f.name || f.title}</span>
                                <span className="sheet-size">{f.mimeType || 'Document'}</span>
                              </div>
                            </td>
                            <td>{f.sharedAt ? new Date(f.sharedAt).toLocaleDateString() : 'Recent'}</td>
                            <td>{f.sizeBytes ? `${(f.sizeBytes / 1024).toFixed(0)} KB` : '-'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={Download}
                                onClick={() => handleDownloadFile(f)}
                              >
                                Download
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Firm Portfolio Showcase */}
            {activePortalTab === 'portfolio' && (
              <div className="portal-tab-content">
                {firmPortfolio.length === 0 ? (
                  <div className="portal-empty-card">
                    <Sparkles size={40} strokeWidth={1.2} />
                    <p>No shareable showcase portfolio items published yet by this firm.</p>
                  </div>
                ) : (
                  <div className="portal-projects-grid">
                    {firmPortfolio.map((item) => (
                      <div key={item._id || item.id} className="portal-project-card">
                        <span className="project-code-badge">{item.code || 'PRT'}</span>
                        <h3 className="project-title">{item.title}</h3>
                        <p className="project-loc">{item.portfolio?.city || item.category || 'Architecture'}</p>
                        {item.description && <p className="spec-val" style={{ marginTop: '8px' }}>{item.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: My Connect Code (Safe Two-Step Linking) */}
            {activePortalTab === 'connect_code' && (
              <div className="portal-tab-content">
                <div className="portal-auth-card" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div className="portal-auth-icon-wrap" style={{ margin: 0 }}>
                      <KeyRound size={24} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '18px', color: '#1E1A17' }}>Unique Connect Code</h2>
                      <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#7B6F62' }}>
                        Module M2.6 Human-friendly 10-character code with 72-hour TTL
                      </p>
                    </div>
                  </div>

                  <p className="portal-auth-desc" style={{ textAlign: 'left' }}>
                    Provide this code to your architectural or interior design studio. They will preview and link your client account directly from their Studio Directory.
                  </p>

                  {activeConnectCode?.code ? (
                    <div className="active-code-display-card">
                      <div className="code-string-row">
                        <span className="code-large-text">{activeConnectCode.code}</span>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Copy}
                          onClick={() => handleCopyCode(activeConnectCode.code)}
                        >
                          {copiedCode ? 'Copied!' : 'Copy Code'}
                        </Button>
                      </div>

                      <div className="code-expiry-row">
                        <Clock size={13} />
                        <span>
                          Expires in: {activeConnectCode.expiresAt ? new Date(activeConnectCode.expiresAt).toLocaleString() : '72 Hours'}
                        </span>
                      </div>

                      <div style={{ marginTop: '16px' }}>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={handleRevokeCode}
                          disabled={actionLoading}
                        >
                          Revoke Code
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <p style={{ fontSize: '13px', color: '#7B6F62', marginBottom: '16px' }}>
                        No active connect code found. Generate a fresh one-time code to link with a new firm.
                      </p>
                      <Button
                        variant="primary"
                        icon={Plus}
                        onClick={handleGenerateCode}
                        disabled={actionLoading}
                      >
                        {actionLoading ? 'Generating...' : 'Generate New Connect Code'}
                      </Button>
                    </div>
                  )}

                  <div className="portal-security-notice">
                    <Shield size={16} />
                    <span>
                      Connect Codes omit confusing characters (no 0, O, 1, I, L) and are stored securely using SHA-256 HMAC encryption.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default ClientPortalPage;
