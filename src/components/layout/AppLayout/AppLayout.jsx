import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';
import { Header } from '../Header/Header';
import { UpgradeModal } from '../../common/UpgradeModal/UpgradeModal';
import { useAuth } from '../../../hooks/useAuth';
import { COMPANY_STATUS } from '../../../constants/enums';
import { MESSAGES } from '../../../constants/messages';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import './AppLayout.css';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { company, upgradeModalOpen, setUpgradeModalOpen, upgradeModalMessage } = useAuth();

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

  const isGracePeriod = company?.status === COMPANY_STATUS.PAYMENT_FAILED && company?.gracePeriodDays > 0;

  return (
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="app-main">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {isGracePeriod && (
          <div className="grace-period-banner" role="alert">
            <AlertTriangle size={18} />
            <span>
              {MESSAGES.COMPANY_STATE.PAYMENT_FAILED_BANNER.replace('{days}', company.gracePeriodDays)}
            </span>
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
