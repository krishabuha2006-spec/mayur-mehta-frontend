import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Building2,
  Briefcase,
  UserCheck,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Share2,
  Download,
  Upload,
  ShieldAlert,
  Edit2,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
  RotateCw,
  Copy,
  Check,
  FileSpreadsheet,
  Link,
  Unlink,
  Send,
  Globe,
  AlertTriangle,
  FolderKanban,
  Sparkles
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { directoryService } from '../../services/directoryService';
import { masterService } from '../../services/masterService';
import { projectService } from '../../services/projectService';
import { teamService } from '../../services/teamService';
import { extractErrorMessage } from '../../utils/errorHandler';
import { useAuth } from '../../hooks/useAuth';
import './DirectoryPage.css';

export function DirectoryPage() {
  const { user } = useAuth();

  // Active Tab: 'clients' | 'partners' | 'employees' | 'projects'
  const [activeTab, setActiveTab] = useState('clients');

  // View Mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState('grid');

  // Loading States
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [subFilter, setSubFilter] = useState('ALL');

  // Data Collections
  const [summary, setSummary] = useState({
    totalClients: 0,
    totalPartners: 0,
    totalEmployees: 0,
    activeClients: 0,
    activePartners: 0,
    activeEmployees: 0
  });

  const [clients, setClients] = useState([]);
  const [partners, setPartners] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectPartners, setProjectPartners] = useState([]);
  const [projectDetails, setProjectDetails] = useState(null);

  // Master Items Lookups
  const [acvcCategories, setAcvcCategories] = useState([]);
  const [trades, setTrades] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // In-App Notification / Toast
  const [notice, setNotice] = useState(null);

  const showNotice = (message, type = 'info') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 5000);
  };

  // Modals Visibility
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [anonymiseModalOpen, setAnonymiseModalOpen] = useState(false);
  const [userLinkModalOpen, setUserLinkModalOpen] = useState(false);

  // Active item in modal
  const [editingItem, setEditingItem] = useState(null);
  const [activeShareTarget, setActiveShareTarget] = useState(null);
  const [copiedText, setCopiedText] = useState(false);
  const [shareResult, setShareResult] = useState(null);
  const [linkSuggestions, setLinkSuggestions] = useState([]);
  const [selectedUserIdToLink, setSelectedUserIdToLink] = useState('');

  // CSV Import State
  const [importFile, setImportFile] = useState(null);
  const [importDryRun, setImportDryRun] = useState(true);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  // Client Form State
  const [clientForm, setClientForm] = useState({
    type: 'INDIVIDUAL',
    name: '',
    phone: '',
    isWhatsApp: true,
    email: '',
    addressLine1: '',
    city: '',
    state: '',
    pincode: '',
    mapLink: '',
    relationshipManagerId: '',
    gstNumber: '',
    notes: '',
    tags: ''
  });

  // Partner Form State
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    acvcCategoryId: '',
    tradeIds: [],
    phone: '',
    isWhatsApp: true,
    email: '',
    website: '',
    city: '',
    addressLine1: '',
    mapLink: '',
    gstNumber: '',
    notes: '',
    tags: ''
  });

  // Employee Form State
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    employmentType: 'FULL_TIME',
    designationId: '',
    phone: '',
    workEmail: '',
    city: '',
    reportsToEmployeeId: '',
    dateOfJoining: '',
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    notes: ''
  });

  // Project Associate Partner Form
  const [assocPartnerForm, setAssocPartnerForm] = useState({
    partnerId: '',
    role: '',
    note: ''
  });

  // =========================================================================
  // 1. DATA FETCHING
  // =========================================================================

  const fetchSummary = async () => {
    try {
      const data = await directoryService.getSummary();
      if (data) setSummary(data);
    } catch (err) {
      console.warn('GET /directory/summary notice:', err?.message);
    }
  };

  const fetchClients = useCallback(async () => {
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (subFilter !== 'ALL') params.type = subFilter;

      const items = await directoryService.getClients(params);
      setClients(Array.isArray(items) ? items : []);
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to fetch clients', 'error');
    }
  }, [searchTerm, statusFilter, subFilter]);

  const fetchPartners = useCallback(async () => {
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (subFilter !== 'ALL') params.acvcCategoryId = subFilter;

      const items = await directoryService.getPartners(params);
      setPartners(Array.isArray(items) ? items : []);
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to fetch ACVC partners', 'error');
    }
  }, [searchTerm, statusFilter, subFilter]);

  const fetchEmployees = useCallback(async () => {
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (subFilter !== 'ALL') params.employmentType = subFilter;

      const items = await directoryService.getEmployees(params);
      setEmployees(Array.isArray(items) ? items : []);
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to fetch employees', 'error');
    }
  }, [searchTerm, statusFilter, subFilter]);

  const fetchProjects = async () => {
    try {
      const res = await projectService.getProjects({ limit: 100 });
      const items = Array.isArray(res) ? res : (res?.projects || res?.data || []);
      setProjectsList(items);
      if (items.length > 0 && !selectedProjectId) {
        setSelectedProjectId(items[0]._id || items[0].id);
      }
    } catch (err) {
      console.warn('GET /projects notice:', err?.message);
    }
  };

  const fetchProjectDetailsAndPartners = async (projId) => {
    if (!projId) return;
    try {
      const [projRes, partnersRes] = await Promise.allSettled([
        projectService.getProjectById(projId),
        directoryService.getProjectPartners(projId)
      ]);

      if (projRes.status === 'fulfilled') {
        setProjectDetails(projRes.value);
      }
      if (partnersRes.status === 'fulfilled') {
        setProjectPartners(Array.isArray(partnersRes.value) ? partnersRes.value : []);
      }
    } catch (err) {
      console.warn('Project partners fetch notice:', err?.message);
    }
  };

  const fetchMasterLookups = async () => {
    try {
      const [catRes, tradeRes, desigRes, teamRes] = await Promise.allSettled([
        masterService.getItemsByType('ACVC_CATEGORY'),
        masterService.getItemsByType('TRADE'),
        masterService.getItemsByType('DESIGNATION'),
        teamService.getUsers({ limit: 100 })
      ]);

      if (catRes.status === 'fulfilled') {
        setAcvcCategories(Array.isArray(catRes.value) ? catRes.value : (catRes.value?.items || []));
      }
      if (tradeRes.status === 'fulfilled') {
        setTrades(Array.isArray(tradeRes.value) ? tradeRes.value : (tradeRes.value?.items || []));
      }
      if (desigRes.status === 'fulfilled') {
        setDesignations(Array.isArray(desigRes.value) ? desigRes.value : (desigRes.value?.items || []));
      }
      if (teamRes.status === 'fulfilled') {
        const rawUsers = teamRes.value;
        const usersList = Array.isArray(rawUsers) ? rawUsers : (rawUsers?.users || rawUsers?.data || []);
        setTeamMembers(usersList);
      }
    } catch (err) {
      console.warn('Master lookups fetch notice:', err?.message);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchSummary();
    fetchMasterLookups();
    fetchProjects();
  }, []);

  // Tab & Filter Reactive Fetch
  useEffect(() => {
    setLoading(true);
    if (activeTab === 'clients') {
      fetchClients().finally(() => setLoading(false));
    } else if (activeTab === 'partners') {
      fetchPartners().finally(() => setLoading(false));
    } else if (activeTab === 'employees') {
      fetchEmployees().finally(() => setLoading(false));
    } else if (activeTab === 'projects') {
      if (selectedProjectId) {
        fetchProjectDetailsAndPartners(selectedProjectId).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [activeTab, fetchClients, fetchPartners, fetchEmployees, selectedProjectId]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      fetchSummary(),
      activeTab === 'clients' ? fetchClients() : null,
      activeTab === 'partners' ? fetchPartners() : null,
      activeTab === 'employees' ? fetchEmployees() : null,
      activeTab === 'projects' && selectedProjectId ? fetchProjectDetailsAndPartners(selectedProjectId) : null
    ]);
    setRefreshing(false);
  };

  // =========================================================================
  // 2. CLIENT ACTIONS
  // =========================================================================

  const handleOpenCreateClient = () => {
    setEditingItem(null);
    setClientForm({
      type: 'INDIVIDUAL',
      name: '',
      phone: '',
      isWhatsApp: true,
      email: '',
      addressLine1: '',
      city: '',
      state: '',
      pincode: '',
      mapLink: '',
      relationshipManagerId: '',
      gstNumber: '',
      notes: '',
      tags: ''
    });
    setClientModalOpen(true);
  };

  const handlePreFillClientSample = () => {
    setClientForm({
      type: 'INDIVIDUAL',
      name: 'Dr. Aarav Singhania',
      phone: '9825123456',
      isWhatsApp: true,
      email: 'aarav.singhania@example.com',
      addressLine1: 'Villa 14, Royal Palm Residency',
      city: 'Surat',
      state: 'Gujarat',
      pincode: '395007',
      mapLink: 'https://maps.google.com/?q=Surat',
      relationshipManagerId: teamMembers[0]?._id || teamMembers[0]?.id || '',
      gstNumber: '24AAAAA0000A1Z5',
      notes: 'Penthouse interior with Italian marble and warm bespoke teak furniture.',
      tags: 'Luxury, Penthouse, Residential'
    });
  };

  const handleOpenEditClient = (client) => {
    setEditingItem(client);
    setClientForm({
      type: client.type || 'INDIVIDUAL',
      name: client.name || '',
      phone: client.phones?.[0]?.number || '',
      isWhatsApp: client.phones?.[0]?.isWhatsApp ?? true,
      email: client.emails?.[0]?.address || '',
      addressLine1: client.address?.line1 || '',
      city: client.address?.city || '',
      state: client.address?.state || '',
      pincode: client.address?.pincode || '',
      mapLink: client.mapLink || '',
      relationshipManagerId: client.relationshipManagerId || '',
      gstNumber: client.gstNumber || '',
      notes: client.notes || '',
      tags: Array.isArray(client.tags) ? client.tags.join(', ') : ''
    });
    setClientModalOpen(true);
  };

  const handleSubmitClient = async (e) => {
    e.preventDefault();
    if (!clientForm.name.trim()) {
      showNotice('Client name is required', 'error');
      return;
    }

    const payload = {
      type: clientForm.type,
      name: clientForm.name.trim(),
      phones: clientForm.phone.trim() ? [{
        number: clientForm.phone.trim(),
        label: 'Primary',
        isWhatsApp: Boolean(clientForm.isWhatsApp)
      }] : [],
      emails: clientForm.email.trim() ? [{
        address: clientForm.email.trim(),
        label: 'Primary'
      }] : [],
      address: {
        line1: clientForm.addressLine1.trim(),
        city: clientForm.city.trim(),
        state: clientForm.state.trim(),
        pincode: clientForm.pincode.trim(),
        country: 'India'
      },
      mapLink: clientForm.mapLink.trim() || undefined,
      relationshipManagerId: clientForm.relationshipManagerId || undefined,
      gstNumber: clientForm.gstNumber.trim() || undefined,
      notes: clientForm.notes.trim() || undefined,
      tags: clientForm.tags ? clientForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
    };

    try {
      if (editingItem) {
        await directoryService.updateClient(editingItem._id || editingItem.id, payload);
        showNotice(`Client "${payload.name}" updated successfully.`, 'success');
      } else {
        await directoryService.createClient(payload);
        showNotice(`Client "${payload.name}" created successfully.`, 'success');
      }
      setClientModalOpen(false);
      fetchClients();
      fetchSummary();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to save client', 'error');
    }
  };

  const handleToggleClientStatus = async (client) => {
    const newStatus = client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await directoryService.updateClientStatus(client._id || client.id, newStatus);
      showNotice(`Client status set to ${newStatus}.`, 'success');
      fetchClients();
      fetchSummary();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to update status', 'error');
    }
  };

  const handleDeleteClient = async (client) => {
    if (!window.confirm(`Are you sure you want to delete client "${client.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await directoryService.deleteClient(client._id || client.id);
      showNotice(`Client "${client.name}" deleted.`, 'success');
      fetchClients();
      fetchSummary();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to delete client', 'error');
    }
  };

  // =========================================================================
  // 3. ACVC PARTNER ACTIONS
  // =========================================================================

  const handleOpenCreatePartner = () => {
    setEditingItem(null);
    setPartnerForm({
      name: '',
      acvcCategoryId: acvcCategories[0]?._id || acvcCategories[0]?.id || '',
      tradeIds: [],
      phone: '',
      isWhatsApp: true,
      email: '',
      website: '',
      city: '',
      addressLine1: '',
      mapLink: '',
      gstNumber: '',
      notes: '',
      tags: ''
    });
    setPartnerModalOpen(true);
  };

  const handlePreFillPartnerSample = () => {
    setPartnerForm({
      name: 'Apex Electricals & Automation',
      acvcCategoryId: acvcCategories[0]?._id || acvcCategories[0]?.id || '',
      tradeIds: trades.slice(0, 2).map((t) => t._id || t.id),
      phone: '9898011223',
      isWhatsApp: true,
      email: 'contact@apexelectricals.in',
      website: 'www.apexelectricals.in',
      city: 'Surat',
      addressLine1: 'Plot 42, GIDC Industrial Estate',
      mapLink: 'https://maps.google.com/?q=Surat',
      gstNumber: '24AAACE1234F1Z9',
      notes: 'Specialist in smart home automation, architectural recessed LED profiles, and HT panels.',
      tags: 'Electrical, Automation, Contractor'
    });
  };

  const handleOpenEditPartner = (partner) => {
    setEditingItem(partner);
    setPartnerForm({
      name: partner.name || '',
      acvcCategoryId: partner.acvcCategoryId?._id || partner.acvcCategoryId || '',
      tradeIds: Array.isArray(partner.tradeIds)
        ? partner.tradeIds.map((t) => (typeof t === 'object' ? t._id || t.id : t))
        : [],
      phone: partner.phones?.[0]?.number || '',
      isWhatsApp: partner.phones?.[0]?.isWhatsApp ?? true,
      email: partner.emails?.[0]?.address || '',
      website: partner.website || '',
      city: partner.address?.city || '',
      addressLine1: partner.address?.line1 || '',
      mapLink: partner.mapLink || '',
      gstNumber: partner.gstNumber || '',
      notes: partner.notes || '',
      tags: Array.isArray(partner.tags) ? partner.tags.join(', ') : ''
    });
    setPartnerModalOpen(true);
  };

  const handleSubmitPartner = async (e) => {
    e.preventDefault();
    if (!partnerForm.name.trim()) {
      showNotice('Partner name is required', 'error');
      return;
    }

    const payload = {
      name: partnerForm.name.trim(),
      acvcCategoryId: partnerForm.acvcCategoryId || undefined,
      tradeIds: partnerForm.tradeIds,
      phones: partnerForm.phone.trim() ? [{
        number: partnerForm.phone.trim(),
        label: 'Work',
        isWhatsApp: Boolean(partnerForm.isWhatsApp)
      }] : [],
      emails: partnerForm.email.trim() ? [{
        address: partnerForm.email.trim(),
        label: 'Work'
      }] : [],
      website: partnerForm.website.trim() || undefined,
      address: {
        line1: partnerForm.addressLine1.trim(),
        city: partnerForm.city.trim(),
        country: 'India'
      },
      mapLink: partnerForm.mapLink.trim() || undefined,
      gstNumber: partnerForm.gstNumber.trim() || undefined,
      notes: partnerForm.notes.trim() || undefined,
      tags: partnerForm.tags ? partnerForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
    };

    try {
      if (editingItem) {
        await directoryService.updatePartner(editingItem._id || editingItem.id, payload);
        showNotice(`ACVC Partner "${payload.name}" updated.`, 'success');
      } else {
        await directoryService.createPartner(payload);
        showNotice(`ACVC Partner "${payload.name}" registered.`, 'success');
      }
      setPartnerModalOpen(false);
      fetchPartners();
      fetchSummary();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to save ACVC partner', 'error');
    }
  };

  const handleTogglePartnerStatus = async (partner) => {
    const newStatus = partner.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await directoryService.updatePartnerStatus(partner._id || partner.id, newStatus);
      showNotice(`Partner status changed to ${newStatus}.`, 'success');
      fetchPartners();
      fetchSummary();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to change status', 'error');
    }
  };

  const handleDeletePartner = async (partner) => {
    if (!window.confirm(`Are you sure you want to remove partner "${partner.name}"?`)) {
      return;
    }
    try {
      await directoryService.deletePartner(partner._id || partner.id);
      showNotice(`Partner "${partner.name}" deleted.`, 'success');
      fetchPartners();
      fetchSummary();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to delete partner', 'error');
    }
  };

  // =========================================================================
  // 4. EMPLOYEE ACTIONS & USER LINKING
  // =========================================================================

  const handleOpenCreateEmployee = () => {
    setEditingItem(null);
    setEmployeeForm({
      name: '',
      employmentType: 'FULL_TIME',
      designationId: designations[0]?._id || designations[0]?.id || '',
      phone: '',
      workEmail: '',
      city: '',
      reportsToEmployeeId: '',
      dateOfJoining: '',
      emergencyName: '',
      emergencyRelation: '',
      emergencyPhone: '',
      notes: ''
    });
    setEmployeeModalOpen(true);
  };

  const handlePreFillEmployeeSample = () => {
    setEmployeeForm({
      name: 'Harsh Vardhan',
      employmentType: 'FULL_TIME',
      designationId: designations[0]?._id || designations[0]?.id || '',
      phone: '9879055443',
      workEmail: 'harsh.vardhan@mayurmehta.com',
      city: 'Surat',
      reportsToEmployeeId: '',
      dateOfJoining: new Date().toISOString().slice(0, 10),
      emergencyName: 'Priya Vardhan',
      emergencyRelation: 'Spouse',
      emergencyPhone: '9879055444',
      notes: 'Senior Site Coordinator & 3D Visualizer'
    });
  };

  const handleOpenEditEmployee = (emp) => {
    setEditingItem(emp);
    setEmployeeForm({
      name: emp.name || '',
      employmentType: emp.employmentType || 'FULL_TIME',
      designationId: emp.designationId?._id || emp.designationId || '',
      phone: emp.phones?.[0]?.number || '',
      workEmail: emp.workEmail || '',
      city: emp.city || '',
      reportsToEmployeeId: emp.reportsToEmployeeId?._id || emp.reportsToEmployeeId || '',
      dateOfJoining: emp.dateOfJoining ? emp.dateOfJoining.slice(0, 10) : '',
      emergencyName: emp.emergencyContact?.name || '',
      emergencyRelation: emp.emergencyContact?.relation || '',
      emergencyPhone: emp.emergencyContact?.phone || '',
      notes: emp.notes || ''
    });
    setEmployeeModalOpen(true);
  };

  const handleSubmitEmployee = async (e) => {
    e.preventDefault();
    if (!employeeForm.name.trim()) {
      showNotice('Employee name is required', 'error');
      return;
    }

    const payload = {
      name: employeeForm.name.trim(),
      employmentType: employeeForm.employmentType,
      designationId: employeeForm.designationId || undefined,
      phones: employeeForm.phone.trim() ? [{
        number: employeeForm.phone.trim(),
        label: 'Mobile'
      }] : [],
      workEmail: employeeForm.workEmail.trim() || undefined,
      city: employeeForm.city.trim() || undefined,
      reportsToEmployeeId: employeeForm.reportsToEmployeeId || undefined,
      dateOfJoining: employeeForm.dateOfJoining || undefined,
      emergencyContact: employeeForm.emergencyName.trim() ? {
        name: employeeForm.emergencyName.trim(),
        relation: employeeForm.emergencyRelation.trim(),
        phone: employeeForm.emergencyPhone.trim()
      } : undefined,
      notes: employeeForm.notes.trim() || undefined
    };

    try {
      if (editingItem) {
        await directoryService.updateEmployee(editingItem._id || editingItem.id, payload);
        showNotice(`Employee "${payload.name}" updated.`, 'success');
      } else {
        await directoryService.createEmployee(payload);
        showNotice(`Employee "${payload.name}" created.`, 'success');
      }
      setEmployeeModalOpen(false);
      fetchEmployees();
      fetchSummary();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to save employee', 'error');
    }
  };

  const handleToggleEmployeeStatus = async (emp) => {
    const newStatus = emp.status === 'ACTIVE' ? 'FORMER' : 'ACTIVE';
    try {
      await directoryService.updateEmployeeStatus(emp._id || emp.id, newStatus);
      showNotice(`Employee status changed to ${newStatus}.`, 'success');
      fetchEmployees();
      fetchSummary();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to change employee status', 'error');
    }
  };

  const handleDeleteEmployee = async (emp) => {
    if (!window.confirm(`Are you sure you want to delete employee record "${emp.name}"?`)) {
      return;
    }
    try {
      await directoryService.deleteEmployee(emp._id || emp.id);
      showNotice(`Employee "${emp.name}" deleted.`, 'success');
      fetchEmployees();
      fetchSummary();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to delete employee', 'error');
    }
  };

  const handleOpenUserLink = async (emp) => {
    setEditingItem(emp);
    setSelectedUserIdToLink('');
    setUserLinkModalOpen(true);
    try {
      const suggestions = await directoryService.getEmployeeUserLinkSuggestions(emp._id || emp.id);
      setLinkSuggestions(Array.isArray(suggestions) ? suggestions : []);
    } catch {
      setLinkSuggestions([]);
    }
  };

  const handleLinkUser = async (userIdToUse) => {
    const targetUserId = userIdToUse || selectedUserIdToLink;
    if (!targetUserId) {
      showNotice('Please select an app user account to link', 'error');
      return;
    }
    try {
      await directoryService.linkEmployeeUser(editingItem._id || editingItem.id, targetUserId);
      showNotice('Employee linked to app user successfully.', 'success');
      setUserLinkModalOpen(false);
      fetchEmployees();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to link user account', 'error');
    }
  };

  const handleUnlinkUser = async (emp) => {
    if (!window.confirm(`Unlink app user from employee "${emp.name}"?`)) return;
    try {
      await directoryService.unlinkEmployeeUser(emp._id || emp.id);
      showNotice('Employee unlinked from app user.', 'success');
      fetchEmployees();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to unlink user account', 'error');
    }
  };

  const handleInviteEmployee = async (emp) => {
    try {
      await directoryService.inviteEmployee(emp._id || emp.id);
      showNotice(`App invitation email sent to ${emp.workEmail || emp.name}.`, 'success');
      fetchEmployees();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to send app invitation', 'error');
    }
  };

  // =========================================================================
  // 5. CONTACT SHARING & VCARD 3.0
  // =========================================================================

  const handleOpenShare = (kind, item) => {
    setActiveShareTarget({ kind, item });
    setShareResult(null);
    setCopiedText(false);
    setShareModalOpen(true);
  };

  const handleShareChannel = async (channel) => {
    if (!activeShareTarget) return;
    try {
      const result = await directoryService.shareContact(
        activeShareTarget.kind,
        activeShareTarget.item._id || activeShareTarget.item.id,
        channel
      );
      setShareResult(result);
      if (result?.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to generate share link', 'error');
    }
  };

  const handleCopyShareText = () => {
    if (!shareResult?.formattedText) return;
    navigator.clipboard.writeText(shareResult.formattedText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handleDownloadVCard = async (kind, item) => {
    try {
      const code = item.code || 'contact';
      const cleanName = (item.name || 'contact').replace(/\s+/g, '_');
      await directoryService.downloadVCard(kind, item._id || item.id, `${code}_${cleanName}.vcf`);
      showNotice('vCard downloaded successfully.', 'success');
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to download vCard', 'error');
    }
  };

  // =========================================================================
  // 6. CSV IMPORT & EXPORT
  // =========================================================================

  const handleExportCsv = async () => {
    try {
      await directoryService.exportCsv(activeTab);
      showNotice(`${activeTab.toUpperCase()} directory exported to CSV.`, 'success');
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'CSV Export failed', 'error');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await directoryService.downloadImportTemplate(activeTab);
      showNotice(`Sample import template for ${activeTab.toUpperCase()} downloaded.`, 'success');
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to download template', 'error');
    }
  };

  const handleExecuteImport = async () => {
    if (!importFile) {
      showNotice('Please select a CSV file to import', 'error');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const result = await directoryService.importCsv(activeTab, importFile, importDryRun);
      setImportResult(result);
      if (!importDryRun) {
        showNotice(`Import successful! ${result?.importedCount || 0} records imported.`, 'success');
        setImportModalOpen(false);
        handleRefreshAll();
      }
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  // =========================================================================
  // 7. GDPR ANONYMISATION
  // =========================================================================

  const handleOpenAnonymise = (kind, item) => {
    setActiveShareTarget({ kind, item });
    setAnonymiseModalOpen(true);
  };

  const handleConfirmAnonymise = async () => {
    if (!activeShareTarget) return;
    try {
      await directoryService.anonymise(
        activeShareTarget.kind,
        activeShareTarget.item._id || activeShareTarget.item.id
      );
      showNotice('Record permanently anonymised per privacy regulations.', 'success');
      setAnonymiseModalOpen(false);
      handleRefreshAll();
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Anonymisation failed', 'error');
    }
  };

  // =========================================================================
  // 8. PROJECT DIRECTORY INTEGRATION
  // =========================================================================

  const handleLinkClientToProject = async (clientId, copyAddress) => {
    if (!selectedProjectId || !clientId) return;
    try {
      await directoryService.linkProjectClient(selectedProjectId, clientId, copyAddress);
      showNotice('Client linked to project successfully.', 'success');
      fetchProjectDetailsAndPartners(selectedProjectId);
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to link client to project', 'error');
    }
  };

  const handleUnlinkClientFromProject = async () => {
    if (!selectedProjectId) return;
    if (!window.confirm('Unlink client from this project?')) return;
    try {
      await directoryService.unlinkProjectClient(selectedProjectId);
      showNotice('Client unlinked from project.', 'success');
      fetchProjectDetailsAndPartners(selectedProjectId);
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to unlink client', 'error');
    }
  };

  const handleAddPartnerToProject = async (e) => {
    e.preventDefault();
    if (!selectedProjectId || !assocPartnerForm.partnerId) {
      showNotice('Please select an ACVC partner', 'error');
      return;
    }
    try {
      await directoryService.addProjectPartner(selectedProjectId, {
        partnerId: assocPartnerForm.partnerId,
        role: assocPartnerForm.role.trim() || undefined,
        note: assocPartnerForm.note.trim() || undefined
      });
      showNotice('Partner associated with project.', 'success');
      setAssocPartnerForm({ partnerId: '', role: '', note: '' });
      fetchProjectDetailsAndPartners(selectedProjectId);
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to add partner to project', 'error');
    }
  };

  const handleRemoveProjectPartner = async (partnerId) => {
    if (!selectedProjectId) return;
    if (!window.confirm('Remove this partner from project?')) return;
    try {
      await directoryService.removeProjectPartner(selectedProjectId, partnerId);
      showNotice('Partner removed from project.', 'success');
      fetchProjectDetailsAndPartners(selectedProjectId);
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to remove partner', 'error');
    }
  };

  const handleShareProjectSite = async (channel = 'whatsapp') => {
    if (!selectedProjectId) return;
    try {
      const res = await directoryService.shareProjectSite(selectedProjectId, channel);
      if (res?.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        showNotice('Project site details copied/generated.', 'success');
      }
    } catch (err) {
      showNotice(extractErrorMessage(err) || 'Failed to share project site', 'error');
    }
  };

  // Helper getters
  const getPrimaryPhone = (item) => {
    if (item.phones && item.phones.length > 0) return item.phones[0];
    if (item.phone) return { number: item.phone, isWhatsApp: true };
    return null;
  };

  const getPrimaryEmail = (item) => {
    if (item.emails && item.emails.length > 0) return item.emails[0]?.address;
    if (item.workEmail) return item.workEmail;
    if (item.email) return item.email;
    return null;
  };

  return (
    <div className="directory-page-container">
      {/* Notice Toast Banner */}
      {notice && (
        <div className={`directory-notice-banner ${notice.type}`} role="status">
          <AlertTriangle size={16} />
          <span>{notice.message}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="directory-header-row">
        <div className="directory-heading-group">
          <h1 className="directory-heading">Company Directory</h1>
          <p className="directory-subheading">
            Centralized directory for Clients, ACVC Partners (Agencies, Contractors, Vendors, Consultants) & Employees
          </p>
        </div>

        <div className="directory-header-actions">
          <Button
            variant="secondary"
            size="md"
            icon={RotateCw}
            loading={refreshing}
            onClick={handleRefreshAll}
            title="Sync directory records"
          >
            Sync
          </Button>

          {activeTab !== 'projects' && (
            <>
              <Button
                variant="secondary"
                size="md"
                icon={Download}
                onClick={handleExportCsv}
                title="Export records to CSV"
              >
                Export CSV
              </Button>

              <Button
                variant="secondary"
                size="md"
                icon={Upload}
                onClick={() => {
                  setImportFile(null);
                  setImportResult(null);
                  setImportModalOpen(true);
                }}
                title="Bulk CSV Import"
              >
                Import CSV
              </Button>
            </>
          )}

          {activeTab === 'clients' && (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={handleOpenCreateClient}
            >
              Add Client
            </Button>
          )}

          {activeTab === 'partners' && (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={handleOpenCreatePartner}
            >
              Add Partner
            </Button>
          )}

          {activeTab === 'employees' && (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={handleOpenCreateEmployee}
            >
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="directory-summary-grid">
        <div className="directory-metric-card">
          <div className="directory-metric-icon-wrap gold">
            <Users size={24} />
          </div>
          <div className="directory-metric-info">
            <span className="directory-metric-val">{summary.totalClients || clients.length || 0}</span>
            <span className="directory-metric-lbl">Total Clients ({summary.activeClients || clients.filter(c => c.status === 'ACTIVE').length || 0} Active)</span>
          </div>
        </div>

        <div className="directory-metric-card">
          <div className="directory-metric-icon-wrap stone">
            <Building2 size={24} />
          </div>
          <div className="directory-metric-info">
            <span className="directory-metric-val">{summary.totalPartners || partners.length || 0}</span>
            <span className="directory-metric-lbl">ACVC Partners ({summary.activePartners || partners.filter(p => p.status === 'ACTIVE').length || 0} Active)</span>
          </div>
        </div>

        <div className="directory-metric-card">
          <div className="directory-metric-icon-wrap sage">
            <Briefcase size={24} />
          </div>
          <div className="directory-metric-info">
            <span className="directory-metric-val">{summary.totalEmployees || employees.length || 0}</span>
            <span className="directory-metric-lbl">Staff Employees ({summary.activeEmployees || employees.filter(e => e.status === 'ACTIVE').length || 0} Active)</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="directory-tabs-bar">
        <button
          type="button"
          className={`directory-tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => { setActiveTab('clients'); setSubFilter('ALL'); }}
        >
          <Users size={16} /> Clients
          <span className="directory-tab-count">{clients.length}</span>
        </button>

        <button
          type="button"
          className={`directory-tab-btn ${activeTab === 'partners' ? 'active' : ''}`}
          onClick={() => { setActiveTab('partners'); setSubFilter('ALL'); }}
        >
          <Building2 size={16} /> ACVC Partners
          <span className="directory-tab-count">{partners.length}</span>
        </button>

        <button
          type="button"
          className={`directory-tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => { setActiveTab('employees'); setSubFilter('ALL'); }}
        >
          <Briefcase size={16} /> Staff Employees
          <span className="directory-tab-count">{employees.length}</span>
        </button>

        <button
          type="button"
          className={`directory-tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <FolderKanban size={16} /> Project Links & Partners
        </button>
      </div>

      {/* Toolbar / Search / Filters (when not in project links view) */}
      {activeTab !== 'projects' && (
        <div className="directory-toolbar">
          <div className="directory-search-box">
            <Search size={16} color="#7B6F62" />
            <input
              type="text"
              placeholder={`Search ${activeTab} by name, phone, email, city...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="directory-filter-group">
            {/* Status Filter */}
            <select
              className="directory-select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value={activeTab === 'employees' ? 'FORMER' : 'INACTIVE'}>
                {activeTab === 'employees' ? 'Former' : 'Inactive'}
              </option>
            </select>

            {/* Sub-Filters */}
            {activeTab === 'clients' && (
              <select
                className="directory-select-filter"
                value={subFilter}
                onChange={(e) => setSubFilter(e.target.value)}
              >
                <option value="ALL">All Client Types</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="COMPANY">Company</option>
              </select>
            )}

            {activeTab === 'partners' && (
              <select
                className="directory-select-filter"
                value={subFilter}
                onChange={(e) => setSubFilter(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {acvcCategories.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {activeTab === 'employees' && (
              <select
                className="directory-select-filter"
                value={subFilter}
                onChange={(e) => setSubFilter(e.target.value)}
              >
                <option value="ALL">All Employment Types</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="INTERN">Intern</option>
                <option value="CONTRACT">Contract</option>
              </select>
            )}

            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                title="Grid Cards"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                title="Table View"
                onClick={() => setViewMode('table')}
              >
                <TableIcon size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 1: CLIENTS
          ========================================================================= */}
      {activeTab === 'clients' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#7B6F62' }}>Loading clients from database...</div>
          ) : clients.length === 0 ? (
            <div className="directory-empty-card">
              <div className="directory-empty-icon">
                <Users size={32} />
              </div>
              <h3 className="directory-empty-title">No Clients Found</h3>
              <p className="directory-empty-desc">
                Add your architectural and interior clients to manage contact cards, vCards, and project assignments.
              </p>
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={handleOpenCreateClient}
              >
                Add First Client
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="directory-grid">
              {clients.map((c) => {
                const phone = getPrimaryPhone(c);
                const email = getPrimaryEmail(c);
                const isAnon = Boolean(c.isAnonymised);

                return (
                  <div key={c._id || c.id} className={`directory-entry-card ${isAnon ? 'anonymised' : ''}`}>
                    <div className="card-top-row">
                      <div className="card-title-group">
                        <div className="card-avatar gold">
                          {c.name ? c.name[0]?.toUpperCase() : 'C'}
                        </div>
                        <div className="card-name-wrap">
                          <span className="card-code">{c.code || 'CLT-0000'}</span>
                          <span className="card-name">{c.name}</span>
                        </div>
                      </div>

                      <div className="card-badges-row">
                        <span className={`status-pill ${isAnon ? 'anonymised' : c.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                          {isAnon ? 'Anonymised' : c.status || 'ACTIVE'}
                        </span>
                        <span className="status-pill inactive" style={{ fontSize: '11px' }}>
                          {c.type || 'INDIVIDUAL'}
                        </span>
                      </div>
                    </div>

                    <div className="card-meta-list">
                      {phone && (
                        <div className="meta-item">
                          <Phone size={13} />
                          {phone.isWhatsApp ? (
                            <a
                              href={`https://wa.me/${phone.number.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="meta-link"
                              title="Chat on WhatsApp"
                            >
                              {phone.number} (WhatsApp) <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span>{phone.number}</span>
                          )}
                        </div>
                      )}

                      {email && (
                        <div className="meta-item">
                          <Mail size={13} />
                          <a href={`mailto:${email}`} className="meta-link">
                            {email}
                          </a>
                        </div>
                      )}

                      {(c.address?.city || c.address?.line1) && (
                        <div className="meta-item">
                          <MapPin size={13} />
                          <span>{[c.address?.city, c.address?.state].filter(Boolean).join(', ')}</span>
                          {c.mapLink && (
                            <a href={c.mapLink} target="_blank" rel="noreferrer" className="meta-link" style={{ marginLeft: '4px' }}>
                              Maps <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      )}

                      {c.gstNumber && (
                        <div className="meta-item">
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>GST:</span>
                          <span>{c.gstNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="card-actions-row">
                      <div className="card-action-btn-group">
                        <button
                          type="button"
                          className="action-btn-subtle"
                          title="Share Contact Details"
                          onClick={() => handleOpenShare('clients', c)}
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-subtle"
                          title="Download vCard (.vcf)"
                          onClick={() => handleDownloadVCard('clients', c)}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-subtle"
                          title="Edit Client"
                          disabled={isAnon}
                          onClick={() => handleOpenEditClient(c)}
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>

                      <div className="card-action-btn-group">
                        <button
                          type="button"
                          className="action-btn-subtle"
                          title={c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          disabled={isAnon}
                          onClick={() => handleToggleClientStatus(c)}
                        >
                          <Check size={14} color={c.status === 'ACTIVE' ? '#2E7D32' : '#7B6F62'} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-subtle danger"
                          title="Anonymise (GDPR)"
                          disabled={isAnon}
                          onClick={() => handleOpenAnonymise('clients', c)}
                        >
                          <ShieldAlert size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-subtle danger"
                          title="Delete Client"
                          onClick={() => handleDeleteClient(c)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="directory-table-wrap">
              <table className="directory-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name & Type</th>
                    <th>Contact</th>
                    <th>Location / Map</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => {
                    const phone = getPrimaryPhone(c);
                    const email = getPrimaryEmail(c);
                    const isAnon = Boolean(c.isAnonymised);

                    return (
                      <tr key={c._id || c.id}>
                        <td><span className="card-code">{c.code}</span></td>
                        <td>
                          <strong>{c.name}</strong>
                          <div style={{ fontSize: '11px', color: '#7B6F62' }}>{c.type}</div>
                        </td>
                        <td>
                          {phone && <div>{phone.number}</div>}
                          {email && <div style={{ fontSize: '12px', color: '#7B6F62' }}>{email}</div>}
                        </td>
                        <td>
                          <div>{[c.address?.city, c.address?.state].filter(Boolean).join(', ') || '-'}</div>
                          {c.mapLink && (
                            <a href={c.mapLink} target="_blank" rel="noreferrer" className="meta-link" style={{ fontSize: '11px' }}>
                              Maps <ExternalLink size={10} />
                            </a>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill ${isAnon ? 'anonymised' : c.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                            {isAnon ? 'Anonymised' : c.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="card-action-btn-group" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="action-btn-subtle" title="Share" onClick={() => handleOpenShare('clients', c)}>
                              <Share2 size={13} />
                            </button>
                            <button type="button" className="action-btn-subtle" title="Download vCard" onClick={() => handleDownloadVCard('clients', c)}>
                              <Download size={13} />
                            </button>
                            <button type="button" className="action-btn-subtle" title="Edit" disabled={isAnon} onClick={() => handleOpenEditClient(c)}>
                              <Edit2 size={13} />
                            </button>
                            <button type="button" className="action-btn-subtle danger" title="Delete" onClick={() => handleDeleteClient(c)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          TAB 2: ACVC PARTNERS
          ========================================================================= */}
      {activeTab === 'partners' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#7B6F62' }}>Loading ACVC partners from database...</div>
          ) : partners.length === 0 ? (
            <div className="directory-empty-card">
              <div className="directory-empty-icon">
                <Building2 size={32} />
              </div>
              <h3 className="directory-empty-title">No ACVC Partners Registered</h3>
              <p className="directory-empty-desc">
                Register Agencies, Contractors, Vendors, and Consultants to associate them with project sites and procurement.
              </p>
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={handleOpenCreatePartner}
              >
                Add First ACVC Partner
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="directory-grid">
              {partners.map((p) => {
                const phone = getPrimaryPhone(p);
                const email = getPrimaryEmail(p);
                const isAnon = Boolean(p.isAnonymised);
                const catName = p.acvcCategoryId?.name || 'Partner';

                return (
                  <div key={p._id || p.id} className={`directory-entry-card ${isAnon ? 'anonymised' : ''}`}>
                    <div className="card-top-row">
                      <div className="card-title-group">
                        <div className="card-avatar stone">
                          {p.name ? p.name[0]?.toUpperCase() : 'P'}
                        </div>
                        <div className="card-name-wrap">
                          <span className="card-code">{p.code || 'PTN-0000'}</span>
                          <span className="card-name">{p.name}</span>
                        </div>
                      </div>

                      <div className="card-badges-row">
                        <span className={`status-pill ${isAnon ? 'anonymised' : p.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                          {isAnon ? 'Anonymised' : p.status || 'ACTIVE'}
                        </span>
                        <span className="status-pill active" style={{ fontSize: '11px' }}>
                          {catName}
                        </span>
                      </div>
                    </div>

                    <div className="card-meta-list">
                      {phone && (
                        <div className="meta-item">
                          <Phone size={13} />
                          {phone.isWhatsApp ? (
                            <a
                              href={`https://wa.me/${phone.number.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="meta-link"
                            >
                              {phone.number} (WhatsApp) <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span>{phone.number}</span>
                          )}
                        </div>
                      )}

                      {email && (
                        <div className="meta-item">
                          <Mail size={13} />
                          <a href={`mailto:${email}`} className="meta-link">{email}</a>
                        </div>
                      )}

                      {p.website && (
                        <div className="meta-item">
                          <Globe size={13} />
                          <a href={p.website.startsWith('http') ? p.website : `https://${p.website}`} target="_blank" rel="noreferrer" className="meta-link">
                            {p.website} <ExternalLink size={10} />
                          </a>
                        </div>
                      )}

                      {(p.address?.city || p.address?.line1) && (
                        <div className="meta-item">
                          <MapPin size={13} />
                          <span>{p.address?.city || p.address?.line1}</span>
                          {p.mapLink && (
                            <a href={p.mapLink} target="_blank" rel="noreferrer" className="meta-link" style={{ marginLeft: '4px' }}>
                              Maps <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="card-actions-row">
                      <div className="card-action-btn-group">
                        <button
                          type="button"
                          className="action-btn-subtle"
                          title="Share Contact"
                          onClick={() => handleOpenShare('partners', p)}
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-subtle"
                          title="Download vCard (.vcf)"
                          onClick={() => handleDownloadVCard('partners', p)}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-subtle"
                          title="Edit Partner"
                          disabled={isAnon}
                          onClick={() => handleOpenEditPartner(p)}
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>

                      <div className="card-action-btn-group">
                        <button
                          type="button"
                          className="action-btn-subtle"
                          title={p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          disabled={isAnon}
                          onClick={() => handleTogglePartnerStatus(p)}
                        >
                          <Check size={14} color={p.status === 'ACTIVE' ? '#2E7D32' : '#7B6F62'} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-subtle danger"
                          title="Anonymise (GDPR)"
                          disabled={isAnon}
                          onClick={() => handleOpenAnonymise('partners', p)}
                        >
                          <ShieldAlert size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-subtle danger"
                          title="Delete Partner"
                          onClick={() => handleDeletePartner(p)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="directory-table-wrap">
              <table className="directory-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Partner & Category</th>
                    <th>Contact</th>
                    <th>Location / Website</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((p) => {
                    const phone = getPrimaryPhone(p);
                    const email = getPrimaryEmail(p);
                    const isAnon = Boolean(p.isAnonymised);
                    const catName = p.acvcCategoryId?.name || 'Partner';

                    return (
                      <tr key={p._id || p.id}>
                        <td><span className="card-code">{p.code}</span></td>
                        <td>
                          <strong>{p.name}</strong>
                          <div style={{ fontSize: '11px', color: '#7B6F62' }}>{catName}</div>
                        </td>
                        <td>
                          {phone && <div>{phone.number}</div>}
                          {email && <div style={{ fontSize: '12px', color: '#7B6F62' }}>{email}</div>}
                        </td>
                        <td>
                          <div>{p.address?.city || '-'}</div>
                          {p.website && (
                            <a href={p.website} target="_blank" rel="noreferrer" className="meta-link" style={{ fontSize: '11px' }}>
                              Website <ExternalLink size={10} />
                            </a>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill ${isAnon ? 'anonymised' : p.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                            {isAnon ? 'Anonymised' : p.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="card-action-btn-group" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="action-btn-subtle" title="Share" onClick={() => handleOpenShare('partners', p)}>
                              <Share2 size={13} />
                            </button>
                            <button type="button" className="action-btn-subtle" title="Download vCard" onClick={() => handleDownloadVCard('partners', p)}>
                              <Download size={13} />
                            </button>
                            <button type="button" className="action-btn-subtle" title="Edit" disabled={isAnon} onClick={() => handleOpenEditPartner(p)}>
                              <Edit2 size={13} />
                            </button>
                            <button type="button" className="action-btn-subtle danger" title="Delete" onClick={() => handleDeletePartner(p)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          TAB 3: EMPLOYEES & STAFF
          ========================================================================= */}
      {activeTab === 'employees' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#7B6F62' }}>Loading staff employees from database...</div>
          ) : employees.length === 0 ? (
            <div className="directory-empty-card">
              <div className="directory-empty-icon">
                <Briefcase size={32} />
              </div>
              <h3 className="directory-empty-title">No Employees Found</h3>
              <p className="directory-empty-desc">
                Manage internal architects, designers, draftsmen, and site engineers with employment history and user links.
              </p>
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={handleOpenCreateEmployee}
              >
                Add First Employee
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="directory-grid">
              {employees.map((emp) => {
                const phone = getPrimaryPhone(emp);
                const isAnon = Boolean(emp.isAnonymised);
                const desigName = emp.designationId?.name || 'Staff';
                const isLinked = Boolean(emp.userId);

                return (
                  <div key={emp._id || emp.id} className={`directory-entry-card ${isAnon ? 'anonymised' : ''}`}>
                    <div className="card-top-row">
                      <div className="card-title-group">
                        <div className="card-avatar sage">
                          {emp.name ? emp.name[0]?.toUpperCase() : 'E'}
                        </div>
                        <div className="card-name-wrap">
                          <span className="card-code">{emp.code || 'EMP-0000'}</span>
                          <span className="card-name">{emp.name}</span>
                        </div>
                      </div>

                      <div className="card-badges-row">
                        <span className={`status-pill ${isAnon ? 'anonymised' : emp.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                          {isAnon ? 'Anonymised' : emp.status || 'ACTIVE'}
                        </span>
                        <span className="status-pill active" style={{ fontSize: '11px' }}>
                          {emp.employmentType || 'FULL_TIME'}
                        </span>
                      </div>
                    </div>

                    <div className="card-meta-list">
                      <div className="meta-item">
                        <Briefcase size={13} />
                        <span><strong>{desigName}</strong></span>
                      </div>

                      {emp.workEmail && (
                        <div className="meta-item">
                          <Mail size={13} />
                          <a href={`mailto:${emp.workEmail}`} className="meta-link">{emp.workEmail}</a>
                        </div>
                      )}

                      {phone && (
                        <div className="meta-item">
                          <Phone size={13} />
                          <span>{phone.number}</span>
                        </div>
                      )}

                      {emp.city && (
                        <div className="meta-item">
                          <MapPin size={13} />
                          <span>{emp.city}</span>
                        </div>
                      )}

                      <div className="meta-item" style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #E8E3DB' }}>
                        <UserCheck size={13} color={isLinked ? '#2E7D32' : '#7B6F62'} />
                        {isLinked ? (
                          <span style={{ color: '#2E7D32', fontSize: '12px', fontWeight: 600 }}>Linked to App User</span>
                        ) : (
                          <span style={{ color: '#7B6F62', fontSize: '12px' }}>Unlinked Account</span>
                        )}
                      </div>
                    </div>

                    <div className="card-actions-row">
                      <div className="card-action-btn-group">
                        {isLinked ? (
                          <button
                            type="button"
                            className="action-btn-subtle"
                            title="Unlink App User Account"
                            onClick={() => handleUnlinkUser(emp)}
                          >
                            <Unlink size={14} color="#C62828" />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="action-btn-subtle"
                              title="Link App User Account"
                              onClick={() => handleOpenUserLink(emp)}
                            >
                              <Link size={14} />
                            </button>
                            {emp.workEmail && (
                              <button
                                type="button"
                                className="action-btn-subtle"
                                title="Invite to Workspace"
                                onClick={() => handleInviteEmployee(emp)}
                              >
                                <Send size={13} />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          type="button"
                          className="action-btn-subtle"
                          title="Share Contact"
                          onClick={() => handleOpenShare('employees', emp)}
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-subtle"
                          title="Download vCard (.vcf)"
                          onClick={() => handleDownloadVCard('employees', emp)}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-subtle"
                          title="Edit Employee"
                          disabled={isAnon}
                          onClick={() => handleOpenEditEmployee(emp)}
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>

                      <div className="card-action-btn-group">
                        <button
                          type="button"
                          className="action-btn-subtle"
                          title={emp.status === 'ACTIVE' ? 'Mark Former' : 'Mark Active'}
                          disabled={isAnon}
                          onClick={() => handleToggleEmployeeStatus(emp)}
                        >
                          <Check size={14} color={emp.status === 'ACTIVE' ? '#2E7D32' : '#7B6F62'} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-subtle danger"
                          title="Anonymise (GDPR)"
                          disabled={isAnon}
                          onClick={() => handleOpenAnonymise('employees', emp)}
                        >
                          <ShieldAlert size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-subtle danger"
                          title="Delete Employee"
                          onClick={() => handleDeleteEmployee(emp)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="directory-table-wrap">
              <table className="directory-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name & Designation</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>App User Link</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const phone = getPrimaryPhone(emp);
                    const isAnon = Boolean(emp.isAnonymised);
                    const desigName = emp.designationId?.name || 'Staff';
                    const isLinked = Boolean(emp.userId);

                    return (
                      <tr key={emp._id || emp.id}>
                        <td><span className="card-code">{emp.code}</span></td>
                        <td>
                          <strong>{emp.name}</strong>
                          <div style={{ fontSize: '11px', color: '#7B6F62' }}>{desigName}</div>
                        </td>
                        <td>
                          <span className="status-pill active" style={{ fontSize: '11px' }}>
                            {emp.employmentType}
                          </span>
                        </td>
                        <td>
                          {emp.workEmail && <div>{emp.workEmail}</div>}
                          {phone && <div style={{ fontSize: '12px', color: '#7B6F62' }}>{phone.number}</div>}
                        </td>
                        <td>
                          {isLinked ? (
                            <span style={{ color: '#2E7D32', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <UserCheck size={12} /> Linked
                            </span>
                          ) : (
                            <span style={{ color: '#7B6F62', fontSize: '12px' }}>Unlinked</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill ${isAnon ? 'anonymised' : emp.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                            {isAnon ? 'Anonymised' : emp.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="card-action-btn-group" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="action-btn-subtle" title="Share" onClick={() => handleOpenShare('employees', emp)}>
                              <Share2 size={13} />
                            </button>
                            <button type="button" className="action-btn-subtle" title="Download vCard" onClick={() => handleDownloadVCard('employees', emp)}>
                              <Download size={13} />
                            </button>
                            <button type="button" className="action-btn-subtle" title="Edit" disabled={isAnon} onClick={() => handleOpenEditEmployee(emp)}>
                              <Edit2 size={13} />
                            </button>
                            <button type="button" className="action-btn-subtle danger" title="Delete" onClick={() => handleDeleteEmployee(emp)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          TAB 4: PROJECT DIRECTORY & ACVC PARTNERS
          ========================================================================= */}
      {activeTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Project Selector Bar */}
          <div className="directory-toolbar" style={{ justifyContent: 'flex-start', gap: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E1A17' }}>Select Project:</span>
            <select
              className="directory-select-filter"
              style={{ minWidth: '320px' }}
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                fetchProjectDetailsAndPartners(e.target.value);
              }}
            >
              {projectsList.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.code ? `[${p.code}] ` : ''}{p.name}
                </option>
              ))}
            </select>

            <Button
              variant="secondary"
              size="md"
              icon={Share2}
              onClick={() => handleShareProjectSite('whatsapp')}
            >
              Share Site Details (WhatsApp)
            </Button>
          </div>

          {/* Project Overview Cards */}
          <div className="form-grid-2">
            {/* Linked Client Card */}
            <div className="directory-entry-card">
              <div className="card-top-row">
                <div className="card-title-group">
                  <div className="card-avatar gold">
                    <Users size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Project Linked Client</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#7B6F62' }}>Synced client snapshot & site coordinates</p>
                  </div>
                </div>

                {projectDetails?.clientRef && (
                  <button
                    type="button"
                    className="action-btn-subtle danger"
                    title="Unlink Client"
                    onClick={handleUnlinkClientFromProject}
                  >
                    <Unlink size={14} />
                  </button>
                )}
              </div>

              {projectDetails?.client?.name ? (
                <div className="card-meta-list" style={{ marginTop: '10px' }}>
                  <div className="meta-item">
                    <strong>{projectDetails.client.name}</strong>
                  </div>
                  {projectDetails.client.phone && (
                    <div className="meta-item">
                      <Phone size={13} /> {projectDetails.client.phone}
                    </div>
                  )}
                  {projectDetails.client.email && (
                    <div className="meta-item">
                      <Mail size={13} /> {projectDetails.client.email}
                    </div>
                  )}
                  {projectDetails.site?.mapLink && (
                    <div className="meta-item">
                      <MapPin size={13} />
                      <a href={projectDetails.site.mapLink} target="_blank" rel="noreferrer" className="meta-link">
                        View Site on Maps <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#7B6F62', fontSize: '13px' }}>
                  No directory client linked to this project.
                  <div style={{ marginTop: '12px' }}>
                    <select
                      className="directory-select-filter"
                      style={{ width: '100%', marginBottom: '10px' }}
                      id="linkClientSelect"
                    >
                      <option value="">-- Choose Client to Link --</option>
                      {clients.map((cl) => (
                        <option key={cl._id || cl.id} value={cl._id || cl.id}>
                          {cl.name} ({cl.code})
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="primary"
                      size="md"
                      icon={Link}
                      onClick={() => {
                        const sel = document.getElementById('linkClientSelect');
                        if (sel?.value) handleLinkClientToProject(sel.value, true);
                      }}
                    >
                      Link Client & Sync Site Address
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Associate ACVC Partner Card */}
            <div className="directory-entry-card">
              <div className="card-top-row">
                <div className="card-title-group">
                  <div className="card-avatar stone">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Associate ACVC Partner</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#7B6F62' }}>Assign contractor, vendor or consultant to project</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddPartnerToProject} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                <select
                  className="form-select"
                  value={assocPartnerForm.partnerId}
                  onChange={(e) => setAssocPartnerForm({ ...assocPartnerForm, partnerId: e.target.value })}
                  required
                >
                  <option value="">-- Select Partner --</option>
                  {partners.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name} ({p.code} - {p.acvcCategoryId?.name || 'Partner'})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  className="form-input"
                  placeholder="Role on project (e.g. Electrical Contractor, Civil Vendor)"
                  value={assocPartnerForm.role}
                  onChange={(e) => setAssocPartnerForm({ ...assocPartnerForm, role: e.target.value })}
                />

                <input
                  type="text"
                  className="form-input"
                  placeholder="Optional site note or scope"
                  value={assocPartnerForm.note}
                  onChange={(e) => setAssocPartnerForm({ ...assocPartnerForm, note: e.target.value })}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={Plus}
                >
                  Add Partner to Project
                </Button>
              </form>
            </div>
          </div>

          {/* Project Partners Roster List */}
          <div className="directory-entry-card">
            <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>Project Partners Roster ({projectPartners.length})</h3>
            {projectPartners.length === 0 ? (
              <p style={{ color: '#7B6F62', fontSize: '13px', margin: 0 }}>No ACVC partners associated with this project yet.</p>
            ) : (
              <div className="directory-table-wrap">
                <table className="directory-table">
                  <thead>
                    <tr>
                      <th>Partner</th>
                      <th>Category</th>
                      <th>Project Role</th>
                      <th>Note</th>
                      <th>Contact</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectPartners.map((pp) => {
                      const pData = pp.partnerId || pp.partner || {};
                      const pId = pData._id || pData.id || pp.partnerId;

                      return (
                        <tr key={pp._id || pId}>
                          <td>
                            <strong>{pData.name || 'Partner'}</strong>
                            <div className="card-code" style={{ fontSize: '11px' }}>{pData.code}</div>
                          </td>
                          <td>
                            <span className="status-pill active" style={{ fontSize: '11px' }}>
                              {pData.acvcCategoryId?.name || 'Partner'}
                            </span>
                          </td>
                          <td>{pp.role || 'Partner'}</td>
                          <td style={{ fontSize: '12px', color: '#7B6F62' }}>{pp.note || '-'}</td>
                          <td>
                            {pData.phones?.[0]?.number && (
                              <div style={{ fontSize: '12px' }}>{pData.phones[0].number}</div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="action-btn-subtle danger"
                              title="Remove Partner from Project"
                              onClick={() => handleRemoveProjectPartner(pId)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE / EDIT CLIENT
          ========================================================================= */}
      {clientModalOpen && (
        <div className="directory-modal-overlay" onClick={() => setClientModalOpen(false)}>
          <div className="directory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="directory-modal-header">
              <h2 className="directory-modal-title">{editingItem ? 'Edit Client' : 'Add New Client'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!editingItem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Sparkles}
                    onClick={handlePreFillClientSample}
                    title="Quick sample pre-fill"
                  >
                    Quick Fill Sample
                  </Button>
                )}
                <button type="button" className="action-btn-subtle" onClick={() => setClientModalOpen(false)}>✕</button>
              </div>
            </div>

            <form onSubmit={handleSubmitClient}>
              <div className="directory-modal-body">
                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Client Type *</label>
                    <select
                      className="form-select"
                      value={clientForm.type}
                      onChange={(e) => setClientForm({ ...clientForm, type: e.target.value })}
                    >
                      <option value="INDIVIDUAL">Individual Client</option>
                      <option value="COMPANY">Company / Corporate</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Rajesh Singhania"
                      value={clientForm.name}
                      onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Primary Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 9876543210"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    />
                    <label style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={clientForm.isWhatsApp}
                        onChange={(e) => setClientForm({ ...clientForm, isWhatsApp: e.target.checked })}
                      />
                      Available on WhatsApp
                    </label>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Primary Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. client@example.com"
                      value={clientForm.email}
                      onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Address (Line 1)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Street, Building, Flat"
                      value={clientForm.addressLine1}
                      onChange={(e) => setClientForm({ ...clientForm, addressLine1: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">City & State</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="City (e.g. Surat)"
                        value={clientForm.city}
                        onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="State"
                        value={clientForm.state}
                        onChange={(e) => setClientForm({ ...clientForm, state: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Google Maps URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://maps.google.com/?q=..."
                    value={clientForm.mapLink}
                    onChange={(e) => setClientForm({ ...clientForm, mapLink: e.target.value })}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Relationship Manager</label>
                    <select
                      className="form-select"
                      value={clientForm.relationshipManagerId}
                      onChange={(e) => setClientForm({ ...clientForm, relationshipManagerId: e.target.value })}
                    >
                      <option value="">-- Unassigned --</option>
                      {teamMembers.map((tm) => (
                        <option key={tm._id || tm.id} value={tm._id || tm.id}>
                          {tm.name} ({tm.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="form-label">GST Number (Private)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="24AAAAA0000A1Z5"
                      value={clientForm.gstNumber}
                      onChange={(e) => setClientForm({ ...clientForm, gstNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Private Notes & Requirements</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Design preferences, consultation notes..."
                    value={clientForm.notes}
                    onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="directory-modal-footer">
                <Button variant="secondary" size="md" onClick={() => setClientModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md">
                  {editingItem ? 'Save Changes' : 'Create Client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE / EDIT ACVC PARTNER
          ========================================================================= */}
      {partnerModalOpen && (
        <div className="directory-modal-overlay" onClick={() => setPartnerModalOpen(false)}>
          <div className="directory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="directory-modal-header">
              <h2 className="directory-modal-title">{editingItem ? 'Edit ACVC Partner' : 'Add ACVC Partner'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!editingItem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Sparkles}
                    onClick={handlePreFillPartnerSample}
                    title="Quick sample pre-fill"
                  >
                    Quick Fill Sample
                  </Button>
                )}
                <button type="button" className="action-btn-subtle" onClick={() => setPartnerModalOpen(false)}>✕</button>
              </div>
            </div>

            <form onSubmit={handleSubmitPartner}>
              <div className="directory-modal-body">
                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">ACVC Category *</label>
                    <select
                      className="form-select"
                      value={partnerForm.acvcCategoryId}
                      onChange={(e) => setPartnerForm({ ...partnerForm, acvcCategoryId: e.target.value })}
                      required
                    >
                      <option value="">-- Select Category --</option>
                      {acvcCategories.map((cat) => (
                        <option key={cat._id || cat.id} value={cat._id || cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Company / Partner Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Apex Electricals"
                      value={partnerForm.name}
                      onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Primary Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 9825000000"
                      value={partnerForm.phone}
                      onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                    />
                    <label style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={partnerForm.isWhatsApp}
                        onChange={(e) => setPartnerForm({ ...partnerForm, isWhatsApp: e.target.checked })}
                      />
                      WhatsApp Available
                    </label>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Official Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="partner@company.com"
                      value={partnerForm.email}
                      onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Website</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="www.apex.com"
                      value={partnerForm.website}
                      onChange={(e) => setPartnerForm({ ...partnerForm, website: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Surat, Mumbai..."
                      value={partnerForm.city}
                      onChange={(e) => setPartnerForm({ ...partnerForm, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Google Maps URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://maps.google.com/?q=..."
                    value={partnerForm.mapLink}
                    onChange={(e) => setPartnerForm({ ...partnerForm, mapLink: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Associated Trades (Optional)</label>
                  <select
                    multiple
                    className="form-select"
                    style={{ height: '70px' }}
                    value={partnerForm.tradeIds}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                      setPartnerForm({ ...partnerForm, tradeIds: selected });
                    }}
                  >
                    {trades.map((tr) => (
                      <option key={tr._id || tr.id} value={tr._id || tr.id}>
                        {tr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="directory-modal-footer">
                <Button variant="secondary" size="md" onClick={() => setPartnerModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md">
                  {editingItem ? 'Save Changes' : 'Register Partner'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE / EDIT EMPLOYEE
          ========================================================================= */}
      {employeeModalOpen && (
        <div className="directory-modal-overlay" onClick={() => setEmployeeModalOpen(false)}>
          <div className="directory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="directory-modal-header">
              <h2 className="directory-modal-title">{editingItem ? 'Edit Employee' : 'Add Staff Employee'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!editingItem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Sparkles}
                    onClick={handlePreFillEmployeeSample}
                    title="Quick sample pre-fill"
                  >
                    Quick Fill Sample
                  </Button>
                )}
                <button type="button" className="action-btn-subtle" onClick={() => setEmployeeModalOpen(false)}>✕</button>
              </div>
            </div>

            <form onSubmit={handleSubmitEmployee}>
              <div className="directory-modal-body">
                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Parth Patel"
                      value={employeeForm.name}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Employment Type *</label>
                    <select
                      className="form-select"
                      value={employeeForm.employmentType}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, employmentType: e.target.value })}
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="INTERN">Intern</option>
                      <option value="CONTRACT">Contractor</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Designation</label>
                    <select
                      className="form-select"
                      value={employeeForm.designationId}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, designationId: e.target.value })}
                    >
                      <option value="">-- Select Designation --</option>
                      {designations.map((d) => (
                        <option key={d._id || d.id} value={d._id || d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Work Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="parth@mayurmehta.com"
                      value={employeeForm.workEmail}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, workEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 9898000000"
                      value={employeeForm.phone}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Surat"
                      value={employeeForm.city}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label className="form-label">Date of Joining</label>
                    <input
                      type="date"
                      className="form-input"
                      value={employeeForm.dateOfJoining}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, dateOfJoining: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Reports To (Supervisor)</label>
                    <select
                      className="form-select"
                      value={employeeForm.reportsToEmployeeId}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, reportsToEmployeeId: e.target.value })}
                    >
                      <option value="">-- None (Reports to Principal) --</option>
                      {employees
                        .filter((em) => (editingItem ? (em._id || em.id) !== (editingItem._id || editingItem.id) : true))
                        .map((em) => (
                          <option key={em._id || em.id} value={em._id || em.id}>
                            {em.name} ({em.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Emergency Contact</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Name"
                      value={employeeForm.emergencyName}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyName: e.target.value })}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Relation"
                      value={employeeForm.emergencyRelation}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyRelation: e.target.value })}
                    />
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="Phone"
                      value={employeeForm.emergencyPhone}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="directory-modal-footer">
                <Button variant="secondary" size="md" onClick={() => setEmployeeModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md">
                  {editingItem ? 'Save Changes' : 'Create Employee'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: USER ACCOUNT LINKING
          ========================================================================= */}
      {userLinkModalOpen && editingItem && (
        <div className="directory-modal-overlay" onClick={() => setUserLinkModalOpen(false)}>
          <div className="directory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="directory-modal-header">
              <h2 className="directory-modal-title">Link App User Account</h2>
              <button type="button" className="action-btn-subtle" onClick={() => setUserLinkModalOpen(false)}>✕</button>
            </div>

            <div className="directory-modal-body">
              <p style={{ margin: 0, fontSize: '13px', color: '#7B6F62' }}>
                Connecting employee <strong>{editingItem.name}</strong> to their active software user profile allows them to view assignments, time logs, and project chat directly.
              </p>

              {linkSuggestions.length > 0 && (
                <div>
                  <h4 style={{ margin: '12px 0 6px', fontSize: '13px' }}>Suggested Candidates</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {linkSuggestions.map((sug) => (
                      <div
                        key={sug._id || sug.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: '#FAF8F5',
                          borderRadius: '8px',
                          border: '1px solid #E8E3DB'
                        }}
                      >
                        <div>
                          <strong>{sug.name}</strong> ({sug.email})
                          <div style={{ fontSize: '11px', color: '#7B6F62' }}>Score: {sug.score || 100}% Match</div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleLinkUser(sug._id || sug.id)}
                        >
                          Link User
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '12px' }}>
                <label className="form-label">Or Select from All Active Users:</label>
                <select
                  className="form-select"
                  value={selectedUserIdToLink}
                  onChange={(e) => setSelectedUserIdToLink(e.target.value)}
                >
                  <option value="">-- Choose User Account --</option>
                  {teamMembers.map((tm) => (
                    <option key={tm._id || tm.id} value={tm._id || tm.id}>
                      {tm.name} ({tm.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="directory-modal-footer">
              <Button variant="secondary" size="md" onClick={() => setUserLinkModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!selectedUserIdToLink}
                onClick={() => handleLinkUser(selectedUserIdToLink)}
              >
                Link Selected User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONTACT SHARING & FORMATTED EXPORT
          ========================================================================= */}
      {shareModalOpen && activeShareTarget && (
        <div className="directory-modal-overlay" onClick={() => setShareModalOpen(false)}>
          <div className="directory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="directory-modal-header">
              <h2 className="directory-modal-title">Share Contact Information</h2>
              <button type="button" className="action-btn-subtle" onClick={() => setShareModalOpen(false)}>✕</button>
            </div>

            <div className="directory-modal-body">
              <p style={{ margin: 0, fontSize: '13px', color: '#7B6F62' }}>
                Share <strong>{activeShareTarget.item.name}</strong> ({activeShareTarget.item.code}) via instant messaging, email or vCard 3.0:
              </p>

              <div className="share-channels-grid">
                <button
                  type="button"
                  className="share-channel-btn whatsapp"
                  onClick={() => handleShareChannel('whatsapp')}
                >
                  <Share2 size={22} />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  className="share-channel-btn"
                  onClick={() => handleShareChannel('email')}
                >
                  <Mail size={22} />
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  className="share-channel-btn"
                  onClick={() => handleShareChannel('sms')}
                >
                  <Phone size={22} />
                  <span>SMS</span>
                </button>

                <button
                  type="button"
                  className="share-channel-btn"
                  onClick={() => handleShareChannel('text')}
                >
                  <Copy size={22} />
                  <span>Format Text</span>
                </button>
              </div>

              {shareResult?.formattedText && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="form-label">Formatted Contact Card</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={copiedText ? Check : Copy}
                      onClick={handleCopyShareText}
                    >
                      {copiedText ? 'Copied!' : 'Copy to Clipboard'}
                    </Button>
                  </div>
                  <pre
                    style={{
                      background: '#FAF8F5',
                      border: '1px solid #E8E3DB',
                      borderRadius: '10px',
                      padding: '14px',
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '160px',
                      overflowY: 'auto'
                    }}
                  >
                    {shareResult.formattedText}
                  </pre>
                </div>
              )}
            </div>

            <div className="directory-modal-footer">
              <Button
                variant="secondary"
                size="md"
                icon={Download}
                onClick={() => handleDownloadVCard(activeShareTarget.kind, activeShareTarget.item)}
              >
                Download vCard (.vcf)
              </Button>
              <Button variant="primary" size="md" onClick={() => setShareModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CSV BULK IMPORT
          ========================================================================= */}
      {importModalOpen && (
        <div className="directory-modal-overlay" onClick={() => setImportModalOpen(false)}>
          <div className="directory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="directory-modal-header">
              <h2 className="directory-modal-title">Bulk Import {activeTab.toUpperCase()} via CSV</h2>
              <button type="button" className="action-btn-subtle" onClick={() => setImportModalOpen(false)}>✕</button>
            </div>

            <div className="directory-modal-body">
              <p style={{ margin: 0, fontSize: '13px', color: '#7B6F62' }}>
                Upload a structured CSV file. Sequence codes (e.g. CLT-0001) will be atomically generated gapless with formula injection defense.
              </p>

              <div
                className="import-dropzone"
                onClick={() => document.getElementById('csvFileInput').click()}
              >
                <Upload size={36} color="#B89A74" style={{ margin: '0 auto 10px' }} />
                <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', color: '#1E1A17' }}>
                  {importFile ? importFile.name : 'Click to select CSV file'}
                </p>
                <span style={{ fontSize: '12px', color: '#7B6F62' }}>Supports standard comma-separated format (max 1,000 rows)</span>
                <input
                  id="csvFileInput"
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={(e) => setImportFile(e.target.files[0])}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={importDryRun}
                    onChange={(e) => setImportDryRun(e.target.checked)}
                  />
                  Dry Run (Pre-validate data without writing to database)
                </label>

                <button
                  type="button"
                  className="meta-link"
                  style={{ fontSize: '12px', border: 'none', background: 'none', cursor: 'pointer' }}
                  onClick={handleDownloadTemplate}
                >
                  <Download size={12} /> Download Sample Template
                </button>
              </div>

              {importResult && (
                <div
                  style={{
                    background: importResult.success ? '#EBF7F0' : '#FDF2F0',
                    border: '1px solid #E8E3DB',
                    borderRadius: '10px',
                    padding: '14px',
                    fontSize: '12px'
                  }}
                >
                  <strong>{importResult.dryRun ? 'Dry Run Validation Results:' : 'Import Complete:'}</strong>
                  <div style={{ marginTop: '4px' }}>
                    Valid Rows: {importResult.validCount || 0} | Errors: {importResult.errorCount || 0}
                  </div>
                  {importResult.errors?.length > 0 && (
                    <ul style={{ margin: '6px 0 0', paddingLeft: '18px', color: '#C62828' }}>
                      {importResult.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>Row {err.row}: {err.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="directory-modal-footer">
              <Button variant="secondary" size="md" onClick={() => setImportModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!importFile || importing}
                loading={importing}
                onClick={handleExecuteImport}
              >
                {importDryRun ? 'Validate CSV' : 'Execute Import'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: GDPR ANONYMISATION
          ========================================================================= */}
      {anonymiseModalOpen && activeShareTarget && (
        <div className="directory-modal-overlay" onClick={() => setAnonymiseModalOpen(false)}>
          <div className="directory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="directory-modal-header" style={{ background: '#FDF2F0' }}>
              <h2 className="directory-modal-title" style={{ color: '#C62828' }}>
                Irreversible GDPR Anonymisation
              </h2>
              <button type="button" className="action-btn-subtle" onClick={() => setAnonymiseModalOpen(false)}>✕</button>
            </div>

            <div className="directory-modal-body">
              <p style={{ margin: 0, fontSize: '13px', color: '#1E1A17' }}>
                Are you sure you want to anonymise record <strong>{activeShareTarget.item.name}</strong> ({activeShareTarget.item.code})?
              </p>
              <div
                style={{
                  background: '#FAF8F5',
                  border: '1px solid #E8E3DB',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '12px',
                  color: '#7B6F62'
                }}
              >
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Name will be permanently overwritten to "Anonymised {activeShareTarget.kind}".</li>
                  <li>All phone numbers, emails, addresses, and private notes will be permanently erased.</li>
                  <li>Linked project client snapshots will be updated to anonymised placeholders.</li>
                  <li><strong>This action cannot be undone.</strong></li>
                </ul>
              </div>
            </div>

            <div className="directory-modal-footer">
              <Button variant="secondary" size="md" onClick={() => setAnonymiseModalOpen(false)}>
                Cancel
              </Button>
              <button
                type="button"
                className="btn btn-primary btn-md"
                style={{ background: '#C62828', borderColor: '#C62828' }}
                onClick={handleConfirmAnonymise}
              >
                Confirm Anonymise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DirectoryPage;
