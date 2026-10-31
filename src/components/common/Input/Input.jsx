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
  ...rest
}) {
  const inputId = id || name;
  const hasAsterisk = typeof label === 'string' && /\*\s*$/.test(label);
  const displayLabel = hasAsterisk ? label.replace(/\s*\*+\s*$/, '') : label;
  const showRequired = required || hasAsterisk;

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
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`form-input ${Icon ? 'with-icon' : ''} ${rightElement ? 'with-right-element' : ''}`}
          {...rest}
        />
        {rightElement && <div className="input-right-element">{rightElement}</div>}
      </div>
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}
