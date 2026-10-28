import React from 'react';
import { EyeOff, X } from 'lucide-react';
import { Skeleton } from '../../common/Skeleton/Skeleton';
import { ErrorState } from '../../common/ErrorState/ErrorState';
import { MESSAGES } from '../../../constants/messages';
import './WidgetCard.css';

export function WidgetCard({
  title,
  children,
  headerAction,
  onHide,
  onRemove,
  loading = false,
  error = null,
  onRetry,
  compact = false,
  className = '',
  style = {}
}) {
  return (
    <div className={`widget-card ${compact ? 'widget-card-compact' : ''} ${className}`} style={style}>
      <div className="widget-header">
        <h3 className="widget-title">{title}</h3>

        <div className="widget-actions">
          {onHide && (
            <button
              type="button"
              className="widget-action-btn"
              onClick={onHide}
              title={MESSAGES.DASHBOARD.HIDE_WIDGET}
              aria-label={MESSAGES.DASHBOARD.HIDE_WIDGET}
            >
              <EyeOff size={16} strokeWidth={1.5} />
            </button>
          )}

          {headerAction}

          {onRemove && (
            <button
              type="button"
              className="widget-action-btn"
              onClick={onRemove}
              title={MESSAGES.DASHBOARD.REMOVE_WIDGET}
              aria-label={MESSAGES.DASHBOARD.REMOVE_WIDGET}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading-box">
            <Skeleton variant="text" width="60%" height="16px" />
            <Skeleton variant="rect" width="100%" height={compact ? '24px' : '80px'} style={{ marginTop: '8px' }} />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
