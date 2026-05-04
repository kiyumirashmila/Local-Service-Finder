import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import {
  createBooking,
  fetchPublicCatalogOptions,
  fetchPublicSupplierById,
  fetchSupplierBookedTimes,
  previewDiscount
} from '../services/api';
import { resolveRateFromServicesRates } from '../utils/serviceRateLookup';

function normCatalogKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function formatCatalogRateLine(range) {
  if (!range || !Number.isFinite(range.minRatePerHour) || !Number.isFinite(range.maxRatePerHour)) {
    return null;
  }
  const cur = range.currency || 'LKR';
  const a = Math.round(range.minRatePerHour);
  const b = Math.round(range.maxRatePerHour);
  if (a === b) return `${cur} ${a.toLocaleString()} / hr`;
  return `${cur} ${a.toLocaleString()} – ${b.toLocaleString()} / hr`;
}

function findCatalogCategoryKey(servicesByCategory, providerCategoryLabel) {
  const keys = Object.keys(servicesByCategory || {});
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
function findSupplierServiceRate(service, svcName, marketRatesByKey, rateLookupCategoryNorm) {
  let svcMin = 0;
  let svcMax = 0;
  let currency = 'LKR';

  const supplierRate = resolveRateFromServicesRates(service?.servicesRates, svcName);
  if (supplierRate !== undefined && Number.isFinite(supplierRate) && supplierRate > 0) {
    svcMin = supplierRate;
    svcMax = supplierRate;
  }

  if (svcMin === 0 && marketRatesByKey) {
    const k = `${rateLookupCategoryNorm}|||${normCatalogKey(svcName)}`;
    const row = marketRatesByKey[k];
    if (row && Number.isFinite(row.minRatePerHour) && Number.isFinite(row.maxRatePerHour)) {
      svcMin = row.minRatePerHour;
      svcMax = row.maxRatePerHour;
      if (row.currency) currency = row.currency;
    } else {
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

  return { svcMin, svcMax, currency };
}
import Header from './Header';
import Footer from './Footer';
import '../styles/HomePage.css';

const pad2 = (n) => String(n).padStart(2, '0');

function toLocalIsoDate(date) {
  if (!(date instanceof Date)) return '';
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (!y || !m || !d) return '';
  return `${y}-${pad2(m)}-${pad2(d)}`; // YYYY-MM-DD in local calendar date
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function formatMonthYear(date) {
  return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function formatSelectedDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeLabel(h, m) {
  const hours12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${pad2(hours12)}:${pad2(m)} ${ampm}`;
}

function normalizeTimeLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const bookingTimeSections = [
  {
    id: 'morning',
    title: 'Morning',
    slots: [6, 7, 8, 9, 10, 11],
  },
  {
    id: 'afternoon',
    title: 'Afternoon',
    slots: [12, 13, 14, 15, 16],
  },
  {
    id: 'evening',
    title: 'Evening',
    slots: [17, 18, 19, 20, 21, 22],
  },
];

const BookingPage = ({
  service,
  onBack,
  user,
  isAuthenticated: isAuthenticatedProp,
  onAddServiceClick,
  onLoginClick,
  onSignupClick,
  onLogout,
  onProfileClick,
}) => {
  const { isAuthenticated: isAuthenticatedCtx, user: ctxUser } = useContext(AuthContext);
  const isAuthenticated = isAuthenticatedProp ?? isAuthenticatedCtx;
  const headerUser = user ?? ctxUser;

  const [supplierLiveProfile, setSupplierLiveProfile] = useState(null);

  useEffect(() => {
    const id = service?.supplierId;
    if (!id) {
      setSupplierLiveProfile(null);
      return undefined;
    }
    let cancelled = false;
    fetchPublicSupplierById(id)
      .then((res) => {
        if (!cancelled) setSupplierLiveProfile(res.data || null);
      })
      .catch(() => {
        if (!cancelled) setSupplierLiveProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [service?.supplierId]);

  const bookingService = useMemo(() => {
    if (!service) return null;
    const live = supplierLiveProfile;
    if (!live) return service;
    const liveRates = live.servicesRates && typeof live.servicesRates === 'object' ? live.servicesRates : {};
    const sessionRates = service.servicesRates && typeof service.servicesRates === 'object' ? service.servicesRates : {};
    return {
      ...service,
      ...live,
      category: String(service.category || '').trim() || live.category || '',
      servicesRates: { ...sessionRates, ...liveRates },
      services:
        Array.isArray(service.services) && service.services.length > 0
          ? service.services
          : Array.isArray(live.services)
            ? live.services
            : []
    };
  }, [service, supplierLiveProfile]);

  const providerName = bookingService?.providerName || 'Provider';
  const providerRole = bookingService?.category || 'Local Professional';
  const initialServiceTitle = String(bookingService?.title || 'Service').trim() || 'Service';
  const location = bookingService?.location || '';
  const experience = bookingService?.experience || '';
  const avatarUrl = bookingService?.avatarUrl || bookingService?.avatar || '';

  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookingHours, setBookingHours] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitError, setReviewSubmitError] = useState('');
  const [bookingDetails, setBookingDetails] = useState(null);
  const [bookedTimes, setBookedTimes] = useState(() => new Set());
  const [bookedTimesLoading, setBookedTimesLoading] = useState(false);
  const [activeInterface, setActiveInterface] = useState(1);
  const [locationAddress, setLocationAddress] = useState(() => String(headerUser?.address || '').trim());
  const [locationCity, setLocationCity] = useState(() => String(headerUser?.city || '').trim());
  const [locationValidationError, setLocationValidationError] = useState('');
  const [locationMode, setLocationMode] = useState('profile');
  const [servicesByCategory, setServicesByCategory] = useState({});
  const [marketRatesByKey, setMarketRatesByKey] = useState({});
  const [discountCode, setDiscountCode] = useState('');
  const [discountBusy, setDiscountBusy] = useState(false);
  const [discountError, setDiscountError] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const availableScratchCoupons = useMemo(
    () => (Array.isArray(headerUser?.scratchCoupons) ? headerUser.scratchCoupons.filter((c) => !c?.isUsed) : []),
    [headerUser?.scratchCoupons]
  );
  // Parse supplier's services: prefer services array, then servicesRates keys, fallback to splitting the title
  const supplierServicesList = useMemo(() => {
    // 1. Use the direct services array from the supplier (passed via booking payload)
    if (Array.isArray(bookingService?.services) && bookingService.services.length > 0) {
      return bookingService.services.map((s) => String(s).trim()).filter(Boolean);
    }
    // 2. Fall back to servicesRates keys
    const ratesKeys = bookingService?.servicesRates
      ? Object.keys(bookingService.servicesRates).filter((k) => k && String(k).trim())
      : [];
    if (ratesKeys.length > 0) return ratesKeys;
    // 3. Fallback: split comma-separated title into individual services
    if (initialServiceTitle && initialServiceTitle !== 'Service') {
      return initialServiceTitle.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return initialServiceTitle ? [initialServiceTitle] : [];
  }, [bookingService?.services, bookingService?.servicesRates, initialServiceTitle]);

  const [selectedServiceNames, setSelectedServiceNames] = useState(
    () => supplierServicesList.length > 0 ? [...supplierServicesList] : []
  );

  useEffect(() => {
    setSelectedServiceNames(supplierServicesList.length > 0 ? [...supplierServicesList] : []);
  }, [supplierServicesList, bookingService?.supplierId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPublicCatalogOptions();
        if (cancelled) return;
        if (res?.data?.servicesByCategory && typeof res.data.servicesByCategory === 'object') {
          setServicesByCategory(res.data.servicesByCategory);
        }
        if (res?.data?.marketRatesByKey && typeof res.data.marketRatesByKey === 'object') {
          setMarketRatesByKey(res.data.marketRatesByKey);
        }
      } catch {
        if (!cancelled) {
          setServicesByCategory({});
          setMarketRatesByKey({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalogCategoryKey = useMemo(
    () => findCatalogCategoryKey(servicesByCategory, providerRole),
    [servicesByCategory, providerRole]
  );

  const serviceOptions = useMemo(() => {
    const fromCat = catalogCategoryKey ? servicesByCategory[catalogCategoryKey] || [] : [];
    const set = new Set(fromCat.map((x) => String(x || '').trim()).filter(Boolean));
    // Add the supplier's individual services (from servicesRates keys or parsed title)
    for (const svc of supplierServicesList) {
      if (svc) set.add(svc);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [servicesByCategory, catalogCategoryKey, supplierServicesList]);

  useEffect(() => {
    if (!serviceOptions.length) return;
    if (selectedServiceNames.length === 0 && serviceOptions.length > 0) {
      setSelectedServiceNames([serviceOptions[0]]);
    }
  }, [serviceOptions, selectedServiceNames]);

  const rateLookupCategoryNorm = useMemo(
    () => normCatalogKey(catalogCategoryKey || providerRole),
    [catalogCategoryKey, providerRole]
  );

  const toggleService = (svc) => {
    setSelectedServiceNames((prev) =>
      prev.includes(svc) ? prev.filter((x) => x !== svc) : [...prev, svc]
    );
  };

  const selectedServiceRateRange = useMemo(() => {
    if (!selectedServiceNames || selectedServiceNames.length === 0) return null;

    let totalMin = 0;
    let totalMax = 0;
    let currency = 'LKR';

    for (const svcName of selectedServiceNames) {
      const resolved = findSupplierServiceRate(bookingService, svcName, marketRatesByKey, rateLookupCategoryNorm);
      const svcMin = resolved.svcMin;
      const svcMax = resolved.svcMax;
      if (resolved.currency) currency = resolved.currency;

      totalMin += svcMin;
      totalMax += svcMax;
    }

    if (totalMin === 0 && totalMax === 0) return null;

    return {
      minRatePerHour: totalMin,
      maxRatePerHour: totalMax,
      currency: currency,
    };
  }, [marketRatesByKey, rateLookupCategoryNorm, selectedServiceNames, bookingService?.servicesRates]);

  const selectedServiceRateLabel = useMemo(
    () => formatCatalogRateLine(selectedServiceRateRange),
    [selectedServiceRateRange]
  );

  const timezoneLabel = useMemo(() => {
    const offsetMin = new Date().getTimezoneOffset();
    const sign = offsetMin <= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const hh = pad2(Math.floor(abs / 60));
    const mm = pad2(abs % 60);
    return `GMT${sign}${hh}:${mm}`;
  }, []);

  const profileAddress = String(headerUser?.address || '').trim();
  const profileCity = String(headerUser?.city || '').trim();
  const supplierCoverageCity = String(
    bookingService?.serviceCoverageCity || bookingService?.city || bookingService?.location || ''
  ).trim();
  const supplierCoverageDistrict = String(bookingService?.serviceCoverageDistrict || '').trim();
  const finalLocationAddress = locationMode === 'profile'
    ? profileAddress
    : locationAddress.trim();
  const finalLocationCity = locationMode === 'profile'
    ? profileCity
    : locationCity.trim();
  const finalLocation = [finalLocationAddress, finalLocationCity].filter(Boolean).join(', ');

  const calendarDays = useMemo(() => {
    const first = startOfMonth(monthCursor);
    const last = endOfMonth(monthCursor);
    const startWeekday = (first.getDay() + 6) % 7; // Monday=0

    const days = [];
    for (let i = 0; i < startWeekday; i++) {
      days.push({ type: 'pad', key: `pad-${i}` });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(first.getFullYear(), first.getMonth(), d);
      const today = new Date();
      const isPast =
        new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() <
        new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      days.push({ type: 'day', date, day: d, isPast, key: `d-${d}` });
    }
    return days;
  }, [monthCursor]);

  const selectedSessionLabel = useMemo(() => {
    if (!selectedDate || !selectedTime) return 'Select a date and time';
    return `${formatSelectedDate(selectedDate)} · ${selectedTime} · ${bookingHours} hr · ${finalLocation || 'location needed'}`;
  }, [selectedDate, selectedTime, bookingHours, finalLocation]);

  const estimatedTotalLkr = useMemo(() => {
    if (!selectedServiceRateRange) return null;
    const { minRatePerHour, maxRatePerHour } = selectedServiceRateRange;
    if (!Number.isFinite(minRatePerHour) || !Number.isFinite(maxRatePerHour)) return null;
    const avgPerHour = (minRatePerHour + maxRatePerHour) / 2;
    return Math.round(avgPerHour * bookingHours);
  }, [selectedServiceRateRange, bookingHours]);

  useEffect(() => {
    // Discount preview is tied to current estimated subtotal.
    setAppliedDiscount(null);
    setDiscountError('');
  }, [estimatedTotalLkr, bookingHours, selectedServiceNames]);

  const discountedTotalLkr = useMemo(() => {
    if (appliedDiscount?.promo?.code) {
      const subtotal = Math.max(0, Number(estimatedTotalLkr) || 0);
      const discountAmt = Math.max(0, Number(appliedDiscount.discountAmount) || 0);
      return Math.max(0, subtotal - discountAmt);
    }
    return estimatedTotalLkr || 0;
  }, [appliedDiscount, estimatedTotalLkr]);

  const canGoStep2 = Boolean(selectedServiceNames.length > 0 && selectedDate);
  const canProceed = Boolean(
    selectedDate &&
    selectedTime &&
    finalLocationAddress &&
    finalLocationCity &&
    !locationValidationError
  );
  const supplierId = bookingService?.supplierId || '';

  useEffect(() => {
    const selectedCity = String(
      locationMode === 'profile' ? profileCity : locationCity || ''
    )
      .trim()
      .toLowerCase();
    if (!selectedCity) {
      setLocationValidationError('');
      return;
    }
    const coverageCity = supplierCoverageCity.toLowerCase();
    const coverageDistrict = supplierCoverageDistrict.toLowerCase();
    const hasCoverageRule = Boolean(coverageCity || coverageDistrict);
    if (!hasCoverageRule) {
      setLocationValidationError('');
      return;
    }
    const inCity = coverageCity && (selectedCity === coverageCity || selectedCity.includes(coverageCity));
    const inDistrict = coverageDistrict && (selectedCity === coverageDistrict || selectedCity.includes(coverageDistrict));
    if (!inCity && !inDistrict) {
      setLocationValidationError('This supplier is not available in your selected location');
      return;
    }
    setLocationValidationError('');
  }, [locationMode, profileCity, locationCity, supplierCoverageCity, supplierCoverageDistrict]);

  const initials = providerName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  const allTimeSlots = useMemo(() => {
    const list = [];
    for (const section of bookingTimeSections) {
      for (const h of section.slots) {
        list.push({
          sectionId: section.id,
          h,
          m: 0,
          label: formatTimeLabel(h, 0),
        });
      }
    }
    return list;
  }, []);

  useEffect(() => {
    const loadBooked = async () => {
      if (!supplierId || !selectedDate) {
        setBookedTimes(new Set());
        return;
      }
      const isoDate = toLocalIsoDate(selectedDate);
      try {
        setBookedTimesLoading(true);
        const res = await fetchSupplierBookedTimes(supplierId, isoDate);
        const list = res?.data?.bookedTimes || [];

        const expandedTimes = new Set();
        for (const item of list) {
          const tLabel = String(item?.time || '').trim();
          if (!tLabel) continue;

          const hrs = Math.max(1, Number(item?.hours) || 1);
          const sIdx = allTimeSlots.findIndex((slot) => normalizeTimeLabel(slot.label) === normalizeTimeLabel(tLabel));

          if (sIdx >= 0) {
            for (let i = 0; i < hrs; i++) {
              if (sIdx + i < allTimeSlots.length) {
                expandedTimes.add(allTimeSlots[sIdx + i].label);
              }
            }
          } else {
            expandedTimes.add(tLabel);
          }
        }
        setBookedTimes(expandedTimes);
      } catch {
        setBookedTimes(new Set());
      } finally {
        setBookedTimesLoading(false);
      }
    };
    loadBooked();
  }, [supplierId, selectedDate, allTimeSlots]);

  const bookedTimesNorm = useMemo(
    () => new Set(Array.from(bookedTimes).map((label) => normalizeTimeLabel(label))),
    [bookedTimes]
  );

  const hasContinuousSlot = useCallback((startIdx) => {
    if (startIdx < 0 || startIdx + bookingHours > allTimeSlots.length) return false;
    for (let idx = startIdx; idx < startIdx + bookingHours; idx += 1) {
      if (bookedTimesNorm.has(normalizeTimeLabel(allTimeSlots[idx].label))) {
        return false;
      }
    }
    return true;
  }, [allTimeSlots, bookingHours, bookedTimesNorm]);

  const selectedStartIdx = useMemo(
    () => allTimeSlots.findIndex((slot) => slot.label === selectedTime),
    [allTimeSlots, selectedTime]
  );

  useEffect(() => {
    if (!selectedTime) return;
    if (selectedStartIdx < 0 || !hasContinuousSlot(selectedStartIdx)) {
      setSelectedTime(null);
    }
  }, [bookingHours, selectedTime, selectedStartIdx, hasContinuousSlot]);

  const blockedTimeNorms = useMemo(() => {
    const locked = new Set();
    if (selectedStartIdx < 0) return locked;
    for (let idx = selectedStartIdx; idx < selectedStartIdx + bookingHours; idx += 1) {
      if (idx >= 0 && idx < allTimeSlots.length) {
        locked.add(normalizeTimeLabel(allTimeSlots[idx].label));
      }
    }
    return locked;
  }, [allTimeSlots, bookingHours, selectedStartIdx]);

  const timeSections = useMemo(() => {
    return bookingTimeSections.map((section) => ({
      ...section,
      items: section.slots.map((h) => ({ h, m: 0, label: formatTimeLabel(h, 0) })),
    }));
  }, []);

  const selectedTimeRangeLabel = useMemo(() => {
    if (!selectedTime) return '—';
    const startIdx = allTimeSlots.findIndex((slot) => slot.label === selectedTime);
    if (startIdx < 0) return selectedTime;
    const startHour = allTimeSlots[startIdx]?.h ?? 0;
    const endHour = startHour + bookingHours;
    return `${selectedTime} — ${formatTimeLabel(endHour, 0)}`;
  }, [allTimeSlots, selectedTime, bookingHours]);

  const stepNumber = !selectedServiceNames.length
    ? 1
    : !selectedDate
      ? 1
      : !selectedTime
        ? 2
        : !finalLocation
          ? 3
          : 4;
  const stepFill = stepNumber <= 1 ? '0%' : stepNumber === 2 ? '33%' : stepNumber === 3 ? '66%' : '100%';

  const submitBooking = async () => {
    if (!canProceed) return;
    setSubmitError('');
    setDone(false);

    if (!isAuthenticated) {
      setSubmitError('Please login first to place a booking request.');
      return;
    }
    if (!supplierId) {
      setSubmitError('Missing supplier information for this booking.');
      return;
    }

    const isoDate = toLocalIsoDate(selectedDate); // YYYY-MM-DD (local date, no timezone shift)

    try {
      setSubmitting(true);
      const createdRes = await createBooking({
        supplierId,
        requestedDate: isoDate,
        requestedTimeLabel: selectedTime,
        serviceTitle: selectedServiceNames.length > 0 ? selectedServiceNames.join(', ') : initialServiceTitle,
        hours: bookingHours,
        locationAddress: finalLocation,
        discountCode: appliedDiscount?.promo?.code || '',
      });
      const created = createdRes?.data?.booking || createdRes?.booking || createdRes?.data || {};
      const bookingId = created?.id || created?.bookingId || created?._id || 'N/A';
      const completedDate =
        created?.completedAt ||
        created?.completedDate ||
        isoDate;
      const status = typeof created?.status === 'string' ? created.status : 'pending';
      setBookingDetails({
        id: bookingId,
        serviceName: selectedServiceNames.length > 0 ? selectedServiceNames.join(', ') : initialServiceTitle,
        supplierName: providerName,
        completedDate,
        status
      });
      setDone(true);
      if (status === 'completed') {
        setReviewSubmitError('');
        setShowReviewModal(true);
      }
      window.location.hash = 'my-bookings';
    } catch (err) {
      setDone(false);
      setSubmitError(err?.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const applyDiscountCode = async () => {
    setDiscountError('');
    setAppliedDiscount(null);
    const code = String(discountCode || '').trim().toUpperCase();
    if (!code) {
      setDiscountError('Enter a promo code first.');
      return;
    }
    if (!Number.isFinite(estimatedTotalLkr) || estimatedTotalLkr <= 0) {
      setDiscountError('Estimated fee is required before applying a promo code.');
      return;
    }
    try {
      setDiscountBusy(true);
      const scratchMatch = availableScratchCoupons.find(
        (c) => String(c?.code || '').trim().toUpperCase() === code
      );
      if (scratchMatch) {
        const subtotal = Math.max(0, Number(estimatedTotalLkr) || 0);
        const raw =
          scratchMatch.type === 'percentage'
            ? Math.round((subtotal * Math.max(0, Number(scratchMatch.value) || 0)) / 100)
            : Math.round(Math.max(0, Number(scratchMatch.value) || 0));
        const discountAmount = Math.min(subtotal, raw);
        setAppliedDiscount({
          promo: {
            code,
            type: scratchMatch.type,
            value: Number(scratchMatch.value) || 0,
          },
          subtotal,
          discountAmount,
          total: Math.max(0, subtotal - discountAmount),
          fromScratchCoupon: true,
        });
      } else {
        const res = await previewDiscount({ code, subtotal: estimatedTotalLkr });
        setAppliedDiscount(res?.data || null);
      }
    } catch (err) {
      setDiscountError(err?.response?.data?.message || 'Failed to validate discount code.');
    } finally {
      setDiscountBusy(false);
    }
  };

  return (
    <div className="booking-page-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        onAddServiceClick={onAddServiceClick}
        user={headerUser}
        isAuthenticated={isAuthenticated}
        onLoginClick={onLoginClick}
        onSignupClick={onSignupClick}
        onLogout={onLogout}
        onProfileClick={onProfileClick}
      />
      <div className="booking-shell">
        <style>{`
        .booking-page-root .booking-shell{
          flex: 1;
          min-height: 0;
          background: #f1f5f9;
          padding: 22px 16px 30px;
          color: #1f2937;
        }
        .booking-container{
          max-width: 1120px;
          margin: 0 auto;
        }
        .booking-topbar{
          display:flex;
          align-items:center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .booking-back{
          border:none;
          background: #ffffff;
          border: 1px solid rgba(229,231,235,1);
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 900;
          cursor:pointer;
        }
        .booking-title{
          margin: 0;
          font-size: 34px;
          font-weight: 1100;
          color: #0f172a;
        }
        .booking-subtitle{
          margin: 4px 0 0;
          color: #475569;
          font-weight: 800;
          font-size: 13px;
        }
        .booking-layout{
          display:grid;
          grid-template-columns: 320px 1fr;
          gap: 18px;
          align-items:start;
        }
        .booking-steps{
          position: relative;
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
          padding: 14px 14px 12px;
          border-radius: 14px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
        }
        .booking-steps-line{
          position:absolute;
          top:28px;
          left:12.5%;
          width:75%;
          height:4px;
          border-radius:999px;
          background:#e5e7eb;
          z-index:0;
        }
        .booking-steps-line-fill{
          height:100%;
          border-radius:999px;
          background: linear-gradient(90deg, #1e3a8a, #2563eb);
          transition: width 0.2s ease;
        }
        .booking-step{
          position:relative;
          z-index:1;
          display:flex;
          flex-direction:column;
          align-items:center;
          text-align:center;
          gap:6px;
        }
        .booking-step-icon{
          width:30px;
          height:30px;
          border-radius:999px;
          border:2px solid #d1d5db;
          background:#fff;
          color:#9ca3af;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:12px;
          font-weight:900;
        }
        .booking-step.active .booking-step-icon{
          border-color:#1d4ed8;
          background:#2563eb;
          color:#fff;
        }
        .booking-step-label{
          font-size:11px;
          font-weight:800;
          color:#475569;
        }
        .booking-step.active .booking-step-label{
          color:#1d4ed8;
        }
        .booking-card{
          background: #fff;
          border: 1px solid rgba(229,231,235,1);
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 12px 26px rgba(0,0,0,0.05);
        }
        .provider-avatar{
          width: 56px;
          height: 56px;
          border-radius: 999px;
          background: #1e3a8a;
          display:flex;
          align-items:center;
          justify-content:center;
          color:#fff;
          font-weight: 1100;
          margin: 6px auto 10px;
        }
        .provider-name{
          text-align:center;
          font-weight:1100;
          margin: 0;
          color: #0f172a;
        }
        .provider-role{
          text-align:center;
          margin: 2px 0 10px;
          color:#475569;
          font-weight: 800;
          font-size: 12px;
        }
        .provider-meta{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        .meta-item{
          background: #eff6ff;
          border: 1px solid rgba(30,58,138,0.25);
          border-radius: 14px;
          padding: 10px;
        }
        .meta-label{
          color:#475569;
          font-weight:900;
          font-size: 11px;
          margin-bottom: 4px;
        }
        .meta-value{
          font-weight: 1100;
          color:#0f172a;
          font-size: 12px;
        }
        .meta-item-service{
          grid-column: 1 / -1;
        }
        .meta-service-select{
          width: 100%;
          margin-top: 4px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid rgba(30,58,138,0.35);
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
          background: #fff;
          cursor: pointer;
          box-sizing: border-box;
        }
        .service-checkbox{
          width: 14px;
          height: 14px;
          margin: 0;
          flex-shrink: 0;
        }
        .meta-service-select:focus{
          outline: 2px solid rgba(30,58,138,0.25);
          outline-offset: 1px;
        }
        .meta-price-range{
          margin-top: 8px;
          font-size: 11px;
          font-weight: 800;
          color: #1e3a8a;
          line-height: 1.35;
        }
        .guarantee{
          margin-top: 12px;
          background: #1e3a8a;
          color: #fff;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 14px 26px rgba(30,58,138,0.25);
        }
        .guarantee h4{
          margin: 0 0 6px;
          font-size: 13px;
          font-weight: 1100;
          display:flex;
          align-items:center;
          gap: 10px;
        }
        .guarantee p{
          margin: 0;
          opacity: 0.92;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.5;
        }
        .booking-main{
          background: #fff;
          border: 1px solid rgba(229,231,235,1);
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 12px 26px rgba(0,0,0,0.05);
        }
        .main-grid{
          display:grid;
          grid-template-columns: 1fr 320px;
          gap: 16px;
          align-items:start;
        }
        .cal-header{
          display:flex;
          align-items:center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .cal-month{
          font-weight: 1100;
          color:#0f172a;
          font-size: 13px;
        }
        .cal-nav{
          display:flex;
          gap: 8px;
        }
        .cal-nav button{
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(229,231,235,1);
          background: #fff;
          cursor:pointer;
          font-weight:1100;
        }
        .cal-grid{
          display:grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }
        .cal-dow{
          font-size: 10px;
          color:#475569;
          font-weight: 1000;
          text-align:center;
          padding: 4px 0;
        }
        .cal-day{
          border: 1px solid rgba(229,231,235,1);
          background:#fff;
          border-radius: 12px;
          height: 38px;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          font-weight:1000;
          color:#0f172a;
        }
        .cal-day.pad{
          border:none;
          background: transparent;
          cursor: default;
        }
        .cal-day.past{
          opacity: 0.35;
          cursor: not-allowed;
        }
        .cal-day.selected{
          background: #1e3a8a;
          color:#fff;
          border-color: rgba(30,58,138,0.35);
          box-shadow: 0 10px 18px rgba(30,58,138,0.22);
        }
        .hours-stepper{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:14px;
          padding:12px 14px;
          background:#eff6ff;
          border:1px solid rgba(30,58,138,0.25);
          border-radius:14px;
        }
        .hours-stepper-label{
          font-size:12px;
          font-weight:900;
          color:#0f172a;
        }
        .hours-stepper-sub{
          font-size:11px;
          font-weight:700;
          color:#475569;
          margin-top:2px;
        }
        .hours-stepper-controls{
          display:flex;
          align-items:center;
          gap:10px;
        }
        .hours-select{
          min-width: 140px;
          border: 1px solid rgba(30,58,138,0.45);
          border-radius: 10px;
          background: #fff;
          color: #1e3a8a;
          font-size: 13px;
          font-weight: 900;
          padding: 8px 10px;
        }
        .hours-stepper-btn{
          width:36px;
          height:36px;
          border-radius:10px;
          border:1px solid rgba(30,58,138,0.45);
          background:#fff;
          font-size:18px;
          font-weight:900;
          color:#1e3a8a;
          cursor:pointer;
          line-height:1;
        }
        .hours-stepper-btn:disabled{
          opacity:0.35;
          cursor:not-allowed;
        }
        .hours-stepper-value{
          min-width:28px;
          text-align:center;
          font-size:18px;
          font-weight:1100;
          color:#0f172a;
        }
        .times-header{
          display:flex;
          align-items:center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .times-header h4{
          margin:0;
          font-size: 12px;
          font-weight:1100;
          color:#0f172a;
        }
        .live-pill{
          font-size: 10px;
          font-weight: 1100;
          background: #eff6ff;
          border: 1px solid rgba(30,58,138,0.25);
          border-radius: 999px;
          padding: 4px 8px;
          color:#475569;
        }
        .times-grid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .time-btn{
          border: 1px solid rgb(194, 153, 52);
          background: #fff;
          border-radius: 12px;
          padding: 11px 10px;
          cursor:pointer;
          font-weight: 1100;
          color:#0f172a;
          display:flex;
          justify-content:center;
        }
        .time-btn.disabled{
          opacity: 0.45;
          cursor:not-allowed;
        }
        .time-btn.booked{
          border-color: #9ca3af;
          background: #e5e7eb;
          color: #6b7280;
          opacity: 1;
        }
        .time-btn.blocked{
          border-color: #9ca3af;
          background: #e5e7eb;
          color: #6b7280;
          opacity: 1;
        }
        .time-btn.selected{
          border-color: rgba(30,58,138,0.55);
          box-shadow: 0 10px 18px rgba(30,58,138,0.18);
          background: #eff6ff;
        }
        .location-card{
          margin-top: 12px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(59,130,246,0.25);
          background: #eff6ff;
        }
        .location-head{
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }
        .location-title{
          margin: 0;
          font-size: 12px;
          font-weight: 900;
          color: #1e3a8a;
        }
        .location-change-btn{
          border: 1px solid rgba(37,99,235,0.3);
          background: #fff;
          color: #1d4ed8;
          font-size: 11px;
          font-weight: 900;
          border-radius: 999px;
          padding: 7px 10px;
          cursor: pointer;
        }
        .location-value{
          font-size: 12px;
          font-weight: 800;
          color: #1f2937;
          line-height: 1.4;
        }
        .location-input{
          width: 100%;
          border: 1px solid rgba(37,99,235,0.25);
          border-radius: 10px;
          padding: 9px 10px;
          font-size: 12px;
          box-sizing: border-box;
        }
        .location-grid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .location-helper{
          margin-top: 8px;
          font-size: 12px;
          font-weight: 800;
          color: #b91c1c;
        }
        .booking-bottom{
          margin-top: 14px;
          background: #eff6ff;
          border: 1px solid rgba(30,58,138,0.25);
          border-radius: 16px;
          padding: 14px;
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 12px;
        }
        .interface-actions{
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .session-box{
          display:flex;
          align-items:center;
          gap: 12px;
        }
        .session-icon{
          width: 40px;
          height: 40px;
          border-radius: 14px;
          background: rgba(30,58,138,0.16);
          color: #fbf9f7;
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight: 1100;
        }
        .session-label{
          font-size: 10px;
          font-weight: 1100;
          color:#475569;
          letter-spacing: 0.4px;
        }
        .session-value{
          font-size: 12px;
          font-weight: 1100;
          color:#0f172a;
        }
        .next-btn{
          border:none;
          background: #1e3a8a;
          color: #fff;
          padding: 12px 18px;
          border-radius: 999px;
          font-weight: 1100;
          cursor:pointer;
          display:flex;
          align-items:center;
          gap: 10px;
          min-width: 140px;
          justify-content:center;
        }
        .next-btn:disabled{
          opacity: 0.6;
          cursor:not-allowed;
        }
        .review-modal-backdrop{
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.55);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index: 999;
        }
        .review-modal{
          background:#fff;
          border-radius: 18px;
          max-width: 460px;
          width: 100%;
          padding: 20px 22px 18px;
          box-shadow: 0 24px 50px rgba(0,0,0,0.35);
        }
        .review-header{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:10px;
        }
        .review-title{
          margin:0;
          font-size:18px;
          font-weight:1100;
          color:#111827;
        }
        .review-close-btn{
          border:none;
          background:transparent;
          cursor:pointer;
          font-size:18px;
          line-height:1;
        }
        .review-body{
          font-size:13px;
          color:#4b5563;
          margin-bottom:12px;
        }
        .review-details{
          background:#f9fafb;
          border-radius:12px;
          padding:10px 12px;
          font-size:12px;
          margin-bottom:12px;
        }
        .review-details-row{
          display:flex;
          justify-content:space-between;
          margin-bottom:4px;
        }
        .review-details-label{
          font-weight:800;
          color:#6b7280;
        }
        .review-details-value{
          font-weight:900;
          color:#111827;
        }
        .review-stars{
          display:flex;
          gap:6px;
          margin:8px 0 10px;
        }
        .review-star-btn{
          border:none;
          background:transparent;
          cursor:pointer;
          font-size:24px;
        }
        .review-star-active{
          color:#1e3a8a;
        }
        .review-star-inactive{
          color:#d1d5db;
        }
        .review-textarea{
          width:100%;
          min-height:80px;
          border-radius:12px;
          border:1px solid #e5e7eb;
          padding:8px 10px;
          font-size:12px;
          resize:vertical;
          margin-top:4px;
        }
        .review-footer{
          display:flex;
          justify-content:flex-end;
          gap:8px;
          margin-top:12px;
        }
        .review-cancel-btn{
          border:1px solid #e5e7eb;
          background:#fff;
          padding:8px 14px;
          border-radius:999px;
          font-size:12px;
          font-weight:900;
          cursor:pointer;
        }
        .review-submit-btn{
          border:none;
          background:#16a34a;
          color:#fff;
          padding:8px 16px;
          border-radius:999px;
          font-size:12px;
          font-weight:900;
          cursor:pointer;
        }
        .summary-layout{
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 14px;
          align-items: start;
        }
        .summary-card{
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 14px;
        }
        .summary-title{
          margin: 0 0 4px;
          font-size: 20px;
          color: #1f2937;
          font-weight: 1000;
        }
        .summary-sub{
          margin: 0 0 12px;
          font-size: 12px;
          color: #6b7280;
          font-weight: 700;
        }
        .summary-grid{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 14px;
        }
        .summary-k{
          font-size: 10px;
          color: #475569;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .summary-v{
          font-size: 13px;
          color: #1f2937;
          font-weight: 900;
          line-height: 1.35;
        }
        .summary-fee{
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .summary-fee-label{
          font-size: 13px;
          color: #6b7280;
          font-weight: 800;
        }
        .summary-fee-value{
          font-size: 34px;
          color: #111827;
          font-weight: 1100;
        }
        .timeline-item{
          display: grid;
          grid-template-columns: 20px 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }
        .timeline-dot{
          width: 18px;
          height: 18px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 900;
          color: #fff;
          margin-top: 2px;
        }
        .timeline-dot.active{ background: #1e3a8a; }
        .timeline-dot.done{ background: #16a34a; }
        .timeline-dot.pending{ background: #cbd5e1; color: #334155; }
        .timeline-step-title{
          font-size: 14px;
          font-weight: 900;
          color: #1f2937;
        }
        .timeline-step-sub{
          font-size: 12px;
          color: #6b7280;
          font-weight: 700;
          margin-top: 2px;
        }
        @media (max-width: 980px){
          .booking-layout{ grid-template-columns: 1fr; }
          .main-grid{ grid-template-columns: 1fr; }
          .summary-layout{ grid-template-columns: 1fr; }
        }
      `}</style>

        <div className="booking-container">
          <div className="booking-topbar">
            <button className="booking-back" type="button" onClick={onBack}>
              ← Back
            </button>
            <div>
              <h1 className="booking-title">Select Date & Time</h1>
              <p className="booking-subtitle">
                Secure your session with {providerName}. All times are shown in your local timezone ({timezoneLabel}).
              </p>
            </div>
          </div>

          <div className="booking-steps" aria-label="Booking steps">
            <div className="booking-steps-line" aria-hidden="true">
              <div className="booking-steps-line-fill" style={{ width: stepFill }} />
            </div>
            <div className={`booking-step ${stepNumber >= 1 ? 'active' : ''}`}>
              <span className="booking-step-icon" aria-hidden="true">1</span>
              <span className="booking-step-label">Service & Price</span>
            </div>
            <div className={`booking-step ${stepNumber >= 2 ? 'active' : ''}`}>
              <span className="booking-step-icon" aria-hidden="true">2</span>
              <span className="booking-step-label">Choose Date</span>
            </div>
            <div className={`booking-step ${stepNumber >= 3 ? 'active' : ''}`}>
              <span className="booking-step-icon" aria-hidden="true">3</span>
              <span className="booking-step-label">Time & Hours</span>
            </div>
            <div className={`booking-step ${stepNumber >= 4 ? 'active' : ''}`}>
              <span className="booking-step-icon" aria-hidden="true">4</span>
              <span className="booking-step-label">Location</span>
            </div>
          </div>

          <div className="booking-layout">
            <div>
              {activeInterface === 1 ? (
                <div className="booking-card">
                  <div className="meta-item meta-item-service" style={{ marginTop: 0 }}>
                    <div className="meta-label">Step 1: Service</div>
                    {serviceOptions.length > 0 ? (
                      <div className="meta-service-select" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                        {serviceOptions.map((svc) => {
                          const supplierRate = resolveRateFromServicesRates(bookingService?.servicesRates, svc);
                          const hasRate = supplierRate !== undefined && Number.isFinite(Number(supplierRate)) && Number(supplierRate) > 0;
                          return (
                            <label key={svc} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                className="service-checkbox"
                                checked={selectedServiceNames.includes(svc)}
                                onChange={() => toggleService(svc)}
                              />
                              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 600, flex: 1 }}>{svc}</span>
                              {hasRate && (
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  color: '#1e3a8a',
                                  background: '#eff6ff',
                                  border: '1px solid rgba(30,58,138,0.25)',
                                  borderRadius: '8px',
                                  padding: '2px 8px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  LKR {Number(supplierRate).toLocaleString()}/hr
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="meta-value">{selectedServiceNames.length > 0 ? selectedServiceNames.join(', ') : initialServiceTitle}</div>
                    )}
                    <div className="meta-price-range" aria-live="polite">
                      {selectedServiceRateLabel ? (
                        <>Estimated rate: {selectedServiceRateLabel}</>
                      ) : (
                        <>Price range: add market research for this category in admin to see typical hourly rates.</>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="booking-card">
                    <div className="provider-avatar" aria-hidden="true">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={providerName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 999 }}
                        />
                      ) : (
                        initials || 'P'
                      )}
                    </div>
                    <p className="provider-name">{providerName}</p>
                    <p className="provider-role">{providerRole}</p>

                    <div className="provider-meta">
                      <div className="meta-item meta-item-service">
                        <div className="meta-label">Selected Service</div>
                        <div className="meta-value">{selectedServiceNames.length > 0 ? selectedServiceNames.join(', ') : initialServiceTitle}</div>
                        <div className="meta-price-range" aria-live="polite">
                          {selectedServiceRateLabel ? <>Estimated rate: {selectedServiceRateLabel}</> : '—'}
                        </div>
                      </div>
                      <div className="meta-item">
                        <div className="meta-label">Duration</div>
                        <div className="meta-value">
                          {bookingHours} hour{bookingHours !== 1 ? 's' : ''}
                          {estimatedTotalLkr != null && (
                            <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#1e3a8a', fontWeight: 800 }}>
                              Est. total: LKR {estimatedTotalLkr.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="meta-item">
                        <div className="meta-label">Location</div>
                        <div className="meta-value">{finalLocation || location || 'Add an address'}</div>
                      </div>
                      <div className="meta-item">
                        <div className="meta-label">Experience</div>
                        <div className="meta-value">{experience || '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="guarantee">
                    <h4>
                      <span aria-hidden="true">★</span> Professional Guarantee
                    </h4>
                    <p>
                      Your booking is protected. If the provider cancels or fails to show, you’ll receive a full refund
                      instantly.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="booking-main">
              {activeInterface === 1 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#475569', marginBottom: 8 }}>Step 2: Choose Date</div>
                  <div className="cal-header">
                    <div className="cal-month">{formatMonthYear(monthCursor)}</div>
                    <div className="cal-nav">
                      <button type="button" onClick={() => setMonthCursor((d) => addMonths(d, -1))} aria-label="Prev month">
                        ‹
                      </button>
                      <button type="button" onClick={() => setMonthCursor((d) => addMonths(d, 1))} aria-label="Next month">
                        ›
                      </button>
                    </div>
                  </div>

                  <div className="cal-grid" role="grid" aria-label="Calendar">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
                      <div key={`dow-${idx}-${d}`} className="cal-dow">
                        {d}
                      </div>
                    ))}

                    {calendarDays.map((cell) => {
                      if (cell.type === 'pad') {
                        return <div key={cell.key} className="cal-day pad" />;
                      }

                      const isSelected =
                        selectedDate &&
                        cell.date.getFullYear() === selectedDate.getFullYear() &&
                        cell.date.getMonth() === selectedDate.getMonth() &&
                        cell.date.getDate() === selectedDate.getDate();

                      const className = [
                        'cal-day',
                        cell.isPast ? 'past' : '',
                        isSelected ? 'selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <button
                          type="button"
                          key={cell.key}
                          className={className}
                          disabled={cell.isPast}
                          onClick={() => {
                            setSelectedDate(cell.date);
                            setSelectedTime(null);
                          }}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>

                  <div className="interface-actions">
                    <button
                      className="next-btn"
                      type="button"
                      disabled={!canGoStep2}
                      onClick={() => setActiveInterface(2)}
                    >
                      Next <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </>
              )}

              {activeInterface === 2 && (
                <>
                  <div className="hours-stepper" aria-label="Session length in hours">
                    <div>
                      <div className="hours-stepper-label">Step 3: Select Number of Hours</div>
                      <div className="hours-stepper-sub">Choose 1 to 5 hours first, then select available time</div>
                    </div>
                    <div className="hours-stepper-controls">
                      <select
                        className="hours-select"
                        value={bookingHours}
                        onChange={(e) => setBookingHours(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
                        aria-label="Select Number of Hours"
                      >
                        {[1, 2, 3, 4, 5].map((h) => (
                          <option key={h} value={h}>
                            {h} hour{h > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="times-header">
                    <h4>Available Times</h4>
                    <span className="live-pill">• LIVE</span>
                  </div>

                  {bookedTimesLoading && selectedDate && (
                    <div style={{ fontSize: 11, fontWeight: 900, color: '#475569', marginBottom: 10 }}>
                      Checking booked slots…
                    </div>
                  )}

                  {timeSections.map((section) => (
                    <div key={section.id} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 1100, color: '#0f172a', marginBottom: 8 }}>
                        {section.title}
                      </div>
                      <div className="times-grid">
                        {section.items.map((t) => {
                          const label = t.label;
                          const normLabel = normalizeTimeLabel(label);
                          const startIdx = allTimeSlots.findIndex((slot) => slot.label === label);
                          const isBooked = bookedTimesNorm.has(normLabel);
                          const isDurationBlocked = selectedDate ? !hasContinuousSlot(startIdx) : false;
                          const disabled = !selectedDate || isBooked || isDurationBlocked;
                          const selected = selectedTime === label;
                          const isLockedBySelection = blockedTimeNorms.has(normLabel) && !selected;
                          const className = [
                            'time-btn',
                            disabled ? 'disabled' : '',
                            isBooked ? 'booked' : '',
                            isLockedBySelection ? 'blocked' : '',
                            selected ? 'selected' : '',
                          ]
                            .filter(Boolean)
                            .join(' ');

                          return (
                            <button
                              key={`${section.id}-${label}`}
                              type="button"
                              className={className}
                              disabled={disabled}
                              title={
                                isBooked
                                  ? 'Already booked'
                                  : isDurationBlocked
                                    ? `Need ${bookingHours} continuous hours`
                                    : undefined
                              }
                              onClick={() => setSelectedTime(label)}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="location-card" aria-label="Booking location">
                    <div className="location-head">
                      <h4 className="location-title">Step 4: Location</h4>
                    </div>
                    <div className="location-value" style={{ marginBottom: 8 }}>
                      {profileAddress
                        ? `${profileAddress}${profileCity ? `, ${profileCity}` : ''}`
                        : 'No profile address found. Update your profile to save a default address.'}
                    </div>
                    {locationMode === 'profile' ? (
                      <button
                        type="button"
                        className="location-change-btn"
                        onClick={() => {
                          // Start the "another address" flow using current profile address as default.
                          setLocationMode('custom');
                          setLocationAddress(profileAddress);
                          setLocationCity(profileCity);
                          setLocationValidationError('');
                        }}
                      >
                        Add another address for this booking
                      </button>
                    ) : (
                      <>
                        <div className="location-head" style={{ marginTop: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#1e3a8a' }}>
                            Using a different address for this booking
                          </span>
                          <button
                            type="button"
                            className="location-change-btn"
                            onClick={() => {
                              setLocationMode('profile');
                              setLocationValidationError('');
                            }}
                          >
                            Use current address instead
                          </button>
                        </div>
                        <div className="location-grid">
                          <input
                            type="text"
                            className="location-input"
                            value={locationAddress}
                            onChange={(e) => setLocationAddress(e.target.value)}
                            placeholder="New address for this booking"
                          />
                          <input
                            type="text"
                            className="location-input"
                            value={locationCity}
                            onChange={(e) => setLocationCity(e.target.value)}
                            placeholder="City"
                          />
                        </div>
                      </>
                    )}
                    {locationValidationError ? <div className="location-helper">{locationValidationError}</div> : null}
                  </div>

                  <div className="booking-bottom">
                    <div className="session-box">
                      <div className="session-icon" aria-hidden="true">
                        <i className="fas fa-calendar" />
                      </div>
                      <div>
                        <div className="session-label">SELECTED SESSION</div>
                        <div className="session-value">{selectedSessionLabel}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="next-btn"
                        type="button"
                        onClick={() => setActiveInterface(1)}
                        style={{ background: '#6b7280' }}
                      >
                        <span aria-hidden="true">←</span> Back
                      </button>
                      <button
                        className="next-btn"
                        type="button"
                        disabled={!canProceed}
                        onClick={() => setActiveInterface(3)}
                      >
                        Booking Summary <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeInterface === 3 && (
                <>
                  <div className="summary-card">
                    <h3 className="summary-title">Booking Summary</h3>
                    <p className="summary-sub">Review your upcoming service request details.</p>
                    <div className="summary-grid">
                      <div>
                        <div className="summary-k">Supplier</div>
                        <div className="summary-v">
                          {providerName}
                          <div style={{ fontWeight: 700, marginTop: 2, color: '#6b7280' }}>{providerRole}</div>
                        </div>
                      </div>
                      <div>
                        <div className="summary-k">Service</div>
                        <div className="summary-v">{selectedServiceNames.length > 0 ? selectedServiceNames.join(', ') : initialServiceTitle}</div>
                      </div>
                      <div>
                        <div className="summary-k">Date & Time</div>
                        <div className="summary-v">
                          {selectedDate ? formatSelectedDate(selectedDate) : '—'}
                          <div style={{ fontWeight: 700, marginTop: 2, color: '#6b7280' }}>{selectedTimeRangeLabel}</div>
                        </div>
                      </div>
                      <div>
                        <div className="summary-k">Location</div>
                        <div className="summary-v">{finalLocation || '—'}</div>
                      </div>
                    </div>
                    <div className="summary-fee">
                      <div style={{ width: '100%' }}>
                        <div className="summary-fee-label">Estimated fee</div>
                        <div className="summary-fee-value" style={{ fontSize: 30 }}>
                          LKR {(estimatedTotalLkr || 0).toLocaleString()}
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            value={discountCode}
                            onChange={(e) => {
                              setDiscountCode(e.target.value);
                              setDiscountError('');
                            }}
                            placeholder="Promo code (optional)"
                            style={{
                              flex: 1,
                              border: '1px solid #d1d5db',
                              borderRadius: 10,
                              padding: '8px 10px',
                              fontSize: 12,
                              fontWeight: 800
                            }}
                          />
                          <button
                            type="button"
                            onClick={applyDiscountCode}
                            disabled={discountBusy}
                            style={{
                              border: 'none',
                              borderRadius: 10,
                              padding: '8px 12px',
                              fontSize: 12,
                              fontWeight: 900,
                              background: '#16a34a',
                              color: '#fff',
                              cursor: discountBusy ? 'not-allowed' : 'pointer',
                              opacity: discountBusy ? 0.65 : 1
                            }}
                          >
                            {discountBusy ? 'Applying...' : 'Apply'}
                          </button>
                        </div>
                        {availableScratchCoupons.length > 0 && !appliedDiscount?.promo?.code ? (
                          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: '#1e3a8a' }}>
                            Suggested reward: {availableScratchCoupons[0].code}
                            <button
                              type="button"
                              onClick={() => {
                                setDiscountCode(String(availableScratchCoupons[0].code || '').toUpperCase());
                                setDiscountError('');
                              }}
                              style={{
                                marginLeft: 8,
                                border: '1px solid rgba(37,99,235,0.3)',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                borderRadius: 999,
                                padding: '2px 8px',
                                fontSize: 11,
                                fontWeight: 900,
                                cursor: 'pointer'
                              }}
                            >
                              Use this
                            </button>
                          </div>
                        ) : null}
                        {appliedDiscount?.promo?.code ? (
                          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: '#166534' }}>
                            Discount ({appliedDiscount.promo.code}): -LKR {Number(appliedDiscount.discountAmount || 0).toLocaleString()}
                          </div>
                        ) : null}
                        {discountError ? (
                          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: '#b91c1c' }}>{discountError}</div>
                        ) : null}
                        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: '#111827' }}>
                          Total fee: LKR {discountedTotalLkr.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="booking-bottom" style={{ marginTop: 16 }}>
                    <div className="session-box">
                      <div className="session-icon" aria-hidden="true">
                        <i className="fas fa-calendar" />
                      </div>
                      <div>
                        <div className="session-label">SELECTED SESSION</div>
                        <div className="session-value">{selectedSessionLabel}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="next-btn"
                        type="button"
                        onClick={() => setActiveInterface(2)}
                        style={{ background: '#6b7280' }}
                      >
                        <span aria-hidden="true">←</span> Back
                      </button>
                      <button
                        className="next-btn"
                        type="button"
                        disabled={!canProceed || submitting}
                        onClick={submitBooking}
                      >
                        {submitting ? 'Sending...' : 'Send Booking'} <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeInterface === 1 && (
                <div className="booking-bottom">
                  <div className="session-box">
                    <div className="session-icon" aria-hidden="true">
                      <i className="fas fa-calendar" />
                    </div>
                    <div>
                      <div className="session-label">SELECTED SESSION</div>
                      <div className="session-value">{selectedSessionLabel}</div>
                    </div>
                  </div>
                </div>
              )}

              {(submitError || done) && (
                <div style={{ marginTop: 12 }}>
                  {submitError && (
                    <div style={{ color: '#b91c1c', fontWeight: 900, fontSize: 12 }}>{submitError}</div>
                  )}
                  {done && (
                    <div style={{ color: '#166534', fontWeight: 900, fontSize: 12 }}>
                      Booking request sent. The supplier will approve or reject it.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* old bottom section removed */}
            {showReviewModal && bookingDetails && bookingDetails.status && bookingDetails.status.toLowerCase() === 'completed' && (
              <div className="review-modal-backdrop" role="dialog" aria-modal="true">
                <div className="review-modal">
                  <div className="review-header">
                    <h2 className="review-title">How was your service?</h2>
                    <button
                      type="button"
                      className="review-close-btn"
                      onClick={() => {
                        setReviewSubmitError('');
                        setShowReviewModal(false);
                      }}
                      aria-label="Close review"
                    >
                      ×
                    </button>
                  </div>
                  <div className="review-body">
                    Please share your experience. Your feedback helps others choose the right local professional.
                  </div>
                  <div className="review-details">
                    <div className="review-details-row">
                      <span className="review-details-label">Booking ID</span>
                      <span className="review-details-value">{bookingDetails.id}</span>
                    </div>
                    <div className="review-details-row">
                      <span className="review-details-label">Service</span>
                      <span className="review-details-value">{bookingDetails.serviceName}</span>
                    </div>
                    <div className="review-details-row">
                      <span className="review-details-label">Supplier</span>
                      <span className="review-details-value">{bookingDetails.supplierName}</span>
                    </div>
                    <div className="review-details-row">
                      <span className="review-details-label">Completed</span>
                      <span className="review-details-value">
                        {new Date(bookingDetails.completedDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#374151' }}>Rate your experience</div>
                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = reviewRating >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            className="review-star-btn"
                            onClick={() => {
                              setReviewRating(star);
                              setReviewSubmitError('');
                            }}
                          >
                            <span className={active ? 'review-star-active' : 'review-star-inactive'}>★</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 900, color: '#374151' }}>
                      Optional feedback
                      <textarea
                        className="review-textarea"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Share comments about punctuality, quality, professionalism, etc."
                      />
                    </label>
                  </div>
                  <div className="review-footer">
                    <button
                      type="button"
                      className="review-cancel-btn"
                      onClick={() => {
                        setReviewSubmitError('');
                        setShowReviewModal(false);
                      }}
                    >
                      Skip for now
                    </button>
                    <button
                      type="button"
                      className="review-submit-btn"
                      onClick={() => {
                        if (reviewRating < 1) {
                          setReviewSubmitError('Ratings is required.');
                          return;
                        }
                        setReviewSubmitError('');
                        // Placeholder for integrating with a review API
                        // eslint-disable-next-line no-console
                        console.log('Submit review', {
                          bookingId: bookingDetails.id,
                          rating: reviewRating,
                          feedback: reviewText,
                        });
                        setShowReviewModal(false);
                      }}
                    >
                      Submit review
                    </button>
                  </div>
                  {reviewSubmitError ? (
                    <div style={{ marginTop: 10, color: '#b91c1c', fontWeight: 800, fontSize: 12 }}>{reviewSubmitError}</div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BookingPage;

