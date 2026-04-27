import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import Lottie from 'lottie-react';
import { requestForgotPasswordOtp, resetPasswordWithOtp } from '../services/api';

const LoginPage = ({ onSuccess, onCancel, onSignup }) => {
  const { loginReal } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [helloAnimationData, setHelloAnimationData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadHelloAnimation = async () => {
      try {
        const res = await fetch('/images/Hello.json');
        if (!res.ok) throw new Error('Animation file not found');
        const json = await res.json();
        if (!cancelled) setHelloAnimationData(json);
      } catch {
        if (!cancelled) setHelloAnimationData(null);
      }
    };
    loadHelloAnimation();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    try {
      setLoading(true);
      const loggedInUser = await loginReal({ email, password });
      onSuccess?.(loggedInUser);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.request
          ? 'Cannot reach server. Please make sure backend is running on http://localhost:4000.'
          : 'Login failed. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openForgotModal = () => {
    setForgotOpen(true);
    setForgotStep('email');
    setForgotEmail(email || '');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotError('');
    setForgotSuccess('');
  };

  const closeForgotModal = () => {
    setForgotOpen(false);
    setForgotLoading(false);
    setForgotError('');
    setForgotSuccess('');
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your account email.');
      return;
    }
    try {
      setForgotLoading(true);
      await requestForgotPasswordOtp({ email: forgotEmail.trim() });
      setForgotStep('reset');
      setForgotSuccess('OTP sent to your email.');
    } catch (err) {
      setForgotError(err?.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetWithOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    if (!forgotOtp.trim()) {
      setForgotError('Please enter the OTP.');
      return;
    }
    if (!forgotNewPassword || !forgotConfirmPassword) {
      setForgotError('Please enter new password and confirm password.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Confirm password must match new password.');
      return;
    }
    try {
      setForgotLoading(true);
      await resetPasswordWithOtp({
        email: forgotEmail.trim(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword,
        confirmNewPassword: forgotConfirmPassword
      });
      setForgotSuccess('Password reset successful. Please sign in.');
      setForgotStep('done');
    } catch (err) {
      setForgotError(err?.response?.data?.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <style>{`
        /* ═══════════════════════════════════════
           ✦  MODERN BLUE LOGIN PAGE
           ═══════════════════════════════════════ */
        .login-shell {
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 40%, #f8fafc 100%);
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* Decorative background circles */
        .login-shell::before {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(30,58,138,0.06) 0%, transparent 70%);
          top: -200px;
          right: -150px;
          border-radius: 50%;
          pointer-events: none;
        }

        .login-shell::after {
          content: '';
          position: absolute;
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%);
          bottom: -180px;
          left: -150px;
          border-radius: 50%;
          pointer-events: none;
        }

        /* Main Card */
        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1100px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 32px;
          box-shadow:
            0 4px 6px -1px rgba(0,0,0,0.02),
            0 15px 25px -5px rgba(15,23,42,0.06),
            0 30px 50px -12px rgba(15,23,42,0.1),
            0 0 0 0.5px rgba(148,163,184,0.2);
          display: flex;
          overflow: hidden;
          transition: box-shadow 0.3s ease;
        }

        .login-card:hover {
          box-shadow:
            0 4px 6px -1px rgba(0,0,0,0.03),
            0 15px 25px -5px rgba(15,23,42,0.08),
            0 35px 55px -14px rgba(15,23,42,0.14),
            0 0 0 0.5px rgba(148,163,184,0.25);
        }

        /* ── LEFT SECTION (Branding) ── */
        .login-left {
          flex: 1.1;
          padding: 56px 44px;
          background: linear-gradient(135deg, rgba(30,58,138,0.02) 0%, rgba(59,130,246,0.04) 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 28px;
          border-right: 1px solid rgba(226,232,240,0.5);
        }

        .login-left h2 {
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin: 0;
          line-height: 1.2;
        }

        .login-left p {
          color: #475569;
          font-size: 1rem;
          line-height: 1.6;
          font-weight: 500;
          max-width: 85%;
          margin: 0;
        }

        .hello-animation-wrap {
          margin-top: 10px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hello-animation {
          width: 100%;
          max-width: 360px;
          min-height: 260px;
          filter: drop-shadow(0 10px 24px rgba(30,58,138,0.08));
        }

        /* ── RIGHT SECTION (Form) ── */
        .login-right {
          flex: 1;
          padding: 56px 48px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .login-header {
          margin-bottom: 36px;
        }

        .login-header h2 {
          font-size: 1.8rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0 0 8px;
        }

        .login-header p {
          color: #64748b;
          font-size: 0.95rem;
          font-weight: 500;
          margin: 0;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-field label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #475569;
        }

        .input-wrapper {
          position: relative;
          width: 100%;
        }

        .input-wrapper input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 16px;
          border: 1.8px solid #e8ecf1;
          background: #fafbfc;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s ease;
          font-family: inherit;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .input-wrapper input:hover {
          border-color: #cbd5e1;
          background: #ffffff;
        }

        .input-wrapper input:focus {
          border-color: #1e3a8a;
          box-shadow: 0 0 0 5px rgba(30,58,138,0.08), 0 2px 8px rgba(0,0,0,0.02);
          outline: none;
          background: #ffffff;
        }

        .password-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: all 0.2s ease;
        }

        .password-toggle:hover {
          background: rgba(30,58,138,0.06);
          color: #1e3a8a;
        }

        .forgot-password {
          text-align: right;
          margin-top: -8px;
        }

        .forgot-password a {
          color: #1e3a8a;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .forgot-password a:hover {
          color: #1e40af;
          text-decoration: underline;
        }

        .forgot-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 16px;
        }

        .forgot-modal {
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border-radius: 18px;
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.35);
          padding: 20px;
        }

        .forgot-modal h3 {
          margin: 0 0 8px;
          font-size: 1.2rem;
          font-weight: 700;
          color: #0f172a;
        }

        .forgot-modal p {
          margin: 0 0 14px;
          font-size: 0.9rem;
          color: #475569;
          font-weight: 500;
        }

        .forgot-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .forgot-form input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 12px;
          border: 1.6px solid #dbe1ea;
          background: #f8fafc;
          font-size: 0.92rem;
          font-family: inherit;
          color: #0f172a;
          box-sizing: border-box;
        }

        .forgot-form input:focus {
          outline: none;
          border-color: #1e3a8a;
          box-shadow: 0 0 0 4px rgba(30, 58, 138, 0.08);
          background: #fff;
        }

        .forgot-msg-error {
          color: #991b1b;
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .forgot-msg-success {
          color: #166534;
          background: #f0fdf4;
          border-left: 4px solid #22c55e;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .forgot-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 6px;
        }

        .forgot-btn {
          border: none;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }

        .forgot-btn.secondary {
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #334155;
        }

        .forgot-btn.primary {
          background: #1e3a8a;
          color: #fff;
        }

        .forgot-btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-error {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          color: #991b1b;
          border-radius: 16px;
          padding: 14px 18px;
          font-weight: 500;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: shake 0.3s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .auth-actions {
          display: flex;
          gap: 14px;
          margin-top: 8px;
        }

        .auth-btn {
          flex: 1;
          border: none;
          border-radius: 40px;
          padding: 12px 22px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          letter-spacing: -0.01em;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .auth-btn.primary {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          color: white;
          box-shadow: 0 4px 14px -4px rgba(30,58,138,0.3);
        }

        .auth-btn.primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -6px rgba(15,23,42,0.4), 0 0 0 4px rgba(30,58,138,0.06);
        }

        .auth-btn.primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .auth-btn.primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }

        .auth-btn.ghost {
          background: rgba(255,255,255,0.7);
          border: 1.5px solid #e2e8f0;
          color: #334155;
          backdrop-filter: blur(4px);
        }

        .auth-btn.ghost:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }

        .signup-link {
          margin-top: 32px;
          text-align: center;
          font-size: 0.9rem;
          color: #475569;
          font-weight: 500;
        }

        .signup-link a {
          color: #1e3a8a;
          font-weight: 600;
          text-decoration: none;
          margin-left: 4px;
          transition: all 0.2s;
        }

        .signup-link a:hover {
          color: #1e40af;
          text-decoration: underline;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .login-card {
            flex-direction: column;
            max-width: 520px;
          }
          .login-left {
            padding: 40px 32px;
            border-right: none;
            border-bottom: 1px solid #edf2f7;
          }
          .login-left p {
            max-width: 100%;
          }
          .login-right {
            padding: 40px 32px;
          }
        }

        @media (max-width: 480px) {
          .login-shell {
            padding: 16px 12px;
          }
          .login-left {
            padding: 28px 20px;
          }
          .login-right {
            padding: 28px 20px;
          }
          .login-left h2 {
            font-size: 2rem;
          }
          .login-header h2 {
            font-size: 1.5rem;
          }
          .auth-actions {
            flex-direction: column-reverse;
          }
        }
      `}</style>

      <div className="login-card">
        {/* Left Branding Section */}
        <div className="login-left" aria-hidden="true">
          <h2>Welcome back</h2>
          <p>
            Sign in to access your dashboard, manage bookings, and track service history.
          </p>
          <div className="hello-animation-wrap">
            {helloAnimationData ? (
              <Lottie animationData={helloAnimationData} loop autoplay className="hello-animation" />
            ) : (
              <div className="hello-animation" />
            )}
          </div>
        </div>

        {/* Right Form Section */}
        <div className="login-right">
          <div className="login-header">
            <h2>Sign in</h2>
            <p>Enter your credentials to continue</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Email address</label>
              <div className="input-wrapper">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="hello@example.com"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="input-wrapper">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="forgot-password">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openForgotModal();
                }}
              >
                Forgot password?
              </a>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="auth-actions">
              <button className="auth-btn ghost" type="button" onClick={onCancel}>
                Cancel
              </button>
              <button className="auth-btn primary" type="submit" disabled={loading}>
                {loading ? 'Signing in ...' : 'Sign in →'}
              </button>
            </div>
          </form>

          <div className="signup-link">
            Don't have an account?{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSignup?.();
              }}
            >
              Sign up
            </a>
          </div>
        </div>
      </div>

      {forgotOpen && (
        <div className="forgot-modal-backdrop" role="dialog" aria-modal="true" aria-label="Forgot password">
          <div className="forgot-modal">
            <h3>Reset your password</h3>
            <p>
              {forgotStep === 'email'
                ? 'Enter your account email to receive a 6-digit OTP.'
                : forgotStep === 'reset'
                  ? 'Enter the OTP sent to your email, then set a new password.'
                  : 'Your password has been reset successfully.'}
            </p>

            {forgotError ? <div className="forgot-msg-error">{forgotError}</div> : null}
            {forgotSuccess ? <div className="forgot-msg-success">{forgotSuccess}</div> : null}

            {forgotStep === 'email' && (
              <form className="forgot-form" onSubmit={handleRequestOtp}>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="hello@example.com"
                  required
                />
                <div className="forgot-actions">
                  <button type="button" className="forgot-btn secondary" onClick={closeForgotModal}>
                    Cancel
                  </button>
                  <button type="submit" className="forgot-btn primary" disabled={forgotLoading}>
                    {forgotLoading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'reset' && (
              <form className="forgot-form" onSubmit={handleResetWithOtp}>
                <input
                  type="text"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  placeholder="6-digit OTP"
                  required
                />
                <input
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="New password"
                  required
                />
                <input
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
                <div className="forgot-actions">
                  <button
                    type="button"
                    className="forgot-btn secondary"
                    onClick={() => {
                      setForgotStep('email');
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                  >
                    Back
                  </button>
                  <button type="submit" className="forgot-btn primary" disabled={forgotLoading}>
                    {forgotLoading ? 'Resetting...' : 'Reset password'}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'done' && (
              <div className="forgot-actions">
                <button
                  type="button"
                  className="forgot-btn primary"
                  onClick={() => {
                    setPassword('');
                    closeForgotModal();
                  }}
                >
                  Back to sign in
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;