import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { fetchMyBookings, payBooking } from '../../services/api';
import Header from '../Header';
import Footer from '../Footer';
import '../../styles/HomePage.css';

const SESSION_STORAGE_KEY = 'paymentBookingId';

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '');
}

function parseExpiry(exp) {
  const t = String(exp || '').trim();
  const m = t.match(/^(\d{1,2})\s*\/\s*(\d{2})$/);
  if (!m) return null;
  const mm = parseInt(m[1], 10);
  const yy = parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return null;
  return { mm, yy };
}

function expiryNotPast({ mm, yy }) {
  const year = 2000 + yy;
  const endOfMonth = new Date(year, mm, 0, 23, 59, 59, 999);
  return endOfMonth >= new Date();
}

function formatMoney(amount, currency) {
  const n = typeof amount === 'number' ? amount : Number(amount) || 0;
  const cur = currency || 'LKR';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(n);
  } catch {
    return `${cur} ${n.toFixed(2)}`;
  }
}

function formatDisplayDate(isoYmd) {
  if (!isoYmd || typeof isoYmd !== 'string') return '—';
  const datePart = isoYmd.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return isoYmd;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const PaymentPage = ({
  onBack,
  user,
  isAuthenticated,
  onAddServiceClick,
  onLoginClick,
  onSignupClick,
  onLogout,
  onProfileClick,
}) => {
  const { user: ctxUser, reloadMe } = useContext(AuthContext);
  const effectiveUser = user ?? ctxUser;

  const [loadingBooking, setLoadingBooking] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [booking, setBooking] = useState(null);

  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [billingZip, setBillingZip] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({
    cardholderName: false,
    cardNumber: false,
    expiry: false,
    cvv: false,
    billingZip: false,
  });
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showScratchModal, setShowScratchModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const slipRef = useRef(null);
  const scratchCanvasRef = useRef(null);
  const scratchWrapRef = useRef(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchReady, setScratchReady] = useState(false);
  const [scratchRevealPct, setScratchRevealPct] = useState(0);
  const [scratchDone, setScratchDone] = useState(false);

  const bookingId = useMemo(() => {
    try {
      return sessionStorage.getItem(SESSION_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadError('');
      if (!isAuthenticated || !bookingId) {
        setLoadingBooking(false);
        if (!bookingId) setLoadError('No booking selected for payment.');
        return;
      }
      if (effectiveUser?.role && effectiveUser.role !== 'customer') {
        setLoadingBooking(false);
        setLoadError('Only customers can complete payment.');
        setBooking(null);
        return;
      }
      setLoadingBooking(true);
      try {
        const res = await fetchMyBookings();
        const list = res.data?.bookings || [];
        const b = list.find((x) => String(x.id) === String(bookingId));
        if (!b) {
          setLoadError('Booking not found.');
          setBooking(null);
          return;
        }
        if (b.status !== 'approved') {
          setLoadError('Payment is only available after the supplier approves this booking.');
          setBooking(b);
          return;
        }
        if (b.paymentStatus === 'paid') {
          setLoadError('This booking is already paid.');
          setBooking(b);
          return;
        }
        setBooking(b);
      } catch (e) {
        setLoadError(e?.response?.data?.message || 'Could not load booking.');
        setBooking(null);
      } finally {
        setLoadingBooking(false);
      }
    };
    load();
  }, [isAuthenticated, bookingId, effectiveUser?.role]);

  /** Mirrors `validatePaymentMethodBody` / `payBooking` in bookingController.js */
  const validateField = (field) => {
    const err = {};

    if (field === 'cardholderName') {
      const name = cardholderName.trim();
      const nameParts = name.split(/\s+/);
      if (nameParts.length !== 2) err.cardholderName = 'Enter exactly first and last name (2 words).';
      else if (!/^[A-Za-z\s]+$/.test(name)) err.cardholderName = 'Name must contain letters only.';
    }

    if (field === 'cardNumber') {
      const num = digitsOnly(cardNumber);
      if (!/^\d{16}$/.test(num)) err.cardNumber = 'Card number must be exactly 16 digits (numbers only).';
    }

    if (field === 'expiry') {
      const ex = parseExpiry(expiry);
      if (!ex) err.expiry = 'Use MM / YY (e.g. 08 / 29).';
      else if (!expiryNotPast(ex)) err.expiry = 'Card has expired.';
    }

    if (field === 'cvv') {
      const cv = String(cvv || '').trim();
      if (!/^\d{3}$/.test(cv)) err.cvv = 'CVV must be exactly 3 digits.';
    }

    if (field === 'billingZip') {
      const zip = String(billingZip || '').trim();
      if (!/^\d{5}$/.test(zip)) err.billingZip = 'Postal code must be exactly 5 digits.';
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      if (err[field]) next[field] = err[field];
      return next;
    });

    return !err[field];
  };

  const validateForm = () => {
    const err = {};
    const name = cardholderName.trim();
    const nameParts = name.split(/\s+/);

    if (nameParts.length !== 2) {
      err.cardholderName = 'Enter exactly first and last name (2 words).';
    } else if (!/^[A-Za-z\s]+$/.test(name)) {
      err.cardholderName = 'Name must contain letters only.';
    }

    const num = digitsOnly(cardNumber);
    if (!/^\d{16}$/.test(num)) {
      err.cardNumber = 'Card number must be exactly 16 digits (numbers only).';
    }

    const ex = parseExpiry(expiry);
    if (!ex) err.expiry = 'Use MM / YY (e.g. 08 / 29).';
    else if (!expiryNotPast(ex)) err.expiry = 'Card has expired.';

    const cv = String(cvv || '').trim();
    if (!/^\d{3}$/.test(cv)) {
      err.cvv = 'CVV must be exactly 3 digits.';
    }

    const zip = String(billingZip || '').trim();
    if (!/^\d{5}$/.test(zip)) {
      err.billingZip = 'Postal code must be exactly 5 digits.';
    }

    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (effectiveUser?.role !== 'customer') {
      setSubmitError('Only customers can complete payment.');
      return;
    }
    if (!booking || booking.status !== 'approved' || booking.paymentStatus === 'paid') return;
    setTouched({
      cardholderName: true,
      cardNumber: true,
      expiry: true,
      cvv: true,
      billingZip: true,
    });
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const res = await payBooking(booking.id, {
        cardholderName: cardholderName.trim(),
        cardNumber: digitsOnly(cardNumber),
        expiry: String(expiry || '').trim(),
        cvv: String(cvv || '').trim(),
        billingZip: String(billingZip || '').trim(),
      });
      const b = res.data?.booking;
      const scratchCoupon = res.data?.scratchCoupon || null;
      setReceipt({
        paymentRef: b?.paymentRef,
        paidAt: b?.paidAt,
        amount: b?.amount ?? booking.amount ?? 0,
        currency: b?.currency || booking.currency || 'LKR',
        bookingId: booking.id,
        requestedDate: booking.requestedDate,
        requestedTimeLabel: booking.requestedTimeLabel,
        hours: bookingHours,
        supplierName: booking.supplier?.fullName,
        cardholderName: cardholderName.trim(),
        scratchCoupon,
      });
      try {
        await reloadMe?.();
      } catch {
        /* ignore */
      }
      if (scratchCoupon) {
        setShowScratchModal(true);
        setShowReceiptModal(false);
      } else {
        setShowReceiptModal(true);
      }
    } catch (err) {
      const data = err?.response?.data;
      const fe = data?.fieldErrors && typeof data.fieldErrors === 'object' ? data.fieldErrors : null;
      if (fe) setFieldErrors(fe);
      setSubmitError(data?.message || 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const printSlip = () => {
    const el = slipRef.current;
    if (!el) return;
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) return;
    w.document.write(
      `<!DOCTYPE html><html><head><title>Payment receipt</title><style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 16px}
        table{width:100%;border-collapse:collapse}
        td{padding:6px 0;border-bottom:1px solid #eee}
        td:first-child{color:#666;width:40%}
        .amt{font-size:22px;font-weight:800;margin-top:12px}
      </style></head><body>${el.innerHTML}</body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const goMyBookings = () => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    window.location.hash = 'my-bookings';
  };

  const formatCardInput = (v) => {
    const d = digitsOnly(v).slice(0, 16);
    const parts = [];
    for (let i = 0; i < d.length; i += 4) parts.push(d.slice(i, i + 4));
    return parts.join(' ');
  };

  const formatExpiryInput = (v) => {
    let d = digitsOnly(v).slice(0, 4);
    if (d.length >= 2) d = `${d.slice(0, 2)} / ${d.slice(2)}`;
    return d;
  };

  const amount = booking?.amount ?? 0;
  const currency = booking?.currency || 'LKR';
  const bookingHours =
    Number.isFinite(booking?.hours) && booking.hours >= 1 && booking.hours <= 5 ? booking.hours : 1;

  useEffect(() => {
    if (!showScratchModal || !receipt?.scratchCoupon) return;
    let cancelled = false;

    const initCanvas = (attempt = 0) => {
      if (cancelled) return;
      const canvas = scratchCanvasRef.current;
      const wrap = scratchWrapRef.current;
      if (!canvas || !wrap) {
        if (attempt < 20) window.requestAnimationFrame(() => initCanvas(attempt + 1));
        return;
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      const width = Math.max(1, Math.floor(wrap.clientWidth || wrap.getBoundingClientRect().width || 0));
      const height = Math.max(1, Math.floor(wrap.clientHeight || wrap.getBoundingClientRect().height || 0));
      if ((width < 50 || height < 50) && attempt < 10) {
        window.requestAnimationFrame(() => initCanvas(attempt + 1));
        return;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#b6bec8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (let i = 0; i < 1800; i += 1) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2);

      setScratchReady(true);
      setScratchRevealPct(0);
      setScratchDone(false);
      setIsScratching(false);
    };

    initCanvas();
    return () => {
      cancelled = true;
    };
  }, [showScratchModal, receipt?.scratchCoupon]);

  const scratchAt = (clientX, clientY) => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  };

  const updateScratchProgress = () => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 120) transparent += 1;
    }
    const total = Math.max(1, Math.floor(data.length / 4));
    const pct = Math.round((transparent / total) * 100);
    setScratchRevealPct(pct);
    if (pct >= 80) setScratchDone(true);
  };

  const handleScratchPointerDown = (e) => {
    if (scratchDone) return;
    setIsScratching(true);
    scratchAt(e.clientX, e.clientY);
    updateScratchProgress();
  };

  const handleScratchPointerMove = (e) => {
    if (!isScratching || scratchDone) return;
    scratchAt(e.clientX, e.clientY);
    updateScratchProgress();
  };

  const handleScratchPointerUp = () => {
    setIsScratching(false);
    updateScratchProgress();
  };

  return (
    <div className="payment-page-root">
      <style>{`
        .payment-page-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #fbf2e8;
        }
        .payment-main {
          flex: 1;
          padding: 22px 16px 40px;
          color: #1f2937;
        }
        .pay-inner {
          max-width: 920px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .pay-inner { grid-template-columns: 1fr; }
        }
        .pay-back {
          border: 1px solid rgba(229,231,235,1);
          background: #fff;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 800;
          cursor: pointer;
          color: #3b2109;
          margin-bottom: 14px;
        }
        .pay-title {
          margin: 0 0 6px;
          font-size: 26px;
          font-weight: 900;
          color: #6b3d12;
        }
        .pay-sub {
          margin: 0 0 18px;
          color: #9a6a3d;
          font-weight: 700;
          font-size: 13px;
          line-height: 1.45;
        }
        .pay-card {
          background: #fff;
          border: 1px solid rgba(229,231,235,1);
          border-radius: 18px;
          padding: 20px 22px;
          box-shadow: 0 12px 26px rgba(0,0,0,0.05);
        }
        .pay-card h2 {
          margin: 0 0 14px;
          font-size: 15px;
          font-weight: 900;
          color: #3b2109;
        }
        .pay-summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
        }
        .pay-summary-row span:first-child {
          color: #9a6a3d;
          font-weight: 700;
        }
        .pay-summary-row span:last-child {
          font-weight: 800;
          color: #3b2109;
          text-align: right;
        }
        .pay-total {
          margin-top: 12px;
          font-size: 22px;
          font-weight: 900;
          color: #6b3d12;
        }
        .pay-form label {
          display: block;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #9a6a3d;
          margin-bottom: 6px;
        }
        .pay-form input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 4px;
          box-sizing: border-box;
        }
        .pay-form input:focus {
          outline: none;
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.15);
        }
        .pay-field-error {
          color: #b91c1c;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .pay-submit {
          width: 100%;
          margin-top: 8px;
          border: none;
          background: #a4570a;
          color: #fff;
          padding: 14px 18px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 15px;
          cursor: pointer;
        }
        .pay-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .pay-banner-err {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 12px 14px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 13px;
          margin-bottom: 14px;
        }
        .pay-note {
          font-size: 12px;
          color: #6b7280;
          margin-top: 12px;
          line-height: 1.45;
        }
        .pay-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }
        .pay-modal {
          background: #fff;
          border-radius: 20px;
          max-width: 440px;
          width: 100%;
          padding: 28px 24px 22px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.2);
          text-align: center;
        }
        .pay-modal-icon {
          width: 56px;
          height: 56px;
          border-radius: 999px;
          background: #dcfce7;
          color: #166534;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin: 0 auto 14px;
        }
        .pay-modal h3 {
          margin: 0 0 8px;
          font-size: 22px;
          font-weight: 900;
          color: #14532d;
        }
        .pay-modal p {
          margin: 0 0 16px;
          color: #64748b;
          font-weight: 600;
          font-size: 14px;
        }
        .pay-slip-box {
          text-align: left;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 16px;
          font-size: 13px;
        }
        .pay-slip-box table {
          width: 100%;
          border-collapse: collapse;
        }
        .pay-slip-box td {
          padding: 4px 0;
          vertical-align: top;
        }
        .pay-slip-box td:first-child {
          color: #64748b;
          font-weight: 700;
          width: 42%;
        }
        .pay-modal-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pay-modal-actions button {
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 900;
          cursor: pointer;
          border: none;
          font-size: 14px;
        }
        .pay-btn-print {
          background: #1e293b;
          color: #fff;
        }
        .pay-btn-done {
          background: #f97316;
          color: #fff;
        }
        .scratch-wrap {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #ffffff, #f8fafc);
          min-height: 170px;
          margin: 8px 0 12px;
        }
        .scratch-under {
          padding: 16px 14px;
          text-align: center;
        }
        .scratch-under .k1 {
          font-size: 11px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .scratch-under .k2 {
          font-size: 30px;
          font-weight: 1000;
          color: #b91c1c;
          margin-top: 6px;
        }
        .scratch-under .k3 {
          font-size: 18px;
          font-weight: 900;
          color: #1f2937;
          margin-top: 6px;
          font-family: monospace;
        }
        .scratch-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
          cursor: crosshair;
          touch-action: none;
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

      <main className="payment-main">
        <div className="pay-inner">
          <div>
            <button type="button" className="pay-back" onClick={onBack}>
              ← Back
            </button>
            <h1 className="pay-title">Complete payment</h1>
            <p className="pay-sub">
              Pay for your approved session. Card details are validated on the server (number, expiry, CVV); full card
              numbers and CVV are not stored—only your name on card is saved on the receipt.
            </p>

            {!isAuthenticated && (
              <div className="pay-card pay-banner-err">Please sign in to complete payment.</div>
            )}

            {loadingBooking && <div className="pay-card">Loading booking…</div>}

            {!loadingBooking && loadError && (
              <div className="pay-card">
                <div className="pay-banner-err" style={{ marginBottom: 0 }}>
                  {loadError}
                </div>
                <button type="button" className="pay-back" style={{ marginTop: 14 }} onClick={goMyBookings}>
                  Go to My bookings
                </button>
              </div>
            )}

            {!loadingBooking &&
              booking &&
              !loadError &&
              booking.status === 'approved' &&
              booking.paymentStatus !== 'paid' &&
              effectiveUser?.role === 'customer' && (
              <form className="pay-card pay-form" onSubmit={handlePay} noValidate>
                <h2>Payment method</h2>
                {submitError && <div className="pay-banner-err">{submitError}</div>}

                <div>
                  <label htmlFor="cardholderName">Name on card</label>
                  <input
                    id="cardholderName"
                    autoComplete="cc-name"
                    value={cardholderName}
                    onChange={(e) => {
                      setCardholderName(e.target.value);
                      if (touched.cardholderName) validateField('cardholderName');
                    }}
                    onBlur={() => {
                      setTouched((p) => ({ ...p, cardholderName: true }));
                      validateField('cardholderName');
                    }}
                    placeholder="e.g. Jane Doe"
                  />
                  {fieldErrors.cardholderName && <div className="pay-field-error">{fieldErrors.cardholderName}</div>}
                </div>

                <div>
                  <label htmlFor="cardNumber">Card number</label>
                  <input
                    id="cardNumber"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={cardNumber}
                    onChange={(e) => {
                      setCardNumber(formatCardInput(e.target.value));
                      if (touched.cardNumber) validateField('cardNumber');
                    }}
                    onBlur={() => {
                      setTouched((p) => ({ ...p, cardNumber: true }));
                      validateField('cardNumber');
                    }}
                    placeholder="1234 5678 9012 3456"
                  />
                  {fieldErrors.cardNumber && <div className="pay-field-error">{fieldErrors.cardNumber}</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label htmlFor="expiry">Expires</label>
                    <input
                      id="expiry"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      value={expiry}
                      onChange={(e) => {
                        setExpiry(formatExpiryInput(e.target.value));
                        if (touched.expiry) validateField('expiry');
                      }}
                      onBlur={() => {
                        setTouched((p) => ({ ...p, expiry: true }));
                        validateField('expiry');
                      }}
                      placeholder="MM / YY"
                    />
                    {fieldErrors.expiry && <div className="pay-field-error">{fieldErrors.expiry}</div>}
                  </div>
                  <div>
                    <label htmlFor="cvv">CVV</label>
                    <input
                      id="cvv"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={cvv}
                      onChange={(e) => {
                        setCvv(digitsOnly(e.target.value).slice(0, 3));
                        if (touched.cvv) validateField('cvv');
                      }}
                      onBlur={() => {
                        setTouched((p) => ({ ...p, cvv: true }));
                        validateField('cvv');
                      }}
                      placeholder="123"
                    />
                    {fieldErrors.cvv && <div className="pay-field-error">{fieldErrors.cvv}</div>}
                  </div>
                </div>

                <div>
                  <label htmlFor="billingZip">Billing ZIP / postal code</label>
                  <input
                    id="billingZip"
                    autoComplete="postal-code"
                    value={billingZip}
                    onChange={(e) => {
                      setBillingZip(e.target.value);
                      if (touched.billingZip) validateField('billingZip');
                    }}
                    onBlur={() => {
                      setTouched((p) => ({ ...p, billingZip: true }));
                      validateField('billingZip');
                    }}
                    placeholder="e.g. 94102"
                  />
                  {fieldErrors.billingZip && <div className="pay-field-error">{fieldErrors.billingZip}</div>}
                </div>

                <button type="submit" className="pay-submit" disabled={submitting}>
                  {submitting ? 'Processing…' : `Pay ${formatMoney(amount, currency)}`}
                </button>
                <p className="pay-note">
                  Demo checkout: your card is not charged by a real processor. Use cardholder first and last name, a
                  16-digit card number, MM / YY expiry, 3-digit CVV, and a 5-digit postal code.
                </p>
              </form>
            )}
          </div>

          {booking && (
            <aside className="pay-card">
              <h2>Booking details</h2>
              <div className="pay-summary-row">
                <span>Provider</span>
                <span>{booking.supplier?.fullName || '—'}</span>
              </div>
              <div className="pay-summary-row">
                <span>Session date</span>
                <span>{formatDisplayDate(booking.requestedDate)}</span>
              </div>
              <div className="pay-summary-row">
                <span>Time</span>
                <span>{booking.requestedTimeLabel || '—'}</span>
              </div>
              <div className="pay-summary-row">
                <span>Hours</span>
                <span>{bookingHours}</span>
              </div>
              <div className="pay-summary-row">
                <span>Booking ID</span>
                <span style={{ fontSize: 11, wordBreak: 'break-all' }}>{String(booking.id)}</span>
              </div>
              <div className="pay-total">
                {booking.paymentStatus === 'paid' ? (
                  <>Paid · {booking.paymentRef || '—'}</>
                ) : (
                  <>Due: {formatMoney(amount, currency)}</>
                )}
              </div>
              <p className="pay-note" style={{ marginTop: 14, marginBottom: 0 }}>
                Price is hours × average of the market hourly rate range for this service (LKR). Taxes may apply where
                required.
              </p>
            </aside>
          )}
        </div>
      </main>

      <Footer />

      {showScratchModal && receipt?.scratchCoupon && (
        <div className="pay-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="scratch-title">
          <div className="pay-modal">
            <div className="pay-modal-icon" aria-hidden="true">🎁</div>
            <h3 id="scratch-title">Scratch your reward</h3>
            <p>Reveal your next-booking coupon first, then we will show your receipt.</p>

            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#111827', marginBottom: 6 }}>
                Scratch reward for your next booking
              </div>
              <div ref={scratchWrapRef} className="scratch-wrap">
                <div className="scratch-under">
                  <div className="k1">You won</div>
                  <div className="k2">
                    {receipt.scratchCoupon.type === 'percentage'
                      ? `${Number(receipt.scratchCoupon.value || 0)}% OFF`
                      : `LKR ${Number(receipt.scratchCoupon.value || 0).toLocaleString()} OFF`}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#475569', marginTop: 2 }}>Next booking only</div>
                  <div className="k3">{receipt.scratchCoupon.code}</div>
                </div>
                {!scratchDone && (
                  <canvas
                    ref={scratchCanvasRef}
                    className="scratch-canvas"
                    onPointerDown={handleScratchPointerDown}
                    onPointerMove={handleScratchPointerMove}
                    onPointerUp={handleScratchPointerUp}
                    onPointerLeave={handleScratchPointerUp}
                    style={{ opacity: scratchReady ? 1 : 0.001 }}
                  />
                )}
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 10 }}>
                {scratchDone ? 'Coupon revealed. It is saved in your account.' : `Scratch to reveal (${scratchRevealPct}%)`}
              </div>
            </div>

            <div className="pay-modal-actions">
              <button
                type="button"
                className="pay-btn-done"
                disabled={!scratchDone}
                style={{ opacity: scratchDone ? 1 : 0.55, cursor: scratchDone ? 'pointer' : 'not-allowed' }}
                onClick={() => {
                  if (!scratchDone) return;
                  setShowScratchModal(false);
                  setShowReceiptModal(true);
                }}
              >
                Continue to receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiptModal && receipt && (
        <div className="pay-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pay-done-title">
          <div className="pay-modal">
            <div className="pay-modal-icon" aria-hidden="true">
              ✓
            </div>
            <h3 id="pay-done-title">Payment done</h3>
            <p>Your payment was recorded successfully. You can print the receipt slip below.</p>

            <div className="pay-slip-box" ref={slipRef} id="payment-slip-print">
              <div style={{ fontWeight: 900, marginBottom: 10, color: '#0f172a' }}>ServiConnect — payment receipt</div>
              <table>
                <tbody>
                  <tr>
                    <td>Reference</td>
                    <td>{receipt.paymentRef}</td>
                  </tr>
                  <tr>
                    <td>Date</td>
                    <td>
                      {receipt.paidAt
                        ? new Date(receipt.paidAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td>Amount</td>
                    <td>{formatMoney(receipt.amount, receipt.currency)}</td>
                  </tr>
                  <tr>
                    <td>Booking ID</td>
                    <td style={{ wordBreak: 'break-all' }}>{String(receipt.bookingId)}</td>
                  </tr>
                  <tr>
                    <td>Session</td>
                    <td>
                      {formatDisplayDate(receipt.requestedDate)} · {receipt.requestedTimeLabel}
                      {receipt.hours != null ? ` · ${receipt.hours} hr` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td>Provider</td>
                    <td>{receipt.supplierName || '—'}</td>
                  </tr>
                  <tr>
                    <td>Paid by</td>
                    <td>{receipt.cardholderName}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pay-modal-actions">
              <button type="button" className="pay-btn-print" onClick={printSlip}>
                Print receipt slip
              </button>
              <button type="button" className="pay-btn-done" onClick={goMyBookings}>
                Back to My bookings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
