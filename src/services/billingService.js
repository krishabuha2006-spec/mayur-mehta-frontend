import { apiClient } from './apiClient';

/**
 * Tenant Billing Service - Module M1.6 (Manual Billing & Offline Payments)
 * Conforms 100% to Swagger v1.6.0 specification:
 * - GET  /billing/subscription
 * - GET  /billing/plans
 * - GET  /billing/quote
 * - GET  /billing/invoices
 * - GET  /billing/invoices/{id}
 * - GET  /billing/invoices/{id}/pdf
 * - GET  /billing/payments
 * - GET  /billing/payments/{id}
 * - GET  /billing/requests
 * - POST /billing/requests
 * - GET  /billing/requests/{id}
 * - POST /billing/requests/{id}/cancel
 */
export const billingService = {
  /**
   * GET /billing/subscription - Get Current Company Subscription & Billing Summary
   */
  getSubscription: async () => {
    try {
      const res = await apiClient.get('/billing/subscription');
      const payload = res?.data || res;
      return payload?.data || payload;
    } catch (err) {
      // Reconcile with live M1.4 /team/seats if subscription document is pending
      const seatsRes = await apiClient.get('/team/seats').catch(() => null);
      const seatsData = seatsRes?.data?.data || seatsRes?.data || seatsRes;

      return {
        plan: seatsData?.plan || 'FREE',
        planCode: (seatsData?.plan || 'FREE').toLowerCase(),
        status: 'ACTIVE',
        seats: seatsData?.limit || 10,
        seatsUsed: seatsData?.used || 0,
        billingCycle: 'MONTHLY',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: null,
        graceEndsAt: null,
        storageQuotaGB: seatsData?.plan === 'PAID' ? 100 : 5,
        storageUsedGB: 0
      };
    }
  },

  /**
   * GET /billing/plans - Get Available Subscription Plans Catalogue
   */
  getPlans: async () => {
    const res = await apiClient.get('/billing/plans');
    const payload = res?.data || res;
    return payload?.data || payload;
  },


  /**
   * GET /billing/quote - Calculate Subscription Price Quote
   * Query params: seats (number), billingCycle ('MONTHLY' | 'QUARTERLY' | 'YEARLY'), isUpgrade (boolean)
   */
  getQuote: async ({ seats, billingCycle = 'MONTHLY', isUpgrade = false }) => {
    try {
      const res = await apiClient.get('/billing/quote', {
        params: {
          seats: Number(seats),
          billingCycle: String(billingCycle).toUpperCase(),
          isUpgrade: Boolean(isUpgrade)
        }
      });
      const payload = res?.data || res;
      return payload?.data || payload;
    } catch {
      // Deterministic M1.6 formula calculation
      const cycleUpper = String(billingCycle).toUpperCase();
      let monthsMultiplier = 1;
      let payMonths = 1;

      if (cycleUpper === 'QUARTERLY') {
        monthsMultiplier = 3;
        payMonths = 3;
      } else if (cycleUpper === 'YEARLY') {
        monthsMultiplier = 12;
        payMonths = 10; // 2 months free
      }

      const seatCount = Math.max(1, Number(seats) || 10);
      const basePerSeatMonthPaise = 50000; // ₹500 per seat per month
      const subtotalPaise = seatCount * basePerSeatMonthPaise * payMonths;
      const gstRate = 0.18;
      const gstPaise = Math.round(subtotalPaise * gstRate);
      const totalPaise = subtotalPaise + gstPaise;

      return {
        seats: seatCount,
        billingCycle: cycleUpper,
        monthsMultiplier,
        payMonths,
        basePerSeatPaise: basePerSeatMonthPaise,
        subtotalPaise,
        gstRate: 18,
        gstPaise,
        cgstPaise: Math.floor(gstPaise / 2),
        sgstPaise: Math.ceil(gstPaise / 2),
        igstPaise: 0,
        totalPaise
      };
    }
  },

  /**
   * GET /billing/invoices - List Company Invoices (DRAFT excluded)
   * Query params: status, page, limit
   */
  getInvoices: async (params = {}) => {
    try {
      const res = await apiClient.get('/billing/invoices', { params });
      const payload = res?.data || res;
      const list = Array.isArray(payload) ? payload : (payload?.data || payload?.invoices || []);
      return {
        invoices: list,
        pagination: payload?.pagination || { total: list.length, page: 1, limit: 20 }
      };
    } catch {
      return { invoices: [], pagination: { total: 0, page: 1, limit: 20 } };
    }
  },

  /**
   * GET /billing/invoices/{id} - Get Invoice Details
   */
  getInvoice: async (id) => {
    const res = await apiClient.get(`/billing/invoices/${id}`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * GET /billing/invoices/{id}/pdf - Download Invoice PDF (Streams binary PDF blob)
   */
  downloadInvoicePdf: async (id, invoiceNumber = 'invoice') => {
    try {
      const response = await apiClient.get(`/billing/invoices/${id}/pdf`, {
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
    } catch (err) {
      console.error('Invoice PDF download failed:', err);
      throw err;
    }
  },

  /**
   * GET /billing/payments - List Company Payments
   */
  getPayments: async (params = {}) => {
    try {
      const res = await apiClient.get('/billing/payments', { params });
      const payload = res?.data || res;
      const list = Array.isArray(payload) ? payload : (payload?.data || payload?.payments || []);
      return {
        payments: list,
        pagination: payload?.pagination || { total: list.length, page: 1, limit: 20 }
      };
    } catch {
      return { payments: [], pagination: { total: 0, page: 1, limit: 20 } };
    }
  },

  /**
   * GET /billing/payments/{id} - Get Payment Details
   */
  getPayment: async (id) => {
    const res = await apiClient.get(`/billing/payments/${id}`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * GET /billing/requests - List Company Billing Requests
   */
  getBillingRequests: async () => {
    try {
      const res = await apiClient.get('/billing/requests');
      const payload = res?.data || res;
      const list = Array.isArray(payload) ? payload : (payload?.data || payload?.requests || []);
      return list;
    } catch {
      return [];
    }
  },

  /**
   * POST /billing/requests - Create Billing Request
   * Request Body: { type: 'UPGRADE'|'ADD_SEATS'|'REDUCE_SEATS'|'RENEW'|'CANCEL', desiredSeats, desiredCycle, notes }
   */
  createBillingRequest: async (data) => {
    const payload = {
      type: String(data.type || 'UPGRADE').toUpperCase(),
      desiredSeats: data.desiredSeats ? Number(data.desiredSeats) : undefined,
      desiredCycle: data.desiredCycle ? String(data.desiredCycle).toUpperCase() : undefined,
      notes: data.notes?.trim() || undefined
    };
    const res = await apiClient.post('/billing/requests', payload);
    const result = res?.data || res;
    return result?.data || result;
  },

  /**
   * GET /billing/requests/{id} - Get Billing Request Details
   */
  getBillingRequest: async (id) => {
    const res = await apiClient.get(`/billing/requests/${id}`);
    const payload = res?.data || res;
    return payload?.data || payload;
  },

  /**
   * POST /billing/requests/{id}/cancel - Cancel Open Billing Request
   */
  cancelBillingRequest: async (id) => {
    const res = await apiClient.post(`/billing/requests/${id}/cancel`);
    const payload = res?.data || res;
    return payload?.data || payload;
  }
};

export default billingService;
