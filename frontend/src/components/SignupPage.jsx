import React, { useState } from 'react';
import CustomerSignupPage from './CustomerSignupPage';
import SupplierSignupPage from './SupplierSignupPage';

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
        .signup-role-shell{
          min-height: calc(100vh - 80px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 28px 16px;
          background: linear-gradient(135deg, rgba(249,115,22,0.14), rgba(255,255,255,1) 55%);
        }
        .role-card{
          width: 100%;
          max-width: 720px;
          background:#fff;
          border:1px solid rgba(229,231,235,1);
          border-radius: 18px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.08);
          padding: 22px;
        }
        .role-title{
          font-size: 22px;
          font-weight: 1000;
          color:#111827;
          margin: 0 0 6px;
        }
        .role-subtitle{
          margin: 0 0 18px;
          color:#6b7280;
          font-weight: 800;
          line-height: 1.5;
        }
        .role-grid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .role-option{
          border-radius: 16px;
          border: 1px solid rgba(229,231,235,1);
          background: rgba(249,115,22,0.06);
          padding: 16px;
          text-align:left;
          cursor:pointer;
        }
        .role-option:hover{
          border-color: rgba(249,115,22,0.5);
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }
        .role-option h4{
          margin: 0 0 6px;
          font-weight: 1100;
          color:#111827;
          font-size: 16px;
        }
        .role-option p{
          margin: 0;
          color:#6b7280;
          font-weight: 800;
          line-height: 1.5;
          font-size: 13px;
        }
        .role-icon{
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display:flex;
          align-items:center;
          justify-content:center;
          background: rgba(249,115,22,0.16);
          margin-bottom: 10px;
          color:#f97316;
        }
        .role-actions{
          display:flex;
          justify-content:flex-end;
          margin-top: 14px;
          gap: 12px;
        }
        .btn{
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 1000;
          cursor:pointer;
          border: none;
        }
        .btn.ghost{
          background:#fff;
          border:1px solid rgba(229,231,235,1);
          color:#374151;
        }
        @media (max-width: 720px){
          .role-grid{ grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="role-card">
        <h2 className="role-title">Sign Up</h2>
        <p className="role-subtitle">Choose your role. You can create either a customer account or a supplier profile.</p>

        <div className="role-grid">
          <button type="button" className="role-option" onClick={() => setRole('customer')}>
            <div className="role-icon" aria-hidden="true">
              <i className="fas fa-calendar-check"></i>
            </div>
            <h4>Customer</h4>
            <p>Book online services and manage your requests.</p>
          </button>

          <button type="button" className="role-option" onClick={() => setRole('supplier')}>
            <div className="role-icon" aria-hidden="true">
              <i className="fas fa-user-tie"></i>
            </div>
            <h4>Supplier</h4>
            <p>Create your service profile and receive bookings.</p>
          </button>
        </div>

        <div className="role-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;

