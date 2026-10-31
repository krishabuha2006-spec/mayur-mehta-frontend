import { apiClient } from './apiClient';

const LIBRARY_CACHE_KEY = 'mm_persistent_materials';

const getCachedMaterials = () => {
  try {
    const raw = localStorage.getItem(LIBRARY_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setCachedMaterials = (items) => {
  try {
    localStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify(items));
  } catch {}
};

export const libraryService = {
  getMaterials: async () => {
    return getCachedMaterials();
  },

  createMaterial: async (data) => {
    const created = {
      ...data,
      id: data.id || `mat_${Date.now()}`
    };
    const current = getCachedMaterials();
    const updated = [created, ...current.filter((m) => (m.id || m._id) !== (created.id || created._id))];
    setCachedMaterials(updated);
    return created;
  },

  updateMaterial: async (id, data) => {
    const updated = { ...data, id };
    const current = getCachedMaterials();
    setCachedMaterials(current.map((m) => ((m.id || m._id) === id ? { ...m, ...updated } : m)));
    return updated;
  },

  deleteMaterial: async (id) => {
    const current = getCachedMaterials();
    setCachedMaterials(current.filter((m) => (m.id || m._id) !== id));
    return true;
  }
};

export default libraryService;
