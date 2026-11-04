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

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // If trigger has scrolled completely off-screen, close menu
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // Check if dropdown should pop upwards if space below is limited
    const isAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    
    setCoords({
      placement: isAbove ? 'top' : 'bottom',
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      left: Math.max(12, rect.left),
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (event) => {
      if (
        (triggerRef.current && triggerRef.current.contains(event.target)) ||
        (menuRef.current && menuRef.current.contains(event.target))
      ) {
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
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
        ...(coords.placement === 'top'
          ? { bottom: `${coords.bottom}px` }
          : { top: `${coords.top}px` }),
        ...(align === 'right'
          ? { right: `${coords.right}px` }
          : { left: `${coords.left}px` }),
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
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {typeof trigger === 'function' ? trigger({ isOpen }) : trigger}
      </div>

      {isOpen && (usePortal ? createPortal(menuNode, document.body) : menuNode)}
    </div>
  );
}
