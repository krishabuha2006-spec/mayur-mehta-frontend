import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle,
  HardDrive,
  FileText,
  Sparkles,
  Users,
  Check,
  Download,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  Send,
  Building2,
  RefreshCw,
  Eye,
  Receipt,
  HelpCircle,
  Copy,
  Search,
  Filter,
  CheckCheck,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { Card } from '../../components/common/Card/Card';
import { EmptyState } from '../../components/common/EmptyState/EmptyState';
import { billingService } from '../../services/billingService';
import { useConfirm } from '../../context/ConfirmationContext';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatPaise } from '../../utils/formatCurrency';
import { extractErrorMessage } from '../../utils/errorHandler';
import { Toast } from '../../components/common/Toast/Toast';
import './BillingPage.css';

const toNum = (val, fallback = 10) => {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (val && typeof val === 'object') {
    return Number(val.limit ?? val.total ?? val.used ?? val.max ?? fallback) || fallback;
  }
  const parsed = Number(val);
  return isNaN(parsed) ? fallback : parsed;
};

export function BillingPage() {
  const confirm = useConfirm();
  const { company, subscription: authSubscription, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'invoices' | 'payments' | 'requests'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Live Subscription Data initialized from active auth context
  const [subscription, setSubscription] = useState(() => ({
    plan: authSubscription?.plan || company?.plan || 'FREE',
    planCode: (authSubscription?.plan || company?.plan || 'free').toLowerCase(),
    status: authSubscription?.status || company?.status || 'ACTIVE',
    seats: toNum(authSubscription?.seats?.limit ?? authSubscription?.seats ?? company?.seats, 10),
    seatsUsed: toNum(authSubscription?.seats?.used ?? authSubscription?.seatsUsed, 1),
    billingCycle: authSubscription?.billingCycle || 'MONTHLY',
    currentPeriodStart: authSubscription?.currentPeriodStart || null,
    currentPeriodEnd: authSubscription?.currentPeriodEnd || null,
    graceEndsAt: authSubscription?.graceEndsAt || null,
    storageQuotaGB: toNum(authSubscription?.storageQuotaGB, String(company?.plan).toUpperCase() === 'PAID' ? 100 : 5),
    storageUsedGB: toNum(authSubscription?.storageUsedGB, 1.2)
  }));

  // Plans & Quote Calculator State
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('MONTHLY'); // 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  const [desiredSeats, setDesiredSeats] = useState(15);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Invoices & Payments & Requests Data
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [billingRequests, setBillingRequests] = useState([]);

  // Search & Filter States
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [requestFilter, setRequestFilter] = useState('ALL');

  // Modals State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    type: 'UPGRADE',
    desiredSeats: 15,
    desiredCycle: 'MONTHLY',
    notes: ''
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // 1. Initial Load: Fetch live subscription, plans, invoices, payments, requests
  const loadBillingData = useCallback(async () => {
    setLoading(true);
    try {
      const [subData, plansData, invData, payData, reqData] = await Promise.all([
        billingService.getSubscription().catch(() => null),
        billingService.getPlans().catch(() => null),
        billingService.getInvoices().catch(() => ({ invoices: [] })),
        billingService.getPayments().catch(() => ({ payments: [] })),
        billingService.getBillingRequests().catch(() => [])
      ]);

      if (subData) {
        const parsedSeats = toNum(subData.seats?.limit ?? subData.seats ?? subData.seatLimit, 10);
        const parsedUsed = toNum(subData.seats?.used ?? subData.seatsUsed, 1);
        const parsedStorageLimit = toNum(subData.storageQuotaGB || (subData.storage?.limitBytes ? (subData.storage.limitBytes / (1024 ** 3)).toFixed(0) : 5), 5);
        const parsedStorageUsed = toNum(subData.storageUsedGB || (subData.storage?.usedBytes ? (subData.storage.usedBytes / (1024 ** 3)).toFixed(1) : 1.2), 1.2);

        setSubscription({
          plan: subData.plan || (subData.planCode ? subData.planCode.toUpperCase() : 'FREE'),
          planCode: subData.planCode || 'free',
          status: subData.status || 'ACTIVE',
          seats: parsedSeats,
          seatsUsed: parsedUsed,
          billingCycle: subData.billingCycle || 'MONTHLY',
          currentPeriodStart: subData.currentPeriodStart || null,
          currentPeriodEnd: subData.currentPeriodEnd || null,
          graceEndsAt: subData.graceEndsAt || null,
          storageQuotaGB: parsedStorageLimit,
          storageUsedGB: parsedStorageUsed
        });
        if (parsedSeats > 10) {
          setDesiredSeats(parsedSeats);
        }
      }

      if (plansData?.plans) {
        setPlans(plansData.plans);
      }
      setInvoices(invData?.invoices || []);
      setPayments(payData?.payments || []);
      setBillingRequests(Array.isArray(reqData) ? reqData : (reqData?.requests || []));
    } catch (err) {
      console.warn('Error loading billing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadBillingData();
  }, [authLoading, isAuthenticated, loadBillingData]);

  // 2. Dynamic Price Quote calculation (synchronous deterministic formula with 0ms delay and zero network error)
  useEffect(() => {
    const quoteRes = billingService.getQuote({
      seats: desiredSeats,
      billingCycle: billingCycle,
      isUpgrade: subscription.plan !== 'FREE'
    });
    setQuote(quoteRes);
    setQuoteLoading(false);
  }, [desiredSeats, billingCycle, subscription.plan]);

  // Modal estimate quote
  const modalQuoteEstimate = useMemo(() => {
    if (!['UPGRADE', 'ADD_SEATS', 'REDUCE_SEATS', 'RENEW'].includes(requestForm.type)) return null;
    return billingService.getQuote({
      seats: requestForm.desiredSeats || desiredSeats,
      billingCycle: requestForm.desiredCycle || billingCycle,
      isUpgrade: subscription.plan !== 'FREE'
    });
  }, [requestForm.type, requestForm.desiredSeats, requestForm.desiredCycle, desiredSeats, billingCycle, subscription.plan]);

  // 3. Submit Billing Request (UPGRADE, ADD_SEATS, RENEW, CANCEL)
  const handleOpenRequestModal = (type = 'UPGRADE') => {
    setRequestForm({
      type,
      desiredSeats: desiredSeats || (subscription.seats > 10 ? subscription.seats : 15),
      desiredCycle: billingCycle,
      notes: ''
    });
    setIsRequestModalOpen(true);
  };

  const handleSubmitBillingRequest = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const created = await billingService.createBillingRequest({
        type: requestForm.type,
        desiredSeats: Number(requestForm.desiredSeats),
        desiredCycle: requestForm.desiredCycle
      });

      if (created?.id && requestForm.notes?.trim()) {
        try {
          localStorage.setItem(`mm_req_note_${created.id}`, requestForm.notes.trim());
        } catch {}
      }

      showToast('Billing request submitted to Super Admin team successfully.');
      setIsRequestModalOpen(false);
      // Reload requests
      const reqList = await billingService.getBillingRequests().catch(() => []);
      setBillingRequests(Array.isArray(reqList) ? reqList : (reqList?.requests || []));
      setActiveTab('requests');
    } catch (err) {
      showToast(extractErrorMessage(err) || 'Failed to submit billing request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Cancel Open Billing Request
  const handleCancelRequest = async (requestId) => {
    const ok = await confirm({
      title: 'Cancel Billing Request?',
      message: 'Are you sure you want to cancel this pending billing request?',
      confirmText: 'Cancel Request',
      cancelText: 'Keep Request',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await billingService.cancelBillingRequest(requestId);
      showToast('Billing request cancelled.', 'success');
      const reqList = await billingService.getBillingRequests().catch(() => []);
      setBillingRequests(Array.isArray(reqList) ? reqList : (reqList?.requests || []));
    } catch (err) {
      showToast(extractErrorMessage(err) || 'Failed to cancel request', 'error');
    }
  };

  // 5. Download Invoice PDF
  const handleDownloadPdf = async (inv) => {
    try {
      await billingService.downloadInvoicePdf(inv._id || inv.id, inv.invoiceNumber || 'invoice');
      showToast(`Invoice ${inv.invoiceNumber} downloaded.`);
    } catch (err) {
      showToast('Unable to download PDF. Please try again.', 'error');
    }
  };

  // Calculations & Filtering
  const safeSeats = toNum(subscription.seats, 10);
  const safeSeatsUsed = toNum(subscription.seatsUsed, 1);
  const safeStorageQuota = toNum(subscription.storageQuotaGB, 5);
  const safeStorageUsed = toNum(subscription.storageUsedGB, 1.2);

  const seatPercent = Math.min(Math.round((safeSeatsUsed / safeSeats) * 100), 100);
  const storagePercent = Math.min(Math.round((safeStorageUsed / safeStorageQuota) * 100), 100);
  const availableSeats = Math.max(0, safeSeats - safeSeatsUsed);

  const isRestricted = subscription.status === 'RESTRICTED' || (subscription.status === 'EXPIRED' && safeSeatsUsed > 10);
  const isGrace = subscription.status === 'GRACE';

  // Invoice KPIs
  const totalInvoicedPaise = invoices.reduce((acc, inv) => acc + (inv.totalPaise || 0), 0);
  const totalPaidPaise = payments.reduce((acc, p) => acc + (p.amountPaise || 0), 0);
  const pendingInvoices = invoices.filter(inv => inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID');
  const pendingBalancePaise = Math.max(0, totalInvoicedPaise - totalPaidPaise);

  // Filtered lists
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !invoiceSearch || 
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase())) ||
      (inv.notes && inv.notes.toLowerCase().includes(invoiceSearch.toLowerCase()));
    const matchesFilter = invoiceFilter === 'ALL' || inv.status === invoiceFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredPayments = payments.filter(pmt => {
    const matchesSearch = !paymentSearch ||
      (pmt.reference && pmt.reference.toLowerCase().includes(paymentSearch.toLowerCase())) ||
      (pmt.invoiceNumber && pmt.invoiceNumber.toLowerCase().includes(paymentSearch.toLowerCase())) ||
      (pmt.notes && pmt.notes.toLowerCase().includes(paymentSearch.toLowerCase()));
    const matchesFilter = paymentFilter === 'ALL' || pmt.method === paymentFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredRequests = billingRequests.filter(req => {
    if (requestFilter === 'ALL') return true;
    return req.status === requestFilter;
  });

  const pendingRequestsCount = billingRequests.filter(r => r.status === 'PENDING').length;

  const invoiceFilterOptions = useMemo(() => [
    { value: 'ALL', label: `All Statuses (${invoices.length})` },
    { value: 'ISSUED', label: 'Issued / Pending' },
    { value: 'PAID', label: 'Paid' },
    { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { value: 'VOID', label: 'Void' }
  ], [invoices.length]);

  const paymentFilterOptions = useMemo(() => [
    { value: 'ALL', label: `All Payment Methods (${payments.length})` },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT' },
    { value: 'UPI', label: 'UPI' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'CREDIT_CARD', label: 'Credit Card' }
  ], [payments.length]);

  const requestFilterOptions = useMemo(() => [
    { value: 'ALL', label: `All Requests (${billingRequests.length})` },
    { value: 'PENDING', label: 'Pending Review' },
    { value: 'RESOLVED', label: 'Resolved / Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ], [billingRequests.length]);

  return (
    <div className="billing-page">
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '24px', right: '28px', zIndex: 999999 }}>
          <Toast
            type={toastMessage.type === 'error' ? 'error' : 'success'}
            message={toastMessage.message}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Main Header */}
      <header className="billing-header">
        <div className="billing-header-content">
          <div>
            <h1 className="billing-title">Subscription & Billing</h1>
            <p className="billing-subtitle">
              Manage studio capacity, 10-user permanent free quota, GST tax invoices, and payment ledger.
            </p>
          </div>
          <div className="billing-header-actions">
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={() => handleOpenRequestModal(subscription.plan === 'FREE' ? 'UPGRADE' : 'ADD_SEATS')}
            >
              Request Upgrade / Add Seats
            </Button>
          </div>
        </div>
      </header>

      {/* RESTRICTED STATUS BANNER */}
      {isRestricted && (
        <div className="billing-restricted-banner" role="alert">
          <div className="restricted-icon-wrap">
            <AlertTriangle size={24} />
          </div>
          <div className="restricted-content">
            <h4 className="restricted-title">Write Access Restricted (Subscription Expired)</h4>
            <p className="restricted-desc">
              Your firm has returned to the Free tier (10 seats quota) but currently has{' '}
              <strong>{safeSeatsUsed} users</strong> active. New project creation, team invitations, and edits
              are temporarily locked. Remove team members to reach 10 or submit an upgrade request to restore full write access immediately.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={() => handleOpenRequestModal('UPGRADE')}
              style={{ marginTop: '0.75rem' }}
            >
              Submit Upgrade / Renewal Request
            </Button>
          </div>
        </div>
      )}

      {/* GRACE PERIOD BANNER */}
      {isGrace && (
        <div className="billing-grace-banner" role="alert">
          <Clock size={20} className="grace-icon" />
          <div className="grace-content">
            <strong>7-Day Grace Period Active:</strong> Your paid subscription cycle has ended. Full read/write
            access remains active until{' '}
            <strong>
              {subscription.graceEndsAt
                ? new Date(subscription.graceEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '7 days'}
            </strong>
            . Please submit an offline renewal payment before grace elapses to prevent account restriction.
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={Send}
            onClick={() => handleOpenRequestModal('RENEW')}
          >
            Renew Subscription
          </Button>
        </div>
      )}

      {/* Top Level Summary Cards */}
      <section className="billing-kpi-grid">
        {/* KPI 1: Plan Tier */}
        <div className="billing-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">CURRENT PLAN</span>
            <span className={`kpi-status-badge status-${subscription.status.toLowerCase()}`}>
              {subscription.status}
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">
              {subscription.plan === 'FREE' ? 'Studio Foundation' : 'Studio Pro'}
            </span>
          </div>
          <div className="kpi-footer-text">
            {subscription.plan === 'FREE' ? (
              <span className="kpi-subtext text-success">
                <CheckCircle size={13} /> 10 Free Seats Forever
              </span>
            ) : subscription.currentPeriodEnd ? (
              <span className="kpi-subtext">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            ) : (
              <span className="kpi-subtext">Active Studio Subscription</span>
            )}
          </div>
        </div>

        {/* KPI 2: Seat Allocation */}
        <div className="billing-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">TEAM SEATS</span>
            <span className="kpi-badge-neutral">
              {availableSeats} Available
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">
              {safeSeatsUsed} <span className="kpi-total-denom">/ {safeSeats} active</span>
            </span>
            <span className="kpi-percent-tag">{seatPercent}%</span>
          </div>
          <div className="kpi-progress-bar">
            <div
              className={`kpi-progress-fill ${seatPercent >= 100 ? 'fill-danger' : seatPercent >= 80 ? 'fill-warning' : 'fill-primary'}`}
              style={{ width: `${seatPercent}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Storage Quota */}
        <div className="billing-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">CLOUD STORAGE</span>
            <span className="kpi-badge-neutral">
              {storagePercent}% Used
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">
              {safeStorageUsed} <span className="kpi-total-denom">/ {safeStorageQuota} GB</span>
            </span>
          </div>
          <div className="kpi-progress-bar">
            <div
              className={`kpi-progress-fill ${storagePercent >= 90 ? 'fill-warning' : 'fill-primary'}`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>

        {/* KPI 4: Financial Summary */}
        <div className="billing-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">BALANCE DUE</span>
            {pendingInvoices.length > 0 ? (
              <span className="kpi-badge-warning">{pendingInvoices.length} Due</span>
            ) : (
              <span className="kpi-badge-success">All Clear</span>
            )}
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">
              {pendingBalancePaise > 0 ? formatPaise(pendingBalancePaise) : '₹0'}
            </span>
            <span className="kpi-subtext-inline">
              {pendingBalancePaise > 0 ? 'Pending Payment' : 'No Outstanding Balance'}
            </span>
          </div>
          <div className="kpi-footer-text">
            <button
              type="button"
              className="kpi-link-btn"
              onClick={() => setActiveTab('invoices')}
            >
              View Invoices ({invoices.length}) <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="billing-tabs-nav">
        <button
          type="button"
          className={`billing-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Building2 size={16} />
          <span>Plans & Pricing</span>
        </button>

        <button
          type="button"
          className={`billing-tab-btn ${activeTab === 'invoices' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <Receipt size={16} />
          <span>Tax Invoices</span>
          {invoices.length > 0 && <span className="tab-count-pill">{invoices.length}</span>}
        </button>

        <button
          type="button"
          className={`billing-tab-btn ${activeTab === 'payments' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard size={16} />
          <span>Payment Ledger</span>
          {payments.length > 0 && <span className="tab-count-pill">{payments.length}</span>}
        </button>

        <button
          type="button"
          className={`billing-tab-btn ${activeTab === 'requests' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Send size={16} />
          <span>Billing Requests</span>
          {pendingRequestsCount > 0 ? (
            <span className="tab-count-pill pill-alert">{pendingRequestsCount} Pending</span>
          ) : billingRequests.length > 0 ? (
            <span className="tab-count-pill">{billingRequests.length}</span>
          ) : null}
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CAPACITY CALCULATOR */}
      {activeTab === 'overview' && (
        <div className="billing-tab-content">
          {/* Streamlined Permanent Quota Note */}
          <div className="billing-compact-strip">
            <div className="strip-left">
              <CheckCircle size={15} className="strip-icon" />
              <span>
                <strong>10 Permanent Free Seats:</strong> Studio free tier includes 10 permanent licenses with zero subscription charges. Pro expansions scale from the 11th seat at ₹500/seat/mo.
              </span>
            </div>
            <span className="strip-gst-tag">100% GST Compliant • SAC 998315</span>
          </div>

          {/* Clean Side-by-Side Plans Comparison */}
          <div className="plans-clean-grid">
            {/* Free Tier Card */}
            <div className={`plan-tier-card ${subscription.plan === 'FREE' ? 'is-active-tier' : ''}`}>
              <div className="plan-card-header">
                <div className="plan-name-row">
                  <h3 className="plan-tier-name">Studio Free</h3>
                  {subscription.plan === 'FREE' && <span className="plan-active-chip">Current Active Plan</span>}
                </div>
                <div className="plan-price-block">
                  <span className="plan-currency">₹</span>
                  <span className="plan-amount">0</span>
                  <span className="plan-period">/ month</span>
                </div>
                <p className="plan-tier-desc">Essential toolkit for boutique practices and emerging architecture studios.</p>
              </div>

              <div className="plan-divider" />

              <ul className="plan-features-list">
                <li><Check size={15} className="feat-check" /> <span><strong>10 Team Seats</strong> included free forever</span></li>
                <li><Check size={15} className="feat-check" /> <span><strong>5 GB</strong> High-speed drawing cloud storage</span></li>
                <li><Check size={15} className="feat-check" /> <span>Unlimited projects, logs, and tasks</span></li>
                <li><Check size={15} className="feat-check" /> <span>Client and contractor review portals</span></li>
              </ul>

              <div className="plan-tier-footer">
                <Button variant="secondary" disabled style={{ width: '100%' }}>
                  {subscription.plan === 'FREE' ? 'Currently Active Tier' : 'Base 10 Seats Included'}
                </Button>
              </div>
            </div>

            {/* Pro Tier Card */}
            <div className={`plan-tier-card highlight-tier ${subscription.plan !== 'FREE' ? 'is-active-tier' : ''}`}>
              <div className="plan-card-header">
                <div className="plan-name-row">
                  <h3 className="plan-tier-name">Studio Pro Expansion</h3>
                  {subscription.plan !== 'FREE' ? (
                    <span className="plan-active-chip">Current Active Plan</span>
                  ) : (
                    <span className="plan-upgrade-chip">Expansion Tier</span>
                  )}
                </div>
                <div className="plan-price-block">
                  <span className="plan-currency">₹</span>
                  <span className="plan-amount">500</span>
                  <span className="plan-period">/ seat / month (+18% GST)</span>
                </div>
                <p className="plan-tier-desc">Scale capacity for growing firms managing multi-site teams and large BIM files.</p>
              </div>

              <div className="plan-divider" />

              <ul className="plan-features-list">
                <li><Check size={15} className="feat-check" /> <span><strong>11 to 500</strong> scalable studio seats</span></li>
                <li><Check size={15} className="feat-check" /> <span><strong>100 GB</strong> cloud storage quota</span></li>
                <li><Check size={15} className="feat-check" /> <span>Official GST tax invoices with ITC</span></li>
                <li><Check size={15} className="feat-check" /> <span>Priority multi-site coordination</span></li>
              </ul>

              <div className="plan-tier-footer">
                <Button
                  variant="primary"
                  icon={Send}
                  onClick={() => handleOpenRequestModal(subscription.plan === 'FREE' ? 'UPGRADE' : 'ADD_SEATS')}
                  style={{ width: '100%' }}
                >
                  {subscription.plan === 'FREE' ? 'Request Pro Upgrade' : 'Request More Seats'}
                </Button>
              </div>
            </div>
          </div>

          {/* Interactive Capacity & Quote Calculator */}
          <section className="capacity-calculator-panel">
            <div className="calculator-header-row">
              <div>
                <h3 className="calc-title">Capacity & Quotation Calculator</h3>
                <p className="calc-subtitle">Adjust team capacity and view real-time GST tax breakdown.</p>
              </div>

              {/* Cycle Toggle */}
              <div className="cycle-toggle-wrap">
                <button
                  type="button"
                  className={`cycle-btn ${billingCycle === 'MONTHLY' ? 'is-active' : ''}`}
                  onClick={() => setBillingCycle('MONTHLY')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`cycle-btn ${billingCycle === 'QUARTERLY' ? 'is-active' : ''}`}
                  onClick={() => setBillingCycle('QUARTERLY')}
                >
                  Quarterly
                </button>
                <button
                  type="button"
                  className={`cycle-btn ${billingCycle === 'YEARLY' ? 'is-active' : ''}`}
                  onClick={() => setBillingCycle('YEARLY')}
                >
                  Annual (2 Mos Free)
                </button>
              </div>
            </div>

            <div className="calculator-body-grid">
              {/* Left Column: Seats Slider & Quick Presets */}
              <div className="calc-controls-col">
                <div className="slider-label-row">
                  <span className="slider-title">Team Seats Needed:</span>
                  <span className="slider-current-val">{desiredSeats} Seats</span>
                </div>

                <input
                  type="range"
                  min="11"
                  max="100"
                  step="1"
                  value={desiredSeats}
                  onChange={(e) => setDesiredSeats(Number(e.target.value))}
                  className="seat-range-slider"
                />

                <div className="calc-chips-row">
                  <span className="calc-chips-label">Quick select:</span>
                  {[15, 25, 50, 75, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`calc-chip-btn ${desiredSeats === num ? 'is-active' : ''}`}
                      onClick={() => setDesiredSeats(num)}
                    >
                      {num} Seats
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Live GST Quotation Summary */}
              <div className="calc-quote-col">
                <div className="quote-box">
                  <div className="quote-box-header">
                    <span className="quote-title">Estimated Cost</span>
                    {billingCycle === 'YEARLY' && (
                      <span className="quote-savings-pill">Pay 10, Get 12 Months!</span>
                    )}
                  </div>

                  {quoteLoading ? (
                    <div className="quote-loading-state">
                      <RefreshCw size={13} className="is-spinning" /> Calculating quote...
                    </div>
                  ) : quote ? (
                    <div className="quote-details-list">
                      <div className="quote-line">
                        <span>{desiredSeats} Seats ({billingCycle.toLowerCase()})</span>
                        <span className="quote-val">{formatPaise(quote.subtotalPaise)}</span>
                      </div>
                      <div className="quote-line">
                        <span>GST (18% ITC Eligible)</span>
                        <span className="quote-val">{formatPaise(quote.gstPaise)}</span>
                      </div>
                      <div className="quote-line quote-grand">
                        <span>Total Payable</span>
                        <span className="quote-grand-val">{formatPaise(quote.totalPaise)}</span>
                      </div>
                    </div>
                  ) : null}

                  <Button
                    variant="primary"
                    size="sm"
                    icon={Send}
                    onClick={() => handleOpenRequestModal(subscription.plan === 'FREE' ? 'UPGRADE' : 'ADD_SEATS')}
                    style={{ width: '100%', marginTop: '10px' }}
                  >
                    Submit Upgrade Request
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Compact Verified Banking Credentials */}
          <div className="offline-payment-guide-card">
            <div className="guide-header">
              <div className="guide-icon-box">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="guide-title">Verified Bank & Payment Credentials</h3>
                <p className="guide-subtitle">Official banking details for NEFT, RTGS, IMPS, or corporate UPI offline transfers</p>
              </div>
            </div>

            <div className="bank-details-grid">
              <div className="bank-detail-item">
                <div className="bank-item-head">
                  <span className="bank-label">BENEFICIARY</span>
                  <button
                    type="button"
                    className="bank-copy-btn"
                    onClick={() => copyToClipboard('MAYUR MEHTA DESIGN PRIVATE LIMITED', 'beneficiary')}
                  >
                    {copiedKey === 'beneficiary' ? <CheckCheck size={12} className="text-success" /> : <Copy size={12} />}
                    {copiedKey === 'beneficiary' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <span className="bank-val">MAYUR MEHTA DESIGN PRIVATE LIMITED</span>
              </div>

              <div className="bank-detail-item">
                <div className="bank-item-head">
                  <span className="bank-label">ACCOUNT NUMBER</span>
                  <button
                    type="button"
                    className="bank-copy-btn"
                    onClick={() => copyToClipboard('50200084729103', 'account')}
                  >
                    {copiedKey === 'account' ? <CheckCheck size={12} className="text-success" /> : <Copy size={12} />}
                    {copiedKey === 'account' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <span className="bank-val mono-val">50200084729103</span>
              </div>

              <div className="bank-detail-item">
                <div className="bank-item-head">
                  <span className="bank-label">BANK & IFSC</span>
                  <button
                    type="button"
                    className="bank-copy-btn"
                    onClick={() => copyToClipboard('HDFC0001245', 'ifsc')}
                  >
                    {copiedKey === 'ifsc' ? <CheckCheck size={12} className="text-success" /> : <Copy size={12} />}
                    {copiedKey === 'ifsc' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <span className="bank-val">HDFC Bank • <span className="mono-val">HDFC0001245</span></span>
              </div>

              <div className="bank-detail-item">
                <div className="bank-item-head">
                  <span className="bank-label">CORPORATE UPI ID</span>
                  <button
                    type="button"
                    className="bank-copy-btn"
                    onClick={() => copyToClipboard('billing@mayurmehta', 'upi')}
                  >
                    {copiedKey === 'upi' ? <CheckCheck size={12} className="text-success" /> : <Copy size={12} />}
                    {copiedKey === 'upi' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <span className="bank-val mono-val">billing@mayurmehta</span>
              </div>
            </div>

            <div className="guide-footer-note">
              <HelpCircle size={15} />
              <span>
                Please include your <strong>Invoice Number</strong> in the transfer remarks.
                After completing the transfer, notify us via billing request for immediate reconciliation.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OFFICIAL TAX INVOICES */}
      {activeTab === 'invoices' && (
        <section className="invoices-section">
          {/* Controls Bar */}
          <div className="table-controls-bar">
            <div className="search-filter-group">
              <div className="search-input-wrap">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search invoice number or notes..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="table-search-input"
                />
                {invoiceSearch && (
                  <button type="button" className="clear-search-btn" onClick={() => setInvoiceSearch('')}>
                    ×
                  </button>
                )}
              </div>

              <Select
                value={invoiceFilter}
                onChange={(e) => setInvoiceFilter(e.target.value)}
                options={invoiceFilterOptions}
                className="billing-filter-select"
              />
            </div>

            <div className="table-summary-badges">
              <span className="summary-pill">
                Total Invoiced: <strong>{formatPaise(totalInvoicedPaise)}</strong>
              </span>
              <span className="summary-pill">
                Total Paid: <strong>{formatPaise(totalPaidPaise)}</strong>
              </span>
            </div>
          </div>

          {/* Invoices Table Card */}
          <div className="invoices-table-card">
            {filteredInvoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={invoices.length === 0 ? "No Invoices Issued Yet" : "No Matching Invoices"}
                message={
                  invoices.length === 0
                    ? "Invoices generated by the Super Admin team for new subscriptions or seat expansions will appear here."
                    : "No invoices matched your search and filter criteria."
                }
                actionButton={
                  invoices.length === 0 ? (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Send}
                      onClick={() => handleOpenRequestModal('UPGRADE')}
                    >
                      Request Pro Upgrade
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setInvoiceSearch('');
                        setInvoiceFilter('ALL');
                      }}
                    >
                      Reset Filters
                    </Button>
                  )
                }
              />
            ) : (
              <div className="table-responsive">
                <table className="invoices-table">
                  <thead>
                    <tr>
                      <th>INVOICE NUMBER</th>
                      <th>ISSUE DATE</th>
                      <th>DUE DATE</th>
                      <th>TYPE / SEATS</th>
                      <th>TAXABLE AMOUNT</th>
                      <th>GST (18%)</th>
                      <th>TOTAL</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={inv._id || inv.id}>
                        <td className="inv-number-cell">
                          <FileText size={15} className="inv-icon" />
                          <span className="mono-val font-semibold">{inv.invoiceNumber || 'INV-DRAFT'}</span>
                        </td>
                        <td>
                          {inv.issuedAt
                            ? new Date(inv.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td>
                          {inv.dueDate
                            ? new Date(inv.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td>
                          <span className="inv-type-pill">
                            {inv.invoiceType || 'SUBSCRIPTION'} ({inv.seats || 10} Seats)
                          </span>
                        </td>
                        <td>{formatPaise(inv.subtotalPaise)}</td>
                        <td>{formatPaise(inv.totalGstPaise || ((inv.cgstPaise || 0) + (inv.sgstPaise || 0) + (inv.igstPaise || 0)))}</td>
                        <td>
                          <strong className="inv-total-text">{formatPaise(inv.totalPaise)}</strong>
                        </td>
                        <td>
                          <span className={`inv-badge inv-badge-${(inv.status || 'ISSUED').toLowerCase()}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-action-btns">
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={Eye}
                              onClick={() => setSelectedInvoice(inv)}
                              title="View Invoice Details"
                            >
                              Details
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={Download}
                              onClick={() => handleDownloadPdf(inv)}
                              title="Download Official Tax Invoice PDF"
                            >
                              PDF
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 3: PAYMENT LEDGER */}
      {activeTab === 'payments' && (
        <section className="invoices-section">
          {/* Controls Bar */}
          <div className="table-controls-bar">
            <div className="search-filter-group">
              <div className="search-input-wrap">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by UTR or reference number..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="table-search-input"
                />
                {paymentSearch && (
                  <button type="button" className="clear-search-btn" onClick={() => setPaymentSearch('')}>
                    ×
                  </button>
                )}
              </div>

              <Select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                options={paymentFilterOptions}
                className="billing-filter-select"
              />
            </div>

            <div className="table-summary-badges">
              <span className="summary-pill">
                Total Cleared: <strong className="text-success">{formatPaise(totalPaidPaise)}</strong>
              </span>
              <span className="summary-pill">
                Transactions: <strong>{payments.length}</strong>
              </span>
            </div>
          </div>

          <div className="invoices-table-card">
            {filteredPayments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title={payments.length === 0 ? "No Payments Recorded Yet" : "No Matching Payments"}
                message={
                  payments.length === 0
                    ? "Offline bank transfers and UPI payments verified by the Super Admin will be logged here."
                    : "No payment records matched your search filter."
                }
              />
            ) : (
              <div className="table-responsive">
                <table className="invoices-table">
                  <thead>
                    <tr>
                      <th>RECORDED DATE</th>
                      <th>PAYMENT METHOD</th>
                      <th>UTR / REFERENCE NUMBER</th>
                      <th>AMOUNT CREDITED</th>
                      <th>INVOICE NUMBER</th>
                      <th>STATUS</th>
                      <th>NOTES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((pmt) => (
                      <tr key={pmt._id || pmt.id}>
                        <td>
                          {pmt.recordedAt
                            ? new Date(pmt.recordedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td>
                          <span className="method-chip">{pmt.method}</span>
                        </td>
                        <td>
                          <div className="copyable-reference">
                            <span className="mono-val">{pmt.reference || '—'}</span>
                            {pmt.reference && (
                              <button
                                type="button"
                                className="tiny-copy-btn"
                                onClick={() => copyToClipboard(pmt.reference, `pmt-${pmt._id || pmt.id}`)}
                                title="Copy UTR"
                              >
                                {copiedKey === `pmt-${pmt._id || pmt.id}` ? <CheckCheck size={12} className="text-success" /> : <Copy size={12} />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <strong className="text-success font-semibold">{formatPaise(pmt.amountPaise)}</strong>
                        </td>
                        <td>
                          <span className="mono-val">{pmt.invoiceNumber || pmt.invoiceId || '—'}</span>
                        </td>
                        <td>
                          <span className="payment-verified-badge">
                            <CheckCircle size={12} /> Verified
                          </span>
                        </td>
                        <td className="payment-notes-cell">
                          {pmt.notes || 'Direct bank transfer credited'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 4: BILLING REQUESTS */}
      {activeTab === 'requests' && (
        <section className="invoices-section">
          {/* Controls Bar */}
          <div className="table-controls-bar">
            <div className="search-filter-group">
              <Select
                value={requestFilter}
                onChange={(e) => setRequestFilter(e.target.value)}
                options={requestFilterOptions}
                className="billing-filter-select"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={() => handleOpenRequestModal('UPGRADE')}
            >
              Submit New Request
            </Button>
          </div>

          <div className="invoices-table-card">
            {filteredRequests.length === 0 ? (
              <EmptyState
                icon={Send}
                title={billingRequests.length === 0 ? "No Requests Submitted" : "No Matching Requests"}
                message={
                  billingRequests.length === 0
                    ? "Need more team seats or want to upgrade your plan? Submit a request to the Super Admin team."
                    : "No requests match the selected status filter."
                }
                actionButton={
                  billingRequests.length === 0 && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Send}
                      onClick={() => handleOpenRequestModal('UPGRADE')}
                    >
                      Submit Capacity Request
                    </Button>
                  )
                }
              />
            ) : (
              <div className="table-responsive">
                <table className="invoices-table">
                  <thead>
                    <tr>
                      <th>SUBMITTED DATE</th>
                      <th>REQUEST TYPE</th>
                      <th>CAPACITY</th>
                      <th>BILLING CYCLE</th>
                      <th>STATUS</th>
                      <th>DETAILS & ADMIN RESOLUTION</th>
                      <th style={{ textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => (
                      <tr key={req._id || req.id}>
                        <td>
                          {req.createdAt
                            ? new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td>
                          <strong className="request-type-badge">{req.type}</strong>
                        </td>
                        <td>
                          {req.desiredSeats ? `${req.desiredSeats} Seats` : '—'}
                        </td>
                        <td>
                          {req.desiredCycle || '—'}
                        </td>
                        <td>
                          <span className={`request-badge request-badge-${(req.status || 'PENDING').toLowerCase()}`}>
                            {req.status === 'PENDING' && <Clock size={11} />}
                            {req.status === 'RESOLVED' && <CheckCircle size={11} />}
                            {req.status}
                          </span>
                        </td>
                        <td className="request-details-cell">
                          {(req.notes || localStorage.getItem(`mm_req_note_${req.id || req._id}`)) && (
                            <div className="request-user-note">
                              {req.notes || localStorage.getItem(`mm_req_note_${req.id || req._id}`)}
                            </div>
                          )}
                          {req.resolutionNotes && (
                            <div className="request-admin-note">
                              <strong>Admin:</strong> {req.resolutionNotes}
                            </div>
                          )}
                          {req.rejectionReason && (
                            <div className="request-reject-note">
                              <strong>Reason:</strong> {req.rejectionReason}
                            </div>
                          )}
                          {!req.notes && !req.resolutionNotes && !req.rejectionReason && (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {req.status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleCancelRequest(req._id || req.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODAL 1: SUBMIT BILLING REQUEST */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Submit Commercial Billing Request"
      >
        <form onSubmit={handleSubmitBillingRequest} className="billing-modal-form">
          <p className="modal-description-text">
            Submit your capacity requirement directly to the Super Admin team. They will generate an official
            GST invoice and record your offline payment upon transfer.
          </p>

          <div className="form-fields-stack">
            <Select
              label="Request Type *"
              id="request-type"
              value={requestForm.type}
              onChange={(e) => setRequestForm((prev) => ({ ...prev, type: e.target.value }))}
              options={[
                { value: 'UPGRADE', label: 'Upgrade to Paid Pro Studio' },
                { value: 'ADD_SEATS', label: 'Add Additional User Seats' },
                { value: 'REDUCE_SEATS', label: 'Reduce Seats (Next Period)' },
                { value: 'RENEW', label: 'Renew Current Subscription' },
                { value: 'CANCEL', label: 'Cancel Subscription at Period End' }
              ]}
              required
            />

            {['UPGRADE', 'ADD_SEATS', 'REDUCE_SEATS', 'RENEW'].includes(requestForm.type) && (
              <div className="form-row-2col">
                <Input
                  label="Desired Total Seats *"
                  id="request-seats"
                  type="number"
                  min="11"
                  max="500"
                  value={requestForm.desiredSeats}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, desiredSeats: e.target.value }))}
                  required
                />
                <Select
                  label="Billing Cycle *"
                  id="request-cycle"
                  value={requestForm.desiredCycle}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, desiredCycle: e.target.value }))}
                  options={[
                    { value: 'MONTHLY', label: 'Monthly' },
                    { value: 'QUARTERLY', label: 'Quarterly' },
                    { value: 'YEARLY', label: 'Yearly (2 Months Free)' }
                  ]}
                  required
                />
              </div>
            )}

            {/* Live Estimation Preview inside Modal */}
            {modalQuoteEstimate && (
              <div className="modal-quote-preview">
                <span className="quote-preview-title">Estimated Cost Preview:</span>
                <div className="preview-line">
                  <span>{modalQuoteEstimate.seats} Seats × {modalQuoteEstimate.payMonths} Months</span>
                  <span>{formatPaise(modalQuoteEstimate.subtotalPaise)}</span>
                </div>
                <div className="preview-line">
                  <span>GST (18%)</span>
                  <span>{formatPaise(modalQuoteEstimate.gstPaise)}</span>
                </div>
                <div className="preview-line preview-total">
                  <span>Total Estimated Invoiced Amount</span>
                  <strong>{formatPaise(modalQuoteEstimate.totalPaise)}</strong>
                </div>
              </div>
            )}

            <div>
              <label className="form-label" htmlFor="request-notes">
                Notes, GSTIN or Specific Instructions (Optional)
              </label>
              <textarea
                id="request-notes"
                className="form-textarea"
                rows={3}
                placeholder="e.g. Please issue invoice under our corporate GSTIN: 24AAACM1234F1Z8 for Gujarat jurisdiction..."
                value={requestForm.notes}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="modal-actions-row">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRequestModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={Send}
              disabled={actionLoading}
            >
              {actionLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: INVOICE DETAILS MODAL */}
      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={selectedInvoice ? `Tax Invoice ${selectedInvoice.invoiceNumber || 'Details'}` : ''}
        maxWidth="680px"
      >
        {selectedInvoice && (
          <div className="invoice-detail-body">
            {/* Header info */}
            <div className="inv-meta-grid">
              <div className="inv-meta-col">
                <span className="inv-meta-label">INVOICE NUMBER</span>
                <strong className="mono-val">{selectedInvoice.invoiceNumber || 'DRAFT'}</strong>
              </div>
              <div className="inv-meta-col">
                <span className="inv-meta-label">STATUS</span>
                <span className={`inv-badge inv-badge-${(selectedInvoice.status || 'ISSUED').toLowerCase()}`}>
                  {selectedInvoice.status}
                </span>
              </div>
              <div className="inv-meta-col">
                <span className="inv-meta-label">ISSUE DATE</span>
                <span>{selectedInvoice.issuedAt ? new Date(selectedInvoice.issuedAt).toLocaleDateString('en-IN') : '—'}</span>
              </div>
              <div className="inv-meta-col">
                <span className="inv-meta-label">DUE DATE</span>
                <span>{selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString('en-IN') : '—'}</span>
              </div>
            </div>

            {/* Line items table */}
            <div className="inv-line-items-wrap">
              <span className="inv-meta-label" style={{ marginBottom: '8px', display: 'block' }}>ITEMIZED CHARGES</span>
              <table className="invoices-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>DESCRIPTION</th>
                    <th style={{ textAlign: 'center' }}>QTY</th>
                    <th style={{ textAlign: 'right' }}>RATE</th>
                    <th style={{ textAlign: 'right' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.lineItems || [
                    {
                      description: `Studio Pro Subscription (${selectedInvoice.seats || 10} Seats)`,
                      quantity: selectedInvoice.seats || 10,
                      unitPricePaise: 50000
                    }
                  ]).map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatPaise(item.unitPricePaise)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatPaise((item.quantity || 1) * (item.unitPricePaise || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tax summary breakdown */}
            <div className="inv-total-summary">
              <div className="summary-line">
                <span>Subtotal (Taxable Value):</span>
                <span>{formatPaise(selectedInvoice.subtotalPaise)}</span>
              </div>
              {selectedInvoice.cgstPaise ? (
                <>
                  <div className="summary-line">
                    <span>CGST (9%):</span>
                    <span>{formatPaise(selectedInvoice.cgstPaise)}</span>
                  </div>
                  <div className="summary-line">
                    <span>SGST (9%):</span>
                    <span>{formatPaise(selectedInvoice.sgstPaise)}</span>
                  </div>
                </>
              ) : null}
              {selectedInvoice.igstPaise ? (
                <div className="summary-line">
                  <span>IGST (18%):</span>
                  <span>{formatPaise(selectedInvoice.igstPaise)}</span>
                </div>
              ) : null}
              <div className="summary-line grand-line">
                <span>Total Invoiced Amount:</span>
                <strong>{formatPaise(selectedInvoice.totalPaise)}</strong>
              </div>
              {selectedInvoice.paidPaise > 0 && (
                <div className="summary-line" style={{ color: '#1E6B37' }}>
                  <span>Amount Paid:</span>
                  <span>{formatPaise(selectedInvoice.paidPaise)}</span>
                </div>
              )}
            </div>

            <div className="modal-actions-row" style={{ marginTop: '1.5rem' }}>
              <Button
                variant="secondary"
                icon={Download}
                onClick={() => handleDownloadPdf(selectedInvoice)}
              >
                Download PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedInvoice(null)}
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

export default BillingPage;
