import React, { useState, useRef, useEffect } from 'react';
import './Dropdown.css';

export function Dropdown({
  trigger,
  children,
  align = 'right',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`dropdown-wrapper ${className}`} ref={dropdownRef}>
      <div className="dropdown-trigger" onClick={() => setIsOpen((prev) => !prev)}>
        {typeof trigger === 'function' ? trigger({ isOpen }) : trigger}
      </div>

      {isOpen && (
        <div className={`dropdown-menu align-${align}`} onClick={() => setIsOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}
