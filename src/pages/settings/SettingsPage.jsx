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
import {
  Building2,
  Sliders,
  Layers,
  ShieldCheck,
  Palette,
  Upload,
  Trash2,
  Save,
  RotateCcw,
  Plus,
  Check,
  AlertCircle,
  ExternalLink,
  Lock,
  Unlock,
  Edit2,
  Eye,
  RefreshCw,
  Phone,
  MapPin,
  Clock,
  Sparkles,
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
  const { company, user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const initialUserId = searchParams.get('user');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [notice, setNotice] = useState({ text: '', type: 'success' });

  // =========================================================================
  // 1. COMPANY PROFILE & BRANDING STATE (Module M1.5)
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
    setTimeout(() => setNotice({ text: '', type: 'success' }), 5000);
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
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await companyService.updateProfile(profileForm);
      showNotice('Company profile updated successfully.');
      if (res) setProfile((prev) => ({ ...prev, ...res }));
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to update company profile'), 'error');
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
      showNotice(nextState ? 'Support impersonation access enabled.' : 'Support impersonation access revoked.');
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to update support access'), 'error');
    } finally {
      setSupportLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotice('Please upload a valid image file (PNG, JPG, SVG).', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotice('Logo file size must be less than 2MB.', 'error');
      return;
    }

    setLogoUploading(true);
    try {
      await companyService.uploadLogo(file);
      setLogoTimestamp(Date.now());
      showNotice('Company logo uploaded successfully.');
      fetchProfile();
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to upload logo'), 'error');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm('Are you sure you want to remove the custom company logo?')) return;
    try {
      await companyService.deleteLogo();
      setLogoTimestamp(Date.now());
      showNotice('Company logo removed.');
      fetchProfile();
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to remove logo'), 'error');
    }
  };

  // =========================================================================
  // 2. COMPANY SETTINGS STATE (Module M1.5: /api/v1/settings)
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
      showNotice('Company settings saved successfully.');
      fetchSettings();
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to save settings'), 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  // =========================================================================
  // 3. MASTER CATEGORIES STATE (Module M1.5: /api/v1/master/*)
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
      showNotice(extractErrorMessage(err, 'Failed to save master item'), 'error');
    } finally {
      setItemSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      await masterService.deleteItem(selectedType.key, item.id);
      showNotice(`Deleted "${item.name}".`);
      fetchMasterItems(selectedType.key);
      fetchMasterTypes();
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to delete master item'), 'error');
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
      showNotice(extractErrorMessage(err, 'Failed to change item status'), 'error');
    }
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm(`Restore default system items for ${selectedType.label}? Any missing defaults will be restored.`)) return;
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
      showNotice('Category order updated.');
    } catch (err) {
      showNotice(extractErrorMessage(err, 'Failed to reorder items'), 'error');
      fetchMasterItems(selectedType.key);
    }
  };

  // =========================================================================
  // 4. PERMISSIONS ENGINE STATE (Module M1.5: /api/v1/permissions/*)
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
    if (!window.confirm(`Reset custom permissions for ${selectedUser.name} back to role defaults?`)) return;
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
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Initial tab loading
  useEffect(() => {
    if (activeTab === 'profile' || activeTab === 'branding') fetchProfile();
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
          <h1 className="settings-page-title">Company Settings & Workspace Hub</h1>
          <p className="settings-page-subtitle">
            Configure company branding, system lookups, architectural category defaults, and user permissions.
          </p>
        </div>
        {profile?.companyCode && (
          <div className="settings-header-badges">
            <span className="settings-badge-code">
              Code: {profile.companyCode}
            </span>
            <span className="settings-badge-plan">
              Plan: {profile.plan || 'FREE'}
            </span>
          </div>
        )}
      </div>

      {/* Notice Banner */}
      {notice.text && (
        <div className={`settings-notice-banner ${notice.type}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notice.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{notice.text}</span>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="settings-tabs-wrapper">
        <div className="settings-tabs-nav">
          <button
            className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabChange('profile')}
          >
            <Building2 size={16} />
            Company Profile & Logo
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabChange('settings')}
          >
            <Sliders size={16} />
            Company Settings
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'master' ? 'active' : ''}`}
            onClick={() => handleTabChange('master')}
          >
            <Layers size={16} />
            Master Categories
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => handleTabChange('permissions')}
          >
            <ShieldCheck size={16} />
            Permissions Engine
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'branding' ? 'active' : ''}`}
            onClick={() => handleTabChange('branding')}
          >
            <Palette size={16} />
            Brand Guidelines (Sheet B)
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: COMPANY PROFILE & LOGO (Module M1.5)
          ===================================================================== */}
      {activeTab === 'profile' && (
        <div className="settings-tab-panel">
          {/* Logo & Branding Management */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3 className="settings-card-title">
                  <Palette size={18} color="var(--color-primary)" />
                  Company Logo & Workspace Identity
                </h3>
                <p className="settings-card-desc">
                  Upload your firm's authentic vector or high-resolution logo for headers, blueprints, and reports.
                </p>
              </div>
            </div>

            <div className="settings-logo-container">
              <div className="settings-logo-preview">
                {profile?.branding?.hasLogo ? (
                  <img
                    src={`/api/v1/company/logo?t=${logoTimestamp}`}
                    alt={profile?.name || 'Company Logo'}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <MayurMehtaLogo variant="symbol" size="md" color="taupe" />
                )}
              </div>

              <div className="settings-logo-actions">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 14px', fontSize: '13px', borderRadius: '6px' }}>
                    <Upload size={15} />
                    {logoUploading ? 'Uploading...' : 'Upload New Logo'}
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml"
                      style={{ display: 'none' }}
                      disabled={logoUploading}
                      onChange={handleLogoUpload}
                    />
                  </label>

                  {profile?.branding?.hasLogo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteLogo}
                      style={{ color: '#dc2626' }}
                    >
                      <Trash2 size={15} />
                      Remove Custom Logo
                    </Button>
                  )}
                </div>
                <span className="settings-form-hint">
                  Supports PNG, SVG, or JPG under 2MB. Default architectural monogram will be used if no logo is provided.
                </span>
              </div>
            </div>
          </div>

          {/* Profile Details Form */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3 className="settings-card-title">
                  <Building2 size={18} color="var(--color-primary)" />
                  Company Legal & Contact Details
                </h3>
                <p className="settings-card-desc">
                  Update primary firm credentials, tax registration, and billing address.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleSaveProfile}
                disabled={profileSaving}
                loading={profileSaving}
              >
                <Save size={16} />
                Save Profile
              </Button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">Brand Name (Display)</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={profile?.name || ''}
                    disabled
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.04)', color: 'var(--color-text-muted)' }}
                  />
                  <span className="settings-form-hint">Managed via platform administrator</span>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Legal Entity Name</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="Enter legal entity name"
                    value={profileForm.legalName}
                    onChange={(e) => setProfileForm({ ...profileForm, legalName: e.target.value })}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Primary Studio Phone</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="Enter phone number"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="Enter GSTIN or Tax ID"
                    value={profileForm.gstNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, gstNumber: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Timezone</label>
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

              {/* Address Form Section */}
              <div style={{ paddingTop: 'var(--spacing-3)', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                <span className="settings-form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} /> Registered Studio Address
                </span>
                <div className="settings-form-grid">
                  <div className="settings-form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="settings-form-label">Address Line 1</label>
                    <input
                      type="text"
                      className="settings-input"
                      placeholder="Enter address line 1"
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
                      placeholder="Enter city"
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
                      placeholder="Enter state"
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
                      className="settings-input"
                      placeholder="Enter pincode"
                      value={profileForm.address.pincode}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        address: { ...profileForm.address, pincode: e.target.value }
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
              </div>
            </form>
          </div>

          {/* Support Impersonation Access Toggle */}
          <div className="settings-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-4)' }}>
              <div>
                <h3 className="settings-card-title" style={{ fontSize: 'var(--font-size-sm)' }}>
                  <ShieldCheck size={18} color="var(--color-primary)" />
                  Technical Support Impersonation Access
                </h3>
                <p className="settings-card-desc">
                  Grant permission to platform support administrators to securely impersonate this company for diagnosing workspace issues. All access is logged to your immutable audit log.
                </p>
              </div>
              <Button
                variant={supportAccessEnabled ? 'primary' : 'outline'}
                onClick={handleToggleSupportAccess}
                disabled={supportLoading}
                loading={supportLoading}
              >
                {supportAccessEnabled ? (
                  <>
                    <Unlock size={16} /> Access Allowed (Revoke)
                  </>
                ) : (
                  <>
                    <Lock size={16} /> Allow Support Access
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: COMPANY SETTINGS (Module M1.5: /api/v1/settings)
          ===================================================================== */}
      {activeTab === 'settings' && (
        <div className="settings-tab-panel">
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3 className="settings-card-title">
                  <Sliders size={18} color="var(--color-primary)" />
                  Company Preferences & System Descriptors
                </h3>
                <p className="settings-card-desc">
                  Workspace-wide configuration for date formatting, currencies, project code conventions, and notification rules.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleSaveSettings}
                disabled={settingsSaving || settingsLoading}
                loading={settingsSaving}
              >
                <Save size={16} />
                Save Settings
              </Button>
            </div>

            {settingsLoading ? (
              <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                <span>Loading system settings descriptors...</span>
              </div>
            ) : settingsGroups.length === 0 ? (
              <div style={{ padding: 'var(--spacing-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No configurable settings groups returned by backend.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                {settingsGroups.map((group) => (
                  <div key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                    <div style={{ paddingBottom: '6px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {group.label}
                      </span>
                    </div>

                    <div className="settings-form-grid">
                      {(group.settings || []).map((setting) => (
                        <div key={setting.key} className="settings-form-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="settings-form-label">{setting.label}</label>
                            {setting.isDefault && (
                              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: '4px' }}>
                                Default
                              </span>
                            )}
                          </div>

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                              <input
                                type="checkbox"
                                id={`setting-${setting.key}`}
                                checked={!!settingsValues[setting.key]}
                                onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                              <label htmlFor={`setting-${setting.key}`} style={{ fontSize: '13px', cursor: 'pointer' }}>
                                Enabled
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
          TAB 3: MASTER CATEGORIES (Module M1.5: /api/v1/master/*)
          ===================================================================== */}
      {activeTab === 'master' && (
        <div className="settings-tab-panel">
          <div className="master-categories-layout">
            {/* Sidebar of 10 Master Types */}
            <div className="master-types-sidebar">
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px' }}>
                Master Lookups ({masterTypes.length})
              </span>
              {masterTypes.map((type) => (
                <button
                  key={type.key}
                  className={`master-type-nav-item ${selectedType?.key === type.key ? 'active' : ''}`}
                  onClick={() => setSelectedType(type)}
                >
                  <span>{type.label}</span>
                  <span className="master-type-badge">
                    {type.activeCount ?? 0}/{type.totalCount ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Main Items Listing for Selected Type */}
            <div className="settings-card" style={{ flex: 1 }}>
              {selectedType ? (
                <>
                  <div className="settings-card-header">
                    <div>
                      <h3 className="settings-card-title">
                        <Layers size={18} color="var(--color-primary)" />
                        {selectedType.label} Items
                      </h3>
                      <p className="settings-card-desc">
                        Manage active and custom options for architectural project tags, space allocations, and status workflows.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRestoreDefaults}
                        title="Restore system default entries"
                      >
                        <RotateCcw size={15} />
                        Restore Defaults
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleOpenCreateItem}
                      >
                        <Plus size={15} />
                        Add Item
                      </Button>
                    </div>
                  </div>

                  {masterLoading ? (
                    <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                      <span>Loading master items...</span>
                    </div>
                  ) : masterItems.length === 0 ? (
                    <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      <p>No items found for this category.</p>
                      <Button variant="outline" size="sm" onClick={handleRestoreDefaults} style={{ marginTop: '8px' }}>
                        Load Default Categories
                      </Button>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="permissions-matrix-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>Color</th>
                            {selectedType.allowCode && <th style={{ width: '80px' }}>Code</th>}
                            <th>Item Name</th>
                            <th style={{ width: '90px' }}>Type</th>
                            <th style={{ width: '90px' }}>Status</th>
                            <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {masterItems.map((item, index) => (
                            <tr key={item.id}>
                              <td>
                                {selectedType.allowColor ? (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      backgroundColor: item.color || '#7B6F62',
                                      border: '1px solid rgba(0,0,0,0.15)'
                                    }}
                                  />
                                ) : (
                                  <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                )}
                              </td>
                              {selectedType.allowCode && (
                                <td>
                                  <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, padding: '2px 6px', background: 'var(--color-surface)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                    {item.code || '—'}
                                  </span>
                                </td>
                              )}
                              <td>
                                <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{item.name}</span>
                              </td>
                              <td>
                                {item.isDefault ? (
                                  <span style={{ fontSize: '10px', color: 'var(--color-primary)', background: 'rgba(123, 111, 98, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    System
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: '4px' }}>
                                    Custom
                                  </span>
                                )}
                              </td>
                              <td>
                                <button
                                  onClick={() => handleToggleActiveItem(item)}
                                  style={{
                                    border: 'none',
                                    background: item.isActive ? '#ecfdf5' : '#f3f4f6',
                                    color: item.isActive ? '#065f46' : '#6b7280',
                                    padding: '3px 8px',
                                    borderRadius: '999px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {item.isActive ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                                  <button
                                    onClick={() => handleReorderItem(index, 'up')}
                                    disabled={index === 0}
                                    title="Move Up"
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                                      padding: '3px',
                                      color: index === 0 ? 'var(--color-border)' : 'var(--color-text-muted)'
                                    }}
                                  >
                                    <ChevronUp size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleReorderItem(index, 'down')}
                                    disabled={index === masterItems.length - 1}
                                    title="Move Down"
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: index === masterItems.length - 1 ? 'not-allowed' : 'pointer',
                                      padding: '3px',
                                      color: index === masterItems.length - 1 ? 'var(--color-border)' : 'var(--color-text-muted)'
                                    }}
                                  >
                                    <ChevronDown size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditItem(item)}
                                    title="Edit item"
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '3px', color: 'var(--color-text-muted)' }}
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item)}
                                    title="Delete item"
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '3px', color: '#dc2626' }}
                                  >
                                    <Trash2 size={15} />
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
                <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Select a category lookup type from the left sidebar.
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
          title={editingItem ? `Edit Item in ${selectedType?.label}` : `Add Item to ${selectedType?.label}`}
        >
          <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div className="settings-form-group">
              <label className="settings-form-label">Item Name *</label>
              <input
                type="text"
                className="settings-input"
                placeholder="Enter item name"
                value={itemForm.name}
                required
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              />
            </div>

            {selectedType?.allowCode && (
              <div className="settings-form-group">
                <label className="settings-form-label">Identifier Code</label>
                <input
                  type="text"
                  className="settings-input"
                  placeholder="Enter identifier code"
                  value={itemForm.code}
                  onChange={(e) => setItemForm({ ...itemForm, code: e.target.value.toUpperCase() })}
                />
              </div>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'var(--spacing-4)' }}>
              <Button type="button" variant="ghost" onClick={() => setItemModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={itemSaving} disabled={itemSaving}>
                <Save size={16} />
                Save Item
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================================
          TAB 4: PERMISSIONS ENGINE (Module M1.5: /api/v1/permissions/*)
          ===================================================================== */}
      {activeTab === 'permissions' && (
        <div className="settings-tab-panel">
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3 className="settings-card-title">
                  <ShieldCheck size={18} color="var(--color-primary)" />
                  Role Capabilities & User Permission Overrides
                </h3>
                <p className="settings-card-desc">
                  Granular action access control (view, edit, delete, export) and data scopes (own vs all) per module.
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
                    <RotateCcw size={15} />
                    Reset to Defaults
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveOverrides}
                    disabled={permSaving}
                    loading={permSaving}
                  >
                    <Save size={16} />
                    Save Overrides
                  </Button>
                </div>
              )}
            </div>

            {/* Caller Effective Permissions Strip (M1.5 GET /permissions/me) */}
            {myPermissions && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                marginBottom: '16px',
                background: 'rgba(123, 111, 98, 0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(123, 111, 98, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UserCheck size={18} color="var(--color-primary)" />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                      Your Active Role: <strong style={{ color: 'var(--color-primary)' }}>{myPermissions.role || 'OWNER'}</strong>
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '12px' }}>
                      {myPermissions.isOwner ? 'Full Studio Owner Capabilities' : 'Role Scoped Access'}
                    </span>
                  </div>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)'
                }}>
                  Active Capabilities (GET /permissions/me)
                </span>
              </div>
            )}

            {/* User Selector Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Select Team Member:</span>
              <select
                className="settings-select"
                style={{ maxWidth: '320px' }}
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
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  Active Role: <strong>{selectedUser.role}</strong>
                </span>
              )}
            </div>

            {/* Matrix of Modules */}
            {permLoading ? (
              <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                <span>Loading permission module descriptors...</span>
              </div>
            ) : permModules.length === 0 ? (
              <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No permission modules registered on backend.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="permissions-matrix-table">
                  <thead>
                    <tr>
                      <th style={{ width: '220px' }}>Module & Group</th>
                      <th>Allowed Action Privileges</th>
                      <th style={{ width: '140px' }}>Data Scope</th>
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
                                {mod.group} • {mod.key}
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
                                      style={{ cursor: 'pointer' }}
                                    />
                                    <span style={{ textTransform: 'capitalize' }}>{act}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                          <td>
                            {mod.supportsScope ? (
                              <select
                                className="settings-select"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                value={userOverride.dataScope || 'ALL'}
                                onChange={(e) => handleScopeChange(mod.key, e.target.value)}
                              >
                                <option value="ALL">ALL (Company Wide)</option>
                                <option value="OWN">OWN (Assigned Only)</option>
                              </select>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Global (All)</span>
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

      {/* =====================================================================
          TAB 5: BRAND GUIDELINES & VECTOR MARKS (Sheet B)
          ===================================================================== */}
      {activeTab === 'branding' && (
        <div className="settings-tab-panel">
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3 className="settings-card-title">
                  <ShieldCheck size={18} color="var(--color-primary)" />
                  Brand Guidelines & Logo Variations (Sheet B)
                </h3>
                <p className="settings-card-desc">
                  Source of truth for colors, typography (Segoe UI + Chevron Λ), and authentic vector marks
                </p>
              </div>
            </div>

            {/* 4 Logo Variations Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--spacing-4)' }}>
              <div style={{ padding: 'var(--spacing-4)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  01. Primary Logo (Taupe)
                </span>
                <div style={{ padding: 'var(--spacing-2) 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MayurMehtaLogo variant="primary" size="md" color="taupe" showTagline={true} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>9 circles + divider + chevron Λ + signature</span>
              </div>

              <div style={{ padding: 'var(--spacing-4)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  02. Horizontal (No Tagline)
                </span>
                <div style={{ padding: 'var(--spacing-2) 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MayurMehtaLogo variant="horizontal" size="md" color="taupe" showTagline={false} />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Standard architectural title</span>
              </div>

              <div style={{ padding: 'var(--spacing-4)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  03. Symbol Only (3x3 Grid)
                </span>
                <div style={{ padding: 'var(--spacing-2) 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MayurMehtaLogo variant="symbol" size="lg" color="taupe" />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>9 touching circles (no gap)</span>
              </div>

              <div style={{ padding: 'var(--spacing-4)', backgroundColor: '#2E2E2E', borderRadius: 'var(--radius-md)', border: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#E8E3DB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  04. Monochrome & Reverse (White)
                </span>
                <div style={{ padding: 'var(--spacing-2) 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MayurMehtaLogo variant="primary" size="md" color="white" showTagline={true} />
                </div>
                <span style={{ fontSize: '11px', color: '#B7AFA6' }}>High contrast for dark prints</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
