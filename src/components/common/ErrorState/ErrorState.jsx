import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '../Button/Button';
import { MESSAGES } from '../../../constants/messages';
import './ErrorState.css';

export function ErrorState({
  title = 'Unable to Load',
  message = MESSAGES.APP.NETWORK_ERROR,
  onRetry,
  className = ''
}) {
  return (
    <div className={`error-state-container ${className}`}>
      <div className="error-state-icon-wrap">
        <AlertCircle size={24} />
      </div>
      <p className="error-state-title">{title}</p>
      {message && <p className="error-state-message">{message}</p>}
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          icon={RotateCcw}
          onClick={onRetry}
          className="error-state-retry-btn"
        >
          {MESSAGES.APP.RETRY}
        </Button>
      )}
    </div>
  );
}
