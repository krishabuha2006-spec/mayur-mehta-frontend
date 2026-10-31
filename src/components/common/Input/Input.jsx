import React from 'react';
import './Input.css';

export function Input({
  label,
  error,
  type = 'text',
  id,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  icon: Icon,
  rightElement,
  className = '',
  numericOnly = false,
  isPhone = false,
  maxLength,
  ...rest
}) {
  const inputId = id || name;
  const hasAsterisk = typeof label === 'string' && /\*\s*$/.test(label);
  const displayLabel = hasAsterisk ? label.replace(/\s*\*+\s*$/, '') : label;
  const showRequired = required || hasAsterisk;

  const isNumericRestricted = numericOnly || isPhone || type === 'tel';
  const effectiveMax = isPhone || type === 'tel' ? (maxLength || 10) : maxLength;

  const handleChange = (e) => {
    if (!onChange) return;

    if (isNumericRestricted) {
      let cleanVal = e.target.value.replace(/\D/g, '');
      if (effectiveMax) {
        cleanVal = cleanVal.slice(0, effectiveMax);
      }
      e.target.value = cleanVal;
      onChange(e);
      return;
    }

    onChange(e);
  };

  const handleKeyDown = (e) => {
    if (isNumericRestricted) {
      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
        if (rest.onKeyDown) rest.onKeyDown(e);
        return;
      }
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
      }
    }
    if (rest.onKeyDown) {
      rest.onKeyDown(e);
    }
  };

  const handlePaste = (e) => {
    if (isNumericRestricted) {
      const pasteData = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      const cleanPaste = pasteData.replace(/\D/g, '');
      if (cleanPaste !== pasteData) {
        e.preventDefault();
        const maxLen = effectiveMax || 999;
        const current = String(value || '');
        const combined = (current + cleanPaste).slice(0, maxLen);
        e.target.value = combined;
        if (onChange) onChange(e);
        return;
      }
    }
    if (rest.onPaste) {
      rest.onPaste(e);
    }
  };

  return (
    <div className={`form-field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {displayLabel} {showRequired && <span className="required-indicator">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {Icon && <Icon className="input-icon" size={18} />}
        <input
          id={inputId}
          name={name}
          type={type === 'tel' ? 'tel' : type}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={effectiveMax}
          inputMode={isNumericRestricted ? 'numeric' : rest.inputMode}
          className={`form-input ${Icon ? 'with-icon' : ''} ${rightElement ? 'with-right-element' : ''}`}
          {...rest}
        />
        {rightElement && <div className="input-right-element">{rightElement}</div>}
      </div>
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}
