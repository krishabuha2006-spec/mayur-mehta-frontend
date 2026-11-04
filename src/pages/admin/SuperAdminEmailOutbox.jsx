import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  RotateCw,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { adminService } from '../../services/adminService';
import { extractErrorMessage } from '../../utils/errorHandler';
import { formatDate } from '../../utils/formatDate';
import './SuperAdminPage.css';
import './SuperAdminEmailOutbox.css';

export function SuperAdminEmailOutbox({ onNotification }) {
  const [stats, setStats] = useState({
    pending: 0,
    sending: 0,
    sent: 0,
    failed: 0,
    cancelled: 0,
    total24h: 0,
    sent24h: 0,
    failed24h: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Outbox List State
  const [emails, setEmails] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PENDING | SENDING | SENT | FAILED | CANCELLED
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Action States
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const notify = (msg, type = 'success') => {
    if (onNotification) onNotification(msg, type);
  };

  // 1. GET /admin/email-outbox/stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await adminService.getEmailOutboxStats();
      if (res) {
        const s = res.stats || res.data || res;
        setStats({
          pending: Number(s.pending ?? s.queued ?? 0),
          sending: Number(s.sending ?? s.inFlight ?? 0),
          sent: Number(s.sent ?? s.delivered ?? 0),
          failed: Number(s.failed ?? 0),
          cancelled: Number(s.cancelled ?? 0),
          total24h: Number(s.total24h ?? s.throughput24h ?? 0),
          sent24h: Number(s.sent24h ?? 0),
          failed24h: Number(s.failed24h ?? 0)
        });
      }
    } catch (err) {
      console.warn('Failed to fetch outbox stats:', err?.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 2. GET /admin/email-outbox
  const fetchOutbox = useCallback(async (targetPage = page) => {
    setListLoading(true);
    try {
      const params = {
        page: targetPage,
        limit
      };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
        params.recipient = searchTerm.trim();
      }

      const res = await adminService.getEmailOutbox(params);

      const items = Array.isArray(res)
        ? res
        : (Array.isArray(res?.data)
            ? res.data
            : (res?.emails || res?.items || res?.outbox || res?.docs || res?.list || res?.data?.emails || res?.data?.items || []));
      const total = Number(res?.total ?? res?.pagination?.total ?? res?.data?.total ?? res?.data?.pagination?.total ?? items.length);
      const computedPages = Number(res?.totalPages ?? res?.pagination?.totalPages ?? res?.data?.totalPages ?? res?.data?.pagination?.totalPages ?? Math.max(1, Math.ceil(total / limit)));

      setEmails(items);
      setTotalCount(total);
      setTotalPages(computedPages);
    } catch (err) {
      console.warn('Failed to fetch email outbox list:', err?.message);
      setEmails([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setListLoading(false);
    }
  }, [page, limit, statusFilter, searchTerm]);

  // Initial Load (strictly 1 time)
  useEffect(() => {
    fetchStats();
    fetchOutbox(1);
  }, [fetchStats, fetchOutbox]);

  // 3. POST /admin/email-outbox/{id}/retry
  const handleRetry = async (id, e) => {
    e?.stopPropagation();
    setActionLoadingId(id);
    try {
      await adminService.retryEmailOutbox(id);
      notify('Email queued for immediate retry delivery.', 'success');
      await Promise.allSettled([fetchStats(), fetchOutbox(page)]);
    } catch (err) {
      notify(extractErrorMessage(err, 'Failed to retry email delivery'), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. POST /admin/email-outbox/{id}/cancel
  const handleCancel = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this outbound email?')) return;

    setActionLoadingId(id);
    try {
      await adminService.cancelEmailOutbox(id);
      notify('Outbound email cancelled successfully.', 'success');
      await Promise.allSettled([fetchStats(), fetchOutbox(page)]);
    } catch (err) {
      notify(extractErrorMessage(err, 'Failed to cancel email'), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'SENT':
        return <Badge variant="success"><Check size={12} style={{ marginRight: '4px' }} /> SENT</Badge>;
      case 'FAILED':
        return <Badge variant="danger"><AlertTriangle size={12} style={{ marginRight: '4px' }} /> FAILED</Badge>;
      case 'SENDING':
        return <Badge variant="info"><RotateCw size={12} className="spin-icon" style={{ marginRight: '4px' }} /> SENDING</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral"><Ban size={12} style={{ marginRight: '4px' }} /> CANCELLED</Badge>;
      case 'PENDING':
      default:
        return <Badge variant="warning"><Clock size={12} style={{ marginRight: '4px' }} /> PENDING</Badge>;
    }
  };

  return (
    <div className="admin-outbox-suite">
      {/* SECTION 1: HEADER & REFRESH */}
      <div className="admin-outbox-header">
        <div>
          <h2 className="admin-outbox-title">
            <Mail size={22} className="admin-outbox-title-icon" />
            Transactional Email Outbox
          </h2>
          <p className="admin-outbox-subtitle">
            Super Admin Outbox queue monitor, delivery audit log, metrics and manual recovery operations.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            fetchStats();
            fetchOutbox(page);
          }}
          disabled={listLoading || statsLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={listLoading || statsLoading ? 'spin-icon' : ''} />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* SECTION 2: METRICS / STATS CARDS */}
      <div className="admin-outbox-metrics-grid">
        <div className="admin-outbox-stat-card">
          <div className="admin-outbox-stat-top">
            <span className="admin-outbox-stat-label">Queued / Pending</span>
            <div className="admin-outbox-stat-icon-wrap pending">
              <Clock size={16} />
            </div>
          </div>
          <div className="admin-outbox-stat-value pending">
            {stats.pending}
          </div>
        </div>

        <div className="admin-outbox-stat-card">
          <div className="admin-outbox-stat-top">
            <span className="admin-outbox-stat-label">In-Flight / Sending</span>
            <div className="admin-outbox-stat-icon-wrap sending">
              <RotateCw size={16} />
            </div>
          </div>
          <div className="admin-outbox-stat-value sending">
            {stats.sending}
          </div>
        </div>

        <div className="admin-outbox-stat-card">
          <div className="admin-outbox-stat-top">
            <span className="admin-outbox-stat-label">Delivered / Sent</span>
            <div className="admin-outbox-stat-icon-wrap sent">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="admin-outbox-stat-value sent">
            {stats.sent}
          </div>
        </div>

        <div className="admin-outbox-stat-card">
          <div className="admin-outbox-stat-top">
            <span className="admin-outbox-stat-label">Delivery Failed</span>
            <div className="admin-outbox-stat-icon-wrap failed">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="admin-outbox-stat-value failed">
            {stats.failed}
          </div>
        </div>

        <div className="admin-outbox-stat-card">
          <div className="admin-outbox-stat-top">
            <span className="admin-outbox-stat-label">Cancelled</span>
            <div className="admin-outbox-stat-icon-wrap cancelled">
              <Ban size={16} />
            </div>
          </div>
          <div className="admin-outbox-stat-value cancelled">
            {stats.cancelled}
          </div>
        </div>

        <div className="admin-outbox-stat-card">
          <div className="admin-outbox-stat-top">
            <span className="admin-outbox-stat-label">24h Sent / Failed</span>
            <div className="admin-outbox-stat-icon-wrap throughput">
              <Send size={15} />
            </div>
          </div>
          <div className="admin-outbox-stat-value throughput">
            <span style={{ color: '#145E36' }}>{stats.sent24h || 0}</span>
            <span style={{ color: '#8C8277', margin: '0 4px', fontSize: '15px' }}>/</span>
            <span style={{ color: '#9E2619' }}>{stats.failed24h || 0}</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: FILTER TABS & SEARCH BAR */}
      <div className="admin-outbox-toolbar">
        {/* Status Filter Tabs */}
        <div className="admin-outbox-filter-pills">
          {['ALL', 'PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              className={`admin-outbox-pill-btn ${statusFilter === st ? 'is-active' : ''}`}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="admin-outbox-search-wrap">
          <Search size={15} className="admin-outbox-search-icon" />
          <input
            type="text"
            className="admin-outbox-search-input"
            placeholder="Search recipient or subject..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* SECTION 4: OUTBOX EMAILS TABLE */}
      <div className="admin-outbox-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-outbox-table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Subject & Template</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Queued / Sent</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#7B6F62' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RotateCw size={18} className="spin-icon" style={{ color: '#7B6F62' }} />
                      <span>Loading email outbox records from backend...</span>
                    </div>
                  </td>
                </tr>
              ) : emails.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="admin-outbox-empty-wrap">
                      <div className="admin-outbox-empty-icon-circle">
                        <Mail size={24} />
                      </div>
                      <div className="admin-outbox-empty-title">No emails found in outbox</div>
                      <div className="admin-outbox-empty-sub">
                        {statusFilter !== 'ALL' || searchTerm
                          ? 'Try clearing the search or status filter to see other dispatches.'
                          : 'Outbox queue is currently empty. All notifications dispatched.'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                emails.map((item) => {
                  const id = item.id || item._id;
                  const recipient = item.recipient || item.toEmail || item.to || 'Unknown Recipient';
                  const subject = item.subject || 'No Subject';
                  const template = item.template || item.templateName || 'STANDARD';
                  const attempts = item.attempts ?? item.retryCount ?? 0;
                  const maxAttempts = item.maxAttempts || 3;
                  const status = String(item.status || 'PENDING').toUpperCase();
                  const isActionLoading = actionLoadingId === id;

                  return (
                    <tr
                      key={id}
                      onClick={() => setSelectedEmail(item)}
                    >
                      {/* Recipient */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="admin-outbox-avatar">
                            {recipient[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary, #1E1A17)' }}>{recipient}</div>
                            {item.companyName && (
                              <div style={{ fontSize: '11px', color: '#8C8277', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                                <Building2 size={11} /> {item.companyName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subject & Template */}
                      <td style={{ maxWidth: '300px' }}>
                        <div style={{
                          fontWeight: 500,
                          color: 'var(--text-primary, #1E1A17)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {subject}
                        </div>
                        <span className="admin-outbox-template-tag">
                          {template}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        {getStatusBadge(status)}
                        {item.lastError && status === 'FAILED' && (
                          <div style={{ fontSize: '11px', color: '#9E2619', marginTop: '3px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.lastError}
                          </div>
                        )}
                      </td>

                      {/* Attempts */}
                      <td>
                        <span style={{
                          fontWeight: 600,
                          color: attempts >= maxAttempts ? '#9E2619' : attempts > 0 ? '#C48A22' : '#7B6F62'
                        }}>
                          {attempts} / {maxAttempts}
                        </span>
                      </td>

                      {/* Queued / Sent */}
                      <td style={{ fontSize: '12px', color: '#7B6F62' }}>
                        <div>Created: {item.createdAt ? formatDate(item.createdAt) : '—'}</div>
                        {item.sentAt && <div style={{ color: '#145E36', fontWeight: 500 }}>Sent: {formatDate(item.sentAt)}</div>}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                          {status === 'FAILED' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => handleRetry(id, e)}
                              disabled={isActionLoading}
                              title="Manually retry delivery"
                              style={{ padding: '4px 8px', fontSize: '12px', color: '#145E36' }}
                            >
                              <RotateCw size={13} className={isActionLoading ? 'spin-icon' : ''} style={{ marginRight: '4px' }} />
                              Retry
                            </Button>
                          )}

                          {(status === 'PENDING' || status === 'FAILED') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => handleCancel(id, e)}
                              disabled={isActionLoading}
                              title="Cancel queued delivery"
                              style={{ padding: '4px 8px', fontSize: '12px', color: '#9E2619' }}
                            >
                              <Ban size={13} style={{ marginRight: '4px' }} />
                              Cancel
                            </Button>
                          )}

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedEmail(item)}
                            title="Inspect details"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            <Eye size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* SECTION 5: PAGINATION */}
        {totalCount > 0 && (
          <div className="admin-outbox-pagination">
            <div>
              Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, totalCount)} of {totalCount} outbox records
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || listLoading}
                onClick={() => {
                  const newPage = page - 1;
                  setPage(newPage);
                  fetchOutbox(newPage);
                }}
              >
                <ChevronLeft size={14} style={{ marginRight: '2px' }} /> Prev
              </Button>

              <span style={{ fontWeight: 600, color: 'var(--text-primary, #1E1A17)' }}>
                Page {page} of {totalPages}
              </span>

              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || listLoading}
                onClick={() => {
                  const newPage = page + 1;
                  setPage(newPage);
                  fetchOutbox(newPage);
                }}
              >
                Next <ChevronRight size={14} style={{ marginLeft: '2px' }} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={Boolean(selectedEmail)}
        onClose={() => setSelectedEmail(null)}
        title="Email Outbox Record Details"
        maxWidth="600px"
      >
        {selectedEmail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#7B6F62' }}>Status:</span>
              <div>{getStatusBadge(selectedEmail.status)}</div>
            </div>

            <div>
              <span style={{ fontWeight: 600, color: '#7B6F62' }}>Recipient:</span>
              <div style={{ marginTop: '3px', fontWeight: 600, color: '#1E1A17' }}>{selectedEmail.recipient || selectedEmail.toEmail || selectedEmail.to}</div>
            </div>

            <div>
              <span style={{ fontWeight: 600, color: '#7B6F62' }}>Subject:</span>
              <div style={{ marginTop: '3px', padding: '8px 12px', background: '#FAF8F5', borderRadius: '8px', border: '1px solid #E8E3DB', color: '#1E1A17' }}>
                {selectedEmail.subject || '—'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontWeight: 600, color: '#7B6F62' }}>Template:</span>
                <div style={{ marginTop: '3px', fontFamily: 'monospace', fontWeight: 600, color: '#1E1A17' }}>{selectedEmail.template || 'STANDARD'}</div>
              </div>

              <div>
                <span style={{ fontWeight: 600, color: '#7B6F62' }}>Attempts:</span>
                <div style={{ marginTop: '3px', fontWeight: 600, color: '#1E1A17' }}>{selectedEmail.attempts || 0} / {selectedEmail.maxAttempts || 3}</div>
              </div>
            </div>

            {selectedEmail.companyId && (
              <div>
                <span style={{ fontWeight: 600, color: '#7B6F62' }}>Company ID:</span>
                <div style={{ marginTop: '3px', fontFamily: 'monospace', fontSize: '12px', color: '#8C8277' }}>{selectedEmail.companyId}</div>
              </div>
            )}

            {selectedEmail.lastError && (
              <div style={{ padding: '10px 12px', background: '#FDF2F0', border: '1px solid #FFDCD8', borderRadius: '8px', color: '#9E2619' }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <AlertTriangle size={15} /> Last Delivery Error:
                </div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>{selectedEmail.lastError}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', color: '#7B6F62', borderTop: '1px solid #E8E3DB', paddingTop: '10px' }}>
              <div>Created: {selectedEmail.createdAt ? formatDate(selectedEmail.createdAt) : '—'}</div>
              <div>Sent: {selectedEmail.sentAt ? formatDate(selectedEmail.sentAt) : 'Pending'}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              {selectedEmail.status === 'FAILED' && (
                <Button
                  variant="primary"
                  onClick={(e) => {
                    handleRetry(selectedEmail.id || selectedEmail._id, e);
                    setSelectedEmail(null);
                  }}
                >
                  <RotateCw size={14} style={{ marginRight: '4px' }} /> Retry Now
                </Button>
              )}

              {(selectedEmail.status === 'PENDING' || selectedEmail.status === 'FAILED') && (
                <Button
                  variant="danger"
                  onClick={(e) => {
                    handleCancel(selectedEmail.id || selectedEmail._id, e);
                    setSelectedEmail(null);
                  }}
                >
                  <Ban size={14} style={{ marginRight: '4px' }} /> Cancel Email
                </Button>
              )}

              <Button variant="secondary" onClick={() => setSelectedEmail(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SuperAdminEmailOutbox;

