import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Send,
  Inbox,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Dropdown } from '../Dropdown/Dropdown';
import { IconButton } from '../IconButton/IconButton';
import { notificationService } from '../../../services/notificationService';
import { adminService } from '../../../services/adminService';
import { useAuth } from '../../../hooks/useAuth';
import './MailDropdown.css';

export function MailDropdown() {
  const navigate = useNavigate();
  const { user, headerBadges } = useAuth();
  const [tab, setTab] = useState('NOTICES'); // 'NOTICES' | 'OUTBOX'
  const [notices, setNotices] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [loading, setLoading] = useState(false);

  const mailCount = headerBadges?.mailCount || 0;

  const fetchMailData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch system & project notices
      const res = await notificationService.getNotifications({ limit: 20 });
      const list = res?.notifications || [];
      setNotices(list);

      // 2. If Super Admin or Owner, also fetch Email Outbox logs
      const role = (user?.role || '').toUpperCase();
      if (role === 'SUPER_ADMIN' || role === 'OWNER' || role === 'ADMIN') {
        try {
          const outboxRes = await adminService.getEmailOutbox({ limit: 15 });
          const outboxList = Array.isArray(outboxRes) ? outboxRes : outboxRes?.items || outboxRes?.emails || [];
          setOutbox(outboxList);
        } catch {
          setOutbox([]);
        }
      }
    } catch (err) {
      console.warn('Failed to load notices/mail:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <Dropdown
      align="right"
      menuClassName="dropdown-menu-flush"
      trigger={({ isOpen }) => (
        <div onClick={() => !isOpen && fetchMailData()}>
          <IconButton
            icon={Mail}
            badgeCount={mailCount}
            title={mailCount > 0 ? `${mailCount} new studio messages` : 'Studio Mail & Notices'}
            ariaLabel="Mail messages"
          />
        </div>
      )}
    >
      <div className="mail-popup-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mail-popup-header">
          <div className="mail-header-title-row">
            <span className="mail-header-title">Studio Notices & Mail</span>
            {mailCount > 0 && (
              <span className="mail-badge-count">{mailCount} new</span>
            )}
          </div>
          <button
            type="button"
            className="mail-footer-link highlight"
            style={{ fontSize: '11.5px' }}
            onClick={() => navigate('/settings')}
          >
            Settings &rarr;
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mail-filter-tabs">
          <button
            type="button"
            className={`mail-tab-btn ${tab === 'NOTICES' ? 'active' : ''}`}
            onClick={() => setTab('NOTICES')}
          >
            Dispatches ({notices.length})
          </button>
          <button
            type="button"
            className={`mail-tab-btn ${tab === 'OUTBOX' ? 'active' : ''}`}
            onClick={() => setTab('OUTBOX')}
          >
            Email Outbox ({outbox.length})
          </button>
        </div>

        {/* Items List */}
        <div className="mail-items-list">
          {loading && (tab === 'NOTICES' ? notices.length === 0 : outbox.length === 0) ? (
            <div className="mail-empty-state">
              <span style={{ fontSize: '12px', color: '#8C8277' }}>Loading communications...</span>
            </div>
          ) : tab === 'NOTICES' ? (
            notices.length === 0 ? (
              <div className="mail-empty-state">
                <div className="mail-empty-icon-wrap">
                  <Inbox size={20} />
                </div>
                <span className="mail-empty-title">No new dispatches</span>
                <span className="mail-empty-sub">
                  Team invitations, milestone notices, and client broadcasts will appear here.
                </span>
              </div>
            ) : (
              notices.map((n) => {
                const id = n.id || n._id;
                return (
                  <div
                    key={id}
                    className="mail-item-row"
                    onClick={() => {
                      if (n.link) navigate(n.link);
                    }}
                  >
                    <div className="mail-icon-wrap">
                      <Mail size={16} />
                    </div>
                    <div className="mail-item-content">
                      <div className="mail-item-top">
                        <span className="mail-item-subject">{n.title || n.subject || 'Studio Broadcast'}</span>
                        <span className="mail-item-time">{formatTime(n.createdAt)}</span>
                      </div>
                      <p className="mail-item-preview">{n.message || n.body || n.content}</p>
                    </div>
                  </div>
                );
              })
            )
          ) : outbox.length === 0 ? (
            <div className="mail-empty-state">
              <div className="mail-empty-icon-wrap">
                <Send size={20} />
              </div>
              <span className="mail-empty-title">Outbox is clear</span>
              <span className="mail-empty-sub">
                All transactional emails (invites, password resets, billing updates) were dispatched successfully.
              </span>
            </div>
          ) : (
            outbox.map((m) => {
              const status = (m.status || 'SENT').toUpperCase();
              const pillClass = status === 'SENT' ? 'sent' : status === 'FAILED' ? 'failed' : 'queued';
              return (
                <div key={m.id || m._id} className="mail-item-row">
                  <div className="mail-icon-wrap">
                    <Send size={16} />
                  </div>
                  <div className="mail-item-content">
                    <div className="mail-item-top">
                      <span className="mail-item-subject">{m.subject || 'Automated Email'}</span>
                      <span className={`mail-status-pill ${pillClass}`}>{status}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span style={{ fontSize: '11.5px', color: '#8C8277' }}>To: {m.to || m.recipient}</span>
                      <span className="mail-item-time">{formatTime(m.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mail-popup-footer">
          <button
            type="button"
            className="mail-footer-link"
            onClick={() => navigate('/logs')}
          >
            Audit Logs
          </button>
          <button
            type="button"
            className="mail-footer-link highlight"
            onClick={() => navigate('/admin')}
          >
            Super Admin Outbox &rarr;
          </button>
        </div>
      </div>
    </Dropdown>
  );
}

export default MailDropdown;

