import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';
import { Header } from '../Header/Header';
import { UpgradeModal } from '../../common/UpgradeModal/UpgradeModal';
import { useAuth } from '../../../hooks/useAuth';
import { COMPANY_STATUS } from '../../../constants/enums';
import { MESSAGES } from '../../../constants/messages';
import { AlertTriangle, ShieldAlert, Clock } from 'lucide-react';
import './AppLayout.css';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      return localStorage.getItem('mm_sidebar_expanded') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mm_sidebar_expanded', String(next));
      } catch {}
      return next;
    });
  };

  const { company, subscription, upgradeModalOpen, setUpgradeModalOpen, upgradeModalMessage } = useAuth();

  // Company suspension check
  if (company?.status === COMPANY_STATUS.SUSPENDED) {
    return (
      <div className="company-suspended-screen">
        <div className="company-suspended-card">
          <ShieldAlert size={48} className="suspended-icon" />
          <h2>{MESSAGES.COMPANY_STATE.SUSPENDED_TITLE}</h2>
          <p>{MESSAGES.COMPANY_STATE.SUSPENDED_DESC}</p>
        </div>
      </div>
    );
  }

  const isRestricted =
    subscription?.status === 'RESTRICTED' ||
    company?.status === 'RESTRICTED' ||
    (subscription?.status === 'EXPIRED' && (subscription?.seatsUsed || 0) > 10);

  const isGracePeriod =
    subscription?.status === 'GRACE' ||
    (company?.status === COMPANY_STATUS.PAYMENT_FAILED && company?.gracePeriodDays > 0);

  return (
    <div
      className={`app-shell ${sidebarExpanded ? 'sidebar-layout-expanded' : ''}`}
      style={{ '--sidebar-width': sidebarExpanded ? '240px' : '88px' }}
    >
      <Sidebar
        expanded={sidebarExpanded}
        onToggleExpand={handleToggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="app-main">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {isRestricted && (
          <div
            className="billing-restricted-top-banner"
            role="alert"
            style={{
              background: 'linear-gradient(90deg, #3D2B24 0%, #2A1D18 100%)',
              color: '#F4ECE4',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              borderBottom: '1px solid rgba(196, 138, 34, 0.4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={16} color="#E5A93C" />
              <span>
                <strong>Restricted Read-Only Mode:</strong> Your paid subscription has expired and active seats exceed the free 10-seat limit. Data modifications are blocked.
              </span>
            </div>
            <Link
              to="/billing"
              style={{
                color: '#B89A74',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Renew Plan &rarr;
            </Link>
          </div>
        )}

        {isGracePeriod && !isRestricted && (
          <div
            className="billing-grace-top-banner"
            role="alert"
            style={{
              background: 'linear-gradient(90deg, #322A22 0%, #221C17 100%)',
              color: '#F4ECE4',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              borderBottom: '1px solid rgba(184, 154, 116, 0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={16} color="#B89A74" />
              <span>
                <strong>Subscription Grace Period:</strong> Your subscription period has ended. Full access remains active until grace concludes.
              </span>
            </div>
            <Link
              to="/billing"
              style={{
                color: '#B89A74',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              View Billing &rarr;
            </Link>
          </div>
        )}

        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        message={upgradeModalMessage}
      />
    </div>
  );
}
