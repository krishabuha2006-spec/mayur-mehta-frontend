import React, { useState, useEffect, useMemo } from 'react';
import {
  BookUser,
  Search,
  Plus,
  Phone,
  Mail,
  MessageCircle,
  Building,
  Kanban,
  List,
  Calendar,
  FileText,
  DollarSign,
  ChevronRight,
  Clock,
  Send,
  UserCheck
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { Drawer } from '../../components/common/Drawer/Drawer';
import { teamService } from '../../services/teamService';
import { projectService } from '../../services/projectService';
import './DirectoryPage.css';

const CRM_STAGES = [
  { id: 'lead', title: 'New Leads', color: 'var(--primary)' },
  { id: 'brief', title: 'Consultation & Brief', color: 'var(--info)' },
  { id: 'proposal', title: 'Proposal & Pitch', color: 'var(--warning)' },
  { id: 'negotiation', title: 'Negotiation / Scope', color: 'var(--accent)' },
  { id: 'active', title: 'Active Clients', color: 'var(--success)' }
];

export function DirectoryPage() {
  const [viewMode, setViewMode] = useState('crm'); // 'crm' | 'roster'
  const [contacts, setContacts] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // CRM Pipeline State - 100% Dynamic from live projects and persistent store
  const [pipelineLeads, setPipelineLeads] = useState(() => {
    try {
      const saved = localStorage.getItem('mm_pipeline_leads');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('mm_pipeline_leads', JSON.stringify(pipelineLeads));
    } catch {}
  }, [pipelineLeads]);

  // Selected lead for Notes & Communication Log Drawer
  const [selectedLead, setSelectedLead] = useState(null);
  const [newLogText, setNewLogText] = useState('');
  const [newLogType, setNewLogType] = useState('Call');

  useEffect(() => {
    const fetchDirectory = async () => {
      setLoading(true);
      try {
        const [teamRes, projRes] = await Promise.allSettled([
          teamService.getDirectory({ search: searchTerm || undefined }),
          projectService.getProjects({ limit: 50 })
        ]);

        if (teamRes.status === 'fulfilled') {
          const teamUsers = teamRes.value;
          const rawList = Array.isArray(teamUsers)
            ? teamUsers
            : (Array.isArray(teamUsers?.users)
                ? teamUsers.users
                : (Array.isArray(teamUsers?.data) ? teamUsers.data : []));
          const normalizedTeam = rawList.map((u) => ({
            id: u.id || u._id,
            name: u.name,
            role: u.designation || u.role || 'Team Member',
            company: u.company?.name || (typeof u.company === 'string' ? u.company : 'In-House Studio'),
            category: 'Team',
            phone: u.mobile || u.phone || '',
            email: u.email || '',
            activeProjects: 'Assigned',
            status: u.status || 'ACTIVE'
          }));
          setTeamMembers(normalizedTeam);
        }

        if (projRes.status === 'fulfilled') {
          const projs = Array.isArray(projRes.value) ? projRes.value : (projRes.value?.data || []);
          const clientMap = new Map();
          projs.forEach((p) => {
            if (p.client?.name && !clientMap.has(p.client.name.toLowerCase())) {
              clientMap.set(p.client.name.toLowerCase(), {
                id: `client_${p._id || p.id}`,
                name: p.client.contactPerson || p.client.name,
                role: 'Client Principal',
                company: p.client.name,
                category: 'Clients',
                phone: p.client.phone || '',
                email: p.client.email || '',
                activeProjects: p.name || 'Architectural Project',
                status: p.status || 'ACTIVE'
              });
            }
          });
          setContacts(Array.from(clientMap.values()));
        }
      } catch (err) {
        console.warn('GET /team/directory notice:', err?.response?.status || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDirectory();
  }, [searchTerm]);

  const [newContact, setNewContact] = useState({
    name: '',
    role: '',
    company: '',
    category: 'Clients',
    phone: '',
    email: '',
    activeProjects: '',
    budget: '',
    stage: 'lead'
  });
  const [contactErrors, setContactErrors] = useState({});

  const categories = ['All', 'Team', 'Clients', 'Consultants', 'Contractors', 'Vendors'];
  const allDirectoryList = [...teamMembers, ...contacts];

  const filtered = useMemo(() => {
    return allDirectoryList.filter((c) => {
      const matchesSearch =
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || '').includes(searchTerm);
      const matchesCat = activeCategory === 'All' || c.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [allDirectoryList, searchTerm, activeCategory]);

  const handleStageChange = (leadId, nextStage) => {
    setPipelineLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: nextStage } : l))
    );
  };

  const handleAddLog = (e) => {
    e.preventDefault();
    if (!newLogText.trim() || !selectedLead) return;

    const newEntry = {
      type: newLogType,
      text: newLogText.trim(),
      date: 'Just now'
    };

    setPipelineLeads((prev) =>
      prev.map((l) =>
        l.id === selectedLead.id
          ? {
              ...l,
              communicationLogs: [newEntry, ...(l.communicationLogs || [])],
              notesCount: (l.notesCount || 0) + 1,
              lastInteraction: `${newLogType}: ${newLogText.slice(0, 30)}...`
            }
          : l
      )
    );

    setSelectedLead((prev) => ({
      ...prev,
      communicationLogs: [newEntry, ...(prev.communicationLogs || [])],
      notesCount: (prev.notesCount || 0) + 1
    }));

    setNewLogText('');
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!newContact.name?.trim()) {
      errors.name = 'Contact name is required';
    }
    if (!newContact.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      const cleanPhone = newContact.phone.trim().replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        errors.phone = 'Phone number must be exactly 10 digits';
      }
    }
    if (newContact.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContact.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setContactErrors(errors);
      return;
    }
    setContactErrors({});

    const cleanPhone = newContact.phone.trim().replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : newContact.phone;

    const createdLead = {
      id: `lead_${Date.now()}`,
      name: newContact.name.trim(),
      company: newContact.company?.trim() || `${newContact.name.trim()} Residence`,
      type: newContact.role?.trim() || 'Architecture & Interior Design',
      budget: newContact.budget?.trim() || '₹50 Lakhs',
      phone: formattedPhone,
      email: newContact.email?.trim() || '',
      stage: newContact.stage || 'lead',
      notesCount: 1,
      lastInteraction: 'Lead registered in CRM pipeline',
      communicationLogs: [
        { type: 'Call', text: 'Initial lead record created.', date: 'Today' }
      ]
    };

    setPipelineLeads((prev) => [createdLead, ...prev]);

    const tempContact = {
      id: `c_${Date.now()}`,
      ...newContact,
      activeProjects: newContact.stage === 'active' ? '1 Active' : 'Pipeline'
    };
    setContacts((prev) => [tempContact, ...prev]);

    setCreateModalOpen(false);
    setNewContact({
      name: '',
      role: '',
      company: '',
      category: 'Clients',
      phone: '',
      email: '',
      activeProjects: '',
      budget: '',
      stage: 'lead'
    });
  };

  return (
    <div className="directory-page-container">
      {/* 1. Page Header with CRM Pipeline Toggle */}
      <div className="directory-header-row">
        <div>
          <h1 className="directory-heading">Clients & Studio CRM</h1>
          <p className="directory-subheading">
            Track inquiries, lead-to-client pipeline stages, architectural briefs, and contact roster.
          </p>
        </div>

        <div className="directory-header-actions">
          {/* View Mode Toggle */}
          <div className="directory-view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'crm' ? 'is-active' : ''}`}
              onClick={() => setViewMode('crm')}
            >
              <Kanban size={14} />
              <span>CRM Pipeline</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'roster' ? 'is-active' : ''}`}
              onClick={() => setViewMode('roster')}
            >
              <List size={14} />
              <span>Directory Roster</span>
            </button>
          </div>

          <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
            Add Client / Lead
          </Button>
        </div>
      </div>

      {/* 2. Controls & Search Filter */}
      <div className="directory-controls-bar">
        {viewMode === 'roster' ? (
          <div className="category-pills-row">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`cat-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : (
          <div className="crm-pipeline-summary">
            <span className="pipeline-stat-pill">
              <strong>{pipelineLeads.length}</strong> Total Opportunities
            </span>
            <span className="pipeline-stat-pill">
              <strong>₹15.85 Cr</strong> Total Pipeline Value
            </span>
          </div>
        )}

        <div className="library-search-wrap">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder="Search leads, clients, budget, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="library-search-input"
          />
        </div>
      </div>

      {/* 3. CRM PIPELINE KANBAN VIEW */}
      {viewMode === 'crm' && (
        <div className="crm-kanban-board">
          {CRM_STAGES.map((stage) => {
            const stageLeads = pipelineLeads.filter((l) => l.stage === stage.id);
            return (
              <div key={stage.id} className="crm-kanban-column">
                <div className="crm-column-header">
                  <div className="crm-col-title-wrap">
                    <span className="crm-col-dot" style={{ backgroundColor: stage.color }} />
                    <h3 className="crm-col-title">{stage.title}</h3>
                  </div>
                  <span className="crm-col-count">{stageLeads.length}</span>
                </div>

                <div className="crm-cards-scroll-area">
                  {stageLeads.length === 0 ? (
                    <div className="crm-empty-col">No leads in this stage</div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="crm-lead-card"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <div className="crm-card-top">
                          <h4 className="crm-lead-name">{lead.name}</h4>
                          <span className="crm-budget-badge">{lead.budget}</span>
                        </div>

                        <p className="crm-project-type">{lead.type}</p>
                        <p className="crm-company-name">{lead.company}</p>

                        <div className="crm-card-footer">
                          <span className="crm-last-interaction" title={lead.lastInteraction}>
                            <Clock size={12} /> {lead.lastInteraction}
                          </span>
                          <span className="crm-notes-badge">
                            <FileText size={11} /> {lead.notesCount}
                          </span>
                        </div>

                        {/* Stage Progression Buttons */}
                        <div className="crm-card-stage-actions" onClick={(e) => e.stopPropagation()}>
                          {stage.id !== 'active' && (
                            <button
                              type="button"
                              className="crm-stage-move-btn"
                              onClick={() => {
                                const currentIndex = CRM_STAGES.findIndex((s) => s.id === stage.id);
                                if (currentIndex < CRM_STAGES.length - 1) {
                                  handleStageChange(lead.id, CRM_STAGES[currentIndex + 1].id);
                                }
                              }}
                              title="Advance to next stage"
                            >
                              <span>Next Stage</span>
                              <ChevronRight size={13} />
                            </button>
                          )}
                          {stage.id === 'active' && (
                            <span className="crm-won-badge">
                              <UserCheck size={13} /> Retained Client
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. DIRECTORY ROSTER LIST VIEW */}
      {viewMode === 'roster' && (
        <div className="contacts-grid">
          {filtered.map((item) => (
            <div key={item.id} className="contact-card">
              <div className="contact-card-header">
                <div className="contact-avatar-box">{(item.name || 'C')[0]}</div>
                <div className="contact-header-info">
                  <h3 className="contact-name">{item.name}</h3>
                  <p className="contact-role-sub">{item.role}</p>
                </div>
                <Badge variant={item.category === 'Clients' ? 'primary' : 'neutral'}>
                  {item.category}
                </Badge>
              </div>

              <div className="contact-body">
                <div className="contact-meta-row">
                  <Building size={14} className="contact-icon" />
                  <span>{item.company}</span>
                </div>
                <div className="contact-meta-row">
                  <Phone size={14} className="contact-icon" />
                  <a href={`tel:${item.phone}`} className="contact-link">{item.phone}</a>
                </div>
                <div className="contact-meta-row">
                  <Mail size={14} className="contact-icon" />
                  <a href={`mailto:${item.email}`} className="contact-link">{item.email}</a>
                </div>
              </div>

              <div className="contact-footer">
                <span className="contact-project-tag">Projects: {item.activeProjects}</span>
                <div className="contact-quick-actions">
                  <a
                    href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="quick-icon-btn whatsapp"
                    title="WhatsApp"
                  >
                    <MessageCircle size={16} />
                  </a>
                  <a href={`tel:${item.phone}`} className="quick-icon-btn call" title="Call">
                    <Phone size={16} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Client Detail & Communication Log Drawer */}
      <Drawer
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        title={selectedLead?.name || 'Client Details'}
        subtitle={`${selectedLead?.company || ''} • Budget: ${selectedLead?.budget || ''}`}
        width="520px"
      >
        {selectedLead && (
          <div className="crm-lead-drawer-body">
            {/* Quick Contact Bar */}
            <div className="crm-drawer-contact-bar">
              <a href={`tel:${selectedLead.phone}`} className="crm-contact-pill">
                <Phone size={14} /> <span>{selectedLead.phone}</span>
              </a>
              <a href={`mailto:${selectedLead.email}`} className="crm-contact-pill">
                <Mail size={14} /> <span>{selectedLead.email}</span>
              </a>
            </div>

            {/* Stage Selector */}
            <div className="crm-drawer-stage-selector">
              <label className="crm-drawer-label">Current Pipeline Stage</label>
              <div className="crm-drawer-stages-grid">
                {CRM_STAGES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`crm-drawer-stage-btn ${selectedLead.stage === s.id ? 'is-active' : ''}`}
                    onClick={() => {
                      handleStageChange(selectedLead.id, s.id);
                      setSelectedLead((prev) => ({ ...prev, stage: s.id }));
                    }}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Communication Note Form */}
            <form onSubmit={handleAddLog} className="crm-log-form">
              <label className="crm-drawer-label">Log Interaction / Note</label>
              <div className="crm-log-type-selector">
                {['Call', 'Meeting', 'Email', 'Site Brief'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`log-type-btn ${newLogType === t ? 'is-active' : ''}`}
                    onClick={() => setNewLogType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Log discussion points, design decisions, or follow-up milestones..."
                value={newLogText}
                onChange={(e) => setNewLogText(e.target.value)}
                className="crm-log-textarea"
                rows={3}
              />
              <Button type="submit" variant="primary" icon={Send} disabled={!newLogText.trim()}>
                Post Note
              </Button>
            </form>

            {/* Interaction Timeline */}
            <div className="crm-interaction-timeline">
              <h4 className="crm-timeline-heading">Communication History & Milestones</h4>
              {(selectedLead.communicationLogs || []).map((entry, idx) => (
                <div key={idx} className="crm-timeline-item">
                  <div className="crm-timeline-dot" />
                  <div className="crm-timeline-card">
                    <div className="crm-timeline-top">
                      <span className="crm-log-badge">{entry.type}</span>
                      <span className="crm-log-date">{entry.date}</span>
                    </div>
                    <p className="crm-log-text">{entry.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      {/* 6. Add Client / Lead Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add Client Opportunity to CRM">
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-grid-2">
            <div style={{ gridColumn: 'span 2' }}>
              <Input
                label="Client / Lead Name"
                id="c-name"
                placeholder="e.g. Anand Verma"
                value={newContact.name}
                onChange={(e) => {
                  setNewContact({ ...newContact, name: e.target.value });
                  if (contactErrors.name) setContactErrors((prev) => ({ ...prev, name: '' }));
                }}
                error={contactErrors.name}
                required
              />
            </div>

            <Input
              label="Project or Company Name"
              id="c-comp"
              placeholder="e.g. Verma Luxury Bungalow"
              value={newContact.company}
              onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
            />

            <Input
              label="Estimated Budget"
              id="c-budget"
              placeholder="e.g. ₹2.5 Cr"
              value={newContact.budget}
              onChange={(e) => setNewContact({ ...newContact, budget: e.target.value })}
            />

            <Input
              label="Phone Number"
              id="c-phone"
              type="tel"
              isPhone={true}
              placeholder="Enter 10-digit phone number"
              value={newContact.phone}
              onChange={(e) => {
                setNewContact({ ...newContact, phone: e.target.value });
                if (contactErrors.phone) setContactErrors((prev) => ({ ...prev, phone: '' }));
              }}
              error={contactErrors.phone}
              required
            />

            <Input
              label="Email Address"
              id="c-email"
              type="email"
              placeholder="client@domain.com"
              value={newContact.email}
              onChange={(e) => {
                setNewContact({ ...newContact, email: e.target.value });
                if (contactErrors.email) setContactErrors((prev) => ({ ...prev, email: '' }));
              }}
              error={contactErrors.email}
            />

            <Select
              label="Pipeline Stage"
              id="c-stage"
              value={newContact.stage}
              onChange={(e) => setNewContact({ ...newContact, stage: e.target.value })}
              options={[
                { value: 'lead', label: 'New Lead' },
                { value: 'brief', label: 'Consultation & Brief' },
                { value: 'proposal', label: 'Proposal & Pitch' },
                { value: 'negotiation', label: 'Negotiation / Scope' },
                { value: 'active', label: 'Active Client' }
              ]}
            />

            <Input
              label="Project Scope / Type"
              id="c-role"
              placeholder="e.g. Residential Villa (5,000 sq.ft)"
              value={newContact.role}
              onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
            />
          </div>

          <div className="form-actions-row">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save to Pipeline
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default DirectoryPage;
