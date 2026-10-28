import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WidgetCard } from '../WidgetCard/WidgetCard';
import { dashboardService } from '../../../services/dashboardService';
import './CountWidget.css';

export function CountWidget({
  widgetKey,
  title,
  scope = 'user',
  compact = false,
  onHide,
  onRemove,
  style = {}
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardService.getWidgetData(widgetKey, scope);
      setData(result);
    } catch {
      setError('Failed to load count');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [widgetKey, scope]);

  const countValue = typeof data?.count === 'number' ? data.count : 0;

  const handleClick = () => {
    if (data?.targetRoute) {
      navigate(data.targetRoute);
    }
  };

  const isZero = countValue === 0;

  return (
    <WidgetCard
      title={title}
      compact={compact}
      loading={loading}
      error={error}
      onRetry={fetchData}
      onHide={onHide}
      onRemove={onRemove}
      style={style}
    >
      <div
        className={`count-widget-display ${compact ? 'compact' : ''} ${widgetKey}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        title={`View ${title}`}
      >
        <div className="count-value-wrap">
          <span className={`count-big-number ${isZero ? 'count-zero' : 'count-positive'}`}>
            {countValue}
          </span>
          {!compact && (
            <span className={`count-status-pill ${isZero ? 'status-clear' : 'status-pending'}`}>
              {isZero ? 'All clear' : 'Pending'}
            </span>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}

