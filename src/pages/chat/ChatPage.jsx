import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  Filter,
  Check,
  CheckCheck,
  Clock,
  Building2,
  CheckSquare,
  Bell,
  BellOff,
  MoreVertical,
  ArrowUpRight,
  RefreshCw,
  Trash2,
  Edit2,
  Paperclip,
  Smile,
  X,
  User,
  Users,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { chatService } from '../../services/chatService';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmationContext';
import { extractErrorMessage } from '../../utils/errorHandler';
import './ChatPage.css';

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();

  const urlScopeType = searchParams.get('scopeType') || '';
  const urlScopeId = searchParams.get('scopeId') || '';

  // Data states
  const [channels, setChannels] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Filters & Search
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'PROJECT' | 'TASK'
  const [searchQuery, setSearchQuery] = useState('');

  // Composer
  const [inputText, setInputText] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');

  // Start new discussion modal
  const [newDiscussionModalOpen, setNewDiscussionModalOpen] = useState(false);
  const [projectsList, setProjectsList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [newScopeType, setNewScopeType] = useState('project');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [initialMsgText, setInitialMsgText] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch live channels: Merges threads from /chat/threads with available projects and tasks
  const loadAllChannels = useCallback(async (preferredTarget = null) => {
    try {
      const [threadsRes, projsRes, tasksRes] = await Promise.allSettled([
        chatService.getThreads(),
        projectService.getProjects({ limit: 50 }),
        taskService.getTasks({ limit: 50 })
      ]);

      const backendThreads = threadsRes.status === 'fulfilled'
        ? (Array.isArray(threadsRes.value) ? threadsRes.value : (threadsRes.value?.threads || threadsRes.value?.items || []))
        : [];

      const rawProjects = projsRes.status === 'fulfilled'
        ? (Array.isArray(projsRes.value?.data) ? projsRes.value.data : (Array.isArray(projsRes.value) ? projsRes.value : []))
        : [];

      const rawTasks = tasksRes.status === 'fulfilled'
        ? (Array.isArray(tasksRes.value?.data) ? tasksRes.value.data : (Array.isArray(tasksRes.value) ? tasksRes.value : []))
        : [];

      setProjectsList(rawProjects);
      setTasksList(rawTasks);

      // Create a unified channels map
      const channelsMap = new Map();

      // 1. First add existing active backend threads
      backendThreads.forEach((t) => {
        const key = `${t.scopeType || (t.taskId ? 'task' : 'project')}_${t.scopeId || t.taskId || t.projectId}`;
        channelsMap.set(key, {
          scopeType: t.scopeType || (t.taskId ? 'task' : 'project'),
          scopeId: t.scopeId || t.taskId || t.projectId,
          title: t.title || t.name || (t.scopeType === 'task' ? 'Task Discussion' : 'Project Channel'),
          snippet: t.lastMessage?.body || t.lastMessage?.content || t.snippet || '',
          time: t.lastMessage?.createdAt || t.updatedAt || t.createdAt,
          unreadCount: Number(t.unreadCount || 0),
          isMuted: !!t.isMuted
        });
      });

      // 2. Add Project channels from database if not already present
      rawProjects.forEach((p) => {
        const pId = p._id || p.id;
        if (!pId) return;
        const key = `project_${pId}`;
        if (!channelsMap.has(key)) {
          channelsMap.set(key, {
            scopeType: 'project',
            scopeId: pId,
            title: p.name || p.title || p.code || 'Project Channel',
            code: p.code,
            snippet: 'Click to start project discussion',
            time: p.updatedAt || p.createdAt,
            unreadCount: 0,
            isMuted: false
          });
        } else {
          // Enhance title if available
          const existing = channelsMap.get(key);
          if (p.name && !existing.title) existing.title = p.name;
        }
      });

      // 3. Add Task channels from database if not already present
      rawTasks.forEach((t) => {
        const tId = t._id || t.id;
        if (!tId) return;
        const key = `task_${tId}`;
        if (!channelsMap.has(key)) {
          channelsMap.set(key, {
            scopeType: 'task',
            scopeId: tId,
            title: t.title || t.name || 'Task Discussion',
            code: t.code,
            snippet: 'Click to collaborate on task',
            time: t.updatedAt || t.createdAt,
            unreadCount: 0,
            isMuted: false
          });
        }
      });

      const mergedList = Array.from(channelsMap.values());
      setChannels(mergedList);

      // Select active channel
      if (preferredTarget) {
        const found = mergedList.find(
          (c) => c.scopeType === preferredTarget.scopeType && String(c.scopeId) === String(preferredTarget.scopeId)
        );
        setActiveThread(found || preferredTarget);
      } else if (!activeThread && mergedList.length > 0) {
        setActiveThread(mergedList[0]);
      }
    } catch (err) {
      console.warn('Failed to load studio chat channels:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [activeThread]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    if (urlScopeType && urlScopeId) {
      loadAllChannels({ scopeType: urlScopeType, scopeId: urlScopeId });
    } else {
      loadAllChannels();
    }
  }, [urlScopeType, urlScopeId, loadAllChannels]);

  // 2. Fetch messages when activeThread changes
  const fetchMessages = useCallback(async (thread) => {
    if (!thread?.scopeType || !thread?.scopeId) return;
    setMessagesLoading(true);
    try {
      const res = await chatService.getMessages(thread.scopeType, thread.scopeId, { limit: 50 });
      const msgList = Array.isArray(res) ? res : res?.messages || res?.items || [];
      // Sort chronologically ascending
      msgList.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      setMessages(msgList);

      // Auto mark read
      if (res?.lastSeq) {
        chatService.markRead(thread.scopeType, thread.scopeId, res.lastSeq).catch(() => {});
      }
    } catch (err) {
      console.warn('Failed to load messages:', err?.message);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeThread) {
      fetchMessages(activeThread);
    }
  }, [activeThread, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Select Channel
  const handleSelectChannel = (channel) => {
    setActiveThread(channel);
    setSearchParams({ scopeType: channel.scopeType, scopeId: channel.scopeId });
  };

  // 3. Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || !activeThread || sending) return;

    setSending(true);
    try {
      const sent = await chatService.sendMessage(activeThread.scopeType, activeThread.scopeId, {
        body: text,
        content: text
      });

      // Optimistically append sent message
      const createdMsg = sent?.message || sent || {
        _id: `msg_${Date.now()}`,
        body: text,
        content: text,
        senderName: user?.displayName || user?.name || 'You',
        senderId: user?.id || user?._id,
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, createdMsg]);
      setInputText('');

      // Update snippet in channels list
      setChannels((prev) =>
        prev.map((c) =>
          c.scopeType === activeThread.scopeType && String(c.scopeId) === String(activeThread.scopeId)
            ? { ...c, snippet: text, time: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.warn('Failed to send message:', err?.message);
    } finally {
      setSending(false);
    }
  };

  // 4. Edit Message
  const handleEditSubmit = async (msgId) => {
    if (!editText.trim()) return;
    try {
      await chatService.editMessage(msgId, editText.trim());
      setMessages((prev) =>
        prev.map((m) => ((m._id || m.id) === msgId ? { ...m, body: editText.trim(), content: editText.trim(), isEdited: true } : m))
      );
      setEditingMessage(null);
      setEditText('');
    } catch (err) {
      console.warn('Failed to edit message:', err?.message);
    }
  };

  // 5. Delete Message
  const handleDeleteMessage = async (msgId) => {
    const confirmed = await confirm({
      title: 'Delete Message?',
      message: 'Are you sure you want to delete this message from the studio discussion thread?',
      confirmText: 'Delete',
      confirmVariant: 'danger'
    });
    if (!confirmed) return;

    try {
      await chatService.deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => (m._id || m.id) !== msgId));
    } catch (err) {
      console.warn('Failed to delete message:', err?.message);
    }
  };

  // 6. Toggle Mute
  const handleToggleMute = async () => {
    if (!activeThread) return;
    const nextMuteState = !activeThread.isMuted;
    try {
      await chatService.toggleMute(activeThread.scopeType, activeThread.scopeId, nextMuteState);
      setActiveThread((prev) => ({ ...prev, isMuted: nextMuteState }));
      setChannels((prev) =>
        prev.map((c) =>
          c.scopeId === activeThread.scopeId && c.scopeType === activeThread.scopeType
            ? { ...c, isMuted: nextMuteState }
            : c
        )
      );
    } catch (err) {
      console.warn('Failed to toggle mute:', err?.message);
    }
  };

  // 7. Start New Discussion Modal
  const handleStartNewDiscussion = async (e) => {
    e.preventDefault();
    if (!selectedEntityId) return;

    const chosenEntity =
      newScopeType === 'project'
        ? projectsList.find((p) => (p._id || p.id) === selectedEntityId)
        : tasksList.find((t) => (t._id || t.id) === selectedEntityId);

    const threadTitle =
      chosenEntity?.name || chosenEntity?.title || `${newScopeType === 'project' ? 'Project' : 'Task'} Discussion`;

    const newTarget = {
      scopeType: newScopeType,
      scopeId: selectedEntityId,
      title: threadTitle,
      unreadCount: 0
    };

    if (initialMsgText.trim()) {
      try {
        await chatService.sendMessage(newScopeType, selectedEntityId, {
          body: initialMsgText.trim(),
          content: initialMsgText.trim()
        });
      } catch {}
    }

    setNewDiscussionModalOpen(false);
    setInitialMsgText('');
    handleSelectChannel(newTarget);
    loadAllChannels(newTarget);
  };

  // Filtered channels
  const filteredChannels = channels.filter((c) => {
    const matchesFilter =
      filterType === 'ALL' ||
      (filterType === 'PROJECT' && c.scopeType === 'project') ||
      (filterType === 'TASK' && c.scopeType === 'task');

    const matchesSearch =
      !searchQuery.trim() ||
      (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.snippet || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="chat-page-layout">
      {/* LEFT: Channels & Threads Sidebar */}
      <aside className="chat-sidebar-panel">
        <div className="chat-sidebar-header">
          <div>
            <h2 className="chat-sidebar-title">Studio Discussions</h2>
            <p className="chat-sidebar-subtitle">Project channels & task collaboration</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => {
              if (projectsList.length > 0 && !selectedEntityId) {
                setSelectedEntityId(projectsList[0]._id || projectsList[0].id);
              }
              setNewDiscussionModalOpen(true);
            }}
            title="Start New Discussion"
          >
            New
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="chat-filter-pills">
          <button
            type="button"
            className={`filter-pill ${filterType === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterType('ALL')}
          >
            All Channels ({channels.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'PROJECT' ? 'active' : ''}`}
            onClick={() => setFilterType('PROJECT')}
          >
            Projects
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'TASK' ? 'active' : ''}`}
            onClick={() => setFilterType('TASK')}
          >
            Tasks
          </button>
        </div>

        {/* Search Bar */}
        <div className="chat-search-wrap">
          <Search size={14} className="chat-search-icon" />
          <input
            type="text"
            placeholder="Search channels & discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="chat-search-input"
          />
        </div>

        {/* Channel List */}
        <div className="chat-thread-list">
          {loading ? (
            <div className="chat-threads-loading">
              <RefreshCw size={18} className="spin-icon" />
              <span>Loading discussions...</span>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="chat-threads-empty">
              <MessageSquare size={32} strokeWidth={1.2} />
              <p>No channels found.</p>
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={() => setNewDiscussionModalOpen(true)}
              >
                Start Discussion
              </Button>
            </div>
          ) : (
            filteredChannels.map((c) => {
              const isActive =
                activeThread &&
                activeThread.scopeType === c.scopeType &&
                String(activeThread.scopeId) === String(c.scopeId);

              const isProject = c.scopeType === 'project';
              const title = c.title || (isProject ? 'Project Channel' : 'Task Thread');
              const snippet = c.snippet || 'Click to collaborate';

              return (
                <div
                  key={`${c.scopeType}_${c.scopeId}`}
                  className={`chat-thread-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectChannel(c)}
                >
                  <div className={`thread-icon-badge ${isProject ? 'project' : 'task'}`}>
                    {isProject ? <Building2 size={16} /> : <CheckSquare size={16} />}
                  </div>

                  <div className="thread-content-col">
                    <div className="thread-title-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                        {c.code && <span className="card-code-pill" style={{ fontSize: '10px', padding: '1px 5px' }}>{c.code}</span>}
                        <span className="thread-title">{title}</span>
                      </div>
                      {c.time && <span className="thread-time">{formatMessageTime(c.time)}</span>}
                    </div>

                    <div className="thread-snippet-row">
                      <span className="thread-snippet">{snippet}</span>
                      {c.unreadCount > 0 && <span className="thread-unread-pill">{c.unreadCount}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT: Active Discussion & Message Stream */}
      <main className="chat-main-panel">
        {activeThread ? (
          <>
            {/* Thread Header */}
            <header className="chat-main-header">
              <div className="chat-header-info">
                <div className={`thread-icon-badge ${activeThread.scopeType === 'project' ? 'project' : 'task'}`}>
                  {activeThread.scopeType === 'project' ? <Building2 size={18} /> : <CheckSquare size={18} />}
                </div>

                <div>
                  <div className="chat-header-title-flex">
                    <h3 className="chat-active-title">
                      {activeThread.title || (activeThread.scopeType === 'project' ? 'Project Discussion' : 'Task Discussion')}
                    </h3>
                    <Badge variant={activeThread.scopeType === 'project' ? 'primary' : 'warning'}>
                      {activeThread.scopeType === 'project' ? 'Project Channel' : 'Task Thread'}
                    </Badge>
                  </div>
                  <span className="chat-header-meta">
                    Live studio collaboration channel • {activeThread.scopeType === 'project' ? 'Project Space' : 'Task Space'}
                  </span>
                </div>
              </div>

              <div className="chat-header-actions">
                {activeThread.scopeType === 'project' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ArrowUpRight}
                    onClick={() => navigate(`/projects?view=list&projectId=${activeThread.scopeId}`)}
                  >
                    View Project
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ArrowUpRight}
                    onClick={() => navigate(`/tasks?tab=all&taskId=${activeThread.scopeId}`)}
                  >
                    View Task
                  </Button>
                )}

                <button
                  type="button"
                  className={`chat-header-icon-btn ${activeThread.isMuted ? 'muted' : ''}`}
                  onClick={handleToggleMute}
                  title={activeThread.isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                >
                  {activeThread.isMuted ? <BellOff size={16} /> : <Bell size={16} />}
                </button>

                <button
                  type="button"
                  className="chat-header-icon-btn"
                  onClick={() => fetchMessages(activeThread)}
                  title="Refresh Channel"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </header>

            {/* Messages Scroll Area */}
            <div className="chat-messages-container">
              {messagesLoading ? (
                <div className="chat-messages-loading">
                  <RefreshCw size={24} className="spin-icon" />
                  <span>Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-messages-empty">
                  <MessageSquare size={48} strokeWidth={1.2} />
                  <h4>No messages in this channel yet</h4>
                  <p>Send a message below to start collaborating on this {activeThread.scopeType}.</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMe = (m.senderId && (m.senderId === user?.id || m.senderId === user?._id)) || m.isMe;
                  const senderName = isMe ? 'You' : m.senderName || m.user?.name || m.author?.name || 'Studio Member';
                  const initials = senderName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  const bodyText = m.body || m.content || '';

                  return (
                    <div key={m._id || m.id || idx} className={`chat-message-row ${isMe ? 'mine' : 'theirs'}`}>
                      {!isMe && <div className="chat-avatar-bubble">{initials}</div>}

                      <div className="chat-bubble-col">
                        <div className="chat-bubble-meta">
                          <span className="chat-sender-name">{senderName}</span>
                          <span className="chat-bubble-time">{formatMessageTime(m.createdAt)}</span>
                          {m.isEdited && <span className="chat-edited-label">(edited)</span>}
                        </div>

                        {editingMessage === (m._id || m.id) ? (
                          <div className="chat-edit-box">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="chat-edit-input"
                              autoFocus
                            />
                            <div className="chat-edit-actions">
                              <Button size="sm" variant="secondary" onClick={() => setEditingMessage(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" variant="primary" onClick={() => handleEditSubmit(m._id || m.id)}>
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className={`chat-bubble-box ${isMe ? 'bubble-mine' : 'bubble-theirs'}`}>
                            <p className="chat-bubble-text">{bodyText}</p>

                            {isMe && (
                              <div className="chat-message-actions-overlay">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessage(m._id || m.id);
                                    setEditText(bodyText);
                                  }}
                                  title="Edit message"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMessage(m._id || m.id)}
                                  title="Delete message"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSendMessage} className="chat-composer-bar">
              <input
                type="text"
                placeholder={`Message #${activeThread.title || 'channel'}... (Press Enter to send)`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={sending}
                className="chat-composer-input"
              />

              <Button
                variant="primary"
                type="submit"
                disabled={!inputText.trim() || sending}
                icon={Send}
              >
                Send
              </Button>
            </form>
          </>
        ) : (
          <div className="chat-no-active-placeholder">
            <MessageSquare size={52} strokeWidth={1.2} />
            <h3>Select a discussion channel</h3>
            <p>Choose an ongoing project discussion or task thread from the left to collaborate with the team.</p>
            <Button variant="primary" icon={Plus} onClick={() => setNewDiscussionModalOpen(true)}>
              Start Discussion
            </Button>
          </div>
        )}
      </main>

      {/* MODAL: Start New Discussion */}
      <Modal
        isOpen={newDiscussionModalOpen}
        onClose={() => setNewDiscussionModalOpen(false)}
        title="Start New Discussion Channel"
        size="md"
      >
        <form onSubmit={handleStartNewDiscussion} className="chat-new-modal-form">
          <div className="form-field-group">
            <label className="field-label">Discussion Scope</label>
            <div className="scope-choice-row">
              <button
                type="button"
                className={`scope-btn ${newScopeType === 'project' ? 'active' : ''}`}
                onClick={() => {
                  setNewScopeType('project');
                  if (projectsList.length > 0) setSelectedEntityId(projectsList[0]._id || projectsList[0].id);
                }}
              >
                <Building2 size={16} />
                <span>Project Discussion</span>
              </button>

              <button
                type="button"
                className={`scope-btn ${newScopeType === 'task' ? 'active' : ''}`}
                onClick={() => {
                  setNewScopeType('task');
                  if (tasksList.length > 0) setSelectedEntityId(tasksList[0]._id || tasksList[0].id);
                }}
              >
                <CheckSquare size={16} />
                <span>Task Discussion</span>
              </button>
            </div>
          </div>

          {newScopeType === 'project' ? (
            <Select
              label="Select Project *"
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              options={projectsList.map((p) => ({
                value: p._id || p.id,
                label: p.name || p.title || p.code || 'Project'
              }))}
            />
          ) : (
            <Select
              label="Select Task *"
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              options={tasksList.map((t) => ({
                value: t._id || t.id,
                label: t.title || t.name || 'Task'
              }))}
            />
          )}

          <div className="form-field-group">
            <label className="field-label">Initial Message (Optional)</label>
            <textarea
              className="field-textarea"
              rows={3}
              placeholder="Start the conversation with design intent or site query..."
              value={initialMsgText}
              onChange={(e) => setInitialMsgText(e.target.value)}
            />
          </div>

          <div className="modal-actions-bar">
            <Button variant="secondary" type="button" onClick={() => setNewDiscussionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!selectedEntityId}>
              Open Channel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ChatPage;
