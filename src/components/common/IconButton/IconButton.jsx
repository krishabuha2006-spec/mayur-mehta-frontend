import React from 'react';
import './IconButton.css';

export function IconButton({
  icon: Icon,
  badgeCount,
  onClick,
  title,
  ariaLabel,
  variant = 'ghost', // 'ghost' | 'primary' | 'secondary' | 'warm'
  size = 'md',        // 'sm' (32px) | 'md' (40px)
  className = '',
  disabled = false,
  ...rest
}) {
  const showBadge = typeof badgeCount === 'number' && badgeCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel || title}
      className={`icon-btn icon-btn-${variant} icon-btn-${size} ${className}`}
      {...rest}
    >
      {Icon && <Icon className="icon-btn-svg" size={size === 'sm' ? 15 : 18} strokeWidth={1.75} />}
      {showBadge && (
        <span className="icon-btn-badge" aria-label={`${badgeCount} notifications`}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  );
}
