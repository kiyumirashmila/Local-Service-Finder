import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const AVATAR_OPTIONS = ['/icons/1.png', '/icons/2.png', '/icons/3.png', '/icons/4.png', '/icons/5.png', '/icons/6.png'];
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

  if (score <= 2) return { label: 'Weak', tone: 'weak', progress: 33 };
  if (score <= 4) return { label: 'Medium', tone: 'medium', progress: 66 };
  return { label: 'Strong', tone: 'strong', progress: 100 };
};

const UserProfilePage = ({ onBack }) => {
  const { user, isAuthenticated, updateCustomerProfileReal, changePasswordReal, deleteAccountReal, logout } = useContext(AuthContext);

  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [touched, setTouched] = useState({
    fullName: false,
    phone: false,
    city: false,
    district: false,
    address: false,
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false
  });
  const [deleting, setDeleting] = useState(false);

  const initial = useMemo(() => {
    const fullName = user?.fullName || user?.name || '';
    return {
      fullName,
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      district: user?.district || '',
      avatarUrl: user?.avatar || user?.avatarUrl || AVATAR_OPTIONS[0]
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
    else if (!fullNameRegex.test(name)) errs.fullName = 'Full name can contain letters and spaces only.';

    const ph = String(draft.phone || '').trim();
    if (!ph) errs.phone = 'Phone number is required.';
    else if (!phoneRegex.test(ph)) errs.phone = 'Use a valid Sri Lankan phone (starts with 07 and 10 digits).';

    const cityValue = String(draft.city || '').trim();
    if (!cityValue) errs.city = 'City is required.';
    else if (!cityRegex.test(cityValue)) errs.city = 'City can contain letters and spaces only.';

    const distValue = String(draft.district || '').trim();
    if (!distValue) errs.district = 'District is required.';
    else if (!sriLankaDistricts.some((d) => d.toLowerCase() === distValue.toLowerCase())) {
      errs.district = 'Please select a valid Sri Lanka district.';
    }

    const addr = String(draft.address || '').trim();
    if (!addr) errs.address = 'Address is required.';

    if (wantsPasswordChange) {
      if (!passwordDraft.currentPassword) errs.currentPassword = 'Current password is required.';
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
      if (!passwordDraft.confirmNewPassword) errs.confirmNewPassword = 'Confirm new password is required.';
      else if (passwordDraft.confirmNewPassword !== passwordDraft.newPassword) {
        errs.confirmNewPassword = 'Confirm new password must match New password.';
      }
    }

    return errs;
  }, [draft, passwordDraft, wantsPasswordChange]);

  const canSave = useMemo(() => Object.keys(fieldErrors).length === 0, [fieldErrors]);
  const newPasswordStrength = useMemo(() => getPasswordStrength(passwordDraft.newPassword), [passwordDraft.newPassword]);

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return;
    try {
      setError('');
      setSuccessMessage('');
      setDeleting(true);
      await deleteAccountReal();
      window.location.hash = 'home';
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to delete account.';
      setError(msg);
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
        confirmNewPassword: true
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
        avatarUrl: draft.avatarUrl
      });
      if (wantsPasswordChange) {
        await changePasswordReal({
          currentPassword: passwordDraft.currentPassword,
          newPassword: passwordDraft.newPassword,
          confirmNewPassword: passwordDraft.confirmNewPassword
        });
      }
      setEditMode(false);
      setPasswordDraft({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setSuccessMessage(wantsPasswordChange ? 'Profile and password updated successfully!' : 'Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
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
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="profile-shell">
      <style>{`
        /* ----- MODERN RESET & BASE ----- */
        .profile-shell * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .profile-shell {
          min-height: calc(100vh - 80px);
          padding: 40px 24px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          background: #f8fafc;
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
        }

        /* Main Card — Clean, elevated, subtle border */
        .profile-card {
          width: 100%;
          max-width: 980px;
          background: #ffffff;
          border-radius: 32px;
          box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.02);
          transition: all 0.25s ease;
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.6);
        }

        /* Header — soft gradient, more breathing */
        .profile-head {
          padding: 32px 36px;
          background: linear-gradient(to right, #ffffff, #fefaf5);
          border-bottom: 1px solid #edf2f7;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .profile-title {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        /* Avatar — modern rounded-2xl with soft glow */
        .profile-avatar {
          width: 84px;
          height: 84px;
          border-radius: 24px;
          background: linear-gradient(135deg, #f1f5f9, #e9eef3);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.02);
          transition: transform 0.2s ease, box-shadow 0.2s;
        }

        .profile-card:hover .profile-avatar {
          transform: scale(1.02);
          box-shadow: 0 12px 22px rgba(0, 0, 0, 0.08);
        }

        .avatar-initials {
          font-size: 32px;
          font-weight: 600;
          color: #1e293b;
          background: #fff;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f97316, #f59e0b);
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-title h2 {
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin: 0;
        }

        .profile-title p {
          margin-top: 6px;
          color: #475569;
          font-size: 0.9rem;
          font-weight: 500;
        }

        /* Buttons — modern rounded-xl */
        .btn {
          border-radius: 40px;
          padding: 10px 22px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          border: none;
          transition: all 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1);
          font-family: inherit;
          background: transparent;
        }

        .btn.primary {
          background: #f97316;
          color: white;
          box-shadow: 0 2px 5px rgba(249, 115, 22, 0.2);
        }

        .btn.primary:hover:not(:disabled) {
          background: #ea580c;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(249, 115, 22, 0.25);
        }

        .btn.primary:active {
          transform: translateY(1px);
        }

        .btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn.ghost {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #334155;
        }

        .btn.ghost:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        /* Body */
        .profile-body {
          padding: 36px;
        }

        /* Form Grid — refined spacing */
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px 28px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field label {
          font-weight: 600;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #475569;
        }

        .field input,
        .field textarea {
          width: 100%;
          padding: 12px 16px;
          border-radius: 18px;
          border: 1.5px solid #e2e8f0;
          outline: none;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s;
          background: #ffffff;
          font-family: inherit;
          color: #0f172a;
        }

        .field input:hover,
        .field textarea:hover {
          border-color: #cbd5e1;
        }

        .field input:focus,
        .field textarea:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.12);
        }

        .field input.input-error,
        .field textarea.input-error {
          border-color: #ef4444;
          box-shadow: 0 0 0 4px rgba(239,68,68,0.12);
          background: #fff7f7;
        }

        .inline-error {
          margin-top: -2px;
          font-size: 12px;
          color: #b91c1c;
          font-weight: 600;
        }

        .password-strength {
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .password-strength-track {
          flex: 1;
          height: 6px;
          border-radius: 999px;
          background: #e5e7eb;
          overflow: hidden;
        }
        .password-strength-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.2s ease;
        }
        .password-strength-fill.weak { background: #ef4444; }
        .password-strength-fill.medium { background: #f59e0b; }
        .password-strength-fill.strong { background: #16a34a; }
        .password-strength-label {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          min-width: 52px;
          text-align: right;
        }

        .field input:disabled {
          background: #f1f5f9;
          color: #64748b;
          cursor: not-allowed;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        small {
          font-size: 0.7rem;
          color: #64748b;
          margin-top: 4px;
        }

        /* Avatar Picker — refined grid, modern active state */
        .avatar-picker {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          margin-top: 6px;
        }

        .avatar-option {
          border: 2px solid #eef2ff;
          background: white;
          border-radius: 20px;
          padding: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-option img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 14px;
          display: block;
        }

        .avatar-option.active {
          border-color: #f97316;
          background: #fff7ed;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2);
          transform: scale(0.98);
        }

        /* Info sections — clean cards */
        .info-grid {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .info-section {
          background: #fefefe;
          border-radius: 28px;
          padding: 24px 28px;
          border: 1px solid #edf2f7;
          transition: all 0.2s;
        }

        .info-section:hover {
          border-color: #e2e8f0;
          background: #ffffff;
          box-shadow: 0 6px 12px -8px rgba(0, 0, 0, 0.05);
        }

        .info-section h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #fef3c7;
          display: inline-block;
        }

        .kv {
          display: grid;
          grid-template-columns: 130px 1fr;
          gap: 14px 24px;
          align-items: baseline;
          padding: 6px 0;
        }

        .kv .k {
          color: #5b6e8c;
          font-weight: 600;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .kv .v {
          font-weight: 500;
          color: #1e293b;
          font-size: 0.95rem;
          word-break: break-word;
        }

        /* Messages */
        .auth-error {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          color: #b91c1c;
          border-radius: 20px;
          padding: 14px 20px;
          font-weight: 500;
          font-size: 0.85rem;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .success-message {
          background: #f0fdf4;
          border-left: 4px solid #22c55e;
          color: #15803d;
          border-radius: 20px;
          padding: 14px 20px;
          font-weight: 500;
          font-size: 0.85rem;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-actions {
          display: flex;
          gap: 16px;
          margin-top: 36px;
          justify-content: flex-end;
          border-top: 1px solid #edf2f7;
          padding-top: 28px;
        }

        /* Empty state / role info */
        .empty-state {
          text-align: center;
          padding: 60px 24px;
          background: #fafcff;
          border-radius: 32px;
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 18px;
        }

        .empty-state p {
          color: #475569;
          font-weight: 500;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .profile-shell {
            padding: 20px 16px;
          }
          .profile-head {
            padding: 24px 20px;
            flex-direction: column;
            align-items: stretch;
          }
          .profile-title {
            width: 100%;
          }
          .profile-actions {
            display: flex;
            gap: 12px;
            width: 100%;
          }
          .profile-actions .btn {
            flex: 1;
            text-align: center;
          }
          .profile-body {
            padding: 24px 20px;
          }
          .grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .kv {
            grid-template-columns: 1fr;
            gap: 6px;
          }
          .avatar-picker {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 480px) {
          .profile-avatar {
            width: 70px;
            height: 70px;
          }
          .avatar-initials {
            font-size: 26px;
          }
          .profile-title h2 {
            font-size: 1.4rem;
          }
        }

        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .auth-error, .success-message {
          animation: fadeSlide 0.25s ease;
        }

        .bookings-mini-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .booking-mini {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }
        .booking-mini h4 {
          margin: 0 0 4px;
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
        }
        .booking-mini p {
          margin: 0;
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
        }
        .booking-mini .pill {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 5px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .pill-pending { background: #fef3c7; color: #92400e; }
        .pill-approved { background: #dcfce7; color: #166534; }
        .pill-rejected { background: #fee2e2; color: #991b1b; }
        .bookings-view-all {
          margin-top: 16px;
        }
        .bookings-view-all button {
          border: none;
          background: transparent;
          color: #f97316;
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>

      <div className="profile-card">
        <div className="profile-head">
          <div className="profile-title">
            <div className="profile-avatar">
              {user?.avatar || user?.avatarUrl || (editMode && draft.avatarUrl !== AVATAR_OPTIONS[0]) ? (
                <img src={editMode ? draft.avatarUrl : (user?.avatar || user?.avatarUrl || initial.avatarUrl)} alt="avatar" />
              ) : (
                <div className="avatar-initials">
                  {initial.fullName ? getInitials(initial.fullName) : '👤'}
                </div>
              )}
            </div>
            <div>
              <h2>My Profile</h2>
              <p>{user?.email ? user.email : 'Customer dashboard'}</p>
            </div>
          </div>

          <div className="profile-actions">
            <button type="button" className="btn ghost" onClick={onBack}>
              ← Back
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
                    confirmNewPassword: false
                  });
                  setEditMode(true);
                }}
              >
                ✎ Edit profile
              </button>
            )}
          </div>
        </div>

        <div className="profile-body">
          {!isAuthenticated ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔒</div>
              <p>Please sign in to view your profile.</p>
            </div>
          ) : user?.role && user.role !== 'customer' ? (
            <div className="info-section">
              <h3>Account overview</h3>
              <div className="kv">
                <div className="k">Role</div>
                <div className="v">{user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}</div>
                <div className="k">Email</div>
                <div className="v">{user?.email || '-'}</div>
                <div className="k">Note</div>
                <div className="v">Profile editing is available for customers only</div>
              </div>
            </div>
          ) : !editMode ? (
            <div className="info-grid">
              <div className="info-section">
                <h3>Personal details</h3>
                <div className="kv">
                  <div className="k">Full name</div>
                  <div className="v">{initial.fullName || <span style={{ color: '#94a3b8' }}>Not set</span>}</div>
                  <div className="k">Email</div>
                  <div className="v">{user?.email || '-'}</div>
                  <div className="k">Phone</div>
                  <div className="v">{initial.phone || <span style={{ color: '#94a3b8' }}>Not set</span>}</div>
                </div>
              </div>
              <div className="info-section">
                <h3>Address</h3>
                <div className="kv">
                  <div className="k">Address</div>
                  <div className="v">{initial.address || <span style={{ color: '#94a3b8' }}>Not set</span>}</div>
                  <div className="k">City</div>
                  <div className="v">{initial.city || <span style={{ color: '#94a3b8' }}>Not set</span>}</div>
                  <div className="k">District</div>
                  <div className="v">{initial.district || <span style={{ color: '#94a3b8' }}>Not set</span>}</div>
                </div>
              </div>
              <div className="info-section" style={{ borderColor: '#fee2e2', background: '#fef2f2' }}>
                <h3>Danger zone</h3>
                <p style={{ margin: '0 0 12px', color: '#991b1b', fontWeight: 600, fontSize: 13 }}>
                  Deleting your account will remove your customer profile and bookings data from this app.
                </p>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  style={{
                    borderRadius: 999,
                    padding: '8px 16px',
                    fontWeight: 700,
                    border: '1px solid #ef4444',
                    background: '#ef4444',
                    color: '#fff',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.7 : 1
                  }}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting account…' : 'Delete my account'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              {error && <div className="auth-error">{error}</div>}
              {successMessage && <div className="success-message">{successMessage}</div>}

              <div className="grid">
                <div className="field">
                  <label>Full name</label>
                  <input
                    value={draft.fullName}
                    onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                    type="text"
                    placeholder="Your full name"
                    className={touched.fullName && fieldErrors.fullName ? 'input-error' : ''}
                    required
                  />
                  {touched.fullName && fieldErrors.fullName && <div className="inline-error">{fieldErrors.fullName}</div>}
                </div>
                <div className="field">
                  <label>Email</label>
                  <input value={user?.email || ''} disabled placeholder="Email address" />
                  <small>Email cannot be changed</small>
                </div>
                <div className="field">
                  <label>Phone number</label>
                  <input
                    value={draft.phone}
                    onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10) }))}
                    onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                    type="tel"
                    placeholder="07XXXXXXXX"
                    className={touched.phone && fieldErrors.phone ? 'input-error' : ''}
                    required
                  />
                  {touched.phone && fieldErrors.phone && <div className="inline-error">{fieldErrors.phone}</div>}
                </div>
                <div className="field">
                  <label>City</label>
                  <input
                    value={draft.city}
                    onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, city: true }))}
                    type="text"
                    placeholder="e.g., San Francisco"
                    className={touched.city && fieldErrors.city ? 'input-error' : ''}
                    required
                  />
                  {touched.city && fieldErrors.city && <div className="inline-error">{fieldErrors.city}</div>}
                </div>
                <div className="field">
                  <label>District</label>
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
                  {touched.district && fieldErrors.district && <div className="inline-error">{fieldErrors.district}</div>}
                </div>
                <div className="field full">
                  <label>Street address</label>
                  <input
                    value={draft.address}
                    onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                    type="text"
                    placeholder="Street, building, apartment"
                    className={touched.address && fieldErrors.address ? 'input-error' : ''}
                    required
                  />
                  {touched.address && fieldErrors.address && <div className="inline-error">{fieldErrors.address}</div>}
                </div>
                <div className="field full">
                  <label>Avatar style</label>
                  <div className="avatar-picker">
                    {AVATAR_OPTIONS.map((src) => (
                      <button
                        key={src}
                        type="button"
                        className={`avatar-option ${draft.avatarUrl === src ? 'active' : ''}`}
                        onClick={() => setDraft((d) => ({ ...d, avatarUrl: src }))}
                        aria-label="Choose avatar"
                      >
                        <img src={src} alt="avatar preset" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field full">
                  <label>Change password (optional)</label>
                  <small>Fill in only if you wish to update your password</small>
                </div>
                <div className="field">
                  <label>Current password</label>
                  <input
                    value={passwordDraft.currentPassword}
                    onChange={(e) => setPasswordDraft((p) => ({ ...p, currentPassword: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, currentPassword: true }))}
                    type="password"
                    placeholder="••••••••"
                  />
                  {touched.currentPassword && fieldErrors.currentPassword && (
                    <div className="inline-error">{fieldErrors.currentPassword}</div>
                  )}
                </div>
                <div className="field">
                  <label>New password</label>
                  <input
                    value={passwordDraft.newPassword}
                    onChange={(e) => setPasswordDraft((p) => ({ ...p, newPassword: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, newPassword: true }))}
                    type="password"
                    placeholder="Min. 8 with uppercase/lowercase/number/special"
                    className={touched.newPassword && fieldErrors.newPassword ? 'input-error' : ''}
                  />
                  <div className="password-strength">
                    <div className="password-strength-track">
                      <div
                        className={`password-strength-fill ${newPasswordStrength.tone}`}
                        style={{ width: `${passwordDraft.newPassword ? newPasswordStrength.progress : 0}%` }}
                      />
                    </div>
                    <span className="password-strength-label">
                      {passwordDraft.newPassword ? newPasswordStrength.label : '—'}
                    </span>
                  </div>
                  {touched.newPassword && fieldErrors.newPassword && (
                    <div className="inline-error">{fieldErrors.newPassword}</div>
                  )}
                </div>
                <div className="field">
                  <label>Confirm new password</label>
                  <input
                    value={passwordDraft.confirmNewPassword}
                    onChange={(e) => setPasswordDraft((p) => ({ ...p, confirmNewPassword: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, confirmNewPassword: true }))}
                    type="password"
                    placeholder="Repeat new password"
                    className={touched.confirmNewPassword && fieldErrors.confirmNewPassword ? 'input-error' : ''}
                  />
                  {touched.confirmNewPassword && fieldErrors.confirmNewPassword && (
                    <div className="inline-error">{fieldErrors.confirmNewPassword}</div>
                  )}
                </div>
              </div>

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
                      confirmNewPassword: false
                    });
                    setEditMode(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? 'Saving …' : 'Save changes'}
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