import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Toast } from '../components/common/Toast/Toast';

let globalListeners = [];
let toastsState = [];

const notifyListeners = () => {
  globalListeners.forEach((fn) => fn([...toastsState]));
};

export const showGlobalToast = (message, type = 'info', duration = 4000) => {
  const id = Date.now() + Math.random().toString(36).substring(2, 9);
  const toastItem = { id, message, type };
  toastsState = [...toastsState, toastItem];
  notifyListeners();

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }
  return id;
};

export const dismissToast = (id) => {
  toastsState = toastsState.filter((t) => t.id !== id);
  notifyListeners();
};

export function ToastPortal() {
  const [toasts, setToasts] = useState(toastsState);

  useEffect(() => {
    globalListeners.push(setToasts);
    return () => {
      globalListeners = globalListeners.filter((fn) => fn !== setToasts);
    };
  }, []);

  if (typeof document === 'undefined' || toasts.length === 0) return null;

  return ReactDOM.createPortal(
    <div className="toast-container" style={{ position: 'fixed', top: 24, right: 28, zIndex: 999999 }}>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          type={t.type}
          message={t.message}
          onClose={() => dismissToast(t.id)}
        />
      ))}
    </div>,
    document.body
  );
}

export function useToast() {
  const [toasts, setToasts] = useState(toastsState);

  useEffect(() => {
    globalListeners.push(setToasts);
    return () => {
      globalListeners = globalListeners.filter((fn) => fn !== setToasts);
    };
  }, []);

  const showToast = useCallback((msg, type = 'info', duration = 4000) => {
    return showGlobalToast(msg, type, duration);
  }, []);

  return {
    showToast,
    dismissToast,
    toasts,
    ToastPortal
  };
}

export default useToast;
