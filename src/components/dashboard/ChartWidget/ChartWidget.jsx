import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { WidgetCard } from '../WidgetCard/WidgetCard';
import { SegmentedToggle } from '../../common/SegmentedToggle/SegmentedToggle';
import { dashboardService } from '../../../services/dashboardService';
import { CHART_RANGES } from '../../../constants/enums';
import './ChartWidget.css';

const RANGE_OPTIONS = [
  { label: 'Today', value: CHART_RANGES.TODAY },
  { label: 'Last 15 Days', value: CHART_RANGES.LAST_15_DAYS }
];

export function ChartWidget({
  widgetKey,
  title,
  scope = 'user',
  onHide,
  onRemove,
  style = {}
}) {
  const [range, setRange] = useState(CHART_RANGES.TODAY);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardService.getWidgetData(widgetKey, scope, range);
      setData(result);
    } catch {
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [widgetKey, scope, range]);

  const series = data?.series || [];

  return (
    <WidgetCard
      title={title}
      loading={loading}
      error={error}
      onRetry={fetchData}
      onHide={onHide}
      onRemove={onRemove}
      headerAction={
        <SegmentedToggle
          size="sm"
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
        />
      }
      style={style}
    >
      <div className="chart-widget-body">
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(183, 175, 166, 0.25)" />
              <XAxis
                dataKey="name"
                stroke="#B7AFA6"
                tick={{ fill: '#8C847A', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(183, 175, 166, 0.3)' }}
              />
              <YAxis
                stroke="#B7AFA6"
                tick={{ fill: '#8C847A', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(183, 175, 166, 0.3)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid rgba(183, 175, 166, 0.4)',
                  boxShadow: '0 4px 16px rgba(46, 40, 34, 0.1)',
                  fontSize: '12px'
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#7B6F62"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#7B6F62' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty-canvas">
            <div className="chart-blueprint-grid" />
            <div className="chart-empty-badge">
              <span className="chart-empty-pill">No recorded activity for {range === 'today' ? 'today' : 'last 15 days'}</span>
            </div>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
