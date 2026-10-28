import React from 'react';
import './SegmentedToggle.css';

export function SegmentedToggle({
  options = [], // [{ label: 'User', value: 'user' }, ...]
  value,
  onChange,
  size = 'md',  // 'sm' (for chart headers) | 'md' (for dashboard main toggle)
  className = ''
}) {
  return (
    <div className={`segmented-toggle-container segmented-${size} ${className}`} role="tablist">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={`segmented-tab ${isSelected ? 'selected' : ''}`}
          >
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
