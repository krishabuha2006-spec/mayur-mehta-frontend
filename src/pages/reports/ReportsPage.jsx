import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  PieChart,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { apiClient } from '../../services/apiClient';
import './ReportsPage.css';

export function ReportsPage() {
  const [timeRange, setTimeRange] = useState('Current Fiscal Year');
  const [progressData, setProgressData] = useState([]);
  const [typologyData, setTypologyData] = useState([]);
  const [metrics, setMetrics] = useState({
    portfolioValue: '₹0',
    onTimeDelivery: '0%',
    activeSites: 0
  });

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await apiClient.get('/reports/analytics');
        const data = res?.data || res;
        if (data) {
          setProgressData(data.monthlyProgress || []);
          setTypologyData(data.typologyDistribution || []);
          if (data.metrics) setMetrics(data.metrics);
        }
      } catch (err) {
        console.warn('GET /reports/analytics API notice:', err?.response?.status || err.message);
      }
    };
    fetchReports();
  }, [timeRange]);

  return (
    <div className="reports-page-container">
      <div className="reports-header-row">
        <div>
          <h1 className="reports-heading">Reports & Firm Analytics</h1>
          <p className="reports-subheading">Financial tracking, project completion velocity, and architectural milestone metrics</p>
        </div>

        <div className="reports-actions">
          <Button size="sm" variant="secondary" icon={Download} onClick={() => alert('Exporting Comprehensive Firm Analytics (.pdf)...')}>
            Export Executive PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="reports-kpi-grid">
        <div className="kpi-card">
          <p className="kpi-label">Active Portfolio Value</p>
          <p className="kpi-number">₹11.9 Cr</p>
          <span className="kpi-trend positive"><ArrowUpRight size={14} /> +18.4% vs last FY</span>
        </div>

        <div className="kpi-card">
          <p className="kpi-label">On-Time Drawing Delivery</p>
          <p className="kpi-number">94.2%</p>
          <span className="kpi-trend positive"><ArrowUpRight size={14} /> +3.1% velocity</span>
        </div>

        <div className="kpi-card">
          <p className="kpi-label">Active Construction Sites</p>
          <p className="kpi-number">7 Live Sites</p>
          <span className="kpi-trend neutral">Across Ahmedabad, Mumbai, Surat</span>
        </div>

        <div className="kpi-card">
          <p className="kpi-label">Client Approval Index</p>
          <p className="kpi-number">4.9 / 5.0</p>
          <span className="kpi-trend positive"><ArrowUpRight size={14} /> 98% First-pass rate</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="reports-charts-grid">
        {/* Chart 1: Milestone Velocity */}
        <div className="report-chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Milestones: Planned vs Completed</h3>
            <span className="chart-sub">Monthly architectural delivery pace</span>
          </div>

          <div style={{ height: '240px', width: '100%', marginTop: '12px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(183, 175, 166, 0.3)" />
                <XAxis dataKey="month" stroke="#B7AFA6" tick={{ fill: '#756E67', fontSize: 11 }} />
                <YAxis stroke="#B7AFA6" tick={{ fill: '#756E67', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #B7AFA6',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="planned" name="Planned Drawings" fill="#E8E3DB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Delivered / Approved" fill="#7B6F62" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Typology Portfolio Breakdown */}
        <div className="report-chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Portfolio Distribution by Typology</h3>
            <span className="chart-sub">Valuation and active project volume</span>
          </div>

          <div className="typology-breakdown-list">
            {typologyData.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px 0' }}>
                No typology distribution data available yet.
              </p>
            ) : (
              typologyData.map((item) => (
                <div key={item.name} className="typology-row">
                  <div className="typology-row-left">
                    <span className="typology-color-dot" style={{ backgroundColor: item.color }} />
                    <div>
                      <p className="typology-name">{item.name}</p>
                      <p className="typology-count">{item.projects} active projects</p>
                    </div>
                  </div>
                  <div className="typology-val">{item.value}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
