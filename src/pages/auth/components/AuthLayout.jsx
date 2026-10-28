import React from 'react';
import { BrandPanel } from './BrandPanel';
import './AuthLayout.css';

/**
 * AuthLayout: Manages the 55/45 split screen on desktop,
 * and responsive brand header collapse on tablet/mobile.
 */
export function AuthLayout({ children }) {
  return (
    <div className="auth-split-container">
      {/* 55% Desktop Left Panel (Visual Architectural Blueprint) */}
      <BrandPanel />

      {/* 45% Desktop Right Panel (Warm Ivory Form Panel) */}
      <section className="auth-form-section" aria-label="Sign in to Mayur Mehta Design">
        {/* Mobile / Tablet Compact Brand Header */}
        <BrandPanel isMobileHeader={true} />

        {/* Vertically Centered Form Workspace */}
        <div className="auth-form-wrapper">
          {children}
        </div>
      </section>
    </div>
  );
}

export default AuthLayout;
