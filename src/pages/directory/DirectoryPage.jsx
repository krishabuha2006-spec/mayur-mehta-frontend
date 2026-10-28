import React, { useState, useEffect } from 'react';
import {
  BookUser,
  Search,
  Plus,
  Phone,
  Mail,
  MessageCircle,
  Building,
  MoreVertical
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { teamService } from '../../services/teamService';
import './DirectoryPage.css';

export function DirectoryPage() {
  const [contacts, setContacts] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    const fetchDirectory = async () => {
      setLoading(true);
      try {
        const teamUsers = await teamService.getDirectory({ search: searchTerm || undefined });
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
      } catch (err) {
        console.warn('GET /team/directory API notice:', err?.response?.status || err.message);
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
    activeProjects: ''
  });

  const categories = ['All', 'Team', 'Clients', 'Consultants', 'Contractors', 'Vendors'];

  const allDirectoryList = [...teamMembers, ...contacts];

  const filtered = allDirectoryList.filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm);
    const matchesCat = activeCategory === 'All' || c.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newContact.name) return;
    setContacts([{ id: `c_${Date.now()}`, ...newContact }, ...contacts]);
    setCreateModalOpen(false);
    setNewContact({
      name: '',
      role: '',
      company: '',
      category: 'Clients',
      phone: '',
      email: '',
      activeProjects: ''
    });
  };

  return (
    <div className="directory-page-container">
      <div className="directory-header-row">
        <div>
          <h1 className="directory-heading">Professional Directory</h1>
          <p className="directory-subheading">Centralized contact roster for clients, structural consultants, civil contractors, and material vendors</p>
        </div>

        <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
          Add Contact
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="directory-controls-bar">
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

        <div className="library-search-wrap">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder="Search contacts by name, role, firm, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="library-search-input"
          />
        </div>
      </div>

      {/* Contacts Cards Grid */}
      <div className="contacts-grid">
        {filtered.map((item) => (
          <div key={item.id} className="contact-card">
            <div className="contact-card-header">
              <div className="contact-avatar-box">
                {(item.name || 'C')[0]}
              </div>
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

      {/* Add Contact Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add Directory Contact">
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <Input
            label="Full Name"
            id="c-name"
            placeholder="Enter full name"
            value={newContact.name}
            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
            <Select
              label="Category"
              id="c-cat"
              value={newContact.category}
              onChange={(e) => setNewContact({ ...newContact, category: e.target.value })}
              options={[
                { value: 'Clients', label: 'Clients', sublabel: 'Project Owners & Key Stakeholders' },
                { value: 'Consultants', label: 'Consultants', sublabel: 'Structural, MEP, Landscape' },
                { value: 'Contractors', label: 'Contractors', sublabel: 'Civil, Electrical, Carpentry' },
                { value: 'Vendors', label: 'Vendors', sublabel: 'Material Suppliers & Fabricators' }
              ]}
            />


            <Input
              label="Role / Designation"
              id="c-role"
              placeholder="Enter profession or role"
              value={newContact.role}
              onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
            <Input
              label="Phone Number"
              id="c-phone"
              placeholder="Enter phone number"
              value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              required
            />

            <Input
              label="Email Address"
              id="c-email"
              type="email"
              placeholder="Enter email address"
              value={newContact.email}
              onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
            />
          </div>

          <Input
            label="Firm / Company Name"
            id="c-comp"
            placeholder="Enter firm or agency name"
            value={newContact.company}
            onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
          />

          <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Save Contact
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
