import re

with open('c:/Users/User/Desktop/LocalServiceFinder/frontend/src/components/SupplierProfilePage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Overview UI updates (NIC and multiple certificates)
nic_row = """                  <div className="detail-row">
                    <div className="detail-label">NIC Number</div>
                    <div className="detail-value">{user?.nic || '-'}</div>
                  </div>
"""
# insert NIC row after City row
content = content.replace(
    '<div className="detail-value">{user?.city || \'-\'}</div>\n                  </div>',
    '<div className="detail-value">{user?.city || \'-\'}</div>\n                  </div>\n' + nic_row
)

# Replace the single certificate with multiple certificates map
cert_ui_old = """                  <div className="detail-row">
                    <div className="detail-label">Certificate</div>
                    <div className="detail-value">
                      {user?.experienceCertificateUrl ? (
                        <a href={user.experienceCertificateUrl} target="_blank" rel="noreferrer">
                          View uploaded certificate
                        </a>
                      ) : (
                        '-'
                      )}
                    </div>
                  </div>"""

cert_ui_new = """                  <div className="detail-row" style={{ alignItems: 'flex-start' }}>
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
                  </div>"""

content = content.replace(cert_ui_old, cert_ui_new)

# 2. Add validation functions and touched state
# Put `touched` state near the top of component where `const [draft, setDraft] = useState(initial);` is.
content = content.replace(
    '  const [draft, setDraft] = useState(initial);',
    '  const [draft, setDraft] = useState(initial);\n  const [touched, setTouched] = useState({});'
)

# Find where to put validateField (after 'const allSelectedServices = ...' block)
validate_funcs = """
  function validateField(name, value) {
    if (value === undefined) value = '';
    const valString = String(value);
    switch (name) {
      case 'fullName':
        if (!valString) return 'Full Name is required';
        if (valString.length < 3) return 'Minimum 3 chars';
        if (!/^[A-Za-z\\s]+$/.test(valString)) return 'Only letters and spaces';
        return '';
      case 'phone':
        if (!valString) return 'Phone is required';
        if (!/^07\\d{8}$/.test(valString)) return 'Valid SL number (07x, 10 digits)';
        return '';
      case 'address':
        if (!valString || valString.length < 10) return 'Min 10 characters required';
        return '';
      case 'city':
        if (!valString) return 'City is required';
        if (!/^[A-Za-z\\s]+$/.test(valString)) return 'Only letters allowed';
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
"""

content = content.replace(
    '  const resetCategoryAndServicesFromUser = () => {',
    validate_funcs + '\n  const resetCategoryAndServicesFromUser = () => {'
)

# 3. Add CSS for validation
css_additions = """
        /* Validations */
        .with-error { position: relative; }
        .Validation-msg {
          position: absolute;
          top: -24px;
          right: 0;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 9999px;
          z-index: 10;
        }
        .Validation-msg.error { background: #fee2e2; color: #ef4444; }
        .Validation-msg.success { background: #dcfce7; color: #22c55e; }
        .field input.valid, .field textarea.valid, .field select.valid { border: 2px solid #22c55e !important; }
        .field input.invalid, .field textarea.invalid, .field select.invalid { border: 2px solid #ef4444 !important; }
        .services-box { padding: 4px; border-radius: 12px; }
        .services-box.invalid { border: 2px solid #ef4444; }
        .services-box.valid { border: 2px solid #22c55e; }
"""
content = content.replace('        .field input:focus,', css_additions + '\n        .field input:focus,')


# 4. Process all fields to add `with-error`, `getValidationClass`, `handleBlur`, and `Validation-msg`
def do_replace(state_prop, display_name, field_name_in_html, val_value_var, is_textarea=False, is_number=False, extra_class=''):
    field_class = "field" if not extra_class else f"field {extra_class}"
    new_field_class = f"{field_class} with-error"
    tag = "textarea" if is_textarea else "input"
    type_attr = ' type="number" ' if is_number else ''
    if not is_number and tag == 'input': type_attr = ' '
    
    # We will just write the custom blocks since regex might miss slightly differently formatted lines
    pass

import re

# Custom string replacements for fields
fields_to_replace = [
    # Full Name
    (
        '<div className="field">\n                    <label>Full name *</label>\n                    <input value={draft.fullName} onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))} required />\n                  </div>',
        '<div className="field with-error">\n                    <label>Full name *</label>\n                    {touched.fullName && <div className={`Validation-msg ${validateField("fullName", draft.fullName) ? "error" : "success"}`}>{validateField("fullName", draft.fullName) || "Looks good!"}</div>}\n                    <input className={getValidationClass("fullName", draft.fullName)} value={draft.fullName} onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))} onBlur={() => handleBlur("fullName")} required />\n                  </div>'
    ),
    # Phone
    (
        '<div className="field">\n                    <label>Phone *</label>\n                    <input value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} required />\n                  </div>',
        '<div className="field with-error">\n                    <label>Phone *</label>\n                    {touched.phone && <div className={`Validation-msg ${validateField("phone", draft.phone) ? "error" : "success"}`}>{validateField("phone", draft.phone) || "Looks good!"}</div>}\n                    <input className={getValidationClass("phone", draft.phone)} value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} onBlur={() => handleBlur("phone")} required />\n                  </div>'
    ),
    # Address
    (
        '<div className="field">\n                    <label>Address *</label>\n                    <input value={draft.address} onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))} required />\n                  </div>',
        '<div className="field with-error">\n                    <label>Address *</label>\n                    {touched.address && <div className={`Validation-msg ${validateField("address", draft.address) ? "error" : "success"}`}>{validateField("address", draft.address) || "Looks good!"}</div>}\n                    <input className={getValidationClass("address", draft.address)} value={draft.address} onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))} onBlur={() => handleBlur("address")} required />\n                  </div>'
    ),
    # City
    (
        '<div className="field">\n                    <label>City *</label>\n                    <input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} required />\n                  </div>',
        '<div className="field with-error">\n                    <label>City *</label>\n                    {touched.city && <div className={`Validation-msg ${validateField("city", draft.city) ? "error" : "success"}`}>{validateField("city", draft.city) || "Looks good!"}</div>}\n                    <input className={getValidationClass("city", draft.city)} value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} onBlur={() => handleBlur("city")} required />\n                  </div>'
    ),
    # Category
    (
        '<div className="field">\n                    <label>Category *</label>\n                    <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={catalogLoading}>',
        '<div className="field with-error">\n                    <label>Category *</label>\n                    {touched.category && <div className={`Validation-msg ${validateField("category", category) ? "error" : "success"}`}>{validateField("category", category) || "Looks good!"}</div>}\n                    <select className={getValidationClass("category", category)} value={category} onChange={(e) => { setCategory(e.target.value); if(e.target.value !== "other") setTouched(p=>({...p, categoryOther:false}))}} onBlur={() => handleBlur("category")} disabled={catalogLoading}>'
    ),
    # Category Other
    (
        '<div className="field field-full">\n                      <label>Other category *</label>\n                      <input value={categoryOther} onChange={(e) => setCategoryOther(e.target.value)} required placeholder="Type your category" />\n                    </div>',
        '<div className="field field-full with-error">\n                      <label>Other category *</label>\n                      {touched.categoryOther && <div className={`Validation-msg ${validateField("categoryOther", categoryOther) ? "error" : "success"}`}>{validateField("categoryOther", categoryOther) || "Looks good!"}</div>}\n                      <input className={getValidationClass("categoryOther", categoryOther)} value={categoryOther} onChange={(e) => setCategoryOther(e.target.value)} onBlur={() => handleBlur("categoryOther")} required placeholder="Type your category" />\n                    </div>'
    ),
    # NIC
    (
        '<div className="field">\n                    <label>NIC Number *</label>\n                    <input type="text" value={draft.nic} onChange={(e) => setDraft((d) => ({ ...d, nic: e.target.value }))} required />\n                  </div>',
        '<div className="field with-error">\n                    <label>NIC Number *</label>\n                    {touched.nic && <div className={`Validation-msg ${validateField("nic", draft.nic) ? "error" : "success"}`}>{validateField("nic", draft.nic) || "Looks good!"}</div>}\n                    <input className={getValidationClass("nic", draft.nic)} type="text" value={draft.nic} onChange={(e) => setDraft((d) => ({ ...d, nic: e.target.value }))} onBlur={() => handleBlur("nic")} required />\n                  </div>'
    ),
    # Bio
    (
        '<div className="field field-full">\n                    <label>Bio *</label>\n                    <textarea value={draft.bio} onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} rows={4} required />\n                  </div>',
        '<div className="field field-full with-error">\n                    <label>Bio *</label>\n                    {touched.bio && <div className={`Validation-msg ${validateField("bio", draft.bio) ? "error" : "success"}`}>{validateField("bio", draft.bio) || "Looks good!"}</div>}\n                    <textarea className={getValidationClass("bio", draft.bio)} value={draft.bio} onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} onBlur={() => handleBlur("bio")} rows={4} required />\n                  </div>'
    ),
    # Experience (Years and Months)
    (
        '<div className="field">\n                    <label>Experience *</label>\n                    <div style={{ display: \'flex\', gap: \'8px\' }}>\n                      <input style={{ flex: 1 }} type="number" min="0" value={draft.yearsOfExperience} onChange={(e) => setDraft((d) => ({ ...d, yearsOfExperience: e.target.value }))} placeholder="Years" required />\n                      <input style={{ flex: 1 }} type="number" min="0" max="11" value={draft.monthsOfExperience} onChange={(e) => setDraft((d) => ({ ...d, monthsOfExperience: e.target.value }))} placeholder="Months" required />\n                    </div>\n                  </div>',
        '<div className="field with-error">\n                    <label>Experience *</label>\n                    <div style={{ display: \'flex\', gap: \'8px\' }}>\n                      <div style={{ flex: 1, position: \'relative\' }}>\n                        {touched.yearsOfExperience && <div className={`Validation-msg ${validateField("yearsOfExperience", draft.yearsOfExperience) ? "error" : "success"}`} style={{ top: "-18px" }}>{validateField("yearsOfExperience", draft.yearsOfExperience) || "Ok"}</div>}\n                        <input className={getValidationClass("yearsOfExperience", draft.yearsOfExperience)} style={{ width: \'100%\' }} type="number" min="0" value={draft.yearsOfExperience} onChange={(e) => setDraft((d) => ({ ...d, yearsOfExperience: e.target.value }))} onBlur={() => handleBlur("yearsOfExperience")} placeholder="Years" required />\n                      </div>\n                      <div style={{ flex: 1, position: \'relative\' }}>\n                        {touched.monthsOfExperience && <div className={`Validation-msg ${validateField("monthsOfExperience", draft.monthsOfExperience) ? "error" : "success"}`} style={{ top: "-18px" }}>{validateField("monthsOfExperience", draft.monthsOfExperience) || "Ok"}</div>}\n                        <input className={getValidationClass("monthsOfExperience", draft.monthsOfExperience)} style={{ width: \'100%\' }} type="number" min="0" max="11" value={draft.monthsOfExperience} onChange={(e) => setDraft((d) => ({ ...d, monthsOfExperience: e.target.value }))} onBlur={() => handleBlur("monthsOfExperience")} placeholder="Months" required />\n                      </div>\n                    </div>\n                  </div>'
    ),
]

for old_str, new_str in fields_to_replace:
    if old_str in content:
        content = content.replace(old_str, new_str)
    else:
        print(f"FAILED TO FIND BLOCK:\n{old_str[:150]}\n")

# Services validation wrapper
services_old = '<div className="field field-full">\n                    <label>Services (select one or more)</label>'
services_new = '<div className="field field-full with-error">\n                    <label>Services (select one or more)</label>\n                    {touched.services && <div className={`Validation-msg ${validateField("services", allSelectedServices) ? "error" : "success"}`}>{validateField("services", allSelectedServices) || "Looks good!"}</div>}'
content = content.replace(services_old, services_new)

# Mark touched for services
content = content.replace(
    'onChange={() =>\n                                setSelectedServices((prev) =>\n                                  prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]\n                                )\n                              }',
    'onChange={() => { setTouched(p=>({...p, services: true})); setSelectedServices((prev) => prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc])}}'
)

content = content.replace(
    'onClick={() => {\n                                setSelectedServices((prev) => prev.filter((x) => x !== svc));\n                                setCustomServices((prev) => prev.filter((x) => x !== svc));\n                              }}',
    'onClick={() => {\n                                setTouched(p=>({...p, services: true})); \n                                setSelectedServices((prev) => prev.filter((x) => x !== svc));\n                                setCustomServices((prev) => prev.filter((x) => x !== svc));\n                              }}'
)

content = content.replace(
    'const cleaned = normalize(customServiceInput);\n                          if (!cleaned) return;',
    'setTouched(p=>({...p, services: true}));\n                          const cleaned = normalize(customServiceInput);\n                          if (!cleaned) return;'
)

# And inject the invalid/valid custom box class for services-grid:
content = content.replace(
    '<div className="services-grid">',
    '<div className={`services-grid services-box ${touched.services ? (validateField("services", allSelectedServices) ? "invalid" : "valid") : ""}`}>'
)


# Add validation check to handleSave
handlesave_old = """  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;"""
    
handlesave_new = """  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    
    // Check all validations securely
    setTouched({
        fullName: true, phone: true, address: true, city: true,
        nic: true, bio: true, yearsOfExperience: true, monthsOfExperience: true,
        category: true, categoryOther: true, services: true
    });
    
    const errors = [
        validateField('fullName', draft.fullName), validateField('phone', draft.phone), validateField('address', draft.address),
        validateField('city', draft.city), validateField('nic', draft.nic), validateField('bio', draft.bio),
        validateField('yearsOfExperience', draft.yearsOfExperience), validateField('monthsOfExperience', draft.monthsOfExperience),
        validateField('category', category), validateField('categoryOther', categoryOther), validateField('services', allSelectedServices)
    ];
    if (errors.some(e => e !== '')) {
       setError('Please resolve all validation errors before saving.');
       return;
    }
"""

content = content.replace(handlesave_old, handlesave_new)

with open('c:/Users/User/Desktop/LocalServiceFinder/frontend/src/components/SupplierProfilePage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done replacing.")
