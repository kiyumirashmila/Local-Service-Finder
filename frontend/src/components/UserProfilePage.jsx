import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const AVATAR_OPTIONS = [
  '/icons/1.png',
  '/icons/2.png',
  '/icons/3.png',
  '/icons/4.png',
  '/icons/5.png',
  '/icons/6.png',
];
const fullNameRegex = /^[A-Za-z\s]+$/;
const cityRegex = /^[A-Za-z\s]+$/;
const phoneRegex = /^07\d{8}$/;
const specialCharRegex = /[^A-Za-z0-9]/;

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
   ✦  ICON COMPONENTS (inline SVGs)
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

const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconLock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconEdit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
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

const IconArrowLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const IconAlert = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconSparkles = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

/* ──────────────────────────────────────────────
   ✦  MAIN COMPONENT
   ────────────────────────────────────────────── */
const UserProfilePage = ({ onBack }) => {
  const {
    user,
    isAuthenticated,
    updateCustomerProfileReal,
    changePasswordReal,
    deleteAccountReal,
    logout,
  } = useContext(AuthContext);

  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [touched, setTouched] = useState({
    fullName: false,
    phone: false,
    city: false,
    district: false,
    address: false,
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });
  const [deleting, setDeleting] = useState(false);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const initial = useMemo(() => {
    const fullName = user?.fullName || user?.name || '';
    return {
      fullName,
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      district: user?.district || '',
      avatarUrl: user?.avatar || user?.avatarUrl || AVATAR_OPTIONS[0],
    };
  }, [user]);

  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const canEdit = isAuthenticated && (!user?.role || user?.role === 'customer');
  const wantsPasswordChange = Boolean(
    String(passwordDraft.currentPassword || '').trim() ||
      String(passwordDraft.newPassword || '').trim() ||
      String(passwordDraft.confirmNewPassword || '').trim()
  );

  const fieldErrors = useMemo(() => {
    const errs = {};
    const name = String(draft.fullName || '').trim();
    if (!name) errs.fullName = 'Full name is required.';
    else if (name.length < 3) errs.fullName = 'Full name must be at least 3 characters.';
    else if (!fullNameRegex.test(name))
      errs.fullName = 'Full name can contain letters and spaces only.';

    const ph = String(draft.phone || '').trim();
    if (!ph) errs.phone = 'Phone number is required.';
    else if (!phoneRegex.test(ph))
      errs.phone = 'Use a valid Sri Lankan phone (starts with 07 and 10 digits).';

    const cityValue = String(draft.city || '').trim();
    if (!cityValue) errs.city = 'City is required.';
    else if (!cityRegex.test(cityValue))
      errs.city = 'City can contain letters and spaces only.';

    const distValue = String(draft.district || '').trim();
    if (!distValue) errs.district = 'District is required.';
    else if (!sriLankaDistricts.some((d) => d.toLowerCase() === distValue.toLowerCase())) {
      errs.district = 'Please select a valid Sri Lanka district.';
    }

    const addr = String(draft.address || '').trim();
    if (!addr) errs.address = 'Address is required.';

    if (wantsPasswordChange) {
      if (!passwordDraft.currentPassword)
        errs.currentPassword = 'Current password is required.';
      const np = String(passwordDraft.newPassword || '');
      if (!np) {
        errs.newPassword = 'New password is required.';
      } else if (
        np.length < 8 ||
        !/[A-Z]/.test(np) ||
        !/[a-z]/.test(np) ||
        !/\d/.test(np) ||
        !specialCharRegex.test(np)
      ) {
        errs.newPassword =
          'New password must be 8+ chars and include uppercase, lowercase, number, and special character.';
      }
      if (!passwordDraft.confirmNewPassword)
        errs.confirmNewPassword = 'Confirm new password is required.';
      else if (passwordDraft.confirmNewPassword !== passwordDraft.newPassword) {
        errs.confirmNewPassword = 'Confirm new password must match New password.';
      }
    }

    return errs;
  }, [draft, passwordDraft, wantsPasswordChange]);

  const canSave = useMemo(() => Object.keys(fieldErrors).length === 0, [fieldErrors]);
  const newPasswordStrength = useMemo(
    () => getPasswordStrength(passwordDraft.newPassword),
    [passwordDraft.newPassword]
  );

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    try {
      setError('');
      setSuccessMessage('');
      setDeleting(true);
      await deleteAccountReal();
      window.location.hash = 'home';
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to delete account.';
      setError(msg);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!canSave) {
      setTouched({
        fullName: true,
        phone: true,
        city: true,
        district: true,
        address: true,
        currentPassword: true,
        newPassword: true,
        confirmNewPassword: true,
      });
      setError('Please correct the highlighted fields.');
      return;
    }

    try {
      setSaving(true);
      await updateCustomerProfileReal({
        fullName: draft.fullName,
        phone: draft.phone,
        address: draft.address,
        city: draft.city,
        district: draft.district,
        avatarUrl: draft.avatarUrl,
      });
      if (wantsPasswordChange) {
        await changePasswordReal({
          currentPassword: passwordDraft.currentPassword,
          newPassword: passwordDraft.newPassword,
          confirmNewPassword: passwordDraft.confirmNewPassword,
        });
      }
      setEditMode(false);
      setPasswordDraft({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setSuccessMessage(
        wantsPasswordChange
          ? 'Profile and password updated successfully!'
          : 'Profile updated successfully!'
      );
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update profile.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role) => {
    const roleStr = String(role || 'customer').toLowerCase();
    const config = {
      admin: { bg: '#fef3c7', color: '#92400e', label: 'Admin' },
      manager: { bg: '#dbeafe', color: '#1e40af', label: 'Manager' },
      customer: { bg: '#dcfce7', color: '#166534', label: 'Customer' },
      staff: { bg: '#ede9fe', color: '#5b21b6', label: 'Staff' },
    };
    return config[roleStr] || config.customer;
  };

  return (
    <div className="profile-shell">
      <style>{`
        /* ═══════════════════════════════════════
           ✦  GLOBAL RESET & BASE
           ═══════════════════════════════════════ */
        .profile-shell *,
        .profile-shell *::before,
        .profile-shell *::after {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .profile-shell {
          min-height: calc(100vh - 80px);
          padding: 32px 20px 48px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          background: linear-gradient(180deg, #f0f4ff 0%, #f8fafc 30%, #ffffff 100%);
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* Subtle background decoration */
        .profile-shell::before {
          content: '';
          position: fixed;
          top: -120px;
          right: -120px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(30,58,138,0.04) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }

        .profile-shell::after {
          content: '';
          position: fixed;
          bottom: -80px;
          left: -80px;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }

        /* ═══════════════════════════════════════
           ✦  MAIN CARD
           ═══════════════════════════════════════ */
        .profile-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1024px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 28px;
          box-shadow:
            0 4px 6px -1px rgba(0,0,0,0.02),
            0 10px 15px -3px rgba(0,0,0,0.04),
            0 24px 48px -12px rgba(15,23,42,0.08),
            0 0 0 0.5px rgba(148,163,184,0.15);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .profile-card:hover {
          box-shadow:
            0 4px 6px -1px rgba(0,0,0,0.03),
            0 10px 15px -3px rgba(0,0,0,0.06),
            0 28px 56px -14px rgba(15,23,42,0.12),
            0 0 0 0.5px rgba(148,163,184,0.2);
        }

        /* ═══════════════════════════════════════
           ✦  HEADER SECTION
           ═══════════════════════════════════════ */
        .profile-head {
          padding: 28px 36px;
          background: linear-gradient(135deg, #ffffff 0%, #f8faff 50%, #eff6ff 100%);
          border-bottom: 1px solid rgba(226,232,240,0.7);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          position: relative;
          overflow: hidden;
        }

        .profile-head::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #1e3a8a, #3b82f6, #60a5fa, #3b82f6, #1e3a8a);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
          opacity: 0.5;
        }

        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .profile-title-group {
          display: flex;
          align-items: center;
          gap: 20px;
          z-index: 1;
        }

        /* Avatar Container */
        .avatar-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 22px;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow:
            0 8px 24px -6px rgba(30,58,138,0.25),
            0 0 0 3px rgba(255,255,255,0.8),
            0 0 0 5px rgba(59,130,246,0.15);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
        }

        .profile-avatar:hover {
          transform: scale(1.04) translateY(-2px);
          box-shadow:
            0 14px 32px -8px rgba(30,58,138,0.35),
            0 0 0 3px rgba(255,255,255,0.9),
            0 0 0 7px rgba(59,130,246,0.2);
        }

        .profile-avatar.edit-mode-avatar {
          cursor: default;
          animation: pulse-ring 2s ease-in-out infinite;
        }

        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 8px 24px -6px rgba(30,58,138,0.25), 0 0 0 3px rgba(255,255,255,0.8), 0 0 0 5px rgba(59,130,246,0.15); }
          50% { box-shadow: 0 8px 24px -6px rgba(30,58,138,0.25), 0 0 0 3px rgba(255,255,255,0.8), 0 0 0 9px rgba(59,130,246,0.05); }
        }

        .avatar-initials {
          font-size: 30px;
          font-weight: 700;
          color: white;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 0.02em;
          text-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .profile-avatar:hover img {
          transform: scale(1.06);
        }

        .avatar-edit-badge {
          position: absolute;
          bottom: -4px;
          right: -4px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #1e3a8a;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          box-shadow: 0 2px 8px rgba(30,58,138,0.3);
          border: 2px solid white;
          transition: all 0.2s ease;
        }

        .profile-title-text h2 {
          font-size: 1.65rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #0f172a;
          margin: 0 0 2px;
          line-height: 1.2;
        }

        .profile-title-text .email-display {
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .profile-title-text .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 3px 10px;
          border-radius: 999px;
          margin-top: 6px;
        }

        /* Action Buttons */
        .profile-head-actions {
          display: flex;
          gap: 10px;
          z-index: 1;
          flex-wrap: wrap;
        }

        .btn {
          border-radius: 40px;
          padding: 10px 20px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          border: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          background: transparent;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
          letter-spacing: -0.01em;
          position: relative;
          overflow: hidden;
        }

        .btn::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.25s;
        }

        .btn:active {
          transform: scale(0.96);
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

        .btn.primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
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

        .btn.danger {
          background: #fff;
          border: 1.5px solid #fecaca;
          color: #dc2626;
        }

        .btn.danger:hover {
          background: #fef2f2;
          border-color: #ef4444;
          box-shadow: 0 4px 14px rgba(239,68,68,0.12);
        }

        .btn.icon-only {
          width: 40px;
          height: 40px;
          padding: 0;
          border-radius: 50%;
          justify-content: center;
        }

        /* ═══════════════════════════════════════
           ✦  BODY SECTION
           ═══════════════════════════════════════ */
        .profile-body {
          padding: 32px 36px;
        }

        /* ═══════════════════════════════════════
           ✦  FORM GRID
           ═══════════════════════════════════════ */
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px 28px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field label {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
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
          background: #fff;
        }

        .field input:focus,
        .field textarea:focus {
          border-color: #1e3a8a;
          box-shadow: 0 0 0 5px rgba(30,58,138,0.08), 0 2px 8px rgba(0,0,0,0.02);
          background: #fff;
          outline: none;
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
          margin-top: 2px;
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

        .field input:disabled {
          background: #f1f5f9;
          color: #64748b;
          cursor: not-allowed;
          border-style: dashed;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field small {
          font-size: 0.7rem;
          color: #64748b;
          margin-top: 2px;
          font-weight: 500;
        }

        /* ═══════════════════════════════════════
           ✦  PASSWORD STRENGTH
           ═══════════════════════════════════════ */
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

        /* ═══════════════════════════════════════
           ✦  AVATAR PICKER
           ═══════════════════════════════════════ */
        .avatar-picker {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
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

        /* ═══════════════════════════════════════
           ✦  INFO SECTIONS (view mode)
           ═══════════════════════════════════════ */
        .info-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .info-section {
          background: #fefefe;
          border-radius: 20px;
          padding: 24px 28px;
          border: 1px solid #edf2f7;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }

        .info-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, #1e3a8a, #3b82f6);
          border-radius: 0 4px 4px 0;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .info-section:hover {
          border-color: #e2e8f0;
          box-shadow: 0 8px 24px -10px rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }

        .info-section:hover::before {
          opacity: 1;
        }

        .info-section.danger-zone {
          border-color: #fecaca;
          background: #fffbfb;
        }

        .info-section.danger-zone::before {
          background: linear-gradient(180deg, #ef4444, #dc2626);
        }

        .info-section h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 18px;
          padding-bottom: 10px;
          border-bottom: 2px solid #eef2ff;
          display: flex;
          align-items: center;
          gap: 8px;
          letter-spacing: -0.02em;
        }

        .info-section h3 .section-icon {
          color: #1e3a8a;
        }

        .info-section.danger-zone h3 .section-icon {
          color: #ef4444;
        }

        .kv {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 10px 20px;
          align-items: baseline;
          padding: 5px 0;
        }

        .kv .k {
          color: #64748b;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .kv .v {
          font-weight: 500;
          color: #1e293b;
          font-size: 0.925rem;
          word-break: break-word;
        }

        .kv .v.muted {
          color: #94a3b8;
          font-style: italic;
        }

        /* ═══════════════════════════════════════
           ✦  MESSAGES
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

        .success-message {
          background: #f0fdf4;
          border-left: 4px solid #22c55e;
          color: #15803d;
          border-radius: 16px;
          padding: 14px 20px;
          font-weight: 500;
          font-size: 0.85rem;
          margin-bottom: 22px;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: fadeSlide 0.3s ease;
          box-shadow: 0 2px 8px rgba(34,197,94,0.06);
        }

        /* ═══════════════════════════════════════
           ✦  FORM ACTIONS
           ═══════════════════════════════════════ */
        .form-actions {
          display: flex;
          gap: 14px;
          margin-top: 32px;
          justify-content: flex-end;
          border-top: 1px solid #edf2f7;
          padding-top: 24px;
        }

        /* ═══════════════════════════════════════
           ✦  EMPTY / LOCKED STATE
           ═══════════════════════════════════════ */
        .empty-state {
          text-align: center;
          padding: 56px 24px;
          background: #fafcff;
          border-radius: 24px;
          border: 2px dashed #e2e8f0;
        }

        .empty-state-icon {
          font-size: 52px;
          margin-bottom: 16px;
          display: inline-block;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .empty-state h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 6px;
        }

        .empty-state p {
          color: #64748b;
          font-weight: 500;
          font-size: 0.9rem;
        }

        /* ═══════════════════════════════════════
           ✦  DELETE CONFIRMATION
           ═══════════════════════════════════════ */
        .delete-confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .delete-confirm-dialog {
          background: white;
          border-radius: 24px;
          padding: 32px;
          max-width: 440px;
          width: 90%;
          box-shadow: 0 24px 48px rgba(0,0,0,0.2);
          text-align: center;
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .delete-confirm-dialog .warning-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .delete-confirm-dialog h2 {
          color: #0f172a;
          margin-bottom: 8px;
          font-size: 1.3rem;
        }

        .delete-confirm-dialog p {
          color: #64748b;
          font-size: 0.9rem;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .delete-confirm-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        /* ═══════════════════════════════════════
           ✦  RESPONSIVE
           ═══════════════════════════════════════ */
        @media (max-width: 768px) {
          .profile-shell {
            padding: 16px 10px 32px;
          }
          .profile-head {
            padding: 20px 18px;
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }
          .profile-title-group {
            width: 100%;
          }
          .profile-head-actions {
            width: 100%;
            flex-wrap: wrap;
          }
          .profile-head-actions .btn {
            flex: 1;
            min-width: 100px;
            justify-content: center;
          }
          .profile-body {
            padding: 20px 18px;
          }
          .grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .kv {
            grid-template-columns: 1fr;
            gap: 4px;
          }
          .avatar-picker {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          .profile-avatar {
            width: 64px;
            height: 64px;
            border-radius: 18px;
          }
          .avatar-initials {
            font-size: 24px;
          }
          .profile-title-text h2 {
            font-size: 1.3rem;
          }
        }

        @media (max-width: 480px) {
          .avatar-picker {
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
          }
          .avatar-option {
            border-radius: 14px;
            padding: 3px;
          }
          .avatar-option img {
            border-radius: 10px;
          }
          .form-actions {
            flex-direction: column;
            gap: 10px;
          }
          .form-actions .btn {
            width: 100%;
            justify-content: center;
          }
        }

        /* ═══════════════════════════════════════
           ✦  SCROLLBAR STYLING
           ═══════════════════════════════════════ */
        .profile-shell ::-webkit-scrollbar {
          width: 6px;
        }
        .profile-shell ::-webkit-scrollbar-track {
          background: transparent;
        }
        .profile-shell ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }
        .profile-shell ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="warning-icon">⚠️</div>
            <h2>Delete Account?</h2>
            <p>
              This action is <strong>permanent</strong> and cannot be undone.
              Your profile, bookings, and all associated data will be permanently removed.
            </p>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <IconX /> Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{ background: deleting ? '#ef4444' : undefined, color: deleting ? '#fff' : undefined }}
              >
                {deleting ? 'Deleting…' : (
                  <>
                    <IconTrash /> Yes, delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Card ─── */}
      <div className="profile-card">
        {/* Header */}
        <div className="profile-head">
          <div className="profile-title-group">
            <div className="avatar-wrapper">
              <div
                className={`profile-avatar ${editMode ? 'edit-mode-avatar' : ''}`}
                onMouseEnter={() => setAvatarHovered(true)}
                onMouseLeave={() => setAvatarHovered(false)}
              >
                {user?.avatar || user?.avatarUrl || (editMode && draft.avatarUrl !== AVATAR_OPTIONS[0]) ? (
                  <img
                    src={editMode ? draft.avatarUrl : user?.avatar || user?.avatarUrl || initial.avatarUrl}
                    alt="User avatar"
                  />
                ) : (
                  <div className="avatar-initials">
                    {initial.fullName ? getInitials(initial.fullName) : '👤'}
                  </div>
                )}
                {editMode && (
                  <div className="avatar-edit-badge">
                    <IconEdit />
                  </div>
                )}
              </div>
            </div>
            <div className="profile-title-text">
              <h2>{initial.fullName || 'My Profile'}</h2>
              <span className="email-display">
                <IconMail /> {user?.email || 'Customer dashboard'}
              </span>
              {user?.role && (
                <span
                  className="role-badge"
                  style={{
                    background: getRoleBadge(user.role).bg,
                    color: getRoleBadge(user.role).color,
                  }}
                >
                  <IconShield /> {getRoleBadge(user.role).label}
                </span>
              )}
            </div>
          </div>

          <div className="profile-head-actions">
            <button type="button" className="btn ghost" onClick={onBack}>
              <IconArrowLeft /> Back
            </button>
            {canEdit && !editMode && (
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setError('');
                  setSuccessMessage('');
                  setTouched({
                    fullName: false,
                    phone: false,
                    city: false,
                    district: false,
                    address: false,
                    currentPassword: false,
                    newPassword: false,
                    confirmNewPassword: false,
                  });
                  setEditMode(true);
                }}
              >
                <IconEdit /> Edit profile
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="profile-body">
          {!isAuthenticated ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <h3>Access Restricted</h3>
              <p>Please sign in to view and manage your profile.</p>
            </div>
          ) : user?.role && user.role !== 'customer' ? (
            <div className="info-section">
              <h3>
                <span className="section-icon"><IconUser /></span>
                Account overview
              </h3>
              <div className="kv">
                <div className="k">Role</div>
                <div className="v">
                  <span
                    className="role-badge"
                    style={{
                      background: getRoleBadge(user.role).bg,
                      color: getRoleBadge(user.role).color,
                      padding: '4px 12px',
                      borderRadius: 999,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {getRoleBadge(user.role).label}
                  </span>
                </div>
                <div className="k">Email</div>
                <div className="v">{user?.email || '-'}</div>
                <div className="k">Note</div>
                <div className="v muted">Profile editing is available for customer accounts only.</div>
              </div>
            </div>
          ) : !editMode ? (
            /* ─── VIEW MODE ─── */
            <div className="info-grid">
              <div className="info-section">
                <h3>
                  <span className="section-icon"><IconUser /></span>
                  Personal details
                </h3>
                <div className="kv">
                  <div className="k">Full name</div>
                  <div className="v">{initial.fullName || <span className="muted">Not set</span>}</div>
                  <div className="k">Email</div>
                  <div className="v">{user?.email || '-'}</div>
                  <div className="k">Phone</div>
                  <div className="v">{initial.phone || <span className="muted">Not set</span>}</div>
                </div>
              </div>
              <div className="info-section">
                <h3>
                  <span className="section-icon"><IconMapPin /></span>
                  Address
                </h3>
                <div className="kv">
                  <div className="k">Address</div>
                  <div className="v">{initial.address || <span className="muted">Not set</span>}</div>
                  <div className="k">City</div>
                  <div className="v">{initial.city || <span className="muted">Not set</span>}</div>
                  <div className="k">District</div>
                  <div className="v">{initial.district || <span className="muted">Not set</span>}</div>
                </div>
              </div>
              <div className="info-section danger-zone">
                <h3>
                  <span className="section-icon" style={{ color: '#ef4444' }}><IconAlert /></span>
                  Danger zone
                </h3>
                <p style={{ margin: '0 0 14px', color: '#991b1b', fontWeight: 600, fontSize: 13, lineHeight: 1.5 }}>
                  Deleting your account will permanently remove your customer profile and all associated bookings data.
                </p>
                <button
                  type="button"
                  className="btn danger"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  style={{
                    borderRadius: 999,
                    padding: '9px 18px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                  }}
                >
                  {deleting ? (
                    'Deleting account…'
                  ) : (
                    <>
                      <IconTrash /> Delete my account
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ─── EDIT MODE ─── */
            <form onSubmit={handleSave}>
              {error && (
                <div className="auth-error">
                  <IconAlert /> {error}
                </div>
              )}
              {successMessage && (
                <div className="success-message">
                  <IconSparkles /> {successMessage}
                </div>
              )}

              <div className="grid">
                {/* Full Name */}
                <div className="field">
                  <label>
                    <span className="label-icon"><IconUser /></span> Full name
                  </label>
                  <input
                    value={draft.fullName}
                    onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                    type="text"
                    placeholder="Your full name"
                    className={touched.fullName && fieldErrors.fullName ? 'input-error' : ''}
                    required
                  />
                  {touched.fullName && fieldErrors.fullName && (
                    <div className="inline-error">⚠ {fieldErrors.fullName}</div>
                  )}
                </div>

                {/* Email (disabled) */}
                <div className="field">
                  <label>
                    <span className="label-icon"><IconMail /></span> Email
                  </label>
                  <input value={user?.email || ''} disabled placeholder="Email address" />
                  <small>Email cannot be changed</small>
                </div>

                {/* Phone */}
                <div className="field">
                  <label>
                    <span className="label-icon"><IconPhone /></span> Phone number
                  </label>
                  <input
                    value={draft.phone}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10),
                      }))
                    }
                    onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
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
                    value={draft.city}
                    onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, city: true }))}
                    type="text"
                    placeholder="e.g., Colombo"
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
                    value={draft.district}
                    onChange={(e) => setDraft((d) => ({ ...d, district: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, district: true }))}
                    type="text"
                    placeholder="Select your district"
                    list="sl-districts"
                    className={touched.district && fieldErrors.district ? 'input-error' : ''}
                    required
                  />
                  <datalist id="sl-districts">
                    {sriLankaDistricts.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                  {touched.district && fieldErrors.district && (
                    <div className="inline-error">⚠ {fieldErrors.district}</div>
                  )}
                </div>

                {/* Street Address */}
                <div className="field full">
                  <label>
                    <span className="label-icon"><IconMapPin /></span> Street address
                  </label>
                  <input
                    value={draft.address}
                    onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                    type="text"
                    placeholder="Street, building, apartment"
                    className={touched.address && fieldErrors.address ? 'input-error' : ''}
                    required
                  />
                  {touched.address && fieldErrors.address && (
                    <div className="inline-error">⚠ {fieldErrors.address}</div>
                  )}
                </div>

                {/* Avatar Picker */}
                <div className="field full">
                  <label>🎨 Avatar style</label>
                  <div className="avatar-picker">
                    {AVATAR_OPTIONS.map((src) => (
                      <button
                        key={src}
                        type="button"
                        className={`avatar-option ${draft.avatarUrl === src ? 'active' : ''}`}
                        onClick={() => setDraft((d) => ({ ...d, avatarUrl: src }))}
                        aria-label={`Choose avatar ${src}`}
                      >
                        <img src={src} alt="avatar preset" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Password Change Section */}
                <div className="field full" style={{ marginTop: 8 }}>
                  <label>
                    <span className="label-icon"><IconLock /></span> Change password <small>(optional)</small>
                  </label>
                  <small style={{ marginTop: 0 }}>Fill in only if you wish to update your password</small>
                </div>

                {/* Current Password */}
                <div className="field">
                  <label>Current password</label>
                  <input
                    value={passwordDraft.currentPassword}
                    onChange={(e) =>
                      setPasswordDraft((p) => ({ ...p, currentPassword: e.target.value }))
                    }
                    onBlur={() => setTouched((t) => ({ ...t, currentPassword: true }))}
                    type="password"
                    placeholder="••••••••"
                  />
                  {touched.currentPassword && fieldErrors.currentPassword && (
                    <div className="inline-error">⚠ {fieldErrors.currentPassword}</div>
                  )}
                </div>

                {/* New Password */}
                <div className="field">
                  <label>New password</label>
                  <input
                    value={passwordDraft.newPassword}
                    onChange={(e) =>
                      setPasswordDraft((p) => ({ ...p, newPassword: e.target.value }))
                    }
                    onBlur={() => setTouched((t) => ({ ...t, newPassword: true }))}
                    type="password"
                    placeholder="Min. 8 with uppercase/lowercase/number/special"
                    className={touched.newPassword && fieldErrors.newPassword ? 'input-error' : ''}
                  />
                  <div className="password-strength">
                    <div className="password-strength-track">
                      <div
                        className="password-strength-fill"
                        style={{
                          width: `${passwordDraft.newPassword ? newPasswordStrength.progress : 0}%`,
                          background: newPasswordStrength.color,
                        }}
                      />
                    </div>
                    <span
                      className="password-strength-label"
                      style={{ color: passwordDraft.newPassword ? newPasswordStrength.color : '#94a3b8' }}
                    >
                      {passwordDraft.newPassword ? newPasswordStrength.label : '—'}
                    </span>
                  </div>
                  {touched.newPassword && fieldErrors.newPassword && (
                    <div className="inline-error">⚠ {fieldErrors.newPassword}</div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className="field">
                  <label>Confirm new password</label>
                  <input
                    value={passwordDraft.confirmNewPassword}
                    onChange={(e) =>
                      setPasswordDraft((p) => ({ ...p, confirmNewPassword: e.target.value }))
                    }
                    onBlur={() => setTouched((t) => ({ ...t, confirmNewPassword: true }))}
                    type="password"
                    placeholder="Repeat new password"
                    className={
                      touched.confirmNewPassword && fieldErrors.confirmNewPassword
                        ? 'input-error'
                        : ''
                    }
                  />
                  {touched.confirmNewPassword && fieldErrors.confirmNewPassword && (
                    <div className="inline-error">⚠ {fieldErrors.confirmNewPassword}</div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setError('');
                    setSuccessMessage('');
                    setDraft(initial);
                    setPasswordDraft({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
                    setTouched({
                      fullName: false,
                      phone: false,
                      city: false,
                      district: false,
                      address: false,
                      currentPassword: false,
                      newPassword: false,
                      confirmNewPassword: false,
                    });
                    setEditMode(false);
                  }}
                  disabled={saving}
                >
                  <IconX /> Cancel
                </button>
                <button type="submit" className="btn primary" disabled={saving || !canSave}>
                  {saving ? (
                    'Saving…'
                  ) : (
                    <>
                      <IconCheck /> Save changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;