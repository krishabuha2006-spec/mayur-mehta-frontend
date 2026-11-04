import { apiClient } from './apiClient';

/**
 * Robust response unwrappers for Directory API
 */
function unwrapDirectoryArray(response, key) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && typeof response.data === 'object') {
    if (key && Array.isArray(response.data[key])) return response.data[key];
    if (Array.isArray(response.data.data)) return response.data.data;
    if (Array.isArray(response.data.items)) return response.data.items;
    if (Array.isArray(response.data.docs)) return response.data.docs;
    if (Array.isArray(response.data.list)) return response.data.list;
    if (Array.isArray(response.data.records)) return response.data.records;
    if (Array.isArray(response.data.rows)) return response.data.rows;
    if (Array.isArray(response.data.results)) return response.data.results;
    if (Array.isArray(response.data.clients)) return response.data.clients;
    if (Array.isArray(response.data.partners)) return response.data.partners;
    if (Array.isArray(response.data.employees)) return response.data.employees;
  }
  if (key && Array.isArray(response[key])) return response[key];
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.docs)) return response.docs;
  if (Array.isArray(response.list)) return response.list;
  if (Array.isArray(response.records)) return response.records;
  if (Array.isArray(response.rows)) return response.rows;
  if (Array.isArray(response.clients)) return response.clients;
  if (Array.isArray(response.partners)) return response.partners;
  if (Array.isArray(response.employees)) return response.employees;
  return [];
}

function unwrapSingleItem(response, key) {
  if (!response) return null;
  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    if (key && response.data[key]) return response.data[key];
    return response.data.client || response.data.partner || response.data.employee || response.data.item || response.data;
  }
  if (key && response[key]) return response[key];
  return response.client || response.partner || response.employee || response;
}

function normalizeSummary(raw) {
  if (!raw) {
    return {
      totalClients: 0,
      activeClients: 0,
      totalPartners: 0,
      activePartners: 0,
      totalEmployees: 0,
      activeEmployees: 0
    };
  }
  const d = raw.data || raw.summary || raw;

  const totalClients =
    d.totalClients ??
    (typeof d.clients === 'number' ? d.clients : null) ??
    d.clients?.total ??
    d.clients?.count ??
    d.clientsCount ??
    d.clientsTotal ??
    (Array.isArray(d.clients) ? d.clients.length : 0);

  const activeClients =
    d.activeClients ??
    (typeof d.activeClientsCount === 'number' ? d.activeClientsCount : null) ??
    d.clients?.active ??
    d.clients?.activeCount ??
    totalClients;

  const totalPartners =
    d.totalPartners ??
    (typeof d.partners === 'number' ? d.partners : null) ??
    d.partners?.total ??
    d.partners?.count ??
    d.partnersCount ??
    d.partnersTotal ??
    (Array.isArray(d.partners) ? d.partners.length : 0);

  const activePartners =
    d.activePartners ??
    (typeof d.activePartnersCount === 'number' ? d.activePartnersCount : null) ??
    d.partners?.active ??
    d.partners?.activeCount ??
    totalPartners;

  const totalEmployees =
    d.totalEmployees ??
    (typeof d.employees === 'number' ? d.employees : null) ??
    d.employees?.total ??
    d.employees?.count ??
    d.employeesCount ??
    d.employeesTotal ??
    (Array.isArray(d.employees) ? d.employees.length : 0);

  const activeEmployees =
    d.activeEmployees ??
    (typeof d.activeEmployeesCount === 'number' ? d.activeEmployeesCount : null) ??
    d.employees?.active ??
    d.employees?.activeCount ??
    totalEmployees;

  return {
    totalClients: Number(totalClients) || 0,
    activeClients: Number(activeClients) || 0,
    totalPartners: Number(totalPartners) || 0,
    activePartners: Number(activePartners) || 0,
    totalEmployees: Number(totalEmployees) || 0,
    activeEmployees: Number(activeEmployees) || 0
  };
}

/**
 * Directory Service (Module M2.4)
 * Comprehensive directory for Clients, ACVC Partners, Employees, Contact Sharing,
 * vCard 3.0 generation, CSV Import/Export, and Project Integrations.
 * Connected directly to Mayur Mehta Backend API.
 */
export const directoryService = {
  // =========================================================================
  // 1. CLIENTS DIRECTORY (/api/v1/directory/clients)
  // =========================================================================
  getClients: async (params = {}) => {
    const res = await apiClient.get('/directory/clients', { params });
    return unwrapDirectoryArray(res, 'clients');
  },

  createClient: async (data) => {
    const res = await apiClient.post('/directory/clients', data);
    return unwrapSingleItem(res, 'client');
  },

  getClient: async (id) => {
    const res = await apiClient.get(`/directory/clients/${id}`);
    return unwrapSingleItem(res, 'client');
  },

  updateClient: async (id, data) => {
    const res = await apiClient.patch(`/directory/clients/${id}`, data);
    return unwrapSingleItem(res, 'client');
  },

  updateClientStatus: async (id, status) => {
    const res = await apiClient.patch(`/directory/clients/${id}/status`, { status });
    return unwrapSingleItem(res, 'client');
  },

  deleteClient: async (id) => {
    const res = await apiClient.delete(`/directory/clients/${id}`);
    return unwrapSingleItem(res, 'client');
  },

  // =========================================================================
  // 2. ACVC PARTNERS DIRECTORY (/api/v1/directory/partners)
  // =========================================================================
  getPartners: async (params = {}) => {
    const res = await apiClient.get('/directory/partners', { params });
    return unwrapDirectoryArray(res, 'partners');
  },

  createPartner: async (data) => {
    const res = await apiClient.post('/directory/partners', data);
    return unwrapSingleItem(res, 'partner');
  },

  getPartner: async (id) => {
    const res = await apiClient.get(`/directory/partners/${id}`);
    return unwrapSingleItem(res, 'partner');
  },

  updatePartner: async (id, data) => {
    const res = await apiClient.patch(`/directory/partners/${id}`, data);
    return unwrapSingleItem(res, 'partner');
  },

  updatePartnerStatus: async (id, status) => {
    const res = await apiClient.patch(`/directory/partners/${id}/status`, { status });
    return unwrapSingleItem(res, 'partner');
  },

  deletePartner: async (id) => {
    const res = await apiClient.delete(`/directory/partners/${id}`);
    return unwrapSingleItem(res, 'partner');
  },

  // =========================================================================
  // 3. EMPLOYEES DIRECTORY (/api/v1/directory/employees)
  // =========================================================================
  getEmployees: async (params = {}) => {
    const res = await apiClient.get('/directory/employees', { params });
    return unwrapDirectoryArray(res, 'employees');
  },

  createEmployee: async (data) => {
    const res = await apiClient.post('/directory/employees', data);
    return unwrapSingleItem(res, 'employee');
  },

  getEmployee: async (id) => {
    const res = await apiClient.get(`/directory/employees/${id}`);
    return unwrapSingleItem(res, 'employee');
  },

  updateEmployee: async (id, data) => {
    const res = await apiClient.patch(`/directory/employees/${id}`, data);
    return unwrapSingleItem(res, 'employee');
  },

  updateEmployeeStatus: async (id, status) => {
    const res = await apiClient.patch(`/directory/employees/${id}/status`, { status });
    return unwrapSingleItem(res, 'employee');
  },

  deleteEmployee: async (id) => {
    const res = await apiClient.delete(`/directory/employees/${id}`);
    return unwrapSingleItem(res, 'employee');
  },

  getEmployeeUserLinkSuggestions: async (id) => {
    const res = await apiClient.get(`/directory/employees/${id}/user-link/suggestions`);
    return unwrapDirectoryArray(res, 'candidates');
  },

  linkEmployeeUser: async (id, userId) => {
    const res = await apiClient.post(`/directory/employees/${id}/user-link`, { userId });
    return unwrapSingleItem(res, 'employee');
  },

  unlinkEmployeeUser: async (id) => {
    const res = await apiClient.delete(`/directory/employees/${id}/user-link`);
    return unwrapSingleItem(res, 'employee');
  },

  inviteEmployee: async (id, roleId) => {
    const res = await apiClient.post(`/directory/employees/${id}/invite`, { roleId });
    return unwrapSingleItem(res);
  },

  // =========================================================================
  // 4. COMMON DIRECTORY OPERATIONS (/api/v1/directory)
  // =========================================================================
  getSummary: async () => {
    const res = await apiClient.get('/directory/summary');
    return normalizeSummary(res);
  },

  lookup: async (q, kind) => {
    const params = { q };
    if (kind) params.kind = kind;
    const res = await apiClient.get('/directory/lookup', { params });
    return unwrapDirectoryArray(res, 'results');
  },

  checkDuplicates: async ({ phone, email, kind, excludeId }) => {
    const params = {};
    if (phone) params.phone = phone;
    if (email) params.email = email;
    if (kind) params.kind = kind;
    if (excludeId) params.excludeId = excludeId;
    const res = await apiClient.get('/directory/duplicates', { params });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  // =========================================================================
  // 5. CONTACT SHARING & VCARD 3.0 (/api/v1/directory/{kind}/{id}/share & vcard)
  // =========================================================================
  shareContact: async (kind, id, channel = 'whatsapp') => {
    const res = await apiClient.post(`/directory/${kind}/${id}/share`, { channel });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  downloadVCard: async (kind, id, filename = 'contact.vcf') => {
    const res = await apiClient.get(`/directory/${kind}/${id}/vcard`, {
      responseType: 'blob'
    });
    const blob = new Blob([res.data || res], { type: 'text/vcard;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.vcf') ? filename : `${filename}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // =========================================================================
  // 6. CSV IMPORT & EXPORT (/api/v1/directory/{kind}/export & import)
  // =========================================================================
  exportCsv: async (kind) => {
    const res = await apiClient.get(`/directory/${kind}/export`, {
      responseType: 'blob'
    });
    const blob = new Blob([res.data || res], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind}_directory_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  downloadImportTemplate: async (kind) => {
    const res = await apiClient.get(`/directory/${kind}/import/template`, {
      responseType: 'blob'
    });
    const blob = new Blob([res.data || res], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind}_import_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  importCsv: async (kind, file, dryRun = false) => {
    const formData = new FormData();
    formData.append('file', file);
    if (dryRun) formData.append('dryRun', 'true');

    const res = await apiClient.post(`/directory/${kind}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  // =========================================================================
  // 7. GDPR ANONYMISATION (/api/v1/directory/{kind}/{id}/anonymise)
  // =========================================================================
  anonymise: async (kind, id) => {
    const res = await apiClient.post(`/directory/${kind}/${id}/anonymise`, { confirm: true });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  // =========================================================================
  // 8. PROJECT DIRECTORY INTEGRATION (/api/v1/projects/:id)
  // =========================================================================
  linkProjectClient: async (projectId, clientId, copyAddressToSite = true) => {
    const res = await apiClient.post(`/projects/${projectId}/client`, {
      clientId,
      copyAddressToSite
    });
    return unwrapSingleItem(res, 'client');
  },

  unlinkProjectClient: async (projectId) => {
    const res = await apiClient.delete(`/projects/${projectId}/client`);
    return unwrapSingleItem(res, 'client');
  },

  getProjectPartners: async (projectId) => {
    const res = await apiClient.get(`/projects/${projectId}/partners`);
    return unwrapDirectoryArray(res, 'partners');
  },

  addProjectPartner: async (projectId, { partnerId, role, note }) => {
    const res = await apiClient.post(`/projects/${projectId}/partners`, {
      partnerId,
      role,
      note
    });
    return unwrapSingleItem(res, 'partner');
  },

  updateProjectPartner: async (projectId, partnerId, { role, note }) => {
    const res = await apiClient.patch(`/projects/${projectId}/partners/${partnerId}`, {
      role,
      note
    });
    return unwrapSingleItem(res, 'partner');
  },

  removeProjectPartner: async (projectId, partnerId) => {
    const res = await apiClient.delete(`/projects/${projectId}/partners/${partnerId}`);
    return unwrapSingleItem(res);
  },

  shareProjectSite: async (projectId, channel = 'whatsapp') => {
    const res = await apiClient.post(`/projects/${projectId}/site/share`, { channel });
    const payload = res?.data || res;
    return payload?.data || payload;
  }
};
