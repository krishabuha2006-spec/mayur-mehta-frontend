import { apiClient } from './apiClient';

/**
 * Super Admin API Client - Direct Integration with Mayur-Maheta Backend API (Swagger v1.3.0)
 * All operations map 1-to-1 with live MongoDB database collections and endpoints.
 */
export const adminService = {
  // =========================================================================
  // 1. SUPER ADMIN - DASHBOARD
  // =========================================================================

  /**
   * GET /admin/dashboard - Get Platform Dashboard Statistics
   * Real-time aggregated company counts, seat/storage utilization, and metrics.
   */
  getDashboardMetrics: async () => {
    const res = await apiClient.get('/admin/dashboard');
    const data = res?.data || res;
    return data?.data || data || null;
  },

  // =========================================================================
  // 2. SUPER ADMIN - COMPANIES & TENANTS
  // =========================================================================

  /**
   * GET /admin/companies - List Companies
   * Parameters: search, status, plan, seatsFull, sort, page, limit
   */
  getCompanies: async (params = {}) => {
    const res = await apiClient.get('/admin/companies', { params });
    const payload = res?.data || res;
    const list = Array.isArray(payload) ? payload : (payload?.companies || payload?.data || []);
    return {
      data: list,
      pagination: payload?.pagination || { total: list.length, page: 1, limit: 20 }
    };
  },

  /**
   * GET /admin/companies/{id} - Get Company Details
   */
  getCompanyDetails: async (id) => {
    const res = await apiClient.get(`/admin/companies/${id}`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * POST /admin/companies - Create Company and Invite Owner
   * Request Body: CreateCompanyInput (conforms to Swagger v1.4.0 specification)
   */
  createCompany: async (formData) => {
    const payload = {
      name: formData.name?.trim(),
      owner: {
        name: formData.owner?.name?.trim() || formData.ownerName?.trim() || 'Firm Principal',
        email: formData.owner?.email?.trim() || formData.ownerEmail?.trim(),
        mobile: formData.owner?.mobile?.trim() || formData.ownerPhone?.trim() || undefined
      },
      plan: (formData.plan || 'FREE').toUpperCase(),
      seatLimit: Number(formData.seatLimit) || 10,
      storageLimitMB: Number(formData.storageLimitMB) || 5120,
      legalName: formData.legalName?.trim() || undefined,
      phone: formData.phone?.trim() || formData.ownerPhone?.trim() || undefined,
      gstNumber: formData.gstNumber?.trim() || undefined,
      address: formData.address || (formData.city || formData.state || formData.addressLine1 || formData.pincode ? {
        line1: formData.addressLine1?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        state: formData.state?.trim() || undefined,
        pincode: formData.pincode?.trim() || undefined,
        country: formData.country?.trim() || 'India'
      } : undefined),
      timezone: formData.timezone || 'Asia/Kolkata',
      notes: formData.notes?.trim() || undefined,
      sendInvite: formData.sendInvite !== undefined ? formData.sendInvite : true
    };
    const res = await apiClient.post('/admin/companies', payload);
    return res?.data || res;
  },

  /**
   * PATCH /admin/companies/{id} - Update Company Profile
   */
  updateCompanyProfile: async (id, data) => {
    const res = await apiClient.patch(`/admin/companies/${id}`, data);
    return res?.data || res;
  },

  /**
   * PUT /admin/companies/{id}/owner - Fix Pending Owner
   */
  fixPendingOwner: async (id, ownerData) => {
    const res = await apiClient.put(`/admin/companies/${id}/owner`, {
      name: ownerData.name?.trim(),
      email: ownerData.email?.trim(),
      mobile: ownerData.mobile?.trim()
    });
    return res?.data || res;
  },

  /**
   * POST /admin/companies/{id}/resend-owner-invite - Resend Owner Invite
   */
  resendOwnerInvite: async (id) => {
    const res = await apiClient.post(`/admin/companies/${id}/resend-owner-invite`);
    return res?.data || res;
  },

  /**
   * PUT /admin/companies/{id}/plan - Change Company Plan and Limits
   */
  updatePlan: async (id, { plan = 'FREE', seatLimit = 10, storageLimitMB, reason = 'Administrative plan update' }) => {
    const payload = {
      plan: String(plan).toUpperCase(),
      seatLimit: Number(seatLimit),
      reason: String(reason).trim()
    };
    if (storageLimitMB) {
      payload.storageLimitMB = Number(storageLimitMB);
    }
    const res = await apiClient.put(`/admin/companies/${id}/plan`, payload);
    return res?.data || res;
  },

  /**
   * PUT /admin/companies/{id}/suspend - Suspend Company
   */
  suspendCompany: async (id, reason = 'Administrative suspension', notifyOwner = true) => {
    const res = await apiClient.put(`/admin/companies/${id}/suspend`, {
      reason: reason?.trim() || 'Administrative suspension',
      notifyOwner
    });
    return res?.data || res;
  },

  /**
   * PUT /admin/companies/{id}/activate - Activate Company
   */
  activateCompany: async (id) => {
    const res = await apiClient.put(`/admin/companies/${id}/activate`);
    return res?.data || res;
  },

  /**
   * PUT /admin/companies/{id}/delete - Soft Delete Company
   */
  deleteCompany: async (id, reason = 'Customer requested account closure', confirmName = '') => {
    const res = await apiClient.put(`/admin/companies/${id}/delete`, {
      reason: reason?.trim() || 'Company archived by administrator',
      confirmName: confirmName?.trim()
    });
    return res?.data || res;
  },

  /**
   * PUT /admin/companies/{id}/restore - Restore Soft-Deleted Company
   */
  restoreCompany: async (id) => {
    const res = await apiClient.put(`/admin/companies/${id}/restore`);
    return res?.data || res;
  },

  /**
   * POST /admin/companies/{id}/purge-now - Purge Company Immediately
   */
  purgeCompanyNow: async (id, reason = 'Permanent erasure requested', confirmName = '') => {
    const res = await apiClient.post(`/admin/companies/${id}/purge-now`, {
      reason: reason?.trim() || 'Permanent erasure confirmed',
      confirmName: confirmName?.trim()
    });
    return res?.data || res;
  },

  /**
   * POST /admin/companies/{id}/impersonate - Support Impersonation (Login as Company)
   */
  impersonateCompany: async (id, reason = 'Diagnosing firm workspace for customer support') => {
    const res = await apiClient.post(`/admin/companies/${id}/impersonate`, {
      reason: reason?.trim() || 'Diagnosing firm workspace for customer support'
    });
    return res?.data || res;
  },

  /**
   * GET /admin/companies/{id}/audit-logs - Get Audit Logs for Specific Company
   */
  getCompanyAuditLogs: async (id) => {
    const res = await apiClient.get(`/admin/companies/${id}/audit-logs`);
    const payload = res?.data || res;
    return Array.isArray(payload) ? payload : (payload?.data || []);
  },

  /**
   * POST /admin/companies/{id}/reconcile-seats - Reconcile Company Seat Counter
   */
  reconcileSeats: async (id) => {
    const res = await apiClient.post(`/admin/companies/${id}/reconcile-seats`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  // =========================================================================
  // 3. SUPER ADMIN - TEAM MANAGEMENT (ADMINS)
  // =========================================================================

  /**
   * GET /admin/admins - List Super Admins
   */
  getAdmins: async () => {
    const res = await apiClient.get('/admin/admins');
    const payload = res?.data || res;
    return Array.isArray(payload) ? payload : (payload?.data || payload?.admins || []);
  },

  /**
   * POST /admin/admins - Invite Super Admin
   */
  inviteAdmin: async ({ name, email }) => {
    const res = await apiClient.post('/admin/admins', {
      name: name?.trim(),
      email: email?.trim()
    });
    return res?.data || res;
  },

  /**
   * GET /admin/admins/{id} - Get Super Admin Detail
   */
  getAdminDetail: async (id) => {
    const res = await apiClient.get(`/admin/admins/${id}`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * PATCH /admin/admins/{id} - Update Super Admin Name
   */
  updateAdminName: async (id, { name }) => {
    const res = await apiClient.patch(`/admin/admins/${id}`, {
      name: name?.trim()
    });
    return res?.data || res;
  },

  /**
   * PUT /admin/admins/{id}/disable - Disable Super Admin
   */
  disableAdmin: async (id, reason = 'Role terminated') => {
    const res = await apiClient.put(`/admin/admins/${id}/disable`, {
      reason: reason?.trim() || 'Administrative deactivation'
    });
    return res?.data || res;
  },

  /**
   * PUT /admin/admins/{id}/enable - Enable Super Admin
   */
  enableAdmin: async (id) => {
    const res = await apiClient.put(`/admin/admins/${id}/enable`);
    return res?.data || res;
  },

  /**
   * PUT /admin/admins/{id}/unlock - Unlock Super Admin Account
   */
  unlockAdmin: async (id) => {
    const res = await apiClient.put(`/admin/admins/${id}/unlock`);
    return res?.data || res;
  },

  /**
   * POST /admin/admins/{id}/resend-invite - Resend Super Admin Invite
   */
  resendAdminInvite: async (id) => {
    const res = await apiClient.post(`/admin/admins/${id}/resend-invite`);
    return res?.data || res;
  },

  // =========================================================================
  // 4. SUPER ADMIN - AUDIT LOGS
  // =========================================================================

  /**
   * GET /admin/audit-logs - Query Platform Audit Logs
   * Parameters: companyId, action, actorId, from, to, search, page, limit
   */
  getAuditLogs: async (params = {}) => {
    const res = await apiClient.get('/admin/audit-logs', { params });
    const payload = res?.data || res;
    const list = Array.isArray(payload) ? payload : (payload?.data || payload?.logs || []);
    return {
      data: list,
      pagination: payload?.pagination || { total: list.length, page: 1, limit: 20 }
    };
  },

  /**
   * GET /admin/audit-logs/{id} - Get Audit Log Entry Detail
   */
  getAuditLogDetail: async (id) => {
    const res = await apiClient.get(`/admin/audit-logs/${id}`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  // =========================================================================
  // 5. SUPER ADMIN - BILLING & REVENUE (Module M1.6)
  // =========================================================================

  /**
   * GET /admin/billing/overview - Get Platform Billing Overview & MRR
   */
  getBillingOverview: async () => {
    const res = await apiClient.get('/admin/billing/overview');
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * GET /admin/billing/invoices - List All Platform Invoices
   * Params: status, companyId, page, limit
   */
  getAdminInvoices: async (params = {}) => {
    const res = await apiClient.get('/admin/billing/invoices', { params });
    const payload = res?.data || res;
    const list = Array.isArray(payload) ? payload : (payload?.data || payload?.invoices || []);
    return {
      invoices: list,
      pagination: payload?.pagination || { total: list.length, page: 1, limit: 20 }
    };
  },

  /**
   * POST /admin/billing/invoices - Create Invoice Draft
   * Body: { companyId, invoiceType, seats, billingCycle, lineItems, dueDate, notes }
   */
  createInvoiceDraft: async (data) => {
    const res = await apiClient.post('/admin/billing/invoices', data);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * GET /admin/billing/invoices/{id} - Get Platform Invoice
   */
  getAdminInvoice: async (id) => {
    const res = await apiClient.get(`/admin/billing/invoices/${id}`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * PUT /admin/billing/invoices/{id} - Update Draft Invoice
   */
  updateDraftInvoice: async (id, data) => {
    const res = await apiClient.put(`/admin/billing/invoices/${id}`, data);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * DELETE /admin/billing/invoices/{id} - Delete Draft Invoice
   */
  deleteDraftInvoice: async (id) => {
    const res = await apiClient.delete(`/admin/billing/invoices/${id}`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * POST /admin/billing/invoices/{id}/issue - Issue Invoice (assigns permanent gapless FY sequence)
   */
  issueInvoice: async (id) => {
    const res = await apiClient.post(`/admin/billing/invoices/${id}/issue`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * POST /admin/billing/invoices/{id}/void - Void Invoice
   */
  voidInvoice: async (id, reason = 'Administrative cancellation') => {
    const res = await apiClient.post(`/admin/billing/invoices/${id}/void`, { reason });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * GET /admin/billing/invoices/{id}/pdf - Download Platform Invoice PDF
   */
  downloadAdminInvoicePdf: async (id, invoiceNumber = 'invoice') => {
    const response = await apiClient.get(`/admin/billing/invoices/${id}/pdf`, {
      responseType: 'blob'
    });
    const blob = response instanceof Blob ? response : new Blob([response?.data || response], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `${invoiceNumber.replace(/\//g, '_')}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return true;
  },

  /**
   * POST /admin/billing/invoices/{id}/resend - Resend Invoice Notification
   */
  resendInvoiceNotification: async (id) => {
    const res = await apiClient.post(`/admin/billing/invoices/${id}/resend`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * GET /admin/billing/payments - List All Platform Payments
   */
  getAdminPayments: async (params = {}) => {
    const res = await apiClient.get('/admin/billing/payments', { params });
    const payload = res?.data || res;
    const list = Array.isArray(payload) ? payload : (payload?.data || payload?.payments || []);
    return {
      payments: list,
      pagination: payload?.pagination || { total: list.length, page: 1, limit: 20 }
    };
  },

  /**
   * POST /admin/billing/payments - Record Manual Payment
   * Body: { invoiceId, amountPaise, method, reference, recordedAt, notes }
   */
  recordManualPayment: async (data) => {
    const payload = {
      invoiceId: data.invoiceId,
      amountPaise: Number(data.amountPaise),
      method: String(data.method || 'BANK_TRANSFER').toUpperCase(),
      reference: String(data.reference || '').trim(),
      recordedAt: data.recordedAt || new Date().toISOString(),
      notes: data.notes?.trim() || undefined
    };
    const res = await apiClient.post('/admin/billing/payments', payload);
    const result = res?.data || res;
    return result?.data || result;
  },

  /**
   * POST /admin/billing/payments/{id}/reverse - Reverse Payment (LIFO)
   * Body: { reason }
   */
  reversePayment: async (id, reason) => {
    const res = await apiClient.post(`/admin/billing/payments/${id}/reverse`, {
      reason: String(reason).trim()
    });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * GET /admin/billing/requests - List All Platform Billing Requests
   */
  getAdminBillingRequests: async () => {
    const res = await apiClient.get('/admin/billing/requests');
    const payload = res?.data || res;
    return Array.isArray(payload) ? payload : (payload?.data || payload?.requests || []);
  },

  /**
   * POST /admin/billing/requests/{id}/resolve - Resolve Billing Request
   * Body: { resolutionNotes, createInvoice, lineItems }
   */
  resolveBillingRequest: async (id, data = {}) => {
    const res = await apiClient.post(`/admin/billing/requests/${id}/resolve`, {
      resolutionNotes: data.resolutionNotes?.trim() || 'Request resolved by Super Admin',
      createInvoice: Boolean(data.createInvoice),
      lineItems: data.lineItems || undefined
    });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * POST /admin/billing/requests/{id}/reject - Reject Billing Request
   * Body: { rejectionReason }
   */
  rejectBillingRequest: async (id, rejectionReason) => {
    const res = await apiClient.post(`/admin/billing/requests/${id}/reject`, {
      rejectionReason: String(rejectionReason).trim()
    });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * POST /admin/companies/{id}/billing/grace - Extend Grace Period (1..30 days)
   * Body: { additionalDays, reason }
   */
  extendGracePeriod: async (companyId, { additionalDays, reason }) => {
    const res = await apiClient.post(`/admin/companies/${companyId}/billing/grace`, {
      additionalDays: Number(additionalDays),
      reason: String(reason).trim()
    });
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * POST /admin/companies/{id}/billing/grant - Grant Complimentary Paid Days (1..90 days)
   * Body: { days, reason }
   */
  grantComplimentary: async (companyId, { days, reason }) => {
    const res = await apiClient.post(`/admin/companies/${companyId}/billing/grant`, {
      days: Number(days),
      reason: String(reason).trim()
    });
    const payload = res?.data || res;
    return payload?.data || payload;
  }
};

export default adminService;

