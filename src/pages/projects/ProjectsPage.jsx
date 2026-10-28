import React, { useState, useEffect } from 'react';
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
  Sliders
} from 'lucide-react';
import { projectService } from '../../services/projectService';
import { masterService } from '../../services/masterService';
import { teamService } from '../../services/teamService';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Dropdown } from '../../components/common/Dropdown/Dropdown';
import './ProjectsPage.css';

// Helper to format Paise into clean Indian Rupee string
const formatBudget = (paise) => {
  if (!paise || isNaN(paise)) return '₹0';
  const rupees = paise / 100;
  if (rupees >= 10000000) {
    return `₹${(rupees / 10000000).toFixed(2)} Cr`;
  }
  if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(2)} L`;
  }
  return `₹${rupees.toLocaleString('en-IN')}`;
};

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

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

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

  // Feedback states
  const [linkCopied, setLinkCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Form State
  const initialFormState = {
    name: '',
    description: '',
    priority: 'MEDIUM',
    projectCategoryId: '',
    projectTypeId: '',
    clientName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '',
    plannedStartDate: new Date().toISOString().slice(0, 10),
    plannedEndDate: '',
    budgetRupees: '',
    areaValue: '',
    areaUnit: 'sq.ft',
    tags: '',
    managerId: ''
  };

  const [formData, setFormData] = useState(initialFormState);

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
              name: c.name
            }))
          );
        }

        if (types.status === 'fulfilled' && Array.isArray(types.value)) {
          setTypeOptions(
            types.value.map((t) => ({
              value: t._id || t.id || t.name,
              label: t.name || t.code,
              name: t.name
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
    loadProjects(1);
    loadSummary();
    loadTrashCount();
  }, []);

  // Trigger search / filters reload
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProjects(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, priorityFilter, categoryFilter]);

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
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Project name is required');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description,
      priority: formData.priority,
      projectCategoryId: formData.projectCategoryId || undefined,
      projectTypeId: formData.projectTypeId || undefined,
      categoryName: categoryOptions.find((c) => c.value === formData.projectCategoryId)?.label || 'Residential Villa',
      typeName: typeOptions.find((t) => t.value === formData.projectTypeId)?.label || 'Architecture',
      client: {
        name: formData.clientName || 'Private Client',
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone
      },
      site: {
        address: formData.address,
        city: formData.city || 'Ahmedabad',
        state: formData.state || 'Gujarat',
        pincode: formData.pincode
      },
      plannedStartDate: formData.plannedStartDate ? new Date(formData.plannedStartDate).toISOString() : undefined,
      plannedEndDate: formData.plannedEndDate ? new Date(formData.plannedEndDate).toISOString() : undefined,
      budgetPaise: formData.budgetRupees ? Math.round(Number(formData.budgetRupees) * 100) : 0,
      area: {
        value: Number(formData.areaValue) || 0,
        unit: formData.areaUnit || 'sq.ft'
      },
      tags: formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      managerId: formData.managerId || (usersDirectory[0]?._id || usersDirectory[0]?.id),
      managerName: usersDirectory.find((u) => (u._id || u.id) === formData.managerId)?.name || 'Ar. Mayur Mehta'
    };

    try {
      if (editModalProject) {
        const projId = editModalProject._id || editModalProject.id;
        const updated = await projectService.updateProject(projId, {
          ...payload,
          expectedVersion: editModalProject.version
        });
        showToast(`Project "${updated.name || 'Record'}" updated successfully!`);
        setEditModalProject(null);
      } else {
        const created = await projectService.createProject(payload);
        showToast(`Project created with code: ${created.projectCode}`);
        setCreateModalOpen(false);
      }

      setFormData(initialFormState);
      loadProjects(pagination.page);
      loadSummary();
    } catch (err) {
      showToast(`Error: ${err?.message || 'Operation failed'}`);
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

    setEditModalProject(proj);
    setFormData({
      name: proj.name || '',
      description: proj.description || '',
      priority: proj.priority || 'MEDIUM',
      projectCategoryId: proj.projectCategoryId || '',
      projectTypeId: proj.projectTypeId || '',
      clientName: proj.client?.name || '',
      contactPerson: proj.client?.contactPerson || '',
      email: proj.client?.email || '',
      phone: proj.client?.phone || '',
      address: proj.site?.address || '',
      city: proj.site?.city || 'Ahmedabad',
      state: proj.site?.state || 'Gujarat',
      pincode: proj.site?.pincode || '',
      plannedStartDate: proj.plannedStartDate ? proj.plannedStartDate.slice(0, 10) : '',
      plannedEndDate: proj.plannedEndDate ? proj.plannedEndDate.slice(0, 10) : '',
      budgetRupees: proj.budgetPaise ? String(proj.budgetPaise / 100) : '',
      areaValue: proj.area?.value ? String(proj.area.value) : '',
      areaUnit: proj.area?.unit || 'sq.ft',
      tags: (proj.tags || []).join(', '),
      managerId: proj.managerId || ''
    });
  };

  // Soft Delete Flow (DELETE /projects/:id)
  const handleDeleteProject = async (id, name) => {
    if (!window.confirm(`Move project "${name}" to Trash? (Will be retained for 30 days before purge)`)) {
      return;
    }
    try {
      await projectService.deleteProject(id);
      showToast(`Project moved to 30-day trash retention.`);
      loadProjects(pagination.page);
      loadSummary();
      loadTrashCount();
    } catch (err) {
      showToast(`Delete failed: ${err?.message}`);
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
      showToast(`Restore failed: ${err?.message}`);
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
      showToast('Failed to open trash bin');
    }
  };

  // Duplicate Project Flow (POST /projects/:id/duplicate)
  const handleDuplicateProject = async (project) => {
    try {
      const duplicated = await projectService.duplicateProject(project._id || project.id);
      showToast(`Duplicated: ${duplicated.projectCode} - ${duplicated.name}`);
      loadProjects(1);
      loadSummary();
    } catch (err) {
      showToast(`Duplicate failed: ${err?.message}`);
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
      showToast(`Archive error: ${err?.message}`);
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
      showToast(`Status transition error: ${err?.message}`);
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
      showToast('Export failed.');
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
      showToast('Progress mode update failed');
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
      showToast('Failed to apply default stages');
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
      showToast('Failed to add stage');
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
      showToast('Stage update failed');
    }
  };

  const handleDeleteStage = async (stageId) => {
    if (!viewModalProject) return;
    const projId = viewModalProject._id || viewModalProject.id;
    try {
      await projectService.deleteProjectStage(projId, stageId);
      setStages(stages.filter((s) => (s._id || s.id) !== stageId));
      const freshProj = await projectService.getProjectById(projId);
      if (freshProj) setViewModalProject(freshProj);
      loadProjects(pagination.page);
      showToast('Stage removed');
    } catch (err) {
      showToast(`Cannot delete stage: ${err?.message}`);
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
      showToast(`Add member failed: ${err?.message}`);
    }
  };

  const handleRemoveTeamMember = async (userId) => {
    if (!viewModalProject) return;
    const projId = viewModalProject._id || viewModalProject.id;
    try {
      const updatedMembers = await projectService.removeProjectMember(projId, userId);
      setViewModalProject({
        ...viewModalProject,
        members: updatedMembers,
        memberCount: updatedMembers.length
      });
      showToast('Member removed from project team');
      loadProjects(pagination.page);
    } catch (err) {
      showToast('Remove member failed');
    }
  };

  return (
    <div className="projects-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="m17-toast-notification">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Page Header & KPI Summary Cards */}
      <div className="projects-title-row">
        <div className="projects-header-left">
          <h1 className="projects-heading">Architectural & Engineering Projects</h1>
          <p className="projects-subheading">Core project records, embedded team access, drawing stages & progress tracking</p>
        </div>
        <div className="projects-title-actions">
          <button
            type="button"
            className="btn-secondary-pill"
            onClick={handleOpenTrash}
            title="Open 30-day soft deleted trash retention bin"
          >
            <Trash2 size={15} />
            <span>Trash Bin</span>
            {trashCount > 0 && <span className="btn-badge-counter">{trashCount}</span>}
          </button>
          <button
            type="button"
            className="btn-secondary-pill"
            onClick={handleExportCsv}
            title="Download UTF-8 BOM CSV with formula protection"
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
              setCreateModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Summary Facet Cards matching Dashboard Cards */}
      <div className="m17-summary-grid">
        <div
          className="m17-summary-card"
          onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'all' : 'IN_PROGRESS')}
          style={{ cursor: 'pointer' }}
        >
          <div className="summary-card-header">
            <div className="summary-header-left">
              <div className="summary-circle-icon">
                <Clock size={16} />
              </div>
              <span className="summary-title-text">Project – Ongoing</span>
            </div>
            <span className="summary-card-chevron">›</span>
          </div>
          <div className="summary-card-body">
            <h3 className={`summary-card-val ${!summary.byStatus?.IN_PROGRESS ? 'val-zero' : ''}`}>
              {summary.byStatus?.IN_PROGRESS || 0}
            </h3>
            <span className="summary-card-sub">Active projects in progress</span>
          </div>
        </div>

        <div
          className="m17-summary-card"
          onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'all' : 'COMPLETED')}
          style={{ cursor: 'pointer' }}
        >
          <div className="summary-card-header">
            <div className="summary-header-left">
              <div className="summary-circle-icon">
                <CheckCircle2 size={16} />
              </div>
              <span className="summary-title-text">Project – Completed</span>
            </div>
            <span className="summary-card-chevron">›</span>
          </div>
          <div className="summary-card-body">
            <h3 className={`summary-card-val ${!summary.byStatus?.COMPLETED ? 'val-zero' : ''}`}>
              {summary.byStatus?.COMPLETED || 0}
            </h3>
            <span className="summary-card-sub">Handed over & approved</span>
          </div>
        </div>

        <div
          className="m17-summary-card"
          onClick={() => setStatusFilter(statusFilter === 'ON_HOLD' ? 'all' : 'ON_HOLD')}
          style={{ cursor: 'pointer' }}
        >
          <div className="summary-card-header">
            <div className="summary-header-left">
              <div className="summary-circle-icon">
                <PauseCircle size={16} />
              </div>
              <span className="summary-title-text">Project – On Hold</span>
            </div>
            <span className="summary-card-chevron">›</span>
          </div>
          <div className="summary-card-body">
            <h3 className={`summary-card-val ${!summary.byStatus?.ON_HOLD ? 'val-zero' : ''}`}>
              {summary.byStatus?.ON_HOLD || 0}
            </h3>
            <span className="summary-card-sub">Pending decisions & review</span>
          </div>
        </div>

        <div className="m17-summary-card">
          <div className="summary-card-header">
            <div className="summary-header-left">
              <div className="summary-circle-icon">
                <AlertTriangle size={16} />
              </div>
              <span className="summary-title-text">Overdue – Schedule</span>
            </div>
            <span className="summary-card-chevron">›</span>
          </div>
          <div className="summary-card-body">
            <h3 className={`summary-card-val ${!summary.overdue ? 'val-zero' : ''}`}>
              {summary.overdue || 0}
            </h3>
            {summary.overdue === 0 ? (
              <span className="pill-all-clear">ALL CLEAR</span>
            ) : (
              <span className="pill-attention">NEEDS ACTION</span>
            )}
          </div>
        </div>

        <div
          className="m17-summary-card"
          onClick={() => setStatusFilter('all')}
          style={{ cursor: 'pointer' }}
        >
          <div className="summary-card-header">
            <div className="summary-header-left">
              <div className="summary-circle-icon">
                <Building size={16} />
              </div>
              <span className="summary-title-text">Studio – Portfolio</span>
            </div>
            <span className="summary-card-chevron">›</span>
          </div>
          <div className="summary-card-body">
            <h3 className="summary-card-val">
              {summary.total || projects.length}
            </h3>
            <span className="summary-card-sub">Total architectural records</span>
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
            <Filter size={18} strokeWidth={1.8} />
          </button>

          <div className="projects-search-pill">
            <Search size={16} className="search-pill-icon" />
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
            {['all', 'IN_PROGRESS', 'NOT_STARTED', 'ON_HOLD', 'COMPLETED'].map((st) => (
              <button
                key={st}
                type="button"
                className={`quick-pill ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'all' ? 'All' : st.replace('_', ' ')}
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
          <span className="meta-separator">|</span>
          <span>Showing: <strong className="count-highlight">{projects.length}</strong></span>
          {selectedProjects.length > 0 && (
            <>
              <span className="meta-separator">|</span>
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
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="page-nav-arrow"
              disabled={pagination.page >= (pagination.pages || 1) || loading}
              onClick={() => loadProjects(pagination.page + 1)}
              aria-label="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Data Table */}
      <div className="projects-table-wrapper">
        <table className="projects-data-table">
          <thead>
            <tr>
              <th className="th-logo">
                <input
                  type="checkbox"
                  className="table-checkbox"
                  checked={projects.length > 0 && selectedProjects.length === projects.length}
                  onChange={handleSelectAll}
                  aria-label="Select all projects"
                />
                <span>Code</span>
              </th>
              <th>Project Name</th>
              <th>Category & Typology</th>
              <th>Client</th>
              <th>Location</th>
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
                <td colSpan={11} className="m17-loading-cell">
                  <div className="m17-table-loader">
                    <div className="m17-spinner" />
                    <span>Loading project records...</span>
                  </div>
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={11} className="no-data-cell">
                  <div className="no-data-container">
                    <Building size={48} color="var(--color-text-muted)" strokeWidth={1.2} />
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
                return (
                  <tr key={projId} className="project-data-row">
                    <td className="td-logo">
                      <input
                        type="checkbox"
                        className="table-checkbox"
                        checked={selectedProjects.includes(projId)}
                        onChange={() => handleSelectRow(projId)}
                        aria-label={`Select ${proj.name}`}
                      />
                      <span className="m17-project-code-tag">{proj.projectCode}</span>
                    </td>
                    <td
                      className="td-title-cell"
                      onClick={() => handleOpenViewModal(proj)}
                      title="Click to view project dashboard"
                    >
                      <strong className="proj-name-link">{proj.name}</strong>
                      {proj.description && (
                        <span className="proj-desc-snippet">{proj.description.slice(0, 50)}...</span>
                      )}
                    </td>
                    <td>
                      <span className="m17-cat-pill">{proj.categoryName || 'Residential'}</span>
                    </td>
                    <td>
                      <div className="client-cell-info">
                        <strong>{proj.client?.name || 'Private Client'}</strong>
                        {proj.client?.phone && <span className="cell-sub">{proj.client.phone}</span>}
                      </div>
                    </td>
                    <td>
                      <span className="city-cell">{proj.site?.city || 'Ahmedabad'}</span>
                    </td>
                    <td>
                      <strong className="budget-cell-val">{formatBudget(proj.budgetPaise)}</strong>
                    </td>
                    <td>
                      <Badge variant={getPriorityBadgeVariant(proj.priority)}>
                        {proj.priority || 'MEDIUM'}
                      </Badge>
                    </td>
                    <td>
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
                      <span className="manager-pill" title={proj.manager?.email || ''}>
                        {proj.manager?.name || 'Unassigned'}
                      </span>
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
                            <Copy size={13} style={{ marginRight: 6 }} /> Duplicate Structure
                          </button>
                          <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => handleToggleArchive(proj)}
                          >
                            <Archive size={13} style={{ marginRight: 6 }} /> {proj.isArchived ? 'Unarchive' : 'Archive Project'}
                          </button>
                          <button
                            type="button"
                            className="dropdown-item text-danger"
                            onClick={() => handleDeleteProject(projId, proj.name)}
                          >
                            <Trash2 size={13} style={{ marginRight: 6 }} /> Move to Trash (30d)
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

      {/* 5. Project Dashboard View / Management Modal */}
      {viewModalProject && (
        <Modal
          isOpen={Boolean(viewModalProject)}
          onClose={() => setViewModalProject(null)}
          title={`Project Record: ${viewModalProject.projectCode}`}
          maxWidth="920px"
        >
          <div className="project-detail-modal-body">
            {/* Hero Card */}
            <div className="project-detail-hero">
              <div className="detail-hero-left">
                <div className="hero-badge-row">
                  <span className="m17-project-code-tag">{viewModalProject.projectCode}</span>
                  <Badge variant={getStatusBadgeVariant(viewModalProject.status)}>
                    {viewModalProject.status ? viewModalProject.status.replace('_', ' ') : 'NOT STARTED'}
                  </Badge>
                  <Badge variant={getPriorityBadgeVariant(viewModalProject.priority)}>
                    {viewModalProject.priority || 'MEDIUM'} PRIORITY
                  </Badge>
                </div>
                <h3>{viewModalProject.name}</h3>
                <p>
                  Client: <strong>{viewModalProject.client?.name}</strong> • {viewModalProject.site?.city} • {viewModalProject.area?.value} {viewModalProject.area?.unit || 'sq.ft'}
                </p>
              </div>

              {/* Client Portal Link */}
              <div className="detail-portal-card">
                <div className="portal-code-label">EXTERNAL CLIENT PORTAL</div>
                <div className="portal-code-val">
                  <code>{viewModalProject.projectCode}</code>
                  <button
                    type="button"
                    className="copy-portal-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/portal/${viewModalProject.projectCode}`);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2500);
                    }}
                  >
                    {linkCopied ? <Check size={13} color="#5E7A6B" /> : <Copy size={13} />}
                    <span>{linkCopied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
                <span className="portal-note-sub">Zero-seat external access for clients & consultants.</span>
              </div>
            </div>

            {/* Modal Tabs */}
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
                <span>Stages & Progress ({stages.length})</span>
              </button>
              <button
                type="button"
                className={`pmodal-tab ${modalTab === 'team' ? 'active' : ''}`}
                onClick={() => setModalTab('team')}
              >
                <Users size={14} />
                <span>Team Members ({viewModalProject.members?.length || 1})</span>
              </button>
            </div>

            {/* Tab 1: Overview */}
            {modalTab === 'overview' && (
              <div className="pmodal-tab-content">
                <div className="detail-specs-grid">
                  <div className="spec-card">
                    <span className="spec-label">Project Code</span>
                    <strong className="spec-value">{viewModalProject.projectCode}</strong>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Typology / Category</span>
                    <span className="spec-value">{viewModalProject.categoryName || 'Residential Villa'}</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Budget</span>
                    <strong className="spec-value">{formatBudget(viewModalProject.budgetPaise)}</strong>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Built-Up Area</span>
                    <span className="spec-value">{viewModalProject.area?.value} {viewModalProject.area?.unit || 'sq.ft'}</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Client Contact</span>
                    <span className="spec-value">{viewModalProject.client?.contactPerson || viewModalProject.client?.name}</span>
                    <span className="spec-sub">{viewModalProject.client?.phone || viewModalProject.client?.email || 'N/A'}</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Site Address</span>
                    <span className="spec-value">{viewModalProject.site?.address || viewModalProject.site?.city}</span>
                    <span className="spec-sub">{viewModalProject.site?.city}, {viewModalProject.site?.state} {viewModalProject.site?.pincode}</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Planned Timeline</span>
                    <span className="spec-value">
                      {viewModalProject.plannedStartDate ? viewModalProject.plannedStartDate.slice(0, 10) : 'TBD'} → {viewModalProject.plannedEndDate ? viewModalProject.plannedEndDate.slice(0, 10) : 'TBD'}
                    </span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Actual Timeline</span>
                    <span className="spec-value">
                      {viewModalProject.actualStartDate ? viewModalProject.actualStartDate.slice(0, 10) : 'Not started'} → {viewModalProject.actualEndDate ? viewModalProject.actualEndDate.slice(0, 10) : 'Active'}
                    </span>
                  </div>
                </div>

                {viewModalProject.description && (
                  <div className="m17-section-box">
                    <span className="spec-label">Project Scope & Architectural Brief</span>
                    <p className="proj-brief-text">{viewModalProject.description}</p>
                  </div>
                )}

                {viewModalProject.tags && viewModalProject.tags.length > 0 && (
                  <div className="m17-tags-row">
                    <span className="spec-label">Tags:</span>
                    {viewModalProject.tags.map((t, idx) => (
                      <span key={idx} className="m17-tag-chip">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Stages & Progress (Module M1.7 Requirement) */}
            {modalTab === 'stages' && (
              <div className="pmodal-tab-content">
                <div className="stages-header-banner">
                  <div>
                    <h4>Project Drawing & Execution Stages</h4>
                    <p>Track snapshotted stages, formula `round(DONE / (all - SKIPPED) * 100)` or manual override</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Sparkles}
                      onClick={handleApplyDefaultStages}
                    >
                      Apply Master Drawing Stages
                    </Button>
                  </div>
                </div>

                {/* Progress bar gauge + Auto/Manual Mode Controls */}
                <div className="m17-stage-progress-card">
                  <div className="stage-progress-label-row">
                    <span>
                      Overall Progress ({viewModalProject.progress?.mode || 'AUTO'} Mode):
                    </span>
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
                        Auto (Stage Formula)
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

            {/* Tab 3: Project Team Members (Module M1.7 Requirement) */}
            {modalTab === 'team' && (
              <div className="pmodal-tab-content">
                <div className="team-header-banner">
                  <div>
                    <h4>Project Team & Access Permissions</h4>
                    <p>Single MANAGER rule enforced (promoting user demotes previous manager to LEAD)</p>
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
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Create / Edit Project Modal */}
      <Modal
        isOpen={createModalOpen || Boolean(editModalProject)}
        onClose={() => {
          setCreateModalOpen(false);
          setEditModalProject(null);
        }}
        title={editModalProject ? `Edit Project: ${editModalProject.projectCode}` : 'Create New Architectural Project'}
        maxWidth="780px"
      >
        <form onSubmit={handleSaveProject} className="create-project-form">
          <div className="form-section-header">
            <span>Core Project Record</span>
          </div>

          <Input
            label="Project Name / Title *"
            id="proj-name-input"
            placeholder="e.g. Cantilevered Courtyard Villa"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="form-grid-2">
            <div>
              <label className="m17-field-label">Project Category</label>
              <select
                className="m17-select-input"
                value={formData.projectCategoryId}
                onChange={(e) => setFormData({ ...formData, projectCategoryId: e.target.value })}
              >
                <option value="">Select Category...</option>
                {categoryOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="m17-field-label">Typology / Type</label>
              <select
                className="m17-select-input"
                value={formData.projectTypeId}
                onChange={(e) => setFormData({ ...formData, projectTypeId: e.target.value })}
              >
                <option value="">Select Type...</option>
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label className="m17-field-label">Priority</label>
              <select
                className="m17-select-input"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <div>
              <label className="m17-field-label">Assign Manager</label>
              <select
                className="m17-select-input"
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              >
                <option value="">Select Project Manager...</option>
                {usersDirectory.map((u) => (
                  <option key={u._id || u.id} value={u._id || u.id}>{u.name} ({u.designation || 'Architect'})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section-header">
            <span>Client & Site Details</span>
          </div>

          <div className="form-grid-2">
            <Input
              label="Client Account / Name"
              placeholder="e.g. Rajesh & Sonal Shah"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            />
            <Input
              label="Contact Person"
              placeholder="Primary representative"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            />
          </div>

          <div className="form-grid-2">
            <Input
              label="Client Email"
              type="email"
              placeholder="client@domain.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Client Phone / WhatsApp"
              placeholder="+91 98250 12345"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="form-grid-3">
            <Input
              label="Site City"
              placeholder="Ahmedabad"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="Site State"
              placeholder="Gujarat"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="Pincode"
              placeholder="380015"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            />
          </div>

          <Input
            label="Site Street / Plot Address"
            placeholder="Plot 42, Gulmohar Greens"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="form-section-header">
            <span>Budget, Area & Timeline</span>
          </div>

          <div className="form-grid-2">
            <Input
              label="Budget in INR (₹)"
              type="number"
              placeholder="e.g. 4500000"
              value={formData.budgetRupees}
              onChange={(e) => setFormData({ ...formData, budgetRupees: e.target.value })}
              helperText={formData.budgetRupees ? formatBudget(Number(formData.budgetRupees) * 100) : 'Stored as budgetPaise in backend'}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                label="Built-Up Area"
                type="number"
                placeholder="4500"
                value={formData.areaValue}
                onChange={(e) => setFormData({ ...formData, areaValue: e.target.value })}
                style={{ flex: 2 }}
              />
              <div style={{ flex: 1 }}>
                <label className="m17-field-label">Unit</label>
                <select
                  className="m17-select-input"
                  value={formData.areaUnit}
                  onChange={(e) => setFormData({ ...formData, areaUnit: e.target.value })}
                >
                  <option value="sq.ft">sq.ft</option>
                  <option value="sq.m">sq.m</option>
                  <option value="sq.yd">sq.yd</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-grid-2">
            <Input
              label="Planned Start Date"
              type="date"
              value={formData.plannedStartDate}
              onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
            />
            <Input
              label="Planned Handover Date"
              type="date"
              value={formData.plannedEndDate}
              onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
            />
          </div>

          <Input
            label="Tags (Comma separated)"
            placeholder="Luxury, Courtyard, Vastu-Compliant"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />

          <div>
            <label className="m17-field-label">Project Scope / Architectural Description</label>
            <textarea
              className="m17-textarea-input"
              rows={3}
              placeholder="Describe architectural style, material palette, and key project goals..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-action-row">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setEditModalProject(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editModalProject ? 'Save Changes' : 'Create Project Record'}
            </Button>
          </div>
        </form>
      </Modal>

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

      {/* 8. Trash Bin Modal (30-day Retention Pipeline M1.7) */}
      {trashModalOpen && (
        <Modal
          isOpen={trashModalOpen}
          onClose={() => setTrashModalOpen(false)}
          title="Trash Bin — 30-Day Project Retention Pipeline"
          maxWidth="700px"
        >
          <div className="trash-modal-content">
            <div className="trash-banner-info">
              <AlertTriangle size={18} color="#C4841D" />
              <span>
                Deleted projects are retained here for 30 days before being permanently purged by the daily scheduled purge job (02:30 IST).
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
