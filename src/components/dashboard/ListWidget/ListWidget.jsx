import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WidgetCard } from '../WidgetCard/WidgetCard';
import { EmptyState } from '../../common/EmptyState/EmptyState';
import { dashboardService } from '../../../services/dashboardService';
import { Folder, Plus, FileCheck, Layers } from 'lucide-react';
import './ListWidget.css';

export function ListWidget({
  widgetKey,
  title,
  scope = 'user',
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
      setError('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [widgetKey, scope]);

  const items = data?.items || [];

  // Refined architectural empty state messages & icons
  let EmptyIcon = Folder;
  let emptyMsg = `No ${title} found`;
  let emptyAction = null;

  if (widgetKey === 'project-ongoing') {
    EmptyIcon = Layers;
    emptyMsg = 'No active construction or design projects';
    emptyAction = (
      <button
        type="button"
        className="widget-cta-btn"
        onClick={() => navigate('/projects')}
      >
        <Plus size={13} strokeWidth={2} />
        <span>New Project</span>
      </button>
    );
  } else if (widgetKey === 'approval-pending') {
    EmptyIcon = FileCheck;
    emptyMsg = 'All drawing approvals are up to date';
  } else if (widgetKey === 'revision-pending') {
    EmptyIcon = Folder;
    emptyMsg = 'No sheet revisions pending review';
  }

  const handleItemClick = (item) => {
    if (item.route) {
      navigate(item.route);
    } else if (data?.targetRoute) {
      navigate(data.targetRoute);
    }
  };

  return (
    <WidgetCard
      title={title}
      loading={loading}
      error={error}
      onRetry={fetchData}
      onHide={onHide}
      onRemove={onRemove}
      style={style}
    >
      <div className="list-widget-container">
        {items.length === 0 ? (
          <EmptyState
            icon={EmptyIcon}
            message={emptyMsg}
            actionButton={emptyAction}
            className="widget-empty-content"
          />
        ) : (
          <ul className="list-widget-items">
            {items.map((item, idx) => (
              <li
                key={item.id || idx}
                className="list-widget-item"
                onClick={() => handleItemClick(item)}
              >
                <div className="item-main-info">
                  <span className="item-title">{item.title || item.name}</span>
                  {item.subtitle && <span className="item-subtitle">{item.subtitle}</span>}
                </div>
                {item.status && <span className="item-status-tag">{item.status}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </WidgetCard>
  );
}
