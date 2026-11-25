import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './Dropdown.css';

export function Dropdown({
  trigger,
  children,
  align = 'right',
  className = '',
  menuClassName = '',
  usePortal = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, right: 0, placement: 'bottom' });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const calculateCoords = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // Check if dropdown should pop upwards if space below is limited (< 260px)
    const isAbove = spaceBelow < 260 && spaceAbove > spaceBelow;
    const availableHeight = isAbove
      ? Math.max(160, spaceAbove - 20)
      : Math.max(160, spaceBelow - 20);
    
    return {
      placement: isAbove ? 'top' : 'bottom',
      top: Math.round(rect.bottom + 6),
      bottom: Math.round(window.innerHeight - rect.top + 6),
      left: Math.max(12, Math.round(rect.left)),
      right: Math.max(12, Math.round(window.innerWidth - rect.right)),
      maxHeight: Math.min(380, availableHeight)
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // Close only if trigger scrolled substantially off-screen
    if (rect.bottom < -100 || rect.top > window.innerHeight + 100) {
      setIsOpen(false);
      return;
    }

    const nextCoords = calculateCoords();
    if (nextCoords) {
      setCoords(nextCoords);
    }
  }, [calculateCoords]);

  const handleToggle = (e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    if (!isOpen) {
      const nextCoords = calculateCoords();
      if (nextCoords) {
        setCoords(nextCoords);
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = (e) => {
      if (e?.target && menuRef.current && (menuRef.current === e.target || menuRef.current.contains(e.target))) {
        return;
      }
      updatePosition();
    };

    const handleClickOutside = (event) => {
      if (
        (triggerRef.current && (triggerRef.current === event.target || triggerRef.current.contains(event.target))) ||
        (menuRef.current && (menuRef.current === event.target || menuRef.current.contains(event.target)))
      ) {
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    
    // Attach mousedown listener safely on next microtask so the trigger event doesn't trigger it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  const handleMenuClick = (e) => {
    // If clicking an input, textarea or interactive field inside (like search), keep open
    if (e.target.closest('input, textarea, select')) {
      return;
    }
    setIsOpen(false);
  };

  const menuStyle = usePortal
    ? {
        position: 'fixed',
        zIndex: 99999,
        top: coords.placement === 'top' ? 'auto' : `${coords.top}px`,
        bottom: coords.placement === 'top' ? `${coords.bottom}px` : 'auto',
        left: align === 'left' ? `${coords.left}px` : 'auto',
        right: align === 'right' ? `${coords.right}px` : 'auto',
        maxHeight: coords.maxHeight ? `${coords.maxHeight}px` : undefined,
      }
    : undefined;

  const menuNode = (
    <div
      ref={menuRef}
      className={`dropdown-menu align-${align} placement-${coords.placement} ${usePortal ? 'dropdown-portal' : ''} ${menuClassName}`}
      style={menuStyle}
      onClick={handleMenuClick}
    >
      {children}
    </div>
  );

  return (
    <div className={`dropdown-wrapper ${className}`}>
      <div
        ref={triggerRef}
        className="dropdown-trigger"
        onClick={handleToggle}
      >
        {typeof trigger === 'function' ? trigger({ isOpen }) : trigger}
      </div>

      {isOpen && (usePortal ? createPortal(menuNode, document.body) : menuNode)}
    </div>
  );
}
