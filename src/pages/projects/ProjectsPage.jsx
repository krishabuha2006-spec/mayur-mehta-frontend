import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Filter,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  Check,
  FileText,
  Layers,
  Users,
  Download,
  RotateCcw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PauseCircle,
  Archive,
  Sparkles,
  ShieldCheck,
  Building,
  Sliders,
  Calendar,
  IndianRupee,
  MapPin,
  Tag,
  ArrowRight,
  ArrowLeft,
  User,
  Sun,
  HardHat,
  Wrench,
  Ruler,
  Camera,
  ClipboardList,
  FolderKanban,
  Image as ImageIcon
} from 'lucide-react';
import { projectService } from '../../services/projectService';
import { masterService } from '../../services/masterService';
import { teamService } from '../../services/teamService';
import { logService } from '../../services/logService';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { Dropdown } from '../../components/common/Dropdown/Dropdown';
import { ProjectModal } from '../../components/projects/ProjectModal/ProjectModal';
import './ProjectsPage.css';
import { extractErrorMessage } from '../../utils/errorHandler';
import { useConfirm } from '../../context/ConfirmationContext';

// Helper to extract clean rupee value from any project object representation or numeric value
const extractBudgetRupees = (projOrVal) => {
  if (projOrVal == null) return 0;
  if (typeof projOrVal === 'number') {
    return projOrVal > 0 ? (projOrVal >= 10000000 && projOrVal % 100 === 0 ? projOrVal / 100 : projOrVal / 100) : 0;
  }
  if (typeof projOrVal === 'string') {
    const clean = projOrVal.replace(/[^0-9.]/g, '');
    const num = Number(clean);
    return isNaN(num) ? 0 : num;
  }
  // If passed project record object
  if (projOrVal.budgetPaise != null && !isNaN(projOrVal.budgetPaise) && Number(projOrVal.budgetPaise) > 0) {
    return Number(projOrVal.budgetPaise) / 100;
  }
  if (projOrVal.budgetRupees != null && !isNaN(projOrVal.budgetRupees) && Number(projOrVal.budgetRupees) > 0) {
    return Number(projOrVal.budgetRupees);
  }
  if (projOrVal.budget != null && !isNaN(projOrVal.budget) && Number(projOrVal.budget) > 0) {
    const b = Number(projOrVal.budget);
    return b >= 10000000 && b % 100 === 0 ? b / 100 : b;
  }
  if (projOrVal.budgetAmount != null && !isNaN(projOrVal.budgetAmount) && Number(projOrVal.budgetAmount) > 0) {
    return Number(projOrVal.budgetAmount);
  }
  if (projOrVal.estimatedBudget != null && !isNaN(projOrVal.estimatedBudget) && Number(projOrVal.estimatedBudget) > 0) {
    return Number(projOrVal.estimatedBudget);
  }
  if (projOrVal.financials) {
    if (projOrVal.financials.budgetPaise != null && Number(projOrVal.financials.budgetPaise) > 0) {
      return Number(projOrVal.financials.budgetPaise) / 100;
    }
    if (projOrVal.financials.budget != null && Number(projOrVal.financials.budget) > 0) {
      return Number(projOrVal.financials.budget);
    }
  }
  return 0;
};

// Helper to format Paise / Rupees / Project into clean Indian Rupee notation
const formatBudget = (projOrVal) => {
  let rupees = 0;
  if (typeof projOrVal === 'object' && projOrVal !== null) {
    rupees = extractBudgetRupees(projOrVal);
  } else if (typeof projOrVal === 'number') {
    rupees = projOrVal > 0 ? projOrVal / 100 : 0;
  } else if (typeof projOrVal === 'string') {
    rupees = extractBudgetRupees(projOrVal);
  }

  if (!rupees || rupees <= 0) return null;
  if (rupees >= 10000000) {
    return `₹${(rupees / 10000000).toFixed(2)} Cr`;
  }
  if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(2)} L`;
  }
  return `₹${Math.round(rupees).toLocaleString('en-IN')}`;
};

// Formatted Rupees in Words/Shorthand for budget field live preview
const formatRupeesWord = (val) => {
  if (!val) return '₹0';
  const clean = String(val).replace(/[^0-9.]/g, '');
  const num = Number(clean);
  if (isNaN(num) || num <= 0) return '₹0';
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Crores`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} Lakhs`;
  }
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
};

// Helper to calculate project duration between two dates
const calculateDuration = (start, end) => {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = e - s;
  if (isNaN(diffTime) || diffTime < 0) return null;
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (days >= 30) {
    const months = (days / 30.417).toFixed(1);
    return `${days} days (~${months} months)`;
  }
  return `${days} days`;
};

// Helper to extract Built-up Area with unit
const extractArea = (proj) => {
  if (!proj) return null;
  const val = proj.area?.value || proj.area?.builtUp || proj.area?.plot || proj.builtUpArea || proj.builtUp;
  if (!val || isNaN(val) || Number(val) <= 0) return null;
  const rawUnit = (proj.area?.unit || 'SQFT').toUpperCase();
  const unit = rawUnit.includes('M') ? 'Sq. M.' : (rawUnit.includes('YD') ? 'Sq. Yd.' : 'Sq. Ft.');
  return `${Number(val).toLocaleString('en-IN')} ${unit}`;
};

// Helper to extract Client Contact Person
const extractContact = (proj) => {
  if (!proj) return null;
  if (proj.client?.contactPerson) return proj.client.contactPerson;
  if (proj.description && proj.description.includes('Contact:')) {
    const match = proj.description.match(/Contact:\s*([^|]+)/i);
    if (match && match[1]?.trim()) return match[1].trim();
  }
  return null;
};

// Helper to extract Site Address
const extractSiteAddress = (proj) => {
  if (!proj) return null;
  if (proj.site?.address) return proj.site.address;
  if (proj.description && proj.description.includes('Site Address:')) {
    const match = proj.description.match(/Site Address:\s*([^|]+)/i);
    if (match && match[1]?.trim()) return match[1].trim();
  }
  return null;
};

// Helper to extract formatted Target Handover Date
const extractTargetDate = (proj) => {
  if (!proj) return null;
  const rawDate = proj.plannedEndDate || proj.targetDate || proj.targetHandoverDate;
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {}
  }
  if (proj.description && proj.description.includes('Target Handover:')) {
    const match = proj.description.match(/Target Handover:\s*([^|]+)/i);
    if (match && match[1]?.trim()) {
      try {
        const d = new Date(match[1].trim());
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return match[1].trim();
      } catch {
        return match[1].trim();
      }
    }
  }
  return null;
};

// Helper to extract raw target date (YYYY-MM-DD) for form population
const extractTargetDateRaw = (proj) => {
  if (!proj) return '';
  if (proj.plannedEndDate) return proj.plannedEndDate.slice(0, 10);
  if (proj.description && proj.description.includes('Target Handover:')) {
    const match = proj.description.match(/Target Handover:\s*([^|]+)/i);
    if (match && match[1]?.trim()) return match[1].trim();
  }
  return '';
};

// Suggested architectural tags for quick one-click tagging
const SUGGESTED_TAGS = [
  'Luxury Residential',
  'Commercial Complex',
  'Sustainable & Green',
  'Heritage Restoration',
  'Landscape & Courtyard',
  'Interior Fitout',
  'High-End Villa',
  'BIM Coordinated'
];

// Priority badge variant resolver
const getPriorityBadgeVariant = (priority) => {
  switch (priority) {
    case 'URGENT': return 'danger';
    case 'HIGH': return 'warning';
    case 'MEDIUM': return 'primary';
    case 'LOW': return 'neutral';
    default: return 'neutral';
  }
};

// Status badge variant resolver
const getStatusBadgeVariant = (status) => {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'IN_PROGRESS': return 'primary';
    case 'ON_HOLD': return 'warning';
    case 'CANCELLED': return 'danger';
    case 'NOT_STARTED': return 'neutral';
    default: return 'neutral';
  }
};

export function ProjectsPage() {
  const confirm = useConfirm();
  // Main projects state
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    byStatus: { NOT_STARTED: 0, IN_PROGRESS: 0, ON_HOLD: 0, COMPLETED: 0, CANCELLED: 0 },
    overdue: 0,
    archived: 0
  });
  const [loading, setLoading] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  // Authentication state check
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Sub-navigation view: 'list' | 'visit-logs' | 'photos'
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'list';

  // Site Visit Logs State
  const [siteLogs, setSiteLogs] = useState([]);
  const [logFilterProject, setLogFilterProject] = useState('ALL');
  const [logPage, setLogPage] = useState(1);
  const LOGS_PER_PAGE = 8;
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newLogForm, setNewLogForm] = useState({
    project: '',
    engineer: 'Mayur Mehta',
    weather: 'Sunny (32°C)',
    laborCount: 16,
    hoursWorked: 8,
    summary: '',
    tradeBreakdown: 'Civil, Masons & Structural'
  });

  // Project Photos State
  const [projectPhotos, setProjectPhotos] = useState([
    {
      id: 'photo-1',
      project: 'Aarohi Villa Residence',
      title: 'Foundation RCC Setting & Reinforcement',
      category: 'Foundation',
      date: '2026-10-24',
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      photographer: 'Mayur Mehta (Lead Architect)'
    },
    {
      id: 'photo-2',
      project: 'Monolith Design Corporate Office',
      title: 'Glass Facade & Double-Glazing Framing',
      category: 'Facade',
      date: '2026-10-28',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
      photographer: 'Site Project Engineer'
    },
    {
      id: 'photo-3',
      project: 'Khyati Heights Penthouse',
      title: 'Terrace Cantilever Slab Casting Inspection',
      category: 'Structural',
      date: '2026-10-30',
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      photographer: 'Structural Consultant'
    },
    {
      id: 'photo-4',
      project: 'Aarohi Villa Residence',
      title: 'Courtyard Water Feature Level Verification',
      category: 'Landscape',
      date: '2026-10-31',
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
      photographer: 'Landscape Designer'
    }
  ]);
  const [photoFilterProject, setPhotoFilterProject] = useState('ALL');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [newPhotoForm, setNewPhotoForm] = useState({
    project: '',
    title: '',
    category: 'Site Progress',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
  });

  useEffect(() => {
    logService.getLogs().then((res) => {
      setSiteLogs(Array.isArray(res) ? res : []);
    }).catch(() => {});
  }, [currentView]);

  // Lookups: Categories, Types, and Users Directory
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [usersDirectory, setUsersDirectory] = useState([]);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalProject, setEditModalProject] = useState(null);
  const [viewModalProject, setViewModalProject] = useState(null);
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [trashedProjects, setTrashedProjects] = useState([]);
  const [statusModalProject, setStatusModalProject] = useState(null);

  // Tab inside View Modal: 'overview' | 'stages' | 'team'
  const [modalTab, setModalTab] = useState('overview');
  const [stages, setStages] = useState([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageCode, setNewStageCode] = useState('');

  // Team management inside View Modal
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState('MEMBER');

  // Status transition state
  const [targetStatus, setTargetStatus] = useState('IN_PROGRESS');
  const [statusReason, setStatusReason] = useState('');
  const [confirmOpenStages, setConfirmOpenStages] = useState(false);

  // Manual Progress Mode inside View Modal
  const [manualProgressInput, setManualProgressInput] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);

  // Top Toast Notification state: { message, type: 'success' | 'error' | 'info', title?: string }
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success', title = null) => {
    const cleanType = type === 'error' ? 'error' : (type === 'info' ? 'info' : 'success');
    const defaultTitle = cleanType === 'error' ? 'Action Failed' : (cleanType === 'info' ? 'Notice' : 'Success');
    setToast({
      message: typeof message === 'string' ? message : String(message || 'Notification'),
      type: cleanType,
      title: title || defaultTitle
    });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 5500);
  };

  // Form & Wizard Tabs State
  const [formTab, setFormTab] = useState('general'); // 'general' | 'client' | 'budget' | 'specs'

  // Comprehensive Backend Project Schema Form State
  const initialFormState = {
    name: '',
    code: '',
    description: '',
    priority: 'MEDIUM',
    status: 'NOT_STARTED',
    projectCategoryId: '',
    projectTypeId: '',
    clientName: '',
    contactPerson: '',
    email: '',
    phone: '',
    clientGst: '',
    address: '',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '',
    country: 'India',
    plannedStartDate: new Date().toISOString().slice(0, 10),
    plannedEndDate: '',
    budgetRupees: '',
    areaValue: '',
    areaUnit: 'SQFT',
    tags: '',
    managerId: '',
    applyDefaultStagesOnInit: false
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});

  // Dynamic Category Resolver (Checks master lookups, populated object, or saved description notes)
  const resolveCategory = (proj) => {
    if (!proj) return null;
    const catId = proj.projectCategoryId || proj.category?._id || proj.category?.id || (typeof proj.category === 'string' ? proj.category : null);
    if (catId && categoryOptions.length > 0) {
      const match = categoryOptions.find((c) => c.value === catId || c.id === catId || c._id === catId || c.name?.toLowerCase() === String(catId).toLowerCase());
      if (match) return match.label || match.name;
    }
    if (proj.categoryName) return proj.categoryName;
    if (proj.category?.name) return proj.category.name;
    if (typeof proj.category === 'string' && proj.category.length < 24) return proj.category;
    if (proj.description && proj.description.includes('Category:')) {
      const match = proj.description.match(/Category:\s*([^|]+)/i);
      if (match && match[1]?.trim()) return match[1].trim();
    }
    return null;
  };

  // Dynamic Typology Resolver (Checks master lookups, populated object, or saved description notes)
  const resolveTypology = (proj) => {
    if (!proj) return null;
    const typeId = proj.projectTypeId || proj.type?._id || proj.type?.id || (typeof proj.type === 'string' ? proj.type : null);
    if (typeId && typeOptions.length > 0) {
      const match = typeOptions.find((t) => t.value === typeId || t.id === typeId || t._id === typeId || t.name?.toLowerCase() === String(typeId).toLowerCase());
      if (match) return match.label || match.name;
    }
    if (proj.typeName) return proj.typeName;
    if (proj.type?.name) return proj.type.name;
    if (typeof proj.type === 'string' && proj.type.length < 24) return proj.type;
    if (proj.description && proj.description.includes('Typology:')) {
      const match = proj.description.match(/Typology:\s*([^|]+)/i);
      if (match && match[1]?.trim()) return match[1].trim();
    }
    return null;
  };

  // Dynamic Project Manager Name Resolver
  const resolveManager = (proj) => {
    if (!proj) return 'Unassigned';
    if (proj.manager?.name) return proj.manager.name;
    const mId = proj.managerId || proj.manager?._id || proj.manager?.id;
    if (mId && usersDirectory.length > 0) {
      const found = usersDirectory.find((u) => (u._id || u.id) === mId);
      if (found) return found.name;
    }
    if (Array.isArray(proj.members)) {
      const mgr = proj.members.find((m) => m.role === 'MANAGER');
      if (mgr?.name) return mgr.name;
      if (mgr?.userId && usersDirectory.length > 0) {
        const found = usersDirectory.find((u) => (u._id || u.id) === mgr.userId);
        if (found) return found.name;
      }
    }
    return 'Unassigned';
  };

  // 1. Fetch Projects Flow (GET /projects)
  const loadProjects = async (page = 1) => {
    setLoading(true);
    try {
      const res = await projectService.getProjects({
        page,
        limit: 10,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined
      });
      if (res && res.data) {
        setProjects(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }

        // Background project details enrichment:
        // If backend GET /projects list query omitted budget, area, or typology fields,
        // fetch single project records in parallel for current page items to display 100% accurate dynamic details
        const needsEnrichment = res.data.some(
          (p) => p && (!p.area || !p.projectTypeId || extractBudgetRupees(p) === 0) && (p._id || p.id)
        );

        if (needsEnrichment) {
          Promise.allSettled(
            res.data.map((p) => {
              const id = p._id || p.id;
              return id ? projectService.getProjectById(id) : Promise.reject();
            })
          ).then((results) => {
            const enrichedMap = new Map();
            results.forEach((r) => {
              if (r.status === 'fulfilled' && r.value) {
                const fullProj = r.value;
                const id = fullProj._id || fullProj.id;
                if (id) enrichedMap.set(id, fullProj);
              }
            });

            if (enrichedMap.size > 0) {
              setProjects((prevProjects) =>
                prevProjects.map((p) => {
                  const id = p._id || p.id;
                  const full = enrichedMap.get(id);
                  if (!full) return p;
                  return {
                    ...p,
                    ...full,
                    budgetPaise: full.budgetPaise ?? p.budgetPaise,
                    area: full.area || p.area,
                    projectCategoryId: full.projectCategoryId || p.projectCategoryId,
                    projectTypeId: full.projectTypeId || p.projectTypeId,
                    client: full.client || p.client,
                    site: full.site || p.site,
                    description: full.description || p.description,
                    tags: full.tags || p.tags
                  };
                })
              );
            }
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Project Summary Flow (GET /projects/summary)
  const loadSummary = async () => {
    try {
      const summaryData = await projectService.getProjectSummary();
      if (summaryData) setSummary(summaryData);
    } catch (err) {
      console.warn('Summary fetch notice:', err?.message);
    }
  };

  // 3. Fetch Trash Count Flow (GET /projects/trash)
  const loadTrashCount = async () => {
    try {
      const list = await projectService.getTrashedProjects();
      if (Array.isArray(list)) setTrashCount(list.length);
    } catch (err) {
      console.warn('Trash count fetch notice:', err?.message);
    }
  };

  // 4. Initial Master Lookups Flow
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const loadLookups = async () => {
      try {
        const [cats, types, dir] = await Promise.allSettled([
          masterService.getItemsByType('PROJECT_CATEGORY'),
          masterService.getItemsByType('PROJECT_TYPE'),
          teamService.getDirectory()
        ]);

        if (cats.status === 'fulfilled' && Array.isArray(cats.value)) {
          setCategoryOptions(
            cats.value.map((c) => ({
              value: c._id || c.id || c.name,
              label: c.name || c.code,
              name: c.name,
              id: c._id || c.id,
              code: c.code
            }))
          );
        }

        if (types.status === 'fulfilled' && Array.isArray(types.value)) {
          setTypeOptions(
            types.value.map((t) => ({
              value: t._id || t.id || t.name,
              label: t.name || t.code,
              name: t.name,
              id: t._id || t.id,
              code: t.code
            }))
          );
        }

        if (dir.status === 'fulfilled' && Array.isArray(dir.value)) {
          setUsersDirectory(dir.value);
        } else {
          setUsersDirectory([]);
        }
      } catch (err) {
        console.warn('Master lookup load notice:', err?.message);
      }
    };

    loadLookups();
    loadSummary();
    loadTrashCount();

    const handleEntityCreated = (e) => {
      if (!e.detail?.type || e.detail.type === 'project' || e.detail.type === 'log') {
        loadProjects(1);
        loadSummary();
      }
    };
    window.addEventListener('mm:entity-created', handleEntityCreated);
    return () => {
      window.removeEventListener('mm:entity-created', handleEntityCreated);
    };
  }, [authLoading, isAuthenticated]);

  // Trigger search / filters reload
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const timer = setTimeout(() => {
      loadProjects(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [authLoading, isAuthenticated, searchTerm, statusFilter, priorityFilter, categoryFilter]);

  // View Modal Flow: GET /projects/:id + GET /projects/:id/stages + GET /projects/:id/members
  const handleOpenViewModal = async (project) => {
    const projId = project._id || project.id;
    setViewModalProject(project);
    setManualProgressInput(project.progress?.percent || 0);
    setModalTab('overview');
    setStagesLoading(true);

    try {
      const [freshRes, stagesRes, membersRes] = await Promise.allSettled([
        projectService.getProjectById(projId),
        projectService.getProjectStages(projId),
        projectService.getProjectMembers(projId)
      ]);

      if (freshRes.status === 'fulfilled' && freshRes.value) {
        const full = freshRes.value;
        setViewModalProject(full);
        setManualProgressInput(full.progress?.percent || 0);
      }

      if (stagesRes.status === 'fulfilled' && Array.isArray(stagesRes.value)) {
        setStages(stagesRes.value);
      }

      if (membersRes.status === 'fulfilled' && Array.isArray(membersRes.value)) {
        setViewModalProject((prev) =>
          prev ? { ...prev, members: membersRes.value, memberCount: membersRes.value.length } : prev
        );
      }
    } catch (err) {
      console.warn('View modal data load notice:', err);
    } finally {
      setStagesLoading(false);
    }
  };

  // Row selection
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProjects(projects.map((p) => p._id || p.id));
    } else {
      setSelectedProjects([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedProjects.includes(id)) {
      setSelectedProjects(selectedProjects.filter((item) => item !== id));
    } else {
      setSelectedProjects([...selectedProjects, id]);
    }
  };

  // Handle Create or Edit Submit Flow
  const handleSaveProject = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const errors = {};
    if (!formData.name?.trim()) {
      errors.name = 'Project name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Project name must be at least 2 characters';
    }
    if (!formData.clientName?.trim()) {
      errors.clientName = 'Client name is required';
    }
    if (formData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid client email';
    }
    if (formData.phone?.trim()) {
      const cleanPhone = formData.phone.trim().replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        errors.phone = 'Phone number must be exactly 10 digits';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Please fill all required fields correctly', 'error', 'Validation Notice');
      return;
    }
    setFormErrors({});

    // Exact backend CreateProjectInput schema conformance (Zod strict validator)
    const payload = {
      name: formData.name.trim(),
      priority: formData.priority || 'MEDIUM'
    };

    // Client object (Recognized keys: name, phone, email)
    const clientData = {
      name: formData.clientName?.trim() || 'Private Client'
    };
    if (formData.phone?.trim()) {
      const cleanPhone = formData.phone.trim().replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        clientData.phone = `+91${cleanPhone}`;
      } else if (/^\+?[1-9]\d{9,14}$/.test(formData.phone.trim())) {
        clientData.phone = formData.phone.trim();
      }
    }
    if (formData.email?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      clientData.email = formData.email.trim();
    }
    payload.client = clientData;

    // Site location object (Recognized keys: city, state, pincode)
    const siteData = {
      city: formData.city?.trim() || 'Ahmedabad',
      state: formData.state?.trim() || 'Gujarat'
    };
    if (formData.pincode?.trim() && /^\d{6}$/.test(formData.pincode.trim())) {
      siteData.pincode = formData.pincode.trim();
    }
    payload.site = siteData;

    // Budget: budgetPaise (integer in Paise >= 0)
    if (formData.budgetRupees) {
      const cleanBudget = String(formData.budgetRupees).replace(/[^0-9.]/g, '');
      if (cleanBudget && !isNaN(cleanBudget) && Number(cleanBudget) > 0) {
        payload.budgetPaise = Math.round(Number(cleanBudget) * 100);
      }
    }

    // Built-up Area: Backend expects { value: number, unit: "SQFT" | "SQM" }
    if (formData.areaValue && !isNaN(formData.areaValue) && Number(formData.areaValue) > 0) {
      const rawUnit = (formData.areaUnit || 'SQFT').toUpperCase();
      const cleanUnit = rawUnit.includes('M') ? 'SQM' : 'SQFT';
      payload.area = {
        value: Number(formData.areaValue),
        unit: cleanUnit
      };
    }

    // Combine Description, Contact Person, Site Address, Handover, and Category/Typology
    const notes = [];
    if (formData.description?.trim()) {
      notes.push(formData.description.trim());
    }
    if (formData.contactPerson?.trim()) {
      notes.push(`Contact: ${formData.contactPerson.trim()}`);
    }
    if (formData.address?.trim()) {
      notes.push(`Site Address: ${formData.address.trim()}`);
    }
    if (formData.plannedEndDate) {
      notes.push(`Target Handover: ${formData.plannedEndDate}`);
    }
    const selectedCat = categoryOptions.find((c) => c.value === formData.projectCategoryId || c.id === formData.projectCategoryId);
    if (selectedCat) {
      notes.push(`Category: ${selectedCat.label || selectedCat.name}`);
    }
    const selectedType = typeOptions.find((t) => t.value === formData.projectTypeId || t.id === formData.projectTypeId);
    if (selectedType) {
      notes.push(`Typology: ${selectedType.label || selectedType.name}`);
    }
    if (notes.length > 0) {
      payload.description = notes.join(' | ').slice(0, 2000);
    }

    // Category & Typology (Only send if valid 24-character hex ObjectId)
    const isObjectId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val.trim());
    if (isObjectId(formData.projectCategoryId)) {
      payload.projectCategoryId = formData.projectCategoryId.trim();
    }
    if (isObjectId(formData.projectTypeId)) {
      payload.projectTypeId = formData.projectTypeId.trim();
    }

    // Tags array (max 20 items, max 30 chars each)
    if (formData.tags) {
      const tagList = formData.tags
        .split(',')
        .map((t) => t.trim().slice(0, 30))
        .filter(Boolean);
      if (tagList.length > 0) {
        payload.tags = tagList.slice(0, 20);
      }
    }

    // Default drawing stages auto-population: only apply when explicitly requested
    if (formData.applyDefaultStagesOnInit === true) {
      payload.applyDefaultStages = true;
    }

    try {
      if (editModalProject) {
        const projId = editModalProject._id || editModalProject.id;
        const updated = await projectService.updateProject(projId, {
          ...payload,
          expectedVersion: editModalProject.version
        });

        showToast(`Project "${updated?.name || 'Record'}" updated successfully!`, 'success', 'Changes Saved');
        setEditModalProject(null);
      } else {
        const created = await projectService.createProject(payload);
        const codeDisplay = created?.projectCode || created?.code || created?.name || 'New Project';

        // Assign Project Manager if selected
        if (formData.managerId && isObjectId(formData.managerId) && (created?._id || created?.id)) {
          try {
            await projectService.addProjectMember(created._id || created.id, {
              userId: formData.managerId.trim(),
              role: 'MANAGER'
            });
          } catch (mErr) {
            // 409 conflict is expected if backend auto-assigned manager during project creation
            if (mErr?.response?.status !== 409) {
              console.warn('Manager assignment note:', mErr?.message);
            }
          }
        }

        // If user selected non-default status on create, transition it smoothly
        if (formData.status && formData.status !== 'NOT_STARTED' && (created?._id || created?.id)) {
          try {
            await projectService.updateProjectStatus(created._id || created.id, {
              status: formData.status,
              reason: 'Initial status selected during project creation'
            });
          } catch {
            // Status transitions in backend may require specific lifecycle stages
          }
        }

        showToast(`Project created: ${codeDisplay}`, 'success', 'Project Created');
        setCreateModalOpen(false);
      }

      setFormData(initialFormState);
      setFormTab('general');
      loadProjects(pagination.page);
      loadSummary();
    } catch (err) {
      console.warn('[Project Save Notice]:', err.response?.data || err);

      // Extract field-level errors to turn invalid inputs red
      const serverDetails = err.response?.data?.error?.details || err.response?.data?.details;
      const fieldErrors = {};
      if (Array.isArray(serverDetails)) {
        serverDetails.forEach((d) => {
          const field = (typeof d === 'string' ? d : d.field || d.path || '').toLowerCase();
          const rawMsg = typeof d === 'string' ? d : d.message;
          const msg = rawMsg?.replace(/^"?[^"]+"?\s+/, '') || rawMsg || 'Invalid value';
          if (field.includes('name') && !field.includes('client')) fieldErrors.name = msg;
          else if (field.includes('client')) fieldErrors.clientName = msg;
          else if (field.includes('phone')) fieldErrors.phone = msg;
          else if (field.includes('email')) fieldErrors.email = msg;
          else if (field.includes('address')) fieldErrors.address = msg;
          else if (field.includes('city')) fieldErrors.city = msg;
          else if (field.includes('budget')) fieldErrors.budgetRupees = msg;
          else if (field.includes('area')) fieldErrors.areaValue = msg;
        });
      } else if (serverDetails && typeof serverDetails === 'object') {
        Object.entries(serverDetails).forEach(([k, v]) => {
          const field = k.toLowerCase();
          const rawMsg = typeof v === 'string' ? v : v.message;
          const msg = rawMsg?.replace(/^"?[^"]+"?\s+/, '') || rawMsg || 'Invalid value';
          if (field.includes('name') && !field.includes('client')) fieldErrors.name = msg;
          else if (field.includes('client')) fieldErrors.clientName = msg;
          else if (field.includes('phone')) fieldErrors.phone = msg;
          else if (field.includes('email')) fieldErrors.email = msg;
          else if (field.includes('address')) fieldErrors.address = msg;
          else if (field.includes('city')) fieldErrors.city = msg;
          else fieldErrors[k] = msg;
        });
      }

      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(fieldErrors);
      }

      const errorMsg = extractErrorMessage(err, 'Failed to save project record');
      showToast(errorMsg, 'error', 'Validation Notice');
    }
  };

  // Open Edit Modal with fresh data flow (GET /projects/:id)
  const handleOpenEdit = async (project) => {
    const projId = project._id || project.id;
    let proj = project;
    try {
      const fresh = await projectService.getProjectById(projId);
      if (fresh) proj = fresh;
    } catch (e) {
      // Handled
    }

    const rawUnit = (proj.area?.unit || 'SQFT').toUpperCase();
    const cleanUnit = rawUnit.includes('M') ? 'SQM' : 'SQFT';
    const initRupees = extractBudgetRupees(proj);
    const catVal = proj.projectCategoryId || categoryOptions.find((c) => c.name?.toLowerCase() === resolveCategory(proj)?.toLowerCase())?.value || '';
    const typeVal = proj.projectTypeId || typeOptions.find((t) => t.name?.toLowerCase() === resolveTypology(proj)?.toLowerCase())?.value || '';

    setEditModalProject(proj);
    setFormTab('general');
    setFormData({
      name: proj.name || '',
      code: proj.code || proj.projectCode || '',
      description: proj.description || '',
      priority: proj.priority || 'MEDIUM',
      status: proj.status || 'NOT_STARTED',
      projectCategoryId: catVal,
      projectTypeId: typeVal,
      clientName: proj.client?.name || '',
      contactPerson: proj.client?.contactPerson || extractContact(proj) || '',
      email: proj.client?.email || '',
      phone: proj.client?.phone || '',
      clientGst: proj.client?.gstNumber || '',
      address: proj.site?.address || extractSiteAddress(proj) || '',
      city: proj.site?.city || 'Ahmedabad',
      state: proj.site?.state || 'Gujarat',
      pincode: proj.site?.pincode || '',
      country: proj.site?.country || 'India',
      plannedStartDate: proj.plannedStartDate ? proj.plannedStartDate.slice(0, 10) : '',
      plannedEndDate: proj.plannedEndDate ? proj.plannedEndDate.slice(0, 10) : extractTargetDateRaw(proj),
      budgetRupees: initRupees > 0 ? String(initRupees) : '',
      areaValue: proj.area?.value ? String(proj.area.value) : (proj.area?.builtUp ? String(proj.area.builtUp) : ''),
      areaUnit: cleanUnit,
      tags: (proj.tags || []).join(', '),
      managerId: proj.managerId || '',
      applyDefaultStagesOnInit: false
    });
  };

  // Soft Delete Flow (DELETE /projects/:id)
  const handleDeleteProject = async (id, name) => {
    const ok = await confirm({
      title: 'Move Project to Trash?',
      message: `Move project "${name}" to Trash? (Will be retained for 30 days before purge)`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await projectService.deleteProject(id);
      showToast(`Project moved to 30-day trash retention.`, 'success', 'Project Archived');
      loadProjects(pagination.page);
      loadSummary();
      loadTrashCount();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Delete failed'), 'error');
    }
  };

  // Restore Flow (POST /projects/:id/restore)
  const handleRestoreProject = async (id) => {
    try {
      await projectService.restoreProject(id);
      showToast(`Project restored successfully!`);
      const updatedTrash = await projectService.getTrashedProjects();
      setTrashedProjects(updatedTrash);
      setTrashCount(updatedTrash.length);
      loadProjects(pagination.page);
      loadSummary();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Restore failed'));
    }
  };

  // Open Trash Modal Flow (GET /projects/trash)
  const handleOpenTrash = async () => {
    try {
      const list = await projectService.getTrashedProjects();
      setTrashedProjects(list);
      setTrashCount(list.length);
      setTrashModalOpen(true);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to open trash bin'));
    }
  };

  // Duplicate Project Flow (POST /projects/:id/duplicate)
  const handleDuplicateProject = async (project) => {
    try {
      const duplicated = await projectService.duplicateProject(project._id || project.id, {
        name: `${project.name || 'Project'} (Copy)`,
        includeMembers: true
      });
      const codeStr = duplicated?.projectCode || duplicated?.code || 'PROJECT';
      const nameStr = duplicated?.name || '';
      showToast(`Duplicated: ${codeStr} - ${nameStr}`, 'success', 'Project Duplicated');
      loadProjects(1);
      loadSummary();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Duplicate project failed'), 'error');
    }
  };

  // Archive / Unarchive Flow
  const handleToggleArchive = async (project) => {
    const projId = project._id || project.id;
    try {
      if (project.isArchived) {
        await projectService.unarchiveProject(projId);
        showToast('Project unarchived.');
      } else {
        await projectService.archiveProject(projId);
        showToast('Project moved to archive.');
      }
      loadProjects(pagination.page);
      loadSummary();
      if (viewModalProject) setViewModalProject(null);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Archive operation failed'));
    }
  };

  // Status Change Flow (POST /projects/:id/status)
  const handleStatusTransition = async (e) => {
    e.preventDefault();
    if (!statusModalProject) return;

    if ((targetStatus === 'ON_HOLD' || targetStatus === 'CANCELLED') && !statusReason.trim()) {
      showToast(`Reason is mandatory when transitioning to ${targetStatus}`);
      return;
    }

    try {
      const updated = await projectService.updateProjectStatus(
        statusModalProject._id || statusModalProject.id,
        {
          status: targetStatus,
          reason: statusReason.trim(),
          confirmOpenStages
        }
      );
      showToast(`Status updated to ${targetStatus}`);
      setStatusModalProject(null);
      setStatusReason('');
      setConfirmOpenStages(false);
      loadProjects(pagination.page);
      loadSummary();
      if (viewModalProject && (viewModalProject._id === updated._id || viewModalProject.id === updated.id)) {
        setViewModalProject(updated);
      }
    } catch (err) {
      if (err?.response?.data?.error?.code === 'OPEN_STAGES_REMAIN') {
        setConfirmOpenStages(true);
      }
      showToast(extractErrorMessage(err, 'Status transition failed'));
    }
  };

  // Export CSV Flow (GET /projects/export)
  const handleExportCsv = async () => {
    try {
      showToast('Generating sanitized UTF-8 CSV export...');
      const blob = await projectService.exportProjectsCsv({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Projects_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('CSV downloaded successfully.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Export failed'));
    }
  };

  // Progress Mode Update Flow (PUT /projects/:id/progress)
  const handleToggleProgressMode = async (mode, val) => {
    if (!viewModalProject) return;
    const projId = viewModalProject._id || viewModalProject.id;
    try {
      const updatedProg = await projectService.updateProjectProgress(projId, {
        mode,
        manualPercent: val !== undefined ? Number(val) : manualProgressInput
      });
      setViewModalProject((prev) => prev ? { ...prev, progress: updatedProg } : prev);
      showToast(`Progress calculation set to ${mode}`);
      loadProjects(pagination.page);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Progress mode update failed'));
    }
  };

  // Stages Operations Flow (POST, PATCH, DELETE)
  const handleApplyDefaultStages = async () => {
    if (!viewModalProject) return;
    const projId = viewModalProject._id || viewModalProject.id;
    try {
      const updated = await projectService.applyDefaultStages(projId);
      setStages(updated);
      showToast('Default Drawing Stages applied in sequential order.');
      // Refresh project to get updated auto progress
      const fresh = await projectService.getProjectById(projId);
      if (fresh) setViewModalProject(fresh);
      loadProjects(pagination.page);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to apply default stages'));
    }
  };

  const handleAddStage = async (e) => {
    e.preventDefault();
    if (!newStageName.trim() || !viewModalProject) return;
    const projId = viewModalProject._id || viewModalProject.id;

    try {
      const created = await projectService.addProjectStage(projId, {
        name: newStageName.trim(),
        code: newStageCode.trim() || `STAGE_${stages.length + 1}`
      });
      setStages([...stages, created]);
      setNewStageName('');
      setNewStageCode('');
      showToast('Stage added.');
      const fresh = await projectService.getProjectById(projId);
      if (fresh) setViewModalProject(fresh);
      loadProjects(pagination.page);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to add stage'));
    }
  };

  const handleUpdateStageStatus = async (stageId, newStatus) => {
    if (!viewModalProject) return;
    const projId = viewModalProject._id || viewModalProject.id;
    try {
      await projectService.updateProjectStage(projId, stageId, { status: newStatus });
      const [freshStages, freshProj] = await Promise.all([
        projectService.getProjectStages(projId),
        projectService.getProjectById(projId)
      ]);
      setStages(freshStages);
      if (freshProj) setViewModalProject(freshProj);
      loadProjects(pagination.page);
      showToast(`Stage marked ${newStatus}`);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Stage update failed'));
    }
  };

  const handleDeleteStage = async (stageId) => {
    if (!viewModalProject) return;
    const ok = await confirm({
      title: 'Remove Drawing Stage?',
      message: 'Are you sure you want to remove this unstarted drawing milestone stage?',
      confirmText: 'Remove Stage',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    const projId = viewModalProject._id || viewModalProject.id;
    try {
      await projectService.deleteProjectStage(projId, stageId);
      setStages(stages.filter((s) => (s._id || s.id) !== stageId));
      const freshProj = await projectService.getProjectById(projId);
      if (freshProj) setViewModalProject(freshProj);
      loadProjects(pagination.page);
      showToast('Stage removed', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Cannot delete stage'), 'error');
    }
  };

  // Team Operations Flow (POST, DELETE)
  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    if (!selectedUserToAdd || !viewModalProject) return;
    const projId = viewModalProject._id || viewModalProject.id;

    const userObj = usersDirectory.find((u) => (u._id || u.id) === selectedUserToAdd);
    try {
      const updatedMembers = await projectService.addProjectMember(projId, {
        userId: selectedUserToAdd,
        role: selectedRoleToAdd,
        name: userObj?.name || 'Team Member',
        email: userObj?.email || ''
      });
      setViewModalProject({
        ...viewModalProject,
        members: updatedMembers,
        memberCount: updatedMembers.length
      });
      setSelectedUserToAdd('');
      showToast(selectedRoleToAdd === 'MANAGER' ? 'Manager assigned (previous demoted to LEAD)' : 'Member added');
      loadProjects(pagination.page);
    } catch (err) {
      if (err?.response?.status === 409) {
        showToast('This team member is already assigned to this project.', 'warning');
      } else {
        showToast(extractErrorMessage(err, 'Add member failed'), 'error');
      }
    }
  };

  const handleRemoveTeamMember = async (userId) => {
    if (!viewModalProject) return;
    const ok = await confirm({
      title: 'Remove Team Member?',
      message: 'Are you sure you want to remove this member from the project team?',
      confirmText: 'Remove Member',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    const projId = viewModalProject._id || viewModalProject.id;
    try {
      const updatedMembers = await projectService.removeProjectMember(projId, userId);
      setViewModalProject({
        ...viewModalProject,
        members: updatedMembers,
        memberCount: updatedMembers.length
      });
      showToast('Member removed from project team', 'success');
      loadProjects(pagination.page);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Remove member failed'), 'error');
    }
  };

  return (
    <div className="projects-page-container">
      {/* Top Prominent Luxury Notification (User requested: Top, not bottom, professional architectural design) */}
      {toast && (
        <div className={`m17-top-toast-notification ${toast.type || 'info'}`} role="alert">
          <div className="top-toast-icon">
            {toast.type === 'error' && <AlertTriangle size={20} />}
            {toast.type === 'success' && <CheckCircle2 size={20} />}
            {toast.type !== 'error' && toast.type !== 'success' && <Sparkles size={20} />}
          </div>
          <div className="top-toast-content">
            {toast.title && <div className="top-toast-title">{toast.title}</div>}
            <div className="top-toast-message">{toast.message}</div>
          </div>
          <button
            type="button"
            className="top-toast-close"
            onClick={() => setToast(null)}
            title="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* 1. Page Header & KPI Summary Cards */}
      <div className="projects-title-row">
        <div className="projects-header-left">
          <h1 className="projects-heading">Architectural Projects</h1>
          <p className="projects-subheading">Studio commissions, drawing stages, client accounts, and delivery timelines.</p>
        </div>
        <div className="projects-title-actions">
          <button
            type="button"
            className="btn-secondary-pill"
            onClick={handleOpenTrash}
            title="View deleted projects"
          >
            <Trash2 size={15} />
            <span>Trash Bin</span>
            {trashCount > 0 && <span className="btn-badge-counter">{trashCount}</span>}
          </button>
          <button
            type="button"
            className="btn-secondary-pill"
            onClick={handleExportCsv}
            title="Export projects to CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="btn-primary-pill"
            onClick={() => {
              setEditModalProject(null);
              setFormData(initialFormState);
              setFormTab('general');
              setCreateModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Bar matching Sidebar Dropdown (List | Visit Log | Photos) */}
      <div className="projects-subnav-bar">
        <button
          type="button"
          className={`subnav-pill-btn ${currentView === 'list' ? 'active' : ''}`}
          onClick={() => setSearchParams({ view: 'list' })}
        >
          <FolderKanban size={15} />
          <span>Projects List</span>
        </button>
        <button
          type="button"
          className={`subnav-pill-btn ${currentView === 'visit-logs' ? 'active' : ''}`}
          onClick={() => setSearchParams({ view: 'visit-logs' })}
        >
          <ClipboardList size={15} />
          <span>Site Visit Logs ({siteLogs.length})</span>
        </button>
        <button
          type="button"
          className={`subnav-pill-btn ${currentView === 'photos' ? 'active' : ''}`}
          onClick={() => setSearchParams({ view: 'photos' })}
        >
          <Camera size={15} />
          <span>Site Photos Gallery ({projectPhotos.length})</span>
        </button>
      </div>

      {/* VIEW 1: PROJECTS LIST VIEW */}
      {currentView === 'list' && (
        <>
          {/* Summary Facet Cards */}
          <div className="m17-summary-grid">
        <div
          className={`m17-summary-card ${statusFilter === 'IN_PROGRESS' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'all' : 'IN_PROGRESS')}
        >
          <div className="summary-card-top">
            <span className="summary-circle-icon icon-in-progress">
              <Clock size={15} />
            </span>
            <span className="summary-title-text">Active Projects</span>
          </div>
          <div className="summary-card-main">
            <span className={`summary-card-val ${!summary.byStatus?.IN_PROGRESS ? 'val-zero' : ''}`}>
              {summary.byStatus?.IN_PROGRESS || 0}
            </span>
            <span className="summary-card-sub">In progress</span>
          </div>
        </div>

        <div
          className={`m17-summary-card ${statusFilter === 'COMPLETED' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'all' : 'COMPLETED')}
        >
          <div className="summary-card-top">
            <span className="summary-circle-icon icon-completed">
              <CheckCircle2 size={15} />
            </span>
            <span className="summary-title-text">Completed Delivery</span>
          </div>
          <div className="summary-card-main">
            <span className={`summary-card-val ${!summary.byStatus?.COMPLETED ? 'val-zero' : ''}`}>
              {summary.byStatus?.COMPLETED || 0}
            </span>
            <span className="summary-card-sub">Handed over</span>
          </div>
        </div>

        <div
          className={`m17-summary-card ${statusFilter === 'ON_HOLD' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'ON_HOLD' ? 'all' : 'ON_HOLD')}
        >
          <div className="summary-card-top">
            <span className="summary-circle-icon icon-on-hold">
              <PauseCircle size={15} />
            </span>
            <span className="summary-title-text">On Hold & Review</span>
          </div>
          <div className="summary-card-main">
            <span className={`summary-card-val ${!summary.byStatus?.ON_HOLD ? 'val-zero' : ''}`}>
              {summary.byStatus?.ON_HOLD || 0}
            </span>
            <span className="summary-card-sub">Under review</span>
          </div>
        </div>

        <div className="m17-summary-card">
          <div className="summary-card-top">
            <span className="summary-circle-icon icon-overdue">
              <AlertTriangle size={15} />
            </span>
            <span className="summary-title-text">Overdue Milestones</span>
          </div>
          <div className="summary-card-main">
            <span className={`summary-card-val ${!summary.overdue ? 'val-zero' : ''}`}>
              {summary.overdue || 0}
            </span>
            {summary.overdue === 0 ? (
              <span className="pill-all-clear">ALL CLEAR</span>
            ) : (
              <span className="pill-attention">NEEDS ACTION</span>
            )}
          </div>
        </div>

        <div
          className={`m17-summary-card ${statusFilter === 'all' ? 'active-filter' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="summary-card-top">
            <span className="summary-circle-icon icon-portfolio">
              <Building size={15} />
            </span>
            <span className="summary-title-text">Total Portfolio</span>
          </div>
          <div className="summary-card-main">
            <span className="summary-card-val">
              {summary.total || projects.length}
            </span>
            <span className="summary-card-sub">Total records</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="projects-filter-bar">
        <div className="filter-left-controls">
          <button
            type="button"
            className={`filter-funnel-btn ${showFilters ? 'active' : ''}`}
            title="Toggle advanced filters"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Filter"
          >
            <Filter size={16} strokeWidth={1.8} />
            <span>Filters</span>
          </button>

          <div className="projects-search-pill">
            <Search size={15} className="search-pill-icon" />
            <input
              type="text"
              placeholder="Search by code, title, client, city, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="projects-search-input"
            />
          </div>
        </div>

        {/* Quick status pills */}
        <div className="filter-right-controls">
          <div className="status-quick-pills">
            {[
              { id: 'all', label: 'All', count: summary.total || projects.length },
              { id: 'IN_PROGRESS', label: 'In Progress', count: summary.byStatus?.IN_PROGRESS || 0 },
              { id: 'NOT_STARTED', label: 'Not Started', count: summary.byStatus?.NOT_STARTED || 0 },
              { id: 'ON_HOLD', label: 'On Hold', count: summary.byStatus?.ON_HOLD || 0 },
              { id: 'COMPLETED', label: 'Completed', count: summary.byStatus?.COMPLETED || 0 }
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                className={`quick-pill ${statusFilter === st.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(st.id)}
              >
                <span>{st.label}</span>
                <span className="pill-count">{st.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expandable Advanced Filter Drawer */}
      {showFilters && (
        <div className="filter-expanded-drawer">
          <div className="filter-drawer-group">
            <span className="filter-label">Priority:</span>
            {['all', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((pr) => (
              <button
                key={pr}
                type="button"
                className={`filter-chip ${priorityFilter === pr ? 'active' : ''}`}
                onClick={() => setPriorityFilter(pr)}
              >
                {pr === 'all' ? 'All Priorities' : pr}
              </button>
            ))}
          </div>

          <div className="filter-drawer-group">
            <span className="filter-label">Category:</span>
            <button
              type="button"
              className={`filter-chip ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              All Categories
            </button>
            {categoryOptions.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={`filter-chip ${categoryFilter === cat.value ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Meta / Count & Pagination Bar */}
      <div className="projects-meta-bar">
        <div className="record-counts">
          <span>Total Records: <strong className="count-highlight">{pagination.total || projects.length}</strong></span>
          <span className="meta-separator">•</span>
          <span>Showing: <strong className="count-highlight">{projects.length}</strong></span>
          {selectedProjects.length > 0 && (
            <>
              <span className="meta-separator">•</span>
              <span className="selected-count-badge">{selectedProjects.length} selected</span>
            </>
          )}
        </div>

        <div className="projects-pagination">
          <span className="page-indicator">Page {pagination.page} of {pagination.pages || 1}</span>
          <div className="pagination-arrows">
            <button
              type="button"
              className="page-nav-arrow"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadProjects(pagination.page - 1)}
              aria-label="Previous Page"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              className="page-nav-arrow"
              disabled={pagination.page >= (pagination.pages || 1) || loading}
              onClick={() => loadProjects(pagination.page + 1)}
              aria-label="Next Page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Data Table */}
      <div className="projects-table-wrapper">
        <table className="projects-data-table">
          <thead>
            <tr>
              <th className="th-check">
                <input
                  type="checkbox"
                  className="table-checkbox"
                  checked={projects.length > 0 && selectedProjects.length === projects.length}
                  onChange={handleSelectAll}
                  aria-label="Select all projects"
                />
              </th>
              <th>Project</th>
              <th>Client</th>
              <th>Typology</th>
              <th>Budget (INR)</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Manager</th>
              <th className="th-action">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="m17-loading-cell">
                  <div className="m17-table-loader">
                    <div className="m17-spinner" />
                    <span>Loading project records...</span>
                  </div>
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={10} className="no-data-cell">
                  <div className="no-data-container">
                    <Building size={44} color="var(--color-text-muted)" strokeWidth={1.2} />
                    <h3 className="no-data-title">No Projects Found</h3>
                    <p className="no-data-sub">No projects matched your active filters or search terms.</p>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Plus}
                      onClick={() => {
                        setEditModalProject(null);
                        setFormData(initialFormState);
                        setCreateModalOpen(true);
                      }}
                    >
                      Create First Project
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              projects.map((proj) => {
                const projId = proj._id || proj.id;
                const progressPct = proj.progress?.percent || 0;
                const managerName = resolveManager(proj);
                const managerInitial = managerName !== 'Unassigned' ? managerName.charAt(0).toUpperCase() : '?';

                const catDisplay = resolveCategory(proj);
                const typeDisplay = resolveTypology(proj);
                const areaDisplay = extractArea(proj);
                const contactPerson = extractContact(proj);
                const siteAddress = extractSiteAddress(proj);
                const targetDate = extractTargetDate(proj);

                const locationParts = [siteAddress, proj.site?.city, proj.site?.state].filter(Boolean);
                const locationDisplay = locationParts.length > 0 ? locationParts.join(', ') : (proj.site?.city || 'Location N/A');
                const contactParts = [contactPerson, proj.client?.phone].filter(Boolean);
                const contactDisplay = contactParts.length > 0 ? contactParts.join(' • ') : (proj.client?.email || null);

                return (
                  <tr key={projId} className="project-data-row">
                    <td className="td-check">
                      <input
                        type="checkbox"
                        className="table-checkbox"
                        checked={selectedProjects.includes(projId)}
                        onChange={() => handleSelectRow(projId)}
                        aria-label={`Select ${proj.name}`}
                      />
                    </td>
                    <td
                      className="td-title-cell"
                      onClick={() => handleOpenViewModal(proj)}
                      title={`${proj.name} (${proj.projectCode || proj.code || 'PRJ'})`}
                    >
                      <strong className="proj-name-link">{proj.name}</strong>
                    </td>
                    <td title={locationDisplay ? `${proj.client?.name || 'Client'} • ${locationDisplay}` : (proj.client?.name || 'Client')}>
                      <span className="client-name">{proj.client?.name || 'Private Client'}</span>
                    </td>
                    <td title={areaDisplay ? `${catDisplay || typeDisplay || 'Architectural'} • ${areaDisplay}` : ''}>
                      <span className="m17-cat-pill">{catDisplay || typeDisplay || 'Architectural'}</span>
                    </td>
                    <td>
                      <span className="budget-cell-val">{formatBudget(proj) || '—'}</span>
                    </td>
                    <td>
                      <Badge variant={getPriorityBadgeVariant(proj.priority)}>
                        {proj.priority || 'MEDIUM'}
                      </Badge>
                    </td>
                    <td title={targetDate ? `Target Handover: ${targetDate}` : ''}>
                      <Badge variant={getStatusBadgeVariant(proj.status)}>
                        {proj.status ? proj.status.replace('_', ' ') : 'NOT STARTED'}
                      </Badge>
                    </td>
                    <td>
                      <div className="progress-cell-wrapper">
                        <div className="progress-bar-bg">
                          <div
                            className={`progress-bar-fill ${progressPct === 100 ? 'done' : ''}`}
                            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                          />
                        </div>
                        <span className="progress-text-label">{progressPct}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="manager-cell" title={proj.manager?.email || ''}>
                        <span className="manager-avatar">{managerInitial}</span>
                        <span className="manager-name">{managerName}</span>
                      </div>
                    </td>
                    <td className="td-action">
                      <div className="row-action-btns">
                        <button
                          type="button"
                          className="row-btn"
                          title="View project dashboard"
                          onClick={() => handleOpenViewModal(proj)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="row-btn"
                          title="Change status"
                          onClick={() => {
                            setStatusModalProject(proj);
                            setTargetStatus(proj.status || 'IN_PROGRESS');
                          }}
                        >
                          <ShieldCheck size={15} />
                        </button>
                        <button
                          type="button"
                          className="row-btn"
                          title="Edit project metadata"
                          onClick={() => handleOpenEdit(proj)}
                        >
                          <Edit size={15} />
                        </button>
                        <Dropdown
                          align="right"
                          trigger={
                            <button type="button" className="row-btn" title="More actions">
                              <MoreVertical size={15} />
                            </button>
                          }
                        >
                          <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => handleDuplicateProject(proj)}
                          >
                            <Copy size={15} className="dropdown-item-icon" />
                            <span>Duplicate Structure</span>
                          </button>
                          <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => handleToggleArchive(proj)}
                          >
                            <Archive size={15} className="dropdown-item-icon" />
                            <span>{proj.isArchived ? 'Unarchive' : 'Archive Project'}</span>
                          </button>
                          <div className="dropdown-divider" />
                          <button
                            type="button"
                            className="dropdown-item text-danger"
                            onClick={() => handleDeleteProject(projId, proj.name)}
                          >
                            <Trash2 size={15} className="dropdown-item-icon" />
                            <span>Move to Trash (30d)</span>
                          </button>
                        </Dropdown>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )}

      {/* VIEW 2: SITE VISIT LOGS */}
      {currentView === 'visit-logs' && (() => {
        const filteredSiteLogs = siteLogs.filter((log) => {
          if (logFilterProject === 'ALL') return true;
          return (log.project || '').toLowerCase().includes(logFilterProject.toLowerCase());
        });

        const totalLogs = filteredSiteLogs.length;
        const totalPages = Math.max(1, Math.ceil(totalLogs / LOGS_PER_PAGE));
        const safePage = Math.min(logPage, totalPages);
        const startIndex = (safePage - 1) * LOGS_PER_PAGE;
        const paginatedLogs = filteredSiteLogs.slice(startIndex, startIndex + LOGS_PER_PAGE);

        const totalSiteLabor = filteredSiteLogs.reduce((sum, l) => sum + (Number(l.laborCount) || 0), 0);
        const totalSiteHours = filteredSiteLogs.reduce((sum, l) => sum + (Number(l.hoursWorked) || 0), 0);

        const projectFilterOptions = [
          { value: 'ALL', label: `All Projects (${siteLogs.length} logs)` },
          ...projects.map((p) => ({ value: p.name, label: p.name }))
        ];

        return (
          <div className="site-visit-logs-view">
            {/* Minimalist Studio Toolbar */}
            <div className="view-toolbar-row">
              <div className="view-toolbar-left">
                <span className="view-toolbar-label">Filter by Project:</span>
                <Select
                  value={logFilterProject}
                  onChange={(e) => {
                    setLogFilterProject(e.target.value);
                    setLogPage(1);
                  }}
                  options={projectFilterOptions}
                  className="view-project-select-theme"
                />
              </div>

              <div className="view-toolbar-right">
                <span className="subview-stats-pill">
                  <strong>{totalLogs}</strong> Site Visits &nbsp;•&nbsp; <strong>{totalSiteLabor}</strong> Active Laborers &nbsp;•&nbsp; <strong>{totalSiteHours}h</strong> On-Site
                </span>
                <button
                  type="button"
                  className="btn-primary-pill"
                  onClick={() => {
                    setNewLogForm({
                      project: projects[0]?.name || 'Courtyard Villa Residence',
                      engineer: usersDirectory[0]?.name || 'Mayur Mehta (Principal Architect)',
                      weather: 'Sunny (32°C)',
                      laborCount: 16,
                      hoursWorked: 8,
                      summary: '',
                      tradeBreakdown: 'Civil, Masons & Structural'
                    });
                    setIsLogModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Record Site Visit Log</span>
                </button>
              </div>
            </div>

            {/* Simple, Professional Architectural Site Logs Table Listing */}
            <div className="subview-table-wrapper">
              <table className="subview-data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Architect / Engineer</th>
                    <th>Site Observation / Inspection</th>
                    <th>Active Trades</th>
                    <th>Weather</th>
                    <th>Labor</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSiteLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="no-data-cell">
                        <div className="empty-subview-card">
                          <ClipboardList size={36} className="empty-subview-icon" />
                          <h4>No Site Visit Logs Recorded</h4>
                          <p>Record site visit observations, labor count, weather, and contractor progress logs for projects.</p>
                          <button
                            type="button"
                            className="btn-primary-pill"
                            onClick={() => setIsLogModalOpen(true)}
                          >
                            <Plus size={15} /> Record First Visit Log
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => (
                      <tr key={log.id} className="subview-data-row">
                        <td className="log-td-date">
                          <span className="log-date-text">
                            {log.date ? new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                          </span>
                        </td>
                        <td className="log-td-project">
                          <strong className="log-project-title" title={log.project}>{log.project}</strong>
                        </td>
                        <td className="log-td-engineer">
                          <div className="log-engineer-inline">
                            <User size={13} className="log-inline-icon" />
                            <span>{log.engineer}</span>
                          </div>
                        </td>
                        <td className="log-td-summary" title={log.summary}>
                          <span className="log-summary-line">{log.summary || 'Routine architectural site progress and reinforcement checking completed.'}</span>
                        </td>
                        <td className="log-td-trade">
                          <span className="log-trade-tag">{log.tradeBreakdown || 'General Civil'}</span>
                        </td>
                        <td className="log-td-weather">
                          <div className="log-weather-inline">
                            <Sun size={13} className="log-inline-icon" />
                            <span>{log.weather}</span>
                          </div>
                        </td>
                        <td className="log-td-labor">
                          <span className="log-labor-pill">
                            <HardHat size={12} className="log-inline-icon" />
                            <span>{log.laborCount != null ? log.laborCount : 0}</span>
                          </span>
                        </td>
                        <td className="log-td-hours">
                          <span className="log-hours-text">{log.hoursWorked || 8}h</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Elegant Studio Pagination Bar */}
            {totalPages > 1 && (
              <div className="subview-pagination-bar">
                <div className="pagination-info">
                  Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + LOGS_PER_PAGE, totalLogs)}</strong> of <strong>{totalLogs}</strong> site visit logs
                </div>

                <div className="pagination-controls">
                  <button
                    type="button"
                    className="subview-page-btn arrow"
                    disabled={safePage <= 1}
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={15} />
                    <span>Previous</span>
                  </button>

                  <div className="page-numbers-group">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        className={`subview-page-num ${safePage === pageNum ? 'active' : ''}`}
                        onClick={() => setLogPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="subview-page-btn arrow"
                    disabled={safePage >= totalPages}
                    onClick={() => setLogPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next Page"
                  >
                    <span>Next</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* VIEW 3: SITE PHOTOS GALLERY */}
      {currentView === 'photos' && (
        <div className="site-photos-gallery-view">
          <div className="view-toolbar-row">
            <div className="view-toolbar-left">
              <span className="view-toolbar-label">Filter by Project:</span>
              <Select
                value={photoFilterProject}
                onChange={(e) => setPhotoFilterProject(e.target.value)}
                options={[
                  { value: 'ALL', label: `All Projects (${projectPhotos.length} photos)` },
                  ...projects.map((p) => ({ value: p.name, label: p.name }))
                ]}
                className="view-project-select-theme"
              />
            </div>
            <button
              type="button"
              className="btn-primary-pill"
              onClick={() => {
                setNewPhotoForm({
                  project: projects[0]?.name || 'Aarohi Villa Residence',
                  title: '',
                  category: 'Site Progress',
                  imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
                });
                setPhotoModalOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Upload Site Photo</span>
            </button>
          </div>

          <div className="photos-gallery-grid">
            {projectPhotos.filter((photo) => {
              if (photoFilterProject === 'ALL') return true;
              return (photo.project || '').toLowerCase().includes(photoFilterProject.toLowerCase());
            }).map((photo) => (
              <div
                key={photo.id}
                className="site-photo-card"
                onClick={() => setPreviewPhoto(photo)}
              >
                <div className="photo-image-wrap">
                  <img src={photo.imageUrl} alt={photo.title} className="site-photo-img" />
                  <span className="photo-category-pill">{photo.category}</span>
                </div>
                <div className="photo-card-info">
                  <span className="photo-project-name">{photo.project}</span>
                  <h4 className="photo-title">{photo.title}</h4>
                  <div className="photo-footer-meta">
                    <span className="photo-date">{photo.date}</span>
                    <span className="photo-author">{photo.photographer}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Site Visit Log Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Record Site Visit Log"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const newEntry = {
              id: `log_${Date.now()}`,
              project: newLogForm.project || projects[0]?.name || 'Courtyard Villa Residence',
              engineer: newLogForm.engineer || usersDirectory[0]?.name || 'Mayur Mehta (Principal Architect)',
              weather: newLogForm.weather || 'Sunny (32°C)',
              laborCount: Number(newLogForm.laborCount) || 16,
              hoursWorked: Number(newLogForm.hoursWorked) || 8,
              summary: newLogForm.summary || 'Routine architectural site progress and reinforcement checking completed.',
              tradeBreakdown: newLogForm.tradeBreakdown || 'Civil & Masons',
              date: new Date().toISOString()
            };
            await logService.createLog(newEntry);
            setSiteLogs((prev) => [newEntry, ...prev.filter((l) => l.id !== newEntry.id)]);
            setIsLogModalOpen(false);
            showToast('Site visit log recorded successfully', 'success');
          }}
          className="subview-modal-form"
        >
          <div className="form-group">
            <Select
              label="Select Project *"
              id="new-log-project"
              value={newLogForm.project}
              onChange={(e) => setNewLogForm((prev) => ({ ...prev, project: e.target.value }))}
              options={projects.length > 0 ? projects.map((p) => ({ value: p.name, label: p.name })) : [
                { value: 'Courtyard Villa Residence', label: 'Courtyard Villa Residence' }
              ]}
              required
            />
          </div>

          <div className="form-row-2">
            <Input
              label="Site Engineer / Architect *"
              value={newLogForm.engineer}
              onChange={(e) => setNewLogForm({ ...newLogForm, engineer: e.target.value })}
              required
            />
            <Input
              label="Weather Conditions *"
              value={newLogForm.weather}
              onChange={(e) => setNewLogForm({ ...newLogForm, weather: e.target.value })}
              required
            />
          </div>

          <div className="form-row-2">
            <Input
              label="Labor Count on Site *"
              type="number"
              value={newLogForm.laborCount}
              onChange={(e) => setNewLogForm({ ...newLogForm, laborCount: e.target.value })}
              required
            />
            <Input
              label="Hours Worked *"
              type="number"
              value={newLogForm.hoursWorked}
              onChange={(e) => setNewLogForm({ ...newLogForm, hoursWorked: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Active Contractors & Trades *</label>
            <Input
              value={newLogForm.tradeBreakdown}
              onChange={(e) => setNewLogForm({ ...newLogForm, tradeBreakdown: e.target.value })}
              placeholder="e.g. Masons, Shuttering Carpenters, Plumbers"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Observations, Snags & Quality Notes *</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={newLogForm.summary}
              onChange={(e) => setNewLogForm({ ...newLogForm, summary: e.target.value })}
              placeholder="Describe work completed, quality checks passed, or issues noted on site..."
              required
            />
          </div>

          <div className="modal-actions-row">
            <Button variant="secondary" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={Plus}>
              Save Visit Log
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upload Site Photo Modal */}
      <Modal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        title="Upload Site Progress Photo"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const newPhoto = {
              id: `photo_${Date.now()}`,
              project: newPhotoForm.project || projects[0]?.name || 'Project Site',
              title: newPhotoForm.title || 'Site Progress Photo',
              category: newPhotoForm.category || 'Site Progress',
              date: new Date().toISOString().slice(0, 10),
              imageUrl: newPhotoForm.imageUrl,
              photographer: 'Lead Architect / Engineer'
            };
            setProjectPhotos([newPhoto, ...projectPhotos]);
            setPhotoModalOpen(false);
            showToast('Site photo uploaded to gallery', 'success');
          }}
          className="subview-modal-form"
        >
          <div className="form-group">
            <label className="form-label">Project *</label>
            <select
              value={newPhotoForm.project}
              onChange={(e) => setNewPhotoForm({ ...newPhotoForm, project: e.target.value })}
              className="form-select"
              required
            >
              {projects.map((p) => (
                <option key={p._id || p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Photo Title / Description *"
            value={newPhotoForm.title}
            onChange={(e) => setNewPhotoForm({ ...newPhotoForm, title: e.target.value })}
            placeholder="e.g. 1st Floor Slab Casting in Progress"
            required
          />

          <div className="form-row-2">
            <Input
              label="Stage / Category *"
              value={newPhotoForm.category}
              onChange={(e) => setNewPhotoForm({ ...newPhotoForm, category: e.target.value })}
              placeholder="e.g. Foundation, Structural, Facade"
              required
            />
            <Input
              label="Image URL *"
              value={newPhotoForm.imageUrl}
              onChange={(e) => setNewPhotoForm({ ...newPhotoForm, imageUrl: e.target.value })}
              placeholder="https://..."
              required
            />
          </div>

          <div className="modal-actions-row">
            <Button variant="secondary" onClick={() => setPhotoModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={Camera}>
              Add to Gallery
            </Button>
          </div>
        </form>
      </Modal>

      {/* Photo Lightbox Preview Modal */}
      {previewPhoto && (
        <Modal
          isOpen={Boolean(previewPhoto)}
          onClose={() => setPreviewPhoto(null)}
          title={`${previewPhoto.title} (${previewPhoto.project})`}
          maxWidth="740px"
        >
          <div className="photo-lightbox-body">
            <img src={previewPhoto.imageUrl} alt={previewPhoto.title} className="lightbox-img" />
            <div className="lightbox-meta">
              <div>
                <strong>Project:</strong> {previewPhoto.project} • <strong>Category:</strong> {previewPhoto.category}
              </div>
              <div style={{ color: '#7B6F62', fontSize: '12px' }}>
                Captured on {previewPhoto.date} by {previewPhoto.photographer}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <Button variant="secondary" onClick={() => setPreviewPhoto(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Project Dashboard View / Management Modal */}
      {viewModalProject && (
        <Modal
          isOpen={Boolean(viewModalProject)}
          onClose={() => setViewModalProject(null)}
          title={`Project Record: ${viewModalProject.projectCode}`}
          maxWidth="940px"
        >
          <div className="project-detail-modal-body">
            {/* Architectural Hero Card */}
            <div className="project-detail-hero">
              <div className="detail-hero-left">
                <div className="hero-badge-row">
                  <span className="hero-code-pill">
                    <Building size={12} />
                    {viewModalProject.projectCode}
                  </span>
                  <Badge variant={getStatusBadgeVariant(viewModalProject.status)}>
                    {viewModalProject.status ? viewModalProject.status.replace('_', ' ') : 'NOT STARTED'}
                  </Badge>
                  <Badge variant={getPriorityBadgeVariant(viewModalProject.priority)}>
                    {viewModalProject.priority || 'MEDIUM'} PRIORITY
                  </Badge>
                </div>
                <h3 className="hero-project-name">{viewModalProject.name}</h3>
                <div className="hero-meta-row">
                  <span className="hero-meta-item">
                    <User size={13} className="hero-meta-icon" />
                    <strong>{viewModalProject.client?.name || 'Private Client'}</strong>
                  </span>
                  <span className="hero-meta-divider">•</span>
                  <span className="hero-meta-item">
                    <MapPin size={13} className="hero-meta-icon" />
                    <span>{viewModalProject.site?.city || 'Location N/A'}</span>
                  </span>
                  <span className="hero-meta-divider">•</span>
                  <span className="hero-meta-item">
                    <Layers size={13} className="hero-meta-icon" />
                    <span>{viewModalProject.area?.value ? `${viewModalProject.area.value} ${viewModalProject.area?.unit || 'sq.ft'}` : 'Scale N/A'}</span>
                  </span>
                </div>
              </div>

              {/* Client Portal Link */}
              <div className="detail-portal-card">
                <div className="portal-header-row">
                  <span className="portal-code-label">CLIENT PORTAL ACCESS</span>
                  <span className="portal-chip-secure">External</span>
                </div>
                <div className="portal-action-group">
                  <div className="portal-code-preview" title="Public Portal Identifier">
                    <code>{viewModalProject.projectCode}</code>
                  </div>
                  <button
                    type="button"
                    className={`copy-portal-btn ${linkCopied ? 'copied' : ''}`}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/portal/${viewModalProject.projectCode}`);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2500);
                    }}
                  >
                    {linkCopied ? <Check size={13} color="#2E6945" /> : <Copy size={13} />}
                    <span>{linkCopied ? 'Link Copied' : 'Copy Link'}</span>
                  </button>
                </div>
                <span className="portal-note-sub">Zero-seat secured link for clients & consultants.</span>
              </div>
            </div>

            {/* Modal Segmented Tabs */}
            <div className="project-modal-tabs-wrapper">
              <div className="project-modal-tabs">
                <button
                  type="button"
                  className={`pmodal-tab ${modalTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setModalTab('overview')}
                >
                  <FileText size={14} />
                  <span>Overview & Specs</span>
                </button>
                <button
                  type="button"
                  className={`pmodal-tab ${modalTab === 'stages' ? 'active' : ''}`}
                  onClick={() => setModalTab('stages')}
                >
                  <Layers size={14} />
                  <span>Stages & Progress</span>
                  <span className="pmodal-count-pill">{stages.length}</span>
                </button>
                <button
                  type="button"
                  className={`pmodal-tab ${modalTab === 'team' ? 'active' : ''}`}
                  onClick={() => setModalTab('team')}
                >
                  <Users size={14} />
                  <span>Team Members</span>
                  <span className="pmodal-count-pill">{viewModalProject.members?.length || 1}</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Overview */}
            {modalTab === 'overview' && (
              <div className="pmodal-tab-content">
                {/* 3 Cohesive Architectural Specification Cards */}
                <div className="pmodal-specs-sections">
                  {/* Group 1: Project Identity & Scale */}
                  <div className="pmodal-spec-group">
                    <div className="spec-group-header">
                      <Building size={14} />
                      <span>Project Identity & Typology</span>
                    </div>
                    <div className="spec-group-body">
                      <div className="spec-item">
                        <span className="spec-label">Project Code</span>
                        <span className="spec-value-code">{viewModalProject.projectCode}</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Typology / Category</span>
                        <span className="spec-value">
                          {[resolveCategory(viewModalProject), resolveTypology(viewModalProject)].filter(Boolean).join(' • ') || 'Architectural Design'}
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Built-Up Area</span>
                        <span className="spec-value">{extractArea(viewModalProject) || 'Not Specified'}</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Estimated Budget</span>
                        <span className="spec-value-budget">{formatBudget(viewModalProject) || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Group 2: Client & Site Location */}
                  <div className="pmodal-spec-group">
                    <div className="spec-group-header">
                      <MapPin size={14} />
                      <span>Client & Site Location</span>
                    </div>
                    <div className="spec-group-body">
                      <div className="spec-item">
                        <span className="spec-label">Client Name</span>
                        <span className="spec-value">{viewModalProject.client?.name || 'Private Client'}</span>
                        {(viewModalProject.client?.contactPerson || extractContact(viewModalProject)) && (
                          <span className="spec-sub">Attn: {viewModalProject.client?.contactPerson || extractContact(viewModalProject)}</span>
                        )}
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Client Contact</span>
                        <span className="spec-value">{viewModalProject.client?.phone || 'No phone'}</span>
                        {viewModalProject.client?.email && (
                          <span className="spec-sub">{viewModalProject.client.email}</span>
                        )}
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Site Location</span>
                        <span className="spec-value">{viewModalProject.site?.city || 'City N/A'}</span>
                        <span className="spec-sub">{[viewModalProject.site?.state, viewModalProject.site?.pincode].filter(Boolean).join(' - ') || 'India'}</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Site Address</span>
                        <span className="spec-value">{viewModalProject.site?.address || extractSiteAddress(viewModalProject) || viewModalProject.site?.city || 'On file'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Group 3: Timeline & Supervision */}
                  <div className="pmodal-spec-group">
                    <div className="spec-group-header">
                      <Calendar size={14} />
                      <span>Timeline & Supervision</span>
                    </div>
                    <div className="spec-group-body">
                      <div className="spec-item">
                        <span className="spec-label">Planned Timeline</span>
                        <span className="spec-value">
                          {extractTargetDate(viewModalProject) ? `Target: ${extractTargetDate(viewModalProject)}` : 'Timeline TBD'}
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Actual Status</span>
                        <span className="spec-value">
                          {viewModalProject.status ? viewModalProject.status.replace('_', ' ') : 'Not started'}
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Assigned Project Manager</span>
                        <span className="spec-value">
                          {resolveManager(viewModalProject)}
                        </span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Drawing Stage Progress</span>
                        <span className="spec-value">
                          {stages.length > 0 ? `${stages.filter((s) => s.status === 'DONE').length} of ${stages.length} milestones complete` : 'No stages configured'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scope & Architectural Brief Card */}
                {viewModalProject.description && (
                  <div className="pmodal-brief-card">
                    <div className="pmodal-brief-header">
                      <FileText size={14} />
                      <span>Project Scope & Architectural Brief</span>
                    </div>
                    <p className="pmodal-brief-text">{viewModalProject.description}</p>
                  </div>
                )}

                {/* Tags Row */}
                {viewModalProject.tags && viewModalProject.tags.length > 0 && (
                  <div className="pmodal-tags-section">
                    <span className="pmodal-tags-label"><Tag size={12} /> Project Tags:</span>
                    <div className="pmodal-tags-list">
                      {viewModalProject.tags.map((t, idx) => (
                        <span key={idx} className="pmodal-tag-chip">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Stages & Progress */}
            {modalTab === 'stages' && (
              <div className="pmodal-tab-content">
                <div className="stages-header-banner">
                  <div>
                    <h4>Project Drawing & Execution Stages</h4>
                    <p>Track drawing package milestones, approval stages, and overall completion progress.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Sparkles}
                      onClick={handleApplyDefaultStages}
                    >
                      Apply Standard Stages
                    </Button>
                  </div>
                </div>

                {/* Progress bar gauge + Auto/Manual Mode Controls */}
                <div className="m17-stage-progress-card">
                  <div className="stage-progress-label-row">
                    <span>Overall Project Progress:</span>
                    <strong>{viewModalProject.progress?.percent || 0}% ({stages.filter((s) => s.status === 'DONE').length} of {stages.length} done)</strong>
                  </div>
                  <div className="stage-progress-track">
                    <div
                      className="stage-progress-indicator"
                      style={{ width: `${Math.min(100, Math.max(0, viewModalProject.progress?.percent || 0))}%` }}
                    />
                  </div>

                  {/* Mode switcher & slider */}
                  <div className="progress-mode-bar">
                    <div className="mode-toggle-group">
                      <button
                        type="button"
                        className={`mode-btn ${(viewModalProject.progress?.mode || 'AUTO') === 'AUTO' ? 'active' : ''}`}
                        onClick={() => handleToggleProgressMode('AUTO')}
                      >
                        Automatic Progress
                      </button>
                      <button
                        type="button"
                        className={`mode-btn ${viewModalProject.progress?.mode === 'MANUAL' ? 'active' : ''}`}
                        onClick={() => handleToggleProgressMode('MANUAL', manualProgressInput)}
                      >
                        Manual Override
                      </button>
                    </div>

                    {viewModalProject.progress?.mode === 'MANUAL' && (
                      <div className="manual-progress-slider-box">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={manualProgressInput}
                          onChange={(e) => setManualProgressInput(Number(e.target.value))}
                          onMouseUp={() => handleToggleProgressMode('MANUAL', manualProgressInput)}
                          onTouchEnd={() => handleToggleProgressMode('MANUAL', manualProgressInput)}
                        />
                        <span className="manual-val-label">{manualProgressInput}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stages List */}
                <div className="m17-stages-list">
                  {stagesLoading ? (
                    <div className="pmodal-loading">Loading stages...</div>
                  ) : stages.length === 0 ? (
                    <div className="no-stages-box">
                      <p>No drawing stages configured yet for this project.</p>
                      <Button size="sm" variant="primary" onClick={handleApplyDefaultStages}>
                        Populate Default Architectural Stages
                      </Button>
                    </div>
                  ) : (
                    stages.map((stg, idx) => (
                      <div key={stg._id || stg.id} className="m17-stage-item">
                        <div className="stage-order-num">{idx + 1}</div>
                        <div className="stage-details">
                          <strong>{stg.name}</strong>
                          <span className="stage-code-text">{stg.code}</span>
                        </div>
                        <div className="stage-status-actions">
                          <select
                            className={`stage-status-select status-${(stg.status || 'NOT_STARTED').toLowerCase()}`}
                            value={stg.status || 'NOT_STARTED'}
                            onChange={(e) => handleUpdateStageStatus(stg._id || stg.id, e.target.value)}
                          >
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                            <option value="SKIPPED">Skipped</option>
                          </select>
                          {stg.status === 'NOT_STARTED' && (
                            <button
                              type="button"
                              className="stage-del-btn"
                              title="Delete stage (allowed for NOT_STARTED)"
                              onClick={() => handleDeleteStage(stg._id || stg.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Custom Stage Form */}
                <form onSubmit={handleAddStage} className="add-stage-inline-form">
                  <Input
                    placeholder="New Stage Name (e.g. Tile Layout & Conduit Sheets)"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    className="stage-input-field"
                  />
                  <Input
                    placeholder="Code (e.g. DWG-TILE)"
                    value={newStageCode}
                    onChange={(e) => setNewStageCode(e.target.value)}
                    style={{ maxWidth: 140 }}
                  />
                  <Button size="sm" variant="primary" type="submit" icon={Plus}>
                    Add Stage
                  </Button>
                </form>
              </div>
            )}

            {/* Tab 3: Project Team Members */}
            {modalTab === 'team' && (
              <div className="pmodal-tab-content">
                <div className="team-header-banner">
                  <div>
                    <h4>Project Team & Access Permissions</h4>
                    <p>Assign studio architects, interior leads, and designated project team roles.</p>
                  </div>
                </div>

                {/* Members list */}
                <div className="m17-team-list">
                  {(viewModalProject.members || []).map((mem) => (
                    <div key={mem.userId || mem._id} className="team-member-row">
                      <div className="member-avatar-box">
                        {(mem.name || 'User').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="member-info">
                        <strong>{mem.name || 'Team Member'}</strong>
                        <span className="member-email">{mem.email || 'Company User'}</span>
                      </div>
                      <div className="member-role-badge">
                        <Badge variant={mem.role === 'MANAGER' ? 'primary' : mem.role === 'LEAD' ? 'warning' : 'neutral'}>
                          {mem.role}
                        </Badge>
                      </div>
                      <div className="member-actions">
                        {mem.role !== 'MANAGER' && (
                          <button
                            type="button"
                            className="member-remove-btn"
                            title="Remove from project"
                            onClick={() => handleRemoveTeamMember(mem.userId || mem._id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Team Member */}
                <form onSubmit={handleAddTeamMember} className="add-member-form">
                  <select
                    className="m17-select-input"
                    value={selectedUserToAdd}
                    onChange={(e) => setSelectedUserToAdd(e.target.value)}
                    required
                  >
                    <option value="">Select Company User to Add...</option>
                    {usersDirectory.map((u) => (
                      <option key={u._id || u.id} value={u._id || u.id}>
                        {u.name} ({u.designation || u.email})
                      </option>
                    ))}
                  </select>

                  <select
                    className="m17-select-input"
                    style={{ maxWidth: 150 }}
                    value={selectedRoleToAdd}
                    onChange={(e) => setSelectedRoleToAdd(e.target.value)}
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="LEAD">LEAD</option>
                    <option value="VIEWER">VIEWER</option>
                    <option value="MANAGER">MANAGER (Reassign)</option>
                  </select>

                  <Button size="sm" variant="primary" type="submit" icon={Plus}>
                    Assign to Project
                  </Button>
                </form>
              </div>
            )}

            <div className="pmodal-footer">
              <Button variant="secondary" onClick={() => setViewModalProject(null)}>
                Close Record
              </Button>
              <Button
                variant="primary"
                icon={Edit}
                onClick={() => {
                  const proj = viewModalProject;
                  setViewModalProject(null);
                  handleOpenEdit(proj);
                }}
              >
                Edit Project
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Simple & Elegant Architectural Project Modal */}
      <ProjectModal
        isOpen={createModalOpen || Boolean(editModalProject)}
        onClose={() => {
          setCreateModalOpen(false);
          setEditModalProject(null);
        }}
        projectToEdit={editModalProject}
        onSaved={() => {
          loadProjects(1);
          loadSummary();
        }}
      />

      {/* 7. Status Machine Modal (Module M1.7 Requirement) */}
      {statusModalProject && (
        <Modal
          isOpen={Boolean(statusModalProject)}
          onClose={() => setStatusModalProject(null)}
          title={`Transition Status: ${statusModalProject.projectCode}`}
          maxWidth="520px"
        >
          <form onSubmit={handleStatusTransition} className="status-modal-form">
            <div className="status-current-box">
              <span>Current Status:</span>
              <Badge variant={getStatusBadgeVariant(statusModalProject.status)}>
                {statusModalProject.status || 'NOT_STARTED'}
              </Badge>
            </div>

            <div>
              <label className="m17-field-label">Target Status</label>
              <select
                className="m17-select-input"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
              >
                <option value="NOT_STARTED">NOT_STARTED</option>
                <option value="IN_PROGRESS">IN_PROGRESS (Sets actualStartDate)</option>
                <option value="ON_HOLD">ON_HOLD (Requires reason)</option>
                <option value="COMPLETED">COMPLETED (Sets actualEndDate)</option>
                <option value="CANCELLED">CANCELLED (Requires reason)</option>
              </select>
            </div>

            {(targetStatus === 'ON_HOLD' || targetStatus === 'CANCELLED') && (
              <div>
                <label className="m17-field-label">Mandatory Reason *</label>
                <textarea
                  className="m17-textarea-input"
                  rows={2}
                  required
                  placeholder="Explain why this project is being paused or cancelled..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                />
              </div>
            )}

            {targetStatus === 'COMPLETED' && (
              <div className="completion-guard-box">
                <input
                  type="checkbox"
                  id="confirm-open-stages"
                  checked={confirmOpenStages}
                  onChange={(e) => setConfirmOpenStages(e.target.checked)}
                />
                <label htmlFor="confirm-open-stages">
                  Confirm open stages override (Bypasses HTTP 409 OPEN_STAGES_REMAIN guard)
                </label>
              </div>
            )}

            <div className="form-action-row">
              <Button variant="secondary" type="button" onClick={() => setStatusModalProject(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Execute Transition
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 8. Trash Bin Modal */}
      {trashModalOpen && (
        <Modal
          isOpen={trashModalOpen}
          onClose={() => setTrashModalOpen(false)}
          title="Trash Bin — Deleted Projects"
          maxWidth="700px"
        >
          <div className="trash-modal-content">
            <div className="trash-banner-info">
              <AlertTriangle size={18} color="#C4841D" />
              <span>
                Deleted projects are safely retained here for 30 days before permanent deletion. You can restore any project at any time.
              </span>
            </div>

            {trashedProjects.length === 0 ? (
              <div className="no-trash-box">
                <CheckCircle2 size={32} color="#5E7A6B" />
                <p>Trash bin is empty. No projects scheduled for purge.</p>
              </div>
            ) : (
              <div className="trashed-items-list">
                {trashedProjects.map((p) => (
                  <div key={p._id || p.id} className="trashed-item-row">
                    <div className="trashed-info">
                      <strong>{p.name}</strong>
                      <span className="trashed-meta">
                        Code: {p.projectCode} • Deleted on: {new Date(p.deletedAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="trashed-days-badge">
                      <span className="days-left-count">{p.daysLeft ?? 30} days</span>
                      <span className="days-sub">left until purge</span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={RotateCcw}
                      onClick={() => handleRestoreProject(p._id || p.id)}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="pmodal-footer">
              <Button variant="secondary" onClick={() => setTrashModalOpen(false)}>
                Close Bin
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ProjectsPage;
