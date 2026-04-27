import React, { useContext, useMemo, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import AdminSuppliersPage from './AdminSuppliersPage';
import AdminReviewsPage from './AdminReviewsPage';
import AdminComplaintsPage from './AdminComplaintsPage';
import AdminBookingsPage from './AdminBookingsPage';
import AdminDiscountsPage from './AdminDiscountsPage';

const AdminDashboardPage = () => {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const [tab, setTab] = useState('suppliers');

  const allowed = useMemo(() => isAuthenticated && user?.role === 'admin', [isAuthenticated, user?.role]);

  if (!allowed) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 760, background: '#fff', borderRadius: 18, border: '1px solid rgba(229,231,235,1)', padding: 22, boxShadow: '0 16px 40px rgba(0,0,0,0.08)' }}>
          <h2 style={{ margin: 0, fontWeight: 1100, color: '#111827' }}>Ecosystem Manager access required</h2>
          <p style={{ margin: '8px 0 0', color: '#6b7280', fontWeight: 800 }}>Please sign in as ecosystem manager to open this workspace.</p>
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button className="btn-primary" type="button" onClick={() => { window.location.hash = 'login'; }}>
              Go to Login
            </button>
            {isAuthenticated && (
              <button className="btn-ghost" type="button" onClick={logout}>
                Logout
              </button>
            )}
          </div>
        </div>
        <style>{`
          .btn-primary{
            border-radius: 14px;
            padding: 10px 12px;
            font-weight: 1100;
            cursor: pointer;
            border: none;
            background: #f97316;
            color:#fff;
          }
          .btn-ghost{
            border-radius: 14px;
            padding: 10px 12px;
            font-weight: 1100;
            cursor: pointer;
            border:1px solid rgba(229,231,235,1);
            background:#fff;
            color:#374151;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <style>{`
        .admin-shell{
          min-height: calc(100vh - 80px);
          display:flex;
          background: #f8fafc;
        }
        .admin-sidebar{
          width: 270px;
          background:#ffffff;
          border-right: 1px solid rgba(229,231,235,1);
          padding: 16px;
          display:flex;
          flex-direction:column;
          gap: 14px;
        }
        .admin-brand{
          display:flex;
          align-items:center;
          gap: 12px;
          padding: 10px 8px;
        }
        .brand-badge{
          width: 44px;
          height: 44px;
          border-radius: 16px;
          background: rgba(249,115,22,0.12);
          border: 1px solid rgba(249,115,22,0.25);
          display:flex;
          align-items:center;
          justify-content:center;
          color:#f97316;
          font-weight: 1100;
          font-size: 18px;
        }
        .admin-brand h3{
          margin:0;
          font-size: 14px;
          font-weight: 1100;
          color:#111827;
          letter-spacing: 0.01em;
        }
        .admin-brand p{
          margin: 3px 0 0;
          color:#6b7280;
          font-weight: 800;
          font-size: 12px;
        }
        .admin-nav{
          display:flex;
          flex-direction:column;
          gap: 8px;
          padding: 6px;
          border-radius: 18px;
          border: 1px solid rgba(229,231,235,1);
          background: rgba(255,255,255,0.9);
        }
        .nav-item{
          display:flex;
          align-items:center;
          gap: 10px;
          padding: 12px 12px;
          border-radius: 16px;
          border:1px solid transparent;
          background: transparent;
          cursor:pointer;
          text-align:left;
          font-weight: 1100;
          color:#111827;
          font-size: 13px;
        }
        .nav-item.active{
          border-color: rgba(249,115,22,0.45);
          background: rgba(249,115,22,0.08);
          color:#9a3412;
        }
        .admin-sidebar-footer{
          margin-top:auto;
          padding: 10px 6px;
          display:flex;
          gap: 10px;
          flex-direction:column;
        }
        .topbar{
          flex:1;
          display:flex;
          flex-direction:column;
        }
        .topbar-inner{
          height: 68px;
          background: #ffffff;
          border-bottom: 1px solid rgba(229,231,235,1);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 14px;
          padding: 0 18px;
        }
        .search{
          flex: 1;
          display:flex;
          align-items:center;
          gap: 10px;
          max-width: 520px;
        }
        .search input{
          width:100%;
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(229,231,235,1);
          background: #f8fafc;
          outline:none;
          font-weight: 800;
        }
        .top-actions{
          display:flex;
          align-items:center;
          gap: 10px;
        }
        .icon-btn{
          width: 42px;
          height: 42px;
          border-radius: 16px;
          border:1px solid rgba(229,231,235,1);
          background:#fff;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          color:#6b7280;
        }
        .admin-profile{
          display:flex;
          align-items:center;
          gap: 10px;
          border:1px solid rgba(229,231,235,1);
          background:#fff;
          padding: 8px 10px;
          border-radius: 16px;
        }
        .admin-profile .admin-avatar{
          width: 34px;
          height: 34px;
          border-radius: 14px;
          border:1px solid rgba(229,231,235,1);
          background: rgba(17,24,39,0.03);
          overflow:hidden;
          display:flex;
          align-items:center;
          justify-content:center;
        }
        .admin-profile .admin-avatar img{ width:100%; height:100%; object-fit:cover; }
        .admin-profile .meta{
          display:flex;
          flex-direction:column;
          line-height: 1.1;
        }
        .admin-profile .meta b{
          font-size: 12px;
          font-weight: 1100;
          color:#111827;
        }
        .admin-profile .meta span{
          font-size: 11px;
          font-weight: 800;
          color:#6b7280;
        }
        .logout-btn{
          border-radius: 16px;
          padding: 10px 14px;
          border: 1px solid rgba(229,231,235,1);
          background: #fff;
          color: #374151;
          font-weight: 1100;
          cursor: pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          gap: 8px;
          white-space: nowrap;
        }
        .logout-btn:hover{
          border-color: rgba(249,115,22,0.45);
          color:#9a3412;
        }
        .admin-content{
          padding: 18px;
        }
        @media (max-width: 980px){
          .admin-sidebar{ width: 220px; }
          .search{ max-width: 360px; }
        }
        @media (max-width: 720px){
          .admin-shell{ flex-direction:column; }
          .admin-sidebar{ width: 100%; border-right:none; border-bottom: 1px solid rgba(229,231,235,1); }
        }
      `}</style>

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="brand-badge" aria-hidden="true">
            <i className="fas fa-shield-alt" />
          </div>
          <div>
            <h3>Ecosystem Manager</h3>
            <p style={{ margin: '4px 0 0', color: '#9a3412', fontWeight: 900, fontSize: 12 }}>Supplier onboarding &amp; requests</p>
          </div>
        </div>

        <div className="admin-nav" role="navigation" aria-label="Ecosystem Manager navigation">
          <button
            type="button"
            className={`nav-item ${tab === 'suppliers' ? 'active' : ''}`}
            onClick={() => setTab('suppliers')}
          >
            <i className="fas fa-user-tie" aria-hidden="true" /> Suppliers
          </button>
          <button
            type="button"
            className={`nav-item ${tab === 'reviews' ? 'active' : ''}`}
            onClick={() => setTab('reviews')}
          >
            <i className="fas fa-star" aria-hidden="true" /> Reviews
          </button>
          <button
            type="button"
            className={`nav-item ${tab === 'complaints' ? 'active' : ''}`}
            onClick={() => setTab('complaints')}
          >
            <i className="fas fa-triangle-exclamation" aria-hidden="true" /> Complaint
          </button>
          <button
            type="button"
            className={`nav-item ${tab === 'bookings' ? 'active' : ''}`}
            onClick={() => setTab('bookings')}
          >
            <i className="fas fa-calendar-check" aria-hidden="true" /> Booking
          </button>
          <button
            type="button"
            className={`nav-item ${tab === 'discounts' ? 'active' : ''}`}
            onClick={() => setTab('discounts')}
          >
            <i className="fas fa-tags" aria-hidden="true" /> Discounts
          </button>
        </div>

        <div className="admin-sidebar-footer">
          <div style={{ color: '#6b7280', fontWeight: 900, fontSize: 12, padding: '0 6px' }}>
            Logout from top bar
          </div>
        </div>
      </aside>

      <div className="topbar">
        <div className="topbar-inner">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <b style={{ fontSize: 14, fontWeight: 1100, color: '#111827' }}>Ecosystem Manager</b>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#6b7280' }}>Supplier requests · suggestions to operational manager</span>
          </div>

          <div className="top-actions">
            <div className="admin-profile">
              <div className="admin-avatar" aria-hidden="true">
                {user?.avatar ? <img src={user.avatar} alt="admin" /> : <i className="fas fa-user" />}
              </div>
              <div className="meta">
                <b>{user?.name || 'Admin'}</b>
                <span>Ecosystem Manager</span>
              </div>
            </div>

            <button
              type="button"
              className="logout-btn"
              onClick={() => {
                logout();
                window.location.hash = 'home';
              }}
              aria-label="Logout"
            >
              <i className="fas fa-sign-out-alt" aria-hidden="true" />
              Logout
            </button>
          </div>
        </div>

        <div className="admin-content">
          {tab === 'suppliers' && <AdminSuppliersPage managerTitle="Ecosystem Manager" />}
          {tab === 'reviews' && <AdminReviewsPage />}
          {tab === 'complaints' && <AdminComplaintsPage />}
          {tab === 'bookings' && <AdminBookingsPage />}
          {tab === 'discounts' && <AdminDiscountsPage />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

