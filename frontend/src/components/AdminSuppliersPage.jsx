import React, { useEffect, useState } from 'react';
import {
  fetchAdminSuppliers,
  approveAdminSupplier,
  rejectAdminSupplier
} from '../services/api';

const AdminSuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rowAction, setRowAction] = useState({ id: null, action: null });

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetchAdminSuppliers();
      setSuppliers(res.data.suppliers || []);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to load suppliers.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDecision = async (id, decision) => {
    setError('');
    setRowAction({ id, action: decision });
    try {
      if (decision === 'approve') await approveAdminSupplier(id);
      else await rejectAdminSupplier(id);
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Action failed.';
      setError(msg);
    } finally {
      setRowAction({ id: null, action: null });
    }
  };

  return (
    <div className="admin-page">
      <style>{`
        .admin-page{
          width:100%;
          padding: 18px;
        }
        .admin-head{
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap: 16px;
          margin-bottom: 14px;
        }
        .admin-head h3{
          margin:0;
          font-size: 18px;
          font-weight: 1100;
          color:#111827;
        }
        .admin-head p{
          margin:4px 0 0;
          color:#6b7280;
          font-weight: 800;
          font-size: 13px;
        }
        .table-wrap{
          border: 1px solid rgba(229,231,235,1);
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
        }
        table{
          width:100%;
          border-collapse: collapse;
        }
        th, td{
          padding: 12px 10px;
          border-bottom: 1px solid rgba(229,231,235,1);
          text-align:left;
          vertical-align: top;
          font-size: 13px;
          font-weight: 800;
          color:#111827;
        }
        th{
          background: rgba(249,115,22,0.06);
          color:#374151;
          font-weight: 1100;
          font-size: 12px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .muted{
          color:#6b7280;
          font-weight: 800;
        }
        .avatar{
          width:34px;
          height:34px;
          border-radius: 12px;
          border: 1px solid rgba(229,231,235,1);
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
          background: rgba(17,24,39,0.03);
        }
        .avatar img{ width:100%; height:100%; object-fit: cover; }
        .status{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(229,231,235,1);
          background:#fff;
          font-weight: 1100;
          font-size: 12px;
          color:#111827;
        }
        .status.pending{ border-color: rgba(249,115,22,0.35); background: rgba(249,115,22,0.08); color:#9a3412; }
        .status.approved{ border-color: rgba(16,185,129,0.35); background: rgba(16,185,129,0.08); color:#065f46; }
        .status.rejected{ border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.08); color:#991b1b; }
        .row-actions{
          display:flex;
          gap: 10px;
          align-items:center;
          flex-wrap: wrap;
        }
        .btn{
          border-radius: 14px;
          padding: 8px 10px;
          font-weight: 1100;
          cursor:pointer;
          border: 1px solid rgba(229,231,235,1);
          background:#fff;
          color:#111827;
          font-size: 12px;
        }
        .btn.primary{
          background:#f97316;
          border-color:#f97316;
          color:#fff;
        }
        .btn.danger{
          background:#ef4444;
          border-color:#ef4444;
          color:#fff;
        }
        .btn:disabled{
          opacity:0.65;
          cursor:not-allowed;
        }
        .auth-error{
          background:#fee2e2;
          border:1px solid #fecaca;
          color:#991b1b;
          border-radius: 14px;
          padding: 10px 12px;
          font-weight: 900;
          font-size: 13px;
          margin-bottom: 12px;
        }
        .loading{
          color:#6b7280;
          font-weight: 900;
          padding: 14px;
        }
      `}</style>

      <div className="admin-head">
        <div>
          <h3>Suppliers</h3>
          <p>Approve or reject supplier profiles.</p>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="table-wrap">
        {loading ? (
          <div className="loading">Loading suppliers...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Contact</th>
                <th>Service</th>
                <th>Experience</th>
                <th>NIC</th>
                <th>Location</th>
                <th>Status</th>
                <th style={{ width: 240 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length ? (
                suppliers.map((s) => {
                  const status = s.supplierApprovalStatus || 'pending';
                  const serviceLabel =
                    s.serviceCategory === 'other' && s.serviceCategoryOther
                      ? `Other (${s.serviceCategoryOther})`
                      : s.serviceCategory;

                  const isApproving = rowAction.id === s.id && rowAction.action === 'approve';
                  const isRejecting = rowAction.id === s.id && rowAction.action === 'reject';

                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div className="avatar" aria-hidden="true">
                            {s.avatar ? <img src={s.avatar} alt="" /> : <i className="fas fa-user" />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 1100 }}>{s.fullName || '-'}</div>
                            <div className="muted">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="muted">{s.phone || '-'}</td>
                      <td>{serviceLabel || '-'}</td>
                      <td>{s.yearsOfExperience ?? 0} yrs, {s.monthsOfExperience ?? 0} mos</td>
                      <td>{s.nic || '-'}</td>
                      <td className="muted">{s.city || '-'}</td>
                      <td>
                        <span className={`status ${status}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn primary"
                            disabled={status === 'approved' || isApproving}
                            onClick={() => handleDecision(s.id, 'approve')}
                          >
                            {isApproving ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            className="btn danger"
                            disabled={status === 'rejected' || isRejecting}
                            onClick={() => handleDecision(s.id, 'reject')}
                          >
                            {isRejecting ? 'Rejecting...' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="muted">
                    No suppliers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminSuppliersPage;

