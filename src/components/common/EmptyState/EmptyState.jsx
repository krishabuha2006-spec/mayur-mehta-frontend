import React from 'react';
import { Inbox } from 'lucide-react';
import './EmptyState.css';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  actionButton,
  className = ''
}) {
  return (
    <div className={`empty-state-container ${className}`}>
      <div className="empty-state-icon-wrap">
        <Icon size={28} strokeWidth={1.5} />
      </div>
      {title && <h4 className="empty-state-title">{title}</h4>}
      {message && <p className="empty-state-message">{message}</p>}
      {actionButton && <div className="empty-state-action">{actionButton}</div>}
    </div>
  );
}
