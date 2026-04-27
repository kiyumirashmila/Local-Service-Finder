import React, { useState } from 'react';
import CustomerSignupPage from './CustomerSignupPage';
import SupplierSignupPage from './SupplierSignupPage';

/* ──────────────────────────────────────────────────
   ✦  INLINE SVG ICONS
   ────────────────────────────────────────────────── */
const IconUser = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconBriefcase = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const SignupPage = ({ onSuccess, onCancel }) => {
  const [role, setRole] = useState(null); // 'customer' | 'supplier' | null

  if (role === 'customer') {
    return (
      <CustomerSignupPage
        onSuccess={onSuccess}
        onCancel={onCancel}
        onBackToRoleSelect={() => setRole(null)}
      />
    );
  }

  if (role === 'supplier') {
    return (
      <SupplierSignupPage
        onSuccess={onSuccess}
        onCancel={onCancel}
        onBackToRoleSelect={() => setRole(null)}
      />
    );
  }

  return (
    <div className="signup-role-shell">
      <style>{`
        /* ═══════════════════════════════════════
           ✦  MODERN BLUE SIGNUP ROLE SELECTION
           ═══════════════════════════════════════ */
        .signup-role-shell {
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px 20px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 40%, #f8fafc 100%);
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* Subtle decorative circles */
        .signup-role-shell::before {
          content: '';
          position: absolute;
          top: -80px;
          right: -80px;
          width: 320px;
          height: 320px;
          background: radial-gradient(circle, rgba(30,58,138,0.06) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .signup-role-shell::after {
          content: '';
          position: absolute;
          bottom: -60px;
          left: -60px;
          width: 260px;
          height: 260px;
          background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .role-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 680px;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 28px;
          box-shadow:
            0 4px 6px -1px rgba(0,0,0,0.02),
            0 12px 24px -6px rgba(15,23,42,0.08),
            0 0 0 0.5px rgba(148,163,184,0.2);
          padding: 36px 32px;
          transition: all 0.3s ease;
        }

        .role-card:hover {
          box-shadow:
            0 4px 6px -1px rgba(0,0,0,0.03),
            0 16px 32px -8px rgba(15,23,42,0.12),
            0 0 0 0.5px rgba(148,163,184,0.25);
        }

        .role-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .role-header h2 {
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .role-header p {
          color: #475569;
          font-weight: 500;
          font-size: 0.95rem;
          margin: 0;
          line-height: 1.6;
        }

        .role-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .role-option {
          position: relative;
          background: #ffffff;
          border-radius: 20px;
          border: 2px solid #e2e8f0;
          padding: 24px 20px;
          text-align: left;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .role-option:hover {
          border-color: #3b82f6;
          background: #f8faff;
          transform: translateY(-3px);
          box-shadow: 0 10px 25px -8px rgba(59,130,246,0.2), 0 0 0 4px rgba(59,130,246,0.08);
        }

        .role-option:active {
          transform: scale(0.98);
          transition: transform 0.1s ease;
        }

        .role-option .role-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1e3a8a;
          transition: all 0.25s ease;
        }

        .role-option:hover .role-icon {
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          color: white;
          transform: rotate(-5deg) scale(1.05);
        }

        .role-option h4 {
          margin: 0;
          font-weight: 700;
          font-size: 1.1rem;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .role-option p {
          margin: 0;
          color: #64748b;
          font-weight: 500;
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .role-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 8px;
          border-top: 1px solid #edf2f7;
        }

        .btn {
          border-radius: 40px;
          padding: 10px 22px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          border: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          letter-spacing: -0.01em;
        }

        .btn.ghost {
          background: rgba(255,255,255,0.7);
          border: 1.5px solid #e2e8f0;
          color: #334155;
          backdrop-filter: blur(4px);
        }

        .btn.ghost:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }

        .btn.ghost:active {
          transform: scale(0.96);
        }

        /* Responsive */
        @media (max-width: 600px) {
          .signup-role-shell {
            padding: 16px 12px;
          }
          .role-card {
            padding: 24px 18px;
            border-radius: 24px;
          }
          .role-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .role-header h2 {
            font-size: 1.6rem;
          }
        }

        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .role-card {
          animation: fadeSlide 0.4s ease;
        }
      `}</style>

      <div className="role-card">
        <div className="role-header">
          <h2>Join Us Today</h2>
          <p>
            Choose your role to get started. Create a customer account to book services,
            or a supplier profile to receive bookings.
          </p>
        </div>

        <div className="role-grid">
          <button type="button" className="role-option" onClick={() => setRole('customer')}>
            <div className="role-icon">
              <IconUser />
            </div>
            <div>
              <h4>Customer</h4>
              <p>Book online services and manage your requests.</p>
            </div>
          </button>

          <button type="button" className="role-option" onClick={() => setRole('supplier')}>
            <div className="role-icon">
              <IconBriefcase />
            </div>
            <div>
              <h4>Supplier</h4>
              <p>Create your service profile and receive bookings.</p>
            </div>
          </button>
        </div>

        <div className="role-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            <IconChevronLeft /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;