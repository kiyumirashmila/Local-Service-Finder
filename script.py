import re

with open('c:/Users/User/Desktop/LocalServiceFinder/frontend/src/components/SupplierSignupPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State changes
content = content.replace(
    "const [city, setCity] = useState('');\n",
    "const [city, setCity] = useState('');\n  const [nic, setNic] = useState('');\n  const [monthsOfExperience, setMonthsOfExperience] = useState('0');\n  const [touched, setTouched] = useState({});\n"
)
content = content.replace(
    "const [experienceCertificateFile, setExperienceCertificateFile] = useState(null);\n",
    "const [experienceCertificateFiles, setExperienceCertificateFiles] = useState([]);\n  const [certificatePreviewUrls, setCertificatePreviewUrls] = useState([]);\n"
)

# 2. Preview effect
content = content.replace(
    "}, [profilePictureFile]);\n",
    "}, [profilePictureFile]);\n\n  useEffect(() => {\n    if (!experienceCertificateFiles || experienceCertificateFiles.length === 0) {\n      setCertificatePreviewUrls([]);\n      return;\n    }\n    const urls = Array.from(experienceCertificateFiles).map(f => URL.createObjectURL(f));\n    setCertificatePreviewUrls(urls);\n    return () => urls.forEach(u => URL.revokeObjectURL(u));\n  }, [experienceCertificateFiles]);\n"
)

# 3. Validation function
validation_code = """
  const validateField = (name, value) => {
    switch (name) {
      case 'fullName':
        if (!value) return 'Full Name is required';
        if (value.length < 3) return 'Minimum 3 chars';
        if (!/^[A-Za-z\\\\s]+$/.test(value)) return 'Only letters and spaces';
        return '';
      case 'email':
        if (!value) return 'Email is required';
        if (!/[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+/.test(value)) return 'Valid email format required';
        return '';
      case 'phone':
        if (!value) return 'Phone is required';
        if (!/^07\\\\d{8}$/.test(value)) return 'Valid SL number (07x, 10 digits)';
        return '';
      case 'address':
        if (!value || value.length < 10) return 'Min 10 characters required';
        return '';
      case 'city':
        if (!value) return 'City is required';
        if (!/^[A-Za-z\\\\s]+$/.test(value)) return 'Only letters allowed';
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
      default:
        return '';
    }
  };

  const getValidationClass = (name, value) => {
    if (!touched[name]) return '';
    return validateField(name, value) ? 'invalid' : 'valid';
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const toggleService = (serviceName) => {"""

content = content.replace("  const toggleService = (serviceName) => {", validation_code)

# 4. canSubmit
can_submit_old = """    return (
      fullName &&
      email &&
      phone &&
      address &&
      city &&
      yearsOfExperience !== '' &&
      !Number.isNaN(yearsNum) &&
      yearsNum >= 0 &&
      bio &&
      profilePictureFile &&
      experienceCertificateFile &&
      resolvedCategory &&
      allSelectedServices.length > 0
    );"""

can_submit_new = """    return (
      fullName && !validateField('fullName', fullName) &&
      email && !validateField('email', email) &&
      phone && !validateField('phone', phone) &&
      address && !validateField('address', address) &&
      city && !validateField('city', city) &&
      nic && !validateField('nic', nic) &&
      yearsOfExperience !== '' && !validateField('yearsOfExperience', yearsOfExperience) &&
      monthsOfExperience !== '' && !validateField('monthsOfExperience', monthsOfExperience) &&
      bio && !validateField('bio', bio) &&
      profilePictureFile &&
      experienceCertificateFiles && experienceCertificateFiles.length > 0 &&
      resolvedCategory &&
      allSelectedServices.length > 0
    );"""

content = content.replace(can_submit_old, can_submit_new)
content = content.replace("experienceCertificateFile,\n    fullName,", "experienceCertificateFiles,\n    fullName,")
content = content.replace("allSelectedServices,\n    yearsOfExperience\n  ]);", "allSelectedServices,\n    yearsOfExperience,\n    monthsOfExperience,\n    nic\n  ]);")

# 5. FormData
content = content.replace("formData.append('yearsOfExperience', yearsOfExperience);", "formData.append('nic', nic);\n      formData.append('yearsOfExperience', yearsOfExperience);\n      formData.append('monthsOfExperience', monthsOfExperience);")
content = content.replace("formData.append('experienceCertificate', experienceCertificateFile);", "if (experienceCertificateFiles) {\n        Array.from(experienceCertificateFiles).forEach(f => formData.append('experienceCertificate', f));\n      }")

# 6. CSS
css_old = ".field input:focus,.field select:focus,.field textarea:focus{"
css_new = """
        .field.with-error { position: relative; padding-top: 18px; }
        .Validation-msg {
          position: absolute; top: 0; right: 0; font-size: 11px; font-weight: 900;
          padding: 2px 6px; border-radius: 6px; z-index: 2;
        }
        .Validation-msg.error { background: #fee2e2; color: #ef4444; }
        .Validation-msg.success { background: #dcfce7; color: #22c55e; }
        .field input.valid, .field textarea.valid { border: 2px solid #22c55e !important; }
        .field input.invalid, .field textarea.invalid { border: 2px solid #ef4444 !important; }
        .cert-preview-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .cert-preview-grid img { width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; }
        .field input:focus,.field select:focus,.field textarea:focus{"""
content = content.replace(css_old, css_new)

# 7. Inputs
def add_validations(html, name, stateName, input_type='text'):
    regex = r'<input value=\\{' + stateName + r'\\} onChange=\\{\\(e\\) => set' + stateName[0].upper() + stateName[1:] + r'\\(e\\.target\\.value\\)\\} type=\"' + input_type + r'\" required />'
    replacement = f"""
                {{touched.{stateName} && (
                  <div className={{`Validation-msg ${{validateField('{stateName}', {stateName}) ? 'error' : 'success'}}`}}>
                    {{validateField('{stateName}', {stateName}) || 'Looks good!'}}
                  </div>
                )}}
                <input
                  className={{getValidationClass('{stateName}', {stateName})}}
                  value={{{stateName}}}
                  onChange={{(e) => set{stateName[0].upper() + stateName[1:]}(e.target.value)}}
                  onBlur={{() => handleBlur('{stateName}')}}
                  type=\"{input_type}\"
                  required
                />"""
    return re.sub(regex, replacement, html)

content = add_validations(content, 'Full name', 'fullName')
content = add_validations(content, 'Email address', 'email', 'email')
content = add_validations(content, 'Phone number', 'phone')
content = add_validations(content, 'Address', 'address')
content = add_validations(content, 'City', 'city')

# Adjust field class wrapper for these
fields = ['fullName', 'email', 'phone', 'address', 'city']
for f in fields:
    label = 'Full name' if f == 'fullName' else 'Email address' if f == 'email' else 'Phone number' if f == 'phone' else f.capitalize()
    content = content.replace(f'<div className="field">\n                <label>{label}', f'<div className="field with-error">\n                <label>{label}')
    content = content.replace(f'<div className="field full">\n                <label>{label}', f'<div className="field full with-error">\n                <label>{label}')

# Add NIC field explicitly before Address
content = content.replace(
    "<div />\n              <div className=\"field full with-error\">\n                <label>Address</label>",
    """<div className="field with-error">
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
                  type=\"text\"
                  required
                />
              </div>
              <div className=\"field full with-error\">
                <label>Address</label>"""
)

# Experience
content = content.replace(
    "<div className=\"field\">\n                <label>Years of experience</label>\n                <input\n                  value={yearsOfExperience}\n                  onChange={(e) => setYearsOfExperience(e.target.value)}\n                  type=\"number\"\n                  min=\"0\"\n                  required\n                />\n              </div>",
    """<div className="field with-error">
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
                      type=\"number\" min=\"0\" placeholder=\"Years\" required
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
                      type=\"number\" min=\"0\" max=\"11\" placeholder=\"Months\" required
                    />
                  </div>
                </div>
              </div>"""
)

# Bio
content = content.replace(
    "<div className=\"field full\">\n                <label>Short bio</label>\n                <textarea value={bio} onChange={(e) => setBio(e.target.value)} required />\n              </div>",
    """<div className="field full with-error">
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
              </div>"""
)

# Certificate Upload
cert_old = """<input
                  type=\"file\"
                  accept=\".pdf,image/*\"
                  onChange={(e) => setExperienceCertificateFile(e.target.files?.[0] || null)}
                  required
                />"""
cert_new = """<input
                  type=\"file\"
                  accept=\".pdf,image/*\"
                  multiple
                  onChange={(e) => setExperienceCertificateFiles(e.target.files)}
                  required
                />
                {certificatePreviewUrls.length > 0 && (
                  <div className=\"cert-preview-grid\">
                    {certificatePreviewUrls.map((url, idx) => (
                      <img key={idx} src={url} alt=\"preview\" />
                    ))}
                  </div>
                )}"""
content = content.replace(cert_old, cert_new)

with open('c:/Users/User/Desktop/LocalServiceFinder/frontend/src/components/SupplierSignupPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
