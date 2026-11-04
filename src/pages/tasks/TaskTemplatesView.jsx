import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  FolderPlus,
  Send,
  Layers,
  Search,
  Sparkles,
  RotateCw,
  AlertTriangle,
  Building2,
  Check,
  X,
  FileText
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { taskTemplateService } from '../../services/taskTemplateService';
import { extractErrorMessage } from '../../utils/errorHandler';

export const DEFAULT_ARCHITECTURAL_TEMPLATES = [
  {
    name: 'Concept & Schematic Design Review',
    category: 'Design Phase',
    description: 'Standard practice architectural schematic workflow and client presentations.',
    tasks: [
      {
        title: 'Site topography and contour study',
        priority: 'HIGH',
        estimatedMinutes: 240,
        checklist: ['Contour slope analysis', 'Benchmark RL verification']
      },
      {
        title: 'Client brief and space program sign-off',
        priority: 'URGENT',
        estimatedMinutes: 180,
        checklist: ['Program matrix', 'Adjacency diagram']
      },
      {
        title: 'Massing options and sun-path analysis',
        priority: 'MEDIUM',
        estimatedMinutes: 300,
        checklist: ['3D form generation', 'Shadow study summer/winter']
      },
      {
        title: 'Schematic architectural floor plans 1:100',
        priority: 'HIGH',
        estimatedMinutes: 480,
        checklist: ['Grid placement', 'Circulation cores', 'Room sizing']
      },
      {
        title: '3D mood boards and material palette',
        priority: 'MEDIUM',
        estimatedMinutes: 240,
        checklist: ['Exterior finishes', 'Interior lighting mood']
      }
    ]
  },
  {
    name: 'Municipal Statutory Clearances & Liaison',
    category: 'Regulatory',
    description: 'Local municipal corporation approval drawings, scrutiny fees, and statutory NOCs.',
    tasks: [
      {
        title: 'Zoning & FSI / FAR calculations verification',
        priority: 'URGENT',
        estimatedMinutes: 240,
        checklist: ['Road widening deduction', 'Permissible built-up area check']
      },
      {
        title: 'Municipal corporation submission drawings prep',
        priority: 'HIGH',
        estimatedMinutes: 480,
        checklist: ['Color coding by municipal bylaws', 'Key plan and site plan 1:500']
      },
      {
        title: 'Fire & life safety egress compliance check',
        priority: 'HIGH',
        estimatedMinutes: 180,
        checklist: ['Travel distance to staircase', 'Fire hydrant riser route']
      },
      {
        title: 'Environmental NOC and building line verification',
        priority: 'MEDIUM',
        estimatedMinutes: 180,
        checklist: ['Setback verification', 'Tree cutting permission if applicable']
      }
    ]
  },
  {
    name: 'GFC (Good For Construction) Package Release',
    category: 'Working Drawings',
    description: 'Detailed execution drawings set for on-site civil and structural contractors.',
    tasks: [
      {
        title: 'Centerline and foundation setting out drawings',
        priority: 'URGENT',
        estimatedMinutes: 480,
        checklist: ['Grid intersection coordinates', 'Excavation offsets']
      },
      {
        title: 'Masonry setting-out plans with door-window schedules',
        priority: 'HIGH',
        estimatedMinutes: 360,
        checklist: ['Lintel heights', 'Opening widths and reveals']
      },
      {
        title: 'RCC column and beam junction coordination',
        priority: 'HIGH',
        estimatedMinutes: 300,
        checklist: ['Rebar clearances', 'Structural consultant sign-off']
      },
      {
        title: 'Electrical switchboard and lighting conduit layout',
        priority: 'MEDIUM',
        estimatedMinutes: 240,
        checklist: ['Conduit drops in slab', 'Distribution board locations']
      },
      {
        title: 'Plumbing invert levels and drainage slope verification',
        priority: 'MEDIUM',
        estimatedMinutes: 240,
        checklist: ['Shaft dimensions', 'Inspection chamber connections']
      }
    ]
  },
  {
    name: 'MEP & Structural Clash Detection',
    category: 'Engineering',
    description: 'Multi-disciplinary MEP and structural coordinate clash resolution.',
    tasks: [
      {
        title: 'HVAC duct vs structural beam clearance check',
        priority: 'HIGH',
        estimatedMinutes: 240,
        checklist: ['Soffit height verification', 'Duct sleeves']
      },
      {
        title: 'Sump tank vs plumbing riser clash review',
        priority: 'MEDIUM',
        estimatedMinutes: 180,
        checklist: ['Inlet/outlet alignment', 'Pump head capacity']
      },
      {
        title: 'Sign-off from structural engineer on cutouts',
        priority: 'URGENT',
        estimatedMinutes: 120,
        checklist: ['Slab penetration approval', 'Additional trimmer bars']
      }
    ]
  }
];

export function TaskTemplatesView({ projectOptions = [], onTemplateApplied }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Modal 1: Apply Template to Project
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [templateToApply, setTemplateToApply] = useState(null);
  const [targetProjectId, setTargetProjectId] = useState(projectOptions[0]?.value || '');
  const [targetStartDate, setTargetStartDate] = useState(new Date().toISOString().slice(0, 10));

  // Modal 2: Create / Edit Template
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'Design Phase',
    description: '',
    tasks: [{ title: '', priority: 'MEDIUM', estimatedMinutes: 120, checklist: [''] }]
  });

  // Modal 3: Create from Project Tasks
  const [fromProjectModalOpen, setFromProjectModalOpen] = useState(false);
  const [fromProjectForm, setFromProjectForm] = useState({
    projectId: projectOptions[0]?.value || '',
    name: '',
    category: 'Project Derived',
    description: '',
    includeCompleted: false
  });

  const showToast = (message, type = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  };

  // 1. GET /task-templates - Fetch from live backend strictly 1 time
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskTemplateService.getTemplates({
        search: search.trim() || undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined
      });
      const list = res?.templates || [];
      setTemplates(list);
    } catch (err) {
      console.warn('Failed to fetch templates:', err);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Seed default templates to live backend if database is currently empty
  const handleSeedDefaults = async () => {
    setActionLoading(true);
    try {
      let created = 0;
      for (const t of DEFAULT_ARCHITECTURAL_TEMPLATES) {
        await taskTemplateService.createTemplate(t);
        created++;
      }
      showToast(`Successfully seeded ${created} architectural practice templates to backend!`, 'success');
      await fetchTemplates();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to seed default templates'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. POST /projects/{projectId}/tasks/apply-template
  const handleApplyTemplate = async (e) => {
    e.preventDefault();
    if (!targetProjectId) {
      showToast('Please select a project to apply template', 'error');
      return;
    }
    if (!templateToApply) return;

    setActionLoading(true);
    try {
      const templateId = templateToApply.id || templateToApply._id;
      const res = await taskTemplateService.applyTemplateToProject(targetProjectId, {
        templateId,
        startDate: targetStartDate
      });
      showToast(`Template "${templateToApply.name || templateToApply.title}" applied successfully to project!`, 'success');
      setApplyModalOpen(false);
      setTemplateToApply(null);
      if (onTemplateApplied) onTemplateApplied(res);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to apply template to project'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. POST /task-templates OR PATCH /task-templates/{id}
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!templateForm.name.trim()) {
      showToast('Template name is required', 'error');
      return;
    }

    const cleanTasks = templateForm.tasks
      .filter((t) => t.title?.trim())
      .map((t) => ({
        title: t.title.trim(),
        priority: t.priority || 'MEDIUM',
        estimatedMinutes: Number(t.estimatedMinutes) || 120,
        checklist: Array.isArray(t.checklist)
          ? t.checklist.filter((c) => (typeof c === 'string' ? c.trim() : c?.title?.trim()))
          : []
      }));

    if (cleanTasks.length === 0) {
      showToast('Please provide at least one task with a title', 'error');
      return;
    }

    setActionLoading(true);
    try {
      if (editingTemplateId) {
        await taskTemplateService.updateTemplate(editingTemplateId, {
          name: templateForm.name.trim(),
          category: templateForm.category,
          description: templateForm.description.trim(),
          tasks: cleanTasks
        });
        showToast('Template updated successfully.', 'success');
      } else {
        await taskTemplateService.createTemplate({
          name: templateForm.name.trim(),
          category: templateForm.category,
          description: templateForm.description.trim(),
          tasks: cleanTasks
        });
        showToast('Task template created successfully in backend.', 'success');
      }
      setCreateModalOpen(false);
      setEditingTemplateId(null);
      await fetchTemplates();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to save template'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. DELETE /task-templates/{id}
  const handleDeleteTemplate = async (tmpl, e) => {
    e?.stopPropagation();
    const id = tmpl.id || tmpl._id;
    const name = tmpl.name || tmpl.title || 'this template';
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;

    setActionLoading(true);
    try {
      await taskTemplateService.deleteTemplate(id);
      showToast(`Template "${name}" deleted successfully.`, 'success');
      await fetchTemplates();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to delete template'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. POST /task-templates/from-project
  const handleCreateFromProject = async (e) => {
    e.preventDefault();
    if (!fromProjectForm.projectId) {
      showToast('Please select a source project', 'error');
      return;
    }
    if (!fromProjectForm.name.trim()) {
      showToast('Please specify a template name', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await taskTemplateService.createFromProject({
        projectId: fromProjectForm.projectId,
        name: fromProjectForm.name.trim(),
        category: fromProjectForm.category || 'Project Derived',
        description: fromProjectForm.description.trim(),
        includeCompleted: fromProjectForm.includeCompleted
      });
      showToast('Template created from project tasks successfully!', 'success');
      setFromProjectModalOpen(false);
      await fetchTemplates();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to create template from project'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper: Open edit modal
  const handleOpenEdit = (tmpl, e) => {
    e?.stopPropagation();
    const id = tmpl.id || tmpl._id;
    setEditingTemplateId(id);
    const existingTasks = Array.isArray(tmpl.tasks) && tmpl.tasks.length > 0
      ? tmpl.tasks.map((t) => ({
          title: t.title || t.name || '',
          priority: t.priority || 'MEDIUM',
          estimatedMinutes: t.estimatedMinutes || (t.estimatedHours ? t.estimatedHours * 60 : 120),
          checklist: Array.isArray(t.checklist) ? t.checklist : []
        }))
      : [{ title: tmpl.title || '', priority: 'MEDIUM', estimatedMinutes: 120, checklist: tmpl.checklist || [] }];

    setTemplateForm({
      name: tmpl.name || tmpl.title || '',
      category: tmpl.category || 'Design Phase',
      description: tmpl.description || '',
      tasks: existingTasks
    });
    setCreateModalOpen(true);
  };

  // Filter templates locally if backend returns all
  const filteredTemplates = templates.filter((t) => {
    const title = (t.name || t.title || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || title.includes(q) || cat.includes(q) || desc.includes(q);
    const matchesCat = selectedCategory === 'ALL' || (t.category || '').toUpperCase() === selectedCategory.toUpperCase();
    return matchesSearch && matchesCat;
  });

  return (
    <div className="tasks-templates-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Alert */}
      {notice && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          background: notice.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${notice.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: notice.type === 'error' ? '#991b1b' : '#166534',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {notice.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* HEADER WITH ACTIONS */}
      <div className="templates-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h3 className="templates-section-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} style={{ color: 'var(--color-primary, #7B6F62)' }} />
            Architectural Task Templates
          </h3>
          <p className="templates-section-subtitle" style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-muted, #7B6F62)' }}>
            Standard practice workflows for design phases, municipal approvals, GFC drawings, and engineering coordination.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {templates.length === 0 && !loading && (
            <Button
              variant="secondary"
              size="sm"
              icon={Sparkles}
              onClick={handleSeedDefaults}
              disabled={actionLoading}
            >
              Seed Default Templates
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon={FolderPlus}
            onClick={() => setFromProjectModalOpen(true)}
            disabled={actionLoading || projectOptions.length === 0}
          >
            Import from Project
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => {
              setEditingTemplateId(null);
              setTemplateForm({
                name: '',
                category: 'Design Phase',
                description: '',
                tasks: [{ title: '', priority: 'MEDIUM', estimatedMinutes: 120, checklist: [''] }]
              });
              setCreateModalOpen(true);
            }}
          >
            New Template
          </Button>
        </div>
      </div>

      {/* SEARCH & CATEGORY FILTER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 16px',
        background: 'var(--color-card, #FFFFFF)',
        borderRadius: '10px',
        border: '1px solid var(--color-border, #E8E0D5)'
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {['ALL', 'Design Phase', 'Regulatory', 'Working Drawings', 'Engineering'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedCategory.toUpperCase() === cat.toUpperCase() ? 'var(--color-primary, #7B6F62)' : '#E5E7EB',
                background: selectedCategory.toUpperCase() === cat.toUpperCase() ? 'var(--color-primary, #7B6F62)' : 'transparent',
                color: selectedCategory.toUpperCase() === cat.toUpperCase() ? '#FFFFFF' : '#4B5563',
                cursor: 'pointer',
                fontWeight: selectedCategory.toUpperCase() === cat.toUpperCase() ? 600 : 500,
                transition: 'all 0.15s ease'
              }}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              fontSize: '12.5px',
              borderRadius: '6px',
              border: '1px solid var(--color-border, #E8E0D5)',
              background: 'var(--color-background, #FAF8F5)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* TEMPLATES GRID */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
          <RotateCw size={24} className="spin-icon" style={{ margin: '0 auto 10px', color: 'var(--color-primary, #7B6F62)' }} />
          <div>Loading architectural task templates from backend...</div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          background: 'var(--color-card, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--color-border, #E8E0D5)'
        }}>
          <Layers size={36} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
          <h4 style={{ margin: '0 0 6px', fontWeight: 600 }}>No task templates found</h4>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6B7280' }}>
            Get started immediately by seeding the standard architectural practice templates or creating your own.
          </p>
          <Button variant="primary" icon={Sparkles} onClick={handleSeedDefaults} disabled={actionLoading}>
            Seed Default Architectural Templates
          </Button>
        </div>
      ) : (
        <div className="tasks-templates-grid">
          {filteredTemplates.map((tmpl) => {
            const id = tmpl.id || tmpl._id;
            const title = tmpl.name || tmpl.title || 'Untitled Template';
            const category = tmpl.category || 'Standard';
            const description = tmpl.description || '';
            const taskList = Array.isArray(tmpl.tasks) ? tmpl.tasks : [];
            const taskCount = taskList.length || (tmpl.checklist?.length ? 1 : 0);
            const totalMinutes = taskList.reduce((acc, t) => acc + (t.estimatedMinutes || (t.estimatedHours ? t.estimatedHours * 60 : 120)), 0);
            const durationLabel = totalMinutes > 0 ? `${+(totalMinutes / 480).toFixed(1)} Days` : tmpl.duration || 'Flexible';

            // Extract preview checklist items
            const previewChecklist = taskList.length > 0
              ? taskList.flatMap((t) => (Array.isArray(t.checklist) ? t.checklist : [t.title])).slice(0, 5)
              : (tmpl.checklist || []).slice(0, 5);

            return (
              <div key={id} className="task-template-card">
                <div>
                  <div className="template-card-header">
                    <div>
                      <span className="template-category-tag">{category}</span>
                      <h4 className="template-title">{title}</h4>
                    </div>
                    <span className="template-duration-badge">
                      <Clock size={12} /> {durationLabel}
                    </span>
                  </div>

                  {description && (
                    <p style={{ fontSize: '12.5px', color: '#6B7280', margin: '6px 0 10px', lineHeight: 1.4 }}>
                      {description}
                    </p>
                  )}

                  <div className="template-checklist-wrap" style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span className="template-checklist-title">
                        {taskList.length > 0 ? `Tasks & Checklists (${taskCount}):` : `Checklist Items (${previewChecklist.length}):`}
                      </span>
                      {taskList.length > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary, #7B6F62)' }}>
                          {taskList.length} tasks
                        </span>
                      )}
                    </div>

                    <ul className="template-checklist">
                      {previewChecklist.map((item, idx) => {
                        const itemText = typeof item === 'string' ? item : (item.title || item.name || 'Checklist item');
                        return (
                          <li key={idx}>
                            <CheckCircle2 size={13} className="template-check-icon" />
                            <span>{itemText}</span>
                          </li>
                        );
                      })}
                      {taskList.length > 5 && (
                        <li style={{ color: '#9CA3AF', fontSize: '11px', fontStyle: 'italic' }}>
                          + {taskList.length - 5} more tasks in template
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F3F4F6' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => {
                      setTemplateToApply(tmpl);
                      setApplyModalOpen(true);
                    }}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Apply to Project
                  </Button>

                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(tmpl, e)}
                    title="Edit Template"
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #E5E7EB',
                      background: '#FFFFFF',
                      color: '#4B5563',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    <Edit2 size={12} /> Edit
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteTemplate(tmpl, e)}
                    title="Delete Template"
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #FEE2E2',
                      background: '#FEF2F2',
                      color: '#DC2626',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: APPLY TEMPLATE TO PROJECT (POST /projects/{projectId}/tasks/apply-template) */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => {
          setApplyModalOpen(false);
          setTemplateToApply(null);
        }}
        title={`Apply "${templateToApply?.name || templateToApply?.title || 'Template'}" to Project`}
        maxWidth="500px"
      >
        <form onSubmit={handleApplyTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
            This will clone all template tasks and their checklist items into the selected project.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Target Project *
            </label>
            <Select
              options={projectOptions}
              value={targetProjectId}
              onChange={(val) => setTargetProjectId(val)}
              placeholder="Select project..."
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Anchor Start Date
            </label>
            <Input
              type="date"
              value={targetStartDate}
              onChange={(e) => setTargetStartDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading || !targetProjectId}>
              {actionLoading ? 'Applying...' : 'Apply Template Now'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CREATE / EDIT TEMPLATE (POST /task-templates & PATCH /task-templates/{id}) */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingTemplateId(null);
        }}
        title={editingTemplateId ? 'Edit Task Template' : 'Create New Task Template'}
        maxWidth="620px"
      >
        <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Template Name *
            </label>
            <Input
              placeholder="e.g. Municipal Approval Submission Package"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Category
              </label>
              <Input
                placeholder="e.g. Design Phase, Regulatory, GFC"
                value={templateForm.category}
                onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Description
              </label>
              <Input
                placeholder="Brief summary..."
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              />
            </div>
          </div>

          {/* DYNAMIC TASKS LIST */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>
                Tasks in this Template ({templateForm.tasks.length})
              </label>
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                type="button"
                onClick={() => {
                  setTemplateForm({
                    ...templateForm,
                    tasks: [...templateForm.tasks, { title: '', priority: 'MEDIUM', estimatedMinutes: 120, checklist: [''] }]
                  });
                }}
              >
                Add Task
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
              {templateForm.tasks.map((task, tIdx) => (
                <div key={tIdx} style={{ padding: '10px', border: '1px solid #E5E7EB', borderRadius: '8px', background: '#F9FAFB' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Input
                      placeholder={`Task ${tIdx + 1} Title (required)`}
                      value={task.title}
                      onChange={(e) => {
                        const updated = [...templateForm.tasks];
                        updated[tIdx].title = e.target.value;
                        setTemplateForm({ ...templateForm, tasks: updated });
                      }}
                      style={{ flex: 1 }}
                      required
                    />

                    <select
                      value={task.priority}
                      onChange={(e) => {
                        const updated = [...templateForm.tasks];
                        updated[tIdx].priority = e.target.value;
                        setTemplateForm({ ...templateForm, tasks: updated });
                      }}
                      style={{ padding: '7px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>

                    {templateForm.tasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = templateForm.tasks.filter((_, idx) => idx !== tIdx);
                          setTemplateForm({ ...templateForm, tasks: updated });
                        }}
                        style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : editingTemplateId ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: CREATE TEMPLATE FROM PROJECT (POST /task-templates/from-project) */}
      <Modal
        isOpen={fromProjectModalOpen}
        onClose={() => setFromProjectModalOpen(false)}
        title="Extract Task Template from Existing Project"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateFromProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
            Turn an existing project's task structure into a reusable architectural template for future projects.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Source Project *
            </label>
            <Select
              options={projectOptions}
              value={fromProjectForm.projectId}
              onChange={(val) => setFromProjectForm({ ...fromProjectForm, projectId: val })}
              placeholder="Select project..."
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              New Template Name *
            </label>
            <Input
              placeholder="e.g. High-Rise Residential Workflow"
              value={fromProjectForm.name}
              onChange={(e) => setFromProjectForm({ ...fromProjectForm, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Category
              </label>
              <Input
                placeholder="e.g. Residential, Commercial"
                value={fromProjectForm.category}
                onChange={(e) => setFromProjectForm({ ...fromProjectForm, category: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Description
              </label>
              <Input
                placeholder="Notes about this template..."
                value={fromProjectForm.description}
                onChange={(e) => setFromProjectForm({ ...fromProjectForm, description: e.target.value })}
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={fromProjectForm.includeCompleted}
              onChange={(e) => setFromProjectForm({ ...fromProjectForm, includeCompleted: e.target.checked })}
            />
            <span>Include completed project tasks</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setFromProjectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading || !fromProjectForm.projectId || !fromProjectForm.name.trim()}>
              {actionLoading ? 'Extracting...' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TaskTemplatesView;

