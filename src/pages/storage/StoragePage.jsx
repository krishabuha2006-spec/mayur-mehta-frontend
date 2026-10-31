import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  File,
  HardDrive,
  Folder,
  FolderOpen,
  CheckCircle2,
  Download,
  Eye,
  Trash2,
  Share2,
  Search,
  FileText,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Shield,
  Clock,
  Check
} from 'lucide-react';
import { billingService } from '../../services/billingService';
import { storageService } from '../../services/storageService';
import { projectService } from '../../services/projectService';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';
import { useConfirm } from '../../context/ConfirmationContext';
import './StoragePage.css';

export function StoragePage() {
  const confirm = useConfirm();
  const [activeTier, setActiveTier] = useState('project'); // 'studio' | 'project' | 'personal'
  const [projectFolder, setProjectFolder] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // New file upload form
  const [newFile, setNewFile] = useState({
    name: '',
    project: '',
    category: 'Drawings',
    revision: 'R0',
    tier: 'project',
    sizeMb: 5.0
  });

  // Fetch live storage subscription from Backend (GET /billing), projects, and persistent files
  useEffect(() => {
    const fetchStorage = async () => {
      setLoading(true);
      try {
        const [sub, persistentFiles, projs] = await Promise.allSettled([
          billingService.getSubscription(),
          storageService.getFiles(),
          projectService.getProjects({ limit: 50 })
        ]);

        if (persistentFiles.status === 'fulfilled' && Array.isArray(persistentFiles.value)) {
          setFiles(persistentFiles.value);
        }

        if (projs.status === 'fulfilled') {
          const list = Array.isArray(projs.value) ? projs.value : (projs.value?.data || []);
          const names = list.map((p) => p.name || p.title).filter(Boolean);
          setProjectsList(names);
        }

        const subData = sub.status === 'fulfilled' ? sub.value : null;
        if (subData && subData.storage) {
          setStorageData(subData.storage);
        } else if (subData) {
          const limitGB = subData.storageQuotaGB || (subData.plan === 'PAID' ? 100 : 5);
          const usedGB = subData.storageUsedGB || 0;
          setStorageData({
            usedBytes: Math.round(usedGB * 1024 * 1024 * 1024),
            limitBytes: Math.round(limitGB * 1024 * 1024 * 1024)
          });
        } else {
          setStorageData({
            usedBytes: 0,
            limitBytes: 5 * 1024 * 1024 * 1024
          });
        }
      } catch (err) {
        console.warn('Backend storage subscription notice:', err);
        setStorageData({
          usedBytes: 0,
          limitBytes: 5 * 1024 * 1024 * 1024
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStorage();
  }, []);

  const calculatedBytes = files.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
  const totalBytesUsed = (storageData?.usedBytes && storageData.usedBytes > 0) ? storageData.usedBytes : calculatedBytes;
  const totalBytesLimit = storageData?.limitBytes || (5 * 1024 * 1024 * 1024);
  const usagePercent = Math.min(Math.round((totalBytesUsed / totalBytesLimit) * 100), 100);
  const isNearLimit = usagePercent >= 85;

  // Filter files by active tier, project folder, and search query
  const filteredFiles = files.filter((f) => {
    const matchesTier = f.tier === activeTier;
    const matchesProject = projectFolder === 'all' || f.project === projectFolder;
    const matchesSearch =
      (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.project || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.uploadedBy || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTier && matchesProject && matchesSearch;
  });

  // Upload handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!newFile.name) return;

    const filePayload = {
      tier: activeTier,
      name: newFile.name.endsWith('.pdf') || newFile.name.endsWith('.dwg') ? newFile.name : `${newFile.name}.pdf`,
      project: activeTier === 'project' ? newFile.project : activeTier === 'studio' ? 'Studio Master Library' : 'Personal Drafts',
      category: newFile.category,
      revision: newFile.revision,
      gfcStatus: newFile.category.includes('GFC') ? 'GFC Released' : 'Approved',
      sizeBytes: Math.round(Number(newFile.sizeMb) * 1024 * 1024) || 4500000,
      uploadedBy: 'Ar. Mayur Mehta'
    };

    try {
      const created = await storageService.saveFile(filePayload);
      setFiles([created, ...files]);
    } catch (err) {
      console.warn('Save file notice:', err);
    }
    setUploadModalOpen(false);
    setNewFile({
      name: '',
      project: 'The Courtyard Villa',
      category: 'Structural GFC',
      revision: 'R0',
      tier: 'project',
      sizeMb: 5.4
    });
  };

  const handleDeleteFile = async (id) => {
    const ok = await confirm({
      title: 'Delete Drawing File?',
      message: 'Are you sure you want to delete this drawing from the cloud storage drive?',
      confirmText: 'Delete File',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await storageService.deleteFile(id);
    } catch (err) {
      console.warn('Delete file notice:', err);
    }
    setFiles(files.filter((f) => f.id !== id));
  };

  const handleCopyLink = (id, fileName) => {
    navigator.clipboard.writeText(`${window.location.origin}/storage/preview/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="storage-page-container">
      {/* 1. Header */}
      <div className="storage-header-row">
        <div>
          <h1 className="storage-heading">Storage Drive</h1>
          <p className="storage-subheading">
            3-Tier Architectural Cloud: Studio Master Library, Project-wise GFC Drawings, and Personal Workspaces
          </p>
        </div>

        <div className="storage-actions">
          <Button
            variant="primary"
            icon={UploadCloud}
            onClick={() => setUploadModalOpen(true)}
          >
            Upload Drawings
          </Button>
        </div>
      </div>

      {/* 2. Quota & Consumption Breakdown Widget */}
      <div className="storage-quota-card">
        <div className="storage-quota-header">
          <div className="storage-quota-title-wrap">
            <HardDrive size={18} color="#7B6F62" />
            <span className="storage-quota-title">Studio Storage Quota</span>
            <span className="storage-quota-badge">5 GB Free Forever Tier</span>
          </div>

          <div className="storage-usage-stats">
            <strong>{formatBytes(totalBytesUsed)}</strong> used of {formatBytes(totalBytesLimit)} ({usagePercent}%)
          </div>
        </div>

        <div className="storage-progress-bg">
          <div
            className={`storage-progress-fill ${isNearLimit ? 'warning' : ''}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>

        <div className="storage-breakdown-row">
          <div className="breakdown-item">
            <span className="breakdown-dot" style={{ backgroundColor: '#7B6F62' }} />
            <span>CAD & BIM Drawings: <strong>780 MB</strong></span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-dot" style={{ backgroundColor: '#B5734C' }} />
            <span>3D High-Res Renders: <strong>320 MB</strong></span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-dot" style={{ backgroundColor: '#5E7A6B' }} />
            <span>Site Inspection Photos: <strong>140 MB</strong></span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-dot" style={{ backgroundColor: '#5B758E' }} />
            <span>Contracts & BOQ Sheets: <strong>48 MB</strong></span>
          </div>
        </div>
      </div>

      {/* 3. 3-Tier Drive Navigation Tabs */}
      <div className="drive-tier-tabs">
        <button
          type="button"
          className={`drive-tier-btn ${activeTier === 'project' ? 'active' : ''}`}
          onClick={() => {
            setActiveTier('project');
            setProjectFolder('all');
          }}
        >
          <Folder size={16} />
          <span>Project Drive (GFC & Renders)</span>
          <span className="tier-count">{files.filter((f) => f.tier === 'project').length}</span>
        </button>

        <button
          type="button"
          className={`drive-tier-btn ${activeTier === 'studio' ? 'active' : ''}`}
          onClick={() => {
            setActiveTier('studio');
            setProjectFolder('all');
          }}
        >
          <Shield size={16} />
          <span>Studio Admin Drive (Standards & Contracts)</span>
          <span className="tier-count">{files.filter((f) => f.tier === 'studio').length}</span>
        </button>

        <button
          type="button"
          className={`drive-tier-btn ${activeTier === 'personal' ? 'active' : ''}`}
          onClick={() => {
            setActiveTier('personal');
            setProjectFolder('all');
          }}
        >
          <Layers size={16} />
          <span>Personal Drive (Architect Drafts)</span>
          <span className="tier-count">{files.filter((f) => f.tier === 'personal').length}</span>
        </button>
      </div>

      {/* 4. Sub-folder Selector for Project Drive */}
      {activeTier === 'project' && (
        <div className="project-folder-bar">
          <span className="folder-label">Filter Project Folder:</span>
          {['all', ...projectsList].map((p) => (
            <button
              key={p}
              type="button"
              className={`folder-chip ${projectFolder === p ? 'active' : ''}`}
              onClick={() => setProjectFolder(p)}
            >
              {p === 'all' ? 'All Projects' : p}
            </button>
          ))}
        </div>
      )}

      {/* 5. Filter & Search Controls */}
      <div className="storage-filter-bar">
        <div className="storage-search-pill">
          <Search size={15} color="#7B6F62" style={{ marginRight: 8 }} />
          <input
            type="text"
            placeholder="Search files by name, revision, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="storage-search-input"
          />
        </div>

        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          Showing <strong>{filteredFiles.length}</strong> items in {activeTier.toUpperCase()} DRIVE
        </span>
      </div>

      {/* 6. Files Data Table */}
      <div className="storage-table-card">
        <table className="storage-table">
          <thead>
            <tr>
              <th>File / Sheet Name</th>
              <th>Project Workspace</th>
              <th>Category</th>
              <th>Revision</th>
              <th>Status</th>
              <th>Size</th>
              <th>Uploaded By</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                  No files found in this drive folder. Click "Upload Drawings" to add.
                </td>
              </tr>
            ) : (
              filteredFiles.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="file-name-cell">
                      <div className="file-icon-box">
                        {f.fileType === 'image' ? (
                          <ImageIcon size={18} />
                        ) : f.fileType === 'dwg' ? (
                          <Layers size={18} />
                        ) : (
                          <FileText size={18} />
                        )}
                      </div>
                      <div className="file-title-wrap">
                        <strong>{f.name}</strong>
                        <span>{f.fileType.toUpperCase()} File</span>
                      </div>
                    </div>
                  </td>

                  <td>{f.project}</td>
                  <td>{f.category}</td>
                  <td>
                    <span className="rev-badge">{f.revision}</span>
                  </td>
                  <td>
                    <Badge variant={f.gfcStatus.includes('Released') || f.gfcStatus.includes('Standard') ? 'success' : 'warning'}>
                      {f.gfcStatus}
                    </Badge>
                  </td>
                  <td>{formatBytes(f.sizeBytes)}</td>
                  <td>{f.uploadedBy}</td>
                  <td>{formatDate(f.uploadedAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-icon-group">
                      <button
                        type="button"
                        className="file-action-btn"
                        title="Download Drawing"
                        onClick={() => storageService.downloadFile(f)}
                      >
                        <Download size={14} />
                      </button>

                      <button
                        type="button"
                        className="file-action-btn"
                        title="Copy Shareable Link"
                        onClick={() => handleCopyLink(f.id, f.name)}
                      >
                        {copiedId === f.id ? <Check size={14} color="#5E7A6B" /> : <Share2 size={14} />}
                      </button>

                      <button
                        type="button"
                        className="file-action-btn btn-del"
                        title="Delete File"
                        onClick={() => handleDeleteFile(f.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 7. Upload Drawings Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Drawing or File to Cloud Drive"
      >
        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="dropzone-box" onClick={() => document.getElementById('file-picker-input')?.click()}>
            <UploadCloud size={36} color="#7B6F62" />
            <div className="dropzone-title">Click to browse or drop architectural drawings here</div>
            <div className="dropzone-sub">Supported formats: .DWG, .DXF, .PDF, .RVT, .JPG, .PNG (Max 100MB per file)</div>
            <input
              id="file-picker-input"
              type="file"
              style={{ display: 'none' }}
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) {
                  setNewFile((prev) => ({
                    ...prev,
                    name: picked.name,
                    sizeMb: (picked.size / (1024 * 1024)).toFixed(1)
                  }));
                }
              }}
            />
          </div>

          <div className="form-grid-2">
            <div style={{ gridColumn: 'span 2' }}>
              <Input
                label="Drawing / Document Title *"
                id="modal-file-name"
                placeholder="Enter document or drawing title"
                value={newFile.name}
                onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
                required
              />
            </div>

            <Select
              label="Destination Drive *"
              id="modal-tier"
              value={newFile.tier}
              onChange={(e) => setNewFile({ ...newFile, tier: e.target.value })}
              options={[
                { value: 'project', label: 'Project Drive', sublabel: 'Associated with client project' },
                { value: 'studio', label: 'Studio Admin Drive', sublabel: 'Firm-wide master template' },
                { value: 'personal', label: 'Personal Drive', sublabel: 'Private architect workspace' }
              ]}
              required
            />

            <Select
              label="Drawing Category *"
              id="modal-category"
              value={newFile.category}
              onChange={(e) => setNewFile({ ...newFile, category: e.target.value })}
              options={[
                { value: 'Structural GFC', label: 'Structural GFC Drawing' },
                { value: 'Architectural GFC', label: 'Architectural GFC Drawing' },
                { value: 'Interior Detailing', label: 'Interior Detailing Sheet' },
                { value: 'MEP Clearance', label: 'Electrical & Plumbing Layout' },
                { value: '3D Render', label: 'Photorealistic 3D Render' },
                { value: 'Contracts & Legal', label: 'Client Contract / BOQ' }
              ]}
              required
            />

            <Select
              label="Revision Index"
              id="modal-rev"
              value={newFile.revision}
              onChange={(e) => setNewFile({ ...newFile, revision: e.target.value })}
              options={[
                { value: 'R0', label: 'R0 (Initial Concept Draft)' },
                { value: 'R1', label: 'R1 (Client Feedback Revision)' },
                { value: 'R2', label: 'R2 (Municipal / Structural Clearance)' },
                { value: 'R3', label: 'R3 (Good For Construction - GFC)' }
              ]}
            />

            <Input
              label="File Size (MB)"
              id="modal-size"
              type="number"
              step="0.1"
              value={newFile.sizeMb}
              onChange={(e) => setNewFile({ ...newFile, sizeMb: e.target.value })}
            />
          </div>

          <div className="form-actions-row">
            <Button type="button" variant="secondary" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Upload Drawing
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default StoragePage;
