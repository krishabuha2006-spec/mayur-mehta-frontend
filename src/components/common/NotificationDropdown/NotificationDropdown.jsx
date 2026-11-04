import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Folder,
  ClipboardList,
  CheckCircle2,
  CreditCard,
  MessageSquare,
  Sparkles,
  ExternalLink,
  X
} from 'lucide-react';
import { Dropdown } from '../Dropdown/Dropdown';
import { IconButton } from '../IconButton/IconButton';
import { notificationService } from '../../../services/notificationService';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './NotificationDropdown.css';

export function NotificationDropdown() {
  const navigate = useNavigate();
  const { headerBadges } = useAuth();
  const [unreadCount, setUnreadCount] = useState(headerBadges?.notificationCount || 0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'

  // Keep unreadCount in sync with headerBadges from auth context without extra API hits
  useEffect(() => {
    if (headerBadges?.notificationCount !== undefined) {
      setUnreadCount(Number(headerBadges.notificationCount) || 0);
    }
  }, [headerBadges?.notificationCount]);

  // Fetch notifications list strictly on demand when user clicks to open dropdown
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications({ limit: 25 });
      setNotifications(res?.notifications || []);
      if (res?.unreadCount !== undefined) {
        setUnreadCount(Number(res.unreadCount) || 0);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => ((n.id || n._id) === id ? { ...n, read: true, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Mark as read notice:', err);
    }
  };

  const handleMarkAllRead = async (e) => {
    e?.stopPropagation();
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Mark all read notice:', err);
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    try {
      const targetItem = notifications.find((n) => (n.id || n._id) === id);
      const wasUnread = targetItem && !targetItem.read && !targetItem.isRead;
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => (n.id || n._id) !== id));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.warn('Delete notification notice:', err);
    }
  };

  const handleClearRead = async (e) => {
    e?.stopPropagation();
    try {
      await notificationService.clearRead();
      setNotifications((prev) => prev.filter((n) => !n.read && !n.isRead));
    } catch (err) {
      console.warn('Clear read notice:', err);
    }
  };

  const handleNotificationClick = (item) => {
    const id = item.id || item._id;
    if (!item.read && !item.isRead) {
      handleMarkAsRead(id);
    }

    // Navigate to related target if available
    if (item.link) {
      navigate(item.link);
    } else if (item.entityType === 'PROJECT' || item.projectId) {
      navigate('/projects');
    } else if (item.entityType === 'TASK' || item.taskId) {
      navigate('/tasks');
    } else if (item.entityType === 'BILLING' || item.invoiceId) {
      navigate('/billing');
    }
  };

  const getIcon = (type) => {
    const t = String(type || '').toUpperCase();
    if (t.includes('TASK')) return <ClipboardList size={16} className="notif-type-icon task" />;
    if (t.includes('PROJECT')) return <Folder size={16} className="notif-type-icon project" />;
    if (t.includes('APPROVAL')) return <CheckCircle2 size={16} className="notif-type-icon approval" />;
    if (t.includes('BILL') || t.includes('PAY')) return <CreditCard size={16} className="notif-type-icon billing" />;
    if (t.includes('CHAT') || t.includes('COMMENT')) return <MessageSquare size={16} className="notif-type-icon chat" />;
    return <Sparkles size={16} className="notif-type-icon general" />;
  };

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

  const filteredList = notifications.filter((n) => {
    const isRead = Boolean(n.read || n.isRead);
    return filter === 'UNREAD' ? !isRead : true;
  });

  return (
    <Dropdown
      align="right"
      menuClassName="dropdown-menu-flush"
      trigger={({ isOpen }) => (
        <div onClick={() => !isOpen && fetchList()}>
          <IconButton
            icon={Bell}
            badgeCount={unreadCount}
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
            ariaLabel="Notifications"
          />
        </div>
      )}
    >
      <div className="notif-popup-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="notif-popup-header">
          <div className="notif-header-title-row">
            <span className="notif-header-title">Notifications</span>
            {unreadCount > 0 && (
              <span className="notif-unread-badge">{unreadCount} new</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-mark-all-btn"
              onClick={handleMarkAllRead}
              title="Mark all as read"
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="notif-filter-tabs">
          <button
            type="button"
            className={`notif-tab ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All
          </button>
          <button
            type="button"
            className={`notif-tab ${filter === 'UNREAD' ? 'active' : ''}`}
            onClick={() => setFilter('UNREAD')}
          >
            Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
        </div>

        {/* Notification Items List */}
        <div className="notif-items-list">
          {loading && notifications.length === 0 ? (
            <div className="notif-empty-state">
              <span className="notif-loading-text">Loading notifications...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="notif-empty-state">
              <div className="notif-empty-icon-wrap">
                <Bell size={24} className="notif-empty-bell" />
              </div>
              <span className="notif-empty-title">All caught up!</span>
              <span className="notif-empty-sub">
                {filter === 'UNREAD'
                  ? 'No unread notifications at the moment.'
                  : 'You have no recent notifications from the studio.'}
              </span>
            </div>
          ) : (
            filteredList.map((item) => {
              const id = item.id || item._id;
              const isRead = Boolean(item.read || item.isRead);
              return (
                <div
                  key={id}
                  className={`notif-item ${!isRead ? 'unread' : 'read'}`}
                  onClick={() => handleNotificationClick(item)}
                >
                  <div className="notif-icon-col">
                    {getIcon(item.type || item.category)}
                  </div>
                  <div className="notif-content-col">
                    <div className="notif-item-title-row">
                      <span className="notif-item-title">
                        {item.title || item.subject || 'Studio Update'}
                      </span>
                      {!isRead && <span className="notif-blue-dot" />}
                    </div>
                    <p className="notif-item-message">
                      {item.message || item.body || item.content || 'Activity logged in workspace.'}
                    </p>
                    <span className="notif-item-time">
                      {formatTime(item.createdAt || item.date)}
                    </span>
                  </div>
                  <div className="notif-actions-col">
                    <button
                      type="button"
                      className="notif-delete-btn"
                      title="Delete notification"
                      onClick={(e) => handleDelete(id, e)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="notif-popup-footer">
          <button
            type="button"
            className="notif-footer-link"
            onClick={handleClearRead}
          >
            Clear read notifications
          </button>
          <button
            type="button"
            className="notif-footer-link highlight"
            onClick={() => navigate('/settings')}
          >
            Preferences &rarr;
          </button>
        </div>
      </div>
    </Dropdown>
  );
}
export default NotificationDropdown;

