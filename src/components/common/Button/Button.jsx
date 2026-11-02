import React, { forwardRef } from 'react';
import './Button.css';

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger'
    size = 'md',        // 'sm' | 'md' | 'lg'
    icon: Icon,
    loading = false,
    isLoading = false,
    disabled = false,
    className = '',
    type = 'button',
    onClick,
    ...rest
  },
  ref
) {
  const isButtonLoading = Boolean(loading || isLoading);
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isButtonLoading}
      onClick={onClick}
      className={`btn btn-${variant} btn-${size} ${isButtonLoading ? 'btn-loading' : ''} ${className}`}
      {...rest}
    >
      {isButtonLoading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="btn-icon" size={size === 'sm' ? 16 : 18} />
      ) : null}
      <span className="btn-text">{children}</span>
    </button>
  );
});
