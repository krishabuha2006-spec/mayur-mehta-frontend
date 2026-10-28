import React, { useState } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, RotateCw, Check } from 'lucide-react';
import { authService } from '../../services/authService';
import { adminAuthService } from '../../services/adminAuthService';
import { extractErrorMessage } from '../../utils/errorHandler';
import { validatePasswordRequirements } from '../../utils/validators';
import { MayurMehtaLogo } from '../../components/common/MayurMehtaLogo/MayurMehtaLogo';
import { ROUTES } from '../../constants/routes';
import './LoginPage.css';

export function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const routeParams = useParams();
  const navigate = useNavigate();

  // Extract token from either query parameter (?token=...) or path parameter (/:token)
  const token = searchParams.get('token') || routeParams.token || '';

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
      setError('Activation / set password token is missing. Please click the full link in your email.');
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
      let targetLoginRoute = ROUTES.LOGIN;

      // 1. Try Tenant set-password first (POST /api/v1/auth/set-password)
      try {
        await authService.setPassword({ token: token.trim(), password });
        resolved = true;
      } catch (setErr) {
        const msg = extractErrorMessage(setErr);
        if (msg.includes('RESET_TOKEN_INVALID') || setErr.response?.status === 400 || setErr.response?.status === 404) {
          // 2. Try Tenant reset-password (in case user clicked reset link pointing to /set-password)
          try {
            await authService.resetPassword({ token: token.trim(), password });
            resolved = true;
          } catch (resetErr) {
            // 3. Try Admin set-password (POST /api/v1/admin/auth/set-password)
            try {
              await adminAuthService.setPassword({ token: token.trim(), password });
              resolved = true;
              targetLoginRoute = ROUTES.ADMIN_LOGIN;
            } catch (adminSetErr) {
              // 4. Try Admin reset-password (POST /api/v1/admin/auth/reset-password)
              try {
                await adminAuthService.resetPassword({ token: token.trim(), password });
                resolved = true;
                targetLoginRoute = ROUTES.ADMIN_LOGIN;
              } catch (adminResetErr) {
                throw setErr;
              }
            }
          }
        } else {
          throw setErr;
        }
      }

      if (resolved) {
        setSuccess('Password set successfully! Redirecting you to sign in...');
        setTimeout(() => {
          navigate(targetLoginRoute, {
            replace: true,
            state: { message: 'Password set successfully. Please sign in.' }
          });
        }, 1500);
      }
    } catch (err) {
      const friendlyMsg = extractErrorMessage(err);
      if (friendlyMsg.includes('RESET_TOKEN_INVALID')) {
        setError('This invitation or reset link is invalid or has expired. Please contact your workspace administrator.');
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
            Set Your Password
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#7B6F62', margin: 0, lineHeight: '1.4' }}>
            Create a secure password to activate your workspace account
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

        {!token && (
          <div className="innopl-alert" style={{ background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>Missing invitation token. Please open the full link from your email.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }} noValidate>
          {/* New Password */}
          <div>
            <label htmlFor="set-password-input" style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#4A443E', marginBottom: '6px' }}>
              Create Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', color: '#8C847A', pointerEvents: 'none' }} />
              <input
                id="set-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min. 8 characters)"
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
            <label htmlFor="set-confirm-password" style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#4A443E', marginBottom: '6px' }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', color: '#8C847A', pointerEvents: 'none' }} />
              <input
                id="set-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
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
            disabled={loading || !token}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: '#7B6F62',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: '600',
              cursor: loading || !token ? 'not-allowed' : 'pointer',
              opacity: loading || !token ? 0.65 : 1,
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
                <span>Activating Account...</span>
              </>
            ) : (
              <span>Save & Activate</span>
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
      </main>
    </div>
  );
}

export default SetPasswordPage;
