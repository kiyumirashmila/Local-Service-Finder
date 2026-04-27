import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { fetchMyBookings, fetchPublicCatalogOptions, respondBookingComplaint, fetchGradingConfig } from '../services/api';
import { ensureCatalogDefaults, getCatalog } from '../utils/catalogStore';

const normalize = (v) => String(v || '').trim();

const sriLankaDistricts = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Monaragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Trincomalee',
  'Vavuniya',
];

// Maps a human category label (e.g. "Plumbing") into the backend's legacy serviceCategory values.
const toLegacyCategory = (rawCategory) => {
  const normalized = normalize(rawCategory).toLowerCase();
  if (normalized.includes('plumb')) return 'plumber';
  if (normalized.includes('elect')) return 'electrician';
  if (normalized.includes('clean')) return 'cleaner';
  if (normalized.includes('carpen')) return 'carpenter';
  return 'other';
};

const dedupe = (items) => {
  const seen = new Set();
  const result = [];
  (items || []).forEach((item) => {
    const cleaned = normalize(item);
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(cleaned);
  });
  return result;
};

const isWithinRecentDays = (dateIso, days) => {
  if (!dateIso) return false;
  const t = new Date(dateIso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < days * 86400000;
};

const SupplierProfilePage = ({ onBack, onViewFeedbackSummary }) => {
  const { user, isAuthenticated, updateSupplierProfileReal, deleteAccountReal, changePasswordReal } = useContext(AuthContext);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [profileTab, setProfileTab] = useState(() => {
    // Check if URL contains #pricelist hint (e.g. #profile#pricelist)
    const h = String(window.location.hash || '').toLowerCase();
    return h.includes('pricelist') ? 'pricelist' : 'profile';
  });
  const [priceListSaving, setPriceListSaving] = useState(false);
  const [priceListDraft, setPriceListDraft] = useState(() => ({}));

  const [catalogLoading, setCatalogLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [servicesByCategory, setServicesByCategory] = useState({});
  const [complaintsOpen, setComplaintsOpen] = useState(false);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintsError, setComplaintsError] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [reviewNotifications, setReviewNotifications] = useState([]);
  const [respondingBookingId, setRespondingBookingId] = useState('');
  const [responseDrafts, setResponseDrafts] = useState({});
  const [gradingConfig, setGradingConfig] = useState(null);
  const [marketRatesByKey, setMarketRatesByKey] = useState({});
  const [editingRateService, setEditingRateService] = useState('');

  useEffect(() => {
    fetchGradingConfig()
      .then(res => setGradingConfig(res.data))
      .catch(() => {});
  }, []);

  const getServiceRateBounds = (svcName) => {
    if (!svcName) return { min: 0, max: 0 };

    // Use user's actual persisted category for lookups (not the edit-form draft state
    // which may still be 'other' if the user hasn't entered edit mode).
    const userCat = user?.category || user?.serviceCategory || '';
    const userCatOther = user?.serviceCategoryOther || '';
    const resolvedCategory = (userCat === 'other' || !userCat) ? userCatOther : userCat;

    // Fall back to edit-form category if available and user category is missing
    const effectiveCategory = resolvedCategory || (category === 'other' ? categoryOther : category);
    const rateLookupCategoryNorm = normalize(effectiveCategory).toLowerCase();
    const svcNorm = normalize(svcName).toLowerCase();
    const k = `${rateLookupCategoryNorm}|||${svcNorm}`;
    
    let minMarketRate = 0;
    let maxMarketRate = 2000;

    if (marketRatesByKey[k] && Number.isFinite(marketRatesByKey[k].maxRatePerHour)) {
       maxMarketRate = marketRatesByKey[k].maxRatePerHour;
       if (Number.isFinite(marketRatesByKey[k].minRatePerHour)) {
         minMarketRate = marketRatesByKey[k].minRatePerHour;
       }
    } else {
       // Fallback: search all services in the same category
       const rows = Object.entries(marketRatesByKey)
         .filter(([key]) => key.startsWith(`${rateLookupCategoryNorm}|||`));
       const maxRates = rows.map(([, v]) => v.maxRatePerHour).filter(Number.isFinite);
       const minRates = rows.map(([, v]) => v.minRatePerHour).filter(Number.isFinite);
       if (maxRates.length > 0) maxMarketRate = Math.max(...maxRates);
       if (minRates.length > 0) minMarketRate = Math.min(...minRates);
    }
    
    const grade = user?.supplierGrading;
    const gradeMinPct = grade && gradingConfig?.[grade] ? gradingConfig[grade].priceRangeMin ?? 0 : 0;
    const gradeMaxPct = grade && gradingConfig?.[grade] ? gradingConfig[grade].priceRangeMax ?? 100 : 100;
    
    // Supplier's allowed min = at least the admin's minRatePerHour, but also constrained by grade %
    const gradedMin = Math.round(maxMarketRate * (gradeMinPct / 100));
    const gradedMax = Math.round(maxMarketRate * (gradeMaxPct / 100));

    return {
       min: Math.max(minMarketRate, gradedMin),
       max: Math.max(gradedMax, minMarketRate) // ensure max >= min
    };
  };

  const [category, setCategory] = useState('other'); // either a catalog label (e.g. "Plumbing") or "other"
  const [categoryOther, setCategoryOther] = useState('');
  const [selectedServices, setSelectedServices] = useState([]); // subset that belongs to predefined serviceOptions
  const [customServiceInput, setCustomServiceInput] = useState('');
  const [customServices, setCustomServices] = useState([]); // free text services

  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const initial = useMemo(
    () => ({
      fullName: user?.fullName || user?.name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      district: user?.district || '',
      yearsOfExperience: String(user?.yearsOfExperience ?? 0),
      monthsOfExperience: String(user?.monthsOfExperience ?? 0),
      nic: user?.nic || '',
      bio: user?.bio || '',
      servicesRates: user?.servicesRates || {}
    }),
    [user]
  );
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState({});

  useEffect(() => setDraft(initial), [initial]);

  const didInitFromUserRef = useRef(false);

  // Load catalog options used to populate "Category" + "Services".
  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      try {
        setCatalogLoading(true);
        const res = await fetchPublicCatalogOptions();
        const cats = res.data?.categories || [];
        const svcs = res.data?.servicesByCategory || {};
        if (cancelled) return;
        setCategories(cats);
        setServicesByCategory(svcs);
        if (res.data?.marketRatesByKey) {
          setMarketRatesByKey(res.data.marketRatesByKey);
        }
      } catch (_e) {
        // Offline/dev fallback.
        try {
          ensureCatalogDefaults();
          const local = getCatalog();
          if (cancelled) return;
          setCategories(local.categories || []);
          setServicesByCategory(local.servicesByCategory || {});
        } catch {
          if (cancelled) return;
          setCategories([]);
          setServicesByCategory({});
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    };
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const serviceOptions = useMemo(() => {
    if (category === 'other') return [];
    return dedupe(servicesByCategory?.[category] || []);
  }, [category, servicesByCategory]);

  const allSelectedServices = useMemo(() => dedupe([...selectedServices, ...customServices]), [selectedServices, customServices]);
  const resolvedCategory = useMemo(() => (category === 'other' ? normalize(categoryOther) : normalize(category)), [category, categoryOther]);
  const legacyServiceCategory = useMemo(() => toLegacyCategory(resolvedCategory), [resolvedCategory]);
  const serviceCategoryOther = legacyServiceCategory === 'other' ? resolvedCategory : '';

  // Split services into "predefined" vs "custom" when category changes,
  // so we can edit without losing previously chosen services.
  useEffect(() => {
    if (editingRateService && !allSelectedServices.includes(editingRateService)) {
      setEditingRateService('');
    }
  }, [allSelectedServices, editingRateService]);

  useEffect(() => {
    const all = allSelectedServices;
    if (category === 'other') {
      setSelectedServices([]);
      setCustomServices(all);
      return;
    }
    const allSet = new Set(all.map((s) => normalize(s).toLowerCase()));
    const optionsSet = new Set(serviceOptions.map((s) => normalize(s).toLowerCase()));
    // Canonicalize selected service names to match the checkbox list casing.
    setSelectedServices(serviceOptions.filter((svc) => allSet.has(normalize(svc).toLowerCase())));
    setCustomServices(all.filter((s) => !optionsSet.has(normalize(s).toLowerCase())));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, serviceOptions]);

  function validateField(name, value) {
    if (value === undefined) value = '';
    const valString = String(value);
    switch (name) {
      case 'fullName':
        if (!valString) return 'Full Name is required';
        if (valString.length < 3) return 'Minimum 3 chars';
        if (!/^[A-Za-z\s]+$/.test(valString)) return 'Only letters and spaces';
        return '';
      case 'phone':
        if (!valString) return 'Phone is required';
        if (!/^07\d{8}$/.test(valString)) return 'Valid SL number (07x, 10 digits)';
        return '';
      case 'address':
        if (!valString || valString.length < 10) return 'Min 10 characters required';
        return '';
      case 'city':
        if (!valString) return 'City is required';
        if (!/^[A-Za-z\s]+$/.test(valString)) return 'Only letters allowed';
        return '';
      case 'district':
        if (!valString) return 'District is required';
        if (!sriLankaDistricts.some((d) => d.toLowerCase() === valString.trim().toLowerCase())) return 'Select a valid SL district';
        return '';
      case 'nic':
        if (!valString) return 'NIC is required';
        if (!/^([0-9]{9}[vVxX]|[0-9]{12})$/.test(valString)) return 'Invalid NIC format';
        return '';
      case 'yearsOfExperience':
        if (valString === '') return 'Required';
        if (Number(valString) < 0 || Number(valString) > 50) return '0 to 50';
        return '';
      case 'monthsOfExperience':
        if (valString === '') return 'Required';
        if (Number(valString) < 0 || Number(valString) > 11) return '0 to 11';
        return '';
      case 'bio':
        if (!valString) return 'Required';
        if (valString.length < 20) return 'Min 20 chars';
        if (valString.length > 300) return 'Max 300 chars';
        return '';
      case 'category':
        if (!valString) return 'Category is required';
        return '';
      case 'categoryOther':
        if (category === 'other' && !valString) return 'New category is required';
        return '';
      case 'services':
        if (!value || value.length === 0) return 'At least one service is required';
        return '';
      // servicesRates validation is now handled in the Price List tab only

      default:
        return '';
    }
  }

  function getValidationClass(name, value) {
    if (!touched[name]) return '';
    return validateField(name, value) ? 'invalid' : 'valid';
  }

  function handleBlur(name) {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  const resetCategoryAndServicesFromUser = () => {
    const resolvedFromUser = normalize(user?.category || user?.serviceCategoryOther || user?.serviceCategory || '');
    const catList = categories || [];
    let match = catList.find((c) => normalize(c).toLowerCase() === resolvedFromUser.toLowerCase());

    // If legacy values are stored (e.g. "plumber") try mapping back to catalog labels ("Plumbing").
    if (!match) {
      const legacy = user?.serviceCategory;
      const normalizedLegacy = normalize(legacy).toLowerCase();
      const keyword =
        normalizedLegacy === 'plumber'
          ? 'plumb'
          : normalizedLegacy === 'electrician'
            ? 'elect'
            : normalizedLegacy === 'cleaner'
              ? 'clean'
              : normalizedLegacy === 'carpenter'
                ? 'carpen'
                : '';

      if (keyword) {
        match = catList.find((c) => normalize(c).toLowerCase().includes(keyword));
      }
    }

    const nextCategory = match ? match : 'other';
    const nextCategoryOther = match ? '' : resolvedFromUser;

    const userSvcs = Array.isArray(user?.services) ? user.services : [];
    if (match) {
      const options = dedupe(servicesByCategory?.[match] || []);
      const userSvcsSet = new Set(userSvcs.map((s) => normalize(s).toLowerCase()));
      const optionsSet = new Set(options.map((s) => normalize(s).toLowerCase()));
      // Canonicalize selected service names to match the checkbox list casing.
      setSelectedServices(options.filter((svc) => userSvcsSet.has(normalize(svc).toLowerCase())));
      setCustomServices(userSvcs.filter((s) => !optionsSet.has(normalize(s).toLowerCase())));
    } else {
      setSelectedServices([]);
      setCustomServices(userSvcs);
    }

    setCategory(nextCategory);
    setCategoryOther(nextCategoryOther);
  };

  useEffect(() => {
    if (!user) return;
    if (catalogLoading) return;
    if (didInitFromUserRef.current) return;
    resetCategoryAndServicesFromUser();
    didInitFromUserRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogLoading, user]);

  useEffect(() => {
    if (!editMode) return;
    // Ensure edit session starts from the latest server state.
    resetCategoryAndServicesFromUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  useEffect(() => {
    if (!profilePictureFile) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(profilePictureFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePictureFile]);

  const status = user?.supplierApprovalStatus || 'pending';
  const grading = user?.supplierGrading || '-';
  const averageRating = Number(user?.averageRating || 0);
  const xp = Number(user?.xp || 0);
  const tierLevel = user?.tierLevel || 'Bronze';
  const displayName = user?.fullName || user?.name || 'Supplier';
  const nicNumber = user?.nic || '-';
  const expYears = user?.yearsOfExperience ?? 0;
  const expMonths = user?.monthsOfExperience ?? 0;
  const displayAvatar = previewUrl || user?.avatar || user?.avatarUrl || '';

  const notificationBadgeCount = useMemo(() => {
    const pendingComplaints = (complaints || []).filter((c) => c.status !== 'resolved').length;
    const recentReviews = (reviewNotifications || []).filter((r) => isWithinRecentDays(r.createdAt, 30)).length;
    return pendingComplaints + recentReviews;
  }, [complaints, reviewNotifications]);

  const loadComplaints = async () => {
    setComplaintsError('');
    setComplaintsLoading(true);
    try {
      const res = await fetchMyBookings(); // supplier: returns supplier bookings
      const bookings = Array.isArray(res.data?.bookings) ? res.data.bookings : [];
      const rows = bookings
        .filter((b) => b?.complaint?.submittedAt && b?.complaint?.supplierNotifiedAt)
        .map((b) => ({
          bookingId: b.id,
          category: b.complaint.category || '',
          description: b.complaint.description || '',
          evidenceUrl: b.complaint.evidenceUrl || '',
          submittedAt: b.complaint.submittedAt || null,
          supplierNotifiedAt: b.complaint.supplierNotifiedAt || null,
          status: b.complaint.status || 'pending',
          customerName: b.customer?.fullName || 'Customer',
          supplierResponse: b.complaint.supplierResponse || '',
          supplierRespondedAt: b.complaint.supplierRespondedAt || null,
          adminDecision: b.complaint.adminDecision || 'none',
          adminDecidedAt: b.complaint.adminDecidedAt || null,
        }));
      setComplaints(rows);

      const revs = bookings
        .filter((b) => b.status === 'completed' && b.review && Number(b.review.rating) >= 1)
        .map((b) => ({
          bookingId: b.id,
          customerName: b.customer?.fullName || 'Customer',
          rating: Number(b.review.rating),
          feedback: b.review.feedback || '',
          createdAt: b.review.createdAt || b.review.updatedAt || null,
          requestedDate: b.requestedDate || '',
        }))
        .sort((a, b) => {
          const ta = new Date(a.createdAt || 0).getTime();
          const tb = new Date(b.createdAt || 0).getTime();
          return tb - ta;
        });
      setReviewNotifications(revs);
    } catch (e) {
      setComplaintsError(e?.response?.data?.message || 'Failed to load notifications.');
      setComplaints([]);
      setReviewNotifications([]);
    } finally {
      setComplaintsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'supplier') return;
    loadComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role]);

  const wantsPasswordChange = Boolean(
    passwordDraft.currentPassword || passwordDraft.newPassword || passwordDraft.confirmNewPassword
  );

  const handleChangePassword = async () => {
    if (!wantsPasswordChange) return;

    if (!passwordDraft.currentPassword || !passwordDraft.newPassword || !passwordDraft.confirmNewPassword) {
      setError('To change password, fill current, new and confirm password fields.');
      return;
    }
    if (passwordDraft.newPassword !== passwordDraft.confirmNewPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (passwordDraft.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    await changePasswordReal({
      currentPassword: passwordDraft.currentPassword,
      newPassword: passwordDraft.newPassword,
      confirmNewPassword: passwordDraft.confirmNewPassword
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Check all validations securely
    setTouched({
        fullName: true, phone: true, address: true, city: true, district: true,
        nic: true, bio: true, yearsOfExperience: true, monthsOfExperience: true,
        category: true, categoryOther: true, services: true
    });
    
    const errors = [
        validateField('fullName', draft.fullName), validateField('phone', draft.phone), validateField('address', draft.address),
        validateField('city', draft.city), validateField('district', draft.district), validateField('nic', draft.nic), validateField('bio', draft.bio),
        validateField('yearsOfExperience', draft.yearsOfExperience), validateField('monthsOfExperience', draft.monthsOfExperience),
        validateField('category', category), validateField('categoryOther', categoryOther), validateField('services', allSelectedServices)
    ];
    if (errors.some(err => err !== '')) {
       setError('Please resolve all validation errors before saving.');
       return;
    }

    if (!resolvedCategory) {
      setError('Please select a service category.');
      return;
    }

    // Backend requirement: serviceCategoryOther is required when serviceCategory is "other".
    if (legacyServiceCategory === 'other' && !serviceCategoryOther) {
      setError('Please provide "Other service type".');
      return;
    }

    const years = Number(draft.yearsOfExperience);
    const months = Number(draft.monthsOfExperience);
    if (Number.isNaN(years) || years < 0) {
      setError('Years of experience must be 0 or higher.');
      return;
    }
    if (Number.isNaN(months) || months < 0 || months > 11) {
      setError('Months of experience must be between 0 and 11.');
      return;
    }
    if (!draft.nic || !/^([0-9]{9}[vVxX]|[0-9]{12})$/.test(draft.nic)) {
      setError('Invalid NIC format (9 digits + V/X or 12 digits).');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('fullName', draft.fullName);
      formData.append('phone', draft.phone);
      formData.append('address', draft.address);
      formData.append('city', draft.city);
      formData.append('district', draft.district);
      // "category" is the human-readable label used by the catalog; "serviceCategory" is the legacy normalized value.
      formData.append('category', resolvedCategory);
      formData.append('serviceCategory', legacyServiceCategory);
      formData.append('serviceCategoryOther', serviceCategoryOther || '');
      formData.append('services', JSON.stringify(allSelectedServices));
      formData.append('serviceOther', customServices.join(', '));
      formData.append('nic', draft.nic);
      formData.append('yearsOfExperience', String(years));
      formData.append('monthsOfExperience', String(months));
      formData.append('bio', draft.bio);
      formData.append('servicesRates', JSON.stringify(draft.servicesRates));
      if (profilePictureFile) formData.append('profilePicture', profilePictureFile);

      await updateSupplierProfileReal(formData);

      if (wantsPasswordChange) {
        await handleChangePassword();
      }

      setEditMode(false);
      setProfilePictureFile(null);
      setPasswordDraft({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setSuccessMessage(wantsPasswordChange ? 'Supplier profile and password updated successfully.' : 'Supplier profile updated successfully.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update supplier profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return;
    try {
      setDeleting(true);
      await deleteAccountReal();
      window.location.hash = 'home';
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modern-supplier-profile">
      <style>{`
        /* Base variables */
        .modern-supplier-profile {
          --primary: #1e3a8a;
          --primary-dark: #1e40af;
          --primary-light: #bfdbfe;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-300: #d1d5db;
          --gray-400: #9ca3af;
          --gray-500: #6b7280;
          --gray-600: #4b5563;
          --gray-700: #374151;
          --gray-800: #1f2937;
          --gray-900: #111827;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          --radius-sm: 0.375rem;
          --radius-md: 0.5rem;
          --radius-lg: 0.75rem;
          --radius-xl: 1rem;
          --radius-2xl: 1.5rem;
          --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .modern-supplier-profile {
          min-height: calc(100vh - 80px);
          background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
          padding: 2rem 1rem;
          font-family: var(--font-sans);
          color: var(--gray-900);
        }

        .profile-container {
          max-width: 1280px;
          margin: 0 auto;
        }

        /* Main Card */
        .profile-card {
          background: white;
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        /* Header */
        .profile-header {
          background: linear-gradient(135deg, #fff 0%, #eff6ff 100%);
          padding: 2rem;
          border-bottom: 1px solid var(--gray-200);
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
        }

        .profile-info {
          display: flex;
          gap: 1.5rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .avatar-wrapper {
          width: 100px;
          height: 100px;
          border-radius: 32px;
          background: linear-gradient(135deg, var(--primary-light), #dbeafe);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-md);
          overflow: hidden;
        }

        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-fallback {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--primary-dark);
        }

        .name-section h2 {
          font-size: 1.875rem;
          font-weight: 800;
          margin: 0;
          color: var(--gray-900);
          letter-spacing: -0.02em;
        }

        .email {
          color: var(--gray-500);
          font-weight: 500;
          margin-top: 0.25rem;
        }

        .badge-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          background: white;
          border: 1px solid var(--gray-200);
          color: var(--gray-700);
          box-shadow: var(--shadow-sm);
        }

        .badge i {
          font-size: 0.75rem;
        }

        .badge.pending {
          border-color: #fed7aa;
          background: #fff7ed;
          color: #9a3412;
        }

        .badge.approved {
          border-color: #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }

        .badge.rejected {
          border-color: #fecaca;
          background: #fef2f2;
          color: #991b1b;
        }

        .badge.rating {
          background: #fef9c3;
          border-color: #fde047;
          color: #854d0e;
        }

        .badge.xp {
          background: #e0f2fe;
          border-color: #bae6fd;
          color: #0369a1;
        }

        .badge.tier {
          background: #f3e8ff;
          border-color: #d8b4fe;
          color: #6b21a5;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .icon-btn {
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: 999px;
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: var(--gray-600);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .icon-btn:hover {
          background: var(--gray-50);
          border-color: var(--gray-300);
          transform: translateY(-1px);
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.875rem;
          line-height: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
          background: white;
          border-color: var(--gray-300);
          color: var(--gray-700);
        }

        .btn i {
          font-size: 1rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          color: white;
          border: none;
          box-shadow: var(--shadow-sm);
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #1e40af, #000000);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .btn-outline {
          border-color: var(--gray-300);
          background: white;
        }

        .btn-outline:hover {
          background: var(--gray-50);
          border-color: var(--gray-400);
          transform: translateY(-1px);
        }

        .btn-danger {
          background: #ef4444;
          color: white;
          border: none;
        }

        .btn-danger:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Body */
        .profile-body {
          padding: 2rem;
        }

        /* Messages */
        .message {
          padding: 1rem;
          border-radius: var(--radius-lg);
          margin-bottom: 1.5rem;
          font-weight: 500;
        }

        .message-error {
          background: #fee2e2;
          border-left: 4px solid #ef4444;
          color: #991b1b;
        }

        .message-success {
          background: #ecfdf5;
          border-left: 4px solid #10b981;
          color: #065f46;
        }

        /* Panel */
        .panel {
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-xl);
          padding: 1.5rem;
          box-shadow: var(--shadow-sm);
        }

        .panel-title {
          font-size: 1.25rem;
          font-weight: 800;
          margin: 0 0 1.25rem;
          color: var(--gray-900);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Grids */
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }

        .detail-row {
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          padding: 0.875rem 1rem;
          border: 1px solid var(--gray-200);
        }

        .detail-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--gray-500);
          letter-spacing: 0.05em;
        }

        .detail-value {
          font-weight: 600;
          color: var(--gray-800);
          margin-top: 0.375rem;
          word-break: break-word;
        }

        /* Form */
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-full {
          grid-column: span 2;
        }

        .field label {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--gray-700);
        }

        .field input,
        .field select,
        .field textarea {
          padding: 0.75rem 1rem;
          border: 1.5px solid var(--gray-200);
          border-radius: var(--radius-lg);
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          background: white;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.2);
        }

        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .service-check {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .service-check:hover {
          border-color: var(--primary-light);
          background: #eff6ff;
        }

        .service-check input {
          width: 1rem;
          height: 1rem;
          margin: 0;
        }

        .selected-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .chip {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #eff6ff;
          border: 1px solid var(--primary-light);
          border-radius: 999px;
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary-dark);
        }

        .chip-remove {
          background: none;
          border: none;
          font-weight: 900;
          cursor: pointer;
          color: var(--primary-dark);
          font-size: 1rem;
          line-height: 1;
          padding: 0;
        }

        .add-custom {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 1rem;
        }

        .btn-ghost {
          background: transparent;
          border: 1px solid var(--gray-300);
          color: var(--gray-600);
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          flex-wrap: wrap;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: var(--radius-2xl);
          max-width: 720px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-xl);
        }

        .modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--gray-200);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-weight: 800;
          font-size: 1.25rem;
        }

        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .complaint-item {
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          padding: 1rem;
          margin-bottom: 1rem;
          background: var(--gray-50);
        }

        .complaint-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .complaint-title {
          font-weight: 800;
          color: var(--gray-900);
        }

        .complaint-status {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          background: #fef3c7;
          color: #92400e;
        }

        .complaint-status.resolved {
          background: #dcfce7;
          color: #166534;
        }

        .complaint-meta {
          font-size: 0.75rem;
          color: var(--gray-500);
          font-weight: 500;
          margin-bottom: 0.75rem;
        }

        .complaint-description {
          background: white;
          border-radius: var(--radius-md);
          padding: 0.75rem;
          border: 1px solid var(--gray-200);
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }

        .admin-decision-banner {
          margin-top: 0.75rem;
          padding: 0.65rem 0.85rem;
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          font-weight: 700;
          border: 1px solid transparent;
        }

        .admin-decision-banner.warning {
          background: #fff7ed;
          border-color: #fed7aa;
          color: #9a3412;
        }

        .admin-decision-banner.resolved {
          background: #f0fdf4;
          border-color: #bbf7d0;
          color: #166534;
        }

        .admin-decision-banner.neutral {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #475569;
        }

        .notif-section-title {
          font-size: 0.9375rem;
          font-weight: 800;
          color: var(--gray-800);
          margin: 1.25rem 0 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .notif-section-title:first-of-type {
          margin-top: 0;
        }

        .review-notif-item {
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
          padding: 0.85rem 1rem;
          margin-bottom: 0.75rem;
          background: #fffbeb;
        }

        .review-notif-stars {
          color: #f59e0b;
          letter-spacing: 2px;
          font-size: 1rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .profile-header {
            flex-direction: column;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
          .field-full {
            grid-column: span 1;
          }
          .details-grid {
            grid-template-columns: 1fr;
          }
        }
        .field.with-error { position: relative; padding-top: 18px; }
        .Validation-msg {
          position: absolute; top: 0; right: 0; font-size: 11px; font-weight: 900;
          padding: 2px 6px; border-radius: 6px; z-index: 2;
        }
        .Validation-msg.error { background: #fee2e2; color: #ef4444; }
        .Validation-msg.success { background: #dcfce7; color: #22c55e; }
        .field input.valid, .field textarea.valid, .field select.valid { border: 2px solid #22c55e !important; }
        .field input.invalid, .field textarea.invalid, .field select.invalid { border: 2px solid #ef4444 !important; }
        .services-box { padding: 4px; border-radius: 12px; }
        .services-box.invalid { border: 2px solid #ef4444; }
        .services-box.valid { border: 2px solid #22c55e; }

        /* Tab Navigation */
        .profile-tabs {
          display: flex;
          gap: 0;
          border-bottom: 2px solid var(--gray-200);
          margin-bottom: 1.5rem;
        }
        .profile-tab-btn {
          padding: 0.875rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          font-weight: 800;
          font-size: 0.9375rem;
          color: var(--gray-500);
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font-sans);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: -2px;
        }
        .profile-tab-btn:hover {
          color: var(--primary-dark);
          background: rgba(30,58,138,0.06);
        }
        .profile-tab-btn.active {
          color: var(--primary-dark);
          border-bottom-color: var(--primary);
        }
        .profile-tab-btn i { font-size: 0.875rem; }

        /* Price List Tab */
        .pricelist-grid {
          display: grid;
          gap: 1rem;
        }
        .pricelist-card {
          background: var(--gray-50);
          border: 1.5px solid var(--gray-200);
          border-radius: var(--radius-xl);
          padding: 1.25rem;
          transition: all 0.2s;
        }
        .pricelist-card:hover {
          border-color: var(--primary-light);
          box-shadow: 0 4px 15px rgba(30,58,138,0.08);
        }
        .pricelist-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .pricelist-service-name {
          font-weight: 800;
          font-size: 1rem;
          color: var(--gray-900);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .pricelist-service-name i {
          color: var(--primary);
          font-size: 0.875rem;
        }
        .pricelist-rate-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.3125rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 800;
        }
        .pricelist-rate-badge.set {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        .pricelist-rate-badge.unset {
          background: #dbeafe;
          border: 1px solid #bfdbfe;
          color: #1e3a8a;
        }
        .pricelist-bounds {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--gray-500);
          margin-bottom: 0.625rem;
        }
        .pricelist-bounds strong {
          color: var(--gray-700);
        }
        .pricelist-input-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .pricelist-input-row input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 1.5px solid var(--gray-200);
          border-radius: var(--radius-lg);
          font-size: 0.9375rem;
          font-weight: 700;
          font-family: var(--font-sans);
          transition: all 0.2s;
          background: white;
          max-width: 220px;
        }
        .pricelist-input-row input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(30,58,138,0.15);
        }
        .pricelist-input-row input.valid {
          border-color: #22c55e;
        }
        .pricelist-input-row input.invalid {
          border-color: #ef4444;
        }
        .pricelist-currency {
          font-weight: 800;
          font-size: 0.875rem;
          color: var(--gray-600);
        }
        .pricelist-unit {
          font-weight: 600;
          font-size: 0.8125rem;
          color: var(--gray-400);
        }
        .pricelist-error {
          font-size: 0.75rem;
          font-weight: 700;
          color: #ef4444;
          margin-top: 0.375rem;
        }
        .pricelist-empty {
          text-align: center;
          padding: 2.5rem 1rem;
          color: var(--gray-400);
        }
        .pricelist-empty i {
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
          display: block;
        }
      `}</style>

      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-info">
              <div className="avatar-wrapper">
                {displayAvatar ? (
                  <img className="avatar-img" src={displayAvatar} alt="avatar" />
                ) : (
                  <div className="avatar-fallback">{getInitials(displayName)}</div>
                )}
              </div>
              <div className="name-section">
                <h2>Supplier Profile</h2>
                <div className="email">{user?.email || ''}</div>
                <div className="badge-group">
                  <span className={`badge ${status}`}>
                    <i className="fas fa-circle" style={{ fontSize: '0.5rem' }} /> {status}
                  </span>
                  <span className="badge"><i className="fas fa-chart-line" /> Grade: {grading}</span>
                  <span className="badge rating"><i className="fas fa-star" /> {averageRating.toFixed(1)}</span>
                  <span className="badge xp"><i className="fas fa-bolt" /> XP: {xp}</span>
                  <span className="badge tier"><i className="fas fa-crown" /> {tierLevel}</span>
                </div>
              </div>
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="icon-btn"
                aria-label="Notifications: reviews, complaints, and manager decisions"
                onClick={() => setComplaintsOpen(true)}
              >
                <i className="fas fa-bell" />
                {notificationBadgeCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      minWidth: 20,
                      height: 20,
                      borderRadius: 999,
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 6px',
                    }}
                  >
                    {notificationBadgeCount > 99 ? '99+' : notificationBadgeCount}
                  </span>
                )}
              </button>
              <button type="button" className="btn btn-outline" onClick={onBack}>
                <i className="fas fa-arrow-left" /> Back
              </button>
              {!editMode && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setEditMode(true)}
                  disabled={catalogLoading}
                >
                  {catalogLoading ? <i className="fas fa-spinner fa-pulse" /> : <i className="fas fa-pen" />}
                  {catalogLoading ? 'Loading…' : 'Edit Profile'}
                </button>
              )}
            </div>
          </div>

          <div className="profile-body">
            {/* Tab Navigation */}
            <div className="profile-tabs">
              <button
                type="button"
                className={`profile-tab-btn ${profileTab === 'profile' ? 'active' : ''}`}
                onClick={() => setProfileTab('profile')}
              >
                <i className="fas fa-user" /> Profile
              </button>
              <button
                type="button"
                className={`profile-tab-btn ${profileTab === 'pricelist' ? 'active' : ''}`}
                onClick={() => {
                  setProfileTab('pricelist');
                  // Initialize price list draft from user's rates
                  setPriceListDraft({ ...(user?.servicesRates || {}) });
                }}
              >
                <i className="fas fa-tags" /> Price List
              </button>
            </div>
            {error && (
              <div className="message message-error">
                <i className="fas fa-exclamation-circle" /> {error}
              </div>
            )}
            {successMessage && (
              <div className="message message-success">
                <i className="fas fa-check-circle" /> {successMessage}
              </div>
            )}

            {profileTab === 'pricelist' ? null : !isAuthenticated ? (
              <div className="panel">Please sign in to continue.</div>
            ) : !editMode ? (
              <div className="panel">
                <div className="panel-title">
                  <i className="fas fa-user-circle" /> Overview
                </div>
                <div className="details-grid">
                  <div className="detail-row">
                    <div className="detail-label">Full name</div>
                    <div className="detail-value">{displayName}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Phone</div>
                    <div className="detail-value">{user?.phone || '-'}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Address</div>
                    <div className="detail-value">{user?.address || '-'}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">City</div>
                    <div className="detail-value">{user?.city || '-'}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">District</div>
                    <div className="detail-value">{user?.district || '-'}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">NIC Number</div>
                    <div className="detail-value">{user?.nic || '-'}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Category</div>
                    <div className="detail-value">
                      {user?.category ||
                        (user?.serviceCategory === 'other'
                          ? `Other (${user?.serviceCategoryOther || '-'})`
                          : user?.serviceCategory || '-')}
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Services</div>
                    <div className="detail-value">
                      {Array.isArray(user?.services) && user?.services.length
                        ? user.services.join(', ')
                        : user?.serviceOther || '-'}
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Experience</div>
                    <div className="detail-value">{`${user?.yearsOfExperience ?? 0} years`}</div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-label">Bio</div>
                    <div className="detail-value">{user?.bio || '-'}</div>
                  </div>
                  <div className="detail-row" style={{ alignItems: 'flex-start' }}>
                    <div className="detail-label" style={{ paddingTop: '4px' }}>Certificates</div>
                    <div className="detail-value" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {user?.experienceCertificates && user.experienceCertificates.length > 0 ? (
                        user.experienceCertificates.map((certUrl, idx) => (
                          <div key={idx} style={{ 
                              width: '4rem', height: '4rem', borderRadius: '0.5rem', 
                              overflow: 'hidden', border: '1px solid var(--gray-200)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa'
                           }}>
                            <a href={certUrl} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%' }}>
                              <img src={certUrl} alt={`Certificate ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </a>
                          </div>
                        ))
                      ) : user?.experienceCertificateUrl ? (
                        <div style={{ width: '4rem', height: '4rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
                          <a href={user.experienceCertificateUrl} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%' }}>
                            <img src={user.experienceCertificateUrl} alt="Certificate" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </a>
                        </div>
                      ) : (
                        '-'
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={onViewFeedbackSummary}>
                    <i className="fas fa-chart-bar" /> View Feedback Summary
                  </button>
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                    {deleting ? <i className="fas fa-spinner fa-pulse" /> : <i className="fas fa-trash-alt" />}
                    {deleting ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </div>
            ) : (
              <form className="panel" onSubmit={handleSave}>
                <div className="panel-title">
                  <i className="fas fa-edit" /> Edit supplier details
                </div>
                <div className="form-grid">
                  <div className="field with-error">
                    <label>Full name *</label>
                    {touched.fullName && <div className={`Validation-msg ${validateField("fullName", draft.fullName) ? "error" : "success"}`}>{validateField("fullName", draft.fullName) || "Looks good!"}</div>}
                    <input className={getValidationClass("fullName", draft.fullName)} value={draft.fullName} onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))} onBlur={() => handleBlur("fullName")} required />
                  </div>
                  <div className="field with-error">
                    <label>Phone *</label>
                    {touched.phone && <div className={`Validation-msg ${validateField("phone", draft.phone) ? "error" : "success"}`}>{validateField("phone", draft.phone) || "Looks good!"}</div>}
                    <input className={getValidationClass("phone", draft.phone)} value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} onBlur={() => handleBlur("phone")} required />
                  </div>
                  <div className="field with-error">
                    <label>Address *</label>
                    {touched.address && <div className={`Validation-msg ${validateField("address", draft.address) ? "error" : "success"}`}>{validateField("address", draft.address) || "Looks good!"}</div>}
                    <input className={getValidationClass("address", draft.address)} value={draft.address} onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))} onBlur={() => handleBlur("address")} required />
                  </div>
                  <div className="field with-error">
                    <label>City *</label>
                    {touched.city && <div className={`Validation-msg ${validateField("city", draft.city) ? "error" : "success"}`}>{validateField("city", draft.city) || "Looks good!"}</div>}
                    <input className={getValidationClass("city", draft.city)} value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} onBlur={() => handleBlur("city")} required />
                  </div>
                  <div className="field with-error">
                    <label>District *</label>
                    {touched.district && <div className={`Validation-msg ${validateField("district", draft.district) ? "error" : "success"}`}>{validateField("district", draft.district) || "Looks good!"}</div>}
                    <input
                      className={getValidationClass("district", draft.district)}
                      value={draft.district}
                      onChange={(e) => setDraft((d) => ({ ...d, district: e.target.value }))}
                      onBlur={() => handleBlur("district")}
                      list="sl-districts"
                      placeholder="Select your district"
                      required
                    />
                    <datalist id="sl-districts">
                      {sriLankaDistricts.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>
                  <div className="field with-error">
                    <label>Category *</label>
                    {touched.category && <div className={`Validation-msg ${validateField("category", category) ? "error" : "success"}`}>{validateField("category", category) || "Looks good!"}</div>}
                    <select className={getValidationClass("category", category)} value={category} onChange={(e) => { setCategory(e.target.value); if(e.target.value !== "other") setTouched(p=>({...p, categoryOther:false}))}} onBlur={() => handleBlur("category")} disabled={catalogLoading}>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {category === 'other' && (
                    <div className="field field-full with-error">
                      <label>Other category *</label>
                      {touched.categoryOther && <div className={`Validation-msg ${validateField("categoryOther", categoryOther) ? "error" : "success"}`}>{validateField("categoryOther", categoryOther) || "Looks good!"}</div>}
                      <input className={getValidationClass("categoryOther", categoryOther)} value={categoryOther} onChange={(e) => setCategoryOther(e.target.value)} onBlur={() => handleBlur("categoryOther")} required placeholder="Type your category" />
                    </div>
                  )}
                  <div className="field field-full with-error">
                    <label>Services (select one or more)</label>
                    {touched.services && <div className={`Validation-msg ${validateField("services", allSelectedServices) ? "error" : "success"}`}>{validateField("services", allSelectedServices) || "Looks good!"}</div>}
                    {catalogLoading ? (
                      <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem', fontWeight: 500 }}>Loading services…</div>
                    ) : category !== 'other' && serviceOptions.length ? (
                      <div className={`services-grid services-box ${touched.services ? (validateField("services", allSelectedServices) ? "invalid" : "valid") : ""}`}>
                        {serviceOptions.map((svc) => (
                          <label key={svc} className="service-check">
                            <input
                              type="checkbox"
                              checked={selectedServices.includes(svc)}
                              onChange={() => { setTouched(p=>({...p, services: true})); setSelectedServices((prev) => prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc])}}
                            />
                            <span>{svc}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem', fontWeight: 500 }}>
                        No predefined services for this category. Please add your service below.
                      </div>
                    )}
                    {allSelectedServices.length > 0 && (
                      <div className="selected-chips">
                        {allSelectedServices.map((svc) => (
                          <span key={svc} className="chip">
                            {svc}
                            <button
                              type="button"
                              onClick={() => {
                                setTouched(p=>({...p, services: true})); 
                                setSelectedServices((prev) => prev.filter((x) => x !== svc));
                                setCustomServices((prev) => prev.filter((x) => x !== svc));
                              }}
                              className="chip-remove"
                              aria-label={`Remove ${svc}`}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="add-custom">
                      <input
                        value={customServiceInput}
                        onChange={(e) => setCustomServiceInput(e.target.value)}
                        placeholder="Add custom service (e.g., AC repair)"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                          setTouched(p=>({...p, services: true}));
                          const cleaned = normalize(customServiceInput);
                          if (!cleaned) return;
                          if (category !== 'other' && serviceOptions.length) {
                            const exists = serviceOptions.find((s) => normalize(s).toLowerCase() === cleaned.toLowerCase());
                            if (exists) {
                              setSelectedServices((prev) => (prev.includes(exists) ? prev : [...prev, exists]));
                              setCustomServices((prev) => prev.filter((x) => normalize(x).toLowerCase() !== cleaned.toLowerCase()));
                              setCustomServiceInput('');
                              return;
                            }
                          }
                          setCustomServices((prev) => dedupe([...prev, cleaned]));
                          setCustomServiceInput('');
                        }}
                      >
                        <i className="fas fa-plus" /> Add
                      </button>
                    </div>
                  </div>
                  <div className="field with-error">
                    <label>NIC Number *</label>
                    {touched.nic && <div className={`Validation-msg ${validateField("nic", draft.nic) ? "error" : "success"}`}>{validateField("nic", draft.nic) || "Looks good!"}</div>}
                    <input className={getValidationClass("nic", draft.nic)} type="text" value={draft.nic} onChange={(e) => setDraft((d) => ({ ...d, nic: e.target.value }))} onBlur={() => handleBlur("nic")} required />
                  </div>
                  <div className="field with-error">
                    <label>Experience *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        {touched.yearsOfExperience && <div className={`Validation-msg ${validateField("yearsOfExperience", draft.yearsOfExperience) ? "error" : "success"}`} style={{ top: "-18px" }}>{validateField("yearsOfExperience", draft.yearsOfExperience) || "Ok"}</div>}
                        <input className={getValidationClass("yearsOfExperience", draft.yearsOfExperience)} style={{ width: '100%' }} type="number" min="0" value={draft.yearsOfExperience} onChange={(e) => setDraft((d) => ({ ...d, yearsOfExperience: e.target.value }))} onBlur={() => handleBlur("yearsOfExperience")} placeholder="Years" required />
                      </div>
                      <div style={{ flex: 1, position: 'relative' }}>
                        {touched.monthsOfExperience && <div className={`Validation-msg ${validateField("monthsOfExperience", draft.monthsOfExperience) ? "error" : "success"}`} style={{ top: "-18px" }}>{validateField("monthsOfExperience", draft.monthsOfExperience) || "Ok"}</div>}
                        <input className={getValidationClass("monthsOfExperience", draft.monthsOfExperience)} style={{ width: '100%' }} type="number" min="0" max="11" value={draft.monthsOfExperience} onChange={(e) => setDraft((d) => ({ ...d, monthsOfExperience: e.target.value }))} onBlur={() => handleBlur("monthsOfExperience")} placeholder="Months" required />
                      </div>
                    </div>
                  </div>
                  <div className="field">
                    <label>Profile picture</label>
                    <input type="file" accept="image/*" onChange={(e) => setProfilePictureFile(e.target.files?.[0] || null)} />
                  </div>
                  {/* Hourly rate is now managed in the Price List tab */}

                  <div className="field field-full with-error">
                    <label>Bio *</label>
                    {touched.bio && <div className={`Validation-msg ${validateField("bio", draft.bio) ? "error" : "success"}`}>{validateField("bio", draft.bio) || "Looks good!"}</div>}
                    <textarea className={getValidationClass("bio", draft.bio)} value={draft.bio} onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} onBlur={() => handleBlur("bio")} rows={4} required />
                  </div>

                  <div className="field field-full">
                    <div style={{ fontWeight: 800, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>
                      <i className="fas fa-lock" /> Change password (optional)
                    </div>
                    <div className="form-grid" style={{ marginTop: 0 }}>
                      <div className="field">
                        <label>Current password</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showCurrentPassword ? "text" : "password"} value={passwordDraft.currentPassword} onChange={(e) => setPasswordDraft((p) => ({ ...p, currentPassword: e.target.value }))} placeholder="••••••••" style={{ width: '100%', paddingRight: '40px' }} />
                          <i className={`fas fa-eye${showCurrentPassword ? '-slash' : ''}`} onClick={() => setShowCurrentPassword((prev) => !prev)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--gray-400)' }} />
                        </div>
                      </div>
                      <div className="field">
                        <label>New password</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showNewPassword ? "text" : "password"} value={passwordDraft.newPassword} onChange={(e) => setPasswordDraft((p) => ({ ...p, newPassword: e.target.value }))} placeholder="Min. 6 characters" style={{ width: '100%', paddingRight: '40px' }} />
                          <i className={`fas fa-eye${showNewPassword ? '-slash' : ''}`} onClick={() => setShowNewPassword((prev) => !prev)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--gray-400)' }} />
                        </div>
                      </div>
                      <div className="field field-full">
                        <label>Confirm new password</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showConfirmNewPassword ? "text" : "password"} value={passwordDraft.confirmNewPassword} onChange={(e) => setPasswordDraft((p) => ({ ...p, confirmNewPassword: e.target.value }))} placeholder="Repeat new password" style={{ width: '100%', paddingRight: '40px' }} />
                          <i className={`fas fa-eye${showConfirmNewPassword ? '-slash' : ''}`} onClick={() => setShowConfirmNewPassword((prev) => !prev)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--gray-400)' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setDraft(initial);
                      setEditMode(false);
                      setProfilePictureFile(null);
                      setError('');
                      setSuccessMessage('');
                      setPasswordDraft({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
                      resetCategoryAndServicesFromUser();
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <i className="fas fa-spinner fa-pulse" /> : <i className="fas fa-save" />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Price List Tab */}
            {profileTab === 'pricelist' && (
              <div className="panel">
                <div className="panel-title">
                  <i className="fas fa-tags" /> My Price List
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: '1.25rem' }}>
                  Set your hourly rate for each service. Rates must be within the range defined by the Operational Manager.
                  {user?.supplierGrading && (
                    <span style={{ display: 'inline-block', marginLeft: '0.5rem', padding: '0.2rem 0.6rem', borderRadius: 999, background: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: '0.75rem' }}>
                      Grade {user.supplierGrading}
                    </span>
                  )}
                </div>

                {error && (
                  <div className="message message-error" style={{ marginBottom: '1rem' }}>
                    <i className="fas fa-exclamation-circle" /> {error}
                  </div>
                )}
                {successMessage && (
                  <div className="message message-success" style={{ marginBottom: '1rem' }}>
                    <i className="fas fa-check-circle" /> {successMessage}
                  </div>
                )}

                {catalogLoading ? (
                  <div className="pricelist-empty">
                    <i className="fas fa-spinner fa-pulse" />
                    <div style={{ fontWeight: 700 }}>Loading services...</div>
                  </div>
                ) : !Array.isArray(user?.services) || user.services.length === 0 ? (
                  <div className="pricelist-empty">
                    <i className="fas fa-box-open" />
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-600)' }}>No services selected</div>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Go to the Profile tab and select your services first.</div>
                  </div>
                ) : (
                  <div className="pricelist-grid">
                    {user.services.map(svcName => {
                      const bounds = getServiceRateBounds(svcName);
                      const currentVal = priceListDraft[svcName] ?? user?.servicesRates?.[svcName] ?? '';
                      const numVal = Number(currentVal);
                      const isSet = currentVal !== '' && currentVal !== undefined;
                      const isValid = isSet && !Number.isNaN(numVal) && numVal >= bounds.min && numVal <= bounds.max;
                      const showError = isSet && !isValid;

                      return (
                        <div key={svcName} className="pricelist-card">
                          <div className="pricelist-card-header">
                            <div className="pricelist-service-name">
                              <i className="fas fa-tools" />
                              {svcName}
                            </div>
                            <span className={`pricelist-rate-badge ${isSet && isValid ? 'set' : 'unset'}`}>
                              <i className={`fas ${isSet && isValid ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
                              {isSet && isValid ? `LKR ${numVal}/hr` : 'Not set'}
                            </span>
                          </div>
                          <div className="pricelist-bounds">
                            Allowed range: <strong>LKR {bounds.min}</strong> — <strong>LKR {bounds.max}</strong> per hour
                          </div>
                          <div className="pricelist-input-row">
                            <span className="pricelist-currency">LKR</span>
                            <input
                              type="number"
                              min={bounds.min}
                              max={bounds.max}
                              placeholder={`${bounds.min} — ${bounds.max}`}
                              value={currentVal}
                              className={isSet ? (isValid ? 'valid' : 'invalid') : ''}
                              onChange={(e) => {
                                setPriceListDraft(prev => ({ ...prev, [svcName]: e.target.value }));
                              }}
                            />
                            <span className="pricelist-unit">/ hour</span>
                          </div>
                          {showError && (
                            <div className="pricelist-error">
                              Rate must be between LKR {bounds.min} and LKR {bounds.max}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {Array.isArray(user?.services) && user.services.length > 0 && (
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={priceListSaving}
                      onClick={async () => {
                        setError('');
                        setSuccessMessage('');
                        // Validate all prices
                        const svcs = user?.services || [];
                        for (const svc of svcs) {
                          const val = priceListDraft[svc] ?? user?.servicesRates?.[svc] ?? '';
                          if (val === '' || val === undefined) {
                            setError(`Please set an hourly rate for "${svc}".`);
                            return;
                          }
                          const n = Number(val);
                          const b = getServiceRateBounds(svc);
                          if (Number.isNaN(n) || n < b.min || n > b.max) {
                            setError(`Rate for "${svc}" must be between LKR ${b.min} and LKR ${b.max}.`);
                            return;
                          }
                        }
                        try {
                          setPriceListSaving(true);
                          const formData = new FormData();
                          // Send all existing profile fields to avoid losing data
                          formData.append('fullName', user?.fullName || user?.name || '');
                          formData.append('phone', user?.phone || '');
                          formData.append('address', user?.address || '');
                          formData.append('city', user?.city || '');
                          formData.append('category', user?.category || '');
                          formData.append('serviceCategory', user?.serviceCategory || '');
                          formData.append('serviceCategoryOther', user?.serviceCategoryOther || '');
                          formData.append('services', JSON.stringify(user?.services || []));
                          formData.append('serviceOther', user?.serviceOther || '');
                          formData.append('nic', user?.nic || '');
                          formData.append('yearsOfExperience', String(user?.yearsOfExperience ?? 0));
                          formData.append('monthsOfExperience', String(user?.monthsOfExperience ?? 0));
                          formData.append('bio', user?.bio || '');
                          // Build merged rates
                          const mergedRates = { ...(user?.servicesRates || {}), ...priceListDraft };
                          // Convert string values to numbers
                          const cleanRates = {};
                          for (const [k, v] of Object.entries(mergedRates)) {
                            const n = Number(v);
                            if (Number.isFinite(n) && n > 0) cleanRates[k] = n;
                          }
                          formData.append('servicesRates', JSON.stringify(cleanRates));
                          await updateSupplierProfileReal(formData);
                          setSuccessMessage('Price list updated successfully!');
                        } catch (err) {
                          setError(err?.response?.data?.message || err?.message || 'Failed to save price list.');
                        } finally {
                          setPriceListSaving(false);
                        }
                      }}
                    >
                      {priceListSaving ? <i className="fas fa-spinner fa-pulse" /> : <i className="fas fa-save" />}
                      {priceListSaving ? 'Saving...' : 'Save Price List'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {complaintsOpen && (
        <div className="modal-overlay" onClick={() => setComplaintsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-bell" /> Notifications
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-outline" onClick={loadComplaints} disabled={complaintsLoading}>
                  {complaintsLoading ? <i className="fas fa-spinner fa-pulse" /> : <i className="fas fa-sync-alt" />}
                  Refresh
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setComplaintsOpen(false)}>
                  Close
                </button>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                Customer reviews on completed jobs, complaint notices, and ecosystem manager decisions.
              </div>
              {complaintsError && (
                <div className="message message-error" style={{ marginBottom: '1rem' }}>{complaintsError}</div>
              )}
              {complaintsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                  <i className="fas fa-spinner fa-pulse" /> Loading notifications...
                </div>
              ) : (
                <>
                  {reviewNotifications.length > 0 && (
                    <>
                      <div className="notif-section-title">
                        <i className="fas fa-star" style={{ color: '#f59e0b' }} aria-hidden="true" />
                        Customer reviews
                      </div>
                      {reviewNotifications.map((r) => (
                        <div key={`rev-${r.bookingId}`} className="review-notif-item">
                          <div style={{ fontWeight: 800, color: 'var(--gray-800)', marginBottom: '0.35rem' }}>
                            Review
                            {r.requestedDate ? (
                              <span style={{ fontWeight: 600, color: 'var(--gray-500)', marginLeft: '0.35rem' }}>
                                · Service date {r.requestedDate}
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginBottom: '0.35rem' }}>
                            From <strong>{r.customerName}</strong>
                            {r.createdAt ? ` · ${new Date(r.createdAt).toLocaleString()}` : ''}
                          </div>
                          <div className="review-notif-stars" aria-label={`${r.rating} out of 5 stars`}>
                            {'★'.repeat(Math.min(5, Math.max(0, r.rating)))}
                            <span style={{ color: 'var(--gray-700)', fontWeight: 800, marginLeft: '0.35rem', fontSize: '0.875rem' }}>
                              {r.rating}/5
                            </span>
                          </div>
                          {r.feedback ? (
                            <div
                              style={{
                                marginTop: '0.5rem',
                                fontSize: '0.875rem',
                                color: 'var(--gray-700)',
                                lineHeight: 1.45,
                              }}
                            >
                              {r.feedback}
                            </div>
                          ) : (
                            <div style={{ marginTop: '0.35rem', fontSize: '0.8125rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                              No written feedback.
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {(complaints.length > 0 || reviewNotifications.length > 0) && (
                    <div className="notif-section-title">
                      <i className="fas fa-triangle-exclamation" style={{ color: '#b45309' }} aria-hidden="true" />
                      Complaints &amp; admin decisions
                    </div>
                  )}
                  {complaints.length === 0 ? (
                    reviewNotifications.length > 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.25rem', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                        <i className="fas fa-check-circle" /> No complaint notices (you will see them here after the manager notifies you).
                      </div>
                    ) : null
                  ) : (
                    complaints.map((c) => (
                  <div key={c.bookingId} className="complaint-item">
                    <div className="complaint-header">
                      <div className="complaint-title">
                        Complaint: {c.category || '—'}
                      </div>
                      <span className={`complaint-status ${c.status}`}>{c.status}</span>
                    </div>
                    <div className="complaint-meta">
                      Customer: {c.customerName}
                      {c.supplierNotifiedAt
                        ? ` • Notified: ${new Date(c.supplierNotifiedAt).toLocaleString()}`
                        : c.submittedAt
                          ? ` • ${new Date(c.submittedAt).toLocaleString()}`
                          : ''}
                    </div>
                    {c.adminDecision && c.adminDecision !== 'none' && (
                      <div
                        className={`admin-decision-banner ${
                          c.adminDecision === 'warning' ? 'warning' : c.adminDecision === 'resolved' ? 'resolved' : 'neutral'
                        }`}
                        role="status"
                      >
                        <i className="fas fa-gavel" style={{ marginRight: '0.35rem' }} aria-hidden="true" />
                        <strong>Ecosystem manager decision:</strong>{' '}
                        {c.adminDecision === 'warning'
                          ? 'Official warning recorded for this case.'
                          : c.adminDecision === 'resolved'
                            ? 'This complaint was marked resolved by the manager.'
                            : String(c.adminDecision)}
                        {c.adminDecidedAt ? (
                          <span style={{ fontWeight: 600, opacity: 0.95 }}>
                            {' '}
                            · {new Date(c.adminDecidedAt).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    )}
                    <div className="complaint-description">
                      <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Description</div>
                      <div>{c.description || 'No description provided.'}</div>
                      {c.evidenceUrl && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <a href={c.evidenceUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                            View evidence
                          </a>
                        </div>
                      )}

                      {c.supplierResponse ? (
                        <div style={{ marginTop: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#166534' }}>Your Response</div>
                          <div>{c.supplierResponse}</div>
                          {c.supplierRespondedAt && (
                            <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#166534' }}>
                              Responded on {new Date(c.supplierRespondedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ marginTop: '0.75rem' }}>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => {
                              setRespondingBookingId(String(c.bookingId));
                              setResponseDrafts((prev) => ({
                                ...prev,
                                [String(c.bookingId)]: prev[String(c.bookingId)] || '',
                              }));
                            }}
                          >
                            Respond Now
                          </button>
                        </div>
                      )}

                      {respondingBookingId === String(c.bookingId) && !c.supplierResponse && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <textarea
                            className="input"
                            style={{ minHeight: 100, resize: 'vertical' }}
                            placeholder="Type your response to this complaint..."
                            value={responseDrafts[String(c.bookingId)] || ''}
                            onChange={(e) =>
                              setResponseDrafts((prev) => ({
                                ...prev,
                                [String(c.bookingId)]: e.target.value,
                              }))
                            }
                          />
                          <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={async () => {
                                const responseText = String(responseDrafts[String(c.bookingId)] || '').trim();
                                if (responseText.length < 10) {
                                  setComplaintsError('Response must be at least 10 characters.');
                                  return;
                                }
                                try {
                                  setComplaintsError('');
                                  await respondBookingComplaint(c.bookingId, responseText);
                                  setRespondingBookingId('');
                                  await loadComplaints();
                                } catch (e) {
                                  setComplaintsError(e?.response?.data?.message || 'Failed to submit complaint response.');
                                }
                              }}
                            >
                              Submit Response
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={() => setRespondingBookingId('')}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                    ))
                  )}

                  {!complaintsLoading &&
                    complaints.length === 0 &&
                    reviewNotifications.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                        <i className="fas fa-bell-slash" /> Nothing here yet — reviews and complaint notices will appear when customers submit them.
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ k, v }) => (
  <div className="detail-row">
    <div className="detail-label">{k}</div>
    <div className="detail-value">{v}</div>
  </div>
);

const Field = ({ label, children, full }) => (
  <div className={`field ${full ? 'field-full' : ''}`}>
    <label>{label}</label>
    {children}
  </div>
);

const getInitials = (name = '') =>
  String(name)
    .split(' ')
    .filter(Boolean)
    .map((x) => x[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'SP';

export default SupplierProfilePage;