import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { fetchMyBookings, fetchPublicCatalogOptions, updateBookingStatus } from '../services/api';
import { resolveRateFromServicesRates } from '../utils/serviceRateLookup';

function formatMoney(amount, currency) {
  const n = typeof amount === 'number' ? amount : Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'LKR' }).format(n);
  } catch {
    return `${currency || 'LKR'} ${n.toFixed(2)}`;
  }
}

function normCatalogKey(s) {
  return String(s || '').trim().toLowerCase();
}

function findCatalogCategoryKey(servicesByCat, providerCategoryLabel) {
  const keys = Object.keys(servicesByCat || {});
  if (!keys.length) return null;
  const want = normCatalogKey(providerCategoryLabel);
  const exact = keys.find((k) => normCatalogKey(k) === want);
  if (exact) return exact;
  return keys.find((k) => {
    const nk = normCatalogKey(k);
    return nk.includes(want) || want.includes(nk);
  }) || null;
}

function getProviderRoleForRates(supplier) {
  if (supplier?.serviceCategory === 'other' && supplier?.serviceCategoryOther) {
    return `Other (${supplier.serviceCategoryOther})`;
  }
  return supplier?.serviceCategory || '';
}

function getBookingServiceRateRange(supplier, serviceName, marketRatesByKey, rateLookupCategoryNorm) {
  if (!marketRatesByKey || typeof marketRatesByKey !== 'object' || !rateLookupCategoryNorm) return null;

  const parts = Array.isArray(serviceName)
    ? serviceName
    : String(serviceName || '')
        .split(',')
        .map((s) => String(s).trim())
        .filter(Boolean);

  if (!parts.length) return null;

  let totalMin = 0;
  let totalMax = 0;

  for (const svcNameRaw of parts) {
    const svcName = String(svcNameRaw || '').trim();
    if (!svcName) continue;

    let svcMin = 0;
    let svcMax = 0;

    const supplierRate = resolveRateFromServicesRates(supplier?.servicesRates, svcName);
    if (supplierRate !== undefined && Number.isFinite(supplierRate) && supplierRate > 0) {
      svcMin = supplierRate;
      svcMax = supplierRate;
    }

    if (svcMin === 0) {
      const key = `${rateLookupCategoryNorm}|||${normCatalogKey(svcName)}`;
      const row = marketRatesByKey[key];
      if (row && Number.isFinite(row.minRatePerHour) && Number.isFinite(row.maxRatePerHour)) {
        svcMin = row.minRatePerHour;
        svcMax = row.maxRatePerHour;
      } else {
        const rows = [];
        for (const [k, v] of Object.entries(marketRatesByKey)) {
          if (!k.startsWith(`${rateLookupCategoryNorm}|||`)) continue;
          if (Number.isFinite(v?.minRatePerHour) && Number.isFinite(v?.maxRatePerHour)) {
            rows.push(v);
          }
        }
        if (rows.length) {
          svcMin = Math.min(...rows.map((r) => r.minRatePerHour));
          svcMax = Math.max(...rows.map((r) => r.maxRatePerHour));
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
  };
}

const SupplierBookingsPage = ({ onBack }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [completedMap, setCompletedMap] = useState({});
  const [marketRatesByKey, setMarketRatesByKey] = useState({});
  const [servicesByCategory, setServicesByCategory] = useState({});

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetchMyBookings();
      setBookings(res.data?.bookings || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load booking requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPublicCatalogOptions();
        if (!cancelled) {
          setMarketRatesByKey(
            res?.data?.marketRatesByKey && typeof res.data.marketRatesByKey === 'object'
              ? res.data.marketRatesByKey
              : {}
          );
          setServicesByCategory(
            res?.data?.servicesByCategory && typeof res.data.servicesByCategory === 'object'
              ? res.data.servicesByCategory
              : {}
          );
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
  }, []);

  const pending = useMemo(() => bookings.filter((b) => b.status === 'pending'), [bookings]);
  const approvedCount = useMemo(() => bookings.filter((b) => b.status === 'approved').length, [bookings]);
  const completedCount = useMemo(
    () => bookings.filter((b) => b.status === 'completed' || !!completedMap[b.id]).length,
    [bookings, completedMap]
  );

  const act = async (id, status) => {
    setBusyId(id);
    const wasCompleted = !!completedMap[id];
    if (status === 'completed') {
      setCompletedMap((prev) => ({ ...prev, [id]: true }));
    }
    try {
      await updateBookingStatus(id, status);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update booking.');
      if (status === 'completed' && !wasCompleted) {
        setCompletedMap((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } finally {
      setBusyId('');
    }
  };

  // Helper for status badge style
  const getStatusStyle = (status, id) => {
    const displayStatus = status === 'completed' || !!completedMap[id] ? 'completed' : status;
    switch (displayStatus) {
      case 'pending':
        return { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };
      case 'approved':
        return { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };
      case 'rejected':
        return { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' };
      case 'completed':
        return { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' };
      default:
        return { background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fef9f1 0%, #fff5eb 100%)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'white',
                border: '1px solid #fed7aa',
                borderRadius: 40,
                padding: '8px 20px',
                fontWeight: 600,
                fontSize: 14,
                color: '#9a3412',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fff7ed'; e.currentTarget.style.borderColor = '#fdba74'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#fed7aa'; }}
            >
              ← Back
            </button>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: '#78350f', letterSpacing: '-0.02em', margin: 0 }}>Booking Requests</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 500, color: '#b45309' }}>
                {user?.name ? `Supplier: ${user.name}` : 'Supplier Dashboard'}
                <span style={{ margin: '0 8px' }}>•</span>
                <span style={{ background: '#ffedd5', padding: '2px 10px', borderRadius: 40, fontSize: 12, fontWeight: 600 }}>Pending: {pending.length}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div style={{ background: 'white', borderRadius: 24, padding: '20px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #ffedd5', transition: 'transform 0.1s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#d97706' }}>Pending</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#78350f', marginTop: 8 }}>{pending.length}</div>
              </div>
              <div style={{ background: '#fff7ed', borderRadius: 60, padding: 12, color: '#ea580c' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: 24, padding: '20px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #dbeafe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2563eb' }}>Approved</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#1e3a8a', marginTop: 8 }}>{approvedCount}</div>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 60, padding: 12, color: '#2563eb' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: 24, padding: '20px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #d1fae5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#059669' }}>Completed</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#064e3b', marginTop: 8 }}>{completedCount}</div>
              </div>
              <div style={{ background: '#ecfdf5', borderRadius: 60, padding: 12, color: '#10b981' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ marginBottom: 20, background: '#fef2f2', borderRadius: 20, padding: '12px 20px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#dc2626', fontWeight: 'bold' }}>⚠️</span>
              <span style={{ color: '#b91c1c', fontWeight: 500 }}>{error}</span>
            </div>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#b91c1c' }}>×</button>
          </div>
        )}

        {/* Main Table Card */}
        <div style={{ background: 'white', borderRadius: 28, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.02)', border: '1px solid #fef3c7', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #fff1e6', background: '#fffaf5' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#78350f', margin: 0 }}>All Booking Requests</h2>
          </div>

          {loading ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: 40, height: 40, border: '3px solid #fed7aa', borderTopColor: '#ea580c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
              <p style={{ marginTop: 16, color: '#92400e', fontWeight: 500 }}>Loading requests...</p>
              <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
            </div>
          ) : bookings.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ background: '#fff7ed', width: 64, height: 64, borderRadius: 64, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#78350f', margin: 0 }}>No requests yet</p>
              <p style={{ color: '#b45309', marginTop: 4 }}>When customers book your services, they'll appear here.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#fef9f1', borderBottom: '1px solid #fde68a' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Customer</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Service</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Location</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Time</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Duration</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Total fee</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Payment</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Actions</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Complete</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const supplierRateSource = b.supplier || user;
                    const providerRole = getProviderRoleForRates(supplierRateSource);
                    const catalogCategoryKey = findCatalogCategoryKey(servicesByCategory, providerRole);
                    const rateLookupCategoryNorm = normCatalogKey(catalogCategoryKey || providerRole);
                    const serviceRateRange = getBookingServiceRateRange(
                      supplierRateSource,
                      b.serviceName,
                      marketRatesByKey,
                      rateLookupCategoryNorm
                    );
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
                    const amount = typeof b.amount === 'number' ? b.amount : Number(b.amount) || 0;
                    const totalCostLabel = feeToShow != null ? formatMoney(feeToShow, b.currency || 'LKR') : formatMoney(amount, b.currency || 'LKR');
                    const hasDiscount = Number(b.discountAmount || 0) > 0;
                    return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #fff1e6', transition: 'background 0.1s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#fffef7'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#451a03' }}>{b.customer?.fullName || 'Customer'}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#5c3a1a' }}>{b.serviceName || '—'}</td>
                      <td style={{ padding: '14px 16px', color: '#6b4c2c' }}>{b.customer?.city || '—'}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 500 }}>{b.requestedDate}</td>
                      <td style={{ padding: '14px 16px' }}>{b.requestedTimeLabel}</td>
                      <td style={{ padding: '14px 16px' }}>{Number.isFinite(b.hours) && b.hours > 0 ? `${b.hours} hr` : '—'}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#b45309' }}>
                        <div>{totalCostLabel}</div>
                        {hasDiscount ? (
                          <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: '#166534' }}>
                            -{formatMoney(Number(b.discountAmount || 0), b.currency || 'LKR')}
                            {b.discountCode ? ` (${b.discountCode})` : ''}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ ...getStatusStyle(b.status, b.id), display: 'inline-block', padding: '4px 12px', borderRadius: 40, fontSize: 12, fontWeight: 600 }}>
                          {(b.status === 'completed' || !!completedMap[b.id]) ? 'Completed' : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {b.paymentStatus === 'paid' ? (
                          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: 40, fontSize: 12, fontWeight: 600 }}>Paid</span>
                        ) : (
                          <span style={{ background: '#ffedd5', color: '#9a3412', padding: '4px 12px', borderRadius: 40, fontSize: 12, fontWeight: 600 }}>Unpaid</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {b.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              disabled={busyId === b.id}
                              onClick={() => act(b.id, 'approved')}
                              style={{
                                background: '#16a34a',
                                border: 'none',
                                borderRadius: 40,
                                padding: '6px 16px',
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'all 0.1s',
                                opacity: busyId === b.id ? 0.6 : 1
                              }}
                              onMouseEnter={(e) => { if (!busyId) e.currentTarget.style.background = '#15803d' }}
                              onMouseLeave={(e) => { if (!busyId) e.currentTarget.style.background = '#16a34a' }}
                            >
                              {busyId === b.id ? '...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              disabled={busyId === b.id}
                              onClick={() => act(b.id, 'rejected')}
                              style={{
                                background: 'white',
                                border: '1px solid #fecaca',
                                borderRadius: 40,
                                padding: '6px 16px',
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#b91c1c',
                                cursor: 'pointer',
                                transition: 'all 0.1s',
                                opacity: busyId === b.id ? 0.6 : 1
                              }}
                              onMouseEnter={(e) => { if (!busyId) e.currentTarget.style.background = '#fef2f2' }}
                              onMouseLeave={(e) => { if (!busyId) e.currentTarget.style.background = 'white' }}
                            >
                              {busyId === b.id ? '...' : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {b.paymentStatus === 'paid' ? (
                          <input
                            type="checkbox"
                            checked={b.status === 'completed' || !!completedMap[b.id]}
                            disabled={busyId === b.id || b.status !== 'approved' || !!completedMap[b.id]}
                            onChange={() => act(b.id, 'completed')}
                            style={{
                              width: 18,
                              height: 18,
                              cursor: (b.status === 'approved' && !completedMap[b.id] && b.paymentStatus === 'paid') ? 'pointer' : 'default',
                              accentColor: '#10b981'
                            }}
                          />
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: 13 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierBookingsPage;