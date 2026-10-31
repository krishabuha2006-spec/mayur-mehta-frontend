import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Check, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { MayurMehtaLogo } from '../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import { ROUTES } from '../../constants/routes';
import { isValidEmail } from '../../utils/validators';
import './LoginPage.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;
  const isExpired = new URLSearchParams(location.search).get('expired') === '1';
  const stateMessage = location.state?.message || (isExpired ? 'Your session has expired. Please sign in again.' : null);

  const validateAll = () => {
    const errs = {};
    const trimmed = email.trim();

    if (!trimmed) {
      errs.email = 'Email is required';
    } else if (!isValidEmail(trimmed)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setServerError('');

    if (!validateAll()) return;

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.userMessage || err.response?.data?.message || err.response?.data?.error?.message || err.message;
      setServerError(msg || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="innopl-auth-viewport">
      {/* 1. Fullscreen Studio Background - Clearly visible with soft architectural focus */}
      <div
        className="innopl-auth-bg-layer"
        style={{ backgroundImage: `url('/images/mayur_studio_office.jpg')` }}
        aria-hidden="true"
      />

      {/* 2. Light, Warm Architectural Tint Overlay */}
      <div className="innopl-auth-overlay" aria-hidden="true" />

      {/* 3. Centered Elegant Light Frosted Stage Card */}
      <main className="innopl-auth-card">
        {/* Official Mayur Mehta Design Brand Logo as requested */}
        <div className="innopl-logo-container" title="Mayur Mehta Design">
          <MayurMehtaLogo variant="primary" size="lg" color="#7B6F62" />
        </div>

        {/* Feedback / Alert Banners */}
        {stateMessage && (
          <div className="innopl-alert success" role="status">
            <CheckCircle2 size={16} />
            <span>{stateMessage}</span>
          </div>
        )}

        {serverError && (
          <div className="innopl-alert error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 600 }}>{serverError}</div>
              <div style={{ marginTop: '4px', fontSize: '12px', opacity: 0.9 }}>
                Platform Super Administrator?{' '}
                <Link to={ROUTES.ADMIN_LOGIN} style={{ color: '#7B6F62', fontWeight: 600, textDecoration: 'underline' }}>
                  Sign in to Admin Console →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 4. Login Fields matching reference format in Light Luxury Theme */}
        <form onSubmit={handleSubmit} className="innopl-form" noValidate>
          {/* EMAIL Field */}
          <div className={`innopl-field-row ${fieldErrors.email ? 'has-error' : ''}`}>
            <input
              id="login-email-input"
              type="email"
              name="email"
              placeholder="Enter your studio email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
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
          {fieldErrors.email && (
            <span className="innopl-error-text">{fieldErrors.email}</span>
          )}

          {/* PASSWORD Field */}
          <div className={`innopl-field-row ${fieldErrors.password ? 'has-error' : ''}`}>
            <input
              id="login-password-input"
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
              }}
              onKeyUp={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
              onKeyDown={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
              className="innopl-input"
              autoComplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="innopl-field-icon-btn"
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Lock size={18} />}
            </button>
          </div>
          {capsLockActive && (
            <div className="innopl-caps-warning" role="alert">
              <ShieldAlert size={14} />
              <span>Caps Lock is ON</span>
            </div>
          )}
          {fieldErrors.password && (
            <span className="innopl-error-text">{fieldErrors.password}</span>
          )}

          {/* SIGN IN Button with Brand Theme Taupe (#7B6F62) */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className={`innopl-submit-btn ${loading ? 'is-loading' : ''}`}
          >
            {loading ? (
              <span className="innopl-btn-spinner" aria-hidden="true" />
            ) : (
              <span>SIGN IN</span>
            )}
          </button>

          {/* Remember Me & Forgot Password Row */}
          <div className="innopl-aux-row">
            <label htmlFor="login-remember-me" className="innopl-remember-toggle">
              <input
                id="login-remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="innopl-checkbox-input"
              />
              <span className={`innopl-checkbox-box ${rememberMe ? 'is-checked' : ''}`} aria-hidden="true">
                {rememberMe && <Check size={11} strokeWidth={3} />}
              </span>
              <span className="innopl-remember-label">Remember me</span>
            </label>

            <Link to={ROUTES.FORGOT_PASSWORD} className="innopl-forgot-link">
              Forgot password?
            </Link>
          </div>
        </form>

        {/* Footer Note */}
        <footer className="innopl-stage-footer">
          <span>Architectural Studio Management Portal</span>
        </footer>
      </main>
    </div>
  );
}

export default LoginPage;
