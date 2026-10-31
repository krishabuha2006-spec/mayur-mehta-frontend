import React from 'react';
import './Tabs.css';

/**
 * Reusable Architectural Tabs
 * Supports variant='pills' or variant='underline'
 */
export function Tabs({
  tabs = [], // [{ id: 'all', label: 'All Firms', count: 12, icon: Icon }]
  activeTab,
  onChange,
  variant = 'pills', // 'pills' | 'underline'
  className = ''
}) {
  return (
    <div className={`mm-tabs-container mm-tabs-${variant} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`mm-tab-item ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {Icon && <Icon size={15} className="mm-tab-icon" />}
            <span className="mm-tab-label">{tab.label}</span>
            {tab.count !== undefined && tab.count !== null && (
              <span className={`mm-tab-count ${isActive ? 'is-active' : ''}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;

