import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import {
  createBookingComplaint,
  createBookingReview,
  deleteBooking,
  deleteBookingComplaint,
  deleteBookingReview,
  fetchMyBookings,
  fetchPublicCatalogOptions,
  updateBookingComplaint,
  updateBookingReview,
} from '../../services/api';
import Header from '../Header';
import Footer from '../Footer';
import '../../styles/HomePage.css';

function formatDisplayDate(isoYmd) {
  if (!isoYmd || typeof isoYmd !== 'string') return '—';
  // If backend stores an ISO timestamp (often produced via `toISOString()`),
  // formatting the raw YYYY-MM-DD part can shift the date by timezone.
  // Parse the timestamp and render in local time to preserve the picked calendar date.
  if (isoYmd.includes('T')) {
    const t = new Date(isoYmd);
    if (!Number.isNaN(t.getTime())) {
      return t.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  // For plain "YYYY-MM-DD" strings, construct a local Date explicitly
  // (avoid `new Date('YYYY-MM-DD')` which is interpreted as UTC).
  const [y, m, d] = isoYmd.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return isoYmd;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCreatedAt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

const REVIEW_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/** Matches backend: reviews allowed within 3 days of `completedAt` (falls back to `completedDate` if present). */
function isWithinReviewWindow(booking) {
  const raw = booking?.completedAt ?? booking?.completedDate;
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= REVIEW_WINDOW_MS;
}

const statusStyle = (status) => {
  if (status === 'completed') return { bg: '#dcfce7', color: '#166534', border: 'rgba(22,101,52,0.2)' };
  if (status === 'approved') return { bg: '#dcfce7', color: '#166534', border: 'rgba(22,101,52,0.2)' };
  if (status === 'rejected') return { bg: '#fee2e2', color: '#991b1b', border: 'rgba(153,27,27,0.2)' };
  return { bg: '#fef3c7', color: '#92400e', border: 'rgba(146,64,14,0.25)' };
};

function getTimelineStep(status, isPaid) {
  if (status === 'completed') return 4;
  if (isPaid) return 3;
  if (status === 'approved') return 2;
  return 1;
}

function formatMoney(amount, currency) {
  const n = typeof amount === 'number' ? amount : Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(n);
  } catch {
    return `${currency || 'USD'} ${n.toFixed(2)}`;
  }
}

function normCatalogKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function findCatalogCategoryKey(servicesByCat, providerCategoryLabel) {
  const keys = Object.keys(servicesByCat || {});
  if (!keys.length) return null;
  const want = normCatalogKey(providerCategoryLabel);
  const exact = keys.find((k) => normCatalogKey(k) === want);
  if (exact) return exact;
  return (
    keys.find((k) => {
      const nk = normCatalogKey(k);
      return nk.includes(want) || want.includes(nk);
    }) || null
  );
}

function getProviderRoleForRates(supplier) {
  if (supplier?.serviceCategory === 'other' && supplier?.serviceCategoryOther) {
    return `Other (${supplier.serviceCategoryOther})`;
  }
  return supplier?.serviceCategory || '';
}

function formatCatalogRateLine(range) {
  if (!range || !Number.isFinite(range.minRatePerHour) || !Number.isFinite(range.maxRatePerHour)) {
    return null;
  }
  const cur = range.currency || 'LKR';
  const a = Math.round(range.minRatePerHour);
  const b = Math.round(range.maxRatePerHour);
  return `${cur} ${a.toLocaleString()} – ${b.toLocaleString()} / hr`;
}

function getBookingServiceRateRange(supplier, serviceName, marketRatesByKey, rateLookupCategoryNorm) {
  // Mimic `BookingPage.jsx` estimate logic so "My bookings" matches the summary.
  // The booking page:
  // - splits comma-separated services
  // - sums each service's min/max per-hour
  // - estimatedTotal = round(avg(min+max)/2 per hour * hours)
  if (!marketRatesByKey || typeof marketRatesByKey !== 'object') return null;
  if (!rateLookupCategoryNorm) return null;

  const parts = Array.isArray(serviceName)
    ? serviceName
    : String(serviceName || '')
      .split(',')
      .map((s) => String(s).trim())
      .filter(Boolean);

  if (!parts.length) return null;

  let totalMin = 0;
  let totalMax = 0;
  let currency = 'LKR';

  for (const svcNameRaw of parts) {
    const svcName = String(svcNameRaw || '').trim();
    if (!svcName) continue;

    let svcMin = 0;
    let svcMax = 0;

    // Prefer supplier fixed rates if present (same approach as BookingPage).
    if (supplier?.servicesRates && supplier.servicesRates[svcName] !== undefined) {
      const rate = Number(supplier.servicesRates[svcName]);
      if (Number.isFinite(rate)) {
        svcMin = rate;
        svcMax = rate;
      }
    }

    if (svcMin === 0 && marketRatesByKey) {
      const k = `${rateLookupCategoryNorm}|||${normCatalogKey(svcName)}`;
      const row = marketRatesByKey[k];
      if (row && Number.isFinite(row.minRatePerHour) && Number.isFinite(row.maxRatePerHour)) {
        svcMin = row.minRatePerHour;
        svcMax = row.maxRatePerHour;
        if (row.currency) currency = row.currency;
      } else {
        // Fallback to category average range (same as BookingPage).
        const rows = [];
        for (const [key, v] of Object.entries(marketRatesByKey)) {
          if (!key.startsWith(`${rateLookupCategoryNorm}|||`)) continue;
          if (Number.isFinite(v?.minRatePerHour) && Number.isFinite(v?.maxRatePerHour)) {
            rows.push(v);
          }
        }
        if (rows.length) {
          svcMin = Math.min(...rows.map((r) => r.minRatePerHour));
          svcMax = Math.max(...rows.map((r) => r.maxRatePerHour));
          if (rows[0].currency) currency = rows[0].currency;
        }
      }
    }

    totalMin += svcMin;
    totalMax += svcMax;
  }

  if (totalMin === 0 && totalMax === 0) return null;

  return {
    minRatePerHour: totalMin,
    maxRatePerHour: totalMax,
    currency,
  };
}

function bookingServicePriceRangeLine(supplier, serviceName, marketRatesByKey) {
  const providerRole = getProviderRoleForRates(supplier);
  // Best-effort fallback: use providerRole itself for the rate lookup key.
  const rateLookup = normCatalogKey(providerRole);
  return formatCatalogRateLine(
    getBookingServiceRateRange(supplier, serviceName, marketRatesByKey, rateLookup)
  );
}

const PAYMENT_BOOKING_KEY = 'paymentBookingId';

function goToPayment(bookingId) {
  try {
    sessionStorage.setItem(PAYMENT_BOOKING_KEY, String(bookingId));
  } catch {
    /* ignore */
  }
  window.location.hash = 'payment';
}

const CustomerMyBookingsPage = ({
  onBack,
  user,
  isAuthenticated,
  onAddServiceClick,
  onLoginClick,
  onSignupClick,
  onLogout,
  onProfileClick,
}) => {
  const { user: ctxUser } = useContext(AuthContext);
  const effectiveUser = user ?? ctxUser;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState([]);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [complaintBooking, setComplaintBooking] = useState(null);
  const [complaintCategory, setComplaintCategory] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintFile, setComplaintFile] = useState(null);
  const [complaintBusy, setComplaintBusy] = useState(false);
  const [complaintError, setComplaintError] = useState('');
  const [complaintSuccess, setComplaintSuccess] = useState('');
  const [complaintEditing, setComplaintEditing] = useState(false);
  const [deleteBookingTarget, setDeleteBookingTarget] = useState(null);
  const [deleteBookingBusy, setDeleteBookingBusy] = useState(false);
  const [deleteBookingError, setDeleteBookingError] = useState('');
  const [marketRatesByKey, setMarketRatesByKey] = useState({});
  const [servicesByCategory, setServicesByCategory] = useState({});

  const refreshBookings = async () => {
    const res = await fetchMyBookings();
    setBookings(res.data?.bookings || []);
  };

  useEffect(() => {
    const load = async () => {
      setError('');
      if (!isAuthenticated || effectiveUser?.role === 'supplier') {
        setBookings([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        await refreshBookings();
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load your bookings.');
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, effectiveUser?.role]);

  useEffect(() => {
    const customer = !effectiveUser?.role || effectiveUser?.role === 'customer';
    if (!isAuthenticated || !customer) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPublicCatalogOptions();
        if (!cancelled) {
          if (res?.data?.marketRatesByKey && typeof res.data.marketRatesByKey === 'object') {
            setMarketRatesByKey(res.data.marketRatesByKey);
          }
          if (res?.data?.servicesByCategory && typeof res.data.servicesByCategory === 'object') {
            setServicesByCategory(res.data.servicesByCategory);
          }
        }
      } catch {
        if (!cancelled) {
          setMarketRatesByKey({});
          setServicesByCategory({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, effectiveUser?.role]);

  const isCustomer = !effectiveUser?.role || effectiveUser?.role === 'customer';
  const pendingBookings = bookings.filter((b) => b?.status === 'pending');

  return (
    <div className="customer-bookings-root">
      <style>{`
        .customer-bookings-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f1f5f9;
        }
        .customer-bookings-main {
          flex: 1;
          padding: 22px 16px 40px;
          color: #1f2937;
        }
        .cmb-inner {
          max-width: 900px;
          margin: 0 auto;
        }
        .cmb-top {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .cmb-back {
          border: 1px solid rgba(229,231,235,1);
          background: #fff;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 800;
          cursor: pointer;
          color: #1e3a8a;
        }
        .cmb-title {
          margin: 0;
          font-size: 28px;
          font-weight: 900;
          color: #0f172a;
        }
        .cmb-sub {
          margin: 6px 0 0;
          color: #475569;
          font-weight: 700;
          font-size: 13px;
          max-width: 520px;
          line-height: 1.45;
        }
        .cmb-card {
          background: #fff;
          border: 1px solid rgba(229,231,235,1);
          border-radius: 18px;
          padding: 18px 20px;
          margin-bottom: 14px;
          box-shadow: 0 12px 26px rgba(0,0,0,0.05);
        }
        .cmb-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
          padding-bottom: 14px;
          border-bottom: 1px solid #f3f4f6;
        }
        .cmb-provider {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cmb-av {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          overflow: hidden;
          flex-shrink: 0;
        }
        .cmb-av img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cmb-provider-name {
          font-weight: 900;
          color: #0f172a;
          font-size: 16px;
        }
        .cmb-provider-meta {
          font-size: 12px;
          color: #475569;
          font-weight: 700;
          margin-top: 2px;
        }
        .cmb-status {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid;
        }
        .cmb-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px 20px;
        }
        .cmb-k {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #475569;
          margin-bottom: 4px;
        }
        .cmb-v {
          font-weight: 800;
          color: #0f172a;
          font-size: 14px;
        }
        .cmb-empty {
          text-align: center;
          padding: 48px 20px;
          color: #6b7280;
          font-weight: 700;
        }
        .cmb-empty a {
          color: #1e3a8a;
          font-weight: 900;
        }
        .cmb-err {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 14px 16px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .cmb-pay-row {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .cmb-pay-btn {
          border: none;
          background: #1e3a8a;
          color: #fff;
          padding: 12px 20px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .cmb-pay-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .cmb-paid-badge {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 6px 12px;
          border-radius: 999px;
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid rgba(30,64,175,0.2);
        }
        .cmb-timeline {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin: 2px 0 16px;
          padding: 14px 14px 12px;
          border-radius: 14px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
        }
        .cmb-timeline-line {
          position: absolute;
          top: 29px;
          left: 12.5%;
          width: 75%;
          height: 4px;
          background: #e5e7eb;
          border-radius: 999px;
          z-index: 0;
        }
        .cmb-timeline-line-fill {
          height: 100%;
          background: linear-gradient(90deg, #1e3a8a, #16a34a);
          border-radius: 999px;
          transition: width 0.25s ease;
        }
        .cmb-step {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
        }
        .cmb-step-icon {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          border: 2px solid #d1d5db;
          background: #fff;
          color: #9ca3af;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.06);
        }
        .cmb-step.active .cmb-step-icon {
          border-color: #15803d;
          background: #16a34a;
          color: #fff;
        }
        .cmb-step-label {
          font-size: 11px;
          font-weight: 800;
          color: #475569;
        }
        .cmb-step.active .cmb-step-label {
          color: #166534;
        }
        .cmb-review-row {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .cmb-review-btn {
          border: none;
          background: #1e3a8a;
          color: #fff;
          padding: 10px 16px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .cmb-review-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(15,23,42,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .cmb-review-modal {
          width: 100%;
          max-width: 500px;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.35);
          padding: 18px 20px;
        }
        .cmb-review-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .cmb-review-title {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
          color: #1f2937;
          flex: 1;
          min-width: 0;
          line-height: 1.3;
        }
        .cmb-review-head-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .cmb-booking-complete-badge {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #166534;
          background: #dcfce7;
          border: 1px solid rgba(22,101,52,0.25);
          border-radius: 999px;
          padding: 6px 10px;
          white-space: nowrap;
        }
        .cmb-review-close {
          border: none;
          background: transparent;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          flex-shrink: 0;
        }
        .cmb-review-details {
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 12px;
          padding: 10px 12px;
          margin: 10px 0 12px;
        }
        .cmb-review-detail-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 6px;
          font-size: 12px;
        }
        .cmb-review-detail-row:last-child {
          margin-bottom: 0;
        }
        .cmb-review-detail-label {
          color: #6b7280;
          font-weight: 800;
        }
        .cmb-review-detail-value {
          color: #111827;
          font-weight: 900;
          text-align: right;
        }
        .cmb-stars {
          display: flex;
          gap: 6px;
          margin: 8px 0 12px;
        }
        .cmb-star-btn {
          border: none;
          background: transparent;
          font-size: 26px;
          cursor: pointer;
          line-height: 1;
          padding: 0;
        }
        .cmb-star-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
        .cmb-star-active { color: #1e3a8a; }
        .cmb-star-inactive { color: #d1d5db; }
        .cmb-review-textarea {
          width: 100%;
          min-height: 86px;
          resize: vertical;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 10px;
          font-size: 13px;
          font-family: inherit;
        }
        .cmb-review-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 12px;
        }
        .cmb-review-cancel {
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #374151;
          padding: 8px 14px;
          border-radius: 999px;
          font-weight: 800;
          cursor: pointer;
        }
        .cmb-review-submit {
          border: none;
          background: #1e3a8a;
          color: #fff;
          padding: 8px 14px;
          border-radius: 999px;
          font-weight: 900;
          cursor: pointer;
        }
        .cmb-review-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .cmb-complaint-btn {
          border: 1px solid #ef4444;
          background: #fff;
          color: #b91c1c;
          padding: 10px 16px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .cmb-delete-booking-btn {
          border: 1px solid #dc2626;
          background: #fff;
          color: #b91c1c;
          padding: 10px 16px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .cmb-delete-booking-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .cmb-delete-confirm-copy {
          font-size: 14px;
          color: #374151;
          font-weight: 700;
          margin-top: 4px;
        }
        .cmb-delete-confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 14px;
        }
        .cmb-keep-booking-btn {
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #374151;
          padding: 8px 14px;
          border-radius: 999px;
          font-weight: 800;
          cursor: pointer;
        }
        .cmb-cancel-booking-btn {
          border: none;
          background: #dc2626;
          color: #fff;
          padding: 8px 14px;
          border-radius: 999px;
          font-weight: 900;
          cursor: pointer;
        }
        .cmb-cancel-booking-btn:disabled,
        .cmb-keep-booking-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .cmb-complaint-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(15,23,42,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .cmb-complaint-modal {
          width: 100%;
          max-width: 540px;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.35);
          padding: 18px 20px;
        }
      `}</style>

      <Header
        onAddServiceClick={onAddServiceClick}
        user={effectiveUser}
        isAuthenticated={isAuthenticated}
        onLoginClick={onLoginClick}
        onSignupClick={onSignupClick}
        onLogout={onLogout}
        onProfileClick={onProfileClick}
      />

      <main className="customer-bookings-main">
        <div className="cmb-inner">
          <div className="cmb-top">
            <button type="button" className="cmb-back" onClick={onBack}>
              ← Back
            </button>
            <div>
              <h1 className="cmb-title">My bookings</h1>
              <p className="cmb-sub">
                Every request you send appears here with the date, time, and current status. When a provider approves or
                declines, this page updates automatically on refresh.
              </p>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="cmb-card">
              <div className="cmb-empty">
                Sign in to see your booking history.
                <div style={{ marginTop: 14 }}>
                  <button type="button" className="cmb-back" onClick={onLoginClick}>
                    Go to login
                  </button>
                </div>
              </div>
            </div>
          )}

          {isAuthenticated && !isCustomer && (
            <div className="cmb-card cmb-empty">This page is for customers. Suppliers can use Requests in the header.</div>
          )}

          {isAuthenticated && isCustomer && (
            <div>
              {error && <div className="cmb-err">{error}</div>}
              {loading ? (
                <div className="cmb-card cmb-empty">Loading your bookings…</div>
              ) : bookings.length === 0 ? (
                <div className="cmb-card">
                  <div className="cmb-empty">
                    You do not have any bookings yet.
                    <div style={{ marginTop: 10 }}>
                      <a href="#home">Browse professionals</a> and tap Book to schedule a session.
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {bookings.map((b) => {
                    const s = b.supplier;
                    const st = statusStyle(b.status);
                    const isPaid = b.paymentStatus === 'paid';
                    const timelineStep = getTimelineStep(b.status, isPaid);
                    const fillWidth = timelineStep <= 1 ? '0%' : timelineStep === 2 ? '33.333%' : timelineStep === 3 ? '66.666%' : '100%';
                    const amount = typeof b.amount === 'number' ? b.amount : 60;
                    const currency = b.currency || 'LKR';
                    const canPay = b.status === 'approved' && !isPaid;
                    const providerRole = getProviderRoleForRates(s);
                    const catalogCategoryKey = findCatalogCategoryKey(servicesByCategory, providerRole);
                    const rateLookupCategoryNorm = normCatalogKey(catalogCategoryKey || providerRole);
                    const serviceRateRange = getBookingServiceRateRange(s, b.serviceName, marketRatesByKey, rateLookupCategoryNorm);
                    const bookingHours = Math.max(1, Number(b.hours) || 1);
                    const estimatedTotalLkr =
                      serviceRateRange &&
                        Number.isFinite(serviceRateRange.minRatePerHour) &&
                        Number.isFinite(serviceRateRange.maxRatePerHour)
                        ? Math.round(((serviceRateRange.minRatePerHour + serviceRateRange.maxRatePerHour) / 2) * bookingHours)
                        : null;
                    const feeToShow =
                      Number.isFinite(b.estimatedFee) && Number(b.estimatedFee) > 0
                        ? Number(b.estimatedFee)
                        : estimatedTotalLkr;
                    const totalCostLabel = feeToShow != null ? formatMoney(feeToShow, currency) : formatMoney(amount, currency);
                    const hasDiscount = Number(b.discountAmount || 0) > 0;
                    const initials = (s?.fullName || 'P')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((x) => x[0]?.toUpperCase())
                      .join('');
                    return (
                      <article key={b.id} className="cmb-card">
                        <div className="cmb-card-head">
                          <div className="cmb-provider">
                            <div className="cmb-av" aria-hidden={s?.avatarUrl ? undefined : true}>
                              {s?.avatarUrl ? (
                                <img src={s.avatarUrl} alt="" />
                              ) : (
                                initials || 'P'
                              )}
                            </div>
                            <div>
                              <div className="cmb-provider-name">{s?.fullName || 'Provider'}</div>
                              <div className="cmb-provider-meta">
                                {[s?.serviceCategory, s?.city].filter(Boolean).join(' · ') || 'Local professional'}
                                {Number.isFinite(s?.yearsOfExperience) ? ` · ${s.yearsOfExperience} yrs exp.` : ''}
                              </div>
                            </div>
                          </div>
                          <span
                            className="cmb-status"
                            style={{
                              background: st.bg,
                              color: st.color,
                              borderColor: st.border,
                            }}
                          >
                            {b.status === 'pending' && 'Pending review'}
                            {b.status === 'approved' && 'Approved'}
                            {b.status === 'completed' && 'Completed'}
                            {b.status === 'rejected' && 'Declined'}
                          </span>
                        </div>

                        <div className="cmb-timeline" aria-label="Booking progress">
                          <div className="cmb-timeline-line" aria-hidden="true">
                            <div className="cmb-timeline-line-fill" style={{ width: fillWidth }} />
                          </div>
                          <div className={`cmb-step ${timelineStep >= 1 ? 'active' : ''}`}>
                            <span className="cmb-step-icon" aria-hidden="true">
                              <i className="fas fa-calendar-alt" />
                            </span>
                            <span className="cmb-step-label">Booked</span>
                          </div>
                          <div className={`cmb-step ${timelineStep >= 2 ? 'active' : ''}`}>
                            <span className="cmb-step-icon" aria-hidden="true">
                              <i className="fas fa-check" />
                            </span>
                            <span className="cmb-step-label">Approved</span>
                          </div>
                          <div className={`cmb-step ${timelineStep >= 3 ? 'active' : ''}`}>
                            <span className="cmb-step-icon" aria-hidden="true">
                              <i className="fas fa-money-bill-wave" />
                            </span>
                            <span className="cmb-step-label">Paid</span>
                          </div>
                          <div className={`cmb-step ${timelineStep >= 4 ? 'active' : ''}`}>
                            <span className="cmb-step-icon" aria-hidden="true">
                              <i className="fas fa-check-circle" />
                            </span>
                            <span className="cmb-step-label">Completed</span>
                          </div>
                        </div>

                        <div className="cmb-grid">
                          <div>
                            <div className="cmb-k">Requested date</div>
                            <div className="cmb-v">{formatDisplayDate(b.requestedDate)}</div>
                          </div>
                          <div>
                            <div className="cmb-k">Requested time</div>
                            <div className="cmb-v">{b.requestedTimeLabel || '—'}</div>
                          </div>
                          <div>
                            <div className="cmb-k">Service</div>
                            <div className="cmb-v">{b.serviceName || '—'}</div>
                          </div>
                          {/* Service price range and Booking ID removed as per requirements */}
                          <div>
                            <div className="cmb-k">Submitted</div>
                            <div className="cmb-v">{formatCreatedAt(b.createdAt)}</div>
                          </div>
                          <div>
                            <div className="cmb-k">Total fee</div>
                            <div className="cmb-v">{totalCostLabel}</div>
                            {hasDiscount ? (
                              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: '#166534' }}>
                                Discount {b.discountCode ? `(${b.discountCode})` : ''}: -{formatMoney(Number(b.discountAmount || 0), currency)}
                              </div>
                            ) : null}
                          </div>
                          <div>
                            <div className="cmb-k">Payment</div>
                            <div className="cmb-v">
                              {isPaid ? (
                                <span className="cmb-paid-badge">Paid</span>
                              ) : (
                                <span style={{ color: '#1e3a8a', fontWeight: 900 }}>Unpaid</span>
                              )}
                            </div>
                          </div>
                          {isPaid && b.paymentRef && (
                            <div>
                              <div className="cmb-k">Receipt ref</div>
                              <div className="cmb-v" style={{ fontSize: 12 }}>
                                {b.paymentRef}
                              </div>
                            </div>
                          )}
                        </div>

                        {canPay && (
                          <div className="cmb-pay-row">
                            <div style={{ fontSize: 13, color: '#57534e', fontWeight: 700 }}>
                              Provider approved this booking. Pay the session fee to confirm.
                            </div>
                            <button type="button" className="cmb-pay-btn" onClick={() => goToPayment(b.id)}>
                              <i className="fas fa-credit-card" aria-hidden="true" />
                              Pay now
                            </button>
                          </div>
                        )}

                        {b.status === 'pending' && (
                          <div className="cmb-review-row">
                            <div style={{ fontSize: 13, color: '#57534e', fontWeight: 700, flex: 1 }}>
                              This booking is pending review. You can delete it before supplier action.
                            </div>
                            <button
                              type="button"
                              className="cmb-delete-booking-btn"
                              onClick={() => {
                                setDeleteBookingTarget(b);
                                setDeleteBookingError('');
                              }}
                            >
                              <i className="fas fa-trash-alt" aria-hidden="true" />
                              Delete Booking
                            </button>
                          </div>
                        )}

                        {b.status === 'completed' && (
                          <div className="cmb-review-row">
                            <div style={{ fontSize: 13, color: '#57534e', fontWeight: 700, flex: 1 }}>
                              {!isWithinReviewWindow(b)
                                ? b.review?.rating
                                  ? `You rated this booking ${b.review.rating}/5. The 3-day edit window has ended.`
                                  : 'Booking completed. The 3-day review window has ended.'
                                : b.review?.rating
                                  ? `You rated this booking ${b.review.rating}/5. You can edit or delete it within 3 days of completion.`
                                  : 'Booking completed. Please rate your experience with this provider (within 3 days of completion).'}
                              {b.reviewBlockedByAdmin && !b.review?.rating && (
                                <div style={{ marginTop: 6, color: '#b91c1c', fontWeight: 900 }}>
                                  Review submission disabled by admin for this booking.
                                </div>
                              )}
                              {b.complaint?.submittedAt && (
                                <div style={{ marginTop: 6, color: '#b91c1c', fontWeight: 900 }}>
                                  Complaint status: {b.complaint.status || 'pending'}.
                                </div>
                              )}
                              {b.complaintBlockedByAdmin && !b.complaint?.submittedAt && (
                                <div style={{ marginTop: 6, color: '#b91c1c', fontWeight: 900 }}>
                                  Complaint submission disabled by admin for this booking.
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="cmb-review-btn"
                              disabled={
                                (Boolean(b.reviewBlockedByAdmin) && !b.review?.rating) || !isWithinReviewWindow(b)
                              }
                              onClick={() => {
                                setReviewBooking(b);
                                setReviewRating(Number(b.review?.rating) || 0);
                                setReviewText(b.review?.feedback || '');
                                setReviewError('');
                                setReviewSuccess('');
                              }}
                            >
                              <i className="fas fa-star" aria-hidden="true" />
                              {!isWithinReviewWindow(b)
                                ? 'Review closed'
                                : b.review?.rating
                                  ? 'Edit Review'
                                  : b.reviewBlockedByAdmin
                                    ? 'Review Disabled'
                                    : 'Leave Review'}
                            </button>
                            <button
                              type="button"
                              className="cmb-complaint-btn"
                              disabled={
                                (Boolean(b.complaint?.submittedAt) && b.complaint?.status !== 'pending') ||
                                (Boolean(b.complaintBlockedByAdmin) && !b.complaint?.submittedAt)
                              }
                              onClick={() => {
                                setComplaintBooking(b);
                                setComplaintEditing(Boolean(b.complaint?.submittedAt));
                                setComplaintCategory(b.complaint?.category || '');
                                setComplaintDescription(b.complaint?.description || '');
                                setComplaintFile(null);
                                setComplaintError('');
                                setComplaintSuccess('');
                              }}
                            >
                              <i className="fas fa-exclamation-circle" aria-hidden="true" />
                              {b.complaint?.submittedAt
                                ? 'Edit Complaint'
                                : b.complaintBlockedByAdmin
                                  ? 'Complaint Disabled'
                                  : 'File Complaint'}
                            </button>
                          </div>
                        )}

                        {(s?.phone || s?.email) && (
                          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
                            <div className="cmb-k">Provider contact</div>
                            <div className="cmb-v" style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>
                              {s?.phone && (
                                <div>
                                  <i className="fas fa-phone" aria-hidden="true" style={{ marginRight: 8, opacity: 0.7 }} />
                                  {s.phone}
                                </div>
                              )}
                              {s?.email && (
                                <div style={{ marginTop: 6 }}>
                                  <i className="fas fa-envelope" aria-hidden="true" style={{ marginRight: 8, opacity: 0.7 }} />
                                  {s.email}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {reviewBooking && (
        <div className="cmb-review-modal-backdrop" role="dialog" aria-modal="true" aria-label="Submit review">
          <div className="cmb-review-modal">
            <div className="cmb-review-head">
              <h2 className="cmb-review-title">⭐ Rate Your Experience</h2>
              <div className="cmb-review-head-actions">
                <span className="cmb-booking-complete-badge" role="status">
                  ✅ Booking Completed
                </span>
                <button type="button" className="cmb-review-close" onClick={() => setReviewBooking(null)} aria-label="Close">
                  ×
                </button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#4b5563' }}>
              {isWithinReviewWindow(reviewBooking)
                ? 'Your booking is completed. Share a rating and optional feedback.'
                : 'The 3-day review window for this booking has ended. You can no longer submit, edit, or delete a review.'}
            </div>
            {!isWithinReviewWindow(reviewBooking) && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: '#dbeafe',
                  border: '1px solid rgba(30,58,138,0.25)',
                  color: '#1e3a8a',
                  fontSize: 12,
                  fontWeight: 800,
                }}
                role="status"
              >
                Reviews are only available within 3 days after completion.
              </div>
            )}

            <div className="cmb-review-details">
              <div className="cmb-review-detail-row">
                <span className="cmb-review-detail-label">Service Name</span>
                <span className="cmb-review-detail-value">
                  {reviewBooking.serviceName || reviewBooking.service?.title || reviewBooking.supplier?.serviceCategory || '—'}
                </span>
              </div>
              <div className="cmb-review-detail-row">
                <span className="cmb-review-detail-label">Supplier Name</span>
                <span className="cmb-review-detail-value">{reviewBooking.supplier?.fullName || 'Provider'}</span>
              </div>
              <div className="cmb-review-detail-row">
                <span className="cmb-review-detail-label">Completed Date</span>
                <span className="cmb-review-detail-value">
                  {formatDisplayDate(reviewBooking.completedDate || reviewBooking.requestedDate)}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 900, color: '#374151' }}>Rating (1-5)</div>
            <div className="cmb-stars">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = reviewRating >= star;
                const reviewWindowOpen = isWithinReviewWindow(reviewBooking);
                return (
                  <button
                    key={star}
                    type="button"
                    className="cmb-star-btn"
                    disabled={!reviewWindowOpen}
                    onClick={() => setReviewRating(star)}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <span className={active ? 'cmb-star-active' : 'cmb-star-inactive'}>★</span>
                  </button>
                );
              })}
            </div>

            <label style={{ fontSize: 12, fontWeight: 900, color: '#374151' }}>
              Feedback * (minimum 10 characters)
              <textarea
                className="cmb-review-textarea"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Tell us about quality, punctuality, and overall service..."
                disabled={!isWithinReviewWindow(reviewBooking)}
              />
            </label>
            <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280', fontWeight: 800 }}>
              Ratings is required. Feedback must be at least 10 characters.
            </div>

            <div className="cmb-review-footer">
              <button type="button" className="cmb-review-cancel" onClick={() => setReviewBooking(null)}>
                Cancel
              </button>
              {reviewBooking.review?.rating && (
                <button
                  type="button"
                  className="cmb-review-cancel"
                  disabled={reviewBusy || !isWithinReviewWindow(reviewBooking)}
                  onClick={async () => {
                    try {
                      setReviewBusy(true);
                      setReviewError('');
                      await deleteBookingReview(reviewBooking.id);
                      await refreshBookings();
                      setReviewSuccess('Review deleted successfully.');
                      setTimeout(() => setReviewBooking(null), 900);
                    } catch (e) {
                      setReviewError(e?.response?.data?.message || 'Failed to delete review.');
                    } finally {
                      setReviewBusy(false);
                    }
                  }}
                >
                  Delete Review
                </button>
              )}
              <button
                type="button"
                className="cmb-review-submit"
                disabled={reviewBusy || !isWithinReviewWindow(reviewBooking)}
                onClick={async () => {
                  try {
                    setReviewBusy(true);
                    setReviewError('');
                    if (reviewRating < 1) {
                      setReviewError('Ratings is required.');
                      return;
                    }
                    if (reviewText.trim().length < 10) {
                      setReviewError('Feedback must be at least 10 characters.');
                      return;
                    }
                    const payload = { rating: reviewRating, feedback: reviewText };
                    if (reviewBooking.review?.rating) {
                      try {
                        await updateBookingReview(reviewBooking.id, payload);
                        setReviewSuccess('Review updated successfully.');
                      } catch (err) {
                        const msg = String(err?.response?.data?.message || err?.message || '');
                        const code = Number(err?.response?.status || 0);
                        // If an admin deleted the review while the customer is editing,
                        // fall back to creating a new review for the same booking.
                        if (code === 404 || msg.toLowerCase().includes('no review exists')) {
                          await createBookingReview(reviewBooking.id, payload);
                          setReviewSuccess('Review submitted successfully.');
                        } else {
                          throw err;
                        }
                      }
                    } else {
                      await createBookingReview(reviewBooking.id, payload);
                      setReviewSuccess('Review submitted successfully.');
                    }
                    await refreshBookings();
                    setTimeout(() => setReviewBooking(null), 900);
                  } catch (e) {
                    setReviewError(e?.response?.data?.message || 'Failed to save review.');
                  } finally {
                    setReviewBusy(false);
                  }
                }}
              >
                {reviewBusy
                  ? 'Saving...'
                  : reviewBooking.review?.rating
                    ? 'Update Review'
                    : 'Submit Review'}
              </button>
            </div>
            {reviewError && (
              <div style={{ marginTop: 10, color: '#b91c1c', fontWeight: 800, fontSize: 12 }}>{reviewError}</div>
            )}
            {reviewSuccess && (
              <div style={{ marginTop: 10, color: '#166534', fontWeight: 800, fontSize: 12 }}>{reviewSuccess}</div>
            )}
          </div>
        </div>
      )}

      {complaintBooking && (
        <div className="cmb-complaint-modal-backdrop" role="dialog" aria-modal="true" aria-label="File complaint">
          <div className="cmb-complaint-modal">
            <div className="cmb-review-head">
              <h2 className="cmb-review-title">{complaintEditing ? 'Edit Complaint' : 'File Complaint'}</h2>
              <div className="cmb-review-head-actions">
                <span className="cmb-booking-complete-badge" role="status">
                  ✅ Booking Completed
                </span>
                <button
                  type="button"
                  className="cmb-review-close"
                  onClick={() => setComplaintBooking(null)}
                  aria-label="Close complaint"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="cmb-review-details" style={{ marginTop: 0 }}>
              <div className="cmb-review-detail-row">
                <span className="cmb-review-detail-label">Service Name</span>
                <span className="cmb-review-detail-value">
                  {complaintBooking.serviceName || complaintBooking.service?.title || complaintBooking.supplier?.serviceCategory || '—'}
                </span>
              </div>
              <div className="cmb-review-detail-row">
                <span className="cmb-review-detail-label">Supplier Name</span>
                <span className="cmb-review-detail-value">{complaintBooking.supplier?.fullName || 'Provider'}</span>
              </div>
              <div className="cmb-review-detail-row">
                <span className="cmb-review-detail-label">Completed Date</span>
                <span className="cmb-review-detail-value">
                  {formatDisplayDate(complaintBooking.completedDate || complaintBooking.requestedDate)}
                </span>
              </div>
            </div>

            <label style={{ fontSize: 12, fontWeight: 900, color: '#374151' }}>
              Complaint Category *
              <select
                className="cmb-review-textarea"
                style={{ minHeight: 40 }}
                value={complaintCategory}
                onChange={(e) => setComplaintCategory(e.target.value)}
              >
                <option value="">Select category</option>
                <option value="Late Arrival">Late Arrival</option>
                <option value="Quality of Work">Quality of Work</option>
                <option value="Payment Issue">Payment Issue</option>
                <option value="Unprofessional Behavior">Unprofessional Behavior</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label style={{ fontSize: 12, fontWeight: 900, color: '#374151', marginTop: 10, display: 'block' }}>
              Description * (minimum 10 characters)
              <textarea
                className="cmb-review-textarea"
                value={complaintDescription}
                onChange={(e) => setComplaintDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
              />
            </label>

            <label style={{ fontSize: 12, fontWeight: 900, color: '#374151', marginTop: 10, display: 'block' }}>
              Evidence (optional: image/pdf/doc/docx, max 5MB)
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx"
                style={{ display: 'block', marginTop: 6, fontSize: 12 }}
                onChange={(e) => setComplaintFile(e.target.files?.[0] || null)}
              />
            </label>

            <div className="cmb-review-footer">
              <button type="button" className="cmb-review-cancel" onClick={() => setComplaintBooking(null)}>
                Cancel
              </button>
              {complaintEditing && complaintBooking?.complaint?.status === 'pending' && (
                <button
                  type="button"
                  className="cmb-review-cancel"
                  disabled={complaintBusy}
                  onClick={async () => {
                    if (!window.confirm('Delete this complaint?')) return;
                    try {
                      setComplaintBusy(true);
                      setComplaintError('');
                      setComplaintSuccess('');
                      await deleteBookingComplaint(complaintBooking.id);
                      await refreshBookings();
                      setComplaintSuccess('Complaint deleted successfully.');
                      setTimeout(() => setComplaintBooking(null), 900);
                    } catch (e) {
                      setComplaintError(e?.response?.data?.message || 'Failed to delete complaint.');
                    } finally {
                      setComplaintBusy(false);
                    }
                  }}
                >
                  Delete Complaint
                </button>
              )}
              <button
                type="button"
                className="cmb-review-submit"
                disabled={complaintBusy}
                onClick={async () => {
                  const allowedMime = new Set([
                    'image/jpeg',
                    'image/png',
                    'image/webp',
                    'image/gif',
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  ]);

                  const desc = complaintDescription.trim();
                  if (!complaintCategory) {
                    setComplaintError('Category selection is required.');
                    setComplaintSuccess('');
                    return;
                  }
                  if (desc.length < 10) {
                    setComplaintError('Description must be at least 10 characters.');
                    setComplaintSuccess('');
                    return;
                  }
                  if (complaintFile) {
                    if (!allowedMime.has(complaintFile.type)) {
                      setComplaintError('Invalid file type. Upload image, PDF, DOC, or DOCX.');
                      setComplaintSuccess('');
                      return;
                    }
                    if (complaintFile.size > 5 * 1024 * 1024) {
                      setComplaintError('File is too large. Maximum size is 5MB.');
                      setComplaintSuccess('');
                      return;
                    }
                  }

                  try {
                    setComplaintBusy(true);
                    setComplaintError('');
                    setComplaintSuccess('');
                    const formData = new FormData();
                    formData.append('category', complaintCategory);
                    formData.append('description', desc);
                    if (complaintFile) formData.append('evidence', complaintFile);
                    if (complaintEditing) {
                      await updateBookingComplaint(complaintBooking.id, formData);
                      setComplaintSuccess('Complaint updated successfully.');
                    } else {
                      await createBookingComplaint(complaintBooking.id, formData);
                      setComplaintSuccess('Complaint submitted successfully.');
                    }
                    await refreshBookings();
                    setTimeout(() => setComplaintBooking(null), 900);
                  } catch (e) {
                    const msg = e?.response?.data?.message || 'Failed to submit complaint.';
                    setComplaintError(msg);
                    if (msg === 'A complaint has already been submitted for this booking.') {
                      setComplaintSuccess(msg);
                    }
                  } finally {
                    setComplaintBusy(false);
                  }
                }}
              >
                {complaintBusy ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </div>
            {complaintError && (
              <div style={{ marginTop: 10, color: '#b91c1c', fontWeight: 800, fontSize: 12 }}>{complaintError}</div>
            )}
            {complaintSuccess && (
              <div style={{ marginTop: 10, color: '#166534', fontWeight: 800, fontSize: 12 }}>{complaintSuccess}</div>
            )}
          </div>
        </div>
      )}

      {deleteBookingTarget && (
        <div className="cmb-review-modal-backdrop" role="dialog" aria-modal="true" aria-label="Cancel booking confirmation">
          <div className="cmb-review-modal">
            <div className="cmb-review-head">
              <h2 className="cmb-review-title">Cancel booking?</h2>
              <button
                type="button"
                className="cmb-review-close"
                onClick={() => setDeleteBookingTarget(null)}
                aria-label="Close confirmation"
                disabled={deleteBookingBusy}
              >
                ×
              </button>
            </div>
            <div className="cmb-delete-confirm-copy">
              If you choose "Yes, cancel", this pending booking will be deleted.
            </div>
            <div className="cmb-delete-confirm-actions">
              <button
                type="button"
                className="cmb-keep-booking-btn"
                onClick={() => setDeleteBookingTarget(null)}
                disabled={deleteBookingBusy}
              >
                No, keep booking
              </button>
              <button
                type="button"
                className="cmb-cancel-booking-btn"
                disabled={deleteBookingBusy}
                onClick={async () => {
                  try {
                    setDeleteBookingBusy(true);
                    setDeleteBookingError('');
                    await deleteBooking(deleteBookingTarget.id);
                    await refreshBookings();
                    setDeleteBookingTarget(null);
                  } catch (e) {
                    setDeleteBookingError(e?.response?.data?.message || 'Failed to delete booking.');
                  } finally {
                    setDeleteBookingBusy(false);
                  }
                }}
              >
                {deleteBookingBusy ? 'Deleting...' : 'Yes, cancel'}
              </button>
            </div>
            {deleteBookingError && (
              <div style={{ marginTop: 10, color: '#b91c1c', fontWeight: 800, fontSize: 12 }}>{deleteBookingError}</div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CustomerMyBookingsPage;
