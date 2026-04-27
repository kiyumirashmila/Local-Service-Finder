import React, { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const LoginPage = ({ onSuccess, onCancel, onSignup }) => {
  const { loginReal } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <div className="login-shell">
      <style>{`
        /* ----- RESET & GLOBAL ----- */
        .login-shell * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .login-shell {
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          background: #f9fafb;
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
          position: relative;
        }

        /* Soft background glow in orange */
        .login-shell::before {
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(249,115,22,0.04) 0%, rgba(249,115,22,0) 70%);
          top: -250px;
          right: -200px;
          pointer-events: none;
        }

        .login-shell::after {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(249,115,22,0.03) 0%, rgba(249,115,22,0) 70%);
          bottom: -200px;
          left: -200px;
          pointer-events: none;
        }

        /* ----- MAIN CARD (modern, elevated) ----- */
        .login-card {
          width: 100%;
          max-width: 1100px;
          background: #ffffff;
          border-radius: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02);
          display: flex;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s;
          position: relative;
          z-index: 2;
        }

        /* ----- LEFT SECTION (branding) ----- */
        .login-left {
          flex: 1.1;
          padding: 56px 44px;
          background: linear-gradient(145deg, #fefaf5 0%, #ffffff 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 28px;
        }

        .login-left h2 {
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #f97316, #fb923c);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin: 0;
        }

        .login-left p {
          color: #4b5563;
          font-size: 1rem;
          line-height: 1.5;
          font-weight: 500;
          max-width: 85%;
        }

        /* Feature list - clean and modern */
        .feature-list {
          margin-top: 28px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .feature-icon {
          width: 36px;
          height: 36px;
          background: rgba(249, 115, 22, 0.1);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          font-weight: 600;
          color: #f97316;
        }

        .feature-text {
          font-size: 0.95rem;
          font-weight: 500;
          color: #1f2937;
        }

        /* ----- RIGHT SECTION (form) ----- */
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
          color: #111827;
          letter-spacing: -0.01em;
          margin-bottom: 8px;
        }

        .login-header p {
          color: #6b7280;
          font-size: 0.95rem;
          font-weight: 500;
        }

        /* Form fields */
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .auth-field label {
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #4b5563;
        }

        .input-wrapper {
          position: relative;
          width: 100%;
        }

        .input-wrapper input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 20px;
          border: 1.5px solid #e5e7eb;
          background: #fefefe;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s;
          font-family: inherit;
          color: #111827;
        }

        .input-wrapper input:hover {
          border-color: #d1d5db;
          background: #ffffff;
        }

        .input-wrapper input:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
          outline: none;
          background: #ffffff;
        }

        /* Password toggle */
        .password-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          color: #6b7280;
        }

        .password-toggle:hover {
          background: rgba(0, 0, 0, 0.04);
        }

        /* Forgot password link */
        .forgot-password {
          text-align: right;
          margin-top: -6px;
        }

        .forgot-password a {
          color: #f97316;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 600;
          transition: color 0.2s;
        }

        .forgot-password a:hover {
          color: #ea580c;
          text-decoration: underline;
        }

        /* Error message */
        .auth-error {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          color: #b91c1c;
          border-radius: 16px;
          padding: 12px 16px;
          font-weight: 500;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: shake 0.3s ease;
        }

        .auth-error::before {
          content: '⚠️';
          font-size: 1rem;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        /* Buttons */
        .auth-actions {
          display: flex;
          gap: 16px;
          margin-top: 24px;
        }

        .auth-btn {
          flex: 1;
          border: none;
          border-radius: 40px;
          padding: 12px 20px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .auth-btn.primary {
          background: #f97316;
          color: white;
          box-shadow: 0 2px 6px rgba(249, 115, 22, 0.2);
        }

        .auth-btn.primary:hover:not(:disabled) {
          background: #ea580c;
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(249, 115, 22, 0.25);
        }

        .auth-btn.primary:active:not(:disabled) {
          transform: translateY(1px);
        }

        .auth-btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-btn.ghost {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          color: #334155;
        }

        .auth-btn.ghost:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        /* Signup link */
        .signup-link {
          margin-top: 28px;
          text-align: center;
          font-size: 0.9rem;
          color: #4b5563;
        }

        .signup-link a {
          color: #f97316;
          font-weight: 600;
          text-decoration: none;
          margin-left: 4px;
          transition: color 0.2s;
        }

        .signup-link a:hover {
          color: #ea580c;
          text-decoration: underline;
        }

        /* Loading animation */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .auth-btn.primary:disabled {
          animation: pulse 1.2s ease-in-out infinite;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .login-card {
            flex-direction: column;
            max-width: 520px;
          }
          .login-left {
            padding: 40px 32px;
            border-bottom: 1px solid #f1f5f9;
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
            padding: 20px 16px;
          }
          .login-left {
            padding: 32px 24px;
          }
          .login-right {
            padding: 32px 24px;
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
        <div className="login-left" aria-hidden="true">
          <h2>Welcome back</h2>
          <p>Sign in to access your dashboard, manage bookings, and track service history.</p>
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon">📅</div>
              <div className="feature-text">Real-time booking tracking</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔄</div>
              <div className="feature-text">Easy rescheduling & cancellations</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">⭐</div>
              <div className="feature-text">Rate and review professionals</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">💬</div>
              <div className="feature-text">24/7 customer support</div>
            </div>
          </div>
        </div>

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
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="forgot-password">
              <a href="#" onClick={(e) => e.preventDefault()}>
                Forgot password?
              </a>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="auth-actions">
              <button className="auth-btn ghost" type="button" onClick={onCancel}>
                Cancel
              </button>
              <button className="auth-btn primary" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in →'}
              </button>
            </div>
          </form>

          <div className="signup-link">
            Don't have an account?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onSignup?.(); }}>
              Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;