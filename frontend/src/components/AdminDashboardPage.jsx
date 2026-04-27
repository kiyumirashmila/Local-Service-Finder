import React, { useContext, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import AdminSuppliersPage from './admin/AdminSuppliersPage';
import AdminDiscountsPage from './admin/AdminDiscountsPage';
import { createCatalogRequest, fetchPublicCatalogOptions } from '../services/api';

const AdminDashboardPage = () => {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const [tab, setTab] = useState('suppliers');

  /* ── Catalog Request Form state ── */
  const [reqCategory, setReqCategory] = useState('');
  const [reqServices, setReqServices] = useState(['']);
  const [reqSending, setReqSending] = useState(false);
  const [reqMsg, setReqMsg] = useState('');
  const [reqMsgType, setReqMsgType] = useState(''); // 'success' | 'error'
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  // Load catalog categories once when tab opens
  const loadCatalogIfNeeded = () => {
    if (catalogLoaded) return;
    fetchPublicCatalogOptions()
      .then((res) => {
        setCatalogCategories(res.data?.categories || []);
        setCatalogLoaded(true);
      })
      .catch(() => setCatalogLoaded(true));
  };

  const handleSendCatalogRequest = async () => {
    setReqMsg('');
    const category = reqCategory.trim();
    const services = reqServices.map((s) => s.trim()).filter(Boolean);
    if (!category) {
      setReqMsg('Please enter a category name.');
      setReqMsgType('error');
      return;
    }
    if (!services.length) {
      setReqMsg('Please add at least one service.');
      setReqMsgType('error');
      return;
    }
    try {
      setReqSending(true);
      const res = await createCatalogRequest({
        category,
        services,
        supplierName: 'Ecosystem Manager',
        supplierId: null
      });
      setReqMsg(res?.data?.message || 'Request sent to Operational Manager for approval.');
      setReqMsgType('success');
      setReqCategory('');
      setReqServices(['']);
    } catch (err) {
      setReqMsg(err?.response?.data?.message || 'Failed to send request.');
      setReqMsgType('error');
    } finally {
      setReqSending(false);
    }
  };

  const allowed = useMemo(() => isAuthenticated && user?.role === 'admin', [isAuthenticated, user?.role]);

  if (!allowed) {
    return (
      <div className="admin-unauth-shell">
        <style>{`
          .admin-unauth-shell{
            min-height: calc(100vh - 80px);
            padding: 28px 16px;
            display:flex;
            align-items:center;
            justify-content:center;
          }
          .card{
            width:100%;
            max-width: 760px;
            background:#fff;
            border:1px solid rgba(229,231,235,1);
            border-radius: 18px;
            padding: 22px;
            box-shadow: 0 16px 40px rgba(0,0,0,0.08);
          }
          .card h2{
            margin:0 0 8px;
            font-weight: 1100;
            color:#111827;
          }
          .card p{
            margin:0;
            color:#6b7280;
            font-weight: 800;
          }
          .actions{
            margin-top: 16px;
            display:flex;
            gap: 12px;
          }
          .btn{
            border-radius: 14px;
            padding: 10px 12px;
            font-weight: 1100;
            cursor:pointer;
            border:none;
          }
          .btn.primary{ background:#f97316; color:#fff; }
          .btn.ghost{
            background:#fff;
            border:1px solid rgba(229,231,235,1);
            color:#374151;
          }
        `}</style>
        <div className="card">
          <h2>Ecosystem Manager access required</h2>
          <p>Please sign in with an ecosystem manager account to open this workspace.</p>
          <div className="actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                window.location.hash = 'login';
              }}
            >
              Go to Login
            </button>
            {isAuthenticated && (
              <button type="button" className="btn ghost" onClick={logout}>
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-shell">
      <style>{`
        .admin-dashboard-shell{
          min-height: calc(100vh - 80px);
          display:flex;
          padding: 18px;
          gap: 16px;
        }
        .sidebar{
          width: 240px;
          background:#fff;
          border:1px solid rgba(229,231,235,1);
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.06);
          height: fit-content;
          position: sticky;
          top: 18px;
          align-self: flex-start;
        }
        .side-title{
          display:flex;
          gap: 12px;
          align-items:center;
          margin-bottom: 14px;
        }
        .badge{
          width: 42px;
          height: 42px;
          border-radius: 16px;
          background: rgba(249,115,22,0.12);
          border: 1px solid rgba(249,115,22,0.25);
          display:flex;
          align-items:center;
          justify-content:center;
          color:#f97316;
          font-weight: 1100;
        }
        .side-title h3{
          margin:0;
          font-size: 16px;
          font-weight: 1100;
          color:#111827;
        }
        .side-title p{
          margin: 4px 0 0;
          color:#6b7280;
          font-weight: 800;
          font-size: 13px;
        }
        .side-role{
          margin: 2px 0 0 !important;
          font-size: 12px !important;
          color:#9a3412 !important;
          font-weight: 900 !important;
        }
        .nav{
          display:flex;
          flex-direction:column;
          gap: 10px;
          margin-top: 10px;
        }
        .nav button{
          text-align:left;
          border-radius: 16px;
          padding: 12px 12px;
          border:1px solid rgba(229,231,235,1);
          background:#fff;
          cursor:pointer;
          font-weight: 1100;
          color:#111827;
          display:flex;
          gap: 10px;
          align-items:center;
        }
        .nav button.active{
          border-color: rgba(249,115,22,0.45);
          background: rgba(249,115,22,0.08);
          color:#9a3412;
        }
        .side-footer{
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(229,231,235,1);
          display:flex;
          gap: 10px;
          align-items:center;
        }
        .side-footer button{
          width:100%;
        }
        .btn{
          border-radius: 14px;
          padding: 10px 12px;
          font-weight: 1100;
          cursor:pointer;
          border:none;
        }
        .btn.primary{ background:#f97316; color:#fff; }
        .content{
          flex: 1;
          min-width: 0;
          background: transparent;
        }
        @media (max-width: 920px){
          .admin-dashboard-shell{
            flex-direction:column;
          }
          .sidebar{ width: 100%; position: relative; top: auto; }
        }
      `}</style>

      <aside className="sidebar">
        <div className="side-title">
          <div className="badge" aria-hidden="true">
            <i className="fas fa-shield-alt" />
          </div>
          <div>
            <h3>Ecosystem Manager</h3>
            <p className="side-role">Supplier onboarding &amp; catalog requests</p>
            <p>{user?.email}</p>
          </div>
        </div>

        <div className="nav" role="navigation" aria-label="Ecosystem Manager navigation">
          <button type="button" className={tab === 'suppliers' ? 'active' : ''} onClick={() => setTab('suppliers')}>
            <i className="fas fa-user-tie" aria-hidden="true" />
            Supplier Requests
          </button>
          <button
            type="button"
            className={tab === 'catalog-request' ? 'active' : ''}
            onClick={() => {
              setTab('catalog-request');
              loadCatalogIfNeeded();
            }}
          >
            <i className="fas fa-paper-plane" aria-hidden="true" />
            Send New Category / Service
          </button>
          <button type="button" className={tab === 'discounts' ? 'active' : ''} onClick={() => setTab('discounts')}>
            <i className="fas fa-tags" aria-hidden="true" />
            Discounts
          </button>
        </div>

        <div className="side-footer">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              logout();
              window.location.hash = 'home';
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="content">
        {tab === 'suppliers' && <AdminSuppliersPage managerTitle="Ecosystem Manager" />}

        {tab === 'catalog-request' && (
          <div style={{
            background: '#fff',
            border: '1px solid rgba(229,231,235,1)',
            borderRadius: 20,
            boxShadow: '0 16px 40px rgba(0,0,0,0.04)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid rgba(229,231,235,1)',
              background: 'linear-gradient(135deg, rgba(249,115,22,0.06) 0%, rgba(255,255,255,1) 55%)'
            }}>
              <h3 style={{ margin: 0, fontWeight: 1100, color: '#111827', fontSize: 16 }}>
                <i className="fas fa-paper-plane" style={{ marginRight: 8, color: '#f97316' }} />
                Send New Category / Service to Operational Manager
              </h3>
              <p style={{ margin: '6px 0 0', color: '#6b7280', fontWeight: 800, fontSize: 13, lineHeight: 1.5 }}>
                Propose new categories or services to be added to the platform catalog. The Operational Manager will review, set pricing, and approve them.
              </p>
            </div>

            {/* Form Body */}
            <div style={{ padding: '20px' }}>
              {/* Info banner */}
              <div style={{
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid rgba(59,130,246,0.25)',
                background: 'rgba(59,130,246,0.05)',
                marginBottom: 20,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start'
              }}>
                <i className="fas fa-info-circle" style={{ color: '#3b82f6', fontSize: 16, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: '#1e40af', fontWeight: 800, lineHeight: 1.55 }}>
                  As Ecosystem Manager, you cannot directly add categories or services to the catalog. Use this form to send a request to the Operational Manager (Admin2), who will add them with proper pricing and market research.
                </div>
              </div>

              {/* Existing categories reference */}
              {catalogCategories.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Existing categories in catalog
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {catalogCategories.map((c) => (
                      <span key={c} style={{
                        padding: '5px 10px',
                        borderRadius: 999,
                        border: '1px solid rgba(229,231,235,1)',
                        background: '#fff',
                        fontWeight: 900,
                        fontSize: 12,
                        color: '#374151'
                      }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Category input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 900, color: '#374151', marginBottom: 6 }}>
                  Category Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value)}
                  placeholder="e.g., Landscaping, HVAC, Pet Care..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: '1px solid rgba(229,231,235,1)',
                    fontWeight: 800,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {reqCategory.trim() && catalogCategories.some((c) => c.toLowerCase() === reqCategory.trim().toLowerCase()) && (
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: '#059669' }}>
                    <i className="fas fa-check-circle" style={{ marginRight: 4 }} />
                    This category already exists — you can add new services under it.
                  </div>
                )}
                {reqCategory.trim() && !catalogCategories.some((c) => c.toLowerCase() === reqCategory.trim().toLowerCase()) && (
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: '#d97706' }}>
                    <i className="fas fa-plus-circle" style={{ marginRight: 4 }} />
                    This is a new category — it will be created after approval.
                  </div>
                )}
              </div>

              {/* Services inputs */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 900, color: '#374151', marginBottom: 6 }}>
                  Services <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {reqServices.map((svc, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      type="text"
                      value={svc}
                      onChange={(e) => {
                        const next = [...reqServices];
                        next[idx] = e.target.value;
                        setReqServices(next);
                      }}
                      placeholder={idx === 0 ? 'e.g., Lawn Mowing' : 'Another service...'}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 14,
                        border: '1px solid rgba(229,231,235,1)',
                        fontWeight: 800,
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = reqServices.filter((_, i) => i !== idx);
                        setReqServices(next.length ? next : ['']);
                      }}
                      disabled={reqServices.length <= 1}
                      style={{
                        borderRadius: 12,
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: reqServices.length <= 1 ? '#f9fafb' : 'rgba(239,68,68,0.06)',
                        color: reqServices.length <= 1 ? '#d1d5db' : '#991b1b',
                        padding: '8px 12px',
                        cursor: reqServices.length <= 1 ? 'not-allowed' : 'pointer',
                        fontWeight: 1100,
                        fontSize: 12
                      }}
                    >
                      <i className="fas fa-trash-alt" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setReqServices([...reqServices, ''])}
                  style={{
                    borderRadius: 12,
                    border: '1px solid rgba(229,231,235,1)',
                    background: '#fff',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontWeight: 1100,
                    fontSize: 12,
                    color: '#374151',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <i className="fas fa-plus" /> Add another service
                </button>
              </div>

              {/* Message */}
              {reqMsg && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: `1px solid ${reqMsgType === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  background: reqMsgType === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  color: reqMsgType === 'success' ? '#065f46' : '#991b1b',
                  fontWeight: 900,
                  fontSize: 13,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <i className={`fas ${reqMsgType === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
                  {reqMsg}
                </div>
              )}

              {/* Send button */}
              <button
                type="button"
                onClick={handleSendCatalogRequest}
                disabled={reqSending}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 14,
                  border: 'none',
                  background: reqSending ? '#d1d5db' : 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: '#fff',
                  fontWeight: 1100,
                  fontSize: 15,
                  cursor: reqSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: reqSending ? 'none' : '0 4px 14px rgba(249,115,22,0.3)'
                }}
              >
                <i className={`fas ${reqSending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
                {reqSending ? 'Sending...' : 'Send to Operational Manager'}
              </button>
            </div>
          </div>
        )}
        {tab === 'discounts' && <AdminDiscountsPage />}
      </main>
    </div>
  );
};

export default AdminDashboardPage;

