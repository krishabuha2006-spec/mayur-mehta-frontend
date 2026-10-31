import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle,
  HardDrive,
  FileText,
  Sparkles,
  Users,
  Check,
  ShieldCheck,
  Download,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  ArrowRight,
  Send,
  Building2,
  RefreshCw,
  Eye,
  X,
  Receipt,
  HelpCircle
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { billingService } from '../../services/billingService';
import { useConfirm } from '../../context/ConfirmationContext';
import { formatCurrency, formatPaise } from '../../utils/formatCurrency';
import { extractErrorMessage } from '../../utils/errorHandler';
import './BillingPage.css';

export function BillingPage() {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'invoices' | 'payments' | 'requests'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Live Subscription Data
  const [subscription, setSubscription] = useState({
    plan: 'FREE',
    planCode: 'free',
    status: 'ACTIVE',
    seats: 10,
    seatsUsed: 1,
    billingCycle: 'MONTHLY',
    currentPeriodStart: null,
    currentPeriodEnd: null,
    graceEndsAt: null,
    storageQuotaGB: 5,
    storageUsedGB: 1.2
  });

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
        setSubscription({
          plan: subData.plan || (subData.planCode ? subData.planCode.toUpperCase() : 'FREE'),
          planCode: subData.planCode || 'free',
          status: subData.status || 'ACTIVE',
          seats: subData.seats || subData.seatLimit || 10,
          seatsUsed: subData.seatsUsed || 1,
          billingCycle: subData.billingCycle || 'MONTHLY',
          currentPeriodStart: subData.currentPeriodStart || null,
          currentPeriodEnd: subData.currentPeriodEnd || null,
          graceEndsAt: subData.graceEndsAt || null,
          storageQuotaGB: subData.storageQuotaGB || (subData.storage?.limitBytes ? (subData.storage.limitBytes / (1024 ** 3)).toFixed(0) : 5),
          storageUsedGB: subData.storageUsedGB || (subData.storage?.usedBytes ? (subData.storage.usedBytes / (1024 ** 3)).toFixed(1) : 1.2)
        });
        if (subData.seats && subData.seats > 10) {
          setDesiredSeats(subData.seats);
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
    loadBillingData();
  }, [loadBillingData]);

  // 2. Dynamic Price Quote calculation from live backend
  useEffect(() => {
    let isCancelled = false;
    const fetchLiveQuote = async () => {
      setQuoteLoading(true);
      try {
        const quoteRes = await billingService.getQuote({
          seats: desiredSeats,
          billingCycle: billingCycle,
          isUpgrade: subscription.plan !== 'FREE'
        });
        if (!isCancelled && quoteRes) {
          setQuote(quoteRes);
        }
      } catch (err) {
        console.warn('Quote fetch error:', err);
      } finally {
        if (!isCancelled) setQuoteLoading(false);
      }
    };

    fetchLiveQuote();
    return () => {
      isCancelled = true;
    };
  }, [desiredSeats, billingCycle, subscription.plan]);

  // 3. Submit Billing Request (UPGRADE, ADD_SEATS, RENEW, CANCEL)
  const handleOpenRequestModal = (type = 'UPGRADE') => {
    setRequestForm({
      type,
      desiredSeats: desiredSeats,
      desiredCycle: billingCycle,
      notes: ''
    });
    setIsRequestModalOpen(true);
  };

  const handleSubmitBillingRequest = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await billingService.createBillingRequest({
        type: requestForm.type,
        desiredSeats: Number(requestForm.desiredSeats),
        desiredCycle: requestForm.desiredCycle,
        notes: requestForm.notes
      });
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

  // Meter calculations
  const seatPercent = Math.min(Math.round(((subscription.seatsUsed || 1) / (subscription.seats || 10)) * 100), 100);
  const storagePercent = Math.min(Math.round(((subscription.storageUsedGB || 1) / (subscription.storageQuotaGB || 5)) * 100), 100);

  const isRestricted = subscription.status === 'RESTRICTED' || (subscription.status === 'EXPIRED' && subscription.seatsUsed > 10);
  const isGrace = subscription.status === 'GRACE';

  return (
    <div className="billing-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`billing-toast-alert ${toastMessage.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="billing-header">
        <div className="billing-badge-line">
          <span className="billing-tag-pill">
            <CreditCard size={13} />
            MANAGED SAAS SUBSCRIPTION
          </span>
          <span className="billing-gst-pill">GST Registered • 18% Input Tax Credit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="billing-title">Subscription & Commercial Billing</h1>
            <p className="billing-subtitle">
              Manage your firm's 10-user free quota, pro expansions, official GST invoices, and offline payments
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={loadBillingData}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </header>

      {/* RESTRICTED STATUS BANNER (Read-only lock) */}
      {isRestricted && (
        <div className="billing-restricted-banner" role="alert">
          <div className="restricted-icon-wrap">
            <AlertTriangle size={24} />
          </div>
          <div className="restricted-content">
            <h4 className="restricted-title">Write Access Restricted (Subscription Expired)</h4>
            <p className="restricted-desc">
              Your firm has downgraded to the Free tier (10 seats limit) but currently has{' '}
              <strong>{subscription.seatsUsed} users</strong> active. New project creation, team invitations, and edits
              are locked. Remove users to reach 10 or submit an upgrade request to restore full write access immediately.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={() => handleOpenRequestModal('UPGRADE')}
              style={{ marginTop: '0.5rem' }}
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
            <strong>7-Day Grace Period Active:</strong> Your paid subscription period has concluded. Full read/write
            access remains active until{' '}
            <strong>{subscription.graceEndsAt ? new Date(subscription.graceEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '7 days'}</strong>
            . Please submit an offline renewal payment before grace elapses to prevent account restriction.
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenRequestModal('RENEW')}
          >
            Renew Now
          </Button>
        </div>
      )}

      {/* 10 Free Users Rule Callout */}
      <div className="billing-rule-callout">
        <div className="callout-icon-box">
          <Info size={20} />
        </div>
        <div className="callout-text">
          <strong>10 Users Free Forever Guarantee:</strong> Your firm can invite up to 10 architects, designers, and project managers with zero subscription charges. Removing an employee immediately frees that seat (e.g. 10 → 9), allowing you to invite another architect without payment. The 11th user onwards requires a paid Pro plan.
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="billing-tabs-nav">
        <button
          type="button"
          className={`billing-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Building2 size={16} />
          Subscription & Plans
        </button>
        <button
          type="button"
          className={`billing-tab-btn ${activeTab === 'invoices' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <Receipt size={16} />
          Tax Invoices ({invoices.length})
        </button>
        <button
          type="button"
          className={`billing-tab-btn ${activeTab === 'payments' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard size={16} />
          Payment Ledger ({payments.length})
        </button>
        <button
          type="button"
          className={`billing-tab-btn ${activeTab === 'requests' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Send size={16} />
          Billing Requests ({billingRequests.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & UPGRADE */}
      {activeTab === 'overview' && (
        <>
          {/* Current Subscription Status Card */}
          <div className="billing-plan-card">
            <div className="plan-header-row">
              <div>
                <span className="plan-kicker">ACTIVE FIRM QUOTA</span>
                <h3 className="plan-name">
                  {subscription.plan === 'FREE' ? 'Studio Foundation (Free Tier)' : `Studio Pro (${subscription.seats} Seats)`}
                </h3>
                <span className="plan-company-name">
                  {subscription.currentPeriodEnd ? (
                    <>Current Cycle Ends: <strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></>
                  ) : (
                    'No Expiration (Free Permanent Plan)'
                  )}
                </span>
              </div>

              <div className="plan-status-badge-wrap">
                <Badge variant={subscription.status === 'ACTIVE' ? 'success' : isRestricted ? 'danger' : 'warning'}>
                  {subscription.status}
                </Badge>
              </div>
            </div>

            {/* Meters Grid */}
            <div className="plan-meters-grid">
              {/* Seat Meter */}
              <div className="meter-card">
                <div className="meter-header">
                  <div className="meter-icon bg-taupe">
                    <Users size={18} />
                  </div>
                  <div>
                    <span className="meter-label">SEAT ALLOTMENT</span>
                    <p className="meter-stat">
                      <strong>{subscription.seatsUsed}</strong> of {subscription.seats} Seats Used
                    </p>
                  </div>
                  <span className="meter-free-tag">
                    {Math.max(0, subscription.seats - subscription.seatsUsed)} Available
                  </span>
                </div>
                <div className="meter-bar-bg">
                  <div
                    className={`meter-bar-fill ${subscription.seatsUsed >= subscription.seats ? 'fill-full' : ''}`}
                    style={{ width: `${seatPercent}%` }}
                  />
                </div>
              </div>

              {/* Storage Meter */}
              <div className="meter-card">
                <div className="meter-header">
                  <div className="meter-icon bg-copper">
                    <HardDrive size={18} />
                  </div>
                  <div>
                    <span className="meter-label">SECURE CLOUD STORAGE</span>
                    <p className="meter-stat">
                      <strong>{subscription.storageUsedGB} GB</strong> of {subscription.storageQuotaGB} GB
                    </p>
                  </div>
                  <span className="meter-free-tag">{storagePercent}% Utilized</span>
                </div>
                <div className="meter-bar-bg">
                  <div className="meter-bar-fill" style={{ width: `${storagePercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade & Expansion Section */}
          <section className="upgrade-expansion-section">
            <div className="section-head-row">
              <div>
                <h2 className="section-title">Studio Capacity & Pricing Calculator</h2>
                <p className="section-subtitle">
                  Calculate pro seat expansions, view gapless GST tax breakdown, and submit an offline billing request
                </p>
              </div>

              {/* Billing Cycle Toggle */}
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
                  Annual (2 Months Free!)
                </button>
              </div>
            </div>

            {/* Pricing Comparison Cards */}
            <div className="plans-compare-grid">
              {/* Permanent Free Plan */}
              <div className={`compare-card ${subscription.plan === 'FREE' ? 'is-current' : ''}`}>
                {subscription.plan === 'FREE' && <span className="current-pill">Current Plan</span>}
                <span className="compare-tag">FOUNDATION</span>
                <h3 className="compare-name">Free Tier</h3>
                <p className="compare-price">₹0 <span>/ month</span></p>
                <p className="compare-desc">Standard tier for boutique design practices and initial setups.</p>

                <ul className="compare-features">
                  <li><Check size={16} /> <strong>10 Active Users</strong> free forever</li>
                  <li><Check size={16} /> <strong>5 GB</strong> Cloud Storage for Drawings</li>
                  <li><Check size={16} /> Unlimited Projects & Tasks</li>
                  <li><Check size={16} /> Free Client & Vendor Access Code (No Seat Consumed)</li>
                  <li><Check size={16} /> Dynamic Role-Based Permissions</li>
                </ul>

                <Button variant="secondary" disabled style={{ width: '100%', marginTop: 'auto' }}>
                  {subscription.plan === 'FREE' ? 'Currently Active' : 'Free Base Included'}
                </Button>
              </div>

              {/* Pro Tier with Interactive Slider */}
              <div className={`compare-card highlight ${subscription.plan !== 'FREE' ? 'is-current' : ''}`}>
                <span className="featured-flag">
                  <Sparkles size={13} />
                  {billingCycle === 'YEARLY' ? '12 MONTHS FOR PRICE OF 10' : 'SCALABLE EXPANSION'}
                </span>
                <span className="compare-tag">PRO STUDIO</span>
                <h3 className="compare-name">Pro Tier</h3>
                <p className="compare-price">
                  ₹500 <span>/ seat / month (+18% GST)</span>
                </p>
                <p className="compare-desc">For growing firms managing multiple site teams and large BIM/CAD files.</p>

                <ul className="compare-features">
                  <li><Check size={16} /> <strong>11 to 500</strong> Scalable Team Seats</li>
                  <li><Check size={16} /> <strong>100 GB</strong> High-Speed Cloud Storage</li>
                  <li><Check size={16} /> Official GST Tax Invoices with Input Tax Credit</li>
                  <li><Check size={16} /> Priority Multi-Site Drawing Coordination</li>
                  <li><Check size={16} /> Dedicated Architecture Support</li>
                </ul>

                {/* Interactive Seat Slider */}
                <div className="seat-slider-box">
                  <div className="slider-header">
                    <span>Desired Team Capacity:</span>
                    <strong>{desiredSeats} Seats</strong>
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
                  <div className="slider-sub-labels">
                    <span>11 seats (min)</span>
                    <span>{desiredSeats} total seats</span>
                    <span>100 seats</span>
                  </div>
                </div>

                {/* Live Backend Pricing Breakdown */}
                <div className="live-breakdown-card">
                  {quoteLoading ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#7B6F62', fontSize: '13px' }}>
                      Calculating pricing quote...
                    </div>
                  ) : quote ? (
                    <>
                      <div className="breakdown-line">
                        <span>
                          {desiredSeats} Seats × {billingCycle === 'YEARLY' ? '10 pay-months (12 mos service)' : billingCycle === 'QUARTERLY' ? '3 months' : '1 month'}
                        </span>
                        <span>{formatPaise(quote.subtotalPaise)}</span>
                      </div>
                      <div className="breakdown-line">
                        <span>GST (18% CGST + SGST)</span>
                        <span>{formatPaise(quote.gstPaise)}</span>
                      </div>
                      <div className="breakdown-line grand-total">
                        <span>Total Payable ({billingCycle})</span>
                        <span className="grand-price">{formatPaise(quote.totalPaise)}</span>
                      </div>
                    </>
                  ) : null}
                </div>

                <Button
                  variant="primary"
                  icon={Send}
                  onClick={() => handleOpenRequestModal(subscription.plan === 'FREE' ? 'UPGRADE' : 'ADD_SEATS')}
                  style={{ width: '100%', marginTop: 'var(--spacing-4)' }}
                >
                  {subscription.plan === 'FREE' ? 'Request Pro Upgrade' : 'Request Seat Expansion'}
                </Button>
              </div>
            </div>
          </section>

          {/* Offline Payment Information Card */}
          <div className="offline-payment-guide-card">
            <div className="guide-header">
              <Building2 size={20} className="guide-icon" />
              <div>
                <h3 className="guide-title">Manual Offline Payment Procedure (Module M1.6)</h3>
                <p className="guide-subtitle">
                  We process subscriptions via verified direct bank transfer, NEFT/RTGS, or corporate UPI.
                </p>
              </div>
            </div>

            <div className="bank-details-grid">
              <div className="bank-detail-item">
                <span className="bank-label">BENEFICIARY NAME</span>
                <span className="bank-val">MAYUR MEHTA DESIGN PRIVATE LIMITED</span>
              </div>
              <div className="bank-detail-item">
                <span className="bank-label">ACCOUNT NUMBER</span>
                <span className="bank-val">50200084729103 (Current A/C)</span>
              </div>
              <div className="bank-detail-item">
                <span className="bank-label">BANK & IFSC CODE</span>
                <span className="bank-val">HDFC Bank • HDFC0001245</span>
              </div>
              <div className="bank-detail-item">
                <span className="bank-label">UPI ID</span>
                <span className="bank-val">billing@mayurmehta</span>
              </div>
            </div>

            <div className="guide-footer-note">
              <HelpCircle size={15} />
              <span>
                After submitting a request or receiving your official tax invoice, transfer the invoiced amount and
                provide the UTR / Cheque reference number. Super Admin activates your plan atomically upon recording payment.
              </span>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: OFFICIAL TAX INVOICES */}
      {activeTab === 'invoices' && (
        <section className="invoices-section">
          <div className="section-head-row">
            <div>
              <h2 className="section-title">Official Tax Invoices</h2>
              <p className="section-subtitle">
                Gapless GST-compliant invoices per financial year with itemized tax breakdowns and PDF downloads
              </p>
            </div>
          </div>

          <div className="invoices-table-card">
            {invoices.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#7B6F62' }}>
                <Receipt size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <h4 style={{ margin: '0 0 6px', fontWeight: 600 }}>No Invoices Issued Yet</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Invoices generated by the Super Admin team for new subscriptions or seat expansions will appear here.
                </p>
              </div>
            ) : (
              <table className="invoices-table">
                <thead>
                  <tr>
                    <th>INVOICE NUMBER</th>
                    <th>ISSUE DATE</th>
                    <th>TYPE / SEATS</th>
                    <th>TAXABLE VALUE</th>
                    <th>GST (18%)</th>
                    <th>TOTAL</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id || inv.id}>
                      <td className="inv-number-cell">
                        <FileText size={15} className="inv-icon" />
                        <strong>{inv.invoiceNumber || 'INV-DRAFT'}</strong>
                      </td>
                      <td>
                        {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: '#1E1A17', fontWeight: 500 }}>
                          {inv.invoiceType || 'SUBSCRIPTION'} ({inv.seats || 10} Seats)
                        </span>
                      </td>
                      <td>{formatPaise(inv.subtotalPaise)}</td>
                      <td>{formatPaise(inv.totalGstPaise || (inv.cgstPaise + inv.sgstPaise + inv.igstPaise))}</td>
                      <td>
                        <strong>{formatPaise(inv.totalPaise)}</strong>
                      </td>
                      <td>
                        <span className={`inv-badge inv-badge-${(inv.status || 'ISSUED').toLowerCase()}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
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
            )}
          </div>
        </section>
      )}

      {/* TAB 3: PAYMENT LEDGER */}
      {activeTab === 'payments' && (
        <section className="invoices-section">
          <div className="section-head-row">
            <div>
              <h2 className="section-title">Manual Payment Ledger</h2>
              <p className="section-subtitle">
                Complete record of offline bank transfers, UPI transactions, and cheques credited to your subscription
              </p>
            </div>
          </div>

          <div className="invoices-table-card">
            {payments.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#7B6F62' }}>
                <CreditCard size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <h4 style={{ margin: '0 0 6px', fontWeight: 600 }}>No Payments Recorded Yet</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Offline payments recorded by the Super Admin team against your invoices will be listed here.
                </p>
              </div>
            ) : (
              <table className="invoices-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>METHOD</th>
                    <th>UTR / REFERENCE</th>
                    <th>AMOUNT</th>
                    <th>INVOICE #</th>
                    <th>NOTES</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pmt) => (
                    <tr key={pmt._id || pmt.id}>
                      <td>
                        {pmt.recordedAt ? new Date(pmt.recordedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td>
                        <span className="method-chip">{pmt.method}</span>
                      </td>
                      <td>
                        <code style={{ fontSize: '12px', background: '#F1ECE6', padding: '2px 6px', borderRadius: '4px' }}>
                          {pmt.reference || '—'}
                        </code>
                      </td>
                      <td>
                        <strong style={{ color: '#1E6B37' }}>{formatPaise(pmt.amountPaise)}</strong>
                      </td>
                      <td>
                        {pmt.invoiceNumber || pmt.invoiceId || '—'}
                      </td>
                      <td style={{ color: '#7B6F62', fontSize: '12px' }}>
                        {pmt.notes || 'Payment credited'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* TAB 4: BILLING REQUESTS */}
      {activeTab === 'requests' && (
        <section className="invoices-section">
          <div className="section-head-row">
            <div>
              <h2 className="section-title">My Billing Requests</h2>
              <p className="section-subtitle">
                Track status of upgrade, seat expansion, renewal, and cancellation requests submitted to Super Admin
              </p>
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
            {billingRequests.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#7B6F62' }}>
                <Send size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <h4 style={{ margin: '0 0 6px', fontWeight: 600 }}>No Requests Submitted</h4>
                <p style={{ margin: '0 0 1rem', fontSize: '13px' }}>
                  Need more seats or want to upgrade your plan? Submit a request to the Super Admin team.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Send}
                  onClick={() => handleOpenRequestModal('UPGRADE')}
                >
                  Submit Request
                </Button>
              </div>
            ) : (
              <table className="invoices-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>TYPE</th>
                    <th>SEATS</th>
                    <th>CYCLE</th>
                    <th>STATUS</th>
                    <th>NOTES / RESOLUTION</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {billingRequests.map((req) => (
                    <tr key={req._id || req.id}>
                      <td>
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td>
                        <strong>{req.type}</strong>
                      </td>
                      <td>{req.desiredSeats || '—'} Seats</td>
                      <td>{req.desiredCycle || '—'}</td>
                      <td>
                        <span className={`request-badge request-badge-${(req.status || 'PENDING').toLowerCase()}`}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#7B6F62', maxWidth: '280px' }}>
                        <div>{req.notes || '—'}</div>
                        {req.resolutionNotes && (
                          <div style={{ color: '#1E6B37', marginTop: '2px', fontWeight: 500 }}>
                            Admin: {req.resolutionNotes}
                          </div>
                        )}
                        {req.rejectionReason && (
                          <div style={{ color: '#991B1B', marginTop: '2px', fontWeight: 500 }}>
                            Reason: {req.rejectionReason}
                          </div>
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
        <form onSubmit={handleSubmitBillingRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: '#7B6F62' }}>
            Submit your capacity requirement directly to the Super Admin team. They will generate an official
            GST invoice and record your offline payment upon transfer.
          </div>

          <div className="form-grid-2">
            <div style={{ gridColumn: 'span 2' }}>
              <Select
                label="Request Type *"
                id="request-type"
                value={requestForm.type}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, type: e.target.value }))}
                options={[
                  { value: 'UPGRADE', label: 'Upgrade to Paid Pro Tier' },
                  { value: 'ADD_SEATS', label: 'Add Additional Seats' },
                  { value: 'REDUCE_SEATS', label: 'Reduce Seats (Next Period)' },
                  { value: 'RENEW', label: 'Renew Current Subscription' },
                  { value: 'CANCEL', label: 'Cancel Subscription at Period End' }
                ]}
                required
              />
            </div>

            {['UPGRADE', 'ADD_SEATS', 'REDUCE_SEATS'].includes(requestForm.type) && (
              <>
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
              </>
            )}

            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="request-notes">
                Notes & Special Instructions (Optional)
              </label>
              <textarea
                id="request-notes"
                className="form-textarea"
                rows={3}
                placeholder="e.g. Please issue invoice under our corporate GSTIN for Gujarat jurisdiction..."
                value={requestForm.notes}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-actions-row">
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
            <div className="inv-meta-grid">
              <div>
                <span className="inv-meta-label">INVOICE NUMBER</span>
                <strong>{selectedInvoice.invoiceNumber || 'DRAFT'}</strong>
              </div>
              <div>
                <span className="inv-meta-label">STATUS</span>
                <span className={`inv-badge inv-badge-${(selectedInvoice.status || 'ISSUED').toLowerCase()}`}>
                  {selectedInvoice.status}
                </span>
              </div>
              <div>
                <span className="inv-meta-label">ISSUE DATE</span>
                <span>{selectedInvoice.issuedAt ? new Date(selectedInvoice.issuedAt).toLocaleDateString('en-IN') : '—'}</span>
              </div>
              <div>
                <span className="inv-meta-label">DUE DATE</span>
                <span>{selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString('en-IN') : '—'}</span>
              </div>
            </div>

            {/* Line items table */}
            <div style={{ marginTop: '1.25rem' }}>
              <span className="inv-meta-label" style={{ marginBottom: '6px', display: 'block' }}>ITEMIZED CHARGES</span>
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
                  {(selectedInvoice.lineItems || []).map((item, idx) => (
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
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
