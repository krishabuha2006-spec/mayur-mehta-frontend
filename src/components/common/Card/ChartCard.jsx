import React from 'react';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';
import './Card.css';

/**
 * Reusable Architectural ChartCard
 * Handles:
 * - Title & Subtitle with Light Serif accent
 * - Loading skeleton & error retry state
 * - Empty state ("Not enough data yet")
 * - Header action slot (Date range, export, filters)
 */
export function ChartCard({
  title,
  subtitle,
  children,
  action = null,
  onExport = null,
  onRetry = null,
  isLoading = false,
  error = null,
  isEmpty = false,
  emptyMessage = 'Not enough data yet',
  className = '',
  footer = null
}) {
  return (
    <div className={`mm-chart-card ${className}`}>
      <div className="mm-chart-card-header">
        <div className="mm-chart-title-group">
          <h3 className="mm-chart-title">{title}</h3>
          {subtitle && <p className="mm-chart-subtitle">{subtitle}</p>}
        </div>

        <div className="mm-chart-actions-group">
          {action}
          {onExport && (
            <button
              type="button"
              className="mm-chart-action-btn"
              onClick={onExport}
              title="Export Chart Data"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      <div className="mm-chart-card-body">
        {isLoading ? (
          <div className="mm-chart-loading-wrap">
            <div className="mm-chart-skeleton-pulse" />
            <span className="mm-chart-loading-text">Loading visualization...</span>
          </div>
        ) : error ? (
          <div className="mm-chart-error-wrap">
            <AlertCircle size={24} className="mm-chart-error-icon" />
            <p className="mm-chart-error-msg">{error}</p>
            {onRetry && (
              <button type="button" className="mm-chart-retry-btn" onClick={onRetry}>
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            )}
          </div>
        ) : isEmpty ? (
          <div className="mm-chart-empty-wrap">
            <div className="mm-chart-empty-circle" />
            <p className="mm-chart-empty-msg">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {footer && <div className="mm-chart-card-footer">{footer}</div>}
    </div>
  );
}

export default ChartCard;

