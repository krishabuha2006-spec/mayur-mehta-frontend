import React from 'react';
import './Badge.css';

export function Badge({
  children,
  variant = 'neutral', // 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'ext-1'..'ext-6'
  size = 'md',        // 'sm' | 'md'
  className = ''
}) {
  return (
    <span className={`badge badge-${variant} badge-${size} ${className}`}>
      {children}
    </span>
  );
}
