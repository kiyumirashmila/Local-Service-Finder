import React, { useEffect, useMemo, useState } from 'react';
import {
  decideAdminComplaint,
  deleteAdminComplaint,
  fetchAdminComplaints,
  notifyComplaintSupplier,
  recoverAdminSupplier,
} from '../../services/api';

const AdminComplaintsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState({
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
  });
  const [busyId, setBusyId] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async (opts = {}) => {
    const quiet = Boolean(opts.quiet);
    setError('');
    if (!quiet) setLoading(true);
    try {
      const res = await fetchAdminComplaints();
      setComplaints(res.data?.complaints || []);
      setSummary(
        res.data?.summary || {
          totalComplaints: 0,
          pendingComplaints: 0,
          resolvedComplaints: 0,
        }
      );
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load complaints.');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setSelectedComplaint((prev) => {
      if (!prev) return prev;
      const fresh = complaints.find((c) => String(c.bookingId) === String(prev.bookingId));
      return fresh || prev;
    });
  }, [complaints]);

  const rows = useMemo(() => {
    if (statusFilter === 'all') return complaints;
    return complaints.filter((c) => c.status === statusFilter);
  }, [complaints, statusFilter]);
  const warningSummary = useMemo(() => {
    const bySupplier = new Map();
    for (const r of rows) {
      const key = r.supplierId != null ? String(r.supplierId) : `name:${String(r.supplierName || '')}`;
      if (bySupplier.has(key)) continue;
      bySupplier.set(key, {
        warnings: Number(r.supplierWarningCount || 0),
        banned: Boolean(r.supplierIsBanned),
      });
    }
    let warnings = 0;
    let banned = 0;
    for (const v of bySupplier.values()) {
      warnings += v.warnings;
      if (v.banned) banned += 1;
    }
    return { banned, warnings, supplierCount: bySupplier.size };
  }, [rows]);

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(229,231,235,1)', padding: 18, display: 'grid', gap: 14 }}>
      <h3 style={{ margin: 0, fontWeight: 1100, color: '#111827' }}>Complaints</h3>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <SummaryCard label="Total Complaints" value={summary.totalComplaints} color="#1d4ed8" />
        <SummaryCard label="Pending Complaints" value={summary.pendingComplaints} color="#b45309" />
        <SummaryCard label="Resolved Complaints" value={summary.resolvedComplaints} color="#166534" />
      </div>
      <div style={{ fontSize: 12, fontWeight: 900, color: '#6b7280' }}>
        Warning counter: {warningSummary.warnings} current strikes across {warningSummary.supplierCount} supplier
        {warningSummary.supplierCount === 1 ? '' : 's'} in this view · Banned: {warningSummary.banned}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'pending', label: 'Pending' },
          { id: 'resolved', label: 'Resolved' },
        ].map((f) => {
          const active = statusFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              style={{
                border: active ? '1px solid #a4570a' : '1px solid #e5e7eb',
                background: active ? '#a4570a' : '#fff',
                color: active ? '#fff' : '#6b7280',
                borderRadius: 999,
                padding: '8px 12px',
                fontWeight: 900,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {error && <div style={{ color: '#b91c1c', fontWeight: 900, fontSize: 13 }}>{error}</div>}

      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <Th>Complier Name (Customer)</Th>
              <Th>Supplier (Against)</Th>
              <Th>Date</Th>
              <Th>Complaint Status</Th>
              <Th>Account Status</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 14, fontWeight: 800, color: '#6b7280' }}>
                  Loading complaints...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 14, fontWeight: 800, color: '#6b7280' }}>
                  No complaints found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isAccountBanned = Boolean(row.supplierIsBanned) || Number(row.supplierWarningCount || 0) >= 5;
                return (
                  <tr key={String(row.bookingId)} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <Td>{row.customerName || 'Customer'}</Td>
                    <Td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontWeight: 800, color: '#111827' }}>{row.supplierName || 'Supplier'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 900,
                              color: '#7c2d12',
                              background: '#ffedd5',
                              border: '1px solid rgba(154,52,18,0.2)',
                              borderRadius: 999,
                              padding: '3px 8px',
                            }}
                          >
                            Warnings: {Number(row.supplierWarningCount || 0)} (ban if &gt;= 5)
                          </span>
                        </div>
                      </div>
                    </Td>
                    <Td>{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '—'}</Td>
                    <Td>
                      <span
                        style={{
                          padding: '5px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          color: row.status === 'resolved' ? '#166534' : '#92400e',
                          background: row.status === 'resolved' ? '#dcfce7' : '#fef3c7',
                          border: `1px solid ${row.status === 'resolved' ? 'rgba(22,101,52,0.2)' : 'rgba(146,64,14,0.25)'}`,
                        }}
                      >
                        {row.status || 'pending'}
                      </span>
                    </Td>
                    <Td>
                      <span
                        style={{
                          padding: '5px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          color: isAccountBanned ? '#b91c1c' : '#166534',
                          background: isAccountBanned ? '#fee2e2' : '#dcfce7',
                          border: `1px solid ${isAccountBanned ? 'rgba(185,28,28,0.2)' : 'rgba(22,101,52,0.2)'}`,
                        }}
                      >
                        {isAccountBanned ? 'Banned' : 'Active'}
                      </span>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedComplaint(row)}
                          style={{
                            border: '1px solid #e5e7eb',
                            background: '#fff',
                            color: '#374151',
                            borderRadius: 999,
                            width: 38,
                            height: 38,
                            padding: 0,
                            fontWeight: 900,
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <i className="fas fa-eye" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={busyId === `notify-${String(row.bookingId)}` || Boolean(row.supplierNotifiedAt)}
                          onClick={async () => {
                            try {
                              setBusyId(`notify-${String(row.bookingId)}`);
                              await notifyComplaintSupplier(row.bookingId);
                              await load({ quiet: true });
                            } catch (e) {
                              setError(e?.response?.data?.message || 'Failed to notify supplier.');
                            } finally {
                              setBusyId('');
                            }
                          }}
                          style={{
                            border: 'none',
                            background: row.supplierNotifiedAt ? '#9ca3af' : '#1d4ed8',
                            color: '#fff',
                            borderRadius: 999,
                            padding: '8px 12px',
                            fontWeight: 900,
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          {busyId === `notify-${String(row.bookingId)}`
                            ? 'Notifying...'
                            : row.supplierNotifiedAt
                              ? 'Supplier Notified'
                              : 'Notify Supplier'}
                        </button>
                        <button
                          type="button"
                          disabled={
                            busyId === `decision-warning-${String(row.bookingId)}` ||
                            row.status === 'resolved' ||
                            row.adminDecision === 'warning'
                          }
                          onClick={async () => {
                            try {
                              setBusyId(`decision-warning-${String(row.bookingId)}`);
                              const decRes = await decideAdminComplaint(row.bookingId, 'warning');
                              const p = decRes.data;
                              if (p?.supplierId != null) {
                                setComplaints((prev) =>
                                  prev.map((c) =>
                                    String(c.supplierId) === String(p.supplierId)
                                      ? {
                                        ...c,
                                        supplierWarningCount: p.supplierWarningCount,
                                        supplierIsBanned: p.supplierIsBanned,
                                      }
                                      : c
                                  )
                                );
                              }
                              await load({ quiet: true });
                            } catch (e) {
                              setError(e?.response?.data?.message || 'Failed to apply warning decision.');
                            } finally {
                              setBusyId('');
                            }
                          }}
                          style={{
                            border: 'none',
                            background: row.status === 'resolved' || row.adminDecision === 'warning' ? '#9ca3af' : '#b91c1c',
                            color: '#fff',
                            borderRadius: 999,
                            padding: '8px 12px',
                            fontWeight: 900,
                            fontSize: 12,
                            cursor: (row.status === 'resolved' || row.adminDecision === 'warning') ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {busyId === `decision-warning-${String(row.bookingId)}`
                            ? 'Applying...'
                            : (row.status === 'resolved' || row.adminDecision === 'warning')
                              ? 'Warning Disabled'
                              : 'Keep as Warning'}
                        </button>
                        <button
                          type="button"
                          disabled={
                            busyId === `decision-resolved-${String(row.bookingId)}` ||
                            row.status === 'resolved'
                          }
                          onClick={async () => {
                            try {
                              setBusyId(`decision-resolved-${String(row.bookingId)}`);
                              const decRes = await decideAdminComplaint(row.bookingId, 'resolved');
                              const p = decRes.data;
                              if (p?.supplierId != null) {
                                setComplaints((prev) =>
                                  prev.map((c) =>
                                    String(c.supplierId) === String(p.supplierId)
                                      ? {
                                        ...c,
                                        supplierWarningCount: p.supplierWarningCount,
                                        supplierIsBanned: p.supplierIsBanned,
                                      }
                                      : c
                                  )
                                );
                              }
                              await load({ quiet: true });
                            } catch (e) {
                              setError(e?.response?.data?.message || 'Failed to resolve complaint.');
                            } finally {
                              setBusyId('');
                            }
                          }}
                          style={{
                            border: 'none',
                            background: row.status === 'resolved' ? '#9ca3af' : '#166534',
                            color: '#fff',
                            borderRadius: 999,
                            padding: '8px 12px',
                            fontWeight: 900,
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          {busyId === `decision-resolved-${String(row.bookingId)}`
                            ? 'Applying...'
                            : 'Resolved'}
                        </button>
                        {row.supplierId && (
                          <button
                            type="button"
                            disabled={busyId === `recover-${String(row.supplierId)}` || !isAccountBanned}
                            onClick={async () => {
                              try {
                                setBusyId(`recover-${String(row.supplierId)}`);
                                await recoverAdminSupplier(row.supplierId);
                                await load({ quiet: true });
                              } catch (e) {
                                setError(e?.response?.data?.message || 'Failed to recover supplier profile.');
                              } finally {
                                setBusyId('');
                              }
                            }}
                            style={{
                              border: 'none',
                              background: isAccountBanned ? '#2563eb' : '#9ca3af',
                              color: '#fff',
                              borderRadius: 999,
                              padding: '8px 12px',
                              fontWeight: 900,
                              fontSize: 12,
                              cursor: isAccountBanned ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {busyId === `recover-${String(row.supplierId)}` ? 'Recovering...' : 'Recover Profile'}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === `delete-${String(row.bookingId)}`}
                          onClick={async () => {
                            if (!window.confirm('Delete this complaint?')) return;
                            try {
                              setBusyId(`delete-${String(row.bookingId)}`);
                              await deleteAdminComplaint(row.bookingId);
                              await load({ quiet: true });
                            } catch (e) {
                              setError(e?.response?.data?.message || 'Failed to delete complaint.');
                            } finally {
                              setBusyId('');
                            }
                          }}
                          style={{
                            border: '1px solid #fecaca',
                            background: '#fff',
                            color: '#b91c1c',
                            borderRadius: 999,
                            width: 38,
                            height: 38,
                            padding: 0,
                            fontWeight: 900,
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          aria-label="Delete complaint"
                        >
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedComplaint && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 999,
          }}
        >
          <div style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <h4 style={{ margin: 0, color: '#111827', fontWeight: 1000 }}>Complaint Details</h4>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                style={{ border: '1px solid #e5e7eb', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 'bold', cursor: 'pointer', color: '#111827' }}
              >
                Close
              </button>
            </div>
            <div style={{ marginTop: 10, display: 'grid', gap: 8, fontSize: 13 }}>
              <div><b>Customer:</b> {selectedComplaint.customerName}</div>
              <div><b>Supplier:</b> {selectedComplaint.supplierName}</div>
              <div><b>Category:</b> {selectedComplaint.category || '—'}</div>
              <div><b>Description:</b></div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, background: '#f9fafb' }}>
                {selectedComplaint.description || 'No description provided.'}
              </div>
              <div><b>Supplier Response:</b></div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, background: '#f0fdf4' }}>
                {selectedComplaint.supplierResponse || 'No supplier response yet.'}
              </div>
              {selectedComplaint.adminDecision && selectedComplaint.adminDecision !== 'none' && (
                <div>
                  <b>Admin Decision:</b> {selectedComplaint.adminDecision}
                  {selectedComplaint.adminDecidedAt
                    ? ` (${new Date(selectedComplaint.adminDecidedAt).toLocaleString()})`
                    : ''}
                </div>
              )}
              {selectedComplaint.evidenceUrl && (
                <div>
                  <a href={selectedComplaint.evidenceUrl} target="_blank" rel="noreferrer">
                    View uploaded evidence
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, color }) => (
  <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 12, background: '#fff' }}>
    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 900, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ marginTop: 6, fontSize: 24, lineHeight: 1.1, fontWeight: 1100, color }}>{value}</div>
  </div>
);

const Th = ({ children }) => (
  <th style={{ textAlign: 'left', padding: '12px 12px', fontSize: 12, color: '#000', fontWeight: 'bold' }}>{children}</th>
);

const Td = ({ children }) => (
  <td style={{ padding: '12px 12px', fontSize: 13, color: '#111827', fontWeight: 700 }}>{children}</td>
);

export default AdminComplaintsPage;

