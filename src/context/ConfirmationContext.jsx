import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { ConfirmationModal } from '../components/common/ConfirmationModal/ConfirmationModal';

const ConfirmationContext = createContext(null);

export function ConfirmationProvider({ children }) {
  const [config, setConfig] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      if (typeof options === 'string') {
        setConfig({
          message: options,
          title: 'Please Confirm',
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          variant: 'danger',
          isOpen: true
        });
      } else {
        setConfig({
          title: options.title || 'Please Confirm',
          message: options.message || 'Are you sure you want to proceed?',
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          variant: options.variant || 'danger',
          icon: options.icon || null,
          isOpen: true
        });
      }
    });
  }, []);

  const handleClose = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setConfig(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setConfig(null);
  }, []);

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      {config && (
        <ConfirmationModal
          isOpen={config.isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={config.title}
          message={config.message}
          confirmText={config.confirmText}
          cancelText={config.cancelText}
          variant={config.variant}
          icon={config.icon}
        />
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    // Fallback in case useConfirm is called outside provider
    return async (options) => {
      const msg = typeof options === 'string' ? options : options?.message || 'Are you sure?';
      return window.confirm(msg);
    };
  }
  return context;
}

