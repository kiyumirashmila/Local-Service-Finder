import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import Lottie from 'lottie-react';

const AVATAR_OPTIONS = [
  '/icons/1.png',
  '/icons/2.png',
  '/icons/3.png',
  '/icons/4.png',
  '/icons/5.png',
  '/icons/6.png'
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fullNameRegex = /^[A-Za-z\s]+$/;
const cityRegex = /^[A-Za-z\s]+$/;
const districtRegex = /^[A-Za-z\s-]+$/;
const phoneRegex = /^07\d{8}$/;
const specialCharRegex = /[^A-Za-z0-9]/;

const getPasswordStrength = (value) => {
  const pwd = String(value || '');
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[a-z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (specialCharRegex.test(pwd)) score += 1;

  if (score <= 2) return { label: 'Weak', tone: 'weak', progress: 25, color: '#ef4444' };
  if (score <= 4) return { label: 'Medium', tone: 'medium', progress: 60, color: '#3b82f6' };
  return { label: 'Strong', tone: 'strong', progress: 100, color: '#16a34a' };
};

/* ──────────────────────────────────────────────
   ✦  INLINE SVG ICONS
   ────────────────────────────────────────────── */
const IconArrowLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

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

const IconLock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconAlert = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const CustomerSignupPage = ({ onSuccess, onCancel, onBackToRoleSelect }) => {
  const { signupCustomerReal } = useContext(AuthContext);
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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('/icons/1.png');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    phone: false,
    city: false,
    district: false,
    address: false,
    password: false,
    confirmPassword: false,
    termsAccepted: false
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [welcomeAnimationData, setWelcomeAnimationData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadWelcomeAnimation = async () => {
      try {
        const res = await fetch('/images/Welcome.json');
        if (!res.ok) throw new Error('Animation file not found');
        const json = await res.json();
        if (!cancelled) setWelcomeAnimationData(json);
      } catch {
        if (!cancelled) setWelcomeAnimationData(null);
      }
    };
    loadWelcomeAnimation();
    return () => {
      cancelled = true;
    };
  }, []);

  const fieldErrors = useMemo(() => {
    const errs = {};

    const name = fullName.trim();
    if (!name) errs.fullName = 'Full name is required.';
    else if (name.length < 3) errs.fullName = 'Full name must be at least 3 characters.';
    else if (!fullNameRegex.test(name)) errs.fullName = 'Full name can contain letters and spaces only.';

    const mail = email.trim();
    if (!mail) errs.email = 'Email address is required.';
    else if (!emailRegex.test(mail)) errs.email = 'Enter a valid email (example@domain.com).';

    const ph = phone.trim();
    if (!ph) errs.phone = 'Phone number is required.';
    else if (!phoneRegex.test(ph)) errs.phone = 'Use a valid Sri Lankan phone (starts with 07 and 10 digits).';

    const cityValue = city.trim();
    if (!cityValue) errs.city = 'City is required.';
    else if (!cityRegex.test(cityValue)) errs.city = 'City can contain letters and spaces only.';
    
    const districtValue = district.trim();
    if (!districtValue) errs.district = 'District is required.';
    else if (!districtRegex.test(districtValue)) errs.district = 'District can contain letters and spaces only.';
    
    if (!address.trim()) errs.address = 'Address is required.';

    const pwd = password;
    if (!pwd) {
      errs.password = 'Password is required.';
    } else if (
      pwd.length < 8 ||
      !/[A-Z]/.test(pwd) ||
      !/[a-z]/.test(pwd) ||
      !/\d/.test(pwd) ||
      !specialCharRegex.test(pwd)
    ) {
      errs.password = 'Password must be 8+ chars and include uppercase, lowercase, number, and special character.';
    }

    if (!confirmPassword) errs.confirmPassword = 'Confirm password is required.';
    else if (confirmPassword !== password) errs.confirmPassword = 'Confirm password must match Password.';

    if (!termsAccepted) errs.termsAccepted = 'You must accept the terms and conditions.';

    return errs;
  }, [fullName, email, phone, city, district, address, password, confirmPassword, termsAccepted]);

  const canSubmit = useMemo(() => {
    return avatarUrl && Object.keys(fieldErrors).length === 0;
  }, [avatarUrl, fieldErrors]);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!canSubmit) {
      setTouched({
        fullName: true,
        email: true,
        phone: true,
        city: true,
        district: true,
        address: true,
        password: true,
        confirmPassword: true,
        termsAccepted: true
      });
      return setError('Please correct the highlighted fields.');
    }

    try {
      setLoading(true);
      await signupCustomerReal({
        fullName,
        email,
        phone,
        password,
        confirmPassword,
        address,
        city,
        district,
        avatarUrl,
        termsAccepted
      });
      onSuccess?.();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Customer signup failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-shell">
      <style>{`
        /* ═══════════════════════════════════════
           ✦  MODERN BLUE SIGNUP PAGE
           ═══════════════════════════════════════ */
        .signup-shell {
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 40%, #f8fafc 100%);
          position: relative;
          overflow: hidden;
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
        }

        /* Decorative circles */
        .signup-shell::before {
          content: '';
          position: absolute;
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, rgba(30,58,138,0.06) 0%, transparent 70%);
          top: -210px;
          right: -210px;
          border-radius: 50%;
          pointer-events: none;
        }

        .signup-shell::after {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%);
          bottom: -250px;
          left: -250px;
          border-radius: 50%;
          pointer-events: none;
        }

        .signup-layout {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1100px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 32px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.15), 0 0 0 0.5px rgba(148,163,184,0.2);
          display: flex;
          transition: all 0.3s ease;
        }

        .signup-layout:hover {
          box-shadow: 0 30px 60px -14px rgba(15, 23, 42, 0.2), 0 0 0 0.5px rgba(148,163,184,0.25);
        }

        /* Illustration Section */
        .signup-illustration {
          flex: 1;
          padding: 48px 32px;
          background: linear-gradient(135deg, rgba(30,58,138,0.03) 0%, rgba(59,130,246,0.06) 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
        }

        .signup-illustration h2 {
          margin: 0 0 16px;
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .signup-illustration p {
          margin: 0 0 32px;
          color: #475569;
          font-size: 16px;
          line-height: 1.6;
          font-weight: 500;
        }

        .illus-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          margin-top: 20px;
        }

        .illus-media {
          width: 100%;
          max-width: 360px;
          min-height: 220px;
          filter: drop-shadow(0 10px 24px rgba(30,58,138,0.08));
          transition: transform 0.3s ease;
        }

        .signup-layout:hover .illus-media {
          transform: translateY(-5px);
        }

        /* Form Section */
        .signup-form {
          flex: 1;
          padding: 48px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #ffffff;
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
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .sub {
          margin: 0 0 28px;
          color: #64748b;
          font-size: 15px;
          font-weight: 500;
        }

        /* Fields Grid */
        .fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 8px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
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

        .field input:hover,
        .field textarea:hover {
          border-color: #cbd5e1;
          background: #ffffff;
        }

        .field input:focus,
        .field textarea:focus {
          border-color: #1e3a8a;
          box-shadow: 0 0 0 5px rgba(30,58,138,0.08), 0 2px 8px rgba(0,0,0,0.02);
          background: #ffffff;
        }

        .field input.input-error,
        .field textarea.input-error {
          border-color: #ef4444;
          box-shadow: 0 0 0 5px rgba(239,68,68,0.07);
          background: #fffbfb;
          animation: shake 0.4s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }

        .inline-error {
          margin-top: -2px;
          font-size: 11.5px;
          color: #dc2626;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
          animation: fadeSlide 0.25s ease;
        }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Avatar Picker */
        .avatar-picker {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
          margin-top: 4px;
        }

        .avatar-option {
          border: 2.5px solid #eef2ff;
          background: white;
          border-radius: 18px;
          padding: 5px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
        }

        .avatar-option:hover {
          border-color: #93c5fd;
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(59,130,246,0.12);
        }

        .avatar-option:active {
          transform: scale(0.94);
        }

        .avatar-option img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 12px;
          display: block;
        }

        .avatar-option.active {
          border-color: #1e3a8a;
          background: #eff6ff;
          box-shadow: 0 0 0 5px rgba(30,58,138,0.15), 0 4px 12px rgba(30,58,138,0.1);
          transform: scale(0.96);
          position: relative;
        }

        .avatar-option.active::after {
          content: '✓';
          position: absolute;
          top: -7px;
          right: -7px;
          width: 22px;
          height: 22px;
          background: #1e3a8a;
          color: white;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(30,58,138,0.3);
          border: 2px solid white;
        }

        /* Password Strength */
        .password-strength {
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .password-strength-track {
          flex: 1;
          height: 7px;
          border-radius: 999px;
          background: #e5e7eb;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.06);
        }

        .password-strength-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .password-strength-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shine 2s ease-in-out infinite;
        }

        @keyframes shine {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        .password-strength-label {
          font-size: 11px;
          font-weight: 700;
          min-width: 56px;
          text-align: right;
          letter-spacing: 0.02em;
        }

        /* Terms */
        .terms {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 16px 0 8px;
          color: #374151;
          font-weight: 500;
          font-size: 14px;
          line-height: 1.5;
        }

        .terms input {
          margin-top: 2px;
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #1e3a8a;
        }

        .terms label {
          cursor: pointer;
        }

        /* Actions */
        .actions {
          display: flex;
          gap: 16px;
          margin-top: 24px;
        }

        .btn {
          flex: 1;
          border-radius: 40px;
          padding: 14px 24px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          border: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: -0.01em;
        }

        .btn.primary {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          color: white;
          box-shadow: 0 4px 14px -4px rgba(30,58,138,0.3), 0 0 0 0 rgba(30,58,138,0);
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

        /* Error Message */
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

        /* Responsive */
        @media (max-width: 920px) {
          .signup-shell {
            padding: 20px 16px;
          }
          .signup-layout {
            flex-direction: column;
            max-width: 600px;
          }
          .signup-illustration {
            padding: 32px 28px;
          }
          .signup-form {
            padding: 32px 28px;
          }
          .fields {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .avatar-picker {
            grid-template-columns: repeat(3, 1fr);
          }
          .signup-illustration h2 {
            font-size: 26px;
          }
          .illus-media {
            max-width: 300px;
            min-height: 180px;
          }
        }

        @media (max-width: 480px) {
          .signup-shell {
            padding: 12px 8px;
          }
          .signup-illustration,
          .signup-form {
            padding: 24px 18px;
          }
          .btn {
            padding: 12px 18px;
          }
          .top-links {
            flex-direction: column;
            align-items: flex-start;
          }
          .illus-media {
            max-width: 260px;
            min-height: 160px;
          }
        }
      `}</style>

      <div className="signup-layout">
        {/* Illustration Section */}
        <aside className="signup-illustration">
          <h2>Welcome to ServiceHub</h2>
          <p>
            Join thousands of satisfied customers who trust us for quality home services.
            Book professionals in minutes, track your appointments, and enjoy peace of mind.
          </p>

          <div className="illus-wrap" aria-hidden="true">
            {welcomeAnimationData ? (
              <Lottie animationData={welcomeAnimationData} loop autoplay className="illus-media" />
            ) : (
              <div className="illus-media" />
            )}
          </div>
        </aside>

        {/* Form Section */}
        <main className="signup-form">
          <div className="top-links">
            {onBackToRoleSelect && (
              <button type="button" className="link-btn" onClick={onBackToRoleSelect}>
                <IconArrowLeft /> Choose a different role
              </button>
            )}
            <button type="button" className="link-btn" onClick={onCancel}>
              <IconX /> Cancel
            </button>
          </div>

          <h3>Create your account</h3>
          <div className="sub">Start your journey with us today</div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="auth-error">
                <IconAlert /> {error}
              </div>
            )}

            <div className="fields">
              {/* Full Name */}
              <div className="field">
                <label>
                  <span className="label-icon"><IconUser /></span> Full name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
                  type="text"
                  placeholder="John Doe"
                  className={touched.fullName && fieldErrors.fullName ? 'input-error' : ''}
                  required
                />
                {touched.fullName && fieldErrors.fullName && (
                  <div className="inline-error">⚠ {fieldErrors.fullName}</div>
                )}
              </div>

              {/* Email */}
              <div className="field">
                <label>
                  <span className="label-icon"><IconMail /></span> Email address
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  type="email"
                  placeholder="john@example.com"
                  className={touched.email && fieldErrors.email ? 'input-error' : ''}
                  required
                />
                {touched.email && fieldErrors.email && (
                  <div className="inline-error">⚠ {fieldErrors.email}</div>
                )}
              </div>

              {/* Phone */}
              <div className="field">
                <label>
                  <span className="label-icon"><IconPhone /></span> Phone number
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                  onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                  type="tel"
                  placeholder="07XXXXXXXX"
                  className={touched.phone && fieldErrors.phone ? 'input-error' : ''}
                  required
                />
                {touched.phone && fieldErrors.phone && (
                  <div className="inline-error">⚠ {fieldErrors.phone}</div>
                )}
              </div>

              {/* City */}
              <div className="field">
                <label>
                  <span className="label-icon"><IconMapPin /></span> City
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, city: true }))}
                  type="text"
                  placeholder="Colombo"
                  className={touched.city && fieldErrors.city ? 'input-error' : ''}
                  required
                />
                {touched.city && fieldErrors.city && (
                  <div className="inline-error">⚠ {fieldErrors.city}</div>
                )}
              </div>

              {/* District */}
              <div className="field">
                <label>
                  <span className="label-icon"><IconMapPin /></span> District
                </label>
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, district: true }))}
                  type="text"
                  list="sl-customer-districts"
                  placeholder="Select district"
                  className={touched.district && fieldErrors.district ? 'input-error' : ''}
                  required
                />
                <datalist id="sl-customer-districts">
                  {sriLankaDistricts.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
                {touched.district && fieldErrors.district && (
                  <div className="inline-error">⚠ {fieldErrors.district}</div>
                )}
              </div>

              {/* Address */}
              <div className="field full">
                <label>
                  <span className="label-icon"><IconMapPin /></span> Address
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, address: true }))}
                  type="text"
                  placeholder="123 Main Street, Apt 4B"
                  className={touched.address && fieldErrors.address ? 'input-error' : ''}
                  required
                />
                {touched.address && fieldErrors.address && (
                  <div className="inline-error">⚠ {fieldErrors.address}</div>
                )}
              </div>

              {/* Avatar Picker */}
              <div className="field full">
                <label>🎨 Profile avatar</label>
                <div className="avatar-picker">
                  {AVATAR_OPTIONS.map((src) => (
                    <button
                      key={src}
                      type="button"
                      className={`avatar-option ${avatarUrl === src ? 'active' : ''}`}
                      onClick={() => setAvatarUrl(src)}
                      aria-label={`Select avatar ${src.replace('/icons/', '').replace('.png', '')}`}
                    >
                      <img src={src} alt="Avatar option" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div className="field">
                <label>
                  <span className="label-icon"><IconLock /></span> Password
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  type="password"
                  placeholder="••••••••"
                  className={touched.password && fieldErrors.password ? 'input-error' : ''}
                  required
                />
                <div className="password-strength">
                  <div className="password-strength-track">
                    <div
                      className="password-strength-fill"
                      style={{
                        width: `${password ? passwordStrength.progress : 0}%`,
                        background: passwordStrength.color,
                      }}
                    />
                  </div>
                  <span className="password-strength-label" style={{ color: password ? passwordStrength.color : '#94a3b8' }}>
                    {password ? passwordStrength.label : '—'}
                  </span>
                </div>
                {touched.password && fieldErrors.password && (
                  <div className="inline-error">⚠ {fieldErrors.password}</div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="field">
                <label>
                  <span className="label-icon"><IconLock /></span> Confirm password
                </label>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                  type="password"
                  placeholder="••••••••"
                  className={touched.confirmPassword && fieldErrors.confirmPassword ? 'input-error' : ''}
                  required
                />
                {touched.confirmPassword && fieldErrors.confirmPassword && (
                  <div className="inline-error">⚠ {fieldErrors.confirmPassword}</div>
                )}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="terms">
              <input
                id="termsAccepted"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                onBlur={() => setTouched((prev) => ({ ...prev, termsAccepted: true }))}
              />
              <label htmlFor="termsAccepted">
                I agree to the <strong>Terms and Conditions</strong> and <strong>Privacy Policy</strong>
              </label>
            </div>
            {touched.termsAccepted && fieldErrors.termsAccepted && (
              <div className="inline-error" style={{ marginTop: -2 }}>⚠ {fieldErrors.termsAccepted}</div>
            )}

            {/* Submit */}
            <div className="actions">
              <button type="submit" className="btn primary" disabled={loading || !canSubmit}>
                {loading ? 'Creating account...' : (
                  <>
                    <IconCheck /> Get Started
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default CustomerSignupPage;