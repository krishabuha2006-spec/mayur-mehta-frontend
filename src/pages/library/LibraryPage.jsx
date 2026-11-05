import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Search,
  Plus,
  Eye,
  Bookmark,
  Share2,
  Tag,
  Download,
  RefreshCw,
  FolderPlus,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  Grid,
  List,
  CheckCircle,
  AlertCircle,
  Copy,
  Star,
  FileText,
  RotateCcw,
  HardDrive,
  FolderArchive,
  ArrowRight
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { libraryService } from '../../services/libraryService';
import { useConfirm } from '../../context/ConfirmationContext';
import { extractErrorMessage } from '../../utils/errorHandler';
import './LibraryPage.css';

const DEFAULT_CATEGORIES = [
  'All',
  'Marble & Stone',
  'Veneers & Wood',
  'Hardware',
  'Textures & Paint',
  'Lighting',
  'Furnishings',
  'Sanitaryware',
  'Glass & Metal'
];

export function LibraryPage() {
  const confirm = useConfirm();

  // Active Main Tab: 'MATERIAL' | 'PORTFOLIO' | 'REFERENCE' | 'BOARDS' | 'TRASH'
  const [activeTab, setActiveTab] = useState('MATERIAL');
  const [items, setItems] = useState([]);
  const [boards, setBoards] = useState([]);
  const [trashItems, setTrashItems] = useState([]);
  const [storageUsage, setStorageUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  const [facets, setFacets] = useState(null);

  // Modals & Panels
  const [createItemModalOpen, setCreateItemModalOpen] = useState(false);
  const [createBoardModalOpen, setCreateBoardModalOpen] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [uploadModalItem, setUploadModalItem] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [boardDetailLoading, setBoardDetailLoading] = useState(false);
  const [addEntryModalOpen, setAddEntryModalOpen] = useState(false);
  const [selectedItemForBoard, setSelectedItemForBoard] = useState('');
  const [entryNote, setEntryNote] = useState('');

  // Create Item Form State
  const [itemForm, setItemForm] = useState({
    kind: 'MATERIAL',
    title: '',
    description: '',
    category: 'Marble & Stone',
    tags: '',
    status: 'ACTIVE',
    visibility: 'INTERNAL',
    // Material specific
    brand: '',
    modelCode: '',
    finish: 'Polished',
    color: '#7B6F62',
    size: '',
    unit: 'SQFT',
    indicativeRateRupees: '',
    rateNote: '',
    // Portfolio specific
    city: 'Ahmedabad',
    state: 'Gujarat',
    year: new Date().getFullYear(),
    areaSqft: '',
    role: 'Architecture + Interiors',
    projectId: '',
    // Reference specific
    sourceUrl: '',
    sourceNote: ''
  });

  // Create Board Form State
  const [boardForm, setBoardForm] = useState({
    name: '',
    description: '',
    status: 'ACTIVE'
  });

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch library items from backend
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        kind: activeTab,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (activeCategory !== 'All') params.category = activeCategory;
      if (showFavouritesOnly) params.favourites = 'true';

      const res = await libraryService.getItems(params);
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      console.warn('GET /library/items notice:', err?.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, searchTerm, activeCategory, showFavouritesOnly]);

  // 2. Fetch mood boards from backend
  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await libraryService.getBoards();
      setBoards(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      console.warn('GET /library/boards notice:', err?.message);
      setBoards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Fetch trash items from backend
  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await libraryService.getTrash();
      setTrashItems(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      console.warn('GET /library/trash notice:', err?.message);
      setTrashItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. Initial aggregations: Facets and storage usage
  useEffect(() => {
    libraryService.getFacets().then((res) => {
      if (res) setFacets(res);
    }).catch(() => {});

    libraryService.getStorageUsage().then((res) => {
      if (res) setStorageUsage(res);
    }).catch(() => {});
  }, []);

  // Main data trigger on tab change
  useEffect(() => {
    if (activeTab === 'BOARDS') {
      fetchBoards();
    } else if (activeTab === 'TRASH') {
      fetchTrash();
    } else {
      fetchItems();
    }
  }, [activeTab, fetchItems, fetchBoards, fetchTrash]);

  // Handle Export CSV
  const handleExportCsv = async () => {
    try {
      setActionLoading(true);
      await libraryService.exportCsv();
      showToast('Library exported to CSV successfully.');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to export CSV'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Toggle Favourite
  const handleToggleFavourite = async (item, e) => {
    e?.stopPropagation();
    try {
      if (item.isFavourite) {
        await libraryService.removeFavourite(item._id || item.id);
        showToast(`Removed from favourites.`);
      } else {
        await libraryService.addFavourite(item._id || item.id);
        showToast(`Added to favourites.`);
      }
      fetchItems();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to update favourite'), 'error');
    }
  };

  // Handle Clone Item
  const handleCloneItem = async (item, e) => {
    e?.stopPropagation();
    try {
      setActionLoading(true);
      await libraryService.cloneItem(item._id || item.id);
      showToast(`Cloned item "${item.title}".`);
      fetchItems();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to clone item'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Item
  const handleCreateItemSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    const payload = {
      kind: activeTab === 'BOARDS' || activeTab === 'TRASH' ? 'MATERIAL' : activeTab,
      title: itemForm.title.trim(),
      description: itemForm.description.trim() || undefined,
      tags: itemForm.tags ? itemForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      status: itemForm.status,
      visibility: itemForm.visibility
    };

    if (payload.kind === 'MATERIAL') {
      payload.material = {
        category: itemForm.category,
        brand: itemForm.brand.trim() || undefined,
        modelCode: itemForm.modelCode.trim() || undefined,
        finish: itemForm.finish,
        color: itemForm.color,
        size: itemForm.size.trim() || undefined,
        unit: itemForm.unit,
        indicativeRatePaise: itemForm.indicativeRateRupees ? Math.round(Number(itemForm.indicativeRateRupees) * 100) : undefined,
        rateNote: itemForm.rateNote.trim() || undefined
      };
    } else if (payload.kind === 'PORTFOLIO') {
      payload.portfolio = {
        category: itemForm.category,
        city: itemForm.city.trim(),
        state: itemForm.state.trim() || undefined,
        year: Number(itemForm.year) || new Date().getFullYear(),
        areaSqft: itemForm.areaSqft ? Number(itemForm.areaSqft) : undefined,
        role: itemForm.role.trim() || undefined,
        projectId: itemForm.projectId || undefined
      };
    } else if (payload.kind === 'REFERENCE') {
      payload.reference = {
        category: itemForm.category,
        sourceUrl: itemForm.sourceUrl.trim() || undefined,
        sourceNote: itemForm.sourceNote.trim() || undefined
      };
    }

    try {
      setActionLoading(true);
      await libraryService.createItem(payload);
      showToast(`Item "${payload.title}" created successfully.`);
      setCreateItemModalOpen(false);
      setItemForm({
        kind: 'MATERIAL',
        title: '',
        description: '',
        category: 'Marble & Stone',
        tags: '',
        status: 'ACTIVE',
        visibility: 'INTERNAL',
        brand: '',
        modelCode: '',
        finish: 'Polished',
        color: '#7B6F62',
        size: '',
        unit: 'SQFT',
        indicativeRateRupees: '',
        rateNote: '',
        city: 'Ahmedabad',
        state: 'Gujarat',
        year: new Date().getFullYear(),
        areaSqft: '',
        role: 'Architecture + Interiors',
        projectId: '',
        sourceUrl: '',
        sourceNote: ''
      });
      fetchItems();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to create library item'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Mood Board
  const handleCreateBoardSubmit = async (e) => {
    e.preventDefault();
    if (!boardForm.name.trim()) {
      showToast('Board name is required', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await libraryService.createBoard({
        name: boardForm.name.trim(),
        description: boardForm.description.trim() || undefined,
        status: boardForm.status
      });
      showToast(`Mood Board "${boardForm.name}" created successfully.`);
      setCreateBoardModalOpen(false);
      setBoardForm({ name: '', description: '', status: 'ACTIVE' });
      fetchBoards();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to create mood board'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Item
  const handleDeleteItem = async (item, e) => {
    e?.stopPropagation();
    const confirmed = await confirm({
      title: `Delete ${item.title || 'Item'}?`,
      message: 'Are you sure you want to delete this library record? This operation will soft-delete the item and its assets into trash retention.',
      confirmText: 'Delete Item',
      confirmVariant: 'danger'
    });

    if (!confirmed) return;

    try {
      await libraryService.deleteItem(item._id || item.id);
      showToast(`Item "${item.title || 'Record'}" moved to trash.`);
      fetchItems();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to delete item'), 'error');
    }
  };

  // Handle Restore Item from Trash
  const handleRestoreItem = async (item) => {
    try {
      await libraryService.restoreItem(item._id || item.id);
      showToast(`Item "${item.title}" restored successfully.`);
      fetchTrash();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to restore item'), 'error');
    }
  };

  // Handle Photo Upload
  const handleUploadPhotos = async (e) => {
    e.preventDefault();
    if (!uploadModalItem || !uploadFiles || uploadFiles.length === 0) return;

    try {
      setActionLoading(true);
      await libraryService.uploadPhotos(uploadModalItem._id || uploadModalItem.id, uploadFiles);
      showToast('Photos uploaded and WebP derivatives generated successfully.');
      setUploadModalItem(null);
      setUploadFiles([]);
      fetchItems();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to upload photos'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Full Item Details Modal
  const handleOpenItemDetails = async (item) => {
    setDetailModalItem(item);
    try {
      const full = await libraryService.getItem(item._id || item.id);
      if (full) setDetailModalItem(full);
    } catch (err) {
      console.warn('Could not fetch full details, showing preview', err);
    }
  };

  // Open Board Details
  const handleOpenBoardDetails = async (board) => {
    setSelectedBoard(board);
    setBoardDetailLoading(true);
    try {
      const fullBoard = await libraryService.getBoard(board._id || board.id);
      if (fullBoard) setSelectedBoard(fullBoard);
    } catch (err) {
      console.warn('Failed to load board detail:', err);
    } finally {
      setBoardDetailLoading(false);
    }
  };

  // Add Entry to Board
  const handleAddBoardEntry = async () => {
    if (!selectedBoard || !selectedItemForBoard) return;
    try {
      setActionLoading(true);
      await libraryService.addBoardEntry(selectedBoard._id || selectedBoard.id, {
        itemId: selectedItemForBoard,
        note: entryNote.trim() || undefined
      });
      showToast('Item added to mood board.');
      setAddEntryModalOpen(false);
      setSelectedItemForBoard('');
      setEntryNote('');
      handleOpenBoardDetails(selectedBoard);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to add item to board'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="library-page-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`library-top-toast toast-${toastMessage.type}`}>
          {toastMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="library-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="library-heading">Design Library & Specifications</h1>
            {storageUsage && (
              <span className="library-storage-badge" title="Unified storage quota with Drive">
                <HardDrive size={12} />
                {(storageUsage.totalBytes ? (storageUsage.totalBytes / (1024 * 1024)).toFixed(1) : '0')} MB
              </span>
            )}
          </div>
          <p className="library-subheading">
            Module M2.5 Centralized architectural asset management: materials, portfolio showcases, design references & mood boards
          </p>
        </div>

        <div className="library-header-actions">
          <Button
            variant={showFavouritesOnly ? 'primary' : 'secondary'}
            icon={Star}
            onClick={() => setShowFavouritesOnly(!showFavouritesOnly)}
            title="Filter by starred items"
          >
            {showFavouritesOnly ? 'Favourites Only' : 'All Items'}
          </Button>

          <Button variant="secondary" icon={Download} onClick={handleExportCsv} disabled={actionLoading}>
            Export CSV
          </Button>

          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => {
              if (activeTab === 'BOARDS') fetchBoards();
              else if (activeTab === 'TRASH') fetchTrash();
              else fetchItems();
            }}
            disabled={loading}
          >
            Refresh
          </Button>

          {activeTab === 'BOARDS' ? (
            <Button variant="primary" icon={Plus} onClick={() => setCreateBoardModalOpen(true)}>
              New Mood Board
            </Button>
          ) : activeTab === 'TRASH' ? null : (
            <Button variant="primary" icon={Plus} onClick={() => setCreateItemModalOpen(true)}>
              Add {activeTab === 'MATERIAL' ? 'Material Spec' : activeTab === 'PORTFOLIO' ? 'Portfolio Project' : 'Design Reference'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Kind Tabs */}
      <div className="library-main-tabs">
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'MATERIAL' ? 'active' : ''}`}
          onClick={() => { setActiveTab('MATERIAL'); setSelectedBoard(null); }}
        >
          <Layers size={16} />
          <span>Material Specs</span>
        </button>

        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'PORTFOLIO' ? 'active' : ''}`}
          onClick={() => { setActiveTab('PORTFOLIO'); setSelectedBoard(null); }}
        >
          <Sparkles size={16} />
          <span>Studio Portfolio</span>
        </button>

        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'REFERENCE' ? 'active' : ''}`}
          onClick={() => { setActiveTab('REFERENCE'); setSelectedBoard(null); }}
        >
          <Bookmark size={16} />
          <span>Design References</span>
        </button>

        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'BOARDS' ? 'active' : ''}`}
          onClick={() => { setActiveTab('BOARDS'); setSelectedBoard(null); }}
        >
          <FolderPlus size={16} />
          <span>Mood Boards</span>
        </button>

        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'TRASH' ? 'active' : ''}`}
          onClick={() => { setActiveTab('TRASH'); setSelectedBoard(null); }}
        >
          <FolderArchive size={16} />
          <span>Retention Trash</span>
        </button>
      </div>

      {/* Controls & Filter Bar */}
      {activeTab !== 'BOARDS' && activeTab !== 'TRASH' && (
        <div className="library-controls-bar">
          <div className="category-pills-row">
            {DEFAULT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`cat-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="library-filter-inputs">
            <div className="library-search-wrap">
              <Search size={15} className="search-icon-inside" />
              <input
                type="text"
                placeholder={`Search ${activeTab.toLowerCase()} by name, brand, or tag...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="library-search-input"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="library-status-select"
            >
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>
        </div>
      )}

      {/* Content Rendering */}
      {loading ? (
        <div className="library-loading-state">
          <RefreshCw size={24} className="spin-icon" />
          <span>Loading specifications from backend...</span>
        </div>
      ) : activeTab === 'TRASH' ? (
        /* Retention Trash Tab */
        trashItems.length === 0 ? (
          <div className="library-empty-box">
            <FolderArchive size={44} strokeWidth={1.2} />
            <h3>Trash is Empty</h3>
            <p>Soft-deleted library specifications and photos reside here within the 30-day retention window.</p>
          </div>
        ) : (
          <div className="materials-grid">
            {trashItems.map((item) => (
              <div key={item._id || item.id} className="material-card is-trash">
                <div className="material-card-body">
                  <div className="material-meta-row">
                    <Badge variant="neutral">{item.kind}</Badge>
                    <Badge variant="danger">Soft-Deleted</Badge>
                  </div>
                  <h3 className="material-name">{item.title}</h3>
                  <p className="material-desc-excerpt">{item.description || 'Deleted item'}</p>
                  <div className="material-actions" style={{ marginTop: '12px' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={RotateCcw}
                      onClick={() => handleRestoreItem(item)}
                    >
                      Restore Item
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'BOARDS' ? (
        /* Mood Boards Grid or Board Detail View */
        selectedBoard ? (
          <div className="board-detail-container">
            <div className="board-detail-header">
              <div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedBoard(null)}>
                  &larr; Back to Mood Boards
                </Button>
                <h2 className="board-title" style={{ marginTop: '8px' }}>{selectedBoard.name}</h2>
                <p className="board-desc">{selectedBoard.description || 'No description entered.'}</p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="primary" icon={Plus} onClick={() => setAddEntryModalOpen(true)}>
                  Add Material to Board
                </Button>
                <Button
                  variant="danger"
                  icon={Trash2}
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Delete Mood Board?',
                      message: 'Are you sure you want to delete this mood board and its curated items?',
                      confirmVariant: 'danger'
                    });
                    if (ok) {
                      await libraryService.deleteBoard(selectedBoard._id || selectedBoard.id);
                      showToast('Mood board deleted.');
                      setSelectedBoard(null);
                      fetchBoards();
                    }
                  }}
                >
                  Delete Board
                </Button>
              </div>
            </div>

            {/* Board Entries List */}
            {boardDetailLoading ? (
              <div className="library-loading-state">
                <RefreshCw size={20} className="spin-icon" />
                <span>Loading board entries...</span>
              </div>
            ) : !selectedBoard.entries || selectedBoard.entries.length === 0 ? (
              <div className="library-empty-box">
                <Layers size={40} strokeWidth={1.2} />
                <h3>No Items on this Board Yet</h3>
                <p>Pin materials or design reference inspiration to curate this presentation.</p>
                <Button variant="primary" icon={Plus} onClick={() => setAddEntryModalOpen(true)}>
                  Pin First Material
                </Button>
              </div>
            ) : (
              <div className="materials-grid">
                {selectedBoard.entries.map((entry, idx) => {
                  const it = entry.item || entry;
                  return (
                    <div key={entry._id || entry.id || idx} className="material-card">
                      <div className="material-card-body">
                        <span className="material-code-chip">{it.code || 'MAT'}</span>
                        <h3 className="material-name">{it.title || entry.note || 'Curated Item'}</h3>
                        {entry.note && <p className="spec-val" style={{ fontStyle: 'italic', marginTop: '4px' }}>"{entry.note}"</p>}
                        <div className="material-actions" style={{ marginTop: '12px' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            onClick={async () => {
                              await libraryService.removeBoardEntry(selectedBoard._id || selectedBoard.id, entry._id || entry.id);
                              showToast('Item unpinned from board.');
                              handleOpenBoardDetails(selectedBoard);
                            }}
                          >
                            Unpin
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : boards.length === 0 ? (
          <div className="library-empty-box">
            <FolderPlus size={44} strokeWidth={1.2} />
            <h3>No Mood Boards Found</h3>
            <p>Create visual mood boards to curate materials and finishes for architectural presentations.</p>
            <Button variant="primary" icon={Plus} onClick={() => setCreateBoardModalOpen(true)}>
              Create First Mood Board
            </Button>
          </div>
        ) : (
          <div className="boards-grid">
            {boards.map((b) => (
              <div
                key={b._id || b.id}
                className="board-card"
                onClick={() => handleOpenBoardDetails(b)}
                style={{ cursor: 'pointer' }}
              >
                <div className="board-card-header">
                  <span className="card-code-pill">{b.code || 'BRD-0001'}</span>
                  <Badge variant={b.status === 'ACTIVE' ? 'success' : 'neutral'}>{b.status || 'ACTIVE'}</Badge>
                </div>
                <h3 className="board-title">{b.name}</h3>
                <p className="board-desc">{b.description || 'No description provided.'}</p>
                <div className="board-footer">
                  <span className="board-count">{b.entryCount || 0} Curated Items</span>
                  <span className="board-date">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Items Grid (Materials, Portfolio, Reference) */
        items.length === 0 ? (
          <div className="library-empty-box">
            <Layers size={44} strokeWidth={1.2} />
            <h3>No {activeTab === 'MATERIAL' ? 'Materials' : activeTab === 'PORTFOLIO' ? 'Portfolio Projects' : 'References'} Found</h3>
            <p>
              {searchTerm || activeCategory !== 'All' || showFavouritesOnly
                ? 'No items match your active search filters.'
                : `Add curated ${activeTab.toLowerCase()} items to store specifications directly in the database.`}
            </p>
            <Button variant="primary" icon={Plus} onClick={() => setCreateItemModalOpen(true)}>
              Add {activeTab === 'MATERIAL' ? 'First Material' : 'First Item'}
            </Button>
          </div>
        ) : (
          <div className="materials-grid">
            {items.map((item) => {
              const coverFileId = item.coverFileId || item.cover?.fileId || item.photos?.[0]?._id;
              const coverUrl = coverFileId
                ? libraryService.getThumbUrl(coverFileId)
                : item.cover?.thumbUrl || item.cover?.previewUrl;
              const swatchColor = item.material?.color || '#7B6F62';
              const code = item.code || (item.kind === 'MATERIAL' ? 'MAT' : item.kind === 'PORTFOLIO' ? 'PRT' : 'REF');

              return (
                <div
                  key={item._id || item.id}
                  className="material-card"
                  onClick={() => handleOpenItemDetails(item)}
                >
                  {/* Swatch or Image Cover */}
                  <div
                    className="material-swatch-box"
                    style={{
                      backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: coverUrl ? undefined : swatchColor
                    }}
                  >
                    <span className="material-code-chip">{code}</span>
                    <button
                      type="button"
                      className={`material-fav-chip-btn ${item.isFavourite ? 'is-fav' : ''}`}
                      onClick={(e) => handleToggleFavourite(item, e)}
                      title={item.isFavourite ? 'Remove Favourite' : 'Mark Favourite'}
                    >
                      <Star size={13} fill={item.isFavourite ? '#B89A74' : 'none'} color="#B89A74" />
                    </button>
                  </div>

                  <div className="material-card-body">
                    <div className="material-meta-row">
                      <Badge variant="neutral">{item.material?.category || item.portfolio?.category || item.reference?.category || item.kind}</Badge>
                      <Badge variant={item.status === 'ACTIVE' ? 'success' : 'neutral'}>{item.status}</Badge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="card-code-pill">{code}</span>
                      <h3 className="material-name" style={{ margin: 0 }}>{item.title}</h3>
                    </div>
                    {item.description && <p className="material-desc-excerpt">{item.description}</p>}

                    {/* Specs section based on kind */}
                    {item.kind === 'MATERIAL' && item.material && (
                      <div className="material-specs-list">
                        {item.material.finish && (
                          <div className="spec-row">
                            <span className="spec-label">Finish:</span>
                            <span className="spec-val">{item.material.finish}</span>
                          </div>
                        )}
                        {item.material.brand && (
                          <div className="spec-row">
                            <span className="spec-label">Brand:</span>
                            <span className="spec-val">{item.material.brand}</span>
                          </div>
                        )}
                        {item.material.indicativeRatePaise && (
                          <div className="spec-row">
                            <span className="spec-label">Rate:</span>
                            <span className="spec-val">₹{(item.material.indicativeRatePaise / 100).toLocaleString('en-IN')} /{item.material.unit || 'sqft'}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {item.kind === 'PORTFOLIO' && item.portfolio && (
                      <div className="material-specs-list">
                        {item.portfolio.city && (
                          <div className="spec-row">
                            <span className="spec-label">Location:</span>
                            <span className="spec-val">{item.portfolio.city}</span>
                          </div>
                        )}
                        {item.portfolio.year && (
                          <div className="spec-row">
                            <span className="spec-label">Year:</span>
                            <span className="spec-val">{item.portfolio.year}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="material-actions" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={ImageIcon}
                        onClick={() => setUploadModalItem(item)}
                        title="Upload Photos"
                      >
                        {item.photoCount || 0} Photos
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Copy}
                        onClick={(e) => handleCloneItem(item, e)}
                        title="Clone Item"
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={(e) => handleDeleteItem(item, e)}
                        title="Move to Trash"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Modal: Create Item */}
      <Modal
        isOpen={createItemModalOpen}
        onClose={() => setCreateItemModalOpen(false)}
        title={`Add New ${activeTab === 'MATERIAL' ? 'Material Specification' : activeTab === 'PORTFOLIO' ? 'Portfolio Project' : 'Design Reference'}`}
        size="lg"
      >
        <form onSubmit={handleCreateItemSubmit} className="lib-modal-form">
          <Input
            label="Title / Name *"
            placeholder="e.g. Calacatta Gold Italian Marble Slab"
            value={itemForm.title}
            onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
            required
          />

          <div className="form-grid-2">
            <Select
              label="Category"
              value={itemForm.category}
              onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
              options={DEFAULT_CATEGORIES.filter((c) => c !== 'All').map((c) => ({ value: c, label: c }))}
            />

            <Input
              label="Tags (Comma separated)"
              placeholder="e.g. marble, luxury, flooring"
              value={itemForm.tags}
              onChange={(e) => setItemForm({ ...itemForm, tags: e.target.value })}
            />
          </div>

          <div className="form-field-group">
            <label className="field-label">Description</label>
            <textarea
              className="field-textarea"
              rows={3}
              placeholder="Detailed architectural and material description..."
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            />
          </div>

          {activeTab === 'MATERIAL' && (
            <>
              <h4 className="section-divider-title">Material Properties</h4>
              <div className="form-grid-2">
                <Input
                  label="Brand / Supplier"
                  placeholder="e.g. Classic Marble Co."
                  value={itemForm.brand}
                  onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })}
                />
                <Input
                  label="Model / Product Code"
                  placeholder="e.g. CL-GLD-88"
                  value={itemForm.modelCode}
                  onChange={(e) => setItemForm({ ...itemForm, modelCode: e.target.value })}
                />
              </div>

              <div className="form-grid-3">
                <Input
                  label="Finish"
                  placeholder="e.g. Polished / Honed"
                  value={itemForm.finish}
                  onChange={(e) => setItemForm({ ...itemForm, finish: e.target.value })}
                />
                <Input
                  label="Size / Dimensions"
                  placeholder="e.g. 1200 x 600 mm"
                  value={itemForm.size}
                  onChange={(e) => setItemForm({ ...itemForm, size: e.target.value })}
                />
                <Input
                  label="Unit"
                  placeholder="e.g. SQFT, SQM, NOS"
                  value={itemForm.unit}
                  onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                />
              </div>

              <div className="form-grid-2">
                <Input
                  label="Indicative Rate (₹)"
                  type="number"
                  placeholder="e.g. 450"
                  value={itemForm.indicativeRateRupees}
                  onChange={(e) => setItemForm({ ...itemForm, indicativeRateRupees: e.target.value })}
                />
                <Input
                  label="Rate Note / Tax Note"
                  placeholder="e.g. Ex-factory, GST extra"
                  value={itemForm.rateNote}
                  onChange={(e) => setItemForm({ ...itemForm, rateNote: e.target.value })}
                />
              </div>
            </>
          )}

          {activeTab === 'PORTFOLIO' && (
            <>
              <h4 className="section-divider-title">Portfolio Showcase Details</h4>
              <div className="form-grid-3">
                <Input
                  label="City"
                  placeholder="e.g. Ahmedabad"
                  value={itemForm.city}
                  onChange={(e) => setItemForm({ ...itemForm, city: e.target.value })}
                />
                <Input
                  label="Year"
                  type="number"
                  placeholder="e.g. 2026"
                  value={itemForm.year}
                  onChange={(e) => setItemForm({ ...itemForm, year: e.target.value })}
                />
                <Input
                  label="Built-up Area (Sq.Ft)"
                  type="number"
                  placeholder="e.g. 4500"
                  value={itemForm.areaSqft}
                  onChange={(e) => setItemForm({ ...itemForm, areaSqft: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="modal-actions-bar">
            <Button variant="secondary" onClick={() => setCreateItemModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading}>
              Save Specification
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Mood Board */}
      <Modal
        isOpen={createBoardModalOpen}
        onClose={() => setCreateBoardModalOpen(false)}
        title="Create New Mood Board"
        size="md"
      >
        <form onSubmit={handleCreateBoardSubmit} className="lib-modal-form">
          <Input
            label="Board Name *"
            placeholder="e.g. Penthouse Living Room Finishes"
            value={boardForm.name}
            onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })}
            required
          />

          <div className="form-field-group">
            <label className="field-label">Description</label>
            <textarea
              className="field-textarea"
              rows={3}
              placeholder="Curated mood board notes and design intent..."
              value={boardForm.description}
              onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })}
            />
          </div>

          <div className="modal-actions-bar">
            <Button variant="secondary" onClick={() => setCreateBoardModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading}>
              Create Board
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Upload Photos */}
      <Modal
        isOpen={Boolean(uploadModalItem)}
        onClose={() => setUploadModalItem(null)}
        title={`Upload Photos for "${uploadModalItem?.title}"`}
        size="md"
      >
        <form onSubmit={handleUploadPhotos} className="lib-modal-form">
          <p className="modal-help-text">
            Upload high-resolution photographs. The server processes WebP thumbnails (320px) and previews (1280px) using Sharp with 50MP decode protection.
          </p>

          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setUploadFiles(e.target.files)}
            className="file-upload-input"
            required
          />

          <div className="modal-actions-bar">
            <Button variant="secondary" onClick={() => setUploadModalItem(null)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading}>
              Upload Photos
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Material to Mood Board */}
      <Modal
        isOpen={addEntryModalOpen}
        onClose={() => setAddEntryModalOpen(false)}
        title="Pin Material to Mood Board"
        size="md"
      >
        <div className="lib-modal-form">
          <div className="form-field-group">
            <label className="field-label">Select Item *</label>
            <select
              value={selectedItemForBoard}
              onChange={(e) => setSelectedItemForBoard(e.target.value)}
              className="field-textarea"
              style={{ height: '42px', padding: '8px' }}
            >
              <option value="">-- Choose from Library --</option>
              {items.map((it) => (
                <option key={it._id || it.id} value={it._id || it.id}>
                  [{it.code || it.kind}] {it.title}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Placement Note / Usage Area"
            placeholder="e.g. Master Bedroom Accent Wall"
            value={entryNote}
            onChange={(e) => setEntryNote(e.target.value)}
          />

          <div className="modal-actions-bar">
            <Button variant="secondary" onClick={() => setAddEntryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedItemForBoard || actionLoading}
              onClick={handleAddBoardEntry}
            >
              Pin to Board
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Item Detail Preview */}
      <Modal
        isOpen={Boolean(detailModalItem)}
        onClose={() => setDetailModalItem(null)}
        title={detailModalItem?.title || 'Specification Details'}
        size="lg"
      >
        {detailModalItem && (
          <div className="detail-modal-content">
            <div className="detail-header-chips">
              <Badge variant="primary">{detailModalItem.kind}</Badge>
              <Badge variant="neutral">{detailModalItem.code || 'M2.5'}</Badge>
              <Badge variant={detailModalItem.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {detailModalItem.status}
              </Badge>
              {detailModalItem.visibility && (
                <Badge variant="neutral">{detailModalItem.visibility}</Badge>
              )}
            </div>

            <p className="detail-desc">{detailModalItem.description || 'No detailed description entered.'}</p>

            {detailModalItem.material && (
              <div className="detail-specs-table">
                <h4>Material Specifications</h4>
                <div className="spec-grid">
                  <div><strong>Category:</strong> {detailModalItem.material.category || '-'}</div>
                  <div><strong>Brand:</strong> {detailModalItem.material.brand || '-'}</div>
                  <div><strong>Model Code:</strong> {detailModalItem.material.modelCode || '-'}</div>
                  <div><strong>Finish:</strong> {detailModalItem.material.finish || '-'}</div>
                  <div><strong>Size:</strong> {detailModalItem.material.size || '-'}</div>
                  <div>
                    <strong>Rate:</strong>{' '}
                    {detailModalItem.material.indicativeRatePaise
                      ? `₹${(detailModalItem.material.indicativeRatePaise / 100).toLocaleString('en-IN')} / ${detailModalItem.material.unit || 'sqft'}`
                      : '-'}
                  </div>
                </div>
              </div>
            )}

            {detailModalItem.portfolio && (
              <div className="detail-specs-table">
                <h4>Portfolio Specifications</h4>
                <div className="spec-grid">
                  <div><strong>Location:</strong> {detailModalItem.portfolio.city}, {detailModalItem.portfolio.state || ''}</div>
                  <div><strong>Completion Year:</strong> {detailModalItem.portfolio.year || '-'}</div>
                  <div><strong>Area:</strong> {detailModalItem.portfolio.areaSqft ? `${detailModalItem.portfolio.areaSqft} Sq.Ft` : '-'}</div>
                  <div><strong>Role:</strong> {detailModalItem.portfolio.role || '-'}</div>
                </div>
              </div>
            )}

            <div className="modal-actions-bar">
              <Button variant="secondary" onClick={() => setDetailModalItem(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default LibraryPage;
