import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../IconButton/IconButton';
import './Modal.css';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '500px',
  showClose = true
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          {title && <h2 id="modal-title" className="modal-title">{title}</h2>}
          {showClose && (
            <IconButton
              icon={X}
              onClick={onClose}
              title="Close modal"
              ariaLabel="Close modal"
              size="sm"
            />
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
