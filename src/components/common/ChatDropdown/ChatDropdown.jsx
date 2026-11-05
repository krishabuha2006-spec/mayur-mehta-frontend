import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  CheckSquare,
  FolderKanban,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Dropdown } from '../Dropdown/Dropdown';
import { IconButton } from '../IconButton/IconButton';
import { chatService } from '../../../services/chatService';
import { useAuth } from '../../../hooks/useAuth';
import './ChatDropdown.css';

export function ChatDropdown() {
  const navigate = useNavigate();
  const { headerBadges } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'TASK' | 'PROJECT'

  const unreadCount = headerBadges?.chatCount || 0;

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await chatService.getThreads();
      const list = Array.isArray(data) ? data : data?.threads || data?.items || [];
      setThreads(list);
    } catch (err) {
      console.warn('Failed to load chat threads:', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleThreadClick = (t) => {
    const scopeType = t.scopeType || (t.taskId ? 'task' : 'project');
    const scopeId = t.scopeId || t.taskId || t.projectId;
    if (scopeType && scopeId) {
      navigate(`/chat?scopeType=${scopeType}&scopeId=${scopeId}`);
    } else {
      navigate('/chat');
    }
  };

  const filteredThreads = threads.filter((t) => {
    if (filter === 'TASK') return t.scopeType === 'task';
    if (filter === 'PROJECT') return t.scopeType === 'project';
    return true;
  });

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
        <div onClick={() => !isOpen && fetchThreads()}>
          <IconButton
            icon={MessageSquare}
            badgeCount={unreadCount}
            title={unreadCount > 0 ? `${unreadCount} unread discussions` : 'Team Chat & Discussions'}
            ariaLabel="Team chat"
          />
        </div>
      )}
    >
      <div className="chat-popup-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-popup-header">
          <div className="chat-header-title-row">
            <span className="chat-header-title">Discussions & Chat</span>
            {unreadCount > 0 && (
              <span className="chat-unread-badge">{unreadCount} unread</span>
            )}
          </div>
          <button
            type="button"
            className="chat-footer-link highlight"
            style={{ fontSize: '11.5px' }}
            onClick={() => navigate('/chat')}
          >
            Open Tasks &rarr;
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="chat-filter-tabs">
          <button
            type="button"
            className={`chat-tab-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All Threads
          </button>
          <button
            type="button"
            className={`chat-tab-btn ${filter === 'TASK' ? 'active' : ''}`}
            onClick={() => setFilter('TASK')}
          >
            Tasks
          </button>
          <button
            type="button"
            className={`chat-tab-btn ${filter === 'PROJECT' ? 'active' : ''}`}
            onClick={() => setFilter('PROJECT')}
          >
            Projects
          </button>
        </div>

        {/* Threads List */}
        <div className="chat-items-list">
          {loading && threads.length === 0 ? (
            <div className="chat-empty-state">
              <span style={{ fontSize: '12px', color: '#8C8277' }}>Loading discussions...</span>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="chat-empty-state">
              <div className="chat-empty-icon-wrap">
                <MessageSquare size={20} />
              </div>
              <span className="chat-empty-title">No conversations yet</span>
              <span className="chat-empty-sub">
                Open any task or project to collaborate and share real-time updates with assigned members.
              </span>
            </div>
          ) : (
            filteredThreads.map((t) => {
              const isTask = t.scopeType === 'task';
              const isUnread = (t.unreadCount || 0) > 0;
              const name = t.name || t.title || `${t.scopeType === 'task' ? 'Task' : 'Project'} #${t.scopeId}`;

              return (
                <div
                  key={`${t.scopeType}_${t.scopeId}`}
                  className={`chat-item-row ${isUnread ? 'is-unread' : ''}`}
                  onClick={() => handleThreadClick(t)}
                >
                  <div className="chat-scope-icon-wrap">
                    {isTask ? <CheckSquare size={16} /> : <FolderKanban size={16} />}
                  </div>

                  <div className="chat-item-content">
                    <div className="chat-item-top">
                      <span className="chat-item-name">{name}</span>
                      <span className="chat-item-time">{formatTime(t.lastMessageAt || t.updatedAt)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p className="chat-item-preview">{t.lastMessageContent || 'No messages yet in this thread'}</p>
                      {isUnread && (
                        <span className="chat-item-badge">{t.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="chat-popup-footer">
          <button
            type="button"
            className="chat-footer-link"
            onClick={() => navigate('/chat')}
          >
            Go to Task Board
          </button>
          <button
            type="button"
            className="chat-footer-link highlight"
            onClick={() => navigate('/projects')}
          >
            Project Channels &rarr;
          </button>
        </div>
      </div>
    </Dropdown>
  );
}

export default ChatDropdown;

