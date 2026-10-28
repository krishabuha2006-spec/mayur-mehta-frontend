import React, { useState } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, RotateCw, Check } from 'lucide-react';
import { authService } from '../../services/authService';
import { adminAuthService } from '../../services/adminAuthService';
import { extractErrorMessage } from '../../utils/errorHandler';
import { validatePasswordRequirements } from '../../utils/validators';
import { ParametricBackground } from '../../components/common/ParametricBackground/ParametricBackground';
import { MayurMehtaLogo } from '../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import { ROUTES } from '../../constants/routes';
import './LoginPage.css';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const routeParams = useParams();
  const navigate = useNavigate();

  // Extract token from either query parameter (?token=...) or path parameter (/:token)
  const token =
    searchParams.get('token') ||
    searchParams.get('t') ||
    searchParams.get('code') ||
    searchParams.get('resetToken') ||
    routeParams.token ||
    '';

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

    if (!token) {
      setError('Password reset token is missing from the link. Please open the link directly from your email or request a new reset link.');
      return;
    }

    if (!reqs.isValid) {
      setError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Try standard Tenant User password reset first (POST /api/v1/auth/reset-password)
      let resolved = false;
      let targetLoginRoute = ROUTES.LOGIN;

      try {
        await authService.resetPassword({ token: token.trim(), password });
        resolved = true;
      } catch (tenantErr) {
        const tenantMsg = extractErrorMessage(tenantErr);

        // If the token is invalid on tenant reset, it might be an Admin reset token or an Invite activation token
        if (tenantMsg.includes('RESET_TOKEN_INVALID') || tenantErr.response?.status === 400 || tenantErr.response?.status === 404) {
          try {
            // 2. Try Super Admin password reset (POST /api/v1/admin/auth/reset-password)
            await adminAuthService.resetPassword({ token: token.trim(), password });
            resolved = true;
            targetLoginRoute = ROUTES.ADMIN_LOGIN;
          } catch (adminErr) {
            // 3. Try Tenant invite set-password (POST /api/v1/auth/set-password)
            try {
              await authService.setPassword({ token: token.trim(), password });
              resolved = true;
            } catch (setPassErr) {
              // 4. Try Admin invite set-password (POST /api/v1/admin/auth/set-password)
              try {
                await adminAuthService.setPassword({ token: token.trim(), password });
                resolved = true;
                targetLoginRoute = ROUTES.ADMIN_LOGIN;
              } catch (adminSetErr) {
                // All attempts failed; throw original tenant error or clearest error
                throw tenantErr;
              }
            }
          }
        } else {
          // If error is a validation error (e.g. password too common), throw it immediately
          throw tenantErr;
        }
      }

      if (resolved) {
        setSuccess('Password updated successfully! Redirecting you to sign in...');
        setTimeout(() => {
          navigate(targetLoginRoute, {
            replace: true,
            state: { message: 'Your password has been reset successfully. Please sign in.' }
          });
        }, 1500);
      }
    } catch (err) {
      const friendlyMsg = extractErrorMessage(err);
      if (friendlyMsg.includes('RESET_TOKEN_INVALID')) {
        setError('This password reset link is invalid or has expired. Please request a fresh reset link.');
      } else {
        setError(friendlyMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="innopl-auth-viewport">
      <div
        className="innopl-auth-bg-layer"
        style={{ backgroundImage: `url('/images/mayur_studio_office.jpg')` }}
        aria-hidden="true"
      />
      <div className="innopl-auth-overlay" aria-hidden="true" />

      <main className="innopl-auth-card">
        {/* Brand Header */}
        <div className="innopl-logo-container">
          <MayurMehtaLogo size="lg" color="taupe" />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px', width: '100%' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1E1A17', margin: '0 0 6px' }}>
            Reset Your Password
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#7B6F62', margin: 0, lineHeight: '1.4' }}>
            Choose a new, secure password for your workspace account
          </p>
        </div>

        {/* Feedback Banners */}
        {error && (
          <div className="innopl-alert" style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B' }} role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="innopl-alert" style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534' }} role="status">
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* If no token present, guide user with a clear prompt instead of disabled form */}
        {!token ? (
          <div style={{ textAlign: 'center', width: '100%', padding: '10px 0' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(123, 111, 98, 0.1)',
                color: '#7B6F62',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px'
              }}
            >
              <Lock size={22} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1E1A17', margin: '0 0 8px' }}>
              Reset Link Required
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#655E57', lineHeight: '1.5', margin: '0 0 20px' }}>
              To securely reset your password, please click the complete link delivered to your email inbox.
            </p>

            <Link
              to={ROUTES.FORGOT_PASSWORD}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '44px',
                backgroundColor: '#7B6F62',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: '600',
                textDecoration: 'none',
                boxSizing: 'border-box'
              }}
            >
              <span>Request Password Reset Link</span>
            </Link>

            <div style={{ textAlign: 'center', marginTop: '18px', width: '100%' }}>
              <Link
                to={ROUTES.LOGIN}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  color: '#7B6F62',
                  textDecoration: 'none',
                  fontWeight: '600'
                }}
              >
                <ArrowLeft size={13} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }} noValidate>
              {/* New Password */}
              <div>
                <label htmlFor="new-password" style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#4A443E', marginBottom: '6px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={15} style={{ position: 'absolute', left: '12px', color: '#8C847A', pointerEvents: 'none' }} />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password (min. 8 characters)"
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 40px 0 36px',
                      borderRadius: '10px',
                      border: '1px solid rgba(183, 175, 166, 0.45)',
                      background: '#FFFFFF',
                      fontSize: '0.85rem',
                      color: '#1E1A17',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'transparent',
                      border: 'none',
                      color: '#8C847A',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm-password" style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#4A443E', marginBottom: '6px' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={15} style={{ position: 'absolute', left: '12px', color: '#8C847A', pointerEvents: 'none' }} />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 40px 0 36px',
                      borderRadius: '10px',
                      border: '1px solid rgba(183, 175, 166, 0.45)',
                      background: '#FFFFFF',
                      fontSize: '0.85rem',
                      color: '#1E1A17',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'transparent',
                      border: 'none',
                      color: '#8C847A',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div style={{ background: 'rgba(250, 248, 245, 0.9)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(183, 175, 166, 0.25)', fontSize: '0.73rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: reqs.hasMinLength ? '#15803D' : '#8C847A' }}>
                  <Check size={12} strokeWidth={reqs.hasMinLength ? 3 : 1.5} />
                  <span>At least 8 characters long</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: (reqs.hasLetter && reqs.hasNumber) ? '#15803D' : '#8C847A' }}>
                  <Check size={12} strokeWidth={(reqs.hasLetter && reqs.hasNumber) ? 3 : 1.5} />
                  <span>Contains both letters and numbers</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordsMatch ? '#15803D' : '#8C847A' }}>
                  <Check size={12} strokeWidth={passwordsMatch ? 3 : 1.5} />
                  <span>Passwords match</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !reqs.isValid || !passwordsMatch}
                style={{
                  width: '100%',
                  height: '44px',
                  backgroundColor: '#7B6F62',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  cursor: loading || !reqs.isValid || !passwordsMatch ? 'not-allowed' : 'pointer',
                  opacity: loading || !reqs.isValid || !passwordsMatch ? 0.65 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s ease',
                  marginTop: '4px'
                }}
              >
                {loading ? (
                  <>
                    <RotateCw size={16} className="spin-icon" />
                    <span>Saving New Password...</span>
                  </>
                ) : (
                  <span>Save & Sign In</span>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '18px', width: '100%' }}>
              <Link
                to={ROUTES.LOGIN}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  color: '#7B6F62',
                  textDecoration: 'none',
                  fontWeight: '600'
                }}
              >
                <ArrowLeft size={13} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default ResetPasswordPage;
