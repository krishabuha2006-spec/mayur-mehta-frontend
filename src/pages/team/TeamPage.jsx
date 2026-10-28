import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Sparkles, Shield, Trash2, Mail, Info, CheckCircle2, RotateCw, Unlock, Edit2, Search, Filter, History, UserCheck, X, ShieldCheck } from 'lucide-react';
import { teamService } from '../../services/teamService';
import { Button } from '../../components/common/Button/Button';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { Table } from '../../components/common/Table/Table';
import { Badge } from '../../components/common/Badge/Badge';
import { Avatar } from '../../components/common/Avatar/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatDate';
import { MESSAGES } from '../../constants/messages';
import { ROLES } from '../../constants/enums';
import { extractErrorMessage } from '../../utils/errorHandler';
import './TeamPage.css';

export function TeamPage() {
  const navigate = useNavigate();
  const { user: currentUser, setUpgradeModalOpen } = useAuth();
  const [seats, setSeats] = useState({ used: 0, max: 10, available: 10, plan: 'FREE' });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'MEMBER', mobile: '', designation: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [newRole, setNewRole] = useState('MEMBER');
  const [roleModalLoading, setRoleModalLoading] = useState(false);

  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedUserForRemove, setSelectedUserForRemove] = useState(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removeLoading, setRemoveLoading] = useState(false);

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Edit Member Profile Modal
  const [editMemberModalOpen, setEditMemberModalOpen] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState(null);
  const [editMemberForm, setEditMemberForm] = useState({ name: '', email: '', mobile: '', designation: '' });
  const [editMemberLoading, setEditMemberLoading] = useState(false);
  const [editMemberError, setEditMemberError] = useState('');

  // Transfer Ownership Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetAdmin, setTransferTargetAdmin] = useState(null);
  const [transferPassword, setTransferPassword] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');

  const [noticeMessage, setNoticeMessage] = useState('');

  // Fetch Team & Seats from Backend (GET /team/users & GET /team/seats)
  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const [usersRes, seatsRes] = await Promise.allSettled([
        teamService.getUsers({ search: searchQuery || undefined, role: roleFilter !== 'ALL' ? roleFilter : undefined }),
        teamService.getSeats()
      ]);

      if (usersRes.status === 'fulfilled') {
        setMembers(usersRes.value.users || []);
      }
      if (seatsRes.status === 'fulfilled') {
        const s = seatsRes.value;
        setSeats({
          used: s?.used ?? 0,
          max: s?.limit ?? s?.max ?? 10,
          available: s?.remaining ?? s?.available ?? 10,
          plan: s?.plan || 'FREE',
          capabilities: s?.capabilities || null
        });
      }
    } catch (err) {
      console.warn('Backend team fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [roleFilter]);

  const seatsUsed = seats.used;
  const seatLimit = seats.max || 10;
  const isAtLimit = seatsUsed >= seatLimit;
  const usagePercentage = Math.min(Math.round((seatsUsed / seatLimit) * 100), 100);

  const showNotice = (msg) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(''), 4500);
  };

  const handleOpenAction = () => {
    if (isAtLimit) {
      setUpgradeModalOpen(true);
    } else {
      setInviteError('');
      setInviteModalOpen(true);
    }
  };

  // POST /team/users - Invite Member
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError('');

    if (isAtLimit) {
      setInviteModalOpen(false);
      setUpgradeModalOpen(true);
      return;
    }

    setInviteLoading(true);
    try {
      await teamService.inviteUser(inviteForm);
      await fetchTeamData();
      setInviteModalOpen(false);
      setInviteForm({ name: '', email: '', role: 'MEMBER', mobile: '', designation: '' });
      showNotice(`Invitation successfully sent to ${inviteForm.email}.`);
    } catch (err) {
      if (err.response?.status === 402 || err.response?.data?.error?.code === 'SEAT_LIMIT_REACHED') {
        const details = err.response?.data?.error?.details;
        setInviteError(
          `User limit reached (${details?.seatsUsed || seatsUsed}/${details?.seatLimit || seatLimit}). The 11th user requires a paid plan. Removing any inactive user frees up their seat immediately at ₹0.`
        );
      } else {
        setInviteError(extractErrorMessage(err, 'Failed to send invite. Please try again.'));
      }
    } finally {
      setInviteLoading(false);
    }
  };

  // PUT /team/users/:id/role - Change Role
  const handleChangeRole = async (e) => {
    e.preventDefault();
    if (!selectedUserForRole) return;
    setRoleModalLoading(true);
    try {
      await teamService.changeRole(selectedUserForRole._id || selectedUserForRole.id, newRole);
      await fetchTeamData();
      setRoleModalOpen(false);
      setSelectedUserForRole(null);
      showNotice(`Role updated to ${newRole} successfully.`);
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setRoleModalLoading(false);
    }
  };

  // PUT /team/users/:id/remove - Remove Member (Frees Seat)
  const handleConfirmRemove = async (e) => {
    e.preventDefault();
    if (!selectedUserForRemove) return;
    setRemoveLoading(true);
    try {
      await teamService.removeUser(selectedUserForRemove._id || selectedUserForRemove.id, removeReason);
      await fetchTeamData();
      setRemoveModalOpen(false);
      setSelectedUserForRemove(null);
      setRemoveReason('');
      showNotice(`Member removed. Seat freed immediately (${seatsUsed - 1}/${seatLimit} seats now used).`);
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setRemoveLoading(false);
    }
  };

  // POST /team/users/:id/resend-invite
  const handleResendInvite = async (user) => {
    try {
      await teamService.resendInvite(user._id || user.id);
      showNotice(`Invitation email resent to ${user.email}.`);
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  // PUT /team/users/:id/unlock
  const handleUnlockUser = async (user) => {
    try {
      await teamService.unlockUser(user._id || user.id);
      await fetchTeamData();
      showNotice(`Account unlocked for ${user.email}.`);
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  // PATCH /team/users/:id - Update Member Profile & Email
  const handleOpenEditMember = async (member) => {
    setSelectedMemberForEdit(member);
    setEditMemberForm({
      name: member.name || '',
      email: member.email || '',
      mobile: member.mobile || '',
      designation: member.designation || ''
    });
    setEditMemberError('');
    setEditMemberModalOpen(true);

    try {
      const detail = await teamService.getUserDetail(member._id || member.id);
      if (detail) {
        setEditMemberForm({
          name: detail.name || `${detail.firstName || ''} ${detail.lastName || ''}`.trim() || member.name || '',
          email: detail.email || member.email || '',
          mobile: detail.mobile || member.mobile || '',
          designation: detail.designation || member.designation || ''
        });
      }
    } catch (err) {
      console.warn('User detail fetch notice:', err.message);
    }
  };

  const handleSaveEditMember = async (e) => {
    e.preventDefault();
    if (!selectedMemberForEdit) return;
    setEditMemberLoading(true);
    setEditMemberError('');
    try {
      const memberId = selectedMemberForEdit._id || selectedMemberForEdit.id;
      // 1. Update Profile (name, mobile, designation)
      await teamService.updateProfile(memberId, {
        name: editMemberForm.name.trim(),
        mobile: editMemberForm.mobile?.trim() || undefined,
        designation: editMemberForm.designation?.trim() || undefined
      });

      // 2. Change Email if modified (PUT /team/users/:id/email)
      if (editMemberForm.email && editMemberForm.email.trim() !== selectedMemberForEdit.email) {
        await teamService.changeEmail(memberId, editMemberForm.email.trim());
      }

      setEditMemberModalOpen(false);
      await fetchTeamData();
      showNotice(`Profile for ${editMemberForm.name} updated successfully in database.`);
    } catch (err) {
      setEditMemberError(extractErrorMessage(err));
    } finally {
      setEditMemberLoading(false);
    }
  };

  // POST /team/ownership/transfer - Transfer Company Ownership
  const handleOpenTransfer = (adminUser) => {
    setTransferTargetAdmin(adminUser);
    setTransferPassword('');
    setTransferError('');
    setTransferModalOpen(true);
  };

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!transferTargetAdmin || !transferPassword) return;
    setTransferLoading(true);
    setTransferError('');
    try {
      await teamService.transferOwnership({
        newOwnerUserId: transferTargetAdmin._id || transferTargetAdmin.id,
        password: transferPassword
      });
      setTransferModalOpen(false);
      await fetchTeamData();
      showNotice(`Ownership successfully transferred to ${transferTargetAdmin.name || transferTargetAdmin.email}.`);
    } catch (err) {
      setTransferError(extractErrorMessage(err));
    } finally {
      setTransferLoading(false);
    }
  };

  // GET /team/activity
  const handleOpenActivity = async () => {
    setActivityModalOpen(true);
    setActivityLoading(true);
    try {
      const logs = await teamService.getActivity();
      setActivities(logs);
    } catch (err) {
      console.warn('Activity fetch notice:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'TEAM MEMBER',
      render: (_, row) => {
        const displayName = row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim() || row.email?.split('@')[0];
        return (
          <div className="team-member-cell">
            <Avatar letter={displayName?.[0] || 'U'} size="sm" src={row.avatarUrl} />
            <div>
              <p className="team-member-name">{displayName}</p>
              <p className="team-member-email">{row.email}</p>
              {row.designation && <span className="team-member-designation">{row.designation}</span>}
            </div>
          </div>
        );
      }
    },
    {
      key: 'role',
      title: 'ROLE',
      render: (role) => (
        <Badge variant={role === 'OWNER' || role === ROLES.OWNER ? 'primary' : role === 'ADMIN' ? 'neutral' : 'outline'}>
          {role}
        </Badge>
      )
    },
    {
      key: 'status',
      title: 'STATUS',
      render: (status) => (
        <Badge variant={status === 'ACTIVE' || status === 'active' ? 'success' : status === 'INVITED' ? 'warning' : 'danger'}>
          {status}
        </Badge>
      )
    },
    {
      key: 'joinedAt',
      title: 'JOINED / INVITED',
      render: (_, row) => formatDate(row.createdAt || row.invitedAt || row.joinedAt)
    },
    {
      key: 'actions',
      title: '',
      align: 'right',
      render: (_, row) => {
        const isOwner = row.role === 'OWNER' || row.role === ROLES.OWNER;
        const isSelf = row._id === currentUser?._id || row.id === currentUser?.id || row.email === currentUser?.email;
        const callerIsOwner = currentUser?.role === 'OWNER' || currentUser?.role === ROLES.OWNER;
        const callerIsAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === ROLES.ADMIN;
        const targetIsAdmin = row.role === 'ADMIN' || row.role === ROLES.ADMIN;
        const targetIsMember = row.role === 'MEMBER' || row.role === ROLES.MEMBER;

        // Strict M1.4 Hierarchy: Owner manages all; Admin manages Members only; Self-actions forbidden
        const canManage = !isSelf && (callerIsOwner || (callerIsAdmin && targetIsMember));
        const canTransfer = callerIsOwner && targetIsAdmin && row.status === 'ACTIVE';

        return (
          <div className="team-actions-cell">
            {/* Edit Member Profile (Allowed for self via /me, or manager via /users/:id) */}
            {(canManage || isSelf) && (
              <button
                type="button"
                className="team-action-btn"
                title={isSelf ? 'Edit My Profile Details' : 'Edit Member Profile & Contact Details'}
                onClick={() => handleOpenEditMember(row)}
              >
                <Edit2 size={15} />
              </button>
            )}

            {canManage && row.status === 'INVITED' && (
              <button
                type="button"
                className="team-action-btn"
                title="Resend invitation email"
                onClick={() => handleResendInvite(row)}
              >
                <Mail size={15} />
              </button>
            )}

            {canManage && row.isLocked && (
              <button
                type="button"
                className="team-action-btn unlock"
                title="Unlock account"
                onClick={() => handleUnlockUser(row)}
              >
                <Unlock size={15} />
              </button>
            )}

            {callerIsOwner && !isSelf && (
              <button
                type="button"
                className="team-action-btn"
                title="Change Studio Role"
                onClick={() => {
                  setSelectedUserForRole(row);
                  setNewRole(row.role === 'ADMIN' ? 'MEMBER' : 'ADMIN');
                  setRoleModalOpen(true);
                }}
              >
                <UserCheck size={15} />
              </button>
            )}

            {canManage && (
              <button
                type="button"
                className="team-action-btn"
                title="Configure Module Permissions & Overrides"
                onClick={() => navigate(`/settings?tab=permissions&user=${row.id || row._id}`)}
              >
                <ShieldCheck size={15} />
              </button>
            )}

            {/* Transfer Ownership: OWNER caller to active ADMIN target only */}
            {canTransfer && (
              <button
                type="button"
                className="team-action-btn highlight"
                title="Transfer Company Ownership to this Admin"
                onClick={() => handleOpenTransfer(row)}
              >
                <Shield size={15} />
              </button>
            )}

            {canManage && !isOwner && (
              <button
                type="button"
                className="team-action-btn delete"
                title="Remove member (Frees up seat immediately)"
                onClick={() => {
                  setSelectedUserForRemove(row);
                  setRemoveReason('');
                  setRemoveModalOpen(true);
                }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  const filteredMembers = members.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (m.name || `${m.firstName || ''} ${m.lastName || ''}`).toLowerCase();
    const email = (m.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="team-page">
      {noticeMessage && (
        <div className="team-status-banner" role="status">
          <CheckCircle2 size={16} />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="team-header-row">
        <div>
          <h2 className="team-title">{MESSAGES.TEAM.TITLE}</h2>
          <p className="team-subtitle">Manage architects, designers, and seat allotments</p>
        </div>

        <div className="team-header-actions">
          <Button
            variant="secondary"
            icon={RotateCw}
            onClick={fetchTeamData}
            loading={loading}
            title="Refresh team members from database"
          >
            Sync
          </Button>

          <Button
            variant="secondary"
            icon={History}
            onClick={handleOpenActivity}
          >
            Activity
          </Button>

          <Button
            variant="primary"
            icon={isAtLimit ? Sparkles : UserPlus}
            onClick={handleOpenAction}
          >
            {isAtLimit ? MESSAGES.TEAM.UPGRADE_SEATS : MESSAGES.TEAM.ADD_MEMBER}
          </Button>
        </div>
      </div>

      {/* Rule Callout */}
      <div className="team-rule-banner">
        <div className="rule-icon-wrap">
          <Info size={16} />
        </div>
        <div className="rule-text">
          <span className="rule-title">10 Users Free Forever:</span> Your studio has {seatLimit} free permanent seats ({seatsUsed} in use, {seats.available} available). Removing a member frees up their seat immediately, allowing you to invite another team member at zero cost.
        </div>
      </div>

      {/* Seat Meter Capacity Card */}
      <div className="seat-meter-card">
        <div className="seat-meter-header">
          <div className="seat-meter-header-left">
            <span className="seat-meter-kicker">STUDIO SEAT CAPACITY</span>
            <div className="seat-stat-row">
              <span className="seat-stat-main">{seatsUsed}</span>
              <span className="seat-stat-total">/ {seatLimit}</span>
              <span className="seat-stat-sub">seats active</span>
            </div>
          </div>

          <div className="seat-meter-header-right">
            {isAtLimit ? (
              <Badge variant="warning">Seat Limit Reached (Upgrade Required for 11th User)</Badge>
            ) : (
              <span className="seats-available-badge">
                <CheckCircle2 size={13} />
                {seats.available} Seats Available
              </span>
            )}
          </div>
        </div>

        <div className="seat-progress-bar-bg">
          <div
            className={`seat-progress-bar-fill ${isAtLimit ? 'fill-warning' : ''}`}
            style={{ width: `${Math.max(usagePercentage, 2)}%` }}
          />
        </div>

        <div className="seat-meter-footer">
          <span>Active Members: <strong>{seatsUsed}</strong></span>
          <span className="seat-meter-dot">•</span>
          <span>Available Quota: <strong>{seats.available}</strong></span>
          <span className="seat-meter-dot">•</span>
          <span>Tier: <strong>{seats.plan === 'PAID' ? 'Studio Pro' : 'Free Permanent (10 Seats)'}</strong></span>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="team-filter-bar">
        <div className="team-search-wrapper">
          <Search size={15} className="team-search-icon" />
          <input
            type="text"
            placeholder="Search team members by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="team-search-input"
          />
          {searchQuery && (
            <button type="button" className="team-search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="team-role-pills">
          {['ALL', 'OWNER', 'ADMIN', 'MEMBER'].map((r) => (
            <button
              key={r}
              type="button"
              className={`team-role-pill ${roleFilter === r ? 'is-active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="team-table-area">
        <Table
          columns={columns}
          data={filteredMembers}
          loading={loading}
          emptyMessage="No team members match your criteria"
        />
      </div>

      {/* 1. Invite Member Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite New Team Member"
      >
        <form onSubmit={handleInviteSubmit} className="invite-form">
          {inviteError && <div className="auth-error-alert">{inviteError}</div>}

          <div className="team-invite-notice">
            Seat Allotment: This user will consume <strong>1 seat</strong> ({seatsUsed + 1} of {seatLimit} active).
          </div>

          <Input
            label="Full Name"
            id="invite-name"
            placeholder="Enter full name"
            value={inviteForm.name}
            onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />

          <Input
            label="Work Email Address"
            id="invite-email"
            type="email"
            placeholder="Enter email address"
            value={inviteForm.email}
            onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
            icon={Mail}
            required
          />

          <Input
            label="Mobile Number (Optional)"
            id="invite-mobile"
            placeholder="Enter phone number"
            value={inviteForm.mobile}
            onChange={(e) => setInviteForm((prev) => ({ ...prev, mobile: e.target.value }))}
          />

          <Input
            label="Designation / Role in Firm (Optional)"
            id="invite-designation"
            placeholder="Enter designation"
            value={inviteForm.designation}
            onChange={(e) => setInviteForm((prev) => ({ ...prev, designation: e.target.value }))}
          />

          <Select
            label="Studio Access Level"
            id="invite-role"
            value={inviteForm.role}
            onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value }))}
            options={[
              { value: 'MEMBER', label: 'Member', sublabel: 'Architect / Interior Designer' },
              { value: 'ADMIN', label: 'Studio Admin', sublabel: 'Project Lead / Workspace Manager' }
            ]}
          />

          <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-3)' }}>
            <Button variant="secondary" onClick={() => setInviteModalOpen(false)} style={{ flex: 1 }}>
              {MESSAGES.APP.CANCEL}
            </Button>
            <Button type="submit" variant="primary" loading={inviteLoading} style={{ flex: 1 }}>
              Send Studio Invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Change Role Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Change Studio Role"
      >
        <form onSubmit={handleChangeRole} className="invite-form">
          <p style={{ fontSize: '0.85rem', color: '#655E57', margin: '0 0 12px' }}>
            Updating role for <strong>{selectedUserForRole?.name || selectedUserForRole?.email}</strong>.
          </p>

          <Select
            label="New Access Level"
            id="change-role-select"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={[
              { value: 'MEMBER', label: 'Member', sublabel: 'Standard access to projects and tasks' },
              { value: 'ADMIN', label: 'Studio Admin', sublabel: 'Full management of workspace, team, and settings' }
            ]}
          />

          <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-3)' }}>
            <Button variant="secondary" onClick={() => setRoleModalOpen(false)} style={{ flex: 1 }}>
              {MESSAGES.APP.CANCEL}
            </Button>
            <Button type="submit" variant="primary" loading={roleModalLoading} style={{ flex: 1 }}>
              Update Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Confirm Remove Member Modal */}
      <Modal
        isOpen={removeModalOpen}
        onClose={() => setRemoveModalOpen(false)}
        title="Remove Team Member"
      >
        <form onSubmit={handleConfirmRemove} className="invite-form">
          <p style={{ fontSize: '0.85rem', color: '#655E57', margin: '0 0 8px' }}>
            Are you sure you want to remove <strong>{selectedUserForRemove?.name || selectedUserForRemove?.email}</strong>?
          </p>
          <p style={{ fontSize: '0.8rem', color: '#15803D', margin: '0 0 16px', background: '#EAF7EE', padding: '8px 12px', borderRadius: '6px' }}>
            Their project files and audit history will remain intact, and their seat will be freed immediately.
          </p>

          <Input
            label="Removal Reason (Optional)"
            id="remove-reason"
            placeholder="Enter reason for member departure"
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
          />

          <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-3)' }}>
            <Button variant="secondary" onClick={() => setRemoveModalOpen(false)} style={{ flex: 1 }}>
              {MESSAGES.APP.CANCEL}
            </Button>
            <Button type="submit" variant="danger" loading={removeLoading} style={{ flex: 1 }}>
              Confirm Removal
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Team Activity Log Modal */}
      <Modal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title="Team Activity & Audit Trail"
      >
        <div className="team-activity-list">
          {activityLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8C847A' }}>
              <RotateCw size={18} className="spin-icon" style={{ display: 'inline', marginRight: '6px' }} />
              Loading activity trail...
            </div>
          ) : activities.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8C847A' }}>
              No recent team activity events recorded.
            </div>
          ) : (
            activities.map((act, idx) => (
              <div key={act._id || idx} className="team-activity-item">
                <div className="activity-icon-bullet" />
                <div className="activity-item-content">
                  <p className="activity-action">{act.action || act.description || 'Team event'}</p>
                  <p className="activity-meta">
                    <span>{act.actorName || act.actorEmail || 'System'}</span>
                    <span className="meta-dot">•</span>
                    <span>{formatDate(act.createdAt || act.timestamp)}</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* 5. Edit Member Profile Modal */}
      <Modal
        isOpen={editMemberModalOpen}
        onClose={() => setEditMemberModalOpen(false)}
        title="Edit Team Member Profile"
      >
        <form onSubmit={handleSaveEditMember} className="invite-form">
          {editMemberError && <div className="auth-error-alert">{editMemberError}</div>}

          <Input
            label="Full Name"
            id="edit-member-name"
            value={editMemberForm.name}
            onChange={(e) => setEditMemberForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />

          <Input
            label="Work Email Address"
            id="edit-member-email"
            type="email"
            value={editMemberForm.email}
            onChange={(e) => setEditMemberForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />

          <Input
            label="Mobile Number"
            id="edit-member-mobile"
            placeholder="Enter phone number"
            value={editMemberForm.mobile}
            onChange={(e) => setEditMemberForm((prev) => ({ ...prev, mobile: e.target.value }))}
          />

          <Input
            label="Designation / Role in Firm"
            id="edit-member-designation"
            placeholder="Enter designation"
            value={editMemberForm.designation}
            onChange={(e) => setEditMemberForm((prev) => ({ ...prev, designation: e.target.value }))}
          />

          <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-3)' }}>
            <Button variant="secondary" onClick={() => setEditMemberModalOpen(false)} style={{ flex: 1 }}>
              {MESSAGES.APP.CANCEL}
            </Button>
            <Button type="submit" variant="primary" loading={editMemberLoading} style={{ flex: 1 }}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Transfer Ownership Modal */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Transfer Studio Ownership"
      >
        <form onSubmit={handleConfirmTransfer} className="invite-form">
          {transferError && <div className="auth-error-alert">{transferError}</div>}

          <div className="team-invite-notice" style={{ background: '#FEF3C7', borderColor: '#FDE68A', color: '#92400E' }}>
            Warning: You are transferring full company ownership to <strong>{transferTargetAdmin?.name || transferTargetAdmin?.email}</strong>. Your account will become an Admin.
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Please confirm your current owner password to authorize this transfer:
          </p>

          <Input
            label="Your Current Password"
            id="transfer-password"
            type="password"
            placeholder="Enter your current password"
            value={transferPassword}
            onChange={(e) => setTransferPassword(e.target.value)}
            required
          />

          <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-3)' }}>
            <Button variant="secondary" onClick={() => setTransferModalOpen(false)} style={{ flex: 1 }}>
              {MESSAGES.APP.CANCEL}
            </Button>
            <Button type="submit" variant="danger" loading={transferLoading} style={{ flex: 1 }}>
              Authorize Ownership Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TeamPage;
