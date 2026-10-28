import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './Select.css';

export function Select({
  label,
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  icon: Icon,
  disabled = false,
  required = false,
  error,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options to { value, label, sublabel }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    return {
      value: opt.value,
      label: opt.label || opt.name || String(opt.value),
      sublabel: opt.sublabel || opt.role || opt.category || null
    };
  });

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  // Handle outside click to close
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    if (disabled) return;
    setIsOpen(false);
    if (onChange) {
      // Support both direct value: onChange(val) and synthetic event: onChange({ target: { value: val } })
      onChange({ target: { value: optionValue, name: id } });
    }
  };

  return (
    <div className={`custom-select-field ${className} ${disabled ? 'is-disabled' : ''} ${error ? 'has-error' : ''}`} ref={containerRef}>
      {label && (
        <label className="custom-select-label" htmlFor={id} onClick={() => !disabled && setIsOpen((prev) => !prev)}>
          {label}
          {required && <span className="required-indicator"> *</span>}
        </label>
      )}

      <div className="custom-select-wrapper">
        <button
          type="button"
          id={id}
          className={`custom-select-trigger ${isOpen ? 'is-open' : ''} ${Icon ? 'with-icon' : ''}`}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {Icon && (
            <span className="custom-select-left-icon">
              <Icon size={16} />
            </span>
          )}

          <span className={`custom-select-value ${!selectedOption ? 'is-placeholder' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <span className={`custom-select-arrow ${isOpen ? 'is-rotated' : ''}`}>
            <ChevronDown size={16} />
          </span>
        </button>

        {isOpen && (
          <div className="custom-select-popover" role="listbox">
            <div className="custom-select-options-list">
              {normalizedOptions.length === 0 ? (
                <div className="custom-select-empty">No options available</div>
              ) : (
                normalizedOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <div
                      key={String(opt.value)}
                      className={`custom-select-option ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleSelect(opt.value)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="option-text-group">
                        <span className="option-main-label">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="option-sublabel">{opt.sublabel}</span>
                        )}
                      </div>

                      {isSelected && (
                        <span className="option-check-icon">
                          <Check size={15} />
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && <span className="custom-select-error">{error}</span>}
    </div>
  );
}

export default Select;
