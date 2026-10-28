import React, { useState } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { Shield, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, RotateCw, Check, ArrowRight, Lock } from 'lucide-react';
import { adminAuthService } from '../../services/adminAuthService';
import { authService } from '../../services/authService';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { extractErrorMessage } from '../../utils/errorHandler';
import { validatePasswordRequirements } from '../../utils/validators';
import { MayurMehtaLogo } from '../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import { ROUTES } from '../../constants/routes';
import './AdminLoginPage.css';

export function AdminResetPasswordPage({ mode = 'reset' }) {
  const [searchParams] = useSearchParams();
  const routeParams = useParams();
  const navigate = useNavigate();
  const { adminUser, updateAdminUser } = useAdminAuth();

  // Extract token from query (?token=... or ?t=... or ?code=...) or path (/:token)
  const token =
    searchParams.get('token') ||
    searchParams.get('t') ||
    searchParams.get('code') ||
    searchParams.get('resetToken') ||
    routeParams.token ||
    '';

  const isAuthenticatedChange = Boolean(adminUser && (adminUser.mustChangePassword || !token));
  const isSetMode = mode === 'set';

  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const reqs = validatePasswordRequirements(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isAuthenticatedChange && !currentPassword) {
      setError('Please enter your current administrator password.');
      return;
    }

    if (!isAuthenticatedChange && !token) {
      setError('Administrative reset token is missing from the link. Please open the link directly from your email.');
      return;
    }

    if (!reqs.isValid) {
      setError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      let resolved = false;

      // Case A: Authenticated Admin changing password (e.g. required change)
      if (isAuthenticatedChange) {
        await adminAuthService.changePassword({
          currentPassword,
          newPassword: password
        });
        resolved = true;
        if (updateAdminUser && adminUser) {
          updateAdminUser({ ...adminUser, mustChangePassword: false });
        }
        setSuccess('Administrator password updated successfully! Redirecting to dashboard...');
        setTimeout(() => {
          navigate(ROUTES.ADMIN, { replace: true });
        }, 1500);
        return;
      }

      // Case B: Public Reset / Set via Token
      if (isSetMode) {
        try {
          await adminAuthService.setPassword({ token: token.trim(), password });
          resolved = true;
        } catch (adminSetErr) {
          try {
            await adminAuthService.resetPassword({ token: token.trim(), password });
            resolved = true;
          } catch (adminResetErr) {
            throw adminSetErr;
          }
        }
      } else {
        try {
          await adminAuthService.resetPassword({ token: token.trim(), password });
          resolved = true;
        } catch (adminResetErr) {
          const msg = extractErrorMessage(adminResetErr);
          if (
            msg.includes('RESET_TOKEN_INVALID') ||
            adminResetErr.response?.status === 400 ||
            adminResetErr.response?.status === 404
          ) {
            try {
              await adminAuthService.setPassword({ token: token.trim(), password });
              resolved = true;
            } catch (adminSetErr) {
              // Also try tenant auth in case a tenant user was sent to the admin reset route
              try {
                await authService.resetPassword({ token: token.trim(), password });
                resolved = true;
                navigate(ROUTES.LOGIN, {
                  replace: true,
                  state: { message: 'Your password has been reset successfully. Please sign in.' }
                });
                return;
              } catch (tErr) {
                throw adminResetErr;
              }
            }
          } else {
            throw adminResetErr;
          }
        }
      }

      if (resolved) {
        setSuccess('Super Admin password updated successfully! Redirecting you to sign in...');
        setTimeout(() => {
          navigate(ROUTES.ADMIN_LOGIN, {
            replace: true,
            state: { message: 'Your administrator credentials have been updated. Please sign in.' }
          });
        }, 1500);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to update password. Please check your reset link and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const getPageTitle = () => {
    if (isAuthenticatedChange) return 'Update Administrator Password';
    if (isSetMode) return 'Set Administrator Password';
    return 'Reset Administrator Password';
  };

  const getPageSubtitle = () => {
    if (isAuthenticatedChange) return 'Create a strong, unique password to secure your admin access';
    return 'Establish a strong password for your privileged platform access';
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
            <span>
              {isAuthenticatedChange
                ? 'Super Admin Security'
                : isSetMode
                ? 'Super Admin Account Setup'
                : 'Super Admin Password Recovery'}
            </span>
          </div>
        </div>

        {/* Feedback Banners */}
        {error && (
          <div className="admin-alert error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="admin-alert success" role="status">
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Case: No token and not authenticated -> Guide user nicely */}
        {!token && !isAuthenticatedChange ? (
          <div style={{ textAlign: 'center', width: '100%', padding: '8px 0' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(123, 111, 98, 0.1)',
                color: '#7B6F62',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px'
              }}
            >
              <KeyRound size={24} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1E1A17', margin: '0 0 8px' }}>
              Reset Link Required
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#655E57', lineHeight: '1.5', margin: '0 0 20px' }}>
              For platform administration security, password changes require a secure, single-use link dispatched to your verified email address.
            </p>
            <p style={{ fontSize: '0.78rem', color: '#8C847A', lineHeight: '1.4', margin: '0 0 24px' }}>
              If you have already received an email, please click the complete link directly inside your email inbox.
            </p>

            <Link
              to={ROUTES.ADMIN_FORGOT_PASSWORD}
              className="admin-btn-primary"
              style={{ textDecoration: 'none', justifyContent: 'center' }}
            >
              <span>Request Password Reset Link</span>
              <ArrowRight size={16} />
            </Link>

            <div className="admin-auth-footer" style={{ marginTop: '20px' }}>
              <Link to={ROUTES.ADMIN_LOGIN} className="admin-back-link">
                <ArrowLeft size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Back to Super Admin Sign In
              </Link>
            </div>
          </div>
        ) : (
          /* Form for Token Reset or Authenticated Change */
          <>
            <div style={{ textAlign: 'center', marginBottom: '18px', width: '100%' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1E1A17', margin: '0 0 6px' }}>
                {getPageTitle()}
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#7B6F62', margin: 0, lineHeight: '1.4' }}>
                {getPageSubtitle()}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="admin-form" noValidate>
              {isAuthenticatedChange && (
                <div className="admin-field-group">
                  <label htmlFor="admin-current-password">Current Password</label>
                  <div className="admin-input-wrapper">
                    <Lock size={16} className="admin-input-icon" />
                    <input
                      id="admin-current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      className="admin-password-toggle"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="admin-field-group">
                <label htmlFor="admin-new-password">New Password</label>
                <div className="admin-input-wrapper">
                  <KeyRound size={16} className="admin-input-icon" />
                  <input
                    id="admin-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password (min. 8 characters)"
                    required
                    autoFocus={!isAuthenticatedChange}
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

              <div className="admin-field-group">
                <label htmlFor="admin-confirm-password">Confirm New Password</label>
                <div className="admin-input-wrapper">
                  <KeyRound size={16} className="admin-input-icon" />
                  <input
                    id="admin-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                  />
                  <button
                    type="button"
                    className="admin-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div
                style={{
                  background: 'rgba(250, 248, 245, 0.9)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(183, 175, 166, 0.25)',
                  fontSize: '0.73rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: reqs.hasMinLength ? '#15803D' : '#8C847A'
                  }}
                >
                  <Check size={12} strokeWidth={reqs.hasMinLength ? 3 : 1.5} />
                  <span>At least 8 characters long</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: reqs.hasLetter && reqs.hasNumber ? '#15803D' : '#8C847A'
                  }}
                >
                  <Check size={12} strokeWidth={reqs.hasLetter && reqs.hasNumber ? 3 : 1.5} />
                  <span>Contains both letters and numbers</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: passwordsMatch ? '#15803D' : '#8C847A'
                  }}
                >
                  <Check size={12} strokeWidth={passwordsMatch ? 3 : 1.5} />
                  <span>Passwords match</span>
                </div>
              </div>

              <button
                type="submit"
                className="admin-btn-primary"
                disabled={loading || !reqs.isValid || !passwordsMatch}
              >
                {loading ? (
                  <>
                    <RotateCw size={16} className="spin-icon" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save & Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="admin-auth-footer">
              <Link to={ROUTES.ADMIN_LOGIN} className="admin-back-link">
                <ArrowLeft size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Back to Super Admin Sign In
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminResetPasswordPage;
