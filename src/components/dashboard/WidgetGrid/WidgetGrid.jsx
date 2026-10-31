import React from 'react';
import { ListWidget } from '../ListWidget/ListWidget';
import { CountWidget } from '../CountWidget/CountWidget';
import { ChartWidget } from '../ChartWidget/ChartWidget';
import { WIDGET_TYPES } from '../../../constants/enums';
import './WidgetGrid.css';

export function WidgetGrid({
  widgets = [],
  scope = 'user',
  isLocked = true,
  onHideWidget,
  onRemoveWidget
}) {
  const visibleWidgets = widgets.filter((w) => w.visible !== false);

  // Group widgets according to the reference dashboard layout
  const ongoingWidget = visibleWidgets.find((w) => w.key === 'project-ongoing');
  const approvalWidget = visibleWidgets.find((w) => w.key === 'approval-pending');
  const revisionWidget = visibleWidgets.find((w) => w.key === 'revision-pending');
  const todayWidget = visibleWidgets.find((w) => w.key === 'today-task');
  const followupWidget = visibleWidgets.find((w) => w.key === 'followup-task');

  // Col 4 stacked number cards
  const col4Widgets = visibleWidgets.filter((w) =>
    ['project-task', 'office-task', 'overdue-task', 'personal-task'].includes(w.key)
  );

  // Row 3 wide charts
  const statusChartWidget = visibleWidgets.find((w) => w.key === 'status-task');
  const pendingChartWidget = visibleWidgets.find((w) => w.key === 'pending-task');

  // Any other added/custom widgets
  const customWidgets = visibleWidgets.filter(
    (w) =>
      ![
        'project-ongoing',
        'approval-pending',
        'revision-pending',
        'today-task',
        'followup-task',
        'project-task',
        'office-task',
        'overdue-task',
        'personal-task',
        'status-task',
        'pending-task'
      ].includes(w.key)
  );

  const renderWidgetContent = (widget) => {
    if (!widget) return null;
    const widgetKey = widget.id || widget.key;
    const commonProps = {
      widgetKey: widget.key,
      title: widget.title,
      scope,
      compact: widget.compact || false,
      onHide: () => onHideWidget(widget.key),
      onRemove: () => onRemoveWidget(widget.key)
    };

    switch (widget.type) {
      case WIDGET_TYPES.LIST:
        return <ListWidget key={widgetKey} {...commonProps} />;
      case WIDGET_TYPES.COUNT:
        return <CountWidget key={widgetKey} {...commonProps} />;
      case WIDGET_TYPES.CHART:
        return <ChartWidget key={widgetKey} {...commonProps} />;
      default:
        return <ListWidget key={widgetKey} {...commonProps} />;
    }
  };

  return (
    <div className={`mm-dashboard-grid ${!isLocked ? 'layout-edit-mode' : ''}`}>
      {/* Column 1: Tall Ongoing Projects (spans 2 rows) */}
      <div className="grid-cell col-1-tall">
        {renderWidgetContent(ongoingWidget)}
      </div>

      {/* Column 2: Stacked Approval (Row 1) & Revision (Row 2) */}
      <div className="grid-cell col-2-top">
        {renderWidgetContent(approvalWidget)}
      </div>
      <div className="grid-cell col-2-bottom">
        {renderWidgetContent(revisionWidget)}
      </div>

      {/* Column 3: Stacked Today Task (Row 1) & Follow-up Task (Row 2) */}
      <div className="grid-cell col-3-top">
        {renderWidgetContent(todayWidget)}
      </div>
      <div className="grid-cell col-3-bottom">
        {renderWidgetContent(followupWidget)}
      </div>

      {/* Column 4: 4 Stacked Compact Number Cards */}
      <div className="grid-cell col-4-stacked">
        {col4Widgets.map((w) => (
          <div key={w.key} className="col-4-card-slot">
            {renderWidgetContent(w)}
          </div>
        ))}
      </div>

      {/* Row 3: 2 Wide Charts spanning 2 columns each */}
      <div className="grid-cell row-3-chart-left">
        {renderWidgetContent(statusChartWidget)}
      </div>
      <div className="grid-cell row-3-chart-right">
        {renderWidgetContent(pendingChartWidget)}
      </div>

      {/* Custom Dynamic Added Widgets */}
      {customWidgets.map((w) => (
        <div key={w.key} className="grid-cell custom-grid-slot">
          {renderWidgetContent(w)}
        </div>
      ))}
    </div>
  );
}
