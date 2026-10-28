import React, { useState } from 'react';
import './FormFields.css';

/**
 * TextField: Architectural floating-label text field.
 * - 52px height, 12px border radius
 * - Copper focus ring with soft glow
 * - Left icon integration
 * - Floating label transition
 * - Inline validation on blur with accessible aria-live status
 */
export function TextField({
  id,
  name,
  label,
  type = 'text',
  value = '',
  onChange,
  onBlur,
  error,
  icon: Icon,
  required = false,
  autoComplete,
  autoFocus = false,
  disabled = false,
  placeholder = ' ',
  className = '',
  ...rest
}) {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id || name;
  const isFloated = isFocused || Boolean(value && String(value).length > 0);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <div className={`arch-field-container ${error ? 'has-error' : ''} ${className}`}>
      <div
        className={`arch-input-box ${isFocused ? 'is-focused' : ''} ${isFloated ? 'is-floated' : ''} ${disabled ? 'is-disabled' : ''}`}
      >
        {/* Left Icon */}
        {Icon && (
          <div className="arch-field-icon" aria-hidden="true">
            <Icon size={18} />
          </div>
        )}

        {/* Input & Floating Label */}
        <div className="arch-input-inner">
          <input
            id={inputId}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            required={required}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="arch-native-input"
            {...rest}
          />
          <label htmlFor={inputId} className="arch-floating-label">
            {label}
            {required && <span className="arch-required-star" aria-hidden="true"> *</span>}
          </label>
        </div>
      </div>

      {/* Accessible Inline Validation Helper */}
      {error && (
        <p id={`${inputId}-error`} className="arch-inline-error" role="status" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

export default TextField;
