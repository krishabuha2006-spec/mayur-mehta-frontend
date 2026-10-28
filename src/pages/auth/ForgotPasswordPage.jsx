import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { authService } from '../../services/authService';
import { extractErrorMessage } from '../../utils/errorHandler';
import { isValidEmail } from '../../utils/validators';
import { MayurMehtaLogo } from '../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import { ROUTES } from '../../constants/routes';
import './LoginPage.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setServerError('');

    const trimmed = email.trim();
    if (!trimmed) {
      setServerError('Please enter your workspace email address');
      return;
    }

    if (!isValidEmail(trimmed)) {
      setServerError('Please enter a valid email address (e.g. name@domain.com)');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(trimmed);
      setSubmittedEmail(trimmed);
    } catch (err) {
      setServerError(extractErrorMessage(err, 'Unable to send password recovery instructions. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="innopl-auth-viewport">
      {/* 1. Frosted architectural backdrop image */}
      <div
        className="innopl-auth-bg-layer"
        style={{ backgroundImage: `url('/images/mayur_studio_office.jpg')` }}
        aria-hidden="true"
      />
      <div className="innopl-auth-overlay" aria-hidden="true" />

      {/* 2. Glassmorphic Card */}
      <main className="innopl-auth-card">
        {/* Brand Header */}
        <div className="innopl-brand-stage">
          <div className="innopl-logo-container" style={{ marginBottom: '16px' }}>
            <MayurMehtaLogo variant="primary" size="lg" color="#7B6F62" />
          </div>
          <h1 className="innopl-title">Recover Password</h1>
          <p className="innopl-subtitle">
            Enter your company workspace email to receive recovery instructions
          </p>
        </div>

        {/* Error Alert */}
        {serverError && (
          <div className="innopl-alert error" role="alert" style={{ width: '100%', marginBottom: '16px' }}>
            <AlertCircle size={16} />
            <span>{serverError}</span>
          </div>
        )}

        {submittedEmail ? (
          /* Success Screen */
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
            <p style={{ fontSize: '0.85rem', color: '#655E57', lineHeight: '1.5', margin: '0 0 16px' }}>
              If an account exists for <strong>{submittedEmail}</strong>, a secure password reset link has been dispatched to your inbox.
            </p>
            <p style={{ fontSize: '0.78rem', color: '#8C847A', lineHeight: '1.4', margin: '0 0 24px' }}>
              Please check your inbox (and spam folder). Click the complete link in the email to set your new password.
            </p>

            <Link
              to={ROUTES.LOGIN}
              className="innopl-submit-btn"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
            >
              <span>RETURN TO SIGN IN</span>
              <ArrowRight size={16} />
            </Link>

            <button
              type="button"
              onClick={() => {
                setSubmittedEmail('');
                setEmail('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#7B6F62',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginTop: '16px',
                cursor: 'pointer'
              }}
            >
              Didn't receive email? Try another address
            </button>
          </div>
        ) : (
          /* Recovery Form */
          <form onSubmit={handleSubmit} className="innopl-form" style={{ width: '100%' }} noValidate>
            <div className="innopl-field-row">
              <input
                id="forgot-email-input"
                type="email"
                name="email"
                placeholder="Enter your workspace email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (serverError) setServerError('');
                }}
                className="innopl-input"
                autoComplete="email"
                disabled={loading}
                autoFocus
              />
              <span className="innopl-field-icon" aria-hidden="true">
                <Mail size={18} />
              </span>
            </div>

            <button
              id="forgot-submit-btn"
              type="submit"
              disabled={loading}
              className={`innopl-submit-btn ${loading ? 'is-loading' : ''}`}
            >
              {loading ? (
                <span className="innopl-btn-spinner" aria-hidden="true" />
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Send size={15} /> Send Reset Link
                </span>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link
                to={ROUTES.LOGIN}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#7B6F62',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </form>
        )}

        <footer className="innopl-stage-footer" style={{ marginTop: '20px' }}>
          <span>Mayur Mehta Design • Security & Identity</span>
        </footer>
      </main>
    </div>
  );
}

export default ForgotPasswordPage;
