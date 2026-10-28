import React, { useState, useEffect } from 'react';
import {
  X,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Maximize2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { Button } from '../Button/Button';
import { masterService } from '../../../services/masterService';
import { teamService } from '../../../services/teamService';
import './QuickAddDrawer.css';

export function QuickAddDrawer({ isOpen, onClose, onSaveSuccess }) {
  const [taskType, setTaskType] = useState('');
  const [taskDescriptionType, setTaskDescriptionType] = useState('');
  const [descriptionContent, setDescriptionContent] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dependency, setDependency] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [additionalDetailsOpen, setAdditionalDetailsOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [checklistItems, setChecklistItems] = useState(['Review CAD floor plan', 'Confirm material specs']);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dynamic lists from backend APIs (M1.4 & M1.5)
  const [taskTypes, setTaskTypes] = useState([
    { id: 'architectural_drawing', name: 'Architectural Drawing' },
    { id: 'interior_design', name: 'Interior Design' },
    { id: 'site_inspection', name: 'Site Inspection' },
    { id: 'client_revision', name: 'Client Revision' },
    { id: 'structural_review', name: 'Structural Review' }
  ]);

  const [teamMembers, setTeamMembers] = useState([
    { id: 'dummy_designer', name: 'Dummy Designer (Lead Architect)' },
    { id: 'aarav_sharma', name: 'Aarav Sharma (Senior Architect)' },
    { id: 'priya_patel', name: 'Priya Patel (3D Visualizer)' },
    { id: 'rohan_mehta', name: 'Rohan Mehta (Site Engineer)' }
  ]);

  useEffect(() => {
    if (!isOpen) return;

    // Load master task types (M1.5 GET /master/TASK_TYPE)
    const loadTaskTypes = async () => {
      try {
        const types = await masterService.getItemsByType('TASK_TYPE');
        if (Array.isArray(types) && types.length > 0) {
          setTaskTypes(types.map((t) => ({ id: t.name || t.code, name: t.name || t.code })));
        }
      } catch (err) {
        console.warn('QuickAddDrawer master types notice:', err.message);
      }
    };
    loadTaskTypes();

    // Load active directory (M1.4 GET /team/directory)
    const loadDirectory = async () => {
      try {
        const res = await teamService.getDirectory();
        const users = Array.isArray(res) ? res : (res?.data || res?.users || []);
        if (users.length > 0) {
          setTeamMembers(
            users.map((u) => ({
              id: u.id || u.email,
              name: `${u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}${u.role ? ` (${u.role})` : ''}`
            }))
          );
        }
      } catch (err) {
        console.warn('QuickAddDrawer team directory notice:', err.message);
      }
    };
    loadDirectory();
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!taskType) {
      return;
    }

    setSaving(true);
    // Simulate save
    setTimeout(() => {
      setSaving(false);
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    }, 400);
  };

  const addChecklistItem = () => {
    if (!newCheckItem.trim()) return;
    setChecklistItems([...checklistItems, newCheckItem.trim()]);
    setNewCheckItem('');
  };

  return (
    <div className="quickadd-backdrop" onClick={onClose}>
      <div className="quickadd-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="quickadd-header">
          <h3 className="quickadd-title">Create Task</h3>
          <button type="button" className="quickadd-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="quickadd-body">
          {/* 1. Select Task Type */}
          <div className="quickadd-field">
            <select
              className={`quickadd-select ${submitted && !taskType ? 'has-error' : ''}`}
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
            >
              <option value="" disabled>Select Task Type</option>
              {taskTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {submitted && !taskType && (
              <span className="quickadd-required-text">Required</span>
            )}
          </div>

          {/* 2. Select Task Description dropdown */}
          <div className="quickadd-field">
            <select
              className="quickadd-select"
              value={taskDescriptionType}
              onChange={(e) => setTaskDescriptionType(e.target.value)}
            >
              <option value="" disabled>Select Task Description</option>
              <option value="elevation_detail">G+2 Elevation Detailed Section</option>
              <option value="electrical_layout">Electrical & HVAC Layout Plan</option>
              <option value="woodwork_schedule">Modular Woodwork & Finishes Schedule</option>
              <option value="bill_of_quantities">BOQ & Procurement Estimation</option>
            </select>
          </div>

          {/* 3. Rich Text Formatting Toolbar & Text Area */}
          <div className="quickadd-editor-container">
            <div className="quickadd-editor-toolbar">
              <button type="button" className="toolbar-btn" title="Bold"><Bold size={15} /></button>
              <button type="button" className="toolbar-btn" title="Italic"><Italic size={15} /></button>
              <button type="button" className="toolbar-btn" title="Underline"><Underline size={15} /></button>
              <button type="button" className="toolbar-btn" title="Bullet List"><List size={15} /></button>
              <button type="button" className="toolbar-btn" title="Numbered List"><ListOrdered size={15} /></button>
              <button type="button" className="toolbar-btn" title="Expand Fullscreen"><Maximize2 size={15} /></button>
            </div>
            <textarea
              className="quickadd-editor-textarea"
              placeholder="Enter comprehensive instructions, architectural drawing references, or client revision notes..."
              value={descriptionContent}
              onChange={(e) => setDescriptionContent(e.target.value)}
              rows={5}
            />
          </div>

          {/* 4. Select Assignee */}
          <div className="quickadd-field">
            <select
              className="quickadd-select"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="" disabled>Select Assignee</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Select Task Dependency */}
          <div className="quickadd-field">
            <select
              className="quickadd-select"
              value={dependency}
              onChange={(e) => setDependency(e.target.value)}
            >
              <option value="" disabled>Select Task Dependency</option>
              <option value="none">No Dependency</option>
              <option value="structural_signoff">Awaiting Structural Consultant Signoff</option>
              <option value="client_advance">Awaiting Advance Client Approval</option>
              <option value="site_survey">Awaiting Topographic Site Survey</option>
            </select>
          </div>

          {/* 6. Dates Row: Start Date & Deadline */}
          <div className="quickadd-dates-row">
            <div className="date-input-wrap">
              <input
                type="date"
                className="quickadd-date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Select Start Date"
              />
              <Calendar size={16} className="date-calendar-icon" />
            </div>

            <div className="date-input-wrap">
              <input
                type="date"
                className="quickadd-date-input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="Select Deadline"
              />
              <Calendar size={16} className="date-calendar-icon" />
            </div>
          </div>

          {/* 7. Collapsible Accordion: Additional Details */}
          <div className="quickadd-accordion">
            <button
              type="button"
              className="accordion-header"
              onClick={() => setAdditionalDetailsOpen(!additionalDetailsOpen)}
            >
              <span>Additional Details</span>
              {additionalDetailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {additionalDetailsOpen && (
              <div className="accordion-content">
                <input
                  type="text"
                  className="quickadd-select"
                  placeholder="Estimated Hours / Budget Allotment"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 8. Collapsible Accordion: Check List */}
          <div className="quickadd-accordion">
            <button
              type="button"
              className="accordion-header"
              onClick={() => setChecklistOpen(!checklistOpen)}
            >
              <span>Check List ({checklistItems.length})</span>
              {checklistOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {checklistOpen && (
              <div className="accordion-content">
                <ul className="checklist-items">
                  {checklistItems.map((item, idx) => (
                    <li key={idx} className="checklist-item">
                      <span className="checklist-bullet">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="checklist-add-row">
                  <input
                    type="text"
                    className="quickadd-select"
                    placeholder="Add checklist milestone..."
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                  />
                  <Button size="sm" variant="secondary" onClick={addChecklistItem}>
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 9. Bottom Actions: Close & Save */}
          <div className="quickadd-actions-footer">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="quickadd-action-btn"
            >
              Close
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              className="quickadd-action-btn"
            >
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
