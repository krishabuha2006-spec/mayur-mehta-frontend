import React from 'react';
import { Compass, CheckCircle2, Layers } from 'lucide-react';
import { MayurMehtaLogo } from '../../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import './BrandPanel.css';

/**
 * BrandPanel: Left architectural showcase panel (55% desktop width).
 * Features an authentic inline architectural blueprint elevation SVG
 * with slow draw-in animation, value pillars, and official Mayur Mehta Design hallmark.
 */
export function BrandPanel({ isMobileHeader = false }) {
  if (isMobileHeader) {
    return (
      <header className="brand-mobile-header" aria-label="Mayur Mehta Design Studio">
        <MayurMehtaLogo size="md" color="charcoal" />
        <p className="brand-mobile-tagline">Design. Coordinate. Deliver.</p>
      </header>
    );
  }

  return (
    <aside className="brand-panel" aria-label="Mayur Mehta Design Architectural Studio">
      {/* Background Architectural Blueprint Elevation (Inline Vector SVG) */}
      <div className="brand-blueprint-bg" aria-hidden="true">
        <svg
          className="brand-blueprint-svg"
          viewBox="0 0 800 1000"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Coordinate Drafting Grid Lines */}
          <g className="blueprint-grid-lines" stroke="rgba(123, 111, 98, 0.15)" strokeWidth="1">
            <line x1="80" y1="0" x2="80" y2="1000" strokeDasharray="3 8" />
            <line x1="200" y1="0" x2="200" y2="1000" strokeDasharray="3 8" />
            <line x1="360" y1="0" x2="360" y2="1000" strokeDasharray="3 8" />
            <line x1="520" y1="0" x2="520" y2="1000" strokeDasharray="3 8" />
            <line x1="680" y1="0" x2="680" y2="1000" strokeDasharray="3 8" />

            <line x1="0" y1="140" x2="800" y2="140" strokeDasharray="3 8" />
            <line x1="0" y1="300" x2="800" y2="300" strokeDasharray="3 8" />
            <line x1="0" y1="460" x2="800" y2="460" strokeDasharray="3 8" />
            <line x1="0" y1="620" x2="800" y2="620" strokeDasharray="3 8" />
            <line x1="0" y1="780" x2="800" y2="780" strokeDasharray="3 8" />
          </g>

          {/* Precision Architectural Axis & Grid Coordinates */}
          <g className="blueprint-annotations" fill="#7B6F62" fontSize="9.5" fontFamily="'Segoe UI', monospace, sans-serif" letterSpacing="0.1em" fontWeight="600">
            <text x="75" y="40">AXIS A-01</text>
            <text x="355" y="40">AXIS B-02</text>
            <text x="675" y="40">AXIS C-03</text>
            <text x="15" y="145">EL +24.800</text>
            <text x="15" y="465">EL +12.400</text>
            <text x="15" y="785">DATUM 0.000</text>
          </g>

          {/* Architectural Elevation Line-Art with Draw-in Animation */}
          <g className="blueprint-structure" stroke="#7B6F62" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {/* Ground datum line with hatch */}
            <line x1="40" y1="780" x2="760" y2="780" stroke="#4A443E" strokeWidth="2.5" />
            <line x1="50" y1="780" x2="40" y2="795" stroke="#B7AFA6" strokeWidth="1.2" />
            <line x1="80" y1="780" x2="70" y2="795" stroke="#B7AFA6" strokeWidth="1.2" />
            <line x1="110" y1="780" x2="100" y2="795" stroke="#B7AFA6" strokeWidth="1.2" />
            <line x1="140" y1="780" x2="130" y2="795" stroke="#B7AFA6" strokeWidth="1.2" />
            <line x1="170" y1="780" x2="160" y2="795" stroke="#B7AFA6" strokeWidth="1.2" />
            <line x1="200" y1="780" x2="190" y2="795" stroke="#B7AFA6" strokeWidth="1.2" />
            <line x1="230" y1="780" x2="220" y2="795" stroke="#B7AFA6" strokeWidth="1.2" />

            {/* Main Building Foundation Plinth & Columns */}
            <rect x="120" y="580" width="560" height="200" stroke="#B7AFA6" strokeWidth="1.2" fill="rgba(255, 255, 255, 0.4)" />
            <line x1="160" y1="580" x2="160" y2="780" strokeWidth="2" stroke="#7B6F62" />
            <line x1="260" y1="580" x2="260" y2="780" strokeWidth="1.2" stroke="#B7AFA6" strokeDasharray="4 4" />
            <line x1="360" y1="580" x2="360" y2="780" strokeWidth="2" stroke="#7B6F62" />
            <line x1="520" y1="580" x2="520" y2="780" strokeWidth="1.2" stroke="#B7AFA6" strokeDasharray="4 4" />
            <line x1="640" y1="580" x2="640" y2="780" strokeWidth="2" stroke="#7B6F62" />

            {/* Cantilevered Modern Architectural Volume (Upper Gallery) */}
            <polygon
              points="80,300 700,300 660,580 120,580"
              stroke="#7B6F62"
              strokeWidth="2"
              fill="rgba(232, 227, 219, 0.45)"
            />

            {/* Floor Separation Beams & Slabs */}
            <line x1="70" y1="300" x2="710" y2="300" strokeWidth="3" stroke="#4A443E" />
            <line x1="100" y1="440" x2="680" y2="440" stroke="#B7AFA6" strokeWidth="1.2" strokeDasharray="8 4" />
            <line x1="110" y1="580" x2="670" y2="580" strokeWidth="2.5" stroke="#7B6F62" />

            {/* Vertical Architectural Facade Louvers / Mullions */}
            <line x1="160" y1="300" x2="155" y2="580" stroke="#B7AFA6" strokeWidth="1" />
            <line x1="200" y1="300" x2="195" y2="580" stroke="#7B6F62" strokeWidth="1.5" />
            <line x1="240" y1="300" x2="235" y2="580" stroke="#B7AFA6" strokeWidth="1" />
            <line x1="280" y1="300" x2="275" y2="580" stroke="#7B6F62" strokeWidth="1.5" />
            <line x1="320" y1="300" x2="315" y2="580" stroke="#B7AFA6" strokeWidth="1" />
            <line x1="420" y1="300" x2="415" y2="580" stroke="#7B6F62" strokeWidth="1.5" />
            <line x1="460" y1="300" x2="455" y2="580" stroke="#B7AFA6" strokeWidth="1" />
            <line x1="500" y1="300" x2="495" y2="580" stroke="#7B6F62" strokeWidth="1.5" />
            <line x1="540" y1="300" x2="535" y2="580" stroke="#B7AFA6" strokeWidth="1" />
            <line x1="580" y1="300" x2="575" y2="580" stroke="#7B6F62" strokeWidth="1.5" />
            <line x1="620" y1="300" x2="615" y2="580" stroke="#B7AFA6" strokeWidth="1" />

            {/* Floating Roof Canopy & Oculus Aperture */}
            <path d="M60 270 L720 270 L700 300 L80 300 Z" fill="rgba(232, 227, 219, 0.6)" stroke="#7B6F62" strokeWidth="1.8" />
            <ellipse cx="380" cy="270" rx="90" ry="12" stroke="#7B6F62" strokeWidth="1.2" strokeDasharray="4 4" />

            {/* Dimensional Leader Lines & Arrows */}
            <line x1="80" y1="230" x2="700" y2="230" stroke="#7B6F62" strokeWidth="1.2" />
            <line x1="80" y1="220" x2="80" y2="240" stroke="#7B6F62" strokeWidth="1.5" />
            <line x1="700" y1="220" x2="700" y2="240" stroke="#7B6F62" strokeWidth="1.5" />
            <text x="360" y="224" fill="#2E2E2E" fontSize="11" fontFamily="'Segoe UI', sans-serif" fontWeight="bold">62.00 M</text>
          </g>

          {/* Blueprint Corner Registration Crosses */}
          <g stroke="#B7AFA6" strokeWidth="1.2">
            <path d="M20 25 L40 25 M30 15 L30 35" />
            <path d="M760 25 L780 25 M770 15 L770 35" />
            <path d="M20 965 L40 965 M30 955 L30 975" />
            <path d="M760 965 L780 965 M770 955 L770 975" />
          </g>
        </svg>

        {/* Animated Architectural Drafting Scan Beam */}
        <div className="brand-scanner-beam" aria-hidden="true" />
      </div>

      {/* Atmospheric Vignette & Depth Overlay */}
      <div className="brand-depth-gradient" aria-hidden="true" />

      {/* Foreground Content: Logo, Tagline, Value Pillars, Metrics, Hallmark */}
      <div className="brand-panel-content">
        {/* Top Header: Mayur Mehta Design Logo */}
        <header className="brand-header-group">
          <div className="brand-hero-logo">
            <MayurMehtaLogo size="lg" color="charcoal" />
          </div>
          <p className="brand-tagline">Design • Coordinate • Deliver</p>
        </header>

        {/* Middle Value Points: Animated Architectural Pillars with Status Badges */}
        <div className="brand-value-points">
          <div className="value-point-item" style={{ '--delay': '0.1s' }}>
            <div className="value-point-icon-wrap" aria-hidden="true">
              <Compass size={18} className="value-point-icon" />
            </div>
            <div className="value-point-text">
              <div className="value-point-header-line">
                <h2 className="value-point-title">Project Tracking</h2>
                <span className="value-point-tag">12 Active Sites</span>
              </div>
              <p className="value-point-desc">Studio milestones, deliverables, and timeline coordination.</p>
            </div>
          </div>

          <div className="value-point-item" style={{ '--delay': '0.2s' }}>
            <div className="value-point-icon-wrap" aria-hidden="true">
              <CheckCircle2 size={18} className="value-point-icon" />
            </div>
            <div className="value-point-text">
              <div className="value-point-header-line">
                <h2 className="value-point-title">Client Approvals</h2>
                <span className="value-point-tag">Instant Sign-off</span>
              </div>
              <p className="value-point-desc">Transparent drawing sign-offs and review workflows.</p>
            </div>
          </div>

          <div className="value-point-item" style={{ '--delay': '0.3s' }}>
            <div className="value-point-icon-wrap" aria-hidden="true">
              <Layers size={18} className="value-point-icon" />
            </div>
            <div className="value-point-text">
              <div className="value-point-header-line">
                <h2 className="value-point-title">Drawings & Vault</h2>
                <span className="value-point-tag">GFC & Revisions</span>
              </div>
              <p className="value-point-desc">Centralized sheet repository with revision histories.</p>
            </div>
          </div>
        </div>

        {/* Studio Live Metrics Bar */}
        <div className="brand-metrics-bar" aria-label="Studio Statistics">
          <div className="brand-metric-col">
            <span className="metric-number">
              <span className="live-pulse-dot" aria-hidden="true" title="Real-time live sync" />
              24+
            </span>
            <span className="metric-label">Active Projects</span>
          </div>
          <div className="brand-metric-divider" aria-hidden="true" />
          <div className="brand-metric-col">
            <span className="metric-number">100%</span>
            <span className="metric-label">Drawing Accuracy</span>
          </div>
          <div className="brand-metric-divider" aria-hidden="true" />
          <div className="brand-metric-col">
            <span className="metric-number">256-Bit</span>
            <span className="metric-label">Vault Encryption</span>
          </div>
        </div>

        {/* Footer: Quiet Studio Hallmark */}
        <footer className="brand-panel-footer">
          <div className="brand-footer-line" aria-hidden="true" />
          <div className="brand-footer-text-row">
            <span className="brand-studio-credit">Mayur Mehta Design</span>
            <span className="brand-bullet">•</span>
            <span className="brand-version">Architecture & Interior Practice</span>
          </div>
        </footer>
      </div>
    </aside>
  );
}

export default BrandPanel;
