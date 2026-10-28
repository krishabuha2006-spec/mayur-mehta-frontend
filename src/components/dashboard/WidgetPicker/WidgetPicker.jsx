import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { Dropdown } from '../../common/Dropdown/Dropdown';
import { dashboardService } from '../../../services/dashboardService';
import './WidgetPicker.css';

export function WidgetPicker({ onAddWidget, availableCount = 19 }) {
  const [widgets, setWidgets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAvailable = async () => {
      setLoading(true);
      try {
        const res = await dashboardService.getAvailableWidgets();
        setWidgets(res.widgets || []);
      } catch {
        // Handled silently
      } finally {
        setLoading(false);
      }
    };

    fetchAvailable();
  }, []);

  const filteredWidgets = widgets.filter((w) =>
    w.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dropdown
      align="right"
      trigger={({ isOpen }) => (
        <button
          type="button"
          className={`widget-picker-trigger ${isOpen ? 'active' : ''}`}
          title="Add hidden or extra widgets"
          aria-label="Add widgets"
        >
          <span className="picker-count">+{availableCount}</span>
          <ChevronDown size={16} className={`picker-caret ${isOpen ? 'open' : ''}`} />
        </button>
      )}
    >
      <div className="widget-picker-dropdown">
        <div className="picker-search-box">
          <Search size={14} className="picker-search-icon" />
          <input
            type="text"
            placeholder="Search widgets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="picker-search-input"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="picker-list">
          {loading ? (
            <p className="picker-empty">Loading widgets...</p>
          ) : filteredWidgets.length === 0 ? (
            <p className="picker-empty">No matching widgets</p>
          ) : (
            filteredWidgets.map((item) => (
              <button
                key={item.key}
                type="button"
                className="picker-item"
                onClick={() => onAddWidget(item)}
              >
                <div className="picker-item-info">
                  <span className="picker-item-title">{item.title}</span>
                  {item.description && (
                    <span className="picker-item-desc">{item.description}</span>
                  )}
                </div>
                <Plus size={16} className="picker-item-add" />
              </button>
            ))
          )}
        </div>
      </div>
    </Dropdown>
  );
}
