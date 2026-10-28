import React from 'react';
import './Skeleton.css';

export function Skeleton({
  variant = 'text', // 'text' | 'rect' | 'circle'
  width = '100%',
  height,
  className = '',
  style = {}
}) {
  const getDefaultHeight = () => {
    if (variant === 'circle') return width;
    if (variant === 'text') return '16px';
    return '100px';
  };

  const computedHeight = height || getDefaultHeight();

  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={{
        width,
        height: computedHeight,
        ...style
      }}
      aria-hidden="true"
    />
  );
}
