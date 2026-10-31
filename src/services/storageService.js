import { apiClient } from './apiClient';

const STORAGE_CACHE_KEY = 'mm_persistent_drive_files';

const getCachedFiles = () => {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setCachedFiles = (files) => {
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(files));
  } catch {}
};

export const storageService = {
  getFiles: async (params = {}) => {
    return getCachedFiles();
  },

  saveFile: async (fileData) => {
    const saved = {
      ...fileData,
      id: fileData.id || `file_${Date.now()}`,
      uploadedAt: new Date().toISOString()
    };
    const current = getCachedFiles();
    const updated = [saved, ...current.filter((f) => (f.id || f._id) !== (saved.id || saved._id))];
    setCachedFiles(updated);
    return saved;
  },

  deleteFile: async (id) => {
    const current = getCachedFiles();
    const updated = current.filter((f) => (f.id || f._id) !== id);
    setCachedFiles(updated);
    return true;
  },

  downloadFile: (file) => {
    const fileName = file.name || 'Architectural_Drawing.pdf';
    const isDwg = fileName.toLowerCase().endsWith('.dwg');

    const content = isDwg
      ? `AC1032 AutoCAD DWG Drawing File\nProject: ${file.project}\nCategory: ${file.category}\nRevision: ${file.revision}\nAuthor: ${file.uploadedBy}\nMayur Mehta Design Practice 2026`
      : `%PDF-1.4\n%Mayur Mehta Design Architectural Drawing Sheet\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 842 595]/Parent 2 0 R/Contents 4 0 R>>endobj\n4 0 obj<</Length 120>>stream\nBT\n/F1 18 Tf\n50 500 Td\n(Mayur Mehta Design - ${fileName}) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000115 00000 n\n0000000210 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n380\n%%EOF`;

    const mime = isDwg ? 'application/acad' : 'application/pdf';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

export default storageService;
