import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

/**
 * Reusable Architectural Toast conforming to Mayur Mehta Design System
 * Variants: 'success' | 'warning' | 'error' | 'info'
 */
export function Toast({
  type = 'info',
  title = null,
  message,
  onClose,
  className = ''
}) {
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} className="toast-icon success" />;
      case 'warning': return <AlertTriangle size={18} className="toast-icon warning" />;
      case 'error': return <AlertCircle size={18} className="toast-icon error" />;
      default: return <Info size={18} className="toast-icon info" />;
    }
  };

  const defaultTitle = type === 'success' ? 'Success' : (type === 'error' ? 'Notice' : (type === 'warning' ? 'Warning' : 'Information'));

  return (
    <div className={`mm-toast mm-toast-${type} ${className}`} role="alert">
      <div className="mm-toast-icon-wrap">
        {getIcon()}
      </div>
      <div className="mm-toast-body">
        <div className="mm-toast-title">{title || defaultTitle}</div>
        <div className="mm-toast-message">{message}</div>
      </div>
      {onClose && (
        <button type="button" className="mm-toast-close" onClick={onClose} aria-label="Dismiss">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export default Toast;

