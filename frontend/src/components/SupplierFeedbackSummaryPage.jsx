import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { fetchMyBookings } from '../services/api';

const tierBounds = {
  Bronze: { min: 0, max: 100, next: 'Silver' },
  Silver: { min: 101, max: 250, next: 'Gold' },
  Gold: { min: 251, max: 500, next: 'Platinum' },
  Platinum: { min: 500, max: null, next: null },
};

const SupplierFeedbackSummaryPage = ({ onBack }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);

  const averageRating = Number(user?.averageRating || 0);
  const totalRatings = Number(user?.totalRatings || 0);
  const xp = Number(user?.xp || 0);
  const tierLevel = user?.tierLevel || 'Bronze';

  const progress = useMemo(() => {
    const tier = tierBounds[tierLevel] || tierBounds.Bronze;
    if (!tier.next || tier.max === null) {
      return { percent: 100, label: 'Top tier reached' };
    }
    const span = tier.max - tier.min + 1;
    const value = Math.max(0, Math.min(span, xp - tier.min + 1));
    const percent = Math.round((value / span) * 100);
    const remaining = Math.max(0, tier.max - xp);
    return { percent, label: `${remaining} XP to ${tier.next}` };
  }, [tierLevel, xp]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetchMyBookings();
        const bookings = Array.isArray(res.data?.bookings) ? res.data.bookings : [];
        const rows = bookings
          .filter((b) => b?.status === 'completed' && b?.review?.rating)
          .map((b) => ({
            id: String(b.id),
            customerName: b.customer?.fullName || 'Customer',
            rating: Number(b.review.rating || 0),
            feedback: b.review.feedback || '',
            date: b.review.updatedAt || b.review.createdAt || b.completedAt || b.requestedDate || '',
          }));
        if (!cancelled) setReviews(rows);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load feedback summary.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" onClick={onBack} style={{ ...btnStyle, color: '#374151' }} aria-label="Back">
            ← Back
          </button>
          <h2 style={{ margin: 0, color: '#1f2937' }}>Feedback Summary</h2>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={{ fontWeight: 900, color: '#111827', marginBottom: 10 }}>XP Progress</div>
        <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 10 }}>
          Tier: <b>{tierLevel}</b> | XP: <b>{xp}</b> | Average: <b>{averageRating.toFixed(2)}</b> ({totalRatings} reviews)
        </div>
        <div style={{ height: 12, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}>
          <div
            style={{
              width: `${progress.percent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #f59e0b, #22c55e)',
              transition: 'width 250ms ease',
            }}
          />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#6b7280' }}>{progress.label}</div>
      </div>

      <div style={{ ...panelStyle, marginTop: 14 }}>
        <div style={{ fontWeight: 900, color: '#111827', marginBottom: 10 }}>Full List of Reviews</div>
        {error && <div style={{ color: '#b91c1c', fontWeight: 800, marginBottom: 10 }}>{error}</div>}
        {loading ? (
          <div style={{ color: '#6b7280', fontWeight: 700 }}>Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div style={{ color: '#6b7280', fontWeight: 700 }}>No reviews yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {reviews.map((r) => (
              <article key={r.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{r.customerName}</strong>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{new Date(r.date).toLocaleDateString()}</span>
                </div>
                <div style={{ marginTop: 4, color: '#92400e', fontWeight: 900 }}>
                  {'★'.repeat(Math.max(0, r.rating))}
                  {'☆'.repeat(Math.max(0, 5 - r.rating))} ({r.rating}/5)
                </div>
                <div style={{ marginTop: 6, color: '#1f2937', fontSize: 14 }}>{r.feedback || 'No written comment.'}</div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const panelStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  background: '#fffbf5',
  padding: 14,
};

const btnStyle = {
  border: '1px solid #e5e7eb',
  background: '#fff',
  borderRadius: 999,
  padding: '8px 14px',
  fontWeight: 800,
  cursor: 'pointer',
};

const iconBtnStyle = {
  border: '1px solid #e5e7eb',
  background: '#fff',
  borderRadius: 999,
  width: 38,
  height: 38,
  fontWeight: 900,
  cursor: 'pointer',
};

export default SupplierFeedbackSummaryPage;
