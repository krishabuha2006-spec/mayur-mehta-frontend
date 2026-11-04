import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal/Modal';
import { Input } from '../../common/Input/Input';
import { Select } from '../../common/Select/Select';
import { Button } from '../../common/Button/Button';
import { projectService } from '../../../services/projectService';
import { masterService } from '../../../services/masterService';
import { teamService } from '../../../services/teamService';
import { extractErrorMessage } from '../../../utils/errorHandler';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import './ProjectModal.css';

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
  address: '',
  city: 'Ahmedabad',
  plannedStartDate: new Date().toISOString().slice(0, 10),
  plannedEndDate: '',
  budgetRupees: '',
  areaValue: '',
  areaUnit: 'SQFT',
  tags: '',
  managerId: '',
  applyDefaultStagesOnInit: false
};

export function ProjectModal({ isOpen, onClose, onSaved, projectToEdit = null }) {
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [usersDirectory, setUsersDirectory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch live lookups (categories, types, team directory)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    Promise.allSettled([
      masterService.getItemsByType('PROJECT_CATEGORY'),
      masterService.getItemsByType('PROJECT_TYPE'),
      teamService.getDirectory()
    ]).then(([cats, types, dir]) => {
      if (!isMounted) return;

      if (cats.status === 'fulfilled' && Array.isArray(cats.value)) {
        setCategoryOptions(
          cats.value.map((c) => ({
            value: c._id || c.id || c.name,
            label: c.name || c.code
          }))
        );
      }

      if (types.status === 'fulfilled' && Array.isArray(types.value)) {
        setTypeOptions(
          types.value.map((t) => ({
            value: t._id || t.id || t.name,
            label: t.name || t.code
          }))
        );
      }

      if (dir.status === 'fulfilled' && Array.isArray(dir.value)) {
        setUsersDirectory(
          dir.value.map((u) => ({
            value: u._id || u.id,
            label: u.name,
            sublabel: u.designation || u.role || 'Studio Member'
          }))
        );
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // 2. Pre-fill if editing or reset if new
  useEffect(() => {
    if (!isOpen) return;
    if (projectToEdit) {
      setFormData({
        name: projectToEdit.name || '',
        code: projectToEdit.code || '',
        description: projectToEdit.description || '',
        priority: projectToEdit.priority || 'MEDIUM',
        status: projectToEdit.status || 'NOT_STARTED',
        projectCategoryId: projectToEdit.projectCategoryId || '',
        projectTypeId: projectToEdit.projectTypeId || '',
        clientName: projectToEdit.client?.name || projectToEdit.clientName || '',
        contactPerson: projectToEdit.client?.contactPerson || projectToEdit.contactPerson || '',
        email: projectToEdit.client?.email || projectToEdit.email || '',
        phone: projectToEdit.client?.phone || projectToEdit.phone || '',
        address: projectToEdit.site?.address || projectToEdit.address || '',
        city: projectToEdit.site?.city || projectToEdit.city || 'Ahmedabad',
        plannedStartDate: projectToEdit.plannedStartDate ? projectToEdit.plannedStartDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        plannedEndDate: projectToEdit.plannedEndDate ? projectToEdit.plannedEndDate.slice(0, 10) : '',
        budgetRupees: projectToEdit.budgetPaise ? String(projectToEdit.budgetPaise / 100) : (projectToEdit.budgetRupees || ''),
        areaValue: projectToEdit.area?.value ? String(projectToEdit.area.value) : (projectToEdit.areaValue || ''),
        areaUnit: projectToEdit.area?.unit || projectToEdit.areaUnit || 'SQFT',
        tags: Array.isArray(projectToEdit.tags) ? projectToEdit.tags.join(', ') : '',
        managerId: projectToEdit.managerId || '',
        applyDefaultStagesOnInit: false
      });
    } else {
      setFormData(initialFormState);
    }
    setFormErrors({});
    setServerError('');
    setSuccessMsg('');
  }, [isOpen, projectToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Field validations
    const errors = {};
    if (!formData.name?.trim()) {
      errors.name = 'Project Name is required';
    }
    if (!formData.clientName?.trim()) {
      errors.clientName = 'Client Organization / Name is required';
    }
    if (formData.phone?.trim() && !/^\d{10}$/.test(formData.phone.trim().replace(/\D/g, ''))) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }
    if (formData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setServerError('');
    setSuccessMsg('');

    // Payload builder conforming directly to backend Swagger /projects specification
    const payload = {
      name: formData.name.trim(),
      priority: formData.priority || 'MEDIUM',
      client: {
        name: formData.clientName.trim(),
        contactPerson: formData.contactPerson?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined
      },
      site: {
        city: formData.city?.trim() || 'Ahmedabad',
        address: formData.address?.trim() || undefined
      },
      plannedStartDate: formData.plannedStartDate
        ? new Date(formData.plannedStartDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    };

    if (formData.plannedEndDate) {
      payload.plannedEndDate = new Date(formData.plannedEndDate).toISOString().slice(0, 10);
    }

    // Budget in Paise (Integer)
    if (formData.budgetRupees) {
      const budgetClean = Number(String(formData.budgetRupees).replace(/[^0-9.]/g, ''));
      if (!isNaN(budgetClean) && budgetClean > 0) {
        payload.budgetPaise = Math.round(budgetClean * 100);
      }
    }

    // Built-up Area matching backend schema (area.builtUp and area.unit)
    if (formData.areaValue) {
      const areaClean = Number(formData.areaValue);
      if (!isNaN(areaClean) && areaClean > 0) {
        payload.area = {
          builtUp: areaClean,
          value: areaClean,
          unit: formData.areaUnit || 'SQFT'
        };
      }
    }

    // Category & Typology (Only send if valid 24-character hex ObjectId)
    const isObjectId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val.trim());
    if (isObjectId(formData.projectCategoryId)) {
      payload.projectCategoryId = formData.projectCategoryId.trim();
    }
    if (isObjectId(formData.projectTypeId)) {
      payload.projectTypeId = formData.projectTypeId.trim();
    }

    // Project Manager membership assignment
    if (isObjectId(formData.managerId)) {
      payload.members = [{ userId: formData.managerId.trim(), role: 'MANAGER' }];
    }

    // Tags
    if (formData.tags) {
      const tagList = formData.tags.split(',').map((t) => t.trim().slice(0, 30)).filter(Boolean);
      if (tagList.length > 0) {
        payload.tags = tagList.slice(0, 20);
      }
    }

    if (formData.description?.trim()) {
      payload.description = formData.description.trim().slice(0, 2000);
    }

    if (formData.applyDefaultStagesOnInit === true) {
      payload.applyDefaultStages = true;
    }

    try {
      let result;
      if (projectToEdit) {
        const projId = projectToEdit._id || projectToEdit.id;
        result = await projectService.updateProject(projId, {
          ...payload,
          expectedVersion: projectToEdit.version
        });
        setSuccessMsg(`Project "${result?.name || 'Record'}" updated successfully!`);
      } else {
        result = await projectService.createProject(payload);
        const codeDisplay = result?.projectCode || result?.code || result?.name || 'New Project';
        setSuccessMsg(`Project "${codeDisplay}" registered successfully!`);

        // Assign Project Manager if selected
        if (formData.managerId && isObjectId(formData.managerId) && (result?._id || result?.id)) {
          try {
            await projectService.addProjectMember(result._id || result.id, {
              userId: formData.managerId.trim(),
              role: 'MANAGER'
            });
          } catch (mErr) {
            if (mErr?.response?.status !== 409) {
              console.warn('Manager assignment note:', mErr?.message);
            }
          }
        }

        // Transition status if non-default
        if (formData.status && formData.status !== 'NOT_STARTED' && (result?._id || result?.id)) {
          try {
            await projectService.updateProjectStatus(result._id || result.id, {
              status: formData.status,
              reason: 'Initial status selected during project registration'
            });
          } catch {}
        }
      }

      window.dispatchEvent(new CustomEvent('mm:entity-created', { detail: { type: 'project' } }));

      if (onSaved) {
        onSaved(result);
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setServerError(extractErrorMessage(err) || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={projectToEdit ? `Edit Project: ${projectToEdit.name}` : 'Register New Architectural Project'}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} noValidate className="project-modal-form">
        {serverError && (
          <div className="project-modal-alert danger">
            <AlertCircle size={16} />
            <span>{serverError}</span>
          </div>
        )}
        {successMsg && (
          <div className="project-modal-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="form-grid-2">
          <Input
            label="Project Name *"
            id="modal-proj-name"
            placeholder="e.g. Courtyard Villa Residence"
            value={formData.name}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, name: e.target.value }));
              if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
            }}
            error={formErrors.name}
            required
          />
          <Select
            label="Priority"
            id="modal-proj-priority"
            value={formData.priority || 'MEDIUM'}
            onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'URGENT', label: 'Urgent' }
            ]}
          />
        </div>

        <div className="form-grid-2">
          <Input
            label="Client Organization / Name *"
            id="modal-proj-client"
            placeholder="e.g. Shri Rajesh Patel"
            value={formData.clientName}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, clientName: e.target.value }));
              if (formErrors.clientName) setFormErrors((prev) => ({ ...prev, clientName: '' }));
            }}
            error={formErrors.clientName}
            required
          />
          <Input
            label="Contact Person"
            id="modal-proj-contact"
            placeholder="Enter contact person"
            value={formData.contactPerson}
            onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
          />
        </div>

        <div className="form-grid-2">
          <Input
            label="Client Phone Number"
            id="modal-proj-phone"
            type="tel"
            isPhone={true}
            placeholder="10-digit mobile number"
            value={formData.phone}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, phone: e.target.value }));
              if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
            }}
            error={formErrors.phone}
          />
          <Input
            label="Client Email Address"
            id="modal-proj-email"
            type="email"
            placeholder="client@example.com"
            value={formData.email}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, email: e.target.value }));
              if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
            }}
            error={formErrors.email}
          />
        </div>

        <div className="form-grid-2">
          <Select
            label="Project Category"
            id="modal-proj-cat"
            value={formData.projectCategoryId}
            onChange={(e) => setFormData((prev) => ({ ...prev, projectCategoryId: e.target.value }))}
            placeholder="Select project category..."
            options={categoryOptions}
          />
          <Select
            label="Typology / Type"
            id="modal-proj-type"
            value={formData.projectTypeId}
            onChange={(e) => setFormData((prev) => ({ ...prev, projectTypeId: e.target.value }))}
            placeholder="Select project typology..."
            options={typeOptions}
          />
        </div>

        <div className="form-grid-2">
          <Input
            label="City / Location"
            id="modal-proj-city"
            placeholder="e.g. Ahmedabad, Gujarat"
            value={formData.city}
            onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
          />
          <Input
            label="Site Address"
            id="modal-proj-address"
            placeholder="Enter site address"
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
          />
        </div>

        <div className="form-grid-2">
          <div className="budget-field-container">
            <Input
              label="Estimated Budget (₹)"
              id="modal-proj-budget"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 50,00,000"
              value={formData.budgetRupees}
              onChange={(e) => setFormData((prev) => ({ ...prev, budgetRupees: e.target.value }))}
            />
            {formData.budgetRupees && (
              <div className="budget-live-preview">
                <span className="budget-preview-label">Live In Words:</span>{' '}
                <span className="budget-preview-val">{formatRupeesWord(formData.budgetRupees)}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
            <Input
              label="Built-up Area"
              id="modal-proj-area"
              type="number"
              placeholder="e.g. 8500"
              value={formData.areaValue}
              onChange={(e) => setFormData((prev) => ({ ...prev, areaValue: e.target.value }))}
            />
            <Select
              label="Unit"
              id="modal-proj-area-unit"
              value={formData.areaUnit || 'SQFT'}
              onChange={(e) => setFormData((prev) => ({ ...prev, areaUnit: e.target.value }))}
              options={[
                { value: 'SQFT', label: 'Sq. Ft.' },
                { value: 'SQM', label: 'Sq. M.' },
                { value: 'SQYD', label: 'Sq. Yd.' },
                { value: 'ACRE', label: 'Acres' },
                { value: 'GUNTHA', label: 'Guntha' }
              ]}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <Select
            label="Project Manager"
            id="modal-proj-manager"
            value={formData.managerId}
            onChange={(e) => setFormData((prev) => ({ ...prev, managerId: e.target.value }))}
            placeholder="Select Project Manager..."
            options={usersDirectory}
          />
          <Input
            label="Target Handover Date"
            id="modal-proj-handover"
            type="date"
            value={formData.plannedEndDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, plannedEndDate: e.target.value }))}
          />
        </div>

        <div className="form-grid-2">
          <Input
            label="Project Tags"
            id="modal-proj-tags"
            placeholder="e.g. Luxury, High-Rise (comma separated)"
            value={formData.tags}
            onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
          />
          <Select
            label="Status"
            id="modal-proj-status"
            value={formData.status || 'NOT_STARTED'}
            onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
            options={[
              { value: 'NOT_STARTED', label: 'Not Started' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'ON_HOLD', label: 'On Hold' }
            ]}
          />
        </div>

        <div className="form-grid-1">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="form-label" htmlFor="modal-proj-desc">
              Project Scope / Notes (Optional)
            </label>
            <textarea
              id="modal-proj-desc"
              className="form-input"
              style={{ height: '70px', padding: '10px 14px', resize: 'vertical' }}
              placeholder="Brief architectural scope, spatial concept, or client requirements..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>

        {!projectToEdit && (
          <div className="form-grid-1">
            <label className="project-checkbox-label">
              <input
                type="checkbox"
                checked={formData.applyDefaultStagesOnInit}
                onChange={(e) => setFormData((prev) => ({ ...prev, applyDefaultStagesOnInit: e.target.checked }))}
              />
              <span>
                <strong>Auto-generate standard architectural drawing stages</strong> (Concept, Schematic, Design Development, Working Drawings, GFC)
              </span>
            </label>
          </div>
        )}

        <div className="form-actions-row">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={saving}
          >
            {projectToEdit ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export default ProjectModal;

