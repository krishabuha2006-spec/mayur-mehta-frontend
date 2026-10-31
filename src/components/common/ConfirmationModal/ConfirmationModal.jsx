import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, HelpCircle, AlertCircle, Info, X } from 'lucide-react';
import { Button } from '../Button/Button';
import './ConfirmationModal.css';

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Please Confirm',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary' | 'info'
  icon = null,
  isLoading = false
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    if (icon) return icon;
    if (variant === 'danger') return <Trash2 size={24} strokeWidth={2} />;
    if (variant === 'warning') return <AlertTriangle size={24} strokeWidth={2} />;
    if (variant === 'info') return <Info size={24} strokeWidth={2} />;
    return <HelpCircle size={24} strokeWidth={2} />;
  };

  return (
    <div className="confirm-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="confirm-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
      >
        <button
          type="button"
          className="confirm-modal-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        <div className="confirm-modal-body">
          <div className={`confirm-icon-badge confirm-icon-${variant}`}>
            {renderIcon()}
          </div>

          <div className="confirm-text-block">
            <h3 id="confirm-modal-title" className="confirm-title">
              {title}
            </h3>
            <p id="confirm-modal-desc" className="confirm-message">
              {message}
            </p>
          </div>
        </div>

        <div className="confirm-modal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="confirm-btn-cancel"
          >
            {cancelText}
          </Button>
          <Button
            ref={confirmBtnRef}
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            className="confirm-btn-action"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

