import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { fetchPublicCatalogOptions, fetchGradingConfig } from '../services/api';
import { ensureCatalogDefaults, getCatalog } from '../utils/catalogStore';

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
    const yearsNum = Number(yearsOfExperience);
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
    address,
    bio,
    city,
    district,
    email,
    experienceCertificateFiles,
    fullName,
    phone,
    profilePictureFile,
    category,
    categoryOther,
    allSelectedServices,
    yearsOfExperience,
    monthsOfExperience,
    nic
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
  };

  function getValidationClass(name, value) {
    if (!touched[name]) return '';
    return validateField(name, value) ? 'invalid' : 'valid';
  };

  function handleBlur(name) {
    setTouched(prev => ({ ...prev, [name]: true }));
  };

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
        .signup-shell{
          min-height: calc(100vh - 80px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 28px 16px;
          background: linear-gradient(135deg, rgba(249,115,22,0.14), rgba(255,255,255,1) 55%);
        }
        .signup-layout{
          width: 100%;
          max-width: 980px;
          background: #fff;
          border: 1px solid rgba(229,231,235,1);
          border-radius: 18px;
          overflow:hidden;
          box-shadow: 0 16px 40px rgba(0,0,0,0.08);
        }
        .signup-form{
          padding: 26px 22px;
        }
        .top-links{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .link-btn{
          border:none;
          background:transparent;
          font-weight:1000;
          color:#f97316;
          cursor:pointer;
          padding:0;
        }
        .signup-form h3{
          margin: 0 0 6px;
          font-size: 22px;
          font-weight: 1000;
          color:#111827;
        }
        .sub{
          margin: 0 0 18px;
          color:#6b7280;
          font-weight: 800;
        }
        .section{
          border: 1px solid rgba(229,231,235,1);
          border-radius: 16px;
          padding: 16px;
          margin-top: 14px;
        }
        .section-head{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .section-title{
          font-weight: 1100;
          color:#111827;
          margin:0;
        }
        .fields{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .field{
          display:flex;
          flex-direction:column;
          gap: 6px;
        }
        .field label{
          font-weight: 900;
          font-size: 13px;
          color:#374151;
        }
        .field input,.field select,.field textarea{
          width:100%;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(229,231,235,1);
          outline:none;
          font-size:14px;
          font-weight:800;
          background:#fff;
        }
        .field textarea{
          min-height: 92px;
          resize: vertical;
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
        .cert-preview-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .cert-preview-grid img { width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; }
        .field input:focus,.field select:focus,.field textarea:focus{
          border-color: rgba(249,115,22,0.65);
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }
        .field.full{ grid-column: 1 / -1; }
        .auth-error{
          background:#fee2e2;
          border:1px solid #fecaca;
          color:#991b1b;
          border-radius: 14px;
          padding: 10px 12px;
          font-weight: 900;
          font-size: 13px;
          margin-bottom: 10px;
        }
        .uploader{
          display:flex;
          gap: 12px;
          align-items:flex-start;
          flex-wrap:wrap;
        }
        .upload-preview{
          width: 70px;
          height: 70px;
          border-radius: 16px;
          border: 1px solid rgba(229,231,235,1);
          background: rgba(17,24,39,0.03);
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
        }
        .upload-preview img{ width:100%; height:100%; object-fit:cover; }
        .actions{
          display:flex;
          gap: 12px;
          margin-top: 18px;
        }
        .svc-options{
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 10px 12px;
        }
        .svc-opt{
          display:flex;
          align-items:center;
          gap: 10px;
          font-weight: 800;
          border: 1px solid rgba(229,231,235,1);
          border-radius: 14px;
          padding: 10px 12px;
          background: #fff;
        }
        .svc-opt input{
          width: 18px;
          height: 18px;
          flex: 0 0 auto;
          margin: 0;
        }
        .svc-opt span{
          flex: 1;
          min-width: 0;
        }
        .btn{
          flex:1;
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 1000;
          cursor: pointer;
          border: none;
        }
        .btn.primary{ background: #f97316; color:#fff; }
        .btn.primary:disabled{ opacity:0.7; cursor:not-allowed; }
        .btn.ghost{
          background:#fff;
          border:1px solid rgba(229,231,235,1);
          color:#374151;
        }
        @media (max-width: 920px){
          .fields{ grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="signup-layout">
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="top-links">
            {onBackToRoleSelect ? (
              <button type="button" className="link-btn" onClick={onBackToRoleSelect}>
                Choose a different role
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="link-btn" onClick={onCancel}>
              Cancel
            </button>
          </div>

          <h3>Supplier Sign Up</h3>
          <div className="sub">Create your supplier profile and start receiving bookings.</div>

          {error && <div className="auth-error">{error}</div>}

          <section className="section">
            <div className="section-head">
              <h4 className="section-title">Section 1: Personal information</h4>
            </div>

            <div className="fields">
              <div className="field with-error">
                <label>Full name</label>
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
                  required
                />
              </div>
              <div className="field with-error">
                <label>Email address</label>
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
                  required
                />
              </div>
              <div className="field with-error">
                <label>Phone number</label>
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
                  required
                />
              </div>
              <div className="field with-error">
                <label>NIC Number</label>
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
                  required
                />
              </div>
              <div className="field full with-error">
                <label>Address</label>
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
                  required
                />
              </div>
              <div className="field full with-error">
                <label>City</label>
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
                  required
                />
              </div>
              <div className="field full with-error">
                <label>District</label>
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

          <section className="section">
            <div className="section-head">
              <h4 className="section-title">Section 2: Service information</h4>
            </div>

            <div className="fields">
              <div className="field with-error">
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
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {category === 'other' ? (
                <div className="field with-error">
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
                    placeholder="Type your category"
                    required
                  />
                </div>
              ) : (
                <div />
              )}

              <div className="field full with-error">
                <label>Services (select one or more)</label>
                {touched.services && (
                  <div className={`Validation-msg ${validateField('services', allSelectedServices) ? 'error' : 'success'}`}>
                    {validateField('services', allSelectedServices) || 'Looks good!'}
                  </div>
                )}
                {category !== 'other' && serviceOptions.length ? (
                  <div className={`svc-options services-box ${touched.services ? (validateField('services', allSelectedServices) ? 'invalid' : 'valid') : ''}`}>
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
                ) : (
                  <div style={{ color: '#6b7280', fontWeight: 800, fontSize: 13 }}>
                    No predefined services for this category. Please add your service below.
                  </div>
                )}
              </div>

              <div className="field full">
                <label>Add other service</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={customServiceInput}
                    onChange={(e) => setCustomServiceInput(e.target.value)}
                    type="text"
                    placeholder="e.g., AC repair"
                  />
                  <button type="button" className="btn ghost" style={{ flex: '0 0 auto' }} onClick={addCustomService}>
                    Add
                  </button>
                </div>
                {allSelectedServices.length ? (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {allSelectedServices.map((svc) => (
                      <span
                        key={svc}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(249,115,22,0.08)',
                          border: '1px solid rgba(249,115,22,0.28)',
                          borderRadius: 999,
                          padding: '6px 10px',
                          fontWeight: 800,
                          fontSize: 12
                        }}
                      >
                        {svc}
                        {customServices.includes(svc) && (
                          <button
                            type="button"
                            onClick={() => removeCustomService(svc)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 900 }}
                          >
                            x
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="field with-error">
                <label>Experience</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    {touched.yearsOfExperience && (
                      <div className={`Validation-msg ${validateField('yearsOfExperience', yearsOfExperience) ? 'error' : 'success'}`} style={{ top: '-18px' }}>
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
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    {touched.monthsOfExperience && (
                      <div className={`Validation-msg ${validateField('monthsOfExperience', monthsOfExperience) ? 'error' : 'success'}`} style={{ top: '-18px' }}>
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
                  </div>
                </div>
              </div>

              <div className="field full">
                <div
                  style={{
                    borderRadius: 14,
                    border: '1px solid rgba(249,115,22,0.28)',
                    background: 'rgba(249,115,22,0.06)',
                    padding: '12px 14px',
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#374151',
                    lineHeight: 1.6
                  }}
                >
                  <div style={{ fontWeight: 900, color: '#9a3412', marginBottom: 8 }}>How grading works</div>
                  {gradingConfig ? (
                    <>
                      <div>
                        <strong>A</strong> — Experience ≥ {gradingConfig.A?.minYears ?? '—'} years
                      </div>
                      <div>
                        <strong>B</strong> — Experience ≥ {gradingConfig.B?.minYears ?? '—'} years
                      </div>
                      <div>
                        <strong>C</strong> — Experience ≥ {gradingConfig.C?.minYears ?? '—'} years (entry tier)
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <strong>A</strong> — Experience typically 5+ years
                      </div>
                      <div>
                        <strong>B</strong> — Experience typically 3+ years
                      </div>
                      <div>
                        <strong>C</strong> — Emerging tier
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="field full with-error">
                <label>Short bio</label>
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
                  required
                />
              </div>

              <div className="field full">
                <label>Upload profile picture (Cloudinary)</label>
                <div className="uploader">
                  <div className="upload-preview" aria-hidden="true">
                    {profilePreviewUrl ? <img src={profilePreviewUrl} alt="preview" /> : <i className="fas fa-user" />}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfilePictureFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
              </div>

              <div className="field full">
                <label>Upload experience certificate</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  onChange={(e) => setExperienceCertificateFiles(e.target.files)}
                  required
                />
                {certificatePreviewUrls.length > 0 && (
                  <div className="cert-preview-grid">
                    {certificatePreviewUrls.map((url, idx) => (
                      <img key={idx} src={url} alt="preview" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="actions">
            <button type="submit" className="btn primary" disabled={loading || !canSubmit}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>

      {submitted && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
            zIndex: 9999
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#fff',
              borderRadius: 18,
              border: '1px solid rgba(229,231,235,1)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              padding: 18
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 1100, color: '#111827' }}>
              Your application under review
            </h3>
            <p style={{ margin: '10px 0 0', color: '#6b7280', fontWeight: 800, lineHeight: 1.5 }}>
              Thanks for applying. Our admin will review your details. If approved, you will receive login credentials by email.
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setSubmitted(false);
                  window.location.hash = 'home';
                }}
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierSignupPage;

