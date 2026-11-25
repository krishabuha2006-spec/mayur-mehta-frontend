import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MailX, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { Button } from '../../components/common/Button/Button';
import { MayurMehtaLogo } from '../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import { extractErrorMessage } from '../../utils/errorHandler';
import { ROUTES } from '../../constants/routes';

const CATEGORY_OPTIONS = [
  { key: 'TASKS', label: 'Task Assignments & Reminders' },
  { key: 'PROJECTS', label: 'Project Stage & Status Updates' },
  { key: 'FILES', label: 'Cloud Drive & Drawing Shares' },
  { key: 'BILLING', label: 'Invoices & Subscription Alerts' },
  { key: 'TEAM', label: 'Team Invitations & Role Changes' }
];

export function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [verifyError, setVerifyError] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifyError('Missing unsubscribe token. Please use the link provided in your email.');
      setVerifying(false);
      return;
    }
    let active = true;
    notificationService.verifyUnsubscribeToken(token)
      .then((info) => {
        if (!active) return;
        setTokenInfo(info || {});
        if (info?.category) {
          setSelectedCategories([info.category]);
        }
      })
      .catch((err) => {
        if (active) {
          setVerifyError(extractErrorMessage(err, 'Invalid or expired unsubscribe link.'));
        }
      })
      .finally(() => {
        if (active) setVerifying(false);
      });
    return () => { active = false; };
  }, [token]);

  const toggleCategory = (catKey) => {
    setSelectedCategories((prev) =>
      prev.includes(catKey) ? prev.filter((c) => c !== catKey) : [...prev, catKey]
    );
  };

  const handleConfirmUnsubscribe = async () => {
    if (!token) return;
    setSubmitting(true);
    setVerifyError('');
    try {
      await notificationService.unsubscribePublic({
        token,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined
      });
      setUnsubscribed(true);
    } catch (err) {
      setVerifyError(extractErrorMessage(err, 'Failed to process unsubscribe request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF8F5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'var(--font-family-base, Inter, sans-serif)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E3DB',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 8px 28px rgba(30, 26, 23, 0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <MayurMehtaLogo variant="full" size={32} />
        </div>

        {verifying ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#7B6F62', fontSize: '14px' }}>
            Verifying your email preference link...
          </div>
        ) : unsubscribed ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <CheckCircle2 size={44} color="#2F6B45" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#1E1A17' }}>
              Preferences Updated
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: '#7B6F62', lineHeight: 1.5 }}>
              You have been unsubscribed from the selected studio email notifications. Security alerts remain active for your account safety.
            </p>
            <Link to={ROUTES.LOGIN} style={{ textDecoration: 'none' }}>
              <Button variant="primary" icon={ArrowLeft}>Return to Sign In</Button>
            </Link>
          </div>
        ) : verifyError ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <AlertTriangle size={42} color="#B45309" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ margin: '0 0 8px', fontSize: '19px', color: '#1E1A17' }}>
              Link Invalid or Expired
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: '#7B6F62', lineHeight: 1.5 }}>
              {verifyError}
            </p>
            <Link to={ROUTES.LOGIN} style={{ textDecoration: 'none' }}>
              <Button variant="secondary" icon={ArrowLeft}>Go to Sign In</Button>
            </Link>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <MailX size={20} color="#B89A74" />
              <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 600, color: '#1E1A17' }}>
                Manage Email Notifications
              </h2>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#7B6F62', lineHeight: 1.5 }}>
              {tokenInfo?.email
                ? <>Updating preferences for <strong style={{ color: '#1E1A17' }}>{tokenInfo.email}</strong>. Select categories to mute or leave all unchecked to unsubscribe from all optional emails.</>
                : 'Select notification categories to mute or confirm to unsubscribe from optional studio emails.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {CATEGORY_OPTIONS.map((cat) => (
                <label
                  key={cat.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: '#FAF8F5',
                    border: '1px solid #E8E3DB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#1E1A17'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.key)}
                    onChange={() => toggleCategory(cat.key)}
                  />
                  <span>{cat.label}</span>
                </label>
              ))}
            </div>

            <Button
              variant="primary"
              onClick={handleConfirmUnsubscribe}
              disabled={submitting}
              style={{ width: '100%' }}
            >
              {submitting ? 'Updating...' : 'Confirm Unsubscribe'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UnsubscribePage;
