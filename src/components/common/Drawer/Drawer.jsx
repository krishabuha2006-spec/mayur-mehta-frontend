import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './Drawer.css';

/**
 * Reusable Architectural Drawer
 * Right-anchored sliding sheet with frosted backdrop overlay,
 * keyboard accessibility (Esc to close), and modular header/body/footer.
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer = null,
  width = '480px',
  className = ''
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
    <div className="mm-drawer-overlay" onClick={onClose}>
      <div
        className={`mm-drawer-sheet ${className}`}
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mm-drawer-header">
          <div className="mm-drawer-title-group">
            <h2 className="mm-drawer-title">{title}</h2>
            {subtitle && <p className="mm-drawer-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="mm-drawer-close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mm-drawer-body">{children}</div>

        {footer && <div className="mm-drawer-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Drawer;

