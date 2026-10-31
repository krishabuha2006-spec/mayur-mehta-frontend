import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Plus,
  Eye,
  Bookmark,
  Share2,
  Tag
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { libraryService } from '../../services/libraryService';
import './LibraryPage.css';

export function LibraryPage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const list = await libraryService.getMaterials();
        setMaterials(Array.isArray(list) ? list : []);
      } catch (err) {
        console.warn('GET /library API notice:', err?.response?.status || err.message);
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [newMat, setNewMat] = useState({
    name: '',
    category: 'Marble & Stone',
    code: '',
    finish: 'Polished',
    thickness: '18mm',
    vendor: '',
    swatchColor: '#7B6F62'
  });

  const categories = ['All', 'Marble & Stone', 'Veneers & Wood', 'Hardware', 'Textures & Paint'];

  const filtered = materials.filter((m) => {
    const matchesSearch =
      (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.vendor || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = activeCategory === 'All' || m.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newMat.name) return;
    try {
      const created = await libraryService.createMaterial(newMat);
      setMaterials([created, ...materials]);
    } catch (err) {
      console.warn('Create material notice:', err);
    }
    setCreateModalOpen(false);
    setNewMat({
      name: '',
      category: 'Marble & Stone',
      code: '',
      finish: 'Polished',
      thickness: '18mm',
      vendor: '',
      swatchColor: '#7B6F62'
    });
  };

  return (
    <div className="library-page-container">
      <div className="library-header-row">
        <div>
          <h1 className="library-heading">Design Library & Materials</h1>
          <p className="library-subheading">Curated architectural finishes, veneers, Italian marble, and hardware specifications</p>
        </div>

        <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
          Add Material Spec
        </Button>
      </div>

      {/* Category Pills & Search */}
      <div className="library-controls-bar">
        <div className="category-pills-row">
          {categories.map((cat) => (
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

        <div className="library-search-wrap">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            placeholder="Search material specifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="library-search-input"
          />
        </div>
      </div>

      {/* Materials Grid */}
      <div className="materials-grid">
        {filtered.map((mat) => (
          <div key={mat.id} className="material-card">
            {/* Color Swatch Surface */}
            <div className="material-swatch-box" style={{ backgroundColor: mat.swatchColor }}>
              <span className="material-code-chip">{mat.code}</span>
            </div>

            <div className="material-card-body">
              <Badge variant="ext-2">{mat.category}</Badge>
              <h3 className="material-name">{mat.name}</h3>

              <div className="material-specs-list">
                <div className="spec-row">
                  <span className="spec-label">Finish:</span>
                  <span className="spec-val">{mat.finish}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Thickness:</span>
                  <span className="spec-val">{mat.thickness}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Vendor:</span>
                  <span className="spec-val">{mat.vendor}</span>
                </div>
              </div>

              <div className="material-actions">
                <Button size="sm" variant="secondary" icon={Bookmark} onClick={() => alert(`Added ${mat.name} to project moodboard!`)}>
                  Pin to Board
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Material Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add Material Specification">
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-grid-2">
            <div style={{ gridColumn: 'span 2' }}>
              <Input
                label="Material / Finish Name *"
                id="mat-name"
                placeholder="Enter material title"
                value={newMat.name}
                onChange={(e) => setNewMat({ ...newMat, name: e.target.value })}
                required
              />
            </div>

            <Select
              label="Category *"
              id="mat-cat"
              value={newMat.category}
              onChange={(e) => setNewMat({ ...newMat, category: e.target.value })}
              options={[
                { value: 'Marble & Stone', label: 'Marble & Stone', sublabel: 'Italian, Granite, Travertine' },
                { value: 'Veneers & Wood', label: 'Veneers & Wood', sublabel: 'Natural, Dyed, Teak, Oak' },
                { value: 'Hardware', label: 'Hardware', sublabel: 'Architectural Fittings & Hinges' },
                { value: 'Textures & Paint', label: 'Textures & Paint', sublabel: 'Lime Plaster, Micro-topping' }
              ]}
              required
            />

            <Input
              label="Finish / Polish Type"
              id="mat-finish"
              placeholder="Enter finish texture"
              value={newMat.finish}
              onChange={(e) => setNewMat({ ...newMat, finish: e.target.value })}
            />

            <Input
              label="Supplier / Vendor"
              id="mat-vendor"
              placeholder="Enter vendor or manufacturer"
              value={newMat.vendor}
              onChange={(e) => setNewMat({ ...newMat, vendor: e.target.value })}
            />

            <Input
              label="Color Swatch (Hex)"
              id="mat-hex"
              placeholder="Enter HEX color code"
              value={newMat.swatchColor}
              onChange={(e) => setNewMat({ ...newMat, swatchColor: e.target.value })}
            />
          </div>

          <div className="form-actions-row">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Specification
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
