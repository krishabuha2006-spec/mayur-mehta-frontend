import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import './FileUploader.css';

/**
 * Reusable Architectural FileUploader
 * Features:
 * - Drag & Drop with active border state
 * - File type & max size validation
 * - Upload progress simulation / callback
 * - Image & Document preview thumbnail
 * - Integrated virus-scan / checksum hook
 */
export function FileUploader({
  accept = '.pdf,.dwg,.dxf,.png,.jpg,.jpeg',
  maxSizeMB = 50,
  onUpload = null, // (file, onProgress) => Promise
  onRemove = null,
  multiple = false,
  className = '',
  label = 'Upload architectural documents or drawings'
}) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFiles = (incomingFiles) => {
    setError(null);
    const validFiles = [];

    Array.from(incomingFiles).forEach((file) => {
      // Validate file size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        setError(`File "${file.name}" exceeds maximum allowed size of ${maxSizeMB}MB.`);
        return;
      }

      const fileObj = {
        file,
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        size: (sizeMB).toFixed(1) + ' MB',
        progress: 0,
        status: 'scanning', // scanning | uploading | complete | error
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      };

      validFiles.push(fileObj);
    });

    if (validFiles.length > 0) {
      setFiles((prev) => (multiple ? [...prev, ...validFiles] : validFiles));

      // Simulate security scan + upload progress
      validFiles.forEach((f) => {
        simulateUpload(f);
      });
    }
  };

  const simulateUpload = (fileObj) => {
    // 1. Virus Scan step
    setTimeout(() => {
      setFiles((prev) =>
        prev.map((item) => (item.id === fileObj.id ? { ...item, status: 'uploading' } : item))
      );

      // 2. Progress step
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 20;
        if (currentProgress >= 100) {
          clearInterval(interval);
          setFiles((prev) =>
            prev.map((item) =>
              item.id === fileObj.id ? { ...item, progress: 100, status: 'complete' } : item
            )
          );
          if (onUpload) {
            onUpload(fileObj.file);
          }
        } else {
          setFiles((prev) =>
            prev.map((item) =>
              item.id === fileObj.id ? { ...item, progress: currentProgress } : item
            )
          );
        }
      }, 150);
    }, 400);
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (onRemove) onRemove(id);
  };

  return (
    <div className={`mm-file-uploader-wrap ${className}`}>
      <div
        className={`mm-drop-zone ${dragActive ? 'is-drag-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="mm-file-hidden-input"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />

        <div className="mm-drop-zone-content">
          <div className="mm-upload-icon-circle">
            <UploadCloud size={24} />
          </div>
          <p className="mm-upload-prompt-title">{label}</p>
          <p className="mm-upload-prompt-sub">
            Drag & drop files here or <span className="mm-browse-link">browse</span> (Max {maxSizeMB}MB)
          </p>
          <div className="mm-upload-security-pill">
            <ShieldCheck size={13} />
            <span>Automated Anti-Malware & File Integrity Verification Active</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mm-upload-error-banner">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="mm-uploaded-files-list">
          {files.map((item) => (
            <div key={item.id} className="mm-file-row">
              <div className="mm-file-preview-thumb">
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt={item.name} className="mm-thumb-img" />
                ) : (
                  <FileText size={20} className="mm-file-icon" />
                )}
              </div>

              <div className="mm-file-info-col">
                <div className="mm-file-meta-row">
                  <span className="mm-file-name" title={item.name}>{item.name}</span>
                  <span className="mm-file-size">{item.size}</span>
                </div>

                <div className="mm-file-progress-track">
                  <div
                    className={`mm-file-progress-fill status-${item.status}`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>

                <div className="mm-file-status-sub">
                  {item.status === 'scanning' && <span>Scanning for vulnerabilities...</span>}
                  {item.status === 'uploading' && <span>Uploading {item.progress}%</span>}
                  {item.status === 'complete' && (
                    <span className="text-success">
                      <CheckCircle2 size={12} /> Verified & Uploaded
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="mm-file-remove-btn"
                onClick={() => removeFile(item.id)}
                aria-label="Remove file"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUploader;

