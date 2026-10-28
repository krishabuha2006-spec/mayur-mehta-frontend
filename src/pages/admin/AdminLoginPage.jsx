import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, KeyRound, User, Lock, ArrowRight, RotateCw, AlertCircle, CheckCircle2, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { adminAuthService } from '../../services/adminAuthService';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { MayurMehtaLogo } from '../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import { ROUTES } from '../../constants/routes';
import { isValidEmail } from '../../utils/validators';
import { extractErrorMessage } from '../../utils/errorHandler';
import './AdminLoginPage.css';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthenticatedAdmin } = useAdminAuth();

  // Step 1: Credentials | Step 2: 2FA OTP
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const stateFrom = location.state?.from?.pathname;
  const from = (stateFrom && !stateFrom.includes('password') && !stateFrom.includes('login'))
    ? stateFrom
    : ROUTES.ADMIN;

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Step 1: Login Submission
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setServerError('');
    setSuccessNotice('');

    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setServerError('Please enter a valid administrator email address');
      return;
    }
    if (!password) {
      setServerError('Please enter your administrator password');
      return;
    }

    setLoading(true);
    try {
      const response = await adminAuthService.login({ email: trimmed, password });

      // If backend requires 2FA OTP verification (ADMIN_OTP_ENABLED)
      if (response?.otpRequired || response?.challengeId) {
        setChallengeId(response.challengeId);
        setMaskedEmail(response.maskedEmail || trimmed);
        setCooldown(response.resendInSeconds || 60);
        setStep(2);
        // Step 2 header directly indicates the code was sent, keeping UI sleek and compact
      } else if (response?.accessToken) {
        // Direct login without OTP (e.g. dev/test mode)
        setAuthenticatedAdmin(response.user, response.accessToken);
        navigate(from, { replace: true });
      }
    } catch (err) {
      const msg = extractErrorMessage(err, 'Authentication failed. Please verify your administrator credentials.');
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Verify OTP Submission
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setServerError('');
    setSuccessNotice('');

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6 || !/^\d+$/.test(cleanOtp)) {
      setServerError('Please enter a valid 6-digit numeric verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await adminAuthService.verifyOtp({ challengeId, otp: cleanOtp });
      setAuthenticatedAdmin(response.user, response.accessToken);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = extractErrorMessage(err, 'Invalid or expired OTP code. Please request a new code.');
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;
    setServerError('');
    setLoading(true);
    try {
      await adminAuthService.resendOtp({ challengeId });
      setCooldown(60);
      setSuccessNotice('A new verification code has been dispatched to your email.');
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to resend verification code. Please wait before retrying.');
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-viewport">
      {/* Background Architectural Layer */}
      <div
        className="admin-auth-bg-layer"
        style={{ backgroundImage: `url('/images/mayur_studio_office.jpg')` }}
        aria-hidden="true"
      />
      <div className="admin-auth-overlay" aria-hidden="true" />

      {/* Main Admin Card */}
      <main className="admin-auth-card">
        {/* Brand Header */}
        <div className="admin-logo-row">
          <MayurMehtaLogo variant="primary" size="lg" color="#7B6F62" />
          <div className="admin-shield-badge">
            <Shield size={14} />
            <span>Platform Super Admin</span>
          </div>
        </div>

        {/* Feedback Banners */}
        {successNotice && (
          <div className="admin-alert success" role="status">
            <CheckCircle2 size={16} />
            <span>{successNotice}</span>
          </div>
        )}

        {serverError && (
          <div className="admin-alert error" role="alert">
            <AlertCircle size={16} />
            <span>{serverError}</span>
          </div>
        )}

        {/* STEP 1: Email & Password */}
        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="admin-form" noValidate>
            <div className="admin-field-group">
              <label htmlFor="admin-email">Administrator Email</label>
              <div className="admin-input-wrapper">
                <User size={16} className="admin-input-icon" />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="admin-field-group">
              <div className="admin-label-split">
                <label htmlFor="admin-password">Secure Password</label>
                <Link to={ROUTES.ADMIN_FORGOT_PASSWORD} className="admin-sublink">
                  Forgot?
                </Link>
              </div>
              <div className="admin-input-wrapper">
                <KeyRound size={16} className="admin-input-icon" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="admin-btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <RotateCw size={16} className="spin-icon" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Super Admin</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: 2FA OTP Challenge */
          <form onSubmit={handleStep2Submit} className="admin-form" noValidate>
            <div className="admin-otp-header">
              <div className="admin-otp-badge">
                <Lock size={12} />
                <span>Two-Factor Authentication</span>
              </div>
              <h3>Security Code</h3>
              <p>Sent to <strong>{maskedEmail}</strong></p>
            </div>

            <div className="admin-field-group">
              <div className="admin-input-wrapper">
                <input
                  id="admin-otp"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="admin-otp-input"
                  autoFocus
                  required
                />
              </div>
            </div>

            <button type="submit" className="admin-btn-primary" disabled={loading || otp.length !== 6}>
              {loading ? (
                <>
                  <RotateCw size={16} className="spin-icon" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Enter Console</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="admin-otp-actions">
              <button
                type="button"
                className="admin-btn-text"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || loading}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>

              <button
                type="button"
                className="admin-btn-back"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setServerError('');
                  setSuccessNotice('');
                }}
              >
                <ChevronLeft size={14} />
                <span>Back to credentials</span>
              </button>
            </div>
          </form>
        )}

        {/* Bottom Return to Tenant App */}
        <div className="admin-auth-footer">
          <Link to={ROUTES.LOGIN} className="admin-back-link">
            ← Return to Studio Workspace Login
          </Link>
        </div>
      </main>
    </div>
  );
}

export default AdminLoginPage;
