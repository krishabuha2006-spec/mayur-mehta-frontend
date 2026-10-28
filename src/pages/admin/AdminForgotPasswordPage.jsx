import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, ArrowRight, RotateCw, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';
import { adminAuthService } from '../../services/adminAuthService';
import { extractErrorMessage } from '../../utils/errorHandler';
import { MayurMehtaLogo } from '../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import { ROUTES } from '../../constants/routes';
import { isValidEmail } from '../../utils/validators';
import './AdminLoginPage.css';

export function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setServerError('');

    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setServerError('Please enter a valid administrator email address');
      return;
    }

    setLoading(true);
    try {
      await adminAuthService.forgotPassword({ email: trimmed });
      setSubmittedEmail(trimmed);
    } catch (err) {
      setServerError(extractErrorMessage(err, 'Unable to process request. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-viewport">
      <div
        className="admin-auth-bg-layer"
        style={{ backgroundImage: `url('/images/mayur_studio_office.jpg')` }}
        aria-hidden="true"
      />
      <div className="admin-auth-overlay" aria-hidden="true" />

      <main className="admin-auth-card">
        <div className="admin-logo-row">
          <MayurMehtaLogo variant="primary" size="lg" color="#7B6F62" />
          <div className="admin-shield-badge">
            <Shield size={14} />
            <span>Super Admin Password Recovery</span>
          </div>
        </div>

        {serverError && (
          <div className="admin-alert error" role="alert">
            <AlertCircle size={16} />
            <span>{serverError}</span>
          </div>
        )}

        {submittedEmail ? (
          <div style={{ textAlign: 'center', width: '100%', padding: '10px 0' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(21, 128, 61, 0.1)',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px'
              }}
            >
              <CheckCircle2 size={26} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1E1A17', margin: '0 0 8px' }}>
              Reset Link Dispatched
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#655E57', lineHeight: '1.5', margin: '0 0 20px' }}>
              If an administrator account exists for <strong>{submittedEmail}</strong>, we have dispatched a secure, time-sensitive reset link to your email.
            </p>
            <p style={{ fontSize: '0.78rem', color: '#8C847A', lineHeight: '1.4', margin: '0 0 24px' }}>
              Please check your inbox (and spam folder). Click the complete link in that email to reset your administrator password.
            </p>

            <Link
              to={ROUTES.ADMIN_LOGIN}
              className="admin-btn-primary"
              style={{ textDecoration: 'none', justifyContent: 'center' }}
            >
              <span>Return to Super Admin Sign In</span>
              <ArrowRight size={16} />
            </Link>

            <button
              type="button"
              className="admin-btn-text"
              onClick={() => {
                setSubmittedEmail('');
                setEmail('');
              }}
              style={{ marginTop: '16px' }}
            >
              Request for another email
            </button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '18px', width: '100%' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1E1A17', margin: '0 0 6px' }}>
                Recover Administrator Access
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#7B6F62', margin: 0, lineHeight: '1.4' }}>
                Enter your registered administrator email to receive a secure recovery link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="admin-form" noValidate>
              <div className="admin-field-group">
                <label htmlFor="recovery-email">Super Admin Email</label>
                <div className="admin-input-wrapper">
                  <Mail size={16} className="admin-input-icon" />
                  <input
                    id="recovery-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className="admin-btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <RotateCw size={16} className="spin-icon" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="admin-auth-footer">
              <Link to={ROUTES.ADMIN_LOGIN} className="admin-back-link">
                <ChevronLeft size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Back to Super Admin Sign In
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminForgotPasswordPage;
