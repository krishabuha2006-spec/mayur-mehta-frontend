import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import './FormFields.css';

/**
 * PasswordField: Architectural floating-label password input.
 * - 52px height, 12px radius, copper focus ring
 * - Interactive show/hide toggle
 * - Live Caps-Lock warning detection
 * - Accessible inline validation and keyboard submission
 */
export function PasswordField({
  id = 'password',
  name = 'password',
  label = 'Password',
  value = '',
  onChange,
  onBlur,
  onKeyDown,
  error,
  required = false,
  autoComplete = 'current-password',
  disabled = false,
  className = '',
  ...rest
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  const inputId = id || name;
  const isFloated = isFocused || Boolean(value && String(value).length > 0);

  const checkCapsLock = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    checkCapsLock(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    setCapsLockActive(false);
    if (onBlur) onBlur(e);
  };

  const handleKeyUp = (e) => {
    checkCapsLock(e);
  };

  const handleKeyDown = (e) => {
    checkCapsLock(e);
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <div className={`arch-field-container ${error ? 'has-error' : ''} ${className}`}>
      <div
        className={`arch-input-box ${isFocused ? 'is-focused' : ''} ${isFloated ? 'is-floated' : ''} ${disabled ? 'is-disabled' : ''}`}
      >
        {/* Left Lock Icon */}
        <div className="arch-field-icon" aria-hidden="true">
          <Lock size={18} />
        </div>

        {/* Input & Floating Label */}
        <div className="arch-input-inner">
          <input
            id={inputId}
            name={name}
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            required={required}
            autoComplete={autoComplete}
            disabled={disabled}
            placeholder=" "
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

        {/* Show / Hide Toggle Button */}
        <button
          type="button"
          className="arch-password-toggle-btn"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          tabIndex={0}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {/* Caps Lock Alert Banner */}
      {capsLockActive && (
        <div className="arch-caps-warning" role="alert" aria-live="polite">
          <AlertCircle size={13} className="caps-icon" />
          <span>Caps Lock is on</span>
        </div>
      )}

      {/* Accessible Inline Validation Helper */}
      {error && (
        <p id={`${inputId}-error`} className="arch-inline-error" role="status" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

export default PasswordField;
