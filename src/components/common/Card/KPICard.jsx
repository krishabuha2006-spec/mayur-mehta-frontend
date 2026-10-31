import React from 'react';
import './Card.css';

/**
 * Reusable Architectural KPICard
 * Strictly adheres to Mayur Mehta Design guidelines:
 * - Fraunces / Cormorant Garamond serif for big metric numbers
 * - Radius 14px, soft minimalist shadows, muted status tags
 */
export function KPICard({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'default', // 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  trend = null, // { value: '+12%', isPositive: true, label: 'vs last month' }
  progress = null, // number 0-100
  badge = null,
  onClick = null,
  className = ''
}) {
  const variantClass = `kpi-card-${variant}`;

  return (
    <div
      className={`mm-kpi-card ${variantClass} ${onClick ? 'is-clickable' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="mm-kpi-header">
        <span className="mm-kpi-title">{title}</span>
        {Icon && (
          <div className={`mm-kpi-icon-wrap icon-${variant}`}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="mm-kpi-body">
        <div className="mm-kpi-val-row">
          <span className="mm-kpi-number">{value}</span>
          {badge && <span className="mm-kpi-badge">{badge}</span>}
        </div>

        {progress !== null && (
          <div className="mm-kpi-progress-bar">
            <div
              className={`mm-kpi-progress-fill fill-${variant}`}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        )}

        <div className="mm-kpi-footer">
          {trend && (
            <span className={`mm-kpi-trend ${trend.isPositive ? 'trend-up' : 'trend-down'}`}>
              {trend.value}
            </span>
          )}
          {subtext && <span className="mm-kpi-subtext">{subtext}</span>}
        </div>
      </div>
    </div>
  );
}

export default KPICard;

