import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteAdminReview, fetchAdminReviews } from '../../services/api';

const formatWhen = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return '—';
  }
};

const RATING_FILTER_OPTIONS = [
  { value: 'all', label: 'All ratings' },
  { value: '5', label: '5 stars' },
  { value: '4', label: '4 stars' },
  { value: '3', label: '3 stars' },
  { value: '2', label: '2 stars' },
  { value: '1', label: '1 star' },
];

const AdminReviewsPage = () => {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ totalReviews: 0, averageRating: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [busyId, setBusyId] = useState('');

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetchAdminReviews();
      setRows(Array.isArray(res.data?.reviews) ? res.data.reviews : []);
      setSummary(
        res.data?.summary || {
          totalReviews: 0,
          averageRating: 0,
        }
      );
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const ratingOk =
        ratingFilter === 'all' ? true : String(r.rating) === String(ratingFilter);
      const searchOk =
        !q ||
        String(r.customerName || '').toLowerCase().includes(q) ||
        String(r.supplierName || '').toLowerCase().includes(q) ||
        String(r.serviceName || '').toLowerCase().includes(q) ||
        String(r.feedback || '').toLowerCase().includes(q) ||
        String(r.bookingId || '').toLowerCase().includes(q);
      return ratingOk && searchOk;
    });
  }, [rows, search, ratingFilter]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 1100, color: '#3b2109', fontSize: 30 }}>Customer Reviews</h3>
            <p style={{ margin: '6px 0 0', color: '#9a6a3d', fontWeight: 700 }}>
              All ratings and feedback left on completed bookings.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 16 }}>
          <div style={{ background: '#fff7ed', borderRadius: 14, border: '1px solid #f1f5f9', padding: 14 }}>
            <div style={{ color: '#9a6a3d', fontWeight: 800, fontSize: 12 }}>Total reviews</div>
            <div style={{ marginTop: 4, fontSize: 34, fontWeight: 1100, color: '#3b2109' }}>{summary.totalReviews}</div>
          </div>
          <div style={{ background: '#fef3c7', borderRadius: 14, border: '1px solid #f1f5f9', padding: 14 }}>
            <div style={{ color: '#9a6a3d', fontWeight: 800, fontSize: 12 }}>Average rating</div>
            <div style={{ marginTop: 4, fontSize: 34, fontWeight: 1100, color: '#3b2109' }}>
              {summary.totalReviews ? summary.averageRating.toFixed(2) : '—'}
            </div>
          </div>
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
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, supplier, service, or feedback"
            style={{
              flex: '1 1 280px',
              height: 42,
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: '0 12px',
              fontWeight: 700,
              outline: 'none',
            }}
          />
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flex: '0 1 auto',
              fontSize: 12,
              fontWeight: 900,
              color: '#374151',
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>Filter by rating</span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              aria-label="Filter reviews by star rating"
              style={{
                minWidth: 160,
                height: 42,
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                padding: '0 12px',
                fontWeight: 800,
                fontSize: 13,
                color: '#111827',
                background: '#fff',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {RATING_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', fontWeight: 800, color: '#6b7280' }}>Loading reviews…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: 'rgba(243, 244, 246, 0.6)' }}>
                  <th style={{ padding: '10px 8px', fontWeight: 'bold', color: '#000' }}>Customer</th>
                  <th style={{ padding: '10px 8px', fontWeight: 'bold', color: '#000' }}>Supplier</th>
                  <th style={{ padding: '10px 8px', fontWeight: 'bold', color: '#000' }}>Service</th>
                  <th style={{ padding: '10px 8px', fontWeight: 'bold', color: '#000' }}>Rating</th>
                  <th style={{ padding: '10px 8px', fontWeight: 'bold', color: '#000' }}>Feedback</th>
                  <th style={{ padding: '10px 8px', fontWeight: 'bold', color: '#000' }}>Submitted</th>
                  <th style={{ padding: '10px 8px', fontWeight: 'bold', color: '#000' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 20, color: '#6b7280', fontWeight: 800 }}>
                      No reviews match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={String(r.bookingId)} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: 12, fontWeight: 800, verticalAlign: 'top' }}>{r.customerName}</td>
                      <td style={{ padding: 12, fontWeight: 800, verticalAlign: 'top' }}>{r.supplierName}</td>
                      <td style={{ padding: 12, fontWeight: 700, color: '#4b5563', verticalAlign: 'top' }}>
                        {r.serviceName || '—'}
                      </td>
                      <td style={{ padding: 12, verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#f59e0b', fontSize: 16 }}>{'★'.repeat(Math.min(5, Math.max(0, r.rating)))}</span>
                        <span style={{ marginLeft: 6, fontWeight: 900, color: '#374151' }}>{r.rating}/5</span>
                      </td>
                      <td style={{ padding: 12, fontWeight: 700, color: '#4b5563', maxWidth: 280, verticalAlign: 'top' }}>
                        {r.feedback ? (
                          <span title={r.feedback}>{r.feedback.length > 120 ? `${r.feedback.slice(0, 120)}…` : r.feedback}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: 12, fontWeight: 700, color: '#6b7280', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        {formatWhen(r.createdAt || r.updatedAt)}
                      </td>
                      <td style={{ padding: 12, verticalAlign: 'top' }}>
                        <button
                          type="button"
                          disabled={busyId === `delete-${String(r.bookingId)}`}
                          onClick={async () => {
                            if (!window.confirm('Delete this review? The supplier rating stats will be recalculated.')) return;
                            try {
                              setBusyId(`delete-${String(r.bookingId)}`);
                              setError('');
                              await deleteAdminReview(r.bookingId);
                              await loadReviews();
                            } catch (e) {
                              setError(e?.response?.data?.message || 'Failed to delete review.');
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
                            fontSize: 14,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          aria-label="Delete review"
                          title="Delete review"
                        >
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReviewsPage;
