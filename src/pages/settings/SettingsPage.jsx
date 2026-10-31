import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button/Button';
import { Input } from '../../components/common/Input/Input';
import { Modal } from '../../components/common/Modal/Modal';
import { MayurMehtaLogo } from '../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import { companyService } from '../../services/companyService';
import { settingsService } from '../../services/settingsService';
import { masterService } from '../../services/masterService';
import { permissionService } from '../../services/permissionService';
import { teamService } from '../../services/teamService';
import { extractErrorMessage } from '../../utils/errorHandler';
import { useConfirm } from '../../context/ConfirmationContext';
import {
  Building2,
  Sliders,
  Layers,
  ShieldCheck,
  Upload,
  Trash2,
  Save,
  RotateCcw,
  Plus,
  AlertCircle,
  Lock,
  Unlock,
  Edit2,
  RefreshCw,
  Phone,
  MapPin,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import './SettingsPage.css';

const COLOR_PRESETS = [
  '#7B6F62', '#E8E3DB', '#B7AFA6', '#2E2E2E',
  '#2563EB', '#059669', '#D97706', '#DC2626',
  '#7C3AED', '#DB2777', '#475569', '#0D9488'
];

export function SettingsPage() {
  const confirm = useConfirm();
  const { company, user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const initialUserId = searchParams.get('user');
  const [activeTab, setActiveTab] = useState(initialTab === 'branding' ? 'profile' : initialTab);
  const [notice, setNotice] = useState({ text: '', type: 'success' });

  // =========================================================================
  // 1. COMPANY PROFILE & BRANDING STATE
  // =========================================================================
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    legalName: '',
    phone: '',
    gstNumber: '',
    timezone: 'Asia/Kolkata',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    }
  });
  const [supportAccessEnabled, setSupportAccessEnabled] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now());

  const showNotice = (text, type = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice({ text: '', type: 'success' }), 4500);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const data = await companyService.getProfile();
      if (data) {
        setProfile(data);
        setSupportAccessEnabled(!!data.supportAccessEnabled);
        setProfileForm({
          legalName: data.legalName || '',
          phone: data.phone || '',
          gstNumber: data.gstNumber || '',
          timezone: data.timezone || 'Asia/Kolkata',
          address: {
            line1: data.address?.line1 || '',
            line2: data.address?.line2 || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            pincode: data.address?.pincode || '',
            country: data.address?.country || 'India'
          }
        });
      }
    } catch (err) {
      console.warn('Company profile fetch notice:', err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();

    if (profileForm.phone?.trim()) {
      const cleanPhone = profileForm.phone.trim().replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        showNotice('Primary studio phone must be exactly 10 digits.', 'error');
        return;
      }
    }

    if (profileForm.address?.pincode?.trim()) {
      const cleanPin = profileForm.address.pincode.trim().replace(/\D/g, '');
      if (cleanPin.length !== 6) {
        showNotice('Pincode must be exactly 6 digits.', 'error');
        return;
      }
    }

    if (profileForm.gstNumber?.trim()) {
      const cleanGst = profileForm.gstNumber.trim().toUpperCase();
      if (cleanGst.length !== 15) {
        showNotice('GSTIN must be a 15-character alphanumeric identification number.', 'error');
        return;
      }
    }

    setProfileSaving(true);
    try {
      const cleanPhone = profileForm.phone?.trim() ? profileForm.phone.trim().replace(/\D/g, '') : '';
      const payload = {
        ...profileForm,
        legalName: profileForm.legalName?.trim() || undefined,
        phone: cleanPhone ? (cleanPhone.length === 10 ? `+91${cleanPhone}` : cleanPhone) : undefined,
        gstNumber: profileForm.gstNumber?.trim() ? profileForm.gstNumber.trim().toUpperCase() : undefined,
        address: {
          ...profileForm.address,
          line1: profileForm.address?.line1?.trim() || undefined,
          city: profileForm.address?.city?.trim() || undefined,
          state: profileForm.address?.state?.trim() || undefined,
          pincode: profileForm.address?.pincode ? profileForm.address.pincode.replace(/\D/g, '').slice(0, 6) : undefined,
          country: profileForm.address?.country?.trim() || undefined
        }
      };

      const res = await companyService.updateProfile(payload);
      showNotice('Studio profile updated successfully.');
      if (res) setProfile((prev) => ({ ...prev, ...res }));
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to update studio profile'), 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleToggleSupportAccess = async () => {
    setSupportLoading(true);
    try {
      const nextState = !supportAccessEnabled;
      await companyService.toggleSupportAccess(nextState);
      setSupportAccessEnabled(nextState);
      showNotice(nextState ? 'Technical support access enabled.' : 'Technical support access revoked.');
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to update support access'), 'error');
    } finally {
      setSupportLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showNotice('Please upload a valid image (PNG, JPEG, or WEBP).', 'error');
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      showNotice('Logo file size exceeds 1MB limit.', 'error');
      return;
    }

    setLogoUploading(true);
    try {
      await companyService.uploadLogo(file);
      setLogoTimestamp(Date.now());
      showNotice('Studio logo uploaded successfully.');
      fetchProfile();
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to upload logo'), 'error');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    const ok = await confirm({
      title: 'Remove Studio Logo?',
      message: 'Are you sure you want to remove the custom studio logo?',
      confirmText: 'Remove Logo',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await companyService.deleteLogo();
      setLogoTimestamp(Date.now());
      showNotice('Studio logo removed.');
      fetchProfile();
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to remove logo'), 'error');
    }
  };

  // =========================================================================
  // 2. COMPANY SETTINGS STATE (/api/v1/settings)
  // =========================================================================
  const [settingsGroups, setSettingsGroups] = useState([]);
  const [settingsValues, setSettingsValues] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const [dataRes, flatRes] = await Promise.allSettled([
        settingsService.getSettings(),
        settingsService.getFlatValues()
      ]);

      if (dataRes.status === 'fulfilled' && dataRes.value?.groups) {
        setSettingsGroups(dataRes.value.groups);
        const initialVals = {};
        dataRes.value.groups.forEach((g) => {
          (g.settings || []).forEach((s) => {
            initialVals[s.key] = s.value !== undefined ? s.value : s.default;
          });
        });
        if (flatRes.status === 'fulfilled' && flatRes.value) {
          const flatMap = flatRes.value.values || flatRes.value;
          if (typeof flatMap === 'object') {
            Object.assign(initialVals, flatMap);
          }
        }
        setSettingsValues(initialVals);
      }
    } catch (err) {
      console.warn('Company settings fetch notice:', err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSettingChange = (key, val) => {
    setSettingsValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await settingsService.updateSettings(settingsValues);
      showNotice('Studio preferences saved successfully.');
      fetchSettings();
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to save preferences'), 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  // =========================================================================
  // 3. MASTER CATEGORIES STATE (/api/v1/master/*)
  // =========================================================================
  const [masterTypes, setMasterTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [masterItems, setMasterItems] = useState([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ name: '', code: '', color: '#7B6F62' });
  const [itemSaving, setItemSaving] = useState(false);

  const fetchMasterTypes = async () => {
    try {
      const types = await masterService.getMasterTypes();
      setMasterTypes(types || []);
      if (types?.length > 0 && !selectedType) {
        setSelectedType(types[0]);
      }
    } catch (err) {
      console.warn('Master types fetch notice:', err.message);
    }
  };

  const fetchMasterItems = async (typeKey) => {
    if (!typeKey) return;
    setMasterLoading(true);
    try {
      const items = await masterService.getItemsByType(typeKey);
      setMasterItems(items || []);
    } catch (err) {
      console.warn('Master items fetch notice:', err.message);
    } finally {
      setMasterLoading(false);
    }
  };

  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemForm({ name: '', code: '', color: '#7B6F62' });
    setItemModalOpen(true);
  };

  const handleOpenEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name || '',
      code: item.code || '',
      color: item.color || '#7B6F62'
    });
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name?.trim()) {
      showNotice('Item name is required', 'error');
      return;
    }
    setItemSaving(true);
    try {
      if (editingItem) {
        await masterService.updateItem(selectedType.key, editingItem.id, itemForm);
        showNotice(`Updated "${itemForm.name}" successfully.`);
      } else {
        await masterService.createItem(selectedType.key, itemForm);
        showNotice(`Created "${itemForm.name}" successfully.`);
      }
      setItemModalOpen(false);
      fetchMasterItems(selectedType.key);
      fetchMasterTypes();
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to save item'), 'error');
    } finally {
      setItemSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    const ok = await confirm({
      title: 'Delete Item?',
      message: `Are you sure you want to delete "${item.name}"?`,
      confirmText: 'Delete Item',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await masterService.deleteItem(selectedType.key, item.id);
      showNotice(`Deleted "${item.name}".`);
      fetchMasterItems(selectedType.key);
      fetchMasterTypes();
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to delete item'), 'error');
    }
  };

  const handleToggleActiveItem = async (item) => {
    try {
      if (item.isActive) {
        await masterService.deactivateItem(selectedType.key, item.id);
        showNotice(`Deactivated "${item.name}".`);
      } else {
        await masterService.activateItem(selectedType.key, item.id);
        showNotice(`Activated "${item.name}".`);
      }
      fetchMasterItems(selectedType.key);
      fetchMasterTypes();
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to update item status'), 'error');
    }
  };

  const handleRestoreDefaults = async () => {
    const ok = await confirm({
      title: 'Restore Default Items?',
      message: `Restore default system items for ${selectedType.label}?`,
      confirmText: 'Restore Defaults',
      cancelText: 'Cancel',
      variant: 'primary'
    });
    if (!ok) return;

    try {
      await masterService.restoreDefaults(selectedType.key);
      showNotice(`Default items restored for ${selectedType.label}.`);
      fetchMasterItems(selectedType.key);
      fetchMasterTypes();
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to restore default items'), 'error');
    }
  };

  const handleReorderItem = async (index, direction) => {
    const newItems = [...masterItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setMasterItems(newItems);

    try {
      const orderedIds = newItems.map((item) => item.id);
      await masterService.reorderItems(selectedType.key, orderedIds);
      showNotice('Order updated.');
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to reorder items'), 'error');
      fetchMasterItems(selectedType.key);
    }
  };

  // =========================================================================
  // 4. PERMISSIONS ENGINE STATE (/api/v1/permissions/*)
  // =========================================================================
  const [myPermissions, setMyPermissions] = useState(null);
  const [permModules, setPermModules] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOverrides, setUserOverrides] = useState({});
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  const fetchPermissionsData = async () => {
    setPermLoading(true);
    try {
      const [modulesRes, usersRes, myPermsRes] = await Promise.allSettled([
        permissionService.getModules(),
        teamService.getUsers(),
        permissionService.getMyPermissions()
      ]);

      if (modulesRes.status === 'fulfilled') {
        setPermModules(modulesRes.value || []);
      }
      if (myPermsRes.status === 'fulfilled') {
        setMyPermissions(myPermsRes.value || null);
      }
      if (usersRes.status === 'fulfilled') {
        const uList = usersRes.value?.users || [];
        setTeamUsers(uList);
        if (uList.length > 0 && !selectedUser) {
          const match = initialUserId ? uList.find((u) => u.id === initialUserId || u._id === initialUserId) : null;
          setSelectedUser(match || uList[0]);
        }
      }
    } catch (err) {
      console.warn('Permissions data fetch notice:', err.message);
    } finally {
      setPermLoading(false);
    }
  };

  const fetchUserPermissions = async (userId) => {
    if (!userId) return;
    try {
      const data = await permissionService.getUserPermissions(userId);
      const overridesMap = {};
      (data?.overrides || []).forEach((ov) => {
        overridesMap[ov.moduleKey] = {
          actions: ov.actions || [],
          dataScope: ov.dataScope || 'ALL'
        };
      });
      setUserOverrides(overridesMap);
    } catch (err) {
      console.warn('User permissions fetch notice:', err.message);
    }
  };

  const handleActionToggle = (moduleKey, action) => {
    const current = userOverrides[moduleKey] || { actions: [], dataScope: 'ALL' };
    const hasAction = current.actions.includes(action);
    const nextActions = hasAction
      ? current.actions.filter((a) => a !== action)
      : [...current.actions, action];

    setUserOverrides((prev) => ({
      ...prev,
      [moduleKey]: {
        ...current,
        actions: nextActions
      }
    }));
  };

  const handleScopeChange = (moduleKey, scope) => {
    const current = userOverrides[moduleKey] || { actions: [], dataScope: 'ALL' };
    setUserOverrides((prev) => ({
      ...prev,
      [moduleKey]: {
        ...current,
        dataScope: scope
      }
    }));
  };

  const handleSaveOverrides = async () => {
    if (!selectedUser) return;
    setPermSaving(true);
    try {
      const overridesArray = Object.entries(userOverrides).map(([moduleKey, val]) => ({
        moduleKey,
        actions: val.actions,
        dataScope: val.dataScope
      }));
      await permissionService.setUserPermissions(selectedUser.id, overridesArray);
      showNotice(`Permissions updated for ${selectedUser.name}.`);
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to update permissions'), 'error');
    } finally {
      setPermSaving(false);
    }
  };

  const handleResetUserPerms = async () => {
    if (!selectedUser) return;
    const ok = await confirm({
      title: 'Reset Permissions?',
      message: `Reset custom permissions for ${selectedUser.name} to role defaults?`,
      confirmText: 'Reset Defaults',
      cancelText: 'Cancel',
      variant: 'warning'
    });
    if (!ok) return;

    setPermSaving(true);
    try {
      await permissionService.resetUserPermissions(selectedUser.id);
      showNotice(`Reset permissions for ${selectedUser.name} to role defaults.`);
      fetchUserPermissions(selectedUser.id);
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to reset permissions'), 'error');
    } finally {
      setPermSaving(false);
    }
  };

  // Sync tab with URL search parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam === 'branding' ? 'profile' : tabParam);
    }
  }, [searchParams]);

  // Tab data fetching
  useEffect(() => {
    if (activeTab === 'profile') fetchProfile();
    else if (activeTab === 'settings') fetchSettings();
    else if (activeTab === 'master') fetchMasterTypes();
    else if (activeTab === 'permissions') fetchPermissionsData();
  }, [activeTab]);

  useEffect(() => {
    if (selectedType) {
      fetchMasterItems(selectedType.key);
    }
  }, [selectedType]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserPermissions(selectedUser.id);
    }
  }, [selectedUser]);

  return (
    <div className="settings-page-container">
      {/* Top Header */}
      <div className="settings-page-header">
        <div>
          <h1 className="settings-page-title">Studio Settings</h1>
          <p className="settings-page-subtitle">
            Manage your firm's identity, workspace preferences, lookups, and access controls.
          </p>
        </div>
        {profile?.companyCode && (
          <div className="settings-header-badges">
            <span className="settings-badge-code">
              Workspace: <strong>{profile.companyCode}</strong>
            </span>
            <span className="settings-badge-plan">
              {profile.plan || 'PAID'}
            </span>
          </div>
        )}
      </div>

      {/* Notice Banner */}
      {notice.text && (
        <div className={`settings-notice-banner ${notice.type}`}>
          {notice.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Simplified Modern Tab Navigation (4 essential tabs) */}
      <div className="settings-tabs-wrapper">
        <div className="settings-tabs-nav">
          <button
            className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabChange('profile')}
          >
            <Building2 size={15} />
            <span>Studio Profile</span>
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabChange('settings')}
          >
            <Sliders size={15} />
            <span>Preferences</span>
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'master' ? 'active' : ''}`}
            onClick={() => handleTabChange('master')}
          >
            <Layers size={15} />
            <span>Master Categories</span>
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => handleTabChange('permissions')}
          >
            <ShieldCheck size={15} />
            <span>Permissions</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: STUDIO PROFILE (Streamlined, professional, un-cluttered)
          ===================================================================== */}
      {activeTab === 'profile' && (
        <div className="settings-tab-panel">
          <div className="settings-card">
            {/* Header: Studio Identity & Logo */}
            <div className="studio-identity-section">
              <div className="studio-logo-avatar">
                {profile?.branding?.hasLogo ? (
                  <img
                    src={`/api/v1/company/logo?t=${logoTimestamp}`}
                    alt={profile?.name || 'Studio Logo'}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <MayurMehtaLogo variant="symbol" size={40} color="taupe" />
                )}
              </div>

              <div className="studio-identity-meta">
                <div className="studio-identity-title-row">
                  <div>
                    <h3 className="studio-identity-name">{profile?.name || 'Architectural Studio'}</h3>
                    <p className="studio-identity-hint">Official brand logo for drawing title blocks, reports, and headers.</p>
                  </div>

                  <div className="studio-logo-actions">
                    <label className="settings-btn-upload">
                      <Upload size={14} />
                      <span>{logoUploading ? 'Uploading...' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        style={{ display: 'none' }}
                        disabled={logoUploading}
                        onChange={handleLogoUpload}
                      />
                    </label>

                    {profile?.branding?.hasLogo && (
                      <button
                        type="button"
                        className="settings-btn-remove"
                        onClick={handleDeleteLogo}
                        title="Remove custom logo"
                      >
                        <Trash2 size={14} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-divider" />

            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} className="studio-profile-form">
              <div className="settings-section-title">Studio Credentials & Tax Details</div>
              
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">Brand Name (Display)</label>
                  <input
                    type="text"
                    className="settings-input settings-input-readonly"
                    value={profile?.name || ''}
                    disabled
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Legal Entity Name</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="e.g. Mayur Mehta Architects LLP"
                    value={profileForm.legalName}
                    onChange={(e) => setProfileForm({ ...profileForm, legalName: e.target.value })}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Primary Studio Phone</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    className="settings-input"
                    placeholder="Enter 10-digit phone number"
                    value={profileForm.phone}
                    onKeyDown={(e) => {
                      const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'];
                      if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
                      if (!/^\d$/.test(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    maxLength={15}
                    className="settings-input"
                    placeholder="24AAAAA0000A1Z5"
                    value={profileForm.gstNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, gstNumber: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15) })}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Studio Timezone</label>
                  <select
                    className="settings-select"
                    value={profileForm.timezone}
                    onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/New_York">America/New York (EST/EDT)</option>
                    <option value="UTC">UTC (Universal Coordinated)</option>
                  </select>
                </div>
              </div>

              <div className="settings-divider" />

              {/* Address Form Section */}
              <div className="settings-section-title">
                <MapPin size={15} /> Registered Studio Address
              </div>

              <div className="settings-address-grid">
                <div className="settings-form-group span-full">
                  <label className="settings-form-label">Address Line</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="Studio street address, suite or building name"
                    value={profileForm.address.line1}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      address: { ...profileForm.address, line1: e.target.value }
                    })}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">City</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="City"
                    value={profileForm.address.city}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      address: { ...profileForm.address, city: e.target.value }
                    })}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">State</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="State"
                    value={profileForm.address.state}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      address: { ...profileForm.address, state: e.target.value }
                    })}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Pincode</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="settings-input"
                    placeholder="Enter 6-digit pincode"
                    value={profileForm.address.pincode}
                    onKeyDown={(e) => {
                      const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'];
                      if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
                      if (!/^\d$/.test(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      address: { ...profileForm.address, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }
                    })}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Country</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={profileForm.address.country}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      address: { ...profileForm.address, country: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="settings-divider" />

              {/* Footer Row: Support Access & Save Button */}
              <div className="settings-card-footer">
                <div className="settings-support-toggle">
                  <button
                    type="button"
                    className={`settings-toggle-btn ${supportAccessEnabled ? 'active' : ''}`}
                    onClick={handleToggleSupportAccess}
                    disabled={supportLoading}
                  >
                    {supportAccessEnabled ? <Unlock size={14} /> : <Lock size={14} />}
                    <span>Support Impersonation: {supportAccessEnabled ? 'Allowed' : 'Disabled'}</span>
                  </button>
                  <span className="settings-support-hint">Permit platform admin access for workspace diagnosis.</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={profileSaving}
                  loading={profileSaving}
                >
                  <Save size={16} />
                  Save Studio Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: WORKSPACE PREFERENCES (/api/v1/settings)
          ===================================================================== */}
      {activeTab === 'settings' && (
        <div className="settings-tab-panel">
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3 className="settings-card-title">
                  <Sliders size={18} color="var(--color-primary)" />
                  Workspace Preferences
                </h3>
                <p className="settings-card-desc">
                  Set default conventions for project identifiers, date formats, and workflow notifications.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleSaveSettings}
                disabled={settingsSaving || settingsLoading}
                loading={settingsSaving}
              >
                <Save size={16} />
                Save Preferences
              </Button>
            </div>

            {settingsLoading ? (
              <div className="settings-loading-state">
                <RefreshCw size={22} className="spin" />
                <span>Loading preferences...</span>
              </div>
            ) : settingsGroups.length === 0 ? (
              <div className="settings-empty-state">
                No configurable settings groups returned by backend.
              </div>
            ) : (
              <div className="settings-groups-container">
                {settingsGroups.map((group) => (
                  <div key={group.key} className="settings-group-block">
                    <div className="settings-group-heading">
                      {group.label}
                    </div>

                    <div className="settings-form-grid">
                      {(group.settings || []).map((setting) => (
                        <div key={setting.key} className="settings-form-group">
                          <label className="settings-form-label">{setting.label}</label>

                          {setting.type === 'enum' && setting.options ? (
                            <select
                              className="settings-select"
                              value={settingsValues[setting.key] ?? setting.default ?? ''}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                            >
                              {setting.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : setting.type === 'boolean' ? (
                            <div className="settings-checkbox-row">
                              <input
                                type="checkbox"
                                id={`setting-${setting.key}`}
                                checked={!!settingsValues[setting.key]}
                                onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                              />
                              <label htmlFor={`setting-${setting.key}`}>
                                Enable setting
                              </label>
                            </div>
                          ) : (
                            <input
                              type={setting.type === 'number' ? 'number' : 'text'}
                              className="settings-input"
                              value={settingsValues[setting.key] ?? setting.default ?? ''}
                              onChange={(e) => handleSettingChange(setting.key, setting.type === 'number' ? Number(e.target.value) : e.target.value)}
                            />
                          )}

                          {setting.description && (
                            <span className="settings-form-hint">{setting.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: MASTER CATEGORIES (/api/v1/master/*)
          ===================================================================== */}
      {activeTab === 'master' && (
        <div className="settings-tab-panel">
          <div className="master-categories-layout">
            {/* Sidebar of Master Types */}
            <div className="master-types-sidebar">
              <div className="master-types-sidebar-header">
                Lookups ({masterTypes.length})
              </div>
              {masterTypes.map((type) => (
                <button
                  key={type.key}
                  className={`master-type-nav-item ${selectedType?.key === type.key ? 'active' : ''}`}
                  onClick={() => setSelectedType(type)}
                >
                  <span className="master-type-label">{type.label}</span>
                  <span className="master-type-badge">
                    {type.activeCount ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Main Items Listing */}
            <div className="settings-card flex-1">
              {selectedType ? (
                <>
                  <div className="settings-card-header">
                    <div>
                      <h3 className="settings-card-title">
                        <Layers size={18} color="var(--color-primary)" />
                        {selectedType.label}
                      </h3>
                      <p className="settings-card-desc">
                        Manage available project options and tags.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRestoreDefaults}
                        title="Restore system default entries"
                      >
                        <RotateCcw size={14} />
                        Restore Defaults
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleOpenCreateItem}
                      >
                        <Plus size={14} />
                        Add Item
                      </Button>
                    </div>
                  </div>

                  {masterLoading ? (
                    <div className="settings-loading-state">
                      <RefreshCw size={22} className="spin" />
                      <span>Loading items...</span>
                    </div>
                  ) : masterItems.length === 0 ? (
                    <div className="settings-empty-state">
                      <p>No items found for this category.</p>
                      <Button variant="outline" size="sm" onClick={handleRestoreDefaults} style={{ marginTop: '8px' }}>
                        Load Defaults
                      </Button>
                    </div>
                  ) : (
                    <div className="settings-table-wrapper">
                      <table className="settings-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>Color</th>
                            {selectedType.allowCode && <th style={{ width: '90px' }}>Code</th>}
                            <th>Item Name</th>
                            <th style={{ width: '80px' }}>Origin</th>
                            <th style={{ width: '85px' }}>Status</th>
                            <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {masterItems.map((item, index) => (
                            <tr key={item.id}>
                              <td>
                                {selectedType.allowColor ? (
                                  <span
                                    className="master-color-dot"
                                    style={{ backgroundColor: item.color || '#7B6F62' }}
                                  />
                                ) : (
                                  <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                )}
                              </td>
                              {selectedType.allowCode && (
                                <td>
                                  <span className="master-code-tag">
                                    {item.code || '—'}
                                  </span>
                                </td>
                              )}
                              <td>
                                <span className="master-item-name">{item.name}</span>
                              </td>
                              <td>
                                {item.isDefault ? (
                                  <span className="badge-system">System</span>
                                ) : (
                                  <span className="badge-custom">Custom</span>
                                )}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleToggleActiveItem(item)}
                                  className={`btn-status-pill ${item.isActive ? 'active' : 'inactive'}`}
                                >
                                  {item.isActive ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div className="master-item-actions">
                                  <button
                                    type="button"
                                    onClick={() => handleReorderItem(index, 'up')}
                                    disabled={index === 0}
                                    title="Move Up"
                                    className="btn-icon-action"
                                  >
                                    <ChevronUp size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReorderItem(index, 'down')}
                                    disabled={index === masterItems.length - 1}
                                    title="Move Down"
                                    className="btn-icon-action"
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditItem(item)}
                                    title="Edit item"
                                    className="btn-icon-action"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item)}
                                    title="Delete item"
                                    className="btn-icon-action btn-danger"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <div className="settings-empty-state">
                  Select a category from the left sidebar.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Master Item */}
      {itemModalOpen && (
        <Modal
          isOpen={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          title={editingItem ? `Edit ${selectedType?.label}` : `Add to ${selectedType?.label}`}
        >
          <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Item Name *"
              id="master-item-name"
              placeholder="e.g. Commercial Studio"
              value={itemForm.name}
              required
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            />

            {selectedType?.allowCode && (
              <Input
                label="Identifier Code (Optional)"
                id="master-item-code"
                placeholder="e.g. COMM"
                value={itemForm.code}
                onChange={(e) => setItemForm({ ...itemForm, code: e.target.value.toUpperCase() })}
              />
            )}

            {selectedType?.allowColor && (
              <div className="settings-form-group">
                <label className="settings-form-label">Color Accent</label>
                <div className="color-picker-row">
                  {COLOR_PRESETS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      className={`color-swatch-btn ${itemForm.color === col ? 'selected' : ''}`}
                      style={{ backgroundColor: col }}
                      onClick={() => setItemForm({ ...itemForm, color: col })}
                    />
                  ))}
                  <input
                    type="color"
                    value={itemForm.color}
                    onChange={(e) => setItemForm({ ...itemForm, color: e.target.value })}
                    style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                </div>
              </div>
            )}

            <div className="form-actions-row">
              <Button type="button" variant="secondary" onClick={() => setItemModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={itemSaving} disabled={itemSaving}>
                <Save size={15} />
                Save Item
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================================
          TAB 4: PERMISSIONS (/api/v1/permissions/*)
          ===================================================================== */}
      {activeTab === 'permissions' && (
        <div className="settings-tab-panel">
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3 className="settings-card-title">
                  <ShieldCheck size={18} color="var(--color-primary)" />
                  Role Capabilities & User Overrides
                </h3>
                <p className="settings-card-desc">
                  Granular permission control (view, edit, delete, export) and data scopes per module.
                </p>
              </div>

              {selectedUser && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetUserPerms}
                    disabled={permSaving}
                  >
                    <RotateCcw size={14} />
                    Reset to Role Defaults
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveOverrides}
                    disabled={permSaving}
                    loading={permSaving}
                  >
                    <Save size={14} />
                    Save Overrides
                  </Button>
                </div>
              )}
            </div>

            {/* Caller Role Strip */}
            {myPermissions && (
              <div className="settings-role-strip">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UserCheck size={17} color="var(--color-primary)" />
                  <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                    Your Role: <strong>{myPermissions.role || 'OWNER'}</strong>
                  </span>
                </div>
                <span className="badge-system">
                  {myPermissions.isOwner ? 'Full Studio Owner Privileges' : 'Role Scoped Access'}
                </span>
              </div>
            )}

            {/* User Selector Dropdown */}
            <div className="settings-user-select-bar">
              <span className="settings-form-label" style={{ margin: 0 }}>Select Team Member:</span>
              <select
                className="settings-select"
                style={{ maxWidth: '340px' }}
                value={selectedUser?.id || ''}
                onChange={(e) => {
                  const u = teamUsers.find((x) => x.id === e.target.value);
                  setSelectedUser(u);
                }}
              >
                {teamUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) — {u.email}
                  </option>
                ))}
              </select>
              {selectedUser && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Active Role: <strong>{selectedUser.role}</strong>
                </span>
              )}
            </div>

            {/* Module Matrix Table */}
            {permLoading ? (
              <div className="settings-loading-state">
                <RefreshCw size={22} className="spin" />
                <span>Loading permissions...</span>
              </div>
            ) : permModules.length === 0 ? (
              <div className="settings-empty-state">
                No permission modules registered on backend.
              </div>
            ) : (
              <div className="settings-table-wrapper">
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th style={{ width: '220px' }}>Module</th>
                      <th>Allowed Action Privileges</th>
                      <th style={{ width: '160px' }}>Data Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permModules.map((mod) => {
                      const userOverride = userOverrides[mod.key] || { actions: [], dataScope: 'ALL' };

                      return (
                        <tr key={mod.key}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{mod.label}</span>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                {mod.group}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="action-checkbox-group">
                              {(mod.actions || []).map((act) => {
                                const isChecked = userOverride.actions.includes(act);
                                return (
                                  <label key={act} className="action-checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleActionToggle(mod.key, act)}
                                    />
                                    <span>{act}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                          <td>
                            {mod.supportsScope ? (
                              <select
                                className="settings-select"
                                style={{ height: '34px', padding: '0 10px', fontSize: '12px' }}
                                value={userOverride.dataScope || 'ALL'}
                                onChange={(e) => handleScopeChange(mod.key, e.target.value)}
                              >
                                <option value="ALL">ALL (Company Wide)</option>
                                <option value="OWN">OWN (Assigned Only)</option>
                              </select>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Company Wide</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;