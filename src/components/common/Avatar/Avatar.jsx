import React from 'react';
import './Avatar.css';

export function Avatar({
  src,
  letter = 'U',
  size = 'md', // 'sm' (32px) | 'md' (40px) | 'lg' (56px)
  alt = 'User avatar',
  className = ''
}) {
  return (
    <div className={`avatar avatar-${size} ${className}`} aria-label={alt}>
      {src ? (
        <img src={src} alt={alt} className="avatar-img" />
      ) : (
        <span className="avatar-letter">{letter.toUpperCase()}</span>
      )}
    </div>
  );
}
