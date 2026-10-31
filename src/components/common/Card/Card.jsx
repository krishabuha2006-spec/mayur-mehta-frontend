import React from 'react';
import './Card.css';

export function Card({
  children,
  className = '',
  onClick = null,
  header = null,
  footer = null,
  variant = 'surface' // 'surface' | 'alt' | 'outlined'
}) {
  return (
    <div
      className={`mm-card mm-card-${variant} ${onClick ? 'is-clickable' : ''} ${className}`}
      onClick={onClick}
    >
      {header && <div className="mm-card-header">{header}</div>}
      <div className="mm-card-body">{children}</div>
      {footer && <div className="mm-card-footer">{footer}</div>}
    </div>
  );
}

export default Card;

