import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Receipt,
  Send,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Download,
  Trash2,
  Edit2,
  Clock,
  Building2,
  Eye,
  RotateCcw,
  Mail,
  Shield,
  Calendar,
  Sparkles,
  Ban,
  Check
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { adminService } from '../../services/adminService';
import { formatCurrency, formatPaise } from '../../utils/formatCurrency';
import { extractErrorMessage } from '../../utils/errorHandler';

export function SuperAdminBilling({ companies = [], onNotification }) {
  const [subTab, setSubTab] = useState('overview'); // 'overview' | 'invoices' | 'payments' | 'requests' | 'actions'
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Live Data States
  const [overview, setOverview] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [requests, setRequests] = useState([]);

  // Filters
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');
  const [invoiceCompanyFilter, setInvoiceCompanyFilter] = useState('ALL');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('ALL');

  // Modals
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    companyId: '',
    invoiceType: 'SUBSCRIPTION',
    seats: 15,
    billingCycle: 'MONTHLY',
    dueDate: '',
    notes: '',
    description: 'Studio Pro Subscription',
    amountInr: 7500
  });

  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amountInr: '',
    method: 'BANK_TRANSFER',
    reference: '',
    notes: ''
  });

  const [reversePaymentOpen, setReversePaymentOpen] = useState(false);
  const [selectedPaymentForReverse, setSelectedPaymentForReverse] = useState(null);
  const [reverseReason, setReverseReason] = useState('');

  const [resolveRequestOpen, setResolveRequestOpen] = useState(false);
  const [selectedRequestForResolve, setSelectedRequestForResolve] = useState(null);
  const [resolveForm, setResolveForm] = useState({
    resolutionNotes: 'Approved and invoice drafted.',
    createInvoice: true
  });

  const [rejectRequestOpen, setRejectRequestOpen] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [graceModalOpen, setGraceModalOpen] = useState(false);
  const [graceForm, setGraceForm] = useState({
    companyId: '',
    additionalDays: 7,
    reason: 'Client requested grace extension for offline bank clearance'
  });

  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantForm, setGrantForm] = useState({
    companyId: '',
    days: 14,
    reason: 'Complimentary trial period extended by Super Admin'
  });

  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [selectedInvoiceForVoid, setSelectedInvoiceForVoid] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  const [viewInvoiceModal, setViewInvoiceModal] = useState(null);

  // 1. Fetch live billing data
  const loadBillingData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, invData, payData, reqData] = await Promise.all([
        adminService.getBillingOverview().catch(() => null),
        adminService.getAdminInvoices().catch(() => ({ invoices: [] })),
        adminService.getAdminPayments().catch(() => ({ payments: [] })),
        adminService.getAdminBillingRequests().catch(() => [])
      ]);

      if (overviewData) setOverview(overviewData);
      setInvoices(invData?.invoices || []);
      setPayments(payData?.payments || []);
      setRequests(Array.isArray(reqData) ? reqData : (reqData?.requests || []));
    } catch (err) {
      console.warn('Super Admin billing data load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  // Handle Create Invoice Draft (POST /admin/billing/invoices)
  const handleCreateDraftInvoice = async (e) => {
    e.preventDefault();
    if (!newInvoiceForm.companyId) {
      onNotification?.('Please select a client company.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const unitPricePaise = Math.round((Number(newInvoiceForm.amountInr) || 0) * 100);
      const payload = {
        companyId: newInvoiceForm.companyId,
        invoiceType: newInvoiceForm.invoiceType,
        seats: Number(newInvoiceForm.seats) || 10,
        billingCycle: newInvoiceForm.billingCycle,
        dueDate: newInvoiceForm.dueDate ? new Date(newInvoiceForm.dueDate).toISOString() : undefined,
        notes: newInvoiceForm.notes?.trim() || undefined,
        lineItems: [
          {
            description: newInvoiceForm.description?.trim() || `${newInvoiceForm.invoiceType} (${newInvoiceForm.seats} seats)`,
            quantity: 1,
            unitPricePaise: unitPricePaise
          }
        ]
      };

      await adminService.createInvoiceDraft(payload);
      onNotification?.('Draft invoice created successfully.', 'success');
      setCreateInvoiceOpen(false);
      loadBillingData();
    } catch (err) {
      onNotification?.(extractErrorMessage(err) || 'Failed to create invoice draft.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Issue Invoice (POST /admin/billing/invoices/:id/issue)
  const handleIssueInvoice = async (invoiceId) => {
    if (!window.confirm('Issue this invoice? This will freeze snapshots and assign a permanent, gapless Financial Year invoice number.')) {
      return;
    }
    setActionLoading(true);
    try {
      await adminService.issueInvoice(invoiceId);
      onNotification?.('Invoice issued with permanent gapless sequence number.', 'success');
      loadBillingData();
    } catch (err) {
      onNotification?.(extractErrorMessage(err) || 'Failed to issue invoice.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Void Invoice (POST /admin/billing/invoices/:id/void)
  const handleVoidInvoice = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceForVoid) return;
    setActionLoading(true);
    try {
      await adminService.voidInvoice(selectedInvoiceForVoid._id || selectedInvoiceForVoid.id, voidReason);
      onNotification?.(`Invoice ${selectedInvoiceForVoid.invoiceNumber} voided.`, 'success');
      setVoidModalOpen(false);
      loadBillingData();
    } catch (err) {
      onNotification?.(extractErrorMessage(err) || 'Failed to void invoice. Ensure zero payments are attached.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Draft Invoice (DELETE /admin/billing/invoices/:id)
  const handleDeleteDraft = async (invoiceId) => {
    if (!window.confirm('Delete this draft invoice permanently?')) return;
    setActionLoading(true);
    try {
      await adminService.deleteDraftInvoice(invoiceId);
      onNotification?.('Draft invoice deleted.', 'success');
      loadBillingData();
    } catch (err) {
      onNotification?.(extractErrorMessage(err) || 'Failed to delete draft invoice.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Resend Notification (POST /admin/billing/invoices/:id/resend)
  const handleResendInvoice = async (invoiceId) => {
    try {
      await adminService.resendInvoiceNotification(invoiceId);
      onNotification?.('Invoice notification email dispatched to firm owner.', 'success');
    } catch (err) {
      onNotification?.(extractErrorMessage(err) || 'Failed to resend invoice email.', 'error');
    }
  };

  // Handle Download PDF (GET /admin/billing/invoices/:id/pdf)
  const handleDownloadPdf = async (inv) => {
    try {
      await adminService.downloadAdminInvoicePdf(inv._id || inv.id, inv.invoiceNumber || 'invoice');
      onNotification?.(`Invoice ${inv.invoiceNumber} downloaded.`, 'success');
    } catch (err) {
      onNotification?.('Failed to download invoice PDF.', 'error');
    }
  };

  // Handle Record Manual Payment (POST /admin/billing/payments)
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.invoiceId) {
      onNotification?.('Please select an invoice to credit.', 'error');
      return;
    }
    const amountPaise = Math.round((Number(paymentForm.amountInr) || 0) * 100);
    if (amountPaise <= 0) {
      onNotification?.('Please enter a valid payment amount.', 'error');
      return;
    }
    if (!paymentForm.reference?.trim()) {
      onNotification?.('UTR / Bank Cheque reference number is required.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await adminService.recordManualPayment({
        invoiceId: paymentForm.invoiceId,
        amountPaise,
        method: paymentForm.method,
        reference: paymentForm.reference.trim(),
        notes: paymentForm.notes?.trim()
      });
      onNotification?.('Payment recorded successfully! Subscription & seat limits atomically updated.', 'success');
      setRecordPaymentOpen(false);
      setPaymentForm({ invoiceId: '', amountInr: '', method: 'BANK_TRANSFER', reference: '', notes: '' });
      loadBillingData();
    } catch (err) {
      onNotification?.(extractErrorMessage(err) || 'Failed to record payment.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reverse Payment (POST /admin/billing/payments/:id/reverse)
  const handleReversePayment = async (e) => {
    e.preventDefault();
    if (!selectedPaymentForReverse) return;
    if (reverseReason.trim().length < 5) {
      onNotification?.('Please provide an audit reversal reason (at least 5 characters).', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await adminService.reversePayment(selectedPaymentForReverse._id || selectedPaymentForReverse.id, reverseReason);
      onNotification?.('Payment reversed. Applied subscription effects reverted in LIFO order.', 'success');
      setReversePaymentOpen(false);
      setSelectedPaymentForReverse(null);
      setReverseReason('');
      loadBillingData();
    } catch (err) {
      onNotification?.(extractErrorMessage(err) || 'Failed to reverse payment.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Resolve Request (POST /admin/billing/requests/:id/resolve)
  const handleResolveRequest = async (e) => {
    e.preventDefault();
    if (!selectedRequestForResolve) return;
    setActionLoading(true);
    try {
      await adminService.resolveBillingRequest(selectedRequestForResolve._id || selectedRequestForResolve.id, {
        resolutionNotes: resolveForm.resolutionNotes,
        createInvoice: resolveForm.createInvoice
      });
      onNotification?.('Billing request resolved successfully.', 'success');
      setResolveRequestOpen(false);
      loadBillingData();
    } catch (err) {
      onNotification?.(extractErrorMessage(err) || 'Failed to resolve request.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject Request (POST /admin/billing/requests/:id/reject)
  const handleRejectRequest = async (e) => {
    e.preventDefault();
    if (!selectedRequestForReject) return;
    if (rejectionReason.trim().length < 5) {
      onNotification?.('Please enter a rejection reason (min 5 characters).', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await adminService.rejectBillingRequest(selectedRequestForReject._id || selectedRequestForReject.id, rejectionReason);
      onNotification?.('Billing request rejected.', 'success');
      setRejectRequestOpen(false);
      loadBillingData();
    } catch (err) {
      onNotification?.(extractErrorMessage(err) || 'Failed to reject request.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Extend Grace (POST /admin/companies/:id/billing/grace)
  const handleExtendGrace = async (e) => {
    e.preventDefault();
    if (!graceForm.companyId) {
      onNotification?.('Please select a company.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await adminService.extendGracePeriod(graceForm.companyId, {
        additionalDays: Number(graceForm.additionalDays),
        reason: graceForm.reason
      });
      onNotification?.(`Grace period extended by ${graceForm.additionalDays} days.`, 'success');
      setGraceModalOpen(false);
      loadBillingData();
    } catch (err) {
      onNotification?.(extractErrorMessage(err) || 'Failed to extend grace period.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Grant Complimentary Days (POST /admin/companies/:id/billing/grant)
  const handleGrantComplimentary = async (e) => {
    e.preventDefault();
    if (!grantForm.companyId) {
      onNotification?.('Please select a company.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await adminService.grantComplimentary(grantForm.companyId, {
        days: Number(grantForm.days),
        reason: grantForm.reason
      });
      onNotification?.(`Granted ${grantForm.days} complimentary paid days.`, 'success');
      setGrantModalOpen(false);
      loadBillingData();
    } catch (err) {
      onNotification?.(extractErrorMessage(err) || 'Failed to grant complimentary days.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered lists
  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceStatusFilter !== 'ALL' && inv.status !== invoiceStatusFilter) return false;
    if (invoiceCompanyFilter !== 'ALL' && inv.companyId !== invoiceCompanyFilter) return false;
    return true;
  });

  const filteredPayments = payments.filter((pmt) => {
    if (!paymentSearch) return true;
    const q = paymentSearch.toLowerCase();
    return (
      (pmt.reference && pmt.reference.toLowerCase().includes(q)) ||
      (pmt.companyName && pmt.companyName.toLowerCase().includes(q)) ||
      (pmt.invoiceNumber && pmt.invoiceNumber.toLowerCase().includes(q))
    );
  });

  const filteredRequests = requests.filter((req) => {
    if (requestStatusFilter !== 'ALL' && req.status !== requestStatusFilter) return false;
    return true;
  });

  // Helper: Find company name by id
  const getCompanyName = (companyId) => {
    const comp = companies.find((c) => (c._id || c.id || c.name) === companyId);
    if (comp?.name) return comp.name;
    if (companyId && !/^[0-9a-fA-F]{24}$/.test(companyId)) return companyId;
    return 'Studio Firm';
  };

  return (
    <div className="super-admin-billing">
      {/* Financial & Subscription Management Section Header */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(183, 175, 166, 0.3)', paddingTop: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1E1A17', margin: 0 }}>
            Billing Operations & Revenue Metrics
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#7B6F62', margin: '4px 0 0 0' }}>
            Real-time platform subscriptions, manual offline invoices, and client requests.
          </p>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="billing-kpi-section">
        <div className="admin-kpi-grid">
          <div className="admin-kpi-card">
            <div className="kpi-icon-wrap bg-copper">
              <CreditCard size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">MONTHLY RECURRING (MRR)</span>
              <span className="kpi-value">{formatPaise(overview?.mrrPaise || overview?.mrr || 0)}</span>
              <span className="kpi-subtext">Active subscriptions</span>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="kpi-icon-wrap bg-green">
              <Receipt size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">TOTAL REVENUE RECORDED</span>
              <span className="kpi-value">{formatPaise(overview?.totalRevenuePaise || 0)}</span>
              <span className="kpi-subtext">Collected offline</span>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="kpi-icon-wrap bg-taupe">
              <Clock size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">PENDING INVOICES</span>
              <span className="kpi-value">{invoices.filter((i) => i.status === 'ISSUED').length}</span>
              <span className="kpi-subtext">Awaiting payment</span>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="kpi-icon-wrap bg-blue">
              <Send size={20} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">OPEN TENANT REQUESTS</span>
              <span className="kpi-value">{requests.filter((r) => r.status === 'PENDING').length}</span>
              <span className="kpi-subtext">Upgrade / seats queue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar & Sub-tabs */}
      <div className="admin-step-section">
        <div className="billing-subnav-bar">
          <div className="status-pill-group">
            <button
              type="button"
              className={`filter-pill ${subTab === 'overview' ? 'is-active' : ''}`}
              onClick={() => setSubTab('overview')}
            >
              Overview
            </button>
            <button
              type="button"
              className={`filter-pill ${subTab === 'invoices' ? 'is-active' : ''}`}
              onClick={() => setSubTab('invoices')}
            >
              Invoices
              <span className="filter-pill-badge">{invoices.length}</span>
            </button>
            <button
              type="button"
              className={`filter-pill ${subTab === 'payments' ? 'is-active' : ''}`}
              onClick={() => setSubTab('payments')}
            >
              Manual Payments
              <span className="filter-pill-badge">{payments.length}</span>
            </button>
            <button
              type="button"
              className={`filter-pill ${subTab === 'requests' ? 'is-active' : ''}`}
              onClick={() => setSubTab('requests')}
            >
              Tenant Requests
              <span className="filter-pill-badge">{requests.length}</span>
            </button>
            <button
              type="button"
              className={`filter-pill ${subTab === 'actions' ? 'is-active' : ''}`}
              onClick={() => setSubTab('actions')}
            >
              Grace & Grants
            </button>
          </div>

          <div className="billing-subnav-actions">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={loadBillingData}
              disabled={loading}
            >
              Refresh
            </Button>
            {subTab === 'invoices' && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setCreateInvoiceOpen(true)}
              >
                Create Invoice Draft
              </Button>
            )}
            {subTab === 'payments' && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setRecordPaymentOpen(true)}
              >
                Record Manual Payment
              </Button>
            )}
          </div>
        </div>

        {/* SUB-TAB 1: OVERVIEW METRICS */}
        {subTab === 'overview' && (
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, color: '#1E1A17' }}>
              Platform Commercial Engine Status (M1.6 Manual Model)
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#7B6F62', lineHeight: 1.5 }}>
              This platform operates on an offline payment workflow. Invoices are issued with permanent gapless financial
              year sequence numbers (`INV/2026-27/XXXX`). When a firm completes payment via Bank Transfer, UPI, Cheque, or Cash,
              recording the payment atomically raises their seat limit, sets subscription expiry, and clears read-only restriction gates.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#FAF8F5', border: '1px solid #ECE7E0', borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#9E9286', textTransform: 'uppercase' }}>PAID SUBSCRIPTIONS</span>
                <h4 style={{ margin: '6px 0 2px', fontSize: '20px', color: '#1E1A17' }}>
                  {overview?.activePaidSubscriptionsCount || 0}
                </h4>
                <span style={{ fontSize: '12px', color: '#7B6F62' }}>Active Pro studio accounts</span>
              </div>

              <div style={{ background: '#FAF8F5', border: '1px solid #ECE7E0', borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#9E9286', textTransform: 'uppercase' }}>FREE FOUNDATION TIER</span>
                <h4 style={{ margin: '6px 0 2px', fontSize: '20px', color: '#1E1A17' }}>
                  {overview?.freeTierCount || Math.max(0, companies.length - (overview?.activePaidSubscriptionsCount || 0))}
                </h4>
                <span style={{ fontSize: '12px', color: '#7B6F62' }}>10 seats free forever quota</span>
              </div>

              <div style={{ background: '#FAF8F5', border: '1px solid #ECE7E0', borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#9E9286', textTransform: 'uppercase' }}>GRACE PERIOD ACTIVE</span>
                <h4 style={{ margin: '6px 0 2px', fontSize: '20px', color: '#D97706' }}>
                  {overview?.gracePeriodCount || 0}
                </h4>
                <span style={{ fontSize: '12px', color: '#7B6F62' }}>7-day transition window</span>
              </div>

              <div style={{ background: '#FAF8F5', border: '1px solid #ECE7E0', borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#9E9286', textTransform: 'uppercase' }}>RESTRICTED / EXPIRED</span>
                <h4 style={{ margin: '6px 0 2px', fontSize: '20px', color: '#DC2626' }}>
                  {overview?.restrictedCount || 0}
                </h4>
                <span style={{ fontSize: '12px', color: '#7B6F62' }}>Over-limit read-only gate</span>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: INVOICES WORKBENCH */}
        {subTab === 'invoices' && (
          <div className="admin-table-card">
            {/* Filter toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #ECE7E0', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#7B6F62' }}>Status:</span>
                {['ALL', 'DRAFT', 'ISSUED', 'PAID', 'VOID'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`filter-pill ${invoiceStatusFilter === st ? 'is-active' : ''}`}
                    onClick={() => setInvoiceStatusFilter(st)}
                    style={{ fontSize: '11.5px', padding: '3px 9px' }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div style={{ minWidth: '200px' }}>
                <select
                  value={invoiceCompanyFilter}
                  onChange={(e) => setInvoiceCompanyFilter(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #E5DFD7',
                    fontSize: '12px',
                    background: '#FFFFFF'
                  }}
                >
                  <option value="ALL">All Companies ({companies.length})</option>
                  {companies.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#7B6F62' }}>
                <Receipt size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <h4 style={{ margin: '0 0 4px', fontWeight: 600 }}>No Invoices Found</h4>
                <p style={{ margin: 0, fontSize: '12.5px' }}>
                  Create a new draft invoice to bill a company for subscriptions or seat additions.
                </p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Company</th>
                    <th>Type / Cycle</th>
                    <th>Subtotal</th>
                    <th>GST</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => {
                    const isDraft = inv.status === 'DRAFT';
                    const isIssued = inv.status === 'ISSUED';
                    const isPaid = inv.status === 'PAID';
                    const isVoid = inv.status === 'VOID';

                    return (
                      <tr key={inv._id || inv.id}>
                        <td>
                          <strong>{inv.invoiceNumber || 'DRAFT'}</strong>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#1E1A17' }}>
                            {getCompanyName(inv.companyId)}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: '#7B6F62' }}>
                            {inv.invoiceType} ({inv.seats} seats)
                          </span>
                        </td>
                        <td>{formatPaise(inv.subtotalPaise)}</td>
                        <td>{formatPaise(inv.totalGstPaise || (inv.cgstPaise + inv.sgstPaise + inv.igstPaise))}</td>
                        <td>
                          <strong>{formatPaise(inv.totalPaise)}</strong>
                        </td>
                        <td>
                          <span className={`inv-badge inv-badge-${(inv.status || 'DRAFT').toLowerCase()}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                            {/* View details */}
                            <button
                              type="button"
                              className="action-icon-btn"
                              title="View Invoice Details"
                              onClick={() => setViewInvoiceModal(inv)}
                            >
                              <Eye size={14} />
                            </button>

                            {/* Download PDF */}
                            {!isDraft && (
                              <button
                                type="button"
                                className="action-icon-btn"
                                title="Download PDF"
                                onClick={() => handleDownloadPdf(inv)}
                              >
                                <Download size={14} />
                              </button>
                            )}

                            {/* Draft actions: Issue or Delete */}
                            {isDraft && (
                              <>
                                <button
                                  type="button"
                                  className="action-icon-btn highlight"
                                  title="Issue Invoice (Assigns gapless number)"
                                  onClick={() => handleIssueInvoice(inv._id || inv.id)}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="action-icon-btn danger"
                                  title="Delete Draft Invoice"
                                  onClick={() => handleDeleteDraft(inv._id || inv.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}

                            {/* Issued actions: Record Payment, Resend, or Void */}
                            {isIssued && (
                              <>
                                <button
                                  type="button"
                                  className="action-icon-btn highlight"
                                  title="Record Payment against this invoice"
                                  onClick={() => {
                                    setPaymentForm({
                                      invoiceId: inv._id || inv.id,
                                      amountInr: (inv.totalPaise / 100).toString(),
                                      method: 'BANK_TRANSFER',
                                      reference: '',
                                      notes: `Payment for ${inv.invoiceNumber}`
                                    });
                                    setRecordPaymentOpen(true);
                                  }}
                                >
                                  <CreditCard size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="action-icon-btn"
                                  title="Resend Invoice Email"
                                  onClick={() => handleResendInvoice(inv._id || inv.id)}
                                >
                                  <Mail size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="action-icon-btn danger"
                                  title="Void Invoice"
                                  onClick={() => {
                                    setSelectedInvoiceForVoid(inv);
                                    setVoidReason('');
                                    setVoidModalOpen(true);
                                  }}
                                >
                                  <Ban size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SUB-TAB 3: MANUAL PAYMENTS LEDGER */}
        {subTab === 'payments' && (
          <div className="admin-table-card">
            {/* Search bar */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #ECE7E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="admin-search-wrap" style={{ maxWidth: '320px' }}>
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search by UTR reference..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                />
              </div>

              <span style={{ fontSize: '12px', color: '#7B6F62' }}>
                Atomic Subscription Sync Enabled
              </span>
            </div>

            {filteredPayments.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#7B6F62' }}>
                <CreditCard size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <h4 style={{ margin: '0 0 4px', fontWeight: 600 }}>No Payment Records Found</h4>
                <p style={{ margin: 0, fontSize: '12.5px' }}>
                  Record payments manually upon receiving NEFT/RTGS, UPI, or cheque remittances.
                </p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Method</th>
                    <th>UTR / Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((pmt) => (
                    <tr key={pmt._id || pmt.id}>
                      <td>
                        {pmt.recordedAt ? new Date(pmt.recordedAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td>
                        <strong>
                          {pmt.invoiceNumber ||
                            (pmt.invoiceId && !/^[0-9a-fA-F]{24}$/.test(pmt.invoiceId)
                              ? pmt.invoiceId
                              : 'Offline Receipt')}
                        </strong>
                      </td>
                      <td>
                        <span className="method-chip">{pmt.method}</span>
                      </td>
                      <td>
                        <code style={{ fontSize: '11.5px', background: '#F1ECE6', padding: '2px 6px', borderRadius: '4px' }}>
                          {pmt.reference}
                        </code>
                      </td>
                      <td>
                        <strong style={{ color: '#1E6B37' }}>{formatPaise(pmt.amountPaise)}</strong>
                      </td>
                      <td>
                        <span className={`request-badge ${pmt.reversed ? 'request-badge-rejected' : 'request-badge-resolved'}`}>
                          {pmt.reversed ? 'REVERSED' : 'CREDITED'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!pmt.reversed && (
                          <button
                            type="button"
                            className="action-icon-btn danger"
                            title="Reverse Payment (LIFO Rollback)"
                            onClick={() => {
                              setSelectedPaymentForReverse(pmt);
                              setReverseReason('');
                              setReversePaymentOpen(true);
                            }}
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SUB-TAB 4: TENANT REQUESTS */}
        {subTab === 'requests' && (
          <div className="admin-table-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #ECE7E0', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#7B6F62' }}>Status:</span>
              {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`filter-pill ${requestStatusFilter === st ? 'is-active' : ''}`}
                  onClick={() => setRequestStatusFilter(st)}
                  style={{ fontSize: '11.5px', padding: '3px 9px' }}
                >
                  {st}
                </button>
              ))}
            </div>

            {filteredRequests.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#7B6F62' }}>
                <Send size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <h4 style={{ margin: '0 0 4px', fontWeight: 600 }}>No Billing Requests In Queue</h4>
                <p style={{ margin: 0, fontSize: '12.5px' }}>
                  Upgrade and seat requests submitted by firm owners will appear here for review.
                </p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Company</th>
                    <th>Request Type</th>
                    <th>Desired Capacity</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req._id || req.id}>
                      <td>
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td>
                        <strong>{getCompanyName(req.companyId)}</strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{req.type}</span>
                      </td>
                      <td>
                        {req.desiredSeats ? `${req.desiredSeats} seats (${req.desiredCycle || 'MONTHLY'})` : '—'}
                      </td>
                      <td>
                        <span className={`request-badge request-badge-${(req.status || 'PENDING').toLowerCase()}`}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#7B6F62', maxWidth: '240px' }}>
                        {req.notes || '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {req.status === 'PENDING' && (
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setSelectedRequestForResolve(req);
                                setResolveForm({ resolutionNotes: 'Approved request & drafted invoice.', createInvoice: true });
                                setResolveRequestOpen(true);
                              }}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setSelectedRequestForReject(req);
                                setRejectionReason('');
                                setRejectRequestOpen(true);
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SUB-TAB 5: GRACE PERIOD & COMPLIMENTARY GRANTS */}
        {subTab === 'actions' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Extend Grace Card */}
            <div className="admin-table-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <Clock size={20} color="#D97706" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E1A17' }}>
                  Extend Grace Period (1 to 30 Days)
                </h3>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#7B6F62', lineHeight: 1.5 }}>
                Provide temporary relief for an expiring company while waiting for board approval or cheque clearance.
                Full write access remains active during grace without restriction.
              </p>
              <Button
                variant="primary"
                icon={Clock}
                onClick={() => setGraceModalOpen(true)}
              >
                Configure Grace Extension
              </Button>
            </div>

            {/* Grant Complimentary Days Card */}
            <div className="admin-table-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <Sparkles size={20} color="#1E6B37" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E1A17' }}>
                  Grant Complimentary Paid Days (1 to 90 Days)
                </h3>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#7B6F62', lineHeight: 1.5 }}>
                Extend a company's paid Pro subscription as an administrative courtesy, trial extension, or compensation
                for onboarding migration assistance.
              </p>
              <Button
                variant="primary"
                icon={Sparkles}
                onClick={() => setGrantModalOpen(true)}
              >
                Grant Free Pro Days
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE INVOICE DRAFT */}
      <Modal
        isOpen={createInvoiceOpen}
        onClose={() => setCreateInvoiceOpen(false)}
        title="Create Invoice Draft (Module M1.6)"
        maxWidth="580px"
      >
        <form onSubmit={handleCreateDraftInvoice} className="billing-request-form">
          <Select
            label="Client Company"
            id="inv-company"
            value={newInvoiceForm.companyId}
            onChange={(e) => setNewInvoiceForm((prev) => ({ ...prev, companyId: e.target.value }))}
            options={[
              { value: '', label: 'Select client firm...' },
              ...companies.map((c) => ({ value: c._id || c.id, label: c.name }))
            ]}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Invoice Type"
              id="inv-type"
              value={newInvoiceForm.invoiceType}
              onChange={(e) => setNewInvoiceForm((prev) => ({ ...prev, invoiceType: e.target.value }))}
              options={[
                { value: 'SUBSCRIPTION', label: 'New Subscription' },
                { value: 'SEAT_ADDITION', label: 'Seat Expansion' },
                { value: 'RENEWAL', label: 'Subscription Renewal' },
                { value: 'CUSTOM', label: 'Custom Architectural Services' }
              ]}
              required
            />
            <Select
              label="Billing Cycle"
              id="inv-cycle"
              value={newInvoiceForm.billingCycle}
              onChange={(e) => {
                const cycle = e.target.value;
                const s = Number(newInvoiceForm.seats) || 10;
                let payMonths = 1;
                if (cycle === 'QUARTERLY') payMonths = 3;
                if (cycle === 'YEARLY') payMonths = 10;
                setNewInvoiceForm((prev) => ({
                  ...prev,
                  billingCycle: cycle,
                  amountInr: s * 500 * payMonths,
                  description: `Studio Pro Subscription (${s} Seats, ${cycle.toLowerCase()})`
                }));
              }}
              options={[
                { value: 'MONTHLY', label: 'Monthly' },
                { value: 'QUARTERLY', label: 'Quarterly (3 Months)' },
                { value: 'YEARLY', label: 'Yearly (10 Pay Months - 2 Free!)' }
              ]}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Licensed Seats"
              id="inv-seats"
              type="number"
              min="1"
              max="500"
              value={newInvoiceForm.seats}
              onChange={(e) => {
                const s = Number(e.target.value) || 1;
                let payMonths = 1;
                if (newInvoiceForm.billingCycle === 'QUARTERLY') payMonths = 3;
                if (newInvoiceForm.billingCycle === 'YEARLY') payMonths = 10;
                setNewInvoiceForm((prev) => ({
                  ...prev,
                  seats: s,
                  amountInr: s * 500 * payMonths,
                  description: `Studio Pro Subscription (${s} Seats, ${newInvoiceForm.billingCycle.toLowerCase()})`
                }));
              }}
              required
            />
            <Input
              label="Taxable Amount (₹ INR)"
              id="inv-amount"
              type="number"
              step="1"
              value={newInvoiceForm.amountInr}
              onChange={(e) => setNewInvoiceForm((prev) => ({ ...prev, amountInr: Number(e.target.value) || 0 }))}
              required
            />
          </div>

          {/* Live GST Calculation Preview */}
          <div style={{ background: '#FAF8F5', border: '1px solid #ECE7E0', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7B6F62' }}>
              <span>Taxable Value:</span>
              <strong>{formatCurrency(Number(newInvoiceForm.amountInr) || 0)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7B6F62' }}>
              <span>18% GST (CGST 9% + SGST 9%):</span>
              <strong>{formatCurrency(Math.round((Number(newInvoiceForm.amountInr) || 0) * 0.18))}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1E1A17', borderTop: '1px dashed #E5DFD7', paddingTop: '4px', marginTop: '2px', fontWeight: 700 }}>
              <span>Total Payable with GST:</span>
              <strong style={{ color: '#1E6B37' }}>
                {formatCurrency(Math.round((Number(newInvoiceForm.amountInr) || 0) * 1.18))}
              </strong>
            </div>
          </div>

          <Input
            label="Line Item Description"
            id="inv-desc"
            value={newInvoiceForm.description}
            onChange={(e) => setNewInvoiceForm((prev) => ({ ...prev, description: e.target.value }))}
            required
          />

          <Input
            label="Payment Due Date (Optional)"
            id="inv-due-date"
            type="date"
            value={newInvoiceForm.dueDate}
            onChange={(e) => setNewInvoiceForm((prev) => ({ ...prev, dueDate: e.target.value }))}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateInvoiceOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving...' : 'Create Draft'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: RECORD MANUAL PAYMENT */}
      <Modal
        isOpen={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        title="Record Manual Offline Payment"
        maxWidth="540px"
      >
        <form onSubmit={handleRecordPayment} className="billing-request-form">
          <Select
            label="Target Invoice to Credit"
            id="pmt-invoice"
            value={paymentForm.invoiceId}
            onChange={(e) => {
              const selectedInv = invoices.find((i) => (i._id || i.id) === e.target.value);
              setPaymentForm((prev) => ({
                ...prev,
                invoiceId: e.target.value,
                amountInr: selectedInv ? ((selectedInv.totalPaise - (selectedInv.paidPaise || 0)) / 100).toString() : prev.amountInr
              }));
            }}
            options={[
              { value: '', label: 'Select invoice...' },
              ...invoices
                .filter((i) => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID')
                .map((i) => ({
                  value: i._id || i.id,
                  label: `${i.invoiceNumber || 'INV'} - ${getCompanyName(i.companyId)} (${formatPaise(i.totalPaise)})`
                }))
            ]}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input
              label="Amount Credited (₹ INR)"
              id="pmt-amount"
              type="number"
              step="0.01"
              value={paymentForm.amountInr}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, amountInr: e.target.value }))}
              required
            />
            <Select
              label="Payment Channel"
              id="pmt-method"
              value={paymentForm.method}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
              options={[
                { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
                { value: 'UPI', label: 'Corporate UPI' },
                { value: 'CHEQUE', label: 'Bank Cheque' },
                { value: 'CASH', label: 'Cash Receipt' },
                { value: 'OTHER', label: 'Other Offline Instrument' }
              ]}
              required
            />
          </div>

          <Input
            label="Bank UTR / Cheque Reference Number"
            id="pmt-ref"
            placeholder="e.g. HDFC20261026008492"
            value={paymentForm.reference}
            onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
            required
          />

          <div className="form-group-row">
            <label className="form-label" htmlFor="pmt-notes">
              Payment Remarks & Audit Notes
            </label>
            <textarea
              id="pmt-notes"
              className="form-textarea"
              rows={2}
              placeholder="e.g. Credited via HDFC current account, confirmed with bank statement..."
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: '#065F46' }}>
            <strong>Atomic Activation:</strong> Fully paying this invoice will immediately activate the firm's subscription,
            synchronize seat limits, and release any restriction gate.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRecordPaymentOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: REVERSE PAYMENT */}
      <Modal
        isOpen={reversePaymentOpen}
        onClose={() => setReversePaymentOpen(false)}
        title="Reverse Payment (LIFO Rollback)"
      >
        <form onSubmit={handleReversePayment} className="billing-request-form">
          <div style={{ fontSize: '13px', color: '#7B6F62' }}>
            You are reversing payment <strong>{selectedPaymentForReverse?.reference}</strong> ({formatPaise(selectedPaymentForReverse?.amountPaise)}).
            This rolls back the invoice status and reverses the applied subscription effect.
          </div>

          <Input
            label="Audit Reversal Reason (Min 5 chars)"
            id="rev-reason"
            placeholder="e.g. Cheque returned by clearing house due to signature mismatch"
            value={reverseReason}
            onChange={(e) => setReverseReason(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReversePaymentOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={actionLoading}
            >
              {actionLoading ? 'Reversing...' : 'Confirm Reversal'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: RESOLVE REQUEST */}
      <Modal
        isOpen={resolveRequestOpen}
        onClose={() => setResolveRequestOpen(false)}
        title="Resolve Tenant Billing Request"
      >
        <form onSubmit={handleResolveRequest} className="billing-request-form">
          <div style={{ fontSize: '13px', color: '#7B6F62' }}>
            Firm: <strong>{getCompanyName(selectedRequestForResolve?.companyId)}</strong> | Type: <strong>{selectedRequestForResolve?.type}</strong>
          </div>

          <Input
            label="Resolution Notes"
            id="res-notes"
            value={resolveForm.resolutionNotes}
            onChange={(e) => setResolveForm((prev) => ({ ...prev, resolutionNotes: e.target.value }))}
            required
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1E1A17', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={resolveForm.createInvoice}
              onChange={(e) => setResolveForm((prev) => ({ ...prev, createInvoice: e.target.checked }))}
            />
            <span>Automatically generate draft tax invoice for this resolution</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setResolveRequestOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Resolving...' : 'Resolve Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: REJECT REQUEST */}
      <Modal
        isOpen={rejectRequestOpen}
        onClose={() => setRejectRequestOpen(false)}
        title="Reject Tenant Billing Request"
      >
        <form onSubmit={handleRejectRequest} className="billing-request-form">
          <Input
            label="Rejection Reason"
            id="rej-reason"
            placeholder="e.g. Current team usage exceeds requested downgrade limit"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRejectRequestOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={actionLoading}
            >
              {actionLoading ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: EXTEND GRACE */}
      <Modal
        isOpen={graceModalOpen}
        onClose={() => setGraceModalOpen(false)}
        title="Extend Company Grace Period"
      >
        <form onSubmit={handleExtendGrace} className="billing-request-form">
          <Select
            label="Target Company"
            id="grace-company"
            value={graceForm.companyId}
            onChange={(e) => setGraceForm((prev) => ({ ...prev, companyId: e.target.value }))}
            options={[
              { value: '', label: 'Select client firm...' },
              ...companies.map((c) => ({ value: c._id || c.id, label: c.name }))
            ]}
            required
          />

          <Input
            label="Additional Grace Days (1 to 30)"
            id="grace-days"
            type="number"
            min="1"
            max="30"
            value={graceForm.additionalDays}
            onChange={(e) => setGraceForm((prev) => ({ ...prev, additionalDays: e.target.value }))}
            required
          />

          <Input
            label="Audit Justification Reason"
            id="grace-reason"
            value={graceForm.reason}
            onChange={(e) => setGraceForm((prev) => ({ ...prev, reason: e.target.value }))}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setGraceModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Extending...' : 'Extend Grace'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 7: GRANT COMPLIMENTARY DAYS */}
      <Modal
        isOpen={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        title="Grant Complimentary Paid Pro Days"
      >
        <form onSubmit={handleGrantComplimentary} className="billing-request-form">
          <Select
            label="Target Company"
            id="grant-company"
            value={grantForm.companyId}
            onChange={(e) => setGrantForm((prev) => ({ ...prev, companyId: e.target.value }))}
            options={[
              { value: '', label: 'Select client firm...' },
              ...companies.map((c) => ({ value: c._id || c.id, label: c.name }))
            ]}
            required
          />

          <Input
            label="Complimentary Days to Grant (1 to 90)"
            id="grant-days"
            type="number"
            min="1"
            max="90"
            value={grantForm.days}
            onChange={(e) => setGrantForm((prev) => ({ ...prev, days: e.target.value }))}
            required
          />

          <Input
            label="Administrative Grant Reason"
            id="grant-reason"
            value={grantForm.reason}
            onChange={(e) => setGrantForm((prev) => ({ ...prev, reason: e.target.value }))}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setGrantModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Granting...' : 'Grant Pro Days'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 8: VOID INVOICE */}
      <Modal
        isOpen={voidModalOpen}
        onClose={() => setVoidModalOpen(false)}
        title="Void Issued Invoice"
      >
        <form onSubmit={handleVoidInvoice} className="billing-request-form">
          <div style={{ fontSize: '13px', color: '#7B6F62' }}>
            Voiding invoice <strong>{selectedInvoiceForVoid?.invoiceNumber}</strong>. Note that void invoices retain
            their sequence number for legal accounting audit compliance. Only invoices with 0 payments can be voided.
          </div>

          <Input
            label="Void Reason"
            id="void-reason"
            placeholder="e.g. Duplicate order created in error / customer changed firm legal entity"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setVoidModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={actionLoading}
            >
              {actionLoading ? 'Voiding...' : 'Void Invoice'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 9: VIEW INVOICE DETAIL */}
      <Modal
        isOpen={Boolean(viewInvoiceModal)}
        onClose={() => setViewInvoiceModal(null)}
        title={viewInvoiceModal ? `Invoice Details: ${viewInvoiceModal.invoiceNumber || 'Draft'}` : ''}
        maxWidth="650px"
      >
        {viewInvoiceModal && (
          <div className="invoice-detail-body">
            <div className="inv-meta-grid">
              <div>
                <span className="inv-meta-label">INVOICE NUMBER</span>
                <strong>{viewInvoiceModal.invoiceNumber || 'DRAFT'}</strong>
              </div>
              <div>
                <span className="inv-meta-label">CLIENT FIRM</span>
                <span>{getCompanyName(viewInvoiceModal.companyId)}</span>
              </div>
              <div>
                <span className="inv-meta-label">STATUS</span>
                <span className={`inv-badge inv-badge-${(viewInvoiceModal.status || 'DRAFT').toLowerCase()}`}>
                  {viewInvoiceModal.status}
                </span>
              </div>
              <div>
                <span className="inv-meta-label">ISSUE DATE</span>
                <span>{viewInvoiceModal.issuedAt ? new Date(viewInvoiceModal.issuedAt).toLocaleDateString('en-IN') : 'Not Issued Yet'}</span>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <span className="inv-meta-label" style={{ marginBottom: '6px', display: 'block' }}>LINE ITEMS</span>
              <table className="admin-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewInvoiceModal.lineItems || []).map((li, idx) => (
                    <tr key={idx}>
                      <td>{li.description}</td>
                      <td style={{ textAlign: 'center' }}>{li.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatPaise(li.unitPricePaise)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPaise((li.quantity || 1) * (li.unitPricePaise || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="inv-total-summary">
              <div className="summary-line">
                <span>Subtotal (Taxable Value):</span>
                <span>{formatPaise(viewInvoiceModal.subtotalPaise)}</span>
              </div>
              {viewInvoiceModal.cgstPaise ? (
                <>
                  <div className="summary-line">
                    <span>CGST (9%):</span>
                    <span>{formatPaise(viewInvoiceModal.cgstPaise)}</span>
                  </div>
                  <div className="summary-line">
                    <span>SGST (9%):</span>
                    <span>{formatPaise(viewInvoiceModal.sgstPaise)}</span>
                  </div>
                </>
              ) : null}
              {viewInvoiceModal.igstPaise ? (
                <div className="summary-line">
                  <span>IGST (18%):</span>
                  <span>{formatPaise(viewInvoiceModal.igstPaise)}</span>
                </div>
              ) : null}
              <div className="summary-line grand-line">
                <span>Total Amount:</span>
                <strong>{formatPaise(viewInvoiceModal.totalPaise)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.25rem' }}>
              {viewInvoiceModal.status !== 'DRAFT' && (
                <Button
                  variant="secondary"
                  icon={Download}
                  onClick={() => handleDownloadPdf(viewInvoiceModal)}
                >
                  Download PDF
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setViewInvoiceModal(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SuperAdminBilling;
