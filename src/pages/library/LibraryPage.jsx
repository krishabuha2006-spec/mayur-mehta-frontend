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
  AlertCircle
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
  'Furnishings'
];

export function LibraryPage() {
  const confirm = useConfirm();

  // Active Main Tab: 'MATERIAL' | 'PORTFOLIO' | 'REFERENCE' | 'BOARDS'
  const [activeTab, setActiveTab] = useState('MATERIAL');
  const [items, setItems] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [facets, setFacets] = useState(null);

  // Modals
  const [createItemModalOpen, setCreateItemModalOpen] = useState(false);
  const [createBoardModalOpen, setCreateBoardModalOpen] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [uploadModalItem, setUploadModalItem] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);

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
    finish: 'Polished',
    color: '#7B6F62',
    size: '',
    unit: 'SQFT',
    indicativeRateRupees: '',
    rateNote: '',
    // Portfolio specific
    city: 'Ahmedabad',
    year: new Date().getFullYear(),
    areaSqft: '',
    role: 'Principal Architect',
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

  // Fetch items from backend
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        kind: activeTab,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (activeCategory !== 'All') params.category = activeCategory;

      const res = await libraryService.getItems(params);
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      console.warn('GET /library/items notice:', err?.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, searchTerm, activeCategory]);

  // Fetch mood boards from backend
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

  // Fetch facets once
  useEffect(() => {
    libraryService.getFacets().then((res) => {
      if (res) setFacets(res);
    }).catch(() => {});
  }, []);

  // Main data trigger
  useEffect(() => {
    if (activeTab === 'BOARDS') {
      fetchBoards();
    } else {
      fetchItems();
    }
  }, [activeTab, fetchItems, fetchBoards]);

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

  // Handle Create Item
  const handleCreateItemSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    const payload = {
      kind: activeTab === 'BOARDS' ? 'MATERIAL' : activeTab,
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
        year: Number(itemForm.year) || new Date().getFullYear(),
        areaSqft: itemForm.areaSqft ? Number(itemForm.areaSqft) : undefined,
        role: itemForm.role.trim() || undefined
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
        finish: 'Polished',
        color: '#7B6F62',
        size: '',
        unit: 'SQFT',
        indicativeRateRupees: '',
        rateNote: '',
        city: 'Ahmedabad',
        year: new Date().getFullYear(),
        areaSqft: '',
        role: 'Principal Architect',
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
      message: 'Are you sure you want to delete this library record? This operation will soft-delete the item and its assets.',
      confirmText: 'Delete Item',
      confirmVariant: 'danger'
    });

    if (!confirmed) return;

    try {
      await libraryService.deleteItem(item._id || item.id);
      showToast(`Item "${item.title || 'Record'}" deleted.`);
      fetchItems();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to delete item'), 'error');
    }
  };

  // Handle Photo Upload
  const handleUploadPhotos = async (e) => {
    e.preventDefault();
    if (!uploadModalItem || !uploadFiles || uploadFiles.length === 0) return;

    try {
      setActionLoading(true);
      await libraryService.uploadPhotos(uploadModalItem._id || uploadModalItem.id, uploadFiles);
      showToast('Photos uploaded successfully.');
      setUploadModalItem(null);
      setUploadFiles([]);
      fetchItems();
    } catch (err) {
      showToast(extractErrorMessage(err, 'Failed to upload photos'), 'error');
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
          <h1 className="library-heading">Design Library & Materials</h1>
          <p className="library-subheading">
            Curated architectural specifications, materials, portfolio showcases, and design mood boards
          </p>
        </div>

        <div className="library-header-actions">
          <Button variant="secondary" icon={Download} onClick={handleExportCsv} disabled={actionLoading}>
            Export CSV
          </Button>

          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => (activeTab === 'BOARDS' ? fetchBoards() : fetchItems())}
            disabled={loading}
          >
            Refresh
          </Button>

          {activeTab === 'BOARDS' ? (
            <Button variant="primary" icon={Plus} onClick={() => setCreateBoardModalOpen(true)}>
              New Mood Board
            </Button>
          ) : (
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
          onClick={() => setActiveTab('MATERIAL')}
        >
          <Layers size={16} />
          <span>Material Specs</span>
        </button>

        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'PORTFOLIO' ? 'active' : ''}`}
          onClick={() => setActiveTab('PORTFOLIO')}
        >
          <Sparkles size={16} />
          <span>Studio Portfolio</span>
        </button>

        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'REFERENCE' ? 'active' : ''}`}
          onClick={() => setActiveTab('REFERENCE')}
        >
          <Bookmark size={16} />
          <span>Design References</span>
        </button>

        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'BOARDS' ? 'active' : ''}`}
          onClick={() => setActiveTab('BOARDS')}
        >
          <FolderPlus size={16} />
          <span>Mood Boards</span>
        </button>
      </div>

      {/* Controls & Filter Bar */}
      {activeTab !== 'BOARDS' && (
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
                placeholder={`Search ${activeTab.toLowerCase()}...`}
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
      ) : activeTab === 'BOARDS' ? (
        /* Mood Boards Grid */
        boards.length === 0 ? (
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
              <div key={b._id || b.id} className="board-card">
                <div className="board-card-header">
                  <span className="board-code">{b.code || 'BRD'}</span>
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
              {searchTerm || activeCategory !== 'All'
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
              const coverUrl = item.cover?.thumbUrl || item.cover?.previewUrl;
              const swatchColor = item.material?.color || '#7B6F62';
              const code = item.code || (item.kind === 'MATERIAL' ? 'MAT' : item.kind === 'PORTFOLIO' ? 'PRT' : 'REF');

              return (
                <div
                  key={item._id || item.id}
                  className="material-card"
                  onClick={() => setDetailModalItem(item)}
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
                    {item.isFavourite && (
                      <span className="material-fav-chip">
                        <Bookmark size={12} fill="#B89A74" color="#B89A74" />
                      </span>
                    )}
                  </div>

                  <div className="material-card-body">
                    <div className="material-meta-row">
                      <Badge variant="neutral">{item.material?.category || item.portfolio?.category || item.reference?.category || item.kind}</Badge>
                      <Badge variant={item.status === 'ACTIVE' ? 'success' : 'neutral'}>{item.status}</Badge>
                    </div>

                    <h3 className="material-name">{item.title}</h3>
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
                        icon={Trash2}
                        onClick={(e) => handleDeleteItem(item, e)}
                        title="Delete Item"
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
                  label="Finish"
                  placeholder="e.g. Polished / Honed / Flamed"
                  value={itemForm.finish}
                  onChange={(e) => setItemForm({ ...itemForm, finish: e.target.value })}
                />
              </div>

              <div className="form-grid-3">
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
                <Input
                  label="Indicative Rate (₹)"
                  type="number"
                  placeholder="e.g. 450"
                  value={itemForm.indicativeRateRupees}
                  onChange={(e) => setItemForm({ ...itemForm, indicativeRateRupees: e.target.value })}
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
            Upload site or catalog photos. The backend will automatically generate optimized WebP thumbnails and previews.
          </p>

          <input
            type="file"
            multiple
            accept="image/*"
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
              <Badge variant="neutral">{detailModalItem.code}</Badge>
              <Badge variant={detailModalItem.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {detailModalItem.status}
              </Badge>
            </div>

            <p className="detail-desc">{detailModalItem.description || 'No description entered.'}</p>

            {detailModalItem.material && (
              <div className="detail-specs-table">
                <h4>Material Specifications</h4>
                <div className="spec-grid">
                  <div><strong>Category:</strong> {detailModalItem.material.category || '-'}</div>
                  <div><strong>Brand:</strong> {detailModalItem.material.brand || '-'}</div>
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
