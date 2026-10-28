import React from 'react';
import './LoadingScreen.css';

export function LoadingScreen({
  message = 'Loading...',
  fullScreen = true,
  className = ''
}) {
  return (
    <div
      className={`mm-loading-screen ${fullScreen ? 'is-fullscreen' : 'is-embedded'} ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="mm-loading-content">
        <div className="mm-loading-spinner-wrap">
          <div className="mm-loading-spinner-ring" />
        </div>

        {message && <p className="mm-loading-text">{message}</p>}
      </div>
    </div>
  );
}

export default LoadingScreen;
