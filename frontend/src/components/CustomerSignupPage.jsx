import React, { useContext, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const AVATAR_OPTIONS = ['/icons/1.png', '/icons/2.png', '/icons/3.png', '/icons/4.png', '/icons/5.png', '/icons/6.png'];

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

  if (score <= 2) return { label: 'Weak', tone: 'weak', progress: 33 };
  if (score <= 4) return { label: 'Medium', tone: 'medium', progress: 66 };
  return { label: 'Strong', tone: 'strong', progress: 100 };
};

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
        /* Reset & Base */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .signup-shell {
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          background: linear-gradient(145deg, #fef9f4 0%, #ffffff 100%);
          position: relative;
          overflow: hidden;
        }

        /* Animated Background Elements */
        .signup-shell::before {
          content: '';
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(249,115,22,0.08) 0%, rgba(249,115,22,0) 70%);
          top: -200px;
          right: -200px;
          border-radius: 50%;
          pointer-events: none;
        }

        .signup-shell::after {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(249,115,22,0.05) 0%, rgba(249,115,22,0) 70%);
          bottom: -250px;
          left: -250px;
          border-radius: 50%;
          pointer-events: none;
        }

        /* Main Card */
        .signup-layout {
          width: 100%;
          max-width: 1100px;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(0px);
          border-radius: 32px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.02);
          display: flex;
          transition: transform 0.3s ease;
          position: relative;
          z-index: 1;
        }

        /* Illustration Section */
        .signup-illustration {
          flex: 1;
          padding: 48px 32px;
          background: linear-gradient(135deg, rgba(249,115,22,0.03) 0%, rgba(249,115,22,0.08) 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
        }

        .signup-illustration h2 {
          margin: 0 0 16px;
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
        }

        .signup-illustration p {
          margin: 0 0 32px;
          color: #6b7280;
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

        .illus-wrap svg {
          filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.05));
          transition: transform 0.3s ease;
        }

        .signup-layout:hover .illus-wrap svg {
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
        }

        .link-btn {
          border: none;
          background: transparent;
          font-weight: 600;
          color: #f97316;
          cursor: pointer;
          padding: 8px 12px;
          font-size: 14px;
          transition: all 0.2s ease;
          border-radius: 12px;
        }

        .link-btn:hover {
          background: rgba(249,115,22,0.1);
          transform: translateX(-2px);
        }

        .signup-form h3 {
          margin: 0 0 8px;
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .sub {
          margin: 0 0 28px;
          color: #6b7280;
          font-size: 15px;
          font-weight: 500;
        }

        /* Form Fields */
        .fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 8px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          font-weight: 600;
          font-size: 13px;
          color: #374151;
          letter-spacing: 0.01em;
          text-transform: uppercase;
        }

        .field input,
        .field textarea {
          width: 100%;
          padding: 12px 16px;
          border-radius: 16px;
          border: 1.5px solid #e5e7eb;
          outline: none;
          font-size: 15px;
          font-weight: 500;
          transition: all 0.2s ease;
          background: #fafbfc;
          font-family: inherit;
        }

        .avatar-picker {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
          margin-top: 4px;
        }

        .avatar-option {
          border: 2px solid #e5e7eb;
          background: #fff;
          border-radius: 14px;
          padding: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .avatar-option img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          border-radius: 10px;
          display: block;
        }

        .avatar-option.active {
          border-color: #f97316;
          box-shadow: 0 0 0 4px rgba(249,115,22,0.12);
        }

        .field input:hover,
        .field textarea:hover {
          border-color: #d1d5db;
          background: #ffffff;
        }

        .field input:focus,
        .field textarea:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 4px rgba(249,115,22,0.1);
          background: #ffffff;
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

        .password-strength-fill.weak {
          background: #ef4444;
        }

        .password-strength-fill.medium {
          background: #f59e0b;
        }

        .password-strength-fill.strong {
          background: #16a34a;
        }

        .password-strength-label {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          min-width: 52px;
          text-align: right;
        }

        /* Error Message */
        .auth-error {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border: 1px solid #fecaca;
          color: #991b1b;
          border-radius: 16px;
          padding: 12px 16px;
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .auth-error::before {
          content: '⚠️';
          font-size: 14px;
        }

        /* Terms Checkbox */
        .terms {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 16px 0 8px;
          color: #374151;
          font-weight: 500;
          font-size: 14px;
        }

        .terms input {
          margin-top: 2px;
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #f97316;
        }

        .terms label {
          cursor: pointer;
          line-height: 1.5;
        }

        /* Actions */
        .actions {
          display: flex;
          gap: 16px;
          margin-top: 24px;
        }

        .btn {
          flex: 1;
          border-radius: 20px;
          padding: 14px 24px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .btn.primary {
          background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
          color: #fff;
          box-shadow: 0 4px 12px rgba(249,115,22,0.25);
        }

        .btn.primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(249,115,22,0.35);
        }

        .btn.primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn.ghost {
          background: #ffffff;
          border: 1.5px solid #e5e7eb;
          color: #374151;
        }

        .btn.ghost:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          transform: translateY(-1px);
        }

        /* Responsive Design */
        @media (max-width: 920px) {
          .signup-shell {
            padding: 20px 16px;
          }
          
          .signup-layout {
            flex-direction: column;
            max-width: 600px;
          }
          
          .signup-illustration {
            border-bottom: 1px solid rgba(229,231,235,1);
            padding: 32px 28px;
          }
          
          .signup-form {
            padding: 32px 28px;
          }
          
          .fields {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          
          .signup-illustration h2 {
            font-size: 28px;
          }
        }

        @media (max-width: 480px) {
          .signup-form {
            padding: 24px 20px;
          }
          
          .signup-illustration {
            padding: 24px 20px;
          }
          
          .btn {
            padding: 12px 20px;
          }
        }

        /* Loading Animation */
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .btn.primary:disabled {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="signup-layout">
        <aside className="signup-illustration">
          <h2>Welcome to ServiceHub</h2>
          <p>Join thousands of satisfied customers who trust us for quality home services. Book professionals in minutes, track your appointments, and enjoy peace of mind.</p>

          <div className="illus-wrap" aria-hidden="true">
            <svg width="320" height="220" viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="32" y="28" width="256" height="164" rx="18" fill="rgba(249,115,22,0.08)"/>
              <rect x="52" y="52" width="216" height="20" rx="10" fill="rgba(249,115,22,0.25)"/>
              <rect x="52" y="86" width="120" height="16" rx="8" fill="rgba(17,24,39,0.06)"/>
              <rect x="52" y="112" width="180" height="16" rx="8" fill="rgba(17,24,39,0.06)"/>
              <rect x="52" y="138" width="150" height="16" rx="8" fill="rgba(17,24,39,0.06)"/>
              <path d="M248 76C258 76 266 68 266 58C266 48 258 40 248 40C238 40 230 48 230 58C230 68 238 76 248 76Z" fill="#f97316" fillOpacity="0.35"/>
              <path d="M248 66L248 50" stroke="white" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.8"/>
              <path d="M241 58L255 58" stroke="white" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.8"/>
              <path d="M76 196C76 180 104 166 160 166C216 166 244 180 244 196" stroke="#f97316" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.3"/>
              <circle cx="98" cy="178" r="10" fill="#f97316" fillOpacity="0.25"/>
              <circle cx="224" cy="178" r="10" fill="#f97316" fillOpacity="0.25"/>
            </svg>
          </div>
        </aside>

        <main className="signup-form">
          <div className="top-links">
            {onBackToRoleSelect && (
              <button type="button" className="link-btn" onClick={onBackToRoleSelect}>
                ← Choose a different role
              </button>
            )}
            <button type="button" className="link-btn" onClick={onCancel}>
              Cancel
            </button>
          </div>

          <h3>Create your account</h3>
          <div className="sub">Start your journey with us today</div>

          <form onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="fields">
              <div className="field">
                <label>Full name</label>
                <input 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
                  type="text" 
                  placeholder="John Doe"
                  className={touched.fullName && fieldErrors.fullName ? 'input-error' : ''}
                  required 
                />
                {touched.fullName && fieldErrors.fullName && <div className="inline-error">{fieldErrors.fullName}</div>}
              </div>
              <div className="field">
                <label>Email address</label>
                <input 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  type="email" 
                  placeholder="john@example.com"
                  className={touched.email && fieldErrors.email ? 'input-error' : ''}
                  required 
                />
                {touched.email && fieldErrors.email && <div className="inline-error">{fieldErrors.email}</div>}
              </div>
              <div className="field">
                <label>Phone number</label>
                <input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 10))} 
                  onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
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
                  value={city} 
                  onChange={(e) => setCity(e.target.value)} 
                  onBlur={() => setTouched((prev) => ({ ...prev, city: true }))}
                  type="text" 
                  placeholder="New York"
                  className={touched.city && fieldErrors.city ? 'input-error' : ''}
                  required 
                />
                {touched.city && fieldErrors.city && <div className="inline-error">{fieldErrors.city}</div>}
              </div>
              <div className="field">
                <label>District</label>
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
                {touched.district && fieldErrors.district && <div className="inline-error">{fieldErrors.district}</div>}
              </div>
              <div className="field full">
                <label>Address</label>
                <input 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  onBlur={() => setTouched((prev) => ({ ...prev, address: true }))}
                  type="text" 
                  placeholder="123 Main Street, Apt 4B"
                  className={touched.address && fieldErrors.address ? 'input-error' : ''}
                  required 
                />
                {touched.address && fieldErrors.address && <div className="inline-error">{fieldErrors.address}</div>}
              </div>
              <div className="field full">
                <label>Choose profile avatar</label>
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
              <div className="field">
                <label>Password</label>
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
                      className={`password-strength-fill ${passwordStrength.tone}`}
                      style={{ width: `${password ? passwordStrength.progress : 0}%` }}
                    />
                  </div>
                  <span className="password-strength-label">{password ? passwordStrength.label : '—'}</span>
                </div>
                {touched.password && fieldErrors.password && <div className="inline-error">{fieldErrors.password}</div>}
              </div>
              <div className="field">
                <label>Confirm password</label>
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
                  <div className="inline-error">{fieldErrors.confirmPassword}</div>
                )}
              </div>
            </div>

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
              <div className="inline-error" style={{ marginTop: -2 }}>{fieldErrors.termsAccepted}</div>
            )}

            <div className="actions">
              <button type="submit" className="btn primary" disabled={loading || !canSubmit}>
                {loading ? 'Creating account...' : 'Get Started →'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default CustomerSignupPage;