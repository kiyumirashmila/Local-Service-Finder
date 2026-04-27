import React, { useEffect, useMemo, useState } from 'react';
import { fetchAdminBookings } from '../../services/api';

const statusBadgeStyle = (status) => {
  if (status === 'approved') return { bg: '#dcfce7', color: '#166534' };
  if (status === 'completed') return { bg: '#dbeafe', color: '#1d4ed8' };
  if (status === 'rejected') return { bg: '#fee2e2', color: '#991b1b' };
  return { bg: '#f3f4f6', color: '#374151' };
};

const money = (n, currency = 'USD') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(n) || 0);

const AdminBookingsPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetchAdminBookings();
        setRows(Array.isArray(res.data?.bookings) ? res.data.bookings : []);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load bookings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const counts = useMemo(() => {
    const total = rows.length;
    const approved = rows.filter((b) => b.status === 'approved').length;
    const completed = rows.filter((b) => b.status === 'completed').length;
    const rejected = rows.filter((b) => b.status === 'rejected').length;
    return { total, approved, completed, rejected };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((b) => {
      const statusOk = statusFilter === 'all' ? true : b.status === statusFilter;
      const searchOk =
        !q ||
        String(b.customer || '').toLowerCase().includes(q) ||
        String(b.supplier || '').toLowerCase().includes(q) ||
        String(b.id || '').toLowerCase().includes(q);
      return statusOk && searchOk;
    });
  }, [rows, search, statusFilter]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 1100, color: '#3b2109', fontSize: 30 }}>Booking Management</h3>
            <p style={{ margin: '6px 0 0', color: '#9a6a3d', fontWeight: 700 }}>
              Track booking requests and monitor each booking status in one place.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 16 }}>
          {[
            { label: 'Total Bookings', value: counts.total, bg: '#fff7ed' },
            { label: 'Approved', value: counts.approved, bg: '#ecfdf5' },
            { label: 'Completed', value: counts.completed, bg: '#eff6ff' },
            { label: 'Rejected', value: counts.rejected, bg: '#fef2f2' },
          ].map((card) => (
            <div key={card.label} style={{ background: card.bg, borderRadius: 14, border: '1px solid #f1f5f9', padding: 14 }}>
              <div style={{ color: '#9a6a3d', fontWeight: 800, fontSize: 12 }}>{card.label}</div>
              <div style={{ marginTop: 4, fontSize: 34, fontWeight: 1100, color: '#3b2109' }}>{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', padding: 18 }}>
        {error && (
          <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 900, fontSize: 13 }}>{error}</div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or supplier"
            style={{
              flex: '1 1 300px',
              height: 42,
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '0 12px',
              fontWeight: 700,
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'approved', label: 'Approved' },
              { id: 'completed', label: 'Completed' },
              { id: 'rejected', label: 'Rejected' },
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
                    padding: '9px 14px',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#fff7ed' }}>
                <th style={{ padding: 12, fontSize: 12 }}>Booking ID</th>
                <th style={{ padding: 12, fontSize: 12 }}>Customer</th>
                <th style={{ padding: 12, fontSize: 12 }}>Supplier</th>
                <th style={{ padding: 12, fontSize: 12 }}>Date</th>
                <th style={{ padding: 12, fontSize: 12 }}>Time</th>
                <th style={{ padding: 12, fontSize: 12 }}>Amount</th>
                <th style={{ padding: 12, fontSize: 12 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, color: '#6b7280', fontWeight: 800 }}>
                    Loading bookings...
                  </td>
                </tr>
              ) : filtered.map((b) => {
                const st = statusBadgeStyle(b.status);
                return (
                  <tr key={b.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: 12, fontWeight: 900, fontSize: 13 }}>{b.id}</td>
                    <td style={{ padding: 12, fontWeight: 800, fontSize: 13 }}>{b.customer}</td>
                    <td style={{ padding: 12, fontWeight: 800, fontSize: 13 }}>{b.supplier}</td>
                    <td style={{ padding: 12, fontWeight: 800, fontSize: 13 }}>{b.date}</td>
                    <td style={{ padding: 12, fontWeight: 800, fontSize: 13 }}>{b.time}</td>
                    <td style={{ padding: 12, fontWeight: 900, fontSize: 13 }}>{money(b.amount, b.currency)}</td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          background: st.bg,
                          color: st.color,
                          borderRadius: 999,
                          padding: '6px 10px',
                          fontWeight: 900,
                          fontSize: 11,
                          textTransform: 'capitalize',
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {!loading && !filtered.length && (
                <tr>
                  <td colSpan={7} style={{ padding: 16, color: '#6b7280', fontWeight: 800 }}>
                    No booking requests found for selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminBookingsPage;



