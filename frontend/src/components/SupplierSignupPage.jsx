import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { fetchPublicCatalogOptions, fetchGradingConfig } from '../services/api';
import { ensureCatalogDefaults, getCatalog } from '../utils/catalogStore';

/* ──────────────────────────────────────────────
   ✦  INLINE SVG ICONS
   ────────────────────────────────────────────── */
const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconMail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const IconPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const IconMapPin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconIdCard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="10" y2="15" />
  </svg>
);

const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconFileText = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

const IconUpload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconImage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const IconBriefcase = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconAlert = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const IconStar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

/* ──────────────────────────────────────────────
   ✦  MAIN COMPONENT
   ────────────────────────────────────────────── */
const SupplierSignupPage = ({ onSuccess, onCancel, onBackToRoleSelect }) => {
  const { signupSupplierReal } = useContext(AuthContext);
  const sriLankaDistricts = useMemo(
    () => [
      'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
      'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
      'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
      'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
      'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
    ],
    []
  );

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [nic, setNic] = useState('');
  const [monthsOfExperience, setMonthsOfExperience] = useState('0');
  const [touched, setTouched] = useState({});

  const [category, setCategory] = useState('');
  const [categoryOther, setCategoryOther] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [customServiceInput, setCustomServiceInput] = useState('');
  const [customServices, setCustomServices] = useState([]);
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [bio, setBio] = useState('');

  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [experienceCertificateFiles, setExperienceCertificateFiles] = useState([]);
  const [certificatePreviewUrls, setCertificatePreviewUrls] = useState([]);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [catalogOptions, setCatalogOptions] = useState({ categories: [], servicesByCategory: {} });
  const [gradingConfig, setGradingConfig] = useState(null);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await fetchPublicCatalogOptions();
        const categories = res.data?.categories || [];
        const servicesByCategory = res.data?.servicesByCategory || {};
        if (categories.length) {
          setCatalogOptions({ categories, servicesByCategory });
          setCategory((prev) => prev || categories[0]);
          return;
        }
      } catch (_e) {
        // fallback to local defaults
      }
      ensureCatalogDefaults();
      const local = getCatalog();
      setCatalogOptions(local);
      setCategory((prev) => prev || local.categories[0] || '');
    };
    loadCatalog();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchGradingConfig();
        const d = res.data;
        if (d?.A && d?.B && d?.C) setGradingConfig(d);
      } catch {
        // optional
      }
    })();
  }, []);

  useEffect(() => {
    if (!profilePictureFile) {
      setProfilePreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(profilePictureFile);
    setProfilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePictureFile]);

  useEffect(() => {
    if (!experienceCertificateFiles || experienceCertificateFiles.length === 0) {
      setCertificatePreviewUrls([]);
      return;
    }
    const urls = Array.from(experienceCertificateFiles).map(f => URL.createObjectURL(f));
    setCertificatePreviewUrls(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [experienceCertificateFiles]);

  const serviceOptions = useMemo(() => {
    if (!category || category === 'other') return [];
    return catalogOptions.servicesByCategory[category] || [];
  }, [category, catalogOptions.servicesByCategory]);

  useEffect(() => {
    setSelectedServices((prev) => prev.filter((s) => serviceOptions.includes(s)));
  }, [serviceOptions]);

  const allSelectedServices = useMemo(() => {
    const merged = [...selectedServices, ...customServices];
    return Array.from(new Set(merged.map((s) => String(s || '').trim()).filter(Boolean)));
  }, [selectedServices, customServices]);

  const canSubmit = useMemo(() => {
    const resolvedCategory = category === 'other' ? categoryOther.trim() : category;
    return (
      fullName && !validateField('fullName', fullName) &&
      email && !validateField('email', email) &&
      phone && !validateField('phone', phone) &&
      address && !validateField('address', address) &&
      city && !validateField('city', city) &&
      district && !validateField('district', district) &&
      nic && !validateField('nic', nic) &&
      yearsOfExperience !== '' && !validateField('yearsOfExperience', yearsOfExperience) &&
      monthsOfExperience !== '' && !validateField('monthsOfExperience', monthsOfExperience) &&
      bio && !validateField('bio', bio) &&
      profilePictureFile &&
      experienceCertificateFiles && experienceCertificateFiles.length > 0 &&
      resolvedCategory &&
      allSelectedServices.length > 0
    );
  }, [
    address, bio, city, district, email, experienceCertificateFiles, fullName, phone,
    profilePictureFile, category, categoryOther, allSelectedServices, yearsOfExperience,
    monthsOfExperience, nic
  ]);

  function validateField(name, value) {
    switch (name) {
      case 'fullName':
        if (!value) return 'Full Name is required';
        if (value.length < 3) return 'Minimum 3 chars';
        if (!/^[A-Za-z\s]+$/.test(value)) return 'Only letters and spaces';
        return '';
      case 'email':
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Valid email format required';
        return '';
      case 'phone':
        if (!value) return 'Phone is required';
        if (!/^07\d{8}$/.test(value)) return 'Valid SL number (07x, 10 digits)';
        return '';
      case 'address':
        if (!value || value.length < 10) return 'Min 10 characters required';
        return '';
      case 'city':
        if (!value) return 'City is required';
        if (!/^[A-Za-z\s]+$/.test(value)) return 'Only letters allowed';
        return '';
      case 'district':
        if (!value) return 'District is required';
        if (!/^[A-Za-z\s-]+$/.test(value)) return 'Only letters allowed';
        return '';
      case 'nic':
        if (!value) return 'NIC is required';
        if (!/^([0-9]{9}[vVxX]|[0-9]{12})$/.test(value)) return 'Invalid NIC format';
        return '';
      case 'yearsOfExperience':
        if (value === '') return 'Required';
        if (Number(value) < 0 || Number(value) > 50) return '0 to 50';
        return '';
      case 'monthsOfExperience':
        if (value === '') return 'Required';
        if (Number(value) < 0 || Number(value) > 11) return '0 to 11';
        return '';
      case 'bio':
        if (!value) return 'Required';
        if (value.length < 20) return 'Min 20 chars';
        if (value.length > 300) return 'Max 300 chars';
        return '';
      case 'category':
        if (!value) return 'Category is required';
        return '';
      case 'categoryOther':
        if (category === 'other' && !value) return 'New category is required';
        return '';
      case 'services':
        if (!value || value.length === 0) return 'At least one service is required';
        return '';
      default:
        return '';
    }
  }

  function getValidationClass(name, value) {
    if (!touched[name]) return '';
    return validateField(name, value) ? 'invalid' : 'valid';
  }

  function handleBlur(name) {
    setTouched(prev => ({ ...prev, [name]: true }));
  }

  const toggleService = (serviceName) => {
    setTouched(prev => ({ ...prev, services: true }));
    setSelectedServices((prev) =>
      prev.includes(serviceName) ? prev.filter((s) => s !== serviceName) : [...prev, serviceName]
    );
  };

  const addCustomService = () => {
    setTouched(prev => ({ ...prev, services: true }));
    const cleaned = customServiceInput.trim();
    if (!cleaned) return;
    const exists = [...selectedServices, ...customServices].some((s) => s.toLowerCase() === cleaned.toLowerCase());
    if (exists) {
      setCustomServiceInput('');
      return;
    }
    setCustomServices((prev) => [...prev, cleaned]);
    setCustomServiceInput('');
  };

  const removeCustomService = (serviceName) => {
    setTouched(prev => ({ ...prev, services: true }));
    setCustomServices((prev) => prev.filter((s) => s !== serviceName));
  };

  const toLegacyCategory = (rawCategory) => {
    const normalized = String(rawCategory || '').trim().toLowerCase();
    if (normalized.includes('plumb')) return 'plumber';
    if (normalized.includes('elect')) return 'electrician';
    if (normalized.includes('clean')) return 'cleaner';
    if (normalized.includes('carpen')) return 'carpenter';
    return 'other';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Please fill all required fields (including uploads).');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('address', address);
      formData.append('city', city);
      formData.append('district', district);

      const resolvedCategory = category === 'other' ? categoryOther.trim() : category;
      const legacyCategory = toLegacyCategory(resolvedCategory);

      formData.append('category', resolvedCategory);
      formData.append('serviceCategory', legacyCategory);
      formData.append('serviceCategoryOther', legacyCategory === 'other' ? resolvedCategory : '');
      formData.append('services', JSON.stringify(allSelectedServices));
      formData.append('service', allSelectedServices[0] || '');
      formData.append('serviceOther', customServices.join(', '));
      formData.append('nic', nic);
      formData.append('yearsOfExperience', yearsOfExperience);
      formData.append('monthsOfExperience', monthsOfExperience);
      formData.append('bio', bio);

      formData.append('profilePicture', profilePictureFile);
      if (experienceCertificateFiles) {
        Array.from(experienceCertificateFiles).forEach(f => formData.append('experienceCertificate', f));
      }

      await signupSupplierReal(formData);
      setSubmitted(true);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Supplier signup failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = useMemo(() => {
    return [...(catalogOptions.categories || []).map((name) => ({ value: name, label: name })), { value: 'other', label: 'Other' }];
  }, [catalogOptions.categories]);

  return (
    <div className="signup-shell">
      <style>{`
        /* ═══════════════════════════════════════
           ✦  MODERN BLUE SUPPLIER SIGNUP PAGE
           ═══════════════════════════════════════ */
        .signup-shell {
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 32px 24px 48px;
          background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 40%, #f8fafc 100%);
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .signup-shell::before {
          content: '';
          position: fixed;
          top: -100px;
          right: -100px;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(30,58,138,0.05) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .signup-shell::after {
          content: '';
          position: fixed;
          bottom: -80px;
          left: -80px;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .signup-layout {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 960px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 28px;
          box-shadow:
            0 4px 6px -1px rgba(0,0,0,0.02),
            0 10px 15px -3px rgba(0,0,0,0.04),
            0 24px 48px -12px rgba(15,23,42,0.08),
            0 0 0 0.5px rgba(148,163,184,0.15);
          overflow: hidden;
          transition: box-shadow 0.3s ease;
        }

        .signup-layout:hover {
          box-shadow:
            0 4px 6px -1px rgba(0,0,0,0.03),
            0 10px 15px -3px rgba(0,0,0,0.06),
            0 28px 56px -14px rgba(15,23,42,0.12),
            0 0 0 0.5px rgba(148,163,184,0.2);
        }

        .signup-form {
          padding: 40px 36px;
        }

        .top-links {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .link-btn {
          border: none;
          background: transparent;
          font-weight: 600;
          color: #1e3a8a;
          cursor: pointer;
          padding: 8px 12px;
          font-size: 14px;
          transition: all 0.2s ease;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .link-btn:hover {
          background: rgba(30,58,138,0.06);
          transform: translateX(-2px);
        }

        .signup-form h3 {
          margin: 0 0 8px;
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .sub {
          margin: 0 0 32px;
          color: #64748b;
          font-weight: 500;
          font-size: 0.95rem;
        }

        /* ═══════════════════════════════════════
           ✦  SECTIONS
           ═══════════════════════════════════════ */
        .section {
          background: #fefefe;
          border-radius: 20px;
          padding: 24px 28px;
          border: 1px solid #edf2f7;
          margin-bottom: 24px;
          transition: all 0.25s ease;
        }

        .section:hover {
          border-color: #e2e8f0;
          box-shadow: 0 8px 24px -10px rgba(0,0,0,0.06);
        }

        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .section-title {
          font-weight: 700;
          font-size: 1rem;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          letter-spacing: -0.01em;
        }

        .section-title .section-icon {
          color: #1e3a8a;
        }

        /* ═══════════════════════════════════════
           ✦  FORM GRID
           ═══════════════════════════════════════ */
        .fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .field label .label-icon {
          color: #1e3a8a;
          opacity: 0.7;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          padding: 11px 16px;
          border-radius: 14px;
          border: 1.8px solid #e8ecf1;
          outline: none;
          font-size: 0.925rem;
          font-weight: 500;
          transition: all 0.2s ease;
          background: #fafbfc;
          font-family: inherit;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .field textarea {
          min-height: 100px;
          resize: vertical;
        }

        .field input:hover,
        .field select:hover,
        .field textarea:hover {
          border-color: #cbd5e1;
          background: #fff;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: #1e3a8a;
          box-shadow: 0 0 0 5px rgba(30,58,138,0.08), 0 2px 8px rgba(0,0,0,0.02);
          background: #fff;
          outline: none;
        }

        /* Validation states */
        .field input.valid,
        .field select.valid,
        .field textarea.valid {
          border-color: #22c55e !important;
          box-shadow: 0 0 0 5px rgba(34,197,94,0.08);
        }

        .field input.invalid,
        .field select.invalid,
        .field textarea.invalid {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 5px rgba(239,68,68,0.07);
          animation: shake 0.4s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }

        .field .Validation-msg {
          position: absolute;
          top: -12px;
          right: 0;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
          z-index: 2;
          white-space: nowrap;
        }

        .field .Validation-msg.error {
          background: #fee2e2;
          color: #dc2626;
        }

        .field .Validation-msg.success {
          background: #dcfce7;
          color: #15803d;
        }

        .field .inline-error {
          font-size: 11.5px;
          color: #dc2626;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: -2px;
          animation: fadeSlide 0.25s ease;
        }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Services Box */
        .services-box {
          border-radius: 14px;
          padding: 12px;
          transition: all 0.2s ease;
        }

        .services-box.invalid {
          border: 2px solid #ef4444;
          background: #fffbfb;
        }

        .services-box.valid {
          border: 2px solid #22c55e;
          background: #f0fdf4;
        }

        .svc-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 8px;
        }

        .svc-opt {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 8px 12px;
          background: #fff;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .svc-opt:hover {
          border-color: #1e3a8a;
          background: #f8faff;
        }

        .svc-opt input {
          width: 17px;
          height: 17px;
          accent-color: #1e3a8a;
        }

        .svc-opt span {
          flex: 1;
          min-width: 0;
          color: #334155;
        }

        /* Custom service tags */
        .service-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(30,58,138,0.06);
          border: 1px solid rgba(30,58,138,0.15);
          border-radius: 999px;
          padding: 6px 12px;
          font-weight: 600;
          font-size: 0.78rem;
          color: #1e3a8a;
          margin: 4px 4px 4px 0;
        }

        .service-tag .remove-tag {
          border: none;
          background: transparent;
          cursor: pointer;
          color: #64748b;
          font-weight: 700;
          font-size: 14px;
          line-height: 1;
          padding: 0;
          display: flex;
          align-items: center;
        }

        .service-tag .remove-tag:hover {
          color: #ef4444;
        }

        /* Grading info card */
        .grading-info {
          border-radius: 14px;
          border: 1px solid rgba(30,58,138,0.15);
          background: rgba(30,58,138,0.03);
          padding: 14px 16px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #334155;
          line-height: 1.6;
        }

        .grading-info strong {
          color: #1e3a8a;
        }

        /* Upload area */
        .uploader {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .upload-preview {
          width: 80px;
          height: 80px;
          border-radius: 16px;
          border: 2px dashed #cbd5e1;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: all 0.2s;
        }

        .upload-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .upload-preview.has-preview {
          border-style: solid;
          border-color: #1e3a8a;
        }

        .file-input-wrapper {
          flex: 1;
          min-width: 200px;
        }

        .cert-preview-grid {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .cert-preview-grid img {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }

        /* ═══════════════════════════════════════
           ✦  ERROR & MESSAGES
           ═══════════════════════════════════════ */
        .auth-error {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          color: #991b1b;
          border-radius: 16px;
          padding: 14px 20px;
          font-weight: 500;
          font-size: 0.85rem;
          margin-bottom: 22px;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: fadeSlide 0.3s ease;
          box-shadow: 0 2px 8px rgba(239,68,68,0.06);
        }

        /* ═══════════════════════════════════════
           ✦  ACTIONS
           ═══════════════════════════════════════ */
        .actions {
          display: flex;
          gap: 14px;
          margin-top: 28px;
          justify-content: flex-end;
          border-top: 1px solid #edf2f7;
          padding-top: 24px;
        }

        .btn {
          border-radius: 40px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          border: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          letter-spacing: -0.01em;
        }

        .btn.primary {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          color: white;
          box-shadow: 0 4px 14px -4px rgba(30,58,138,0.3);
        }

        .btn.primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -6px rgba(15,23,42,0.4), 0 0 0 4px rgba(30,58,138,0.06);
        }

        .btn.primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn.primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        .btn.ghost {
          background: rgba(255,255,255,0.7);
          border: 1.5px solid #e2e8f0;
          color: #334155;
          backdrop-filter: blur(4px);
        }

        .btn.ghost:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }

        /* ═══════════════════════════════════════
           ✦  SUCCESS MODAL
           ═══════════════════════════════════════ */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 9999;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-card {
          width: 100%;
          max-width: 480px;
          background: white;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.2);
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-card h3 {
          color: #0f172a;
          margin-top: 0;
        }

        .modal-card p {
          color: #475569;
          line-height: 1.6;
        }

        /* ═══════════════════════════════════════
           ✦  RESPONSIVE
           ═══════════════════════════════════════ */
        @media (max-width: 768px) {
          .signup-shell {
            padding: 20px 12px 32px;
          }
          .signup-form {
            padding: 28px 20px;
          }
          .fields {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .section {
            padding: 20px 16px;
          }
          .svc-options {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .signup-form {
            padding: 20px 14px;
          }
          .btn {
            padding: 10px 18px;
            font-size: 0.85rem;
          }
        }
      `}</style>

      <div className="signup-layout">
        <form className="signup-form" onSubmit={handleSubmit}>
          {/* ─── Top Navigation ─── */}
          <div className="top-links">
            {onBackToRoleSelect && (
              <button type="button" className="link-btn" onClick={onBackToRoleSelect}>
                <IconChevronLeft /> Choose a different role
              </button>
            )}
            <button type="button" className="link-btn" onClick={onCancel}>
              <IconX /> Cancel
            </button>
          </div>

          <h3>Supplier Registration</h3>
          <div className="sub">Create your professional profile and start receiving bookings.</div>

          {error && (
            <div className="auth-error">
              <IconAlert /> {error}
            </div>
          )}

          {/* ─── SECTION 1: Personal Information ─── */}
          <section className="section">
            <div className="section-head">
              <h4 className="section-title">
                <span className="section-icon"><IconUser /></span>
                Personal Information
              </h4>
            </div>

            <div className="fields">
              {/* Full Name */}
              <div className="field">
                <label><span className="label-icon"><IconUser /></span> Full name</label>
                {touched.fullName && (
                  <div className={`Validation-msg ${validateField('fullName', fullName) ? 'error' : 'success'}`}>
                    {validateField('fullName', fullName) || 'Looks good!'}
                  </div>
                )}
                <input
                  className={getValidationClass('fullName', fullName)}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => handleBlur('fullName')}
                  type="text"
                  placeholder="John Doe"
                  required
                />
              </div>

              {/* Email */}
              <div className="field">
                <label><span className="label-icon"><IconMail /></span> Email address</label>
                {touched.email && (
                  <div className={`Validation-msg ${validateField('email', email) ? 'error' : 'success'}`}>
                    {validateField('email', email) || 'Looks good!'}
                  </div>
                )}
                <input
                  className={getValidationClass('email', email)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  type="email"
                  placeholder="john@example.com"
                  required
                />
              </div>

              {/* Phone */}
              <div className="field">
                <label><span className="label-icon"><IconPhone /></span> Phone number</label>
                {touched.phone && (
                  <div className={`Validation-msg ${validateField('phone', phone) ? 'error' : 'success'}`}>
                    {validateField('phone', phone) || 'Looks good!'}
                  </div>
                )}
                <input
                  className={getValidationClass('phone', phone)}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  type="text"
                  placeholder="07XXXXXXXX"
                  required
                />
              </div>

              {/* NIC */}
              <div className="field">
                <label><span className="label-icon"><IconIdCard /></span> NIC Number</label>
                {touched.nic && (
                  <div className={`Validation-msg ${validateField('nic', nic) ? 'error' : 'success'}`}>
                    {validateField('nic', nic) || 'Looks good!'}
                  </div>
                )}
                <input
                  className={getValidationClass('nic', nic)}
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  onBlur={() => handleBlur('nic')}
                  type="text"
                  placeholder="123456789V / 123456789012"
                  required
                />
              </div>

              {/* Address */}
              <div className="field full">
                <label><span className="label-icon"><IconMapPin /></span> Address</label>
                {touched.address && (
                  <div className={`Validation-msg ${validateField('address', address) ? 'error' : 'success'}`}>
                    {validateField('address', address) || 'Looks good!'}
                  </div>
                )}
                <input
                  className={getValidationClass('address', address)}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={() => handleBlur('address')}
                  type="text"
                  placeholder="123 Main Street, Apt 4B"
                  required
                />
              </div>

              {/* City */}
              <div className="field">
                <label><span className="label-icon"><IconMapPin /></span> City</label>
                {touched.city && (
                  <div className={`Validation-msg ${validateField('city', city) ? 'error' : 'success'}`}>
                    {validateField('city', city) || 'Looks good!'}
                  </div>
                )}
                <input
                  className={getValidationClass('city', city)}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={() => handleBlur('city')}
                  type="text"
                  placeholder="Colombo"
                  required
                />
              </div>

              {/* District */}
              <div className="field">
                <label><span className="label-icon"><IconMapPin /></span> District</label>
                {touched.district && (
                  <div className={`Validation-msg ${validateField('district', district) ? 'error' : 'success'}`}>
                    {validateField('district', district) || 'Looks good!'}
                  </div>
                )}
                <input
                  className={getValidationClass('district', district)}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  onBlur={() => handleBlur('district')}
                  type="text"
                  list="sl-districts"
                  placeholder="Select district"
                  required
                />
                <datalist id="sl-districts">
                  {sriLankaDistricts.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
            </div>
          </section>

          {/* ─── SECTION 2: Service Information ─── */}
          <section className="section">
            <div className="section-head">
              <h4 className="section-title">
                <span className="section-icon"><IconBriefcase /></span>
                Service Information
              </h4>
            </div>

            <div className="fields">
              {/* Category */}
              <div className="field">
                <label>Category</label>
                {touched.category && (
                  <div className={`Validation-msg ${validateField('category', category) ? 'error' : 'success'}`}>
                    {validateField('category', category) || 'Looks good!'}
                  </div>
                )}
                <select
                  className={getValidationClass('category', category)}
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (e.target.value !== 'other') {
                      setCategoryOther('');
                      setTouched(prev => ({...prev, categoryOther: false}));
                    }
                  }}
                  onBlur={() => handleBlur('category')}
                  required
                >
                  <option value="" disabled>Select category</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Other Category */}
              {category === 'other' && (
                <div className="field">
                  <label>New category</label>
                  {touched.categoryOther && (
                    <div className={`Validation-msg ${validateField('categoryOther', categoryOther) ? 'error' : 'success'}`}>
                      {validateField('categoryOther', categoryOther) || 'Looks good!'}
                    </div>
                  )}
                  <input
                    className={getValidationClass('categoryOther', categoryOther)}
                    value={categoryOther}
                    onChange={(e) => setCategoryOther(e.target.value)}
                    onBlur={() => handleBlur('categoryOther')}
                    type="text"
                    placeholder="e.g., Landscaping"
                    required
                  />
                </div>
              )}

              {/* Services Selection */}
              <div className="field full">
                <label>Services (select one or more)</label>
                {touched.services && (
                  <div className={`Validation-msg ${validateField('services', allSelectedServices) ? 'error' : 'success'}`}>
                    {validateField('services', allSelectedServices) || 'Looks good!'}
                  </div>
                )}
                {category !== 'other' && serviceOptions.length > 0 ? (
                  <div className={`services-box ${touched.services ? (validateField('services', allSelectedServices) ? 'invalid' : 'valid') : ''}`}>
                    <div className="svc-options">
                      {serviceOptions.map((svc) => (
                        <label key={svc} className="svc-opt">
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(svc)}
                            onChange={() => toggleService(svc)}
                          />
                          <span>{svc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#64748b', fontWeight: 500, fontSize: 13, marginTop: 4 }}>
                    No predefined services for this category. Add your own below.
                  </div>
                )}
              </div>

              {/* Custom Service Input */}
              <div className="field full">
                <label>Add custom service</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={customServiceInput}
                    onChange={(e) => setCustomServiceInput(e.target.value)}
                    type="text"
                    placeholder="e.g., AC repair"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomService())}
                  />
                  <button type="button" className="btn ghost" style={{ flex: '0 0 auto', padding: '10px 18px' }} onClick={addCustomService}>
                    <IconPlus /> Add
                  </button>
                </div>
                {allSelectedServices.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {allSelectedServices.map((svc) => (
                      <span key={svc} className="service-tag">
                        {svc}
                        {customServices.includes(svc) && (
                          <button
                            type="button"
                            className="remove-tag"
                            onClick={() => removeCustomService(svc)}
                            aria-label="Remove service"
                          >
                            <IconX />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Experience */}
              <div className="field">
                <label><span className="label-icon"><IconClock /></span> Experience</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    {touched.yearsOfExperience && (
                      <div className={`Validation-msg ${validateField('yearsOfExperience', yearsOfExperience) ? 'error' : 'success'}`}>
                        {validateField('yearsOfExperience', yearsOfExperience) || 'Ok'}
                      </div>
                    )}
                    <input
                      className={getValidationClass('yearsOfExperience', yearsOfExperience)}
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      onBlur={() => handleBlur('yearsOfExperience')}
                      type="number" min="0" placeholder="Years" required
                    />
                    <small style={{ display: 'block', color: '#64748b', marginTop: 2 }}>Years</small>
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    {touched.monthsOfExperience && (
                      <div className={`Validation-msg ${validateField('monthsOfExperience', monthsOfExperience) ? 'error' : 'success'}`}>
                        {validateField('monthsOfExperience', monthsOfExperience) || 'Ok'}
                      </div>
                    )}
                    <input
                      className={getValidationClass('monthsOfExperience', monthsOfExperience)}
                      value={monthsOfExperience}
                      onChange={(e) => setMonthsOfExperience(e.target.value)}
                      onBlur={() => handleBlur('monthsOfExperience')}
                      type="number" min="0" max="11" placeholder="Months" required
                    />
                    <small style={{ display: 'block', color: '#64748b', marginTop: 2 }}>Months</small>
                  </div>
                </div>
              </div>

              {/* Grading Info */}
              <div className="field full">
                <div className="grading-info">
                  <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconStar /> How grading works
                  </div>
                  {gradingConfig ? (
                    <>
                      <div><strong>A</strong> — Experience ≥ {gradingConfig.A?.minYears ?? '—'} years</div>
                      <div><strong>B</strong> — Experience ≥ {gradingConfig.B?.minYears ?? '—'} years</div>
                      <div><strong>C</strong> — Experience ≥ {gradingConfig.C?.minYears ?? '—'} years (entry tier)</div>
                    </>
                  ) : (
                    <>
                      <div><strong>A</strong> — Experience typically 5+ years</div>
                      <div><strong>B</strong> — Experience typically 3+ years</div>
                      <div><strong>C</strong> — Emerging tier</div>
                    </>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="field full">
                <label><span className="label-icon"><IconFileText /></span> Short bio</label>
                {touched.bio && (
                  <div className={`Validation-msg ${validateField('bio', bio) ? 'error' : 'success'}`}>
                    {validateField('bio', bio) || 'Looks good!'}
                  </div>
                )}
                <textarea
                  className={getValidationClass('bio', bio)}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={() => handleBlur('bio')}
                  placeholder="Tell us about your experience and expertise..."
                  required
                />
              </div>

              {/* Profile Picture */}
              <div className="field full">
                <label><span className="label-icon"><IconImage /></span> Profile picture</label>
                <div className="uploader">
                  <div className={`upload-preview ${profilePreviewUrl ? 'has-preview' : ''}`}>
                    {profilePreviewUrl ? (
                      <img src={profilePreviewUrl} alt="Preview" />
                    ) : (
                      <IconUser />
                    )}
                  </div>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProfilePictureFile(e.target.files?.[0] || null)}
                      required
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Experience Certificates */}
              <div className="field full">
                <label><span className="label-icon"><IconUpload /></span> Experience certificate(s)</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  onChange={(e) => setExperienceCertificateFiles(e.target.files)}
                  required
                  style={{ fontSize: '0.85rem' }}
                />
                {certificatePreviewUrls.length > 0 && (
                  <div className="cert-preview-grid">
                    {certificatePreviewUrls.map((url, idx) => (
                      <img key={idx} src={url} alt={`Certificate ${idx + 1}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ─── Submit Button ─── */}
          <div className="actions">
            <button type="submit" className="btn primary" disabled={loading || !canSubmit}>
              {loading ? 'Submitting...' : (
                <>
                  <IconCheck /> Submit Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ─── Success Modal ─── */}
      {submitted && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#22c55e', fontSize: 28 }}>✓</span>
              Application Under Review
            </h3>
            <p>
              Thank you for applying! Our admin team will review your details. 
              If approved, you will receive login credentials via email.
            </p>
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setSubmitted(false);
                  window.location.hash = 'home';
                }}
              >
                <IconArrowLeft /> Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierSignupPage;