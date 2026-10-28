import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Trash2,
  RotateCcw,
  Sliders,
  LogIn,
  Download,
  Users,
  HardDrive,
  CreditCard,
  History,
  Check,
  ExternalLink,
  Layers,
  Clock,
  Sparkles,
  Radio,
  LogOut,
  Activity,
  Database,
  Server,
  Mail,
  UserCheck,
  UserX,
  Unlock,
  KeyRound,
  Menu,
  X,
  RotateCw,
  MapPin,
  FileText,
  Edit2,
  Eye,
  Globe,
  Laptop,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
  MoreVertical
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Dropdown } from '../../components/common/Dropdown/Dropdown';
import { Select } from '../../components/common/Select/Select';
import { Avatar } from '../../components/common/Avatar/Avatar';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { adminService } from '../../services/adminService';
import { adminAuthService } from '../../services/adminAuthService';
import { setAccessToken } from '../../services/apiClient';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { MayurMehtaLogo } from '../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import { LoadingScreen } from '../../components/common/LoadingScreen/LoadingScreen';
import { extractErrorMessage } from '../../utils/errorHandler';
import { isValidEmail } from '../../utils/validators';
import { SuperAdminBilling } from './SuperAdminBilling';
import './SuperAdminPage.css';

// =============================================================================
// AUDIT LOG HELPER FUNCTIONS: Client Parsing, Action Categorization & Target
// =============================================================================

function parseUserAgent(ua) {
  if (!ua || typeof ua !== 'string') {
    return { browser: 'Browser', os: 'System', isMobile: false, device: 'Desktop' };
  }
  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  let os = 'OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  return { browser, os, isMobile, device: isMobile ? 'Mobile' : 'Desktop' };
}

function formatAuditAction(action = '') {
  const act = String(action).toUpperCase();

  if (act.includes('LOGIN_SUCCESS')) {
    return {
      label: 'Admin Login Succeeded',
      badge: 'LOGIN_SUCCESS',
      category: 'LOGINS',
      color: '#1E6B52',
      bg: '#EAF7EE',
      border: '#C1E8CE',
      icon: 'login',
      status: 'success'
    };
  }
  if (act.includes('LOGIN_FAILED') || act.includes('LOCKED')) {
    return {
      label: 'Admin Login Failed',
      badge: 'LOGIN_FAILED',
      category: 'LOGINS',
      color: '#9B2C2C',
      bg: '#FFF5F5',
      border: '#FED7D7',
      icon: 'alert',
      status: 'danger'
    };
  }
  if (act.includes('LOGOUT')) {
    return {
      label: 'Admin Logout',
      badge: act,
      category: 'LOGINS',
      color: '#6B7280',
      bg: '#F3F4F6',
      border: '#E5E7EB',
      icon: 'logout',
      status: 'neutral'
    };
  }
  if (act.includes('COMPANY_CREATED')) {
    return {
      label: 'Architecture Firm Provisioned',
      badge: 'COMPANY_CREATED',
      category: 'COMPANIES',
      color: '#A0611A',
      bg: '#FFF8F0',
      border: '#FDE1C3',
      icon: 'building',
      status: 'warning'
    };
  }
  if (act.includes('INVITE_RESENT')) {
    return {
      label: 'Owner Invitation Resent',
      badge: 'INVITE_RESENT',
      category: 'COMPANIES',
      color: '#2B6CB0',
      bg: '#EBF8FF',
      border: '#BEE3F8',
      icon: 'mail',
      status: 'info'
    };
  }
  if (act.includes('SEAT') || act.includes('RECONCILE')) {
    return {
      label: 'Seats Adjusted / Reconciled',
      badge: act,
      category: 'COMPANIES',
      color: '#805AD5',
      bg: '#FAF5FF',
      border: '#E9D8FD',
      icon: 'sliders',
      status: 'purple'
    };
  }
  if (act.includes('SUSPEND')) {
    return {
      label: 'Architecture Firm Suspended',
      badge: act,
      category: 'COMPANIES',
      color: '#C53030',
      bg: '#FFF5F5',
      border: '#FEB2B2',
      icon: 'ban',
      status: 'danger'
    };
  }
  if (act.includes('RESTORE') || act.includes('ACTIVATE')) {
    return {
      label: 'Firm Reactivated / Restored',
      badge: act,
      category: 'COMPANIES',
      color: '#276749',
      bg: '#F0FFF4',
      border: '#C6F6D5',
      icon: 'check',
      status: 'success'
    };
  }
  if (act.includes('DELETE') || act.includes('PURGE')) {
    return {
      label: 'Firm Deleted / Purged',
      badge: act,
      category: 'COMPANIES',
      color: '#742A2A',
      bg: '#FFF5F5',
      border: '#FEB2B2',
      icon: 'trash',
      status: 'danger'
    };
  }
  if (act.includes('IMPERSONAT')) {
    return {
      label: 'Support Impersonation Session',
      badge: act,
      category: 'SECURITY',
      color: '#DD6B20',
      bg: '#FFFAF0',
      border: '#FEEBC8',
      icon: 'shield',
      status: 'warning'
    };
  }
  if (act.includes('PASSWORD') || act.includes('KEY') || act.includes('2FA')) {
    return {
      label: 'Credentials & Password Updated',
      badge: act,
      category: 'SECURITY',
      color: '#2C5282',
      bg: '#EBF8FF',
      border: '#BEE3F8',
      icon: 'key',
      status: 'info'
    };
  }
  if (act.includes('ADMIN_INVITED') || act.includes('ADMIN_UPDATED') || act.includes('ADMIN_DISABLED') || act.includes('ADMIN_ENABLE')) {
    return {
      label: 'Platform Admin Modified',
      badge: act,
      category: 'SECURITY',
      color: '#553C9A',
      bg: '#FAF5FF',
      border: '#E9D8FD',
      icon: 'users',
      status: 'purple'
    };
  }

  return {
    label: act.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
    badge: act,
    category: 'GENERAL',
    color: '#4A5568',
    bg: '#F7FAFC',
    border: '#E2E8F0',
    icon: 'activity',
    status: 'neutral'
  };
}

function resolveAuditTarget(log, companiesList = []) {
  if (!log) return { name: 'Platform', isCompany: false, id: null };
  const act = String(log.action || '').toUpperCase();

  // If event is admin auth, login, password or session, target is always Platform
  if (
    act.includes('LOGIN') ||
    act.includes('LOGOUT') ||
    act.includes('PASSWORD') ||
    act.includes('2FA') ||
    act.includes('ADMIN_')
  ) {
    return { name: 'Platform', isCompany: false, id: null };
  }

  const targetRaw = log.companyName || log.target || log.companyId || log.targetId || '';
  if (!targetRaw || targetRaw === 'Platform') {
    return { name: 'Platform', isCompany: false, id: null };
  }

  const found = companiesList.find(
    (c) => c.id === targetRaw || c._id === targetRaw || c.name === targetRaw
  );
  if (found) {
    return {
      name: found.name,
      isCompany: true,
      id: found.id || targetRaw,
      legalName: found.legalName,
      plan: found.plan
    };
  }

  // Never display raw MongoDB ObjectIds like (6adb58...350d)
  if (/^[0-9a-fA-F]{24}$/.test(targetRaw)) {
    return {
      name: 'Platform',
      isCompany: false,
      id: null
    };
  }

  return { name: targetRaw, isCompany: false, id: null };
}

function formatAuditNarrative(log, targetInfo, clientInfo) {
  const act = String(log.action || '').toUpperCase();

  if (act.includes('LOGIN_SUCCESS')) {
    const ipStr = log.ip || log.meta?.ip || '127.0.0.1';
    const os = clientInfo.os !== 'OS' ? clientInfo.os : '';
    const browser = clientInfo.browser !== 'Browser' ? clientInfo.browser : '';
    const devPart = os && browser ? ` via ${browser} on ${os}` : (os ? ` on ${os}` : '');
    return `Super administrator signed in successfully from IP ${ipStr}${devPart}.`;
  }
  if (act.includes('LOGIN_FAILED')) {
    return `Failed login attempt detected from IP ${log.ip || log.meta?.ip || 'unknown'}.`;
  }
  if (act.includes('LOGOUT')) {
    return `Super administrator signed out from session.`;
  }
  if (act.includes('COMPANY_INVITE_RESENT')) {
    return `Sent fresh onboarding invitation email to principal architect of ${targetInfo.name}.`;
  }
  if (act.includes('COMPANY_CREATED')) {
    return `Created and provisioned workspace for architecture firm ${targetInfo.name}.`;
  }
  if (act.includes('COMPANY_UPDATED') || act.includes('COMPANY_PATCH')) {
    return `Updated studio identity profile and owner contact details for ${targetInfo.name}.`;
  }
  if (act.includes('COMPANY_SUSPENDED')) {
    return `Suspended architecture firm ${targetInfo.name}. All user access locked.`;
  }
  if (act.includes('COMPANY_RESTORED') || act.includes('COMPANY_ACTIVATED')) {
    return `Reactivated architecture firm ${targetInfo.name}. Workspace restored to active status.`;
  }
  if (act.includes('COMPANY_DELETED') || act.includes('SOFT_DELETE')) {
    return `Soft-deleted firm ${targetInfo.name}. Scheduled for retention purge.`;
  }
  if (act.includes('COMPANY_PURGED') || act.includes('PURGE')) {
    return `Permanently purged architecture firm records for ${targetInfo.name}.`;
  }
  if (act.includes('SEAT') || act.includes('RECONCILE')) {
    return `Reconciled and synchronized active seats counter for ${targetInfo.name}.`;
  }
  if (act.includes('IMPERSONAT')) {
    return `Support impersonation session initiated into ${targetInfo.name} per Section 8.0.`;
  }
  if (act.includes('PASSWORD')) {
    return `Account security credentials and access password updated.`;
  }
  if (act.includes('ADMIN_INVITED')) {
    return `Sent platform invitation to new super admin.`;
  }
  if (act.includes('ADMIN_DISABLED')) {
    return `Deactivated platform administrator privileges.`;
  }
  if (act.includes('ADMIN_ENABLED') || act.includes('ADMIN_UNLOCKED')) {
    return `Re-enabled platform administrator account.`;
  }

  // If description exists and is not raw JSON
  if (log.description && typeof log.description === 'string' && !log.description.trim().startsWith('{')) {
    return log.description;
  }
  if (log.details && typeof log.details === 'string' && !log.details.trim().startsWith('{')) {
    return log.details;
  }

  return `System security event logged for ${targetInfo.name}.`;
}

// SessionStorage cache keys for 0ms instant data rendering
const ADMIN_CACHE_KEYS = {
  COMPANIES: 'mm_cached_companies',
  METRICS: 'mm_cached_metrics',
  AUDIT: 'mm_cached_audit',
  ADMINS: 'mm_cached_admins'
};

const getAdminCache = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setAdminCache = (key, val) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.debug('Admin cache write error:', err);
  }
};

export function SuperAdminPage() {
  const navigate = useNavigate();
  const { adminUser, logout, logoutAll } = useAdminAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'admins' | 'plans' | 'audit'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'suspended' | 'deleted'
  const [searchQuery, setSearchQuery] = useState('');
  const [backendLoading, setBackendLoading] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState(() => getAdminCache(ADMIN_CACHE_KEYS.METRICS, null));

  // Tenant companies strictly from Backend API (MongoDB) - 0ms instant load from cache
  const [companies, setCompanies] = useState(() => getAdminCache(ADMIN_CACHE_KEYS.COMPANIES, []));

  // Super Admin team members strictly from Backend API (MongoDB)
  const [admins, setAdmins] = useState(() => getAdminCache(ADMIN_CACHE_KEYS.ADMINS, []));
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ name: '', email: '' });

  // Audit logs state strictly from Backend API (MongoDB)
  const [auditLogs, setAuditLogs] = useState(() => getAdminCache(ADMIN_CACHE_KEYS.AUDIT, []));
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategory, setAuditCategory] = useState('ALL'); // 'ALL' | 'COMPANIES' | 'SECURITY' | 'LOGINS'
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(10);

  // Synchronous cache-synced companies state updater
  const updateCompaniesAndCache = (updater) => {
    setCompanies((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setAdminCache(ADMIN_CACHE_KEYS.COMPANIES, next);
      return next;
    });
  };

  // Modal loading & error feedback
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [authError, setAuthError] = useState('');

  // Modals state
  const initialCompanyForm = {
    name: '',
    legalName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    phone: '',
    plan: 'FREE',
    seatLimit: 10,
    storageLimitMB: 5120,
    gstNumber: '',
    addressLine1: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    timezone: 'Asia/Kolkata',
    notes: '',
    sendInvite: true
  };

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState(initialCompanyForm);
  const [createFormErrors, setCreateFormErrors] = useState({});

  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [selectedCompanyForSeats, setSelectedCompanyForSeats] = useState(null);
  const [newSeatLimit, setNewSeatLimit] = useState(10);
  const [seatAdjustReason, setSeatAdjustReason] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCompanyForDelete, setSelectedCompanyForDelete] = useState(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');

  const [impersonateModalOpen, setImpersonateModalOpen] = useState(false);
  const [selectedCompanyForLogin, setSelectedCompanyForLogin] = useState(null);

  const [editCompanyModalOpen, setEditCompanyModalOpen] = useState(false);
  const [selectedCompanyForEdit, setSelectedCompanyForEdit] = useState(null);
  const [editCompanyForm, setEditCompanyForm] = useState({
    name: '',
    legalName: '',
    phone: '',
    gstNumber: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: ''
  });

  // Edit Admin State & Handlers (M1.3 GET & PATCH /admin/admins/{id})
  const [editAdminModalOpen, setEditAdminModalOpen] = useState(false);
  const [selectedAdminForEdit, setSelectedAdminForEdit] = useState(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminLoading, setEditAdminLoading] = useState(false);

  // Audit Log Detail State & Handlers (M1.3 GET /admin/audit-logs/{id})
  const [auditDetailModalOpen, setAuditDetailModalOpen] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [auditDetailLoading, setAuditDetailLoading] = useState(false);

  // Company-Specific Audit Logs (M1.3 GET /admin/companies/{id}/audit-logs)
  const [companyAuditModalOpen, setCompanyAuditModalOpen] = useState(false);
  const [selectedCompanyForAudit, setSelectedCompanyForAudit] = useState(null);
  const [companyAuditLogs, setCompanyAuditLogs] = useState([]);
  const [companyAuditLoading, setCompanyAuditLoading] = useState(false);

  // Super Admin Change Password (M1.2 POST /admin/auth/change-password)
  const [adminChangePasswordOpen, setAdminChangePasswordOpen] = useState(false);
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPasswordLoading, setAdminPasswordLoading] = useState(false);
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [adminPasswordSuccess, setAdminPasswordSuccess] = useState('');

  // Live Platform Health State (GET /health & GET /health/db)
  const [platformHealth, setPlatformHealth] = useState({
    system: 'operational',
    db: 'connected'
  });
  const [graceModalOpen, setGraceModalOpen] = useState(false);
  const [selectedCompanyForGrace, setSelectedCompanyForGrace] = useState(null);
  const [graceDays, setGraceDays] = useState(7);
  const [graceReason, setGraceReason] = useState('Offline payment pending board approval');
  const [graceLoading, setGraceLoading] = useState(false);

  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [selectedCompanyForGrant, setSelectedCompanyForGrant] = useState(null);
  const [grantDays, setGrantDays] = useState(14);
  const [grantReason, setGrantReason] = useState('Complimentary trial days granted by Super Admin');
  const [grantLoading, setGrantLoading] = useState(false);

  const [toastNotification, setToastNotification] = useState({ text: '', type: 'success' });

  const showNotification = (msg, type = 'success') => {
    setToastNotification({ text: msg, type });
    setTimeout(() => setToastNotification({ text: '', type: 'success' }), 4500);
  };

  const handleExtendGrace = async (e) => {
    e.preventDefault();
    if (!selectedCompanyForGrace) return;
    setGraceLoading(true);
    try {
      const compId = selectedCompanyForGrace.id || selectedCompanyForGrace._id;
      await adminService.extendGracePeriod(compId, {
        additionalDays: Number(graceDays),
        reason: graceReason
      });
      showNotification(`Grace period for ${selectedCompanyForGrace.name} extended by ${graceDays} days.`, 'success');
      setGraceModalOpen(false);
      await fetchAdminData(true);
    } catch (err) {
      showNotification(extractErrorMessage(err) || 'Failed to extend grace period.', 'error');
    } finally {
      setGraceLoading(false);
    }
  };

  const handleGrantComplimentary = async (e) => {
    e.preventDefault();
    if (!selectedCompanyForGrant) return;
    setGrantLoading(true);
    try {
      const compId = selectedCompanyForGrant.id || selectedCompanyForGrant._id;
      await adminService.grantComplimentary(compId, {
        days: Number(grantDays),
        reason: grantReason
      });
      showNotification(`Granted ${grantDays} complimentary paid days to ${selectedCompanyForGrant.name}.`, 'success');
      setGrantModalOpen(false);
      await fetchAdminData(true);
    } catch (err) {
      showNotification(extractErrorMessage(err) || 'Failed to grant complimentary days.', 'error');
    } finally {
      setGrantLoading(false);
    }
  };

  const handleOpenEditAdmin = async (admin) => {
    setSelectedAdminForEdit(admin);
    setEditAdminName(admin.name || '');
    setEditAdminModalOpen(true);
    try {
      const detail = await adminService.getAdmin(admin._id || admin.id);
      if (detail?.name) {
        setEditAdminName(detail.name);
      }
    } catch (err) {
      console.warn('Admin detail notice:', err.message);
    }
  };

  const handleSaveEditAdmin = async (e) => {
    e.preventDefault();
    if (!selectedAdminForEdit || !editAdminName.trim()) return;
    setEditAdminLoading(true);
    try {
      await adminService.updateAdmin(selectedAdminForEdit._id || selectedAdminForEdit.id, editAdminName.trim());
      showNotification(`Administrator updated to "${editAdminName.trim()}".`, 'success');
      setEditAdminModalOpen(false);
      loadAllData();
    } catch (err) {
      showNotification(extractErrorMessage(err, 'Failed to update administrator'), 'error');
    } finally {
      setEditAdminLoading(false);
    }
  };

  const handleInspectAuditLog = async (log) => {
    setSelectedAuditLog(log);
    setAuditDetailModalOpen(true);
    setAuditDetailLoading(true);
    try {
      const fullDetail = await adminService.getAuditLogEntry(log.id || log._id);
      if (fullDetail) {
        setSelectedAuditLog((prev) => ({ ...prev, ...fullDetail }));
      }
    } catch (err) {
      console.warn('Audit detail notice:', err.message);
    } finally {
      setAuditDetailLoading(false);
    }
  };

  const handleOpenCompanyAuditLogs = async (company) => {
    setSelectedCompanyForAudit(company);
    setCompanyAuditModalOpen(true);
    setCompanyAuditLoading(true);
    const compId = company.id || company._id;
    try {
      const logs = await adminService.getCompanyAuditLogs(compId);
      const list = Array.isArray(logs) ? logs : (logs?.data || logs?.logs || []);
      if (list.length > 0) {
        setCompanyAuditLogs(list);
      } else {
        // Fallback: match from loaded auditLogs
        const filtered = auditLogs.filter(
          (l) => l.targetId === compId || l.target === company.name || l.rawLog?.companyId === compId
        );
        setCompanyAuditLogs(filtered);
      }
    } catch (err) {
      console.warn('Company audit logs fetch notice:', err?.message);
      const filtered = auditLogs.filter(
        (l) => l.targetId === compId || l.target === company.name || l.rawLog?.companyId === compId
      );
      setCompanyAuditLogs(filtered);
    } finally {
      setCompanyAuditLoading(false);
    }
  };

  const handleAdminChangePassword = async (e) => {
    e.preventDefault();
    setAdminPasswordError('');
    setAdminPasswordSuccess('');

    if (!adminCurrentPassword) {
      setAdminPasswordError('Please enter your current password');
      return;
    }
    if (adminNewPassword.length < 8) {
      setAdminPasswordError('New password must be at least 8 characters long');
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setAdminPasswordError('New passwords do not match');
      return;
    }

    setAdminPasswordLoading(true);
    try {
      await adminAuthService.changePassword({
        currentPassword: adminCurrentPassword,
        newPassword: adminNewPassword
      });
      setAdminPasswordSuccess('Super Admin password updated successfully.');
      setTimeout(() => {
        setAdminChangePasswordOpen(false);
      }, 1200);
    } catch (err) {
      setAdminPasswordError(extractErrorMessage(err, 'Failed to update admin password'));
    } finally {
      setAdminPasswordLoading(false);
    }
  };

  // Fetch Live Companies, Metrics, Audit Logs, and Admins from Backend
  // Supports silent background updates without blocking the UI
  const fetchAdminData = async (silent = false) => {
    if (!silent && companies.length === 0 && !liveMetrics) {
      setBackendLoading(true);
    }
    try {
      const [compRes, metricRes, auditRes, adminsRes, healthRes, dbHealthRes] = await Promise.allSettled([
        adminService.getCompanies(),
        adminService.getDashboardMetrics(),
        adminService.getAuditLogs(),
        adminService.getAdmins(),
        adminAuthService.getSystemHealth(),
        adminAuthService.getDbHealth()
      ]);

      if (healthRes.status === 'fulfilled' || dbHealthRes.status === 'fulfilled') {
        setPlatformHealth({
          system: healthRes.status === 'fulfilled' ? (healthRes.value?.status || 'operational') : 'operational',
          db: dbHealthRes.status === 'fulfilled' ? (dbHealthRes.value?.status || 'connected') : 'connected'
        });
      }

      // Check if any critical endpoint returned 401/403 Forbidden
      if (compRes.status === 'rejected') {
        const err = compRes.reason;
        const errStatus = err?.response?.status;
        const errCode = err?.response?.data?.error?.code || err?.response?.data?.code;
        const errMsg = extractErrorMessage(err);

        if (errStatus === 403 || errStatus === 401) {
          if (errCode === 'PASSWORD_CHANGE_REQUIRED') {
            navigate(ROUTES.ADMIN_RESET_PASSWORD, {
              state: { notice: 'Password change is required before accessing company management.' }
            });
            return;
          }
          setAuthError(errMsg || 'Super Admin platform authorization failed (403 Forbidden).');
        }
      } else {
        setAuthError('');
      }

      if (compRes.status === 'fulfilled' && compRes.value?.data) {
        const apiCompanies = compRes.value.data.map((c, idx) => {
          const rawStatus = (c.status || 'ACTIVE').toUpperCase();
          const status = rawStatus === 'SUSPENDED' ? 'suspended' : rawStatus === 'DELETED' ? 'deleted' : 'active';
          const rawPlan = (c.plan || 'FREE').toUpperCase();
          const plan = rawPlan === 'PAID' ? 'Pro Tier (Paid)' : 'Free Tier (10 Users)';
          const seatsUsed = c.seatsUsed !== undefined ? c.seatsUsed : (c.activeUserCount || 1);
          const seatLimit = c.seatLimit || 10;
          const storageLimitMB = c.storageLimitMB || 5120;
          const storageUsedGb = c.storageUsedGb !== undefined ? c.storageUsedGb : +(storageLimitMB / 1024 * 0.05).toFixed(1);
          const storageLimitGb = +(storageLimitMB / 1024).toFixed(0);

          return {
            id: c._id || c.id || `comp_${idx}`,
            name: c.name || 'Architecture Firm',
            legalName: c.legalName || '',
            ownerName: c.owner?.name || c.ownerName || 'Firm Principal',
            ownerEmail: c.owner?.email || c.ownerEmail || '—',
            ownerPhone: c.owner?.mobile || c.ownerPhone || c.phone || '—',
            phone: c.phone || c.owner?.mobile || c.ownerPhone || '',
            gstNumber: c.gstNumber || '',
            status,
            plan,
            seatsUsed,
            seatLimit,
            storageUsedGb,
            storageLimitGb,
            createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
            deletedAt: c.deletedAt || null,
            daysRemaining: c.deletedAt ? 30 : null
          };
        });
        updateCompaniesAndCache(apiCompanies);
      }

      if (metricRes.status === 'fulfilled' && metricRes.value) {
        setLiveMetrics(metricRes.value);
        setAdminCache(ADMIN_CACHE_KEYS.METRICS, metricRes.value);
      }

      if (auditRes.status === 'fulfilled' && auditRes.value?.data) {
        const list = auditRes.value.data;
        if (Array.isArray(list)) {
          const apiLogs = list.map((l, idx) => {
            const rawMeta = l.meta && typeof l.meta === 'object' ? l.meta : {};
            const ip = l.ip || rawMeta.ip || null;
            const userAgent = l.userAgent || rawMeta.userAgent || null;
            const actorEmail =
              l.actor?.email ||
              l.actorEmail ||
              (typeof l.actor === 'string' ? l.actor : '') ||
              l.operator ||
              'Super Admin';
            const actorName = l.actor?.name || null;
            const actUpper = String(l.action || '').toUpperCase();
            const isPlatformEvent =
              actUpper.includes('LOGIN') ||
              actUpper.includes('LOGOUT') ||
              actUpper.includes('PASSWORD') ||
              actUpper.includes('2FA') ||
              actUpper.includes('ADMIN_');

            const rawTarget =
              l.companyName ||
              l.target ||
              (l.companyId && !isPlatformEvent ? l.companyId : null) ||
              'Platform';

            const target = isPlatformEvent ? 'Platform' : rawTarget;

            return {
              id: l._id || l.id || `audit_${idx}`,
              rawLog: l,
              action: l.action || 'PLATFORM_EVENT',
              target: target,
              targetId: l.companyId || l.targetId || (target !== 'Platform' ? target : null),
              actorEmail: actorEmail,
              actorName: actorName,
              operator: actorEmail,
              ip: ip,
              userAgent: userAgent,
              meta: rawMeta,
              description: l.description || l.details || null,
              rawDate: l.createdAt ? new Date(l.createdAt) : new Date(),
              timestamp: l.createdAt
                ? new Date(l.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Recently'
            };
          });
          setAuditLogs(apiLogs);
          setAdminCache(ADMIN_CACHE_KEYS.AUDIT, apiLogs);
        }
      }

      if (adminsRes.status === 'fulfilled' && adminsRes.value) {
        const adminList = Array.isArray(adminsRes.value) ? adminsRes.value : (adminsRes.value?.data || []);
        setAdmins(adminList);
        setAdminCache(ADMIN_CACHE_KEYS.ADMINS, adminList);
      }
    } catch (err) {
      console.warn('Backend admin fetch info:', err);
    } finally {
      setBackendLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();

    const handlePwRequired = () => {
      navigate(ROUTES.ADMIN_RESET_PASSWORD, {
        state: { notice: 'Password change is required before accessing company management.' }
      });
    };
    window.addEventListener('admin:password-change-required', handlePwRequired);
    return () => window.removeEventListener('admin:password-change-required', handlePwRequired);
  }, [navigate]);

  const handleAdminLogout = async () => {
    await logout();
    navigate(ROUTES.ADMIN_LOGIN, { replace: true });
  };

  const handleAdminLogoutAll = async () => {
    await logoutAll();
    navigate(ROUTES.ADMIN_LOGIN, { replace: true });
  };

  // Form Validation for Company Creation
  const validateCreateCompanyForm = () => {
    const errs = {};
    const name = (newCompanyForm.name || '').trim();
    const ownerName = (newCompanyForm.ownerName || '').trim();
    const ownerEmail = (newCompanyForm.ownerEmail || '').trim();
    const ownerPhone = (newCompanyForm.ownerPhone || '').trim();
    const gstNumber = (newCompanyForm.gstNumber || '').trim();
    const seatLimit = Number(newCompanyForm.seatLimit);

    if (!name) {
      errs.name = 'Company name is required';
    } else if (name.length < 2) {
      errs.name = 'Company name must be at least 2 characters';
    }

    if (!ownerName) {
      errs.ownerName = 'Owner name is required';
    } else if (ownerName.length < 2) {
      errs.ownerName = 'Owner name must be at least 2 characters';
    }

    if (!ownerEmail) {
      errs.ownerEmail = 'Owner email is required';
    } else if (!isValidEmail(ownerEmail)) {
      errs.ownerEmail = 'Please enter a valid email address';
    }

    if (ownerPhone) {
      const cleanPhone = ownerPhone.replace(/[\s\-+]/g, '');
      if (!/^\d{10}$/.test(cleanPhone)) {
        errs.ownerPhone = 'Please enter a valid 10-digit mobile number';
      }
    }

    if (gstNumber) {
      const cleanGst = gstNumber.toUpperCase().trim();
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(cleanGst)) {
        errs.gstNumber = 'Invalid GSTIN format (e.g. 24ABCDE1234F1Z5)';
      }
    }

    if (!seatLimit || seatLimit < 1) {
      errs.seatLimit = 'Seat limit must be at least 1';
    } else if (seatLimit > 500) {
      errs.seatLimit = 'Seat limit cannot exceed 500';
    }

    setCreateFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Flow A: Create Tenant Company (POST /admin/companies)
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!validateCreateCompanyForm()) {
      return;
    }

    setModalLoading(true);
    try {
      const createdFirmName = newCompanyForm.name.trim();
      const planType = (newCompanyForm.plan || 'FREE').toUpperCase();
      const seatLimitNum = Number(newCompanyForm.seatLimit) || 10;
      const storageLimitMB = Number(newCompanyForm.storageLimitMB) || 5120;

      const res = await adminService.createCompany({
        name: createdFirmName,
        legalName: newCompanyForm.legalName?.trim() || undefined,
        ownerName: newCompanyForm.ownerName.trim(),
        ownerEmail: newCompanyForm.ownerEmail.trim(),
        ownerPhone: newCompanyForm.ownerPhone?.trim() || undefined,
        plan: planType,
        seatLimit: seatLimitNum,
        storageLimitMB: storageLimitMB,
        gstNumber: newCompanyForm.gstNumber?.trim() ? newCompanyForm.gstNumber.trim().toUpperCase() : undefined,
        city: newCompanyForm.city?.trim() || undefined,
        sendInvite: true
      });

      const newCompData = res?.company || res?.data || res || {};
      const newId = newCompData._id || newCompData.id || `comp_${Date.now()}`;

      const createdCompanyObj = {
        id: newId,
        _id: newId,
        name: createdFirmName,
        legalName: newCompanyForm.legalName?.trim() || '',
        ownerName: newCompanyForm.ownerName.trim(),
        ownerEmail: newCompanyForm.ownerEmail.trim(),
        ownerPhone: newCompanyForm.ownerPhone?.trim() || '—',
        phone: newCompanyForm.ownerPhone?.trim() || '',
        gstNumber: newCompanyForm.gstNumber?.trim() || '',
        status: 'active',
        plan: planType === 'PAID' ? 'Pro Tier (Paid)' : 'Free Tier (10 Users)',
        seatsUsed: 1,
        seatLimit: seatLimitNum,
        storageUsedGb: +(storageLimitMB / 1024 * 0.05).toFixed(1),
        storageLimitGb: +(storageLimitMB / 1024).toFixed(0),
        createdAt: 'Just now',
        deletedAt: null,
        daysRemaining: null
      };

      // 1. Instant optimistic local update (0ms)
      updateCompaniesAndCache((prev) => [createdCompanyObj, ...prev.filter((c) => c.id !== newId)]);

      // 2. Close modal immediately
      setCreateModalOpen(false);
      setNewCompanyForm(initialCompanyForm);
      setCreateFormErrors({});
      showNotification(`Firm "${createdFirmName}" registered successfully.`);

      // 3. Silent background refresh to synchronize live metrics & audit log
      fetchAdminData(true);
    } catch (err) {
      setModalError(extractErrorMessage(err));
    } finally {
      setModalLoading(false);
    }
  };

  // Flow H: Suspend / Activate Company (PUT /admin/companies/:id/suspend or activate)
  const handleToggleSuspend = async (company) => {
    const isActivating = company.status === 'suspended';
    const compId = company.id || company._id;

    try {
      if (isActivating) {
        await adminService.activateCompany(compId);
        showNotification(`Firm "${company.name}" activated successfully.`);
      } else {
        await adminService.suspendCompany(compId, 'Administrative suspension');
        showNotification(`Firm "${company.name}" suspended. Member login is blocked.`);
      }
      await fetchAdminData(true);
    } catch (err) {
      showNotification(extractErrorMessage(err) || 'Failed to update firm status', 'error');
    }
  };

  // Reconcile Company Seat Counter (Swagger v1.4.0)
  const handleReconcileSeats = async (company) => {
    try {
      const compId = company.id || company._id;
      const res = await adminService.reconcileSeats(compId);
      await fetchAdminData(true);
      const data = res?.data || res;
      if (data?.fixed) {
        showNotification(`Seats reconciled for "${company.name}". Corrected from ${data?.before ?? '-'} to ${data?.after ?? '-'}.`);
      } else {
        showNotification(`Seat count for "${company.name}" is already accurate (${data?.before ?? company.seatsUsed ?? '-'}).`);
      }
    } catch (err) {
      showNotification(extractErrorMessage(err), 'error');
    }
  };

  // Section 6.3 Option B: Manual Seat Adjustment (PUT /admin/companies/:id/plan)
  const handleAdjustSeats = async (e) => {
    e.preventDefault();
    if (!selectedCompanyForSeats) return;

    const compId = selectedCompanyForSeats.id || selectedCompanyForSeats._id;
    const targetSeatLimit = Number(newSeatLimit);
    setModalLoading(true);
    setModalError('');

    try {
      await adminService.updatePlan(compId, {
        plan: targetSeatLimit > 10 ? 'PAID' : 'FREE',
        seatLimit: targetSeatLimit,
        reason: seatAdjustReason?.trim() || 'Manual Admin adjustment'
      });
      setSeatModalOpen(false);
      setSelectedCompanyForSeats(null);
      setSeatAdjustReason('');
      showNotification(`Seat limit for "${selectedCompanyForSeats.name}" updated to ${targetSeatLimit} seats.`);
      await fetchAdminData(true);
    } catch (err) {
      setModalError(extractErrorMessage(err) || 'Failed to update seats');
    } finally {
      setModalLoading(false);
    }
  };

  // Flow G: Soft Delete Company (PUT /admin/companies/:id/delete)
  const handleConfirmSoftDelete = async (e) => {
    e.preventDefault();
    if (!selectedCompanyForDelete) return;

    if (confirmDeleteInput.trim().toLowerCase() !== selectedCompanyForDelete.name.trim().toLowerCase()) {
      setModalError('Company name did not match. Please type the exact company name.');
      return;
    }

    const compId = selectedCompanyForDelete.id || selectedCompanyForDelete._id;
    setModalLoading(true);
    setModalError('');

    try {
      await adminService.deleteCompany(
        compId,
        'Company archived by Super Admin',
        confirmDeleteInput.trim()
      );
      setDeleteModalOpen(false);
      setSelectedCompanyForDelete(null);
      setConfirmDeleteInput('');
      showNotification(`Firm "${selectedCompanyForDelete.name}" moved to trash. Retained for 30 days.`);
      await fetchAdminData(true);
    } catch (err) {
      setModalError(extractErrorMessage(err) || 'Failed to archive firm');
    } finally {
      setModalLoading(false);
    }
  };

  // Flow G: Undo Delete (PUT /admin/companies/:id/restore)
  const handleUndoDelete = async (company) => {
    const compId = company.id || company._id;

    try {
      await adminService.restoreCompany(compId);
      showNotification(`Firm "${company.name}" restored successfully.`);
      await fetchAdminData(true);
    } catch (err) {
      showNotification(extractErrorMessage(err) || 'Failed to restore firm', 'error');
    }
  };

  // Flow G2: Purge Immediately (POST /admin/companies/:id/purge-now)
  const handlePurgeNow = async (company) => {
    if (!window.confirm(`Are you sure you want to permanently erase all records for "${company.name}" from the database? This cannot be undone.`)) {
      return;
    }

    const compId = company.id || company._id;

    try {
      await adminService.purgeCompanyNow(compId, 'Permanent purge confirmed', company.name);
      showNotification(`Firm "${company.name}" permanently erased from database.`);
      await fetchAdminData(true);
    } catch (err) {
      showNotification(extractErrorMessage(err) || 'Failed to purge firm', 'error');
    }
  };

  // Resend Owner Invite (POST /admin/companies/:id/resend-owner-invite)
  const handleResendOwnerInvite = async (company) => {
    try {
      const compId = company.id || company._id;
      await adminService.resendOwnerInvite(compId);
      showNotification(`Owner invitation email resent to ${company.ownerEmail || 'company owner'}.`);
      await fetchAdminData(true);
    } catch (err) {
      showNotification(extractErrorMessage(err), 'error');
    }
  };

  // Impersonate Company (POST /admin/companies/:id/impersonate)
  const handleConfirmImpersonate = async () => {
    if (!selectedCompanyForLogin) return;
    setModalLoading(true);
    setModalError('');
    try {
      const compId = selectedCompanyForLogin.id || selectedCompanyForLogin._id;
      const res = await adminService.impersonateCompany(
        compId,
        'Support access by Super Admin'
      );
      const token = res?.accessToken || res?.token || res?.data?.accessToken || res?.data?.token;
      if (token) {
        setAccessToken(token); // In-Memory
      }
      setImpersonateModalOpen(false);
      showNotification(`Support access session initiated for "${selectedCompanyForLogin.name}".`);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      setModalError(extractErrorMessage(err));
    } finally {
      setModalLoading(false);
    }
  };

  // Edit Company Profile (PATCH /admin/companies/:id) & Fix Owner (PUT /admin/companies/:id/owner)
  const handleOpenEditCompany = async (company) => {
    setSelectedCompanyForEdit(company);
    setEditCompanyForm({
      name: company.name || '',
      legalName: company.legalName || '',
      phone: company.phone || company.ownerPhone || '',
      gstNumber: company.gstNumber || '',
      ownerName: company.ownerName || '',
      ownerEmail: company.ownerEmail || '',
      ownerPhone: company.ownerPhone || ''
    });
    setModalError('');
    setEditCompanyModalOpen(true);

    try {
      const compId = company.id || company._id;
      const full = await adminService.getCompanyDetails(compId);
      const data = full?.data || full;
      if (data) {
        setEditCompanyForm((prev) => ({
          ...prev,
          name: data.name || prev.name,
          legalName: data.legalName || prev.legalName,
          phone: data.phone || prev.phone,
          gstNumber: data.gstNumber || prev.gstNumber,
          ownerName: data.owner?.name || data.ownerName || prev.ownerName,
          ownerEmail: data.owner?.email || data.ownerEmail || prev.ownerEmail,
          ownerPhone: data.owner?.mobile || data.ownerPhone || prev.ownerPhone
        }));
      }
    } catch {
      // Keep initial optimistic company form values
    }
  };

  const handleSaveCompanyEdit = async (e) => {
    e.preventDefault();
    if (!selectedCompanyForEdit) return;

    const companyId = selectedCompanyForEdit.id || selectedCompanyForEdit._id;
    setModalLoading(true);
    setModalError('');

    try {
      await adminService.updateCompanyProfile(companyId, {
        name: editCompanyForm.name.trim(),
        legalName: editCompanyForm.legalName?.trim() || undefined,
        phone: editCompanyForm.phone?.trim() || undefined,
        gstNumber: editCompanyForm.gstNumber?.trim() || undefined
      });

      const ownerChanged =
        (editCompanyForm.ownerName && editCompanyForm.ownerName.trim() !== selectedCompanyForEdit.ownerName) ||
        (editCompanyForm.ownerEmail && editCompanyForm.ownerEmail.trim() !== selectedCompanyForEdit.ownerEmail) ||
        (editCompanyForm.ownerPhone && editCompanyForm.ownerPhone.trim() !== selectedCompanyForEdit.ownerPhone);

      if (ownerChanged) {
        try {
          await adminService.fixPendingOwner(companyId, {
            name: editCompanyForm.ownerName.trim(),
            email: editCompanyForm.ownerEmail.trim(),
            mobile: editCompanyForm.ownerPhone?.trim() || undefined
          });
        } catch (ownerErr) {
          console.warn('Owner update notice:', ownerErr?.message);
        }
      }

      setEditCompanyModalOpen(false);
      showNotification(`Firm "${editCompanyForm.name}" profile updated successfully.`);
      await fetchAdminData(true);
    } catch (err) {
      setModalError(extractErrorMessage(err) || 'Failed to update company profile');
    } finally {
      setModalLoading(false);
    }
  };

  // Super Admin Team Management Handlers (GET/POST /admin/admins, PUT disable/enable/unlock)
  const handleInviteAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminForm.name || !newAdminForm.email) return;

    setModalLoading(true);
    setModalError('');
    try {
      await adminService.inviteAdmin({
        name: newAdminForm.name.trim(),
        email: newAdminForm.email.trim()
      });
      setAdminModalOpen(false);
      setNewAdminForm({ name: '', email: '' });
      fetchAdminData(true);
      showNotification(`Super Admin invite sent to ${newAdminForm.email}.`);
    } catch (err) {
      setModalError(extractErrorMessage(err));
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleDisableAdmin = async (admin) => {
    const isDisabling = (admin.status || 'ACTIVE').toUpperCase() !== 'DISABLED';
    const adminId = admin._id || admin.id;
    const oldStatus = admin.status;
    const newStatus = isDisabling ? 'DISABLED' : 'ACTIVE';

    // 1. Instant optimistic update
    setAdmins((prev) =>
      prev.map((a) => ((a._id === adminId || a.id === adminId) ? { ...a, status: newStatus } : a))
    );
    showNotification(isDisabling ? `Admin "${admin.name}" disabled.` : `Admin "${admin.name}" enabled.`);

    // 2. Background sync with rollback
    try {
      if (isDisabling) {
        await adminService.disableAdmin(adminId, 'Administrative suspension');
      } else {
        await adminService.enableAdmin(adminId);
      }
      fetchAdminData(true);
    } catch (err) {
      setAdmins((prev) =>
        prev.map((a) => ((a._id === adminId || a.id === adminId) ? { ...a, status: oldStatus } : a))
      );
      showNotification(extractErrorMessage(err) || 'Failed to update admin account', 'error');
    }
  };

  const handleUnlockAdmin = async (admin) => {
    try {
      await adminService.unlockAdmin(admin._id || admin.id);
      fetchAdminData(true);
      showNotification(`Admin account "${admin.name}" unlocked.`);
    } catch (err) {
      showNotification(extractErrorMessage(err) || 'Failed to unlock admin account', 'error');
    }
  };

  const handleResendAdminInvite = async (admin) => {
    try {
      await adminService.resendAdminInvite(admin._id || admin.id);
      showNotification(`Invite resent to ${admin.email}.`);
    } catch (err) {
      showNotification(extractErrorMessage(err) || 'Failed to resend invite', 'error');
    }
  };

  // Filtered companies list
  const filteredCompanies = companies.filter((c) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'trash'
        ? c.status === 'deleted'
        : c.status === statusFilter;

    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Summary Metrics
  const totalTenants = companies.length;
  const activeTenants = companies.filter((c) => c.status === 'active').length;
  const freeTierTenants = companies.filter((c) => c.seatLimit <= 10).length;
  const totalSeatsAllotted = companies.reduce((acc, curr) => acc + curr.seatLimit, 0);

  // Audit Logs Filtering & Pagination
  const filteredAuditLogs = auditLogs.filter((log) => {
    // Category Filter
    if (auditCategory !== 'ALL') {
      const actMeta = formatAuditAction(log.action);
      if (actMeta.category !== auditCategory) return false;
    }
    // Search Query Filter
    if (auditSearch.trim()) {
      const q = auditSearch.trim().toLowerCase();
      const targetName = resolveAuditTarget(log, companies).name.toLowerCase();
      const act = (log.action || '').toLowerCase();
      const op = (log.operator || '').toLowerCase();
      const ip = (log.ip || '').toLowerCase();
      const desc = (log.description || '').toLowerCase();
      const matches =
        act.includes(q) ||
        targetName.includes(q) ||
        op.includes(q) ||
        ip.includes(q) ||
        desc.includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const totalAuditPages = Math.max(1, Math.ceil(filteredAuditLogs.length / auditLimit));
  const currentAuditPage = Math.min(auditPage, totalAuditPages);
  const paginatedAuditLogs = filteredAuditLogs.slice(
    (currentAuditPage - 1) * auditLimit,
    currentAuditPage * auditLimit
  );

  const auditCategoryCounts = {
    all: auditLogs.length,
    companies: auditLogs.filter((l) => formatAuditAction(l.action).category === 'COMPANIES').length,
    security: auditLogs.filter((l) => formatAuditAction(l.action).category === 'SECURITY').length,
    logins: auditLogs.filter((l) => formatAuditAction(l.action).category === 'LOGINS').length
  };

  return (
    <div className="admin-portal-shell">
      {/* MOBILE BACKDROP OVERLAY */}
      {mobileSidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* LEFT PORTAL SIDEBAR */}
      <aside className={`admin-portal-sidebar ${mobileSidebarOpen ? 'is-mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="admin-sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <MayurMehtaLogo variant="primary" size="md" color="#7B6F62" />
            <button
              type="button"
              className="admin-mobile-sidebar-close"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close Navigation"
            >
              <X size={18} />
            </button>
          </div>
          <div className="admin-sidebar-badge">
            <Shield size={12} />
            <span>Super Admin</span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="admin-sidebar-nav-wrap">
          <span className="admin-nav-group-label">PLATFORM MANAGEMENT</span>
          <nav className="admin-sidebar-nav">
            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'tenants' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('tenants');
                setMobileSidebarOpen(false);
              }}
            >
              <Building2 size={18} className="nav-icon" />
              <span className="nav-text">Companies & Firms</span>
              <span className="nav-pill-count">{companies.length}</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'admins' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('admins');
                setMobileSidebarOpen(false);
              }}
            >
              <Users size={18} className="nav-icon" />
              <span className="nav-text">Platform Admins</span>
              <span className="nav-pill-count">{admins.length}</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'plans' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('plans');
                setMobileSidebarOpen(false);
              }}
            >
              <CreditCard size={18} className="nav-icon" />
              <span className="nav-text">Billing & Revenue</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activeTab === 'audit' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('audit');
                setMobileSidebarOpen(false);
              }}
            >
              <History size={18} className="nav-icon" />
              <span className="nav-text">Audit & Security</span>
              <span className="nav-pill-count">{auditLogs.length}</span>
            </button>
          </nav>
        </div>

        {/* User Capsule & Logout at Bottom */}
        <div className="admin-sidebar-user">
          <div className="admin-user-profile-left">
            <Avatar name={adminUser?.name || 'Krisha Buha'} size="sm" />
            <div className="admin-user-details">
              <span className="admin-user-name">{adminUser?.name || 'Krisha Buha'}</span>
              <span className="admin-user-role">SUPER ADMIN</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="admin-sidebar-logout"
              onClick={() => {
                setAdminPasswordError('');
                setAdminPasswordSuccess('');
                setAdminCurrentPassword('');
                setAdminNewPassword('');
                setAdminConfirmPassword('');
                setAdminChangePasswordOpen(true);
              }}
              title="Change Super Admin Password"
            >
              <KeyRound size={16} />
            </button>
            <button
              type="button"
              className="admin-sidebar-logout"
              onClick={handleAdminLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="admin-portal-main">
        {/* Top Header Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-mobile-menu-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>
            <div className="admin-topbar-heading-group">
              <div className="admin-breadcrumb">
                <span>Super Admin Portal</span>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-current">
                  {activeTab === 'tenants' && 'Company Management'}
                  {activeTab === 'admins' && 'Super Admin Team'}
                  {activeTab === 'plans' && 'Plans & Subscriptions'}
                  {activeTab === 'audit' && 'Security Audit Trail'}
                </span>
              </div>
              <h1 className="admin-page-title">
                {activeTab === 'tenants' && 'Company Management'}
                {activeTab === 'admins' && 'Platform Admins & Access Control'}
                {activeTab === 'plans' && 'Subscription Plans & Pricing'}
                {activeTab === 'audit' && 'Security & Tenant Activity Audit'}
              </h1>
            </div>
          </div>

          <div className="admin-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

            {activeTab === 'tenants' && (
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setModalError('');
                  setCreateModalOpen(true);
                }}
              >
                Add Company
              </Button>
            )}
            {activeTab === 'admins' && (
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setModalError('');
                  setAdminModalOpen(true);
                }}
              >
                Invite Super Admin
              </Button>
            )}
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="admin-page-body">
          {/* Authorization Error Banner (403/401) */}
          {authError && (
            <div
              className="admin-status-toast"
              role="alert"
              style={{
                backgroundColor: '#FEE2E2',
                borderColor: '#FCA5A5',
                color: '#991B1B',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                width: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <AlertTriangle size={18} />
                <span>{authError} — Please sign in with an authorized Super Admin account.</span>
              </div>
              <Button size="sm" variant="danger" onClick={handleAdminLogout}>
                Sign In Again
              </Button>
            </div>
          )}

          {/* Platform Floating Banner Alert */}
          {toastNotification.text && (
            <div className={`admin-status-toast ${toastNotification.type}`} role="alert">
              {toastNotification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span>{toastNotification.text}</span>
            </div>
          )}

          {backendLoading && companies.length === 0 && !liveMetrics ? (
            <LoadingScreen message="Loading..." fullScreen={false} />
          ) : (
            <>
              {/* TAB 1: TENANTS & COMPANIES */}
              {activeTab === 'tenants' && (
            <>
              {/* STEP 1: Overview KPI Metrics Grid */}
              <div className="admin-step-section">
                <div className="admin-metrics-grid">
                  <div className="admin-kpi-card">
                    <div className="kpi-icon-wrap bg-taupe">
                      <Building2 size={20} />
                    </div>
                    <div className="kpi-info">
                      <span className="kpi-label">TOTAL COMPANIES</span>
                      <span className="kpi-value">{totalTenants}</span>
                      <span className="kpi-subtext">{activeTenants} active firms</span>
                    </div>
                  </div>

                  <div className="admin-kpi-card">
                    <div className="kpi-icon-wrap bg-green">
                      <Users size={20} />
                    </div>
                    <div className="kpi-info">
                      <span className="kpi-label">ACTIVE FIRMS</span>
                      <span className="kpi-value">{activeTenants}</span>
                      <span className="kpi-subtext">Operating normally</span>
                    </div>
                  </div>

                  <div className="admin-kpi-card">
                    <div className="kpi-icon-wrap bg-copper">
                      <CreditCard size={20} />
                    </div>
                    <div className="kpi-info">
                      <span className="kpi-label">TOTAL SEATS</span>
                      <span className="kpi-value">{totalSeatsAllotted}</span>
                      <span className="kpi-subtext">Assigned across firms</span>
                    </div>
                  </div>

                  <div className="admin-kpi-card">
                    <div className="kpi-icon-wrap bg-blue">
                      <History size={20} />
                    </div>
                    <div className="kpi-info">
                      <span className="kpi-label">AUDIT EVENTS</span>
                      <span className="kpi-value">{auditLogs.length}</span>
                      <span className="kpi-subtext">Security logs tracked</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2: Controls Filter Bar */}
              <div className="admin-step-section">
                <div className="admin-filter-bar">
                  <div className="admin-search-wrap">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="Search companies..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="status-pill-group">
                    <button
                      type="button"
                      className={`filter-pill ${statusFilter === 'all' ? 'is-active' : ''}`}
                      onClick={() => setStatusFilter('all')}
                    >
                      All ({companies.length})
                    </button>
                    <button
                      type="button"
                      className={`filter-pill ${statusFilter === 'active' ? 'is-active' : ''}`}
                      onClick={() => setStatusFilter('active')}
                    >
                      Active ({companies.filter((c) => c.status === 'active').length})
                    </button>
                    <button
                      type="button"
                      className={`filter-pill ${statusFilter === 'suspended' ? 'is-active' : ''}`}
                      onClick={() => setStatusFilter('suspended')}
                    >
                      Suspended ({companies.filter((c) => c.status === 'suspended').length})
                    </button>
                    <button
                      type="button"
                      className={`filter-pill ${statusFilter === 'trash' ? 'is-active' : ''}`}
                      onClick={() => setStatusFilter('trash')}
                    >
                      Archived ({companies.filter((c) => c.status === 'deleted').length})
                    </button>
                  </div>
                </div>
              </div>

              {/* STEP 3: Companies Directory Table or Containerized Empty State */}
              <div className="admin-step-section">
                <div className="admin-table-card">
                  {companies.length === 0 ? (
                    <div className="admin-empty-state-card">
                      <div className="admin-empty-icon-wrap">
                        <Building2 size={32} />
                      </div>
                      <h3 className="admin-empty-title">No Architecture Firms Registered Yet</h3>
                      <p className="admin-empty-desc">
                        Add your first architecture firm to provision their workspace, assign drawing storage, and manage user seats.
                      </p>
                      <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
                        Add First Company
                      </Button>
                    </div>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Owner</th>
                          <th>Plan</th>
                          <th>Seats</th>
                          <th>Storage</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCompanies.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="admin-empty-cell">
                              <div className="admin-empty-state">
                                <div className="admin-empty-icon-wrap">
                                  <Building2 size={24} />
                                </div>
                                <h4 className="admin-empty-title">No companies matching "{searchQuery}"</h4>
                                <p className="admin-empty-desc">
                                  Try searching with a different company name, owner name, or email.
                                </p>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                  }}
                                >
                                  Clear Filters
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredCompanies.map((c) => {
                  const percentUsed = Math.min(Math.round((c.seatsUsed / c.seatLimit) * 100), 100);
                  const isDeleted = c.status === 'deleted';
                  const isSuspended = c.status === 'suspended';

                  return (
                    <tr key={c.id} className={isDeleted ? 'row-deleted' : isSuspended ? 'row-suspended' : ''}>
                      <td>
                        <div className="tenant-name-cell">
                          <Avatar letter={c.name[0]} size="sm" />
                          <div>
                            <span className="tenant-firm-name">{c.name}</span>
                            {c.legalName && c.legalName !== c.name ? (
                              <span className="tenant-sub-label">{c.legalName}</span>
                            ) : c.createdAt ? (
                              <span className="tenant-sub-label">Joined {c.createdAt}</span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="owner-cell">
                          <span className="owner-name">{c.ownerName}</span>
                          <span className="owner-email">{c.ownerEmail}</span>
                        </div>
                      </td>

                      <td>
                        <span className="plan-name-badge">{c.plan}</span>
                      </td>

                      <td>
                        <div className="seat-meter-cell">
                          <div className="seat-meter-text">
                            <strong>{c.seatsUsed}</strong> of {c.seatLimit} seats
                          </div>
                          <div className="seat-meter-bar-bg">
                            <div
                              className={`seat-meter-bar-fill ${c.seatsUsed >= c.seatLimit ? 'fill-full' : ''}`}
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="storage-cell">
                          <span>{c.storageUsedGb} GB / {c.storageLimitGb} GB</span>
                        </div>
                      </td>

                      <td>
                        {c.status === 'active' && (
                          <span className="tenant-badge active">
                            <CheckCircle2 size={13} /> Active
                          </span>
                        )}
                        {c.status === 'suspended' && (
                          <span className="tenant-badge suspended">
                            <Ban size={13} /> Suspended
                          </span>
                        )}
                        {c.status === 'deleted' && (
                          <span className="tenant-badge in-trash">
                            <Trash2 size={13} /> Trash ({c.daysRemaining}d left)
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="admin-actions-cell">
                          {!isDeleted ? (
                            <Dropdown
                              align="right"
                              trigger={
                                <button
                                  type="button"
                                  className="action-icon-btn admin-3dot-btn"
                                  title="Actions"
                                  aria-label="Actions"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              }
                            >
                              {/* Edit Profile & Owner */}
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => handleOpenEditCompany(c)}
                              >
                                <Edit2 size={15} className="dropdown-item-icon" />
                                <span>Edit Studio Profile</span>
                              </button>

                              {/* Resend Owner Invitation Email */}
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => handleResendOwnerInvite(c)}
                              >
                                <Mail size={15} className="dropdown-item-icon" />
                                <span>Resend Owner Invite</span>
                              </button>

                              {/* Login As Company (Impersonation) */}
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => {
                                  setSelectedCompanyForLogin(c);
                                  setModalError('');
                                  setImpersonateModalOpen(true);
                                }}
                              >
                                <LogIn size={15} className="dropdown-item-icon" />
                                <span>Login as Company</span>
                              </button>

                              <div className="dropdown-divider" />

                              {/* Adjust Seat Limit */}
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => {
                                  setSelectedCompanyForSeats(c);
                                  setNewSeatLimit(c.seatLimit);
                                  setSeatModalOpen(true);
                                }}
                              >
                                <Sliders size={15} className="dropdown-item-icon" />
                                <span>Adjust Seat Limit</span>
                              </button>

                              {/* Extend Grace Period */}
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => {
                                  setSelectedCompanyForGrace(c);
                                  setGraceDays(7);
                                  setGraceReason('Customer grace extension granted by administrator');
                                  setGraceModalOpen(true);
                                }}
                              >
                                <Clock size={15} className="dropdown-item-icon" />
                                <span>Extend Grace Period</span>
                              </button>

                              {/* Grant Complimentary Paid Days */}
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => {
                                  setSelectedCompanyForGrant(c);
                                  setGrantDays(14);
                                  setGrantReason('Complimentary paid extension granted by administrator');
                                  setGrantModalOpen(true);
                                }}
                              >
                                <Sparkles size={15} className="dropdown-item-icon" />
                                <span>Grant Paid Days</span>
                              </button>

                              {/* Reconcile Seats Counter */}
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => handleReconcileSeats(c)}
                              >
                                <RotateCw size={15} className="dropdown-item-icon" />
                                <span>Reconcile Seat Counter</span>
                              </button>

                              <div className="dropdown-divider" />

                              {/* Studio Specific Audit Trail */}
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => handleOpenCompanyAuditLogs(c)}
                              >
                                <History size={15} className="dropdown-item-icon" />
                                <span>View Studio Audit Trail</span>
                              </button>

                              {/* Suspend / Reactivate */}
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => handleToggleSuspend(c)}
                              >
                                {isSuspended ? (
                                  <>
                                    <CheckCircle2 size={15} className="dropdown-item-icon" style={{ color: '#16A34A' }} />
                                    <span style={{ color: '#16A34A' }}>Reactivate Studio</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban size={15} className="dropdown-item-icon" style={{ color: '#D97706' }} />
                                    <span style={{ color: '#D97706' }}>Suspend Studio</span>
                                  </>
                                )}
                              </button>

                              <div className="dropdown-divider" />

                              {/* Soft Delete */}
                              <button
                                type="button"
                                className="dropdown-item dropdown-item-danger"
                                onClick={() => {
                                  setSelectedCompanyForDelete(c);
                                  setConfirmDeleteInput('');
                                  setDeleteModalOpen(true);
                                }}
                              >
                                <Trash2 size={15} className="dropdown-item-icon" />
                                <span>Delete Studio (Trash)</span>
                              </button>
                            </Dropdown>
                          ) : (
                            <Dropdown
                              align="right"
                              trigger={
                                <button
                                  type="button"
                                  className="action-icon-btn admin-3dot-btn"
                                  title="Actions"
                                  aria-label="Actions"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              }
                            >
                              {/* Undo Soft Delete */}
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => handleUndoDelete(c)}
                              >
                                <RotateCcw size={15} className="dropdown-item-icon" style={{ color: '#2563EB' }} />
                                <span>Restore Firm</span>
                              </button>

                              <div className="dropdown-divider" />

                              {/* Purge Company Immediately */}
                              <button
                                type="button"
                                className="dropdown-item dropdown-item-danger"
                                onClick={() => handlePurgeNow(c)}
                              >
                                <Trash2 size={15} className="dropdown-item-icon" />
                                <span>Purge Permanently</span>
                              </button>
                            </Dropdown>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )}

      {/* TAB: PLATFORM ADMINS & ACCESS CONTROL */}
      {activeTab === 'admins' && (
        <>
          {/* Admin KPI Overview */}
          <div className="admin-step-section">
            <div className="admin-metrics-grid">
              <div className="admin-kpi-card">
                <div className="kpi-icon-wrap bg-taupe">
                  <Users size={20} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">TOTAL PLATFORM ADMINS</span>
                  <span className="kpi-value">{admins.length}</span>
                  <span className="kpi-subtext">Authorized administrators</span>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="kpi-icon-wrap bg-green">
                  <Shield size={20} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">ACTIVE ADMINS</span>
                  <span className="kpi-value">
                    {admins.filter((a) => (a.status || 'ACTIVE').toUpperCase() !== 'DISABLED').length}
                  </span>
                  <span className="kpi-subtext">Full platform access</span>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="kpi-icon-wrap bg-blue">
                  <KeyRound size={20} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">AUTHENTICATION</span>
                  <span className="kpi-value">2FA Protected</span>
                  <span className="kpi-subtext">Time-based OTP policy</span>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="kpi-icon-wrap bg-copper">
                  <Activity size={20} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">ACCESS AUDIT</span>
                  <span className="kpi-value">Live</span>
                  <span className="kpi-subtext">All actions logged</span>
                </div>
              </div>
            </div>
          </div>

          {/* Super Admin Team Directory */}
          <div className="admin-step-section">
            <div className="admin-table-card">
              {admins.length === 0 ? (
                <div className="admin-empty-state-card">
                  <div className="admin-empty-icon-wrap">
                    <Users size={32} />
                  </div>
                  <h3 className="admin-empty-title">No Super Admins Found</h3>
                  <p className="admin-empty-desc">
                    Invite trusted administrators to manage companies, adjust seat limits, and audit security events.
                  </p>
                  <Button
                    variant="primary"
                    icon={Plus}
                    onClick={() => {
                      setModalError('');
                      setAdminModalOpen(true);
                    }}
                  >
                    Invite First Super Admin
                  </Button>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Administrator</th>
                      <th>Email Address</th>
                      <th>Role</th>
                      <th>Account Status</th>
                      <th>2FA Security</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => {
                      const adminId = admin._id || admin.id;
                      const rawStatus = (admin.status || 'ACTIVE').toUpperCase();
                      const isDisabled = rawStatus === 'DISABLED';
                      const isLocked = Boolean(admin.isLocked || admin.locked);
                      const is2FA = Boolean(admin.twoFactorEnabled || admin.is2FA);

                      return (
                        <tr key={adminId} className={isDisabled ? 'row-suspended' : ''}>
                          <td>
                            <div className="tenant-name-cell">
                              <Avatar letter={admin.name ? admin.name[0] : 'A'} size="sm" />
                              <div>
                                <span className="tenant-firm-name">{admin.name || 'Platform Administrator'}</span>
                                <span className="tenant-sub-label">{admin.role === 'SUPER_ADMIN' ? 'Platform Administrator' : 'Administrator'}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="owner-email" style={{ fontSize: '13px' }}>{admin.email}</span>
                          </td>
                          <td>
                            <span className="plan-name-badge">
                              {admin.role || 'SUPER_ADMIN'}
                            </span>
                          </td>
                          <td>
                            {isDisabled ? (
                              <span className="tenant-badge suspended">
                                <Ban size={13} /> Disabled
                              </span>
                            ) : isLocked ? (
                              <span className="tenant-badge in-trash">
                                <AlertTriangle size={13} /> Locked
                              </span>
                            ) : (
                              <span className="tenant-badge active">
                                <CheckCircle2 size={13} /> Active
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`tenant-badge ${is2FA ? 'active' : 'suspended'}`}>
                              <Shield size={12} /> {is2FA ? 'Enforced' : 'Pending Setup'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="admin-actions-cell">
                              {/* Edit Admin Name (PATCH /admin/admins/{id}) */}
                              <button
                                type="button"
                                className="action-icon-btn"
                                title="Edit Administrator Name"
                                onClick={() => handleOpenEditAdmin(admin)}
                              >
                                <Edit2 size={15} />
                              </button>

                              {/* Resend Invite */}
                              <button
                                type="button"
                                className="action-icon-btn"
                                title="Resend Invite"
                                onClick={() => handleResendAdminInvite(admin)}
                              >
                                <Mail size={15} />
                              </button>

                              {/* Unlock Account */}
                              {isLocked && (
                                <button
                                  type="button"
                                  className="action-icon-btn highlight"
                                  title="Unlock Account"
                                  onClick={() => handleUnlockAdmin(admin)}
                                >
                                  <Unlock size={15} />
                                </button>
                              )}

                              {/* Toggle Disable / Enable */}
                              <button
                                type="button"
                                className={`action-icon-btn ${isDisabled ? 'btn-activate' : 'btn-suspend'}`}
                                title={isDisabled ? 'Enable Admin Account' : 'Disable Admin Account'}
                                onClick={() => handleToggleDisableAdmin(admin)}
                              >
                                {isDisabled ? <UserCheck size={15} /> : <UserX size={15} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: PLANS & PRICING */}
      {activeTab === 'plans' && (
        <section className="admin-content-section">
          <div className="plans-schema-grid">
            {/* Free Tier Card */}
            <div className="plan-schema-card">
              <div className="plan-schema-header">
                <span className="plan-kicker">FREE PERMANENT TIER</span>
                <h3 className="plan-title">Architect Studio Free</h3>
                <div className="plan-price-wrap">
                  <span className="plan-currency">₹</span>
                  <span className="plan-amount">0</span>
                  <span className="plan-period">/ month forever</span>
                </div>
              </div>

              <div className="plan-specs-list">
                <div className="plan-feature-item">
                  <div className="plan-feature-check">
                    <Check size={12} strokeWidth={2.6} />
                  </div>
                  <span className="plan-feature-text"><strong>10 Users Free</strong> permanent allocation</span>
                </div>
                <div className="plan-feature-item">
                  <div className="plan-feature-check">
                    <Check size={12} strokeWidth={2.6} />
                  </div>
                  <span className="plan-feature-text"><strong>5 GB</strong> private S3 cloud storage</span>
                </div>
                <div className="plan-feature-item">
                  <div className="plan-feature-check">
                    <Check size={12} strokeWidth={2.6} />
                  </div>
                  <span className="plan-feature-text">Unlimited Architectural Projects & Tasks</span>
                </div>
                <div className="plan-feature-item">
                  <div className="plan-feature-check">
                    <Check size={12} strokeWidth={2.6} />
                  </div>
                  <span className="plan-feature-text">Drawing Approval & Revision Tracking (R0, R1, R2)</span>
                </div>
                <div className="plan-feature-item">
                  <div className="plan-feature-check">
                    <Check size={12} strokeWidth={2.6} />
                  </div>
                  <span className="plan-feature-text">External Unique Code Portal for Clients & Vendors</span>
                </div>
              </div>

              <div className="plan-footer-note">
                <strong>Rule:</strong> Removing a member frees the seat immediately (e.g. 10 → 9), allowing another member to be added without any charge.
              </div>
            </div>

            {/* Pro Tier Card */}
            <div className="plan-schema-card featured">
              <div className="plan-featured-tag">
                <Sparkles size={12} />
                RECOMMENDED EXPANSION
              </div>
              <div className="plan-schema-header">
                <span className="plan-kicker">COMMERCIAL ADD-ON TIER</span>
                <h3 className="plan-title">Studio Pro Tier</h3>
                <div className="plan-price-wrap">
                  <span className="plan-currency">₹</span>
                  <span className="plan-amount">500</span>
                  <span className="plan-period">/ additional seat / month</span>
                </div>
                <div className="plan-sub-price">
                  ₹375 / seat / month (billed annually — 25% discount)
                </div>
              </div>

              <div className="plan-specs-list">
                <div className="plan-feature-item">
                  <div className="plan-feature-check">
                    <Check size={12} strokeWidth={2.6} />
                  </div>
                  <span className="plan-feature-text"><strong>10 Free Seats</strong> + Scalable Extra Seats</span>
                </div>
                <div className="plan-feature-item">
                  <div className="plan-feature-check">
                    <Check size={12} strokeWidth={2.6} />
                  </div>
                  <span className="plan-feature-text"><strong>100 GB</strong> High-Speed Cloud Storage</span>
                </div>
                <div className="plan-feature-item">
                  <div className="plan-feature-check">
                    <Check size={12} strokeWidth={2.6} />
                  </div>
                  <span className="plan-feature-text">Financials: Project P&L, Claims & BOQ Approvals</span>
                </div>
                <div className="plan-feature-item">
                  <div className="plan-feature-check">
                    <Check size={12} strokeWidth={2.6} />
                  </div>
                  <span className="plan-feature-text">Automated Razorpay GST Invoices & Webhook Sync</span>
                </div>
                <div className="plan-feature-item">
                  <div className="plan-feature-check">
                    <Check size={12} strokeWidth={2.6} />
                  </div>
                  <span className="plan-feature-text">Priority Architecture Support & Daily Auto Backup</span>
                </div>
              </div>

              <div className="plan-footer-note">
                <strong>Notice:</strong> 11th user onwards prompts automated upgrade or manual Super Admin seat allocation.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: AUDIT & SECURITY LOGS (SIMPLE 1-LINE LISTING) */}
      {activeTab === 'audit' && (
        <>
          {/* STEP 1: Audit KPI Overview */}
          <div className="admin-step-section">
            <div className="admin-metrics-grid">
              <div className="admin-kpi-card">
                <div className="kpi-icon-wrap bg-blue">
                  <History size={20} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">TOTAL AUDIT LOGS</span>
                  <span className="kpi-value">{auditLogs.length}</span>
                  <span className="kpi-subtext">All events tracked</span>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="kpi-icon-wrap bg-green">
                  <LogIn size={20} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">ADMIN LOGINS</span>
                  <span className="kpi-value">{auditCategoryCounts.logins}</span>
                  <span className="kpi-subtext">Authentication events</span>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="kpi-icon-wrap bg-copper">
                  <Building2 size={20} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">FIRM OPERATIONS</span>
                  <span className="kpi-value">{auditCategoryCounts.companies}</span>
                  <span className="kpi-subtext">Tenant & seat changes</span>
                </div>
              </div>

              <div className="admin-kpi-card">
                <div className="kpi-icon-wrap bg-taupe">
                  <Shield size={20} />
                </div>
                <div className="kpi-info">
                  <span className="kpi-label">SECURITY & ACCESS</span>
                  <span className="kpi-value">{auditCategoryCounts.security}</span>
                  <span className="kpi-subtext">Credentials & admin audits</span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Filter & Search Bar */}
          <div className="admin-step-section">
            <div className="admin-filter-bar">
              <div className="admin-search-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search audit logs by event, firm, email or IP..."
                  value={auditSearch}
                  onChange={(e) => {
                    setAuditSearch(e.target.value);
                    setAuditPage(1);
                  }}
                />
              </div>

              <div className="status-pill-group">
                <button
                  type="button"
                  className={`filter-pill ${auditCategory === 'ALL' ? 'is-active' : ''}`}
                  onClick={() => {
                    setAuditCategory('ALL');
                    setAuditPage(1);
                  }}
                >
                  All ({auditCategoryCounts.all})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${auditCategory === 'LOGINS' ? 'is-active' : ''}`}
                  onClick={() => {
                    setAuditCategory('LOGINS');
                    setAuditPage(1);
                  }}
                >
                  Logins ({auditCategoryCounts.logins})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${auditCategory === 'COMPANIES' ? 'is-active' : ''}`}
                  onClick={() => {
                    setAuditCategory('COMPANIES');
                    setAuditPage(1);
                  }}
                >
                  Firms ({auditCategoryCounts.companies})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${auditCategory === 'SECURITY' ? 'is-active' : ''}`}
                  onClick={() => {
                    setAuditCategory('SECURITY');
                    setAuditPage(1);
                  }}
                >
                  Security ({auditCategoryCounts.security})
                </button>
              </div>
            </div>
          </div>

          {/* STEP 3: Simple 1-Line Listing Table */}
          <div className="admin-step-section">
            <div className="admin-table-card">
              {auditLogs.length === 0 ? (
                <div className="admin-empty-state-card">
                  <div className="admin-empty-icon-wrap">
                    <History size={32} />
                  </div>
                  <h3 className="admin-empty-title">No Audit Logs Recorded</h3>
                  <p className="admin-empty-desc">
                    Administrative activities, firm provisioning, and security logins will appear here automatically.
                  </p>
                </div>
              ) : (
                <>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Target</th>
                        <th>Operated By</th>
                        <th>IP Address</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAuditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="admin-empty-cell">
                            <div className="admin-empty-state">
                              <History size={24} />
                              <h4 className="admin-empty-title">No audit logs matching "{auditSearch}"</h4>
                              <p className="admin-empty-desc">Try clearing your search query or switching filters.</p>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setAuditSearch('');
                                  setAuditCategory('ALL');
                                  setAuditPage(1);
                                }}
                              >
                                Clear Filters
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedAuditLogs.map((log) => {
                          const actionMeta = formatAuditAction(log.action);
                          const targetInfo = resolveAuditTarget(log, companies);

                          return (
                            <tr key={log.id}>
                              <td>
                                <span
                                  className="plan-name-badge"
                                  style={{
                                    color: actionMeta.color,
                                    backgroundColor: actionMeta.bg,
                                    borderColor: actionMeta.border,
                                    fontWeight: 600,
                                    fontSize: '11.5px',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {actionMeta.label}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontWeight: 600, fontSize: '13px', color: '#1E1A17' }}>
                                  {targetInfo.name}
                                </span>
                              </td>
                              <td>
                                <span style={{ fontSize: '12.5px', color: '#7B6F62' }}>
                                  {log.operator}
                                </span>
                              </td>
                              <td>
                                <code
                                  style={{
                                    fontSize: '11.5px',
                                    background: '#F1ECE6',
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    color: '#4A5568',
                                    fontFamily: 'monospace'
                                  }}
                                >
                                  {log.ip || '127.0.0.1'}
                                </code>
                              </td>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: '12px', color: '#7B6F62', fontWeight: 500 }}>
                                  {log.timestamp}
                                </span>
                              </td>

                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Clean Pagination Bar */}
                  {filteredAuditLogs.length > 0 && (
                    <div className="audit-table-pagination">
                      <span className="audit-table-pagination-info">
                        Showing{' '}
                        <strong>
                          {(currentAuditPage - 1) * auditLimit + 1}–
                          {Math.min(currentAuditPage * auditLimit, filteredAuditLogs.length)}
                        </strong>{' '}
                        of <strong>{filteredAuditLogs.length}</strong> events
                      </span>

                      <div className="audit-table-pagination-actions">
                        <button
                          type="button"
                          className="filter-pill"
                          disabled={currentAuditPage <= 1}
                          onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                        >
                          Prev
                        </button>

                        <div className="audit-page-numbers">
                          {Array.from({ length: totalAuditPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalAuditPages || Math.abs(p - currentAuditPage) <= 1)
                            .map((p, idx, arr) => {
                              const prev = arr[idx - 1];
                              const showDots = prev && p - prev > 1;
                              return (
                                <React.Fragment key={p}>
                                  {showDots && <span style={{ padding: '0 4px', color: '#7B6F62' }}>…</span>}
                                  <button
                                    type="button"
                                    className={`filter-pill ${p === currentAuditPage ? 'is-active' : ''}`}
                                    onClick={() => setAuditPage(p)}
                                    style={{ minWidth: '32px', textAlign: 'center' }}
                                  >
                                    {p}
                                  </button>
                                </React.Fragment>
                              );
                            })}
                        </div>

                        <button
                          type="button"
                          className="filter-pill"
                          disabled={currentAuditPage >= totalAuditPages}
                          onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB 4: BILLING & SUBSCRIPTIONS (Module M1.6) */}
      {activeTab === 'plans' && (
        <SuperAdminBilling
          companies={companies}
          onNotification={showNotification}
        />
      )}
            </>
          )}
        </main>
  </div>

      {/* MODAL 1: REGISTER NEW COMPANY */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setModalError('');
          setCreateFormErrors({});
        }}
        title="Register New Company"
        maxWidth="620px"
      >
        <form onSubmit={handleCreateCompany} className="admin-modal-form" noValidate>
          {modalError && (
            <div className="admin-danger-box" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={18} className="danger-icon" />
              <div>{modalError}</div>
            </div>
          )}

          <div className="admin-form-row">
            <Input
              label="Company Name"
              id="tenant-name"
              placeholder="Enter company brand name"
              value={newCompanyForm.name}
              onChange={(e) => {
                setNewCompanyForm((prev) => ({ ...prev, name: e.target.value }));
                if (createFormErrors.name) setCreateFormErrors((prev) => ({ ...prev, name: '' }));
              }}
              error={createFormErrors.name}
              required
            />
            <Input
              label="Legal Entity Name"
              id="tenant-legal-name"
              placeholder="Enter legal entity name"
              value={newCompanyForm.legalName}
              onChange={(e) => setNewCompanyForm((prev) => ({ ...prev, legalName: e.target.value }))}
            />
          </div>

          <div className="admin-form-row">
            <Input
              label="Owner Full Name"
              id="tenant-owner-name"
              placeholder="Enter owner full name"
              value={newCompanyForm.ownerName}
              onChange={(e) => {
                setNewCompanyForm((prev) => ({ ...prev, ownerName: e.target.value }));
                if (createFormErrors.ownerName) setCreateFormErrors((prev) => ({ ...prev, ownerName: '' }));
              }}
              error={createFormErrors.ownerName}
              required
            />
            <Input
              label="Owner Login Email"
              id="tenant-email"
              type="email"
              placeholder="Enter owner email address"
              value={newCompanyForm.ownerEmail}
              onChange={(e) => {
                setNewCompanyForm((prev) => ({ ...prev, ownerEmail: e.target.value }));
                if (createFormErrors.ownerEmail) setCreateFormErrors((prev) => ({ ...prev, ownerEmail: '' }));
              }}
              error={createFormErrors.ownerEmail}
              required
            />
          </div>

          <div className="admin-form-row">
            <Input
              label="Owner Mobile Number"
              id="tenant-owner-phone"
              placeholder="Enter 10-digit mobile number"
              value={newCompanyForm.ownerPhone}
              onChange={(e) => {
                setNewCompanyForm((prev) => ({ ...prev, ownerPhone: e.target.value }));
                if (createFormErrors.ownerPhone) setCreateFormErrors((prev) => ({ ...prev, ownerPhone: '' }));
              }}
              error={createFormErrors.ownerPhone}
            />
            <Input
              label="City"
              id="tenant-city"
              placeholder="Enter city"
              value={newCompanyForm.city}
              onChange={(e) => setNewCompanyForm((prev) => ({ ...prev, city: e.target.value }))}
            />
          </div>

          <div className="admin-form-row">
            <Select
              label="Platform Plan"
              id="tenant-plan"
              value={newCompanyForm.plan}
              onChange={(e) => setNewCompanyForm((prev) => ({ ...prev, plan: e.target.value }))}
              options={[
                { value: 'FREE', label: 'Free Tier (10 Free Seats)' },
                { value: 'PAID', label: 'Paid Pro Tier' }
              ]}
            />
            <Input
              label="Seat Limit"
              id="tenant-seats"
              type="number"
              min="1"
              max="500"
              value={newCompanyForm.seatLimit}
              onChange={(e) => {
                setNewCompanyForm((prev) => ({ ...prev, seatLimit: e.target.value }));
                if (createFormErrors.seatLimit) setCreateFormErrors((prev) => ({ ...prev, seatLimit: '' }));
              }}
              error={createFormErrors.seatLimit}
              required
            />
          </div>

          <div className="admin-form-row">
            <Input
              label="GSTIN / Tax ID"
              id="tenant-gst"
              placeholder="Enter GSTIN or Tax ID"
              value={newCompanyForm.gstNumber}
              onChange={(e) => {
                setNewCompanyForm((prev) => ({ ...prev, gstNumber: e.target.value.toUpperCase() }));
                if (createFormErrors.gstNumber) setCreateFormErrors((prev) => ({ ...prev, gstNumber: '' }));
              }}
              error={createFormErrors.gstNumber}
            />
          </div>

          <div className="admin-modal-actions" style={{ marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateModalOpen(false);
                setModalError('');
                setCreateFormErrors({});
              }}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={modalLoading}
              loading={modalLoading}
              style={{ flex: 1 }}
            >
              Create Company
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADJUST SEATS */}
      <Modal
        isOpen={seatModalOpen}
        onClose={() => setSeatModalOpen(false)}
        title="Adjust Seat Allocation"
      >
        <form onSubmit={handleAdjustSeats} className="admin-modal-form">
          <div className="admin-notice-box">
            Adjust the total seat capacity for this firm. Any manual changes will take effect immediately.
          </div>

          {modalError && (
            <div className="admin-danger-box" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={18} className="danger-icon" />
              <div>{modalError}</div>
            </div>
          )}

          <div className="firm-summary-banner">
            <div>
              <span className="summary-firm-title">{selectedCompanyForSeats?.name}</span>
              <span className="summary-current-seats">
                Current: {selectedCompanyForSeats?.seatsUsed} active users / {selectedCompanyForSeats?.seatLimit} limit
              </span>
            </div>
          </div>

          <Input
            label="New Total Seat Limit"
            id="adjust-seats"
            type="number"
            min={selectedCompanyForSeats?.seatsUsed || 1}
            max="1000"
            value={newSeatLimit}
            onChange={(e) => setNewSeatLimit(e.target.value)}
            required
          />

          <Input
            label="Reason or Payment Reference"
            id="adjust-reason"
            placeholder="Enter reason or reference"
            value={seatAdjustReason}
            onChange={(e) => setSeatAdjustReason(e.target.value)}
            required
          />

          <div className="admin-modal-actions">
            <Button variant="secondary" onClick={() => setSeatModalOpen(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={modalLoading} loading={modalLoading} style={{ flex: 1 }}>
              Save Seat Allocation
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: SOFT DELETE */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Archive Architecture Firm"
      >
        <form onSubmit={handleConfirmSoftDelete} className="admin-modal-form">
          <div className="admin-danger-box">
            <AlertTriangle size={20} className="danger-icon" />
            <div>
              Archiving this company will suspend active user logins. Firm records and drawings will be retained in archive for <strong>30 days</strong> before permanent deletion.
            </div>
          </div>

          {modalError && (
            <div className="admin-danger-box" style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={18} className="danger-icon" />
              <div>{modalError}</div>
            </div>
          )}

          <div className="export-backup-row">
            <div>
              <span className="backup-title">Pre-Archive Data Backup</span>
              <span className="backup-sub">Download complete project drawings, tasks and logs as ZIP</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => alert('Exporting tenant data package (ZIP)...')}
            >
              Export ZIP
            </Button>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="confirm-del">
              Type <strong>{selectedCompanyForDelete?.name}</strong> to confirm:
            </label>
            <input
              id="confirm-del"
              className="form-input"
              placeholder="Enter company name"
              value={confirmDeleteInput}
              onChange={(e) => setConfirmDeleteInput(e.target.value)}
              required
            />
          </div>

          <div className="admin-modal-actions">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={modalLoading || confirmDeleteInput.trim().toLowerCase() !== selectedCompanyForDelete?.name.trim().toLowerCase()}
              loading={modalLoading}
              style={{ flex: 1 }}
            >
              Archive Company (30-day grace)
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: ACCESS WORKSPACE */}
      <Modal
        isOpen={impersonateModalOpen}
        onClose={() => {
          setImpersonateModalOpen(false);
          setModalError('');
        }}
        title="Access Studio Workspace"
      >
        <div className="admin-modal-form">
          <div className="admin-notice-box">
            <Shield size={18} />
            <div>
              Support Access Mode: Accessing a customer workspace is recorded in the audit log for security and compliance.
            </div>
          </div>

          {modalError && (
            <div className="admin-danger-box" style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={18} className="danger-icon" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{modalError}</div>
                {(modalError.toLowerCase().includes('owner') || modalError.toLowerCase().includes('activate') || modalError.toLowerCase().includes('pending') || modalError.toLowerCase().includes('support')) && (
                  <button
                    type="button"
                    style={{
                      marginTop: '8px',
                      background: 'var(--color-primary, #7B6F62)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    onClick={async () => {
                      if (selectedCompanyForLogin) {
                        try {
                          await adminService.resendOwnerInvite(selectedCompanyForLogin.id || selectedCompanyForLogin._id);
                          showNotification(`Owner invitation email resent for "${selectedCompanyForLogin.name}".`);
                          setImpersonateModalOpen(false);
                        } catch (e) {
                          setModalError(extractErrorMessage(e));
                        }
                      }
                    }}
                  >
                    Resend Owner Invitation Email
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="firm-summary-banner">
            <div>
              <span className="summary-firm-title">{selectedCompanyForLogin?.name}</span>
              <span className="summary-current-seats">Owner: {selectedCompanyForLogin?.ownerEmail}</span>
            </div>
          </div>

          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
            You will be redirected into the studio workspace with view permissions to assist the firm with drawings, billing, or configuration.
          </p>

          <div className="admin-modal-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setImpersonateModalOpen(false);
                setModalError('');
              }}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={ExternalLink}
              onClick={handleConfirmImpersonate}
              loading={modalLoading}
              disabled={modalLoading}
              style={{ flex: 1 }}
            >
              Open Workspace
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: INVITE SUPER ADMIN */}
      <Modal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        title="Invite Platform Super Admin"
      >
        <form onSubmit={handleInviteAdmin} className="admin-modal-form">
          <div className="admin-notice-box">
            <Shield size={18} />
            <div>
              Invite a trusted administrator to the Mayur Mehta platform. They will receive an invitation email to set up their password and 2-Factor Authentication (2FA).
            </div>
          </div>

          {modalError && (
            <div className="admin-danger-box" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={18} className="danger-icon" />
              <div>{modalError}</div>
            </div>
          )}

          <Input
            label="Full Name"
            id="new-admin-name"
            placeholder="Enter full name"
            value={newAdminForm.name}
            onChange={(e) => setNewAdminForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />

          <Input
            label="Email Address"
            id="new-admin-email"
            type="email"
            placeholder="Enter admin email address"
            value={newAdminForm.email}
            onChange={(e) => setNewAdminForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />

          <div className="admin-modal-actions">
            <Button variant="secondary" onClick={() => setAdminModalOpen(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={modalLoading} loading={modalLoading} style={{ flex: 1 }}>
              Send Admin Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: EDIT COMPANY PROFILE & FIX PENDING OWNER */}
      <Modal
        isOpen={editCompanyModalOpen}
        onClose={() => setEditCompanyModalOpen(false)}
        title="Edit Architecture Firm Profile"
        maxWidth="620px"
      >
        <form onSubmit={handleSaveCompanyEdit} className="admin-modal-form">
          <div className="admin-notice-box">
            Update studio identity and contact details. Changes are updated immediately in the live database.
          </div>

          {modalError && (
            <div className="admin-danger-box" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={18} className="danger-icon" />
              <div>{modalError}</div>
            </div>
          )}

          <div className="admin-form-row">
            <Input
              label="Firm / Studio Name"
              id="edit-firm-name"
              value={editCompanyForm.name}
              onChange={(e) => setEditCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Registered Legal Entity Name"
              id="edit-legal-name"
              value={editCompanyForm.legalName}
              onChange={(e) => setEditCompanyForm((prev) => ({ ...prev, legalName: e.target.value }))}
            />
          </div>

          <div className="admin-form-row">
            <Input
              label="GSTIN / Tax ID"
              id="edit-gst"
              value={editCompanyForm.gstNumber}
              onChange={(e) => setEditCompanyForm((prev) => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
            />
            <Input
              label="Studio Contact Phone"
              id="edit-phone"
              value={editCompanyForm.phone}
              onChange={(e) => setEditCompanyForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="admin-form-section" style={{ marginTop: '0.75rem' }}>
            <div className="admin-form-section-header">
              <Users size={16} className="admin-section-icon" />
              <span className="admin-section-title">Principal Architect (Owner Identity)</span>
            </div>

            <div className="admin-form-row">
              <Input
                label="Owner Name"
                id="edit-owner-name"
                value={editCompanyForm.ownerName}
                onChange={(e) => setEditCompanyForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                required
              />
              <Input
                label="Owner Direct Mobile"
                id="edit-owner-phone"
                value={editCompanyForm.ownerPhone}
                onChange={(e) => setEditCompanyForm((prev) => ({ ...prev, ownerPhone: e.target.value }))}
              />
            </div>

            <Input
              label="Owner Login Email (Fix if pending activation)"
              id="edit-owner-email"
              type="email"
              value={editCompanyForm.ownerEmail}
              onChange={(e) => setEditCompanyForm((prev) => ({ ...prev, ownerEmail: e.target.value }))}
              required
            />
          </div>

          <div className="admin-modal-actions">
            <Button variant="secondary" onClick={() => setEditCompanyModalOpen(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading} disabled={modalLoading} style={{ flex: 1 }}>
              Save Changes to Database
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 7: EDIT SUPER ADMIN NAME (PATCH /admin/admins/{id}) */}
      <Modal
        isOpen={editAdminModalOpen}
        onClose={() => setEditAdminModalOpen(false)}
        title="Edit Administrator Details"
        maxWidth="480px"
      >
        <form onSubmit={handleSaveEditAdmin} className="admin-modal-form">
          <div className="admin-notice-box">
            Update the full display name for platform administrator account ({selectedAdminForEdit?.email}).
          </div>

          <Input
            label="Administrator Name"
            id="edit-admin-name"
            value={editAdminName}
            onChange={(e) => setEditAdminName(e.target.value)}
            placeholder="Enter administrator full name"
            required
          />

          <div className="admin-modal-actions">
            <Button variant="secondary" onClick={() => setEditAdminModalOpen(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={editAdminLoading} disabled={editAdminLoading} style={{ flex: 1 }}>
              Save Administrator Name
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 8: AUDIT LOG ENTRY DETAIL (GET /admin/audit-logs/{id}) */}
      <Modal
        isOpen={auditDetailModalOpen}
        onClose={() => setAuditDetailModalOpen(false)}
        title="Audit Log Event Inspection"
        maxWidth="640px"
      >
        {selectedAuditLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>EVENT ACTION</span>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)' }}>{selectedAuditLog.action}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>TIMESTAMP</span>
                <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{selectedAuditLog.timestamp}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>OPERATED BY</span>
                <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{selectedAuditLog.operator}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>CLIENT IP ADDRESS</span>
                <code style={{ fontSize: '12px', background: '#F1ECE6', padding: '2px 6px', borderRadius: '4px' }}>
                  {selectedAuditLog.ip || '127.0.0.1'}
                </code>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Metadata & Payload Attributes:</span>
              <pre style={{
                background: '#1E1A17',
                color: '#E8E3DB',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
                overflowX: 'auto',
                maxHeight: '260px'
              }}>
                {JSON.stringify(selectedAuditLog.metadata || selectedAuditLog.details || selectedAuditLog, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setAuditDetailModalOpen(false)}>
                Close Inspector
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 9: STUDIO SPECIFIC AUDIT TRAIL (GET /admin/companies/{id}/audit-logs) */}
      <Modal
        isOpen={companyAuditModalOpen}
        onClose={() => setCompanyAuditModalOpen(false)}
        title={`Audit Trail: ${selectedCompanyForAudit?.name || 'Studio'}`}
        maxWidth="720px"
      >
        <div>
          {companyAuditLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#7B6F62' }}>
              <RotateCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
              <p>Loading studio audit logs from backend...</p>
            </div>
          ) : companyAuditLogs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#7B6F62' }}>
              <History size={28} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
              <p>No recorded audit events for this architecture firm.</p>
            </div>
          ) : (
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Operated By</th>
                    <th>IP</th>
                    <th style={{ textAlign: 'right' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {companyAuditLogs.map((log) => (
                    <tr key={log.id || log._id}>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: '12px' }}>{log.action}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#7B6F62' }}>{log.operator || log.userEmail || 'System'}</span>
                      </td>
                      <td>
                        <code style={{ fontSize: '11px', background: '#F1ECE6', padding: '2px 5px', borderRadius: '4px' }}>
                          {log.ip || '127.0.0.1'}
                        </code>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '12px', color: '#7B6F62' }}>
                        {log.timestamp || log.createdAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setCompanyAuditModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 10: CHANGE SUPER ADMIN PASSWORD (POST /admin/auth/change-password) */}
      <Modal
        isOpen={adminChangePasswordOpen}
        onClose={() => setAdminChangePasswordOpen(false)}
        title="Change Super Admin Password"
        maxWidth="480px"
      >
        <form onSubmit={handleAdminChangePassword} className="admin-modal-form">
          {adminPasswordError && (
            <div className="admin-danger-box">
              <AlertTriangle size={18} className="danger-icon" />
              <div>{adminPasswordError}</div>
            </div>
          )}

          {adminPasswordSuccess && (
            <div className="admin-notice-box" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
              <CheckCircle2 size={18} />
              <div>{adminPasswordSuccess}</div>
            </div>
          )}

          <Input
            label="Current Password"
            id="superadmin-current-pass"
            type="password"
            value={adminCurrentPassword}
            onChange={(e) => setAdminCurrentPassword(e.target.value)}
            placeholder="Enter current master password"
            required
          />

          <Input
            label="New Password"
            id="superadmin-new-pass"
            type="password"
            value={adminNewPassword}
            onChange={(e) => setAdminNewPassword(e.target.value)}
            placeholder="At least 8 characters with letters & numbers"
            required
          />

          <Input
            label="Confirm New Password"
            id="superadmin-confirm-pass"
            type="password"
            value={adminConfirmPassword}
            onChange={(e) => setAdminConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            required
          />

          <div className="admin-modal-actions">
            <Button variant="secondary" onClick={() => setAdminChangePasswordOpen(false)} disabled={adminPasswordLoading} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={adminPasswordLoading} disabled={adminPasswordLoading} style={{ flex: 1 }}>
              Save New Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 9: EXTEND GRACE PERIOD (M1.6) */}
      <Modal
        isOpen={graceModalOpen}
        onClose={() => setGraceModalOpen(false)}
        title={selectedCompanyForGrace ? `Extend Grace Period: ${selectedCompanyForGrace.name}` : 'Extend Grace Period'}
      >
        <form onSubmit={handleExtendGrace} className="admin-modal-form">
          <Input
            label="Additional Grace Days (1 to 30)"
            id="company-grace-days"
            type="number"
            min="1"
            max="30"
            value={graceDays}
            onChange={(e) => setGraceDays(e.target.value)}
            required
          />

          <Input
            label="Audit Justification Reason"
            id="company-grace-reason"
            value={graceReason}
            onChange={(e) => setGraceReason(e.target.value)}
            required
          />

          <div className="admin-modal-actions">
            <Button variant="secondary" onClick={() => setGraceModalOpen(false)} disabled={graceLoading} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={graceLoading} disabled={graceLoading} style={{ flex: 1 }}>
              Confirm Extension
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 10: GRANT COMPLIMENTARY DAYS (M1.6) */}
      <Modal
        isOpen={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        title={selectedCompanyForGrant ? `Grant Free Pro Days: ${selectedCompanyForGrant.name}` : 'Grant Complimentary Days'}
      >
        <form onSubmit={handleGrantComplimentary} className="admin-modal-form">
          <Input
            label="Days to Grant (1 to 90)"
            id="company-grant-days"
            type="number"
            min="1"
            max="90"
            value={grantDays}
            onChange={(e) => setGrantDays(e.target.value)}
            required
          />

          <Input
            label="Audit Grant Reason"
            id="company-grant-reason"
            value={grantReason}
            onChange={(e) => setGrantReason(e.target.value)}
            required
          />

          <div className="admin-modal-actions">
            <Button variant="secondary" onClick={() => setGrantModalOpen(false)} disabled={grantLoading} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={grantLoading} disabled={grantLoading} style={{ flex: 1 }}>
              Grant Days
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
export default SuperAdminPage;
