import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { MESSAGES } from '../../../constants/messages';
import { ROUTES } from '../../../constants/routes';

export function UpgradeModal({ isOpen, onClose, message }) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate(ROUTES.BILLING);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={MESSAGES.BILLING.UPGRADE_MODAL_TITLE}
      maxWidth="460px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', textAlign: 'center', alignItems: 'center' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--color-surface-alt)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Sparkles size={28} />
        </div>

        <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-md)', lineHeight: 1.5 }}>
          {message || MESSAGES.BILLING.UPGRADE_MODAL_DESC}
        </p>

        <div style={{ display: 'flex', gap: 'var(--spacing-3)', width: '100%', marginTop: 'var(--spacing-2)' }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            {MESSAGES.APP.CANCEL}
          </Button>
          <Button variant="primary" icon={ArrowRight} onClick={handleUpgrade} style={{ flex: 1 }}>
            {MESSAGES.APP.UPGRADE}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
