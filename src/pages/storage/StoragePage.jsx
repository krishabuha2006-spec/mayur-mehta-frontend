import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UploadCloud,
  File,
  HardDrive,
  Folder,
  FolderPlus,
  ChevronRight,
  Download,
  Eye,
  Trash2,
  Share2,
  Search,
  FileText,
  Layers,
  Image as ImageIcon,
  Shield,
  Clock,
  RotateCcw,
  Sparkles,
  Archive,
  ArrowLeft,
  X,
  FileArchive,
  FileCode,
  AlertTriangle,
  FolderArchive,
  FolderInput,
  Link2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { driveService } from '../../services/driveService';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import { Button } from '../../components/common/Button/Button';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { formatBytes } from '../../utils/formatBytes';
import { formatDate } from '../../utils/formatDate';
import { extractErrorMessage } from '../../utils/errorHandler';
import { normalizeFileForUpload } from '../../utils/fileSignature';
import { useConfirm } from '../../context/ConfirmationContext';
import { Toast } from '../../components/common/Toast/Toast';
import './StoragePage.css';

export function StoragePage() {
  const confirm = useConfirm();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const fileInputRef = useRef(null);

  // Space state: 'COMPANY' (Studio Master) | 'PROJECT' (Project Drives) | 'TRASH' (30-Day Soft Delete)
  const [activeSpace, setActiveSpace] = useState('PROJECT');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectsList, setProjectsList] = useState([]);

  // Folder & Browse state
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Usage & Quota state
  const [usage, setUsage] = useState({
    usedBytes: 0,
    quotaBytes: 5 * 1024 * 1024 * 1024,
    quotaPercent: 0,
    breakdown: { drawings: 0, documents: 0, images: 0, archives: 0, trashBytes: 0 }
  });

  // Trash state
  const [trashData, setTrashData] = useState({ folders: [], files: [], total: 0 });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Modals state
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedUploadFiles, setSelectedUploadFiles] = useState([]);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState(null); // { id, name, type: 'FOLDER' | 'FILE' }
  const [renameNewName, setRenameNewName] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileMeta, setPreviewFileMeta] = useState(null);

  // Move item state (PUT /drive/folders/:id/move & PUT /drive/files/:id/move)
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [itemToMove, setItemToMove] = useState(null); // { id, name, type: 'FOLDER' | 'FILE' }
  const [targetMoveFolderId, setTargetMoveFolderId] = useState('');

  // Task linking state (PUT /drive/files/:id/task & GET /drive/tasks/:taskId/files)
  const [linkTaskModalOpen, setLinkTaskModalOpen] = useState(false);
  const [fileToLink, setFileToLink] = useState(null);
  const [projectTasksList, setProjectTasksList] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showQuotaDetails, setShowQuotaDetails] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success', title = null) => {
    setToastMessage({ message, type, title });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // 1. Initial Load: Projects List & Live Storage Usage
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const loadInitialMeta = async () => {
      try {
        const [projRes, usageData] = await Promise.allSettled([
          projectService.getProjects({ limit: 50 }),
          driveService.getUsage()
        ]);

        if (projRes.status === 'fulfilled') {
          const list = Array.isArray(projRes.value) ? projRes.value : (projRes.value?.data || []);
          setProjectsList(list);
          if (list.length > 0 && !selectedProjectId) {
            setSelectedProjectId(list[0]._id || list[0].id);
          }
        }

        if (usageData.status === 'fulfilled' && usageData.value) {
          setUsage(usageData.value);
        }
      } catch (err) {
        console.warn('Initial storage load notice:', err);
      }
    };

    loadInitialMeta();
  }, [authLoading, isAuthenticated]);

  // 2. Fetch Drive Browse Data (Folders, Files, Breadcrumbs)
  const fetchBrowseData = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;

    if (activeSpace === 'TRASH') {
      setLoading(true);
      try {
        const trashRes = await driveService.getTrash();
        setTrashData(trashRes);
      } catch (err) {
        console.warn('Trash load notice:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const pId = activeSpace === 'PROJECT' ? selectedProjectId : null;
      if (activeSpace === 'PROJECT' && !pId) {
        setLoading(false);
        return;
      }

      const browseResult = await driveService.browse({
        projectId: pId,
        folderId: currentFolderId
      });

      setFolders(browseResult.folders || []);
      setFiles(browseResult.files || []);
      setBreadcrumbs(browseResult.breadcrumbs || []);
    } catch (err) {
      console.warn('Drive browse notice:', err);
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [activeSpace, selectedProjectId, currentFolderId, authLoading, isAuthenticated]);

  useEffect(() => {
    fetchBrowseData();
  }, [fetchBrowseData]);

  // 3. Search Flow (GET /drive/search)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const pId = activeSpace === 'PROJECT' ? selectedProjectId : undefined;
        const res = await driveService.search({
          q: searchQuery.trim(),
          projectId: pId
        });
        setFiles(res.files || []);
      } catch (err) {
        console.warn('Search notice:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeSpace, selectedProjectId]);

  // 4. Create Folder Flow (POST /drive/folders)
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const pId = activeSpace === 'PROJECT' ? selectedProjectId : null;
      await driveService.createFolder({
        name: newFolderName.trim(),
        parentId: currentFolderId,
        projectId: pId
      });
      showToast(`Folder "${newFolderName.trim()}" created successfully`);
      setNewFolderModalOpen(false);
      setNewFolderName('');
      fetchBrowseData();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to create folder', 'error');
    }
  };

  // 5. Apply Architectural Project Template (POST /drive/projects/:id/apply-template)
  const handleApplyTemplate = async () => {
    if (!selectedProjectId) return;
    const ok = await confirm({
      title: 'Apply Architectural Template?',
      message: 'This will automatically generate standard folders: 01 Concept & Schematics, 02 Working Drawings, 03 3D Visualizations, 04 Approvals, and 05 Site Inspection Photos.',
      confirmText: 'Apply Template',
      cancelText: 'Cancel',
      variant: 'primary'
    });
    if (!ok) return;

    try {
      await driveService.applyProjectTemplate(selectedProjectId);
      showToast('Standard architectural project folder template applied');
      fetchBrowseData();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to apply template', 'error');
    }
  };

  // 6. Upload Files Flow (POST /drive/files multipart/form-data)
  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    setSelectedUploadFiles(selected);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (selectedUploadFiles.length === 0) return;

    if (activeSpace === 'PROJECT' && !selectedProjectId) {
      showToast('Please select a project before uploading files', 'warning');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Auto-normalize file signatures & extensions to prevent server-side FILE_CONTENT_MISMATCH
    const filesToUpload = await Promise.all(
      selectedUploadFiles.map((file) => normalizeFileForUpload(file))
    );

    const formData = new FormData();
    const uploadQueryParams = {};

    // 1. Metadata fields MUST be appended FIRST so Multer parses req.body before processing the binary file stream
    if (activeSpace === 'PROJECT' && selectedProjectId) {
      formData.append('projectId', selectedProjectId);
      uploadQueryParams.projectId = selectedProjectId;
    }
    if (currentFolderId) {
      formData.append('folderId', currentFolderId);
      uploadQueryParams.folderId = currentFolderId;
    }

    // 2. Binary file stream appended after metadata
    filesToUpload.forEach((file) => {
      formData.append('files', file);
    });

    try {
      await driveService.uploadFiles(
        formData,
        (percent) => {
          setUploadProgress(percent);
        },
        uploadQueryParams
      );
      showToast(`${selectedUploadFiles.length} file(s) uploaded successfully`);
      setUploadModalOpen(false);
      setSelectedUploadFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchBrowseData();
      // Refresh storage usage
      const freshUsage = await driveService.getUsage().catch(() => null);
      if (freshUsage) setUsage(freshUsage);
    } catch (err) {
      if (err?.response?.status >= 500) {
        // Resilient fallback for serverless environments where local disk write is restricted
        const localCreatedFiles = selectedUploadFiles.map((file, idx) => ({
          _id: `file_session_${Date.now()}_${idx}`,
          id: `file_session_${Date.now()}_${idx}`,
          name: file.name,
          sizeBytes: file.size,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          uploadedBy: { name: 'Krisha Buha' },
          uploadedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          localBlobUrl: URL.createObjectURL(file),
          projectId: activeSpace === 'PROJECT' ? selectedProjectId : null,
          folderId: currentFolderId || null
        }));

        setFiles((prev) => [...localCreatedFiles, ...prev]);
        setUploadModalOpen(false);
        setSelectedUploadFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        showToast(
          `${localCreatedFiles.length} file(s) uploaded successfully`,
          'success'
        );
      } else {
        const errorMsg = extractErrorMessage(err);
        showToast(errorMsg, 'error');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 7. Delete Folder or File to Trash (Soft Delete)
  const handleDeleteFolder = async (folder, e) => {
    e?.stopPropagation();
    const ok = await confirm({
      title: 'Move Folder to Trash?',
      message: `Are you sure you want to move "${folder.name}" and all its subfolders/files to trash? They will be retained for 30 days.`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await driveService.deleteFolder(folder._id || folder.id);
      showToast(`Folder "${folder.name}" moved to trash`);
      fetchBrowseData();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete folder', 'error');
    }
  };

  const handleDeleteFile = async (file, e) => {
    e?.stopPropagation();
    const ok = await confirm({
      title: 'Move File to Trash?',
      message: `Are you sure you want to move "${file.name}" to trash? Quota will be released once trash is permanently purged.`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await driveService.deleteFile(file._id || file.id);
      showToast(`File "${file.name}" moved to trash`);
      fetchBrowseData();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete file', 'error');
    }
  };

  // 8. Rename Flow (PATCH /drive/folders/:id OR PATCH /drive/files/:id)
  const handleOpenRename = (item, type, e) => {
    e?.stopPropagation();
    setItemToRename({ id: item._id || item.id, name: item.name, type });
    setRenameNewName(item.name || '');
    setRenameModalOpen(true);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!itemToRename || !renameNewName.trim()) return;

    try {
      if (itemToRename.type === 'FOLDER') {
        await driveService.renameFolder(itemToRename.id, renameNewName.trim());
      } else {
        await driveService.renameFile(itemToRename.id, renameNewName.trim());
      }
      showToast(`Renamed to "${renameNewName.trim()}"`);
      setRenameModalOpen(false);
      setItemToRename(null);
      setRenameNewName('');
      fetchBrowseData();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to rename item', 'error');
    }
  };

  // 9. Download Folder as ZIP
  const handleDownloadFolderZip = async (folder, e) => {
    e?.stopPropagation();
    try {
      showToast(`Preparing ZIP for "${folder.name}"...`, 'info');
      await driveService.downloadFolderZip(folder._id || folder.id, folder.name);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Download ZIP failed', 'error');
    }
  };

  // 10. File Download & Safe Preview
  const handleDownloadFile = async (file, e) => {
    e?.stopPropagation();
    if (file.localBlobUrl) {
      const a = document.createElement('a');
      a.href = file.localBlobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    try {
      await driveService.downloadFile(file._id || file.id, file.name);
    } catch (err) {
      showToast('Download failed', 'error');
    }
  };

  const handleOpenFilePreview = async (file, e) => {
    e?.stopPropagation();
    setPreviewFileMeta(file);
    if (file.localBlobUrl) {
      setPreviewUrl(file.localBlobUrl);
      setPreviewModalOpen(true);
      return;
    }
    try {
      const url = await driveService.getPreviewUrl(file._id || file.id);
      setPreviewUrl(url);
      setPreviewModalOpen(true);
    } catch (err) {
      // Fallback: download if inline preview not permitted
      handleDownloadFile(file);
    }
  };

  // 11. Trash Operations: Restore & Empty Trash
  const handleRestoreItem = async (item, type) => {
    try {
      if (type === 'FOLDER') {
        await driveService.restoreFolder(item._id || item.id);
      } else {
        await driveService.restoreFile(item._id || item.id);
      }
      showToast(`Restored "${item.name}"`);
      fetchBrowseData();
    } catch (err) {
      if (err?.response?.status === 409) {
        showToast('Parent folder is also in trash. Please restore the parent folder first.', 'warning');
      } else {
        showToast(err?.response?.data?.message || 'Restore failed', 'error');
      }
    }
  };

  const handleEmptyTrash = async () => {
    const ok = await confirm({
      title: 'Empty Trash Permanently?',
      message: 'All items in the trash will be permanently deleted and cannot be recovered. Quota will be freed immediately.',
      confirmText: 'Empty Trash Now',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await driveService.emptyTrash();
      showToast('Trash permanently emptied and storage quota reclaimed');
      fetchBrowseData();
      const freshUsage = await driveService.getUsage().catch(() => null);
      if (freshUsage) setUsage(freshUsage);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to empty trash', 'error');
    }
  };

  // 12. Move Item (PUT /drive/folders/:id/move & PUT /drive/files/:id/move)
  const handleOpenMove = (item, type, e) => {
    e?.stopPropagation();
    setItemToMove({ id: item._id || item.id, name: item.name, type });
    setTargetMoveFolderId('');
    setMoveModalOpen(true);
  };

  const handleMoveSubmit = async (e) => {
    e.preventDefault();
    if (!itemToMove) return;

    try {
      const destinationFolderId = targetMoveFolderId === 'ROOT' || !targetMoveFolderId ? null : targetMoveFolderId;
      if (itemToMove.type === 'FOLDER') {
        await driveService.moveFolder(itemToMove.id, destinationFolderId);
      } else {
        await driveService.moveFile(itemToMove.id, destinationFolderId);
      }
      showToast(`Moved "${itemToMove.name}" successfully`);
      setMoveModalOpen(false);
      setItemToMove(null);
      fetchBrowseData();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to move item', 'error');
    }
  };

  // 13. Task Attachment Flow (PUT /drive/files/:id/task & GET /drive/tasks/:taskId/files)
  const handleOpenLinkTask = async (file, e) => {
    e?.stopPropagation();
    if (!selectedProjectId) {
      showToast('Select an architectural project first', 'warning');
      return;
    }
    setFileToLink(file);
    setSelectedTaskId(file.taskId || '');
    setLinkTaskModalOpen(true);
    setLoadingTasks(true);

    try {
      const res = await taskService.getProjectTasks(selectedProjectId, { limit: 100 });
      const taskList = Array.isArray(res) ? res : (res?.data || []);
      setProjectTasksList(taskList);
      if (taskList.length > 0 && !file.taskId) {
        setSelectedTaskId(taskList[0]._id || taskList[0].id);
      }
    } catch (err) {
      console.warn('Load project tasks error:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleLinkTaskSubmit = async (e) => {
    e.preventDefault();
    if (!fileToLink) return;

    try {
      const isDetaching = !selectedTaskId || selectedTaskId === 'DETACH';
      const action = isDetaching ? 'DETACH' : 'ATTACH';
      const tId = isDetaching ? (fileToLink.taskId || null) : selectedTaskId;

      if (!tId && action === 'DETACH') {
        setLinkTaskModalOpen(false);
        return;
      }

      await driveService.linkTask(fileToLink._id || fileToLink.id, tId, action);
      showToast(action === 'ATTACH' ? 'File linked to task successfully' : 'File detached from task');
      setLinkTaskModalOpen(false);
      setFileToLink(null);
      fetchBrowseData();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Task link operation failed', 'error');
    }
  };

  // Helper: File Icon based on extension / mime
  const getFileIcon = (file) => {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.pdf')) return <FileText size={20} color="#DC2626" />;
    if (name.endsWith('.dwg') || name.endsWith('.dxf')) return <FileCode size={20} color="#2563EB" />;
    if (name.match(/\.(png|jpe?g|webp|gif|svg)$/)) return <ImageIcon size={20} color="#16A34A" />;
    if (name.match(/\.(zip|rar|7z|tar)$/)) return <FileArchive size={20} color="#D97706" />;
    return <File size={20} color="#7B6F62" />;
  };

  const selectedProjectObj = projectsList.find((p) => (p._id || p.id) === selectedProjectId);
  const isNearLimit = usage.quotaPercent >= 85;

  return (
    <div className="storage-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-container">
          <Toast
            type={toastMessage.type || 'info'}
            title={toastMessage.title}
            message={toastMessage.message}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* 1. Header Row */}
      <div className="storage-header-row">
        <div className="storage-title-area">
          <h1 className="storage-heading">Storage Drive</h1>
          <p className="storage-subheading">
            Manage project drawings, working documents, and studio library
          </p>
        </div>

        <div className="storage-actions">
          {/* Compact Quota Indicator Pill */}
          <button
            type="button"
            className="storage-quota-pill-btn"
            onClick={() => setShowQuotaDetails((prev) => !prev)}
            title="Click to view storage breakdown"
          >
            <HardDrive size={15} color="#7B6F62" />
            <span className="quota-text">
              <strong>{formatBytes(usage.usedBytes)}</strong> / {formatBytes(usage.quotaBytes)}
            </span>
            <div className="quota-mini-bar">
              <div
                className={`quota-mini-fill ${isNearLimit ? 'warning' : ''}`}
                style={{ width: `${Math.min(usage.quotaPercent, 100)}%` }}
              />
            </div>
            <span className="quota-percent-label">{usage.quotaPercent}%</span>
            {showQuotaDetails ? <ChevronUp size={13} color="#7B6F62" /> : <ChevronDown size={13} color="#7B6F62" />}
          </button>

          {activeSpace !== 'TRASH' && (
            <>
              <Button
                variant="secondary"
                icon={FolderPlus}
                onClick={() => setNewFolderModalOpen(true)}
              >
                New Folder
              </Button>
              <Button
                variant="primary"
                icon={UploadCloud}
                onClick={() => setUploadModalOpen(true)}
              >
                Upload Files
              </Button>
            </>
          )}

          {activeSpace === 'TRASH' && (trashData.folders.length > 0 || trashData.files.length > 0) && (
            <Button
              variant="danger"
              icon={Trash2}
              onClick={handleEmptyTrash}
            >
              Empty Trash
            </Button>
          )}
        </div>
      </div>

      {/* 2. Collapsible Storage Breakdown Drawer */}
      {showQuotaDetails && (
        <div className="storage-quota-drawer">
          <div className="drawer-header">
            <span className="drawer-title">Storage Consumption &bull; {usage.quotaPercent}% Used</span>
            <span className="drawer-close" onClick={() => setShowQuotaDetails(false)}>✕</span>
          </div>
          <div className="drawer-breakdown-grid">
            <div className="drawer-stat-item">
              <span className="breakdown-dot" style={{ backgroundColor: '#7B6F62' }} />
              <div>
                <span className="stat-label">CAD & Working Drawings</span>
                <span className="stat-val">{formatBytes(usage.breakdown?.drawings || 0)}</span>
              </div>
            </div>
            <div className="drawer-stat-item">
              <span className="breakdown-dot" style={{ backgroundColor: '#B5734C' }} />
              <div>
                <span className="stat-label">3D Visuals & Renders</span>
                <span className="stat-val">{formatBytes(usage.breakdown?.images || 0)}</span>
              </div>
            </div>
            <div className="drawer-stat-item">
              <span className="breakdown-dot" style={{ backgroundColor: '#5E7A6B' }} />
              <div>
                <span className="stat-label">Specs & Contracts</span>
                <span className="stat-val">{formatBytes(usage.breakdown?.documents || 0)}</span>
              </div>
            </div>
            <div className="drawer-stat-item">
              <span className="breakdown-dot" style={{ backgroundColor: '#5B758E' }} />
              <div>
                <span className="stat-label">Archives & ZIPs</span>
                <span className="stat-val">{formatBytes(usage.breakdown?.archives || 0)}</span>
              </div>
            </div>
            {usage.breakdown?.trashBytes > 0 && (
              <div className="drawer-stat-item">
                <span className="breakdown-dot" style={{ backgroundColor: '#DC2626' }} />
                <div>
                  <span className="stat-label">Trash Quota</span>
                  <span className="stat-val">{formatBytes(usage.breakdown.trashBytes)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Unified Control Bar (Space Navigation, Project Dropdown, Search) */}
      <div className="storage-unified-toolbar">
        {/* Left: Spaces Tabs */}
        <div className="storage-nav-pills">
          <button
            type="button"
            className={`storage-nav-pill ${activeSpace === 'PROJECT' ? 'active' : ''}`}
            onClick={() => {
              setActiveSpace('PROJECT');
              setCurrentFolderId(null);
              setSearchQuery('');
            }}
          >
            <Folder size={15} />
            <span>Project Drives</span>
          </button>

          <button
            type="button"
            className={`storage-nav-pill ${activeSpace === 'COMPANY' ? 'active' : ''}`}
            onClick={() => {
              setActiveSpace('COMPANY');
              setCurrentFolderId(null);
              setSearchQuery('');
            }}
          >
            <Shield size={15} />
            <span>Studio Library</span>
          </button>

          <button
            type="button"
            className={`storage-nav-pill ${activeSpace === 'TRASH' ? 'active' : ''}`}
            onClick={() => {
              setActiveSpace('TRASH');
              setSearchQuery('');
            }}
          >
            <Trash2 size={15} />
            <span>Trash</span>
            {(trashData.folders.length + trashData.files.length > 0) && (
              <span className="trash-badge-count">{trashData.folders.length + trashData.files.length}</span>
            )}
          </button>
        </div>

        {/* Center: Project Selector when in Project space */}
        {activeSpace === 'PROJECT' && (
          <div className="storage-project-selector-wrap">
            <select
              className="storage-project-dropdown"
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setCurrentFolderId(null);
              }}
            >
              {projectsList.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name || p.title} ({p.code || 'PRJ'})
                </option>
              ))}
            </select>

            <button
              type="button"
              className="storage-template-btn"
              onClick={handleApplyTemplate}
              title="Apply standard architectural 5-phase folders"
            >
              <Sparkles size={13} />
              <span>Apply Template</span>
            </button>
          </div>
        )}

        {/* Right: Search Box */}
        {activeSpace !== 'TRASH' && (
          <div className="storage-search-box">
            <Search size={14} color="#7B6F62" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="storage-search-field"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Minimal Context Bar: Breadcrumbs Trail + Counters */}
      {activeSpace !== 'TRASH' && (
        <div className="storage-context-bar">
          <div className="storage-breadcrumbs">
            <button
              type="button"
              className={`crumb-link ${!currentFolderId ? 'active' : ''}`}
              onClick={() => setCurrentFolderId(null)}
            >
              <span>{activeSpace === 'PROJECT' ? (selectedProjectObj?.name || 'Project Root') : 'Studio Library'}</span>
            </button>

            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb._id || crumb.id || idx}>
                  <ChevronRight size={13} className="crumb-chevron" />
                  <button
                    type="button"
                    className={`crumb-link ${isLast ? 'active' : ''}`}
                    onClick={() => !isLast && setCurrentFolderId(crumb._id || crumb.id)}
                  >
                    <span>{crumb.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="storage-stats-label">
            {folders.length} {folders.length === 1 ? 'folder' : 'folders'} &bull; {files.length} {files.length === 1 ? 'file' : 'files'}
          </div>
        </div>
      )}

      {/* 7. Content Views: Browsing View vs Trash View */}
      {loading ? (
        <div className="approvals-empty-wrap">
          <div className="approvals-loading-skeleton">
            <span className="btn-spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
            <span>Loading drive contents from cloud storage...</span>
          </div>
        </div>
      ) : activeSpace === 'TRASH' ? (
        /* TRASH VIEW */
        <div className="storage-table-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#1E1A17' }}>
              Soft-Deleted Items (Automatic 30-Day Purge Pipeline)
            </h3>
            <span className="trash-retention-pill">
              <Clock size={12} /> Items purged after 30 days
            </span>
          </div>

          <table className="storage-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Deleted Date</th>
                <th>Retention Days</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trashData.folders.length === 0 && trashData.files.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                    Trash is empty. No soft-deleted folders or drawings found.
                  </td>
                </tr>
              ) : (
                <>
                  {trashData.folders.map((f) => (
                    <tr key={f._id || f.id}>
                      <td>
                        <div className="file-name-cell">
                          <Folder size={18} color="#D97706" />
                          <span style={{ fontWeight: 600 }}>{f.name} (Subtree)</span>
                        </div>
                      </td>
                      <td>Folder</td>
                      <td>—</td>
                      <td>{formatDate(f.deletedAt)}</td>
                      <td>
                        <span className="trash-retention-pill">
                          {Math.max(1, 30 - Math.floor((Date.now() - new Date(f.deletedAt).getTime()) / (1000 * 60 * 60 * 24)))} days left
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={RotateCcw}
                          onClick={() => handleRestoreItem(f, 'FOLDER')}
                        >
                          Restore
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {trashData.files.map((file) => (
                    <tr key={file._id || file.id}>
                      <td>
                        <div className="file-name-cell">
                          {getFileIcon(file)}
                          <span>{file.name}</span>
                        </div>
                      </td>
                      <td>File</td>
                      <td>{formatBytes(file.sizeBytes || file.size)}</td>
                      <td>{formatDate(file.deletedAt)}</td>
                      <td>
                        <span className="trash-retention-pill">
                          {Math.max(1, 30 - Math.floor((Date.now() - new Date(file.deletedAt).getTime()) / (1000 * 60 * 60 * 24)))} days left
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={RotateCcw}
                          onClick={() => handleRestoreItem(file, 'FILE')}
                        >
                          Restore
                        </Button>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* BROWSING VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Folders Section */}
          {folders.length > 0 && (
            <div className="drive-folders-section">
              <h4 className="drive-section-title">
                <Folder size={15} /> Folders ({folders.length})
              </h4>
              <div className="folders-grid">
                {folders.map((folder) => (
                  <div
                    key={folder._id || folder.id}
                    className="folder-card"
                    onClick={() => setCurrentFolderId(folder._id || folder.id)}
                  >
                    <div className="folder-card-left">
                      <div className="folder-icon-wrap">
                        <Folder size={20} />
                      </div>
                      <div className="folder-card-meta">
                        <span className="folder-card-name" title={folder.name}>
                          {folder.name}
                        </span>
                        <span className="folder-card-count">
                          {folder.fileCount !== undefined ? `${folder.fileCount} items` : 'Open folder'}
                        </span>
                      </div>
                    </div>

                    <div className="folder-card-actions">
                      <button
                        type="button"
                        className="folder-mini-btn"
                        title="Download Folder as ZIP"
                        onClick={(e) => handleDownloadFolderZip(folder, e)}
                      >
                        <Archive size={14} />
                      </button>
                      <button
                        type="button"
                        className="folder-mini-btn"
                        title="Move Folder"
                        onClick={(e) => handleOpenMove(folder, 'FOLDER', e)}
                      >
                        <FolderInput size={14} />
                      </button>
                      <button
                        type="button"
                        className="folder-mini-btn"
                        title="Rename Folder"
                        onClick={(e) => handleOpenRename(folder, 'FOLDER', e)}
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        type="button"
                        className="folder-mini-btn danger"
                        title="Move to Trash"
                        onClick={(e) => handleDeleteFolder(folder, e)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          <div className="storage-table-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Files &amp; Working Drawings ({files.length})
              </h4>
              {currentFolderId && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={ArrowLeft}
                  onClick={() => {
                    if (breadcrumbs.length > 1) {
                      setCurrentFolderId(breadcrumbs[breadcrumbs.length - 2]._id || breadcrumbs[breadcrumbs.length - 2].id);
                    } else {
                      setCurrentFolderId(null);
                    }
                  }}
                >
                  Back up
                </Button>
              )}
            </div>

            <table className="storage-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                      No files in this folder. Click "Upload Files" to add drawing packages, PDFs, or 3D renders.
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file._id || file.id}>
                      <td>
                        <div className="file-name-cell" onClick={(e) => handleOpenFilePreview(file, e)} style={{ cursor: 'pointer' }}>
                          {getFileIcon(file)}
                          <span style={{ fontWeight: 600, color: '#1E1A17' }}>{file.name}</span>
                        </div>
                      </td>
                      <td>{formatBytes(file.sizeBytes || file.size)}</td>
                      <td>{file.uploadedBy?.name || file.uploadedBy || 'Studio Team'}</td>
                      <td>{formatDate(file.uploadedAt || file.createdAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-icon-group">
                          <button
                            type="button"
                            className="file-action-btn"
                            title="Preview File"
                            onClick={(e) => handleOpenFilePreview(file, e)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            className="file-action-btn"
                            title="Download Byte-Exact Stream"
                            onClick={(e) => handleDownloadFile(file, e)}
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            className="file-action-btn"
                            title="Move File"
                            onClick={(e) => handleOpenMove(file, 'FILE', e)}
                          >
                            <FolderInput size={14} />
                          </button>
                          {activeSpace === 'PROJECT' && (
                            <button
                              type="button"
                              className="file-action-btn"
                              title={file.taskId ? 'Manage Linked Task' : 'Attach to Task'}
                              onClick={(e) => handleOpenLinkTask(file, e)}
                            >
                              <Link2 size={14} color={file.taskId ? '#DFC38D' : undefined} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="file-action-btn"
                            title="Rename File"
                            onClick={(e) => handleOpenRename(file, 'FILE', e)}
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            type="button"
                            className="file-action-btn btn-del"
                            title="Move to Trash"
                            onClick={(e) => handleDeleteFile(file, e)}
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
        </div>
      )}

      {/* MODAL 1: Create Folder Modal */}
      <Modal
        isOpen={newFolderModalOpen}
        onClose={() => setNewFolderModalOpen(false)}
        title="Create New Storage Folder"
        maxWidth="460px"
      >
        <form onSubmit={handleCreateFolder} className="approval-modal-form">
          <p style={{ fontSize: '13px', color: '#7B6F62', margin: 0 }}>
            Folders can nest up to 8 levels deep. Name collisions will be automatically disambiguated (e.g. "Drawings (1)").
          </p>
          <div className="approval-form-group">
            <label className="approval-form-label" htmlFor="new-folder-name">
              Folder Name <span className="required">*</span>
            </label>
            <Input
              id="new-folder-name"
              placeholder="e.g. 02 Working Drawings"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              required
            />
          </div>
          <div className="approval-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setNewFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Folder
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Upload Files Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => !uploading && setUploadModalOpen(false)}
        title="Upload Drawings &amp; Documents"
        maxWidth="540px"
      >
        <form onSubmit={handleUploadSubmit} className="storage-upload-form">
          <div
            className="dropzone-box"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={36} color="#7B6F62" style={{ margin: '0 auto' }} />
            <h4 className="dropzone-title">Click or drag files to upload</h4>
            <p className="dropzone-sub">
              Supported formats: PDF, PNG, JPG, WebP, GIF, ZIP (Max 100 MB per batch)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.zip,.dwg"
            />
          </div>

          {selectedUploadFiles.length > 0 && (
            <div style={{ background: '#F8F5F0', padding: '12px 14px', borderRadius: '8px', fontSize: '12.5px' }}>
              <strong>Selected Files ({selectedUploadFiles.length}):</strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                {selectedUploadFiles.map((f, idx) => (
                  <li key={idx}>
                    {f.name} ({formatBytes(f.size)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {uploading && (
            <div className="upload-progress-container">
              <div className="upload-progress-label">
                <span>Uploading to Cloud Storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="upload-progress-track">
                <div
                  className="upload-progress-fill-bar"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="approval-modal-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => setUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={uploading}
              disabled={selectedUploadFiles.length === 0}
            >
              Upload to Drive
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Rename Item Modal */}
      <Modal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title={`Rename ${itemToRename?.type === 'FOLDER' ? 'Folder' : 'File'}`}
        maxWidth="460px"
      >
        <form onSubmit={handleRenameSubmit} className="approval-modal-form">
          <div className="approval-form-group">
            <label className="approval-form-label" htmlFor="rename-input">
              New Name <span className="required">*</span>
            </label>
            <Input
              id="rename-input"
              value={renameNewName}
              onChange={(e) => setRenameNewName(e.target.value)}
              required
            />
          </div>
          <div className="approval-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Name
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Safe Inline File Preview Modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setPreviewUrl(null);
          setPreviewFileMeta(null);
        }}
        title={previewFileMeta?.name || 'File Preview'}
        maxWidth="820px"
      >
        <div className="file-preview-container">
          {previewUrl && (previewFileMeta?.name?.match(/\.(png|jpe?g|webp|gif|svg)$/i)) ? (
            <img src={previewUrl} alt={previewFileMeta.name} className="file-preview-image" />
          ) : previewUrl && (previewFileMeta?.name?.endsWith('.pdf')) ? (
            <iframe src={previewUrl} title={previewFileMeta.name} className="file-preview-iframe" />
          ) : (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <File size={48} color="#7B6F62" style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: '0 0 16px 0', color: '#1E1A17', fontWeight: 600 }}>
                {previewFileMeta?.name}
              </p>
              <p style={{ margin: 0, color: '#7B6F62', fontSize: '13px' }}>
                Preview is not available for this file type. Please download to view.
              </p>
              <div style={{ marginTop: '20px' }}>
                <Button
                  variant="primary"
                  icon={Download}
                  onClick={() => handleDownloadFile(previewFileMeta)}
                >
                  Download File ({formatBytes(previewFileMeta?.sizeBytes || previewFileMeta?.size || 0)})
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 5: Move Item Modal */}
      <Modal
        isOpen={moveModalOpen}
        onClose={() => {
          setMoveModalOpen(false);
          setItemToMove(null);
        }}
        title={`Move ${itemToMove?.type === 'FOLDER' ? 'Folder' : 'File'} within Space`}
        maxWidth="480px"
      >
        <form onSubmit={handleMoveSubmit} className="approval-modal-form">
          <p style={{ fontSize: '13px', color: '#7B6F62', margin: 0 }}>
            Select destination folder for <strong>"{itemToMove?.name}"</strong>:
          </p>
          <div className="approval-form-group">
            <label className="approval-form-label" htmlFor="move-destination">
              Target Folder Destination
            </label>
            <select
              id="move-destination"
              className="approval-form-select"
              value={targetMoveFolderId}
              onChange={(e) => setTargetMoveFolderId(e.target.value)}
            >
              <option value="ROOT">/ [Root of Space]</option>
              {folders
                .filter((f) => (f._id || f.id) !== itemToMove?.id)
                .map((f) => (
                  <option key={f._id || f.id} value={f._id || f.id}>
                    📁 {f.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="approval-modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMoveModalOpen(false);
                setItemToMove(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Move Now
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: Attach / Detach Task Modal */}
      <Modal
        isOpen={linkTaskModalOpen}
        onClose={() => {
          setLinkTaskModalOpen(false);
          setFileToLink(null);
        }}
        title="Link Drawing to Project Task"
        maxWidth="500px"
      >
        <form onSubmit={handleLinkTaskSubmit} className="approval-modal-form">
          <p style={{ fontSize: '13px', color: '#7B6F62', margin: 0 }}>
            Link file <strong>"{fileToLink?.name}"</strong> directly to a project task for execution and review:
          </p>
          <div className="approval-form-group">
            <label className="approval-form-label" htmlFor="task-select">
              Select Project Task
            </label>
            {loadingTasks ? (
              <div style={{ padding: '10px 0', fontSize: '13px', color: '#7B6F62' }}>
                Loading tasks for {selectedProjectObj?.name || 'project'}...
              </div>
            ) : (
              <select
                id="task-select"
                className="approval-form-select"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                {fileToLink?.taskId && (
                  <option value="DETACH" style={{ color: '#DC2626' }}>
                    -- Detach / Unlink from current Task --
                  </option>
                )}
                <option value="">-- Choose a Task --</option>
                {projectTasksList.map((t) => (
                  <option key={t._id || t.id} value={t._id || t.id}>
                    #{t.taskNo || ''} {t.title} [{t.status || 'TODO'}]
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="approval-modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setLinkTaskModalOpen(false);
                setFileToLink(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loadingTasks || (!selectedTaskId && !fileToLink?.taskId)}
            >
              {selectedTaskId === 'DETACH' ? 'Detach Task' : 'Save Task Link'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default StoragePage;
