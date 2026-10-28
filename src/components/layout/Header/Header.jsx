import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Mail, MessageSquare, Bell, Menu, LogOut, Settings, CreditCard, Shield, Building2, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { IconButton } from '../../common/IconButton/IconButton';
import { Avatar } from '../../common/Avatar/Avatar';
import { Dropdown } from '../../common/Dropdown/Dropdown';
import { MayurMehtaLogo } from '../../common/MayurMehtaLogo/MayurMehtaLogo';
import { QuickAddDrawer } from '../../common/QuickAddDrawer/QuickAddDrawer';
import { Modal } from '../../common/Modal/Modal';
import { Input } from '../../common/Input/Input';
import { Button } from '../../common/Button/Button';
import { authService } from '../../../services/authService';
import { teamService } from '../../../services/teamService';
import { extractErrorMessage } from '../../../utils/errorHandler';
import { MESSAGES } from '../../../constants/messages';
import { ROUTES } from '../../../constants/routes';
import { ROLES } from '../../../constants/enums';
import './Header.css';

export function Header({ onOpenMobileMenu }) {
  const { user, company, headerBadges, logout, refreshUser } = useAuth();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');

  // My Profile State (M1.4 PATCH /team/me)
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', mobile: '', designation: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const navigate = useNavigate();

  const handleOpenProfile = () => {
    setProfileForm({
      name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '',
      mobile: user?.mobile || '',
      designation: user?.designation || user?.role || ''
    });
    setProfileError('');
    setProfileSuccess('');
    setProfileModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      setProfileError('Name is required');
      return;
    }
    setProfileLoading(true);
    setProfileError('');
    try {
      await teamService.updateSelf({
        name: profileForm.name.trim(),
        mobile: profileForm.mobile?.trim() || undefined,
        designation: profileForm.designation?.trim() || undefined
      });
      if (refreshUser) {
        await refreshUser();
      }
      setProfileSuccess('Profile details saved successfully.');
      setTimeout(() => {
        setProfileModalOpen(false);
      }, 900);
    } catch (err) {
      setProfileError(extractErrorMessage(err, 'Failed to update profile'));
    } finally {
      setProfileLoading(false);
    }
  };

  const userLetter = user?.avatarLetter || user?.firstName?.[0] || 'M';
  const hasCustomLogo = company?.branding?.hasLogo || company?.logo?.hasLogo;

  // Auto-open modal if backend flagged that password change is required
  useEffect(() => {
    if (user?.mustChangePassword) {
      setChangePasswordOpen(true);
    }
  }, [user?.mustChangePassword]);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setChangeError('');
    setChangeSuccess('');

    if (!currentPassword) {
      setChangeError('Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      setChangeError('New password must be at least 8 characters long');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setChangeError('New password must contain both letters and numbers');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('New passwords do not match');
      return;
    }

    setChangeLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setChangeSuccess('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        logout();
        navigate(ROUTES.LOGIN, { state: { message: 'Password changed successfully. Please log in with your new password.' } });
      }, 1500);
    } catch (err) {
      setChangeError(extractErrorMessage(err, 'Failed to update password'));
    } finally {
      setChangeLoading(false);
    }
  };

  return (
    <>
      <header className="app-header">
        {/* Left: Mobile hamburger trigger + Mayur Mehta Brand Logo */}
        <div className="header-left">
          <button
            type="button"
            className="header-mobile-toggle"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
          >
            <Menu size={24} />
          </button>

          <div className="header-company-brand" onClick={() => navigate(ROUTES.DASHBOARD)} style={{ cursor: 'pointer' }}>
            {hasCustomLogo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src="/api/v1/company/logo"
                  alt={company?.name || 'Company Logo'}
                  style={{ maxHeight: '32px', maxWidth: '140px', objectFit: 'contain' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.04em' }}>
                  {company?.name}
                </span>
              </div>
            ) : (
              <MayurMehtaLogo size="sm" showTagline={true} />
            )}
          </div>
        </div>

        {/* Right: Quick-add, Mail, Chat, Bell, Avatar */}
        <div className="header-right">
          {/* Quick-add '+' button in Taupe */}
          <IconButton
            icon={Plus}
            variant="primary"
            title="Create new task / project"
            ariaLabel="Quick add"
            onClick={() => setQuickAddOpen(true)}
          />

          {/* Mail Icon */}
          <IconButton
            icon={Mail}
            badgeCount={headerBadges?.mailCount}
            title="Messages / Mail"
            ariaLabel="Mail messages"
            onClick={() => {}}
          />

          {/* Chat Icon with pill count */}
          <IconButton
            icon={MessageSquare}
            badgeCount={headerBadges?.chatCount}
            title="Team Chat"
            ariaLabel="Team chat"
            onClick={() => {}}
          />

          {/* Bell Notification Icon with pill count */}
          <IconButton
            icon={Bell}
            badgeCount={headerBadges?.notificationCount}
            title="Notifications"
            ariaLabel="Notifications"
            onClick={() => {}}
          />

          {/* User Avatar with Profile Dropdown */}
          <Dropdown
            align="right"
            trigger={
              <div className="header-avatar-trigger" title={`${user?.firstName || 'Mayur'} (${user?.role || 'Owner'})`}>
                <Avatar
                  src={user?.avatarUrl}
                  letter={userLetter}
                  size="md"
                  alt={user?.firstName || 'Mayur'}
                />
              </div>
            }
          >
            {/* Elegant User Profile Header */}
            <div className="header-user-menu-header">
              <Avatar
                src={user?.avatarUrl}
                letter={userLetter}
                size="md"
                alt={user?.firstName || 'Mayur'}
              />
              <div className="header-user-menu-details">
                <span className="user-name">{user?.firstName} {user?.lastName || ''}</span>
                <span className="user-email">{user?.email}</span>
                <span className="user-role-badge">{user?.role}</span>
              </div>
            </div>

            <div className="header-menu-divider" />

            <button
              type="button"
              className="dropdown-item"
              onClick={() => navigate(ROUTES.PROJECTS)}
            >
              <Building2 size={16} className="dropdown-item-icon" />
              <span>Projects</span>
            </button>

            <button
              type="button"
              className="dropdown-item"
              onClick={handleOpenProfile}
            >
              <User size={16} className="dropdown-item-icon" />
              <span>My Profile</span>
            </button>

            <button
              type="button"
              className="dropdown-item"
              onClick={() => navigate(ROUTES.SETTINGS)}
            >
              <Settings size={16} className="dropdown-item-icon" />
              <span>Settings</span>
            </button>

            {(user?.role === ROLES.OWNER || user?.role === ROLES.ADMIN) && (
              <button
                type="button"
                className="dropdown-item"
                onClick={() => navigate(ROUTES.BILLING)}
              >
                <CreditCard size={16} className="dropdown-item-icon" />
                <span>{MESSAGES.BILLING.TITLE}</span>
              </button>
            )}

            {user?.role === ROLES.SUPER_ADMIN && (
              <button
                type="button"
                className="dropdown-item"
                onClick={() => navigate(ROUTES.ADMIN)}
              >
                <Shield size={16} className="dropdown-item-icon" />
                <span>Super Admin Panel</span>
              </button>
            )}

            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                setChangeError('');
                setChangeSuccess('');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setChangePasswordOpen(true);
              }}
            >
              <KeyRound size={16} className="dropdown-item-icon" />
              <span>Change Password</span>
            </button>

            <div className="header-menu-divider" />

            <button
              type="button"
              className="dropdown-item dropdown-item-danger"
              onClick={handleLogout}
            >
              <LogOut size={16} className="dropdown-item-icon" />
              <span>{MESSAGES.AUTH.LOGOUT_BUTTON}</span>
            </button>
          </Dropdown>
        </div>
      </header>

      {/* Quick Add Slide-out Drawer */}
      <QuickAddDrawer
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSaveSuccess={() => {
          // notification or refresh
        }}
      />

      {/* Change Password Modal (Module M1.2 Section 4.1.9) */}
      <Modal
        isOpen={changePasswordOpen}
        onClose={() => {
          if (!user?.mustChangePassword) {
            setChangePasswordOpen(false);
          }
        }}
        title="Change Account Password"
      >
        <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {user?.mustChangePassword && (
            <div style={{ padding: '10px 14px', background: '#FEF3C7', color: '#92400E', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>Password change is required before continuing in your workspace.</span>
            </div>
          )}

          {changeSuccess && (
            <div style={{ padding: '10px 14px', background: '#D1FAE5', color: '#065F46', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{changeSuccess}</span>
            </div>
          )}

          {changeError && (
            <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#991B1B', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{changeError}</span>
            </div>
          )}

          <Input
            label="Current Password"
            type="password"
            id="current-password"
            placeholder="Enter your current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <div style={{ position: 'relative' }}>
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              id="new-password"
              placeholder="Minimum 8 characters (letters & numbers)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '12px', top: '35px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Input
            label="Confirm New Password"
            type="password"
            id="confirm-password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {!user?.mustChangePassword && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setChangePasswordOpen(false)}
                style={{ flex: 1 }}
                disabled={changeLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              style={{ flex: 1 }}
              disabled={changeLoading}
            >
              {changeLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: My Profile (Module M1.4 PATCH /team/me) */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="My Profile & Identity"
      >
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {profileError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          {profileSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#047857', fontSize: '13px' }}>
              <CheckCircle2 size={16} />
              <span>{profileSuccess}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <Avatar letter={userLetter} size="md" />
            <div>
              <p style={{ fontWeight: 600, fontSize: '14px', margin: 0, color: 'var(--color-text)' }}>
                {user?.email}
              </p>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(123, 111, 98, 0.1)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                {user?.role || 'MEMBER'}
              </span>
            </div>
          </div>

          <Input
            label="Full Name"
            id="profile-name"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            placeholder="Enter full name"
            required
          />

          <Input
            label="Designation / Architectural Title"
            id="profile-designation"
            value={profileForm.designation}
            onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
            placeholder="Enter designation or title"
          />

          <Input
            label="Mobile Number"
            id="profile-mobile"
            value={profileForm.mobile}
            onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
            placeholder="Enter phone number"
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setProfileModalOpen(false)}
              style={{ flex: 1 }}
              disabled={profileLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              style={{ flex: 1 }}
              disabled={profileLoading}
            >
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
