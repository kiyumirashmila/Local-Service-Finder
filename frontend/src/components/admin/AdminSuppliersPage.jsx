import React, { useEffect, useMemo, useState } from 'react';
import {
  approveAdminSupplier,
  createCatalogRequest,
  fetchAdminCatalogOptions,
  fetchPublicCatalogOptions,
  fetchAdminSuppliers,
  rejectAdminSupplier,
  sendAdminSupplierCredentials,
  updateAdminSupplier,
  updateAdminSupplierGrading,
  fetchGradingConfig
} from '../../services/api';
import { ensureCatalogDefaults, getCatalog } from '../../utils/catalogStore';

const AdminSuppliersPage = ({ managerTitle }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rowAction, setRowAction] = useState({ id: null, action: null });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedGrading, setSelectedGrading] = useState('C');
  const [savingGrading, setSavingGrading] = useState(false);
  const [sendingCreds, setSendingCreds] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [requestSending, setRequestSending] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [catalogOptions, setCatalogOptions] = useState({ categories: [], servicesByCategory: {} });
  const [gradingConfig, setGradingConfig] = useState(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [editSnapshot, setEditSnapshot] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    category: '',
    categoryOther: '',
    servicesList: [''],
    yearsOfExperience: '',
    bio: ''
  });

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetchAdminSuppliers();
      setSuppliers(res.data.suppliers || []);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to load suppliers.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ensureCatalogDefaults();
    fetchAdminCatalogOptions()
      .then((res) => {
        const categories = res.data?.categories || [];
        const servicesByCategory = res.data?.servicesByCategory || {};
        if (categories.length) {
          setCatalogOptions({ categories, servicesByCategory });
        } else {
          setCatalogOptions(getCatalog());
        }
      })
      .catch(() =>
        fetchPublicCatalogOptions()
          .then((res) => {
            const categories = res.data?.categories || [];
            const servicesByCategory = res.data?.servicesByCategory || {};
            if (categories.length) setCatalogOptions({ categories, servicesByCategory });
            else setCatalogOptions(getCatalog());
          })
          .catch(() => setCatalogOptions(getCatalog()))
      );
    load();
    fetchGradingConfig()
      .then((res) => setGradingConfig(res.data))
      .catch(() => setGradingConfig(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const pending = suppliers.filter((s) => (s.supplierApprovalStatus || 'pending') === 'pending').length;
    const approved = suppliers.filter((s) => (s.supplierApprovalStatus || '') === 'approved').length;
    const rejected = suppliers.filter((s) => (s.supplierApprovalStatus || '') === 'rejected').length;
    // Backend has no "today" concept yet, so reuse approved count.
    const approvedToday = approved;
    const inReview = pending;
    return { pending, approved, rejected, approvedToday, inReview };
  }, [suppliers]);

  const suggestedGradeFromExperience = (years) => {
    const y = Number(years ?? 0);
    const g = gradingConfig;
    if (g?.A && Number.isFinite(g.A.minYears) && y >= g.A.minYears) return 'A';
    if (g?.B && Number.isFinite(g.B.minYears) && y >= g.B.minYears) return 'B';
    if (g?.C && Number.isFinite(g.C.minYears) && y >= g.C.minYears) return 'C';
    if (y >= 5) return 'A';
    if (y >= 3) return 'B';
    return 'C';
  };

  const handleDecision = async (id, decision) => {
    setError('');
    setRowAction({ id, action: decision });
    try {
      if (decision === 'approve') await approveAdminSupplier(id);
      else await rejectAdminSupplier(id);
      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Action failed.';
      setError(msg);
    } finally {
      setRowAction({ id: null, action: null });
    }
  };

  const supplierLabel = (s) => {
    const category = s.category || s.serviceCategory || '-';
    const services = Array.isArray(s.services) && s.services.length
      ? s.services
      : [s.service, s.serviceOther, s.serviceCategoryOther].filter(Boolean);
    return `${category} / ${services.join(', ') || '-'}`;
  };

  const normalizeList = (raw) =>
    Array.from(
      new Set(
        (Array.isArray(raw) ? raw : [raw])
          .flatMap((v) => String(v || '').split(','))
          .map((v) => String(v || '').trim())
          .filter(Boolean)
      )
    );

  const buildSupplierDocUrls = (s) => {
    if (!s) return [];
    const candidates = [
      s.experienceCertificateUrl,
      s.experienceCertificate,
      s.experienceCertificateURL,
      s.experienceCertificateUrls,
      s.experienceCertificateURLs,
      s.certificateUrl,
      s.certificateUrls,
      s.documentUrl,
      s.documentUrls,
      s.documents,
      s.files
    ];
    const urls = normalizeList(candidates.flat());
    return urls;
  };

  const isLikelyImageUrl = (url) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(String(url || ''));
  const isLikelyPdfUrl = (url) => /\.pdf(\?.*)?$/i.test(String(url || ''));

  const getSupplierCategoryAndServices = (s) => {
    const category = String(s?.category || s?.serviceCategory || '').trim();
    const services = Array.isArray(s?.services) && s.services.length
      ? s.services
      : [s?.service, s?.serviceOther, s?.serviceCategoryOther].filter(Boolean);
    const cleanedServices = services.map((x) => String(x || '').trim()).filter(Boolean);
    return { category, services: cleanedServices };
  };

  const getNewFlagsForSupplier = (s) => {
    const { category, services } = getSupplierCategoryAndServices(s);
    const knownCategoriesLower = (catalogOptions.categories?.length ? catalogOptions.categories : getCatalog().categories || []).map((c) =>
      String(c || '').trim().toLowerCase()
    );
    const isNewCategory = !!category && !knownCategoriesLower.includes(category.toLowerCase());

    const knownSvcsLower = (catalogOptions.servicesByCategory?.[category] || []).map((x) => String(x || '').trim().toLowerCase());
    const newServices = isNewCategory
      ? services
      : services.filter((svc) => !knownSvcsLower.includes(String(svc || '').trim().toLowerCase()));

    return { isNewCategory, newServices, hasAnyNew: isNewCategory || newServices.length > 0 };
  };

  const openDetails = (s) => {
    const categoryValue = s.category || s.serviceCategory || '';
    const knownCategories = catalogOptions.categories?.length ? catalogOptions.categories : getCatalog().categories || [];
    const isCustomCategory = !!categoryValue && !knownCategories.some((c) => c.toLowerCase() === categoryValue.toLowerCase());
    const mergedServices = Array.isArray(s.services) && s.services.length
      ? s.services
      : [s.service, s.serviceOther, s.serviceCategoryOther].filter(Boolean);
    setSelectedSupplier(s);
    const suggested = suggestedGradeFromExperience(s.yearsOfExperience);
    setSelectedGrading(s.supplierGrading || suggested);
    setEditingProfile(false);
    setRequestSent(false);
    setEditForm({
      fullName: s.fullName || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      city: s.city || '',
      category: isCustomCategory ? 'other' : categoryValue,
      categoryOther: isCustomCategory ? categoryValue : '',
      servicesList: mergedServices.length ? mergedServices.map((x) => String(x || '').trim()).filter(Boolean) : [''],
      yearsOfExperience: s.yearsOfExperience ?? 0,
      bio: s.bio || ''
    });
    setEditSnapshot({
      resolvedCategory: categoryValue || '',
      services: mergedServices.map((x) => String(x || '').trim()).filter(Boolean)
    });
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedSupplier(null);
    setEditingProfile(false);
    setRequestSending(false);
    setRequestSent(false);
    setDocsOpen(false);
    setActiveDocIndex(0);
    setEditSnapshot(null);
  };

  const handleSaveGrading = async () => {
    if (!selectedSupplier) return;
    try {
      setSavingGrading(true);
      setError('');
      await updateAdminSupplierGrading(selectedSupplier.id, selectedGrading);
      await load();
      closeDetails();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save grading.';
      setError(msg);
    } finally {
      setSavingGrading(false);
    }
  };

  const handleSendCredentials = async () => {
    if (!selectedSupplier) return;
    try {
      setSendingCreds(true);
      setError('');
      await sendAdminSupplierCredentials(selectedSupplier.id);
      await load();
      closeDetails();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send credentials.';
      setError(msg);
    } finally {
      setSendingCreds(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedSupplier) return;
    try {
      setSavingProfile(true);
      setError('');
      const resolvedCategory = editForm.category === 'other' ? editForm.categoryOther.trim() : editForm.category;
      const services = (editForm.servicesList || []).map((v) => String(v || '').trim()).filter(Boolean);
      await updateAdminSupplier(selectedSupplier.id, {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
        city: editForm.city,
        category: resolvedCategory,
        serviceCategory: resolvedCategory,
        services,
        serviceOther: '',
        serviceCategoryOther: '',
        yearsOfExperience: Number(editForm.yearsOfExperience || 0),
        bio: editForm.bio
      });
      await load();
      setEditingProfile(false);
      closeDetails();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update supplier details.';
      setError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestToAdmin2 = () => {
    const resolvedCategory =
      editForm.category === 'other' ? editForm.categoryOther.trim() : String(editForm.category || '').trim();
    const services = (editForm.servicesList || []).map((v) => String(v || '').trim()).filter(Boolean);

    if (!resolvedCategory || !services.length) {
      setError('Please select category and service before sending request to Admin2.');
      return;
    }
    if (requestSending || requestSent) return;

    const knownCategories = (catalogOptions.categories?.length ? catalogOptions.categories : getCatalog().categories || []).map((c) =>
      String(c || '').trim().toLowerCase()
    );
    const isNewCategory = !!resolvedCategory && !knownCategories.includes(resolvedCategory.toLowerCase());
    const knownSvcsLower = (catalogOptions.servicesByCategory?.[resolvedCategory] || []).map((s) => String(s || '').trim().toLowerCase());
    const newServices = isNewCategory
      ? services
      : services.filter((svc) => !knownSvcsLower.includes(String(svc || '').trim().toLowerCase()));

    if (!isNewCategory && !newServices.length) {
      setError('No new category/services detected to send to Admin2.');
      return;
    }

    setRequestSending(true);
    createCatalogRequest({
      supplierId: selectedSupplier?.id,
      supplierName: editForm.fullName,
      category: resolvedCategory,
      services: newServices
    })
      .then((res) => {
        const msg = res?.data?.message || 'Request sent for approval to Admin2.';
        setError(msg);
        setRequestSent(true);
      })
      .catch((err) => setError(err?.response?.data?.message || 'Failed to send request to Admin2.'))
      .finally(() => setRequestSending(false));
  };

  const resolveCategoryFromEdit = () =>
    editForm.category === 'other' ? editForm.categoryOther.trim() : String(editForm.category || '').trim();

  const currentCategoryLower = String(resolveCategoryFromEdit() || '').toLowerCase();
  const currentServicesList = (editForm.servicesList || []).map((v) => String(v || '').trim()).filter(Boolean);
  const currentServicesLowerSorted = currentServicesList.map((s) => s.toLowerCase()).sort();

  const snapshotCategoryLower = String(editSnapshot?.resolvedCategory || '').toLowerCase();
  const snapshotServicesLowerSorted = (editSnapshot?.services || [])
    .map((s) => String(s || '').trim().toLowerCase())
    .filter(Boolean)
    .sort();

  const servicesOrCategoryChanged =
    !!editSnapshot &&
    (currentCategoryLower !== snapshotCategoryLower ||
      currentServicesLowerSorted.join('||') !== snapshotServicesLowerSorted.join('||'));

  const knownCategoriesLower = (catalogOptions.categories?.length ? catalogOptions.categories : getCatalog().categories || []).map((c) =>
    String(c || '').trim().toLowerCase()
  );
  const isNewCategoryNow = !!resolveCategoryFromEdit() && !knownCategoriesLower.includes(currentCategoryLower);
  const knownSvcsLowerNow = (catalogOptions.servicesByCategory?.[resolveCategoryFromEdit()] || []).map((s) =>
    String(s || '').trim().toLowerCase()
  );
  const newServicesNow = isNewCategoryNow
    ? currentServicesList
    : currentServicesList.filter((svc) => !knownSvcsLowerNow.includes(String(svc || '').toLowerCase()));
  const hasNewCategoryOrServicesNow = isNewCategoryNow || newServicesNow.length > 0;

  const canSendToAdmin2 =
    editingProfile && servicesOrCategoryChanged && hasNewCategoryOrServicesNow && !(requestSending || requestSent);

  return (
    <div>
      <style>{`
        .dash-wrap{
          background:#f8fafc;
        }
        .dash-top{
          margin-bottom: 16px;
        }
        .dash-title{
          margin:0;
          font-size: 26px;
          font-weight: 1100;
          color:#111827;
        }
        .dash-sub{
          margin: 8px 0 0;
          color:#6b7280;
          font-weight: 800;
          line-height: 1.5;
          font-size: 13px;
        }
        .cards{
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin: 16px 0;
        }
        .card{
          background:#fff;
          border:1px solid rgba(229,231,235,1);
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.04);
          display:flex;
          flex-direction:column;
          gap: 10px;
          min-height: 92px;
        }
        .card .row{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
        }
        .card .icon{
          width: 44px;
          height: 44px;
          border-radius: 18px;
          border:1px solid rgba(249,115,22,0.25);
          background: rgba(249,115,22,0.10);
          display:flex;
          align-items:center;
          justify-content:center;
          color:#f97316;
          font-size: 16px;
        }
        .card .kpi-title{
          color:#6b7280;
          font-weight: 900;
          font-size: 13px;
        }
        .card .kpi-value{
          font-size: 26px;
          font-weight: 1100;
          color:#111827;
          margin-top: 2px;
        }
        .queue{
          background:#fff;
          border:1px solid rgba(229,231,235,1);
          border-radius: 20px;
          overflow:hidden;
          box-shadow: 0 16px 40px rgba(0,0,0,0.04);
        }
        .queue-head{
          padding: 16px 18px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(229,231,235,1);
          background: linear-gradient(135deg, rgba(249,115,22,0.06) 0%, rgba(255,255,255,1) 55%);
        }
        .queue-head h3{
          margin:0;
          font-weight: 1100;
          color:#111827;
          font-size: 14px;
          letter-spacing: 0.01em;
        }
        .queue-head .right{
          display:flex;
          gap: 10px;
          align-items:center;
          flex-wrap:wrap;
        }
        .mini-btn{
          border-radius: 14px;
          border: 1px solid rgba(229,231,235,1);
          background:#fff;
          padding: 9px 12px;
          cursor:pointer;
          font-weight: 1100;
          color:#374151;
          font-size: 12px;
        }
        .queue-table-wrap {
          overflow-x: auto;
          overflow-y: auto;
          max-height: 60vh;
        }
        .queue-table-wrap::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .queue-table-wrap::-webkit-scrollbar-track {
          background: rgba(241, 245, 249, 0.8);
          border-radius: 4px;
        }
        .queue-table-wrap::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .queue-table-wrap::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        table{
          width:100%;
          border-collapse: collapse;
        }
        th, td{
          padding: 14px 12px;
          border-bottom: 1px solid rgba(229,231,235,1);
          text-align:left;
          font-weight: 900;
          font-size: 13px;
          color:#111827;
          vertical-align: middle;
        }
        th{
          background: rgba(249,115,22,0.05);
          color:#374151;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.03em;
        }
        .muted{
          color:#6b7280;
          font-weight: 900;
          font-size: 12px;
        }
        .provider{
          display:flex;
          align-items:center;
          gap: 12px;
        }
        .provider .avatar{
          width: 42px;
          height: 42px;
          border-radius: 16px;
          border:1px solid rgba(229,231,235,1);
          background: rgba(17,24,39,0.03);
          overflow:hidden;
          display:flex;
          align-items:center;
          justify-content:center;
          flex: 0 0 auto;
        }
        .provider .avatar img{ width:100%; height:100%; object-fit:cover; }
        .pill{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(229,231,235,1);
          background:#fff;
          font-weight: 1100;
          font-size: 12px;
          color:#111827;
        }
        .pill.pending{ border-color: rgba(249,115,22,0.35); background: rgba(249,115,22,0.08); color:#9a3412; }
        .pill.approved{ border-color: rgba(16,185,129,0.35); background: rgba(16,185,129,0.08); color:#065f46; }
        .pill.rejected{ border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.08); color:#991b1b; }
        .action-icons{
          display:flex;
          align-items:center;
          gap: 10px;
        }
        .icon-btn-approve, .icon-btn-reject{
          width: 38px;
          height: 38px;
          border-radius: 16px;
          border:1px solid rgba(229,231,235,1);
          background:#fff;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size: 16px;
        }
        .icon-btn-approve{
          color:#16a34a;
          border-color: rgba(16,185,129,0.35);
        }
        .icon-btn-reject{
          color:#dc2626;
          border-color: rgba(239,68,68,0.35);
        }
        .icon-btn-approve:disabled, .icon-btn-reject:disabled{
          opacity:0.5;
          cursor:not-allowed;
        }
        .status-note{
          padding: 14px 18px;
          color:#6b7280;
          font-weight: 900;
          font-size: 12px;
        }
        .loading{
          padding: 16px 18px;
          color:#6b7280;
          font-weight: 900;
        }

        .icon-btn-details{
          width: 38px;
          height: 38px;
          border-radius: 16px;
          border:1px solid rgba(229,231,235,1);
          background:#fff;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          color:#2563eb;
          font-size: 16px;
        }

        .modal-overlay{
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 18px;
          z-index: 9999;
        }
        .modal{
          width: 100%;
          max-width: 720px;
          max-height: min(90vh, 800px);
          background:#fff;
          border-radius: 20px;
          border:1px solid rgba(229,231,235,1);
          box-shadow: 0 25px 60px rgba(0,0,0,0.25);
          overflow:hidden;
          display:flex;
          flex-direction:column;
        }
        .modal-body{
          padding: 16px 18px;
          overflow-y: scroll;
          flex: 1 1 auto;
          min-height: 0;
          -webkit-overflow-scrolling: touch;
        }
        .modal-body::-webkit-scrollbar {
          width: 8px;
        }
        .modal-body::-webkit-scrollbar-track {
          background: rgba(241, 245, 249, 0.8);
          border-radius: 4px;
        }
        .modal-body::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .modal-body::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .modal--wide-edit{
          max-width: min(96vw, 1180px);
          max-height: min(88vh, 680px);
        }
        .modal--docs{
          max-width: min(96vw, 1040px);
          max-height: min(85vh, 640px);
        }
        .modal-head{
          padding: 16px 18px;
          border-bottom: 1px solid rgba(229,231,235,1);
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap: 12px;
          background: linear-gradient(135deg, rgba(249,115,22,0.06), rgba(255,255,255,1));
          flex-shrink: 0;
        }
        .modal-head-main{
          min-width: 0;
        }
        .modal-head h3{
          margin:0;
          font-size: 16px;
          font-weight: 1100;
          color:#111827;
        }
        .modal-manager{
          margin-top: 4px;
          font-size: 12px;
          font-weight: 900;
          color:#9a3412;
        }
        .modal-close{
          width: 42px;
          height: 42px;
          border-radius: 16px;
          border:1px solid rgba(229,231,235,1);
          background:#fff;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          color:#6b7280;
          font-size: 20px;
          line-height: 1;
          flex-shrink: 0;
        }
        .modal-close:hover{
          border-color: rgba(249,115,22,0.45);
          color:#9a3412;
        }
        .modal-body{
          padding: 16px 18px 18px;
        }
        .modal-grid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .modal-field{
          display:flex;
          flex-direction:column;
          gap: 6px;
        }
        .modal-field label{
          font-size: 12px;
          font-weight: 900;
          color:#6b7280;
        }
        .modal-field .value{
          font-size: 13px;
          font-weight: 900;
          color:#111827;
        }
        .modal-field input, .modal-field select{
          padding: 10px 12px;
          border-radius: 14px;
          border:1px solid rgba(229,231,235,1);
          outline:none;
          font-weight: 800;
          background:#fff;
        }
        .modal-footer{
          display:flex;
          gap: 12px;
          justify-content:flex-end;
          padding-top: 14px;
          flex-wrap: wrap;
        }
        .modal-btn{
          border-radius: 14px;
          padding: 10px 14px;
          font-weight: 1100;
          cursor:pointer;
          border:none;
        }
        .modal-btn.primary{ background:#f97316; color:#fff; }
        .modal-btn.ghost{
          background:#fff;
          border:1px solid rgba(229,231,235,1);
          color:#374151;
        }

        @media (max-width: 1040px){
          .cards{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 520px){
          th:nth-child(4), td:nth-child(4){ display:none; }
        }

        .flag-new{
          display:inline-flex;
          align-items:center;
          gap: 6px;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid rgba(245,158,11,0.55);
          background: rgba(245,158,11,0.12);
          color: #92400e;
          font-weight: 1100;
          font-size: 11px;
          margin-left: 8px;
          vertical-align: middle;
          white-space: nowrap;
        }
        .svc-grid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .svc-row{
          display:flex;
          align-items:center;
          gap: 8px;
        }
        .svc-row input{
          flex:1;
        }
        .tiny-btn{
          border-radius: 12px;
          border: 1px solid rgba(229,231,235,1);
          background:#fff;
          padding: 8px 10px;
          cursor:pointer;
          font-weight: 1100;
          color:#374151;
          font-size: 12px;
          flex: 0 0 auto;
        }
        .tiny-btn.danger{
          border-color: rgba(239,68,68,0.35);
          color:#991b1b;
          background: rgba(239,68,68,0.06);
        }
        @media (max-width: 720px){
          .svc-grid{ grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="dash-wrap">
        <div className="dash-top">
          <h2 className="dash-title">Supplier Verification Dashboard</h2>
          <p className="dash-sub">
            Review and manage the latest service provider applications. Approve suppliers so customers can book their services.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '8px 0 16px' }}>
          <span className="muted">
            <b style={{ color: '#9a3412' }}>Pending:</b> {counts.pending}
          </span>
          <span className="muted">
            <b style={{ color: '#065f46' }}>Approved:</b> {counts.approvedToday}
          </span>
          <span className="muted">
            <b style={{ color: '#991b1b' }}>Rejected:</b> {counts.rejected}
          </span>
        </div>

        <div className="queue">
          <div className="queue-head">
            <h3>Verification Queue</h3>
          </div>

          {error && <div className="status-note" style={{ borderBottom: '1px solid rgba(229,231,235,1)', color: '#991b1b' }}>{error}</div>}

          {loading ? (
            <div className="loading">Loading suppliers...</div>
          ) : (
            <div className="queue-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Category / Service</th>
                    <th>Experience</th>
                    <th>Location</th>
                    <th>Grading</th>
                    <th>Status</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length ? (
                    suppliers.map((s) => {
                      const status = s.supplierApprovalStatus || 'pending';
                      const serviceLabel = supplierLabel(s);
                      const newFlags = getNewFlagsForSupplier(s);
                      const isApproving = rowAction.id === s.id && rowAction.action === 'approve';
                      const isRejecting = rowAction.id === s.id && rowAction.action === 'reject';
                      return (
                        <tr key={s.id}>
                          <td>
                            <div className="provider">
                              <div className="avatar" aria-hidden="true">
                                {s.avatar ? <img src={s.avatar} alt="" /> : <span style={{ fontSize: 20, fontWeight: 1100 }}>👤</span>}
                              </div>
                              <div>
                                <div style={{ fontWeight: 1100 }}>{s.fullName || '-'}</div>
                                <div className="muted">{s.email || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span>{serviceLabel}</span>
                              {newFlags.hasAnyNew && <span className="flag-new" style={{ marginLeft: 0 }}>NEW</span>}
                            </span>
                          </td>
                          <td>{s.yearsOfExperience ?? 0} Years</td>
                          <td className="muted">{s.city || '-'}</td>
                          <td>
                            {s.supplierGrading ? (
                              <span
                                className={`pill ${
                                  s.supplierGrading === 'A' ? 'approved' : s.supplierGrading === 'B' ? 'pending' : 'rejected'
                                }`}
                                title={gradingConfig?.[s.supplierGrading]?.label || s.supplierGrading}
                              >
                                {gradingConfig?.[s.supplierGrading]?.label || `Grade ${s.supplierGrading}`}
                              </span>
                            ) : (
                              <span className="muted">-</span>
                            )}
                          </td>
                          <td>
                            <span className={`pill ${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                          </td>
                          <td>
                            <div className="action-icons">
                              {newFlags.hasAnyNew ? (
                                <button
                                  type="button"
                                  className="mini-btn"
                                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', padding: '8px 12px' }}
                                  onClick={() => {
                                    const { category: sCat, services: sServices } = getSupplierCategoryAndServices(s);
                                    if (!sCat || !sServices.length) {
                                      setError('Supplier has no category/services to send.');
                                      return;
                                    }
                                    if (!window.confirm(`Send ${sCat} / ${sServices.join(', ')} to Operational Manager for creation?`)) return;
                                    setError('');
                                    createCatalogRequest({
                                      supplierId: s.id,
                                      supplierName: s.fullName || '',
                                      category: sCat,
                                      services: sServices,
                                    })
                                      .then((res) => {
                                        setError(res?.data?.message || 'Request sent to Operational Manager.');
                                        load();
                                      })
                                      .catch((err) => setError(err?.response?.data?.message || 'Failed to send request.'));
                                  }}
                                  aria-label={`Create request for ${s.fullName}`}
                                >
                                  Create
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="icon-btn-approve"
                                  disabled={status === 'approved' || isApproving}
                                  onClick={() => handleDecision(s.id, 'approve')}
                                  aria-label={`Approve ${s.fullName}`}
                                >
                                  ✓
                                </button>
                              )}
                              <button
                                type="button"
                                className="icon-btn-reject"
                                disabled={status === 'rejected' || isRejecting}
                                onClick={() => handleDecision(s.id, 'reject')}
                                aria-label={`Reject ${s.fullName}`}
                              >
                                ✖
                              </button>
                              <button
                                type="button"
                                className="icon-btn-details"
                                onClick={() => openDetails(s)}
                                aria-label={`Open details for ${s.fullName}`}
                              >
                                👁
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="muted">
                        No suppliers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="status-note">Showing {suppliers.length} suppliers</div>
            </div>
          )}
        </div>
      </div>

      {detailsOpen && selectedSupplier && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="supplier-modal-title"
          aria-label="Supplier request"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDetails();
          }}
        >
          <div className={`modal ${editingProfile ? 'modal--wide-edit' : ''}`}>
            <div className="modal-head">
              <div className="modal-head-main">
                <h3 id="supplier-modal-title">{editingProfile ? 'Edit supplier request' : 'Supplier request & grading'}</h3>
                {managerTitle ? <div className="modal-manager">{managerTitle}</div> : null}
              </div>
              <button type="button" className="modal-close" onClick={closeDetails} aria-label="Close panel">
                ×
              </button>
            </div>

            <div className="modal-body">
              {(() => {
                const flags = editingProfile
                  ? { hasAnyNew: hasNewCategoryOrServicesNow, isNewCategory: isNewCategoryNow, newServices: newServicesNow }
                  : getNewFlagsForSupplier(selectedSupplier);
                if (!flags.hasAnyNew) return null;
                return (
                  <div style={{ padding: '10px 14px', background: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 16, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                     <i className="fas fa-info-circle" /> New Category or Service Detected.
                  </div>
                );
              })()}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  marginBottom: 14,
                  borderBottom: '1px solid rgba(229,231,235,1)',
                  paddingBottom: 10
                }}
              >
                <div className="provider" style={{ gap: 12 }}>
                  <div className="avatar" aria-hidden="true" style={{ width: 56, height: 56, borderRadius: 18 }}>
                    {selectedSupplier.avatar ? <img src={selectedSupplier.avatar} alt="" /> : <span style={{ fontSize: 20, fontWeight: 1100 }}>👤</span>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 1100, color: '#111827', fontSize: 16 }}>{selectedSupplier.fullName}</div>
                    <div className="muted">{selectedSupplier.email}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 800, color: '#6b7280' }}>
                  <div>
                    Status:{' '}
                    <span className={`pill ${selectedSupplier.supplierApprovalStatus || 'pending'}`} style={{ marginLeft: 6 }}>
                      {(selectedSupplier.supplierApprovalStatus || 'pending').charAt(0).toUpperCase() +
                        (selectedSupplier.supplierApprovalStatus || 'pending').slice(1)}
                    </span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    Grading:{' '}
                    <span style={{ fontWeight: 1100, color: '#111827' }}>{selectedSupplier.supplierGrading || '—'}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 800, color: '#6b7280', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>Supplier details</span>
                <span style={{ height: 1, flex: 1, alignSelf: 'center', background: 'rgba(229,231,235,1)' }} />
              </div>

              <div className="modal-grid">
                <div className="modal-field">
                  <label>Full name</label>
                  {editingProfile ? (
                    <input value={editForm.fullName} onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))} />
                  ) : (
                    <div className="value">{selectedSupplier.fullName || '-'}</div>
                  )}
                </div>
                <div className="modal-field">
                  <label>Email</label>
                  {editingProfile ? (
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                  ) : (
                    <div className="value">{selectedSupplier.email || '-'}</div>
                  )}
                </div>
                <div className="modal-field">
                  <label>Phone</label>
                  {editingProfile ? (
                    <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                  ) : (
                    <div className="value">{selectedSupplier.phone || '-'}</div>
                  )}
                </div>
                <div className="modal-field">
                  <label>Address</label>
                  {editingProfile ? (
                    <input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
                  ) : (
                    <div className="value">{selectedSupplier.address || '-'}</div>
                  )}
                </div>
                <div className="modal-field">
                  <label>City</label>
                  {editingProfile ? (
                    <input value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} />
                  ) : (
                    <div className="value">{selectedSupplier.city || '-'}</div>
                  )}
                </div>
                <div className="modal-field">
                  <label>Category</label>
                  {editingProfile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                      >
                        {(catalogOptions.categories?.length ? catalogOptions.categories : getCatalog().categories || []).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="other">Other</option>
                      </select>
                      {isNewCategoryNow && <span className="flag-new" style={{ marginLeft: 0 }}>NEW</span>}
                    </div>
                  ) : (
                    <div className="value">
                      {(() => {
                        const cat = selectedSupplier.category || selectedSupplier.serviceCategory || '-';
                        const knownCategories = (catalogOptions.categories?.length ? catalogOptions.categories : getCatalog().categories || []).map((c) =>
                          String(c || '').toLowerCase()
                        );
                        const isNew = !!cat && cat !== '-' && !knownCategories.includes(String(cat).toLowerCase());
                        return (
                          <>
                            {cat}
                            {isNew && <span className="flag-new">NEW</span>}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {editingProfile && editForm.category === 'other' && (
                  <div className="modal-field">
                    <label>New category</label>
                    <input value={editForm.categoryOther} onChange={(e) => setEditForm((f) => ({ ...f, categoryOther: e.target.value }))} />
                  </div>
                )}
                <div className="modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Services</label>
                  {editingProfile ? (
                    <div>
                      <div className="svc-grid">
                        {(editForm.servicesList || ['']).map((svc, idx) => (
                          <div key={`${idx}_${svc}`} className="svc-row">
                            <input
                              value={svc}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEditForm((f) => {
                                  const next = [...(f.servicesList || [])];
                                  next[idx] = v;
                                  return { ...f, servicesList: next };
                                });
                              }}
                              placeholder={idx === 0 ? 'e.g., Pipe repair' : 'Service'}
                            />
                            {(() => {
                              const svcLower = String(svc || '').trim().toLowerCase();
                              if (!svcLower) return null;
                              const isSvcNew = isNewCategoryNow || !knownSvcsLowerNow.includes(svcLower);
                              return isSvcNew ? (
                                <span className="flag-new" style={{ marginLeft: 0 }}>NEW</span>
                              ) : null;
                            })()}
                            <button
                              type="button"
                              className="tiny-btn danger"
                              onClick={() => {
                                setEditForm((f) => {
                                  const cur = (f.servicesList || []).slice();
                                  const next = cur.filter((_, i) => i !== idx);
                                  return { ...f, servicesList: next.length ? next : [''] };
                                });
                              }}
                              aria-label="Remove service"
                              disabled={(editForm.servicesList || []).length <= 1}
                              title={(editForm.servicesList || []).length <= 1 ? 'At least 1 service is required' : 'Remove'}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="tiny-btn"
                          onClick={() => setEditForm((f) => ({ ...f, servicesList: [...(f.servicesList || []), ''] }))}
                        >
                          + Add service
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="value" style={{ lineHeight: 1.55 }}>
                      {(() => {
                        const cat = String(selectedSupplier.category || selectedSupplier.serviceCategory || '').trim();
                        const knownSvcs = (catalogOptions.servicesByCategory?.[cat] || []).map((s) => String(s || '').toLowerCase());
                        const list = Array.isArray(selectedSupplier.services) && selectedSupplier.services.length
                          ? selectedSupplier.services
                          : [selectedSupplier.service, selectedSupplier.serviceOther, selectedSupplier.serviceCategoryOther].filter(Boolean);
                        const cleaned = list.map((s) => String(s || '').trim()).filter(Boolean);
                        if (!cleaned.length) return '-';
                        return (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {cleaned.map((svc) => {
                              const isNew = !!svc && !knownSvcs.includes(String(svc).toLowerCase());
                              return (
                                <span
                                  key={svc}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    borderRadius: 999,
                                    padding: '6px 10px',
                                    border: isNew ? '1px solid rgba(245,158,11,0.55)' : '1px solid rgba(229,231,235,1)',
                                    background: isNew ? 'rgba(245,158,11,0.10)' : '#fff',
                                    fontWeight: 900,
                                    fontSize: 12,
                                    color: '#111827'
                                  }}
                                >
                                  {svc}
                                  {isNew && <span className="flag-new" style={{ marginLeft: 0 }}>NEW</span>}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <div className="modal-field">
                  <label>Years of Experience</label>
                  {editingProfile ? (
                    <input
                      type="number"
                      min="0"
                      value={editForm.yearsOfExperience}
                      onChange={(e) => setEditForm((f) => ({ ...f, yearsOfExperience: e.target.value }))}
                    />
                  ) : (
                    <div className="value">{selectedSupplier.yearsOfExperience ?? 0}</div>
                  )}
                </div>
              </div>

              <div style={{ margin: '18px 0 10px', fontSize: 12, fontWeight: 800, color: '#6b7280', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>Grading & approval</span>
                <span style={{ height: 1, flex: 1, alignSelf: 'center', background: 'rgba(229,231,235,1)' }} />
              </div>

              <div className="modal-grid">
                <div className="modal-field">
                  <label>Experience-based suggestion</label>
                  <div className="value">
                    {suggestedGradeFromExperience(editingProfile ? editForm.yearsOfExperience : selectedSupplier.yearsOfExperience)}
                  </div>
                </div>
                <div className="modal-field">
                  <label>Grading (A / B / C)</label>
                  <select value={selectedGrading} onChange={(e) => setSelectedGrading(e.target.value)}>
                    <option value="A">
                      {gradingConfig?.A?.label ? gradingConfig.A.label : 'A'}
                    </option>
                    <option value="B">
                      {gradingConfig?.B?.label ? gradingConfig.B.label : 'B'}
                    </option>
                    <option value="C">
                      {gradingConfig?.C?.label ? gradingConfig.C.label : 'C'}
                    </option>
                  </select>
                  {gradingConfig && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', lineHeight: 1.55, fontWeight: 700 }}>
                      <div>
                        <strong>A</strong> — Experience ≥ {gradingConfig.A?.minYears ?? '—'} years
                      </div>
                      <div>
                        <strong>B</strong> — Experience ≥ {gradingConfig.B?.minYears ?? '—'} years
                      </div>
                      <div>
                        <strong>C</strong> — Experience ≥ {gradingConfig.C?.minYears ?? '—'} years
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-field">
                  <label>Supplier status</label>
                  <div className="value">{selectedSupplier.supplierApprovalStatus || 'pending'}</div>
                </div>
                <div className="modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Bio</label>
                  {editingProfile ? (
                    <input value={editForm.bio} onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))} />
                  ) : (
                    <div className="value" style={{ lineHeight: 1.5, fontWeight: 800, color: '#374151' }}>
                      {selectedSupplier.bio || '-'}
                    </div>
                  )}
                </div>
                <div className="modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Documents</label>
                  <div className="value">
                    {buildSupplierDocUrls(selectedSupplier).length ? (
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => {
                          setActiveDocIndex(0);
                          setDocsOpen(true);
                        }}
                      >
                        View documents ({buildSupplierDocUrls(selectedSupplier).length})
                      </button>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              </div>
              {/* ── Send for Approval Banner ── */}
              {(() => {
                const flags = editingProfile
                  ? { hasAnyNew: hasNewCategoryOrServicesNow, isNewCategory: isNewCategoryNow, newServices: newServicesNow }
                  : getNewFlagsForSupplier(selectedSupplier);
                if (!flags.hasAnyNew) return null;
                return (
                  <div
                    style={{
                      marginTop: 18,
                      padding: '16px 18px',
                      borderRadius: 16,
                      border: '1px solid rgba(245,158,11,0.45)',
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(255,255,255,1) 100%)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b', fontSize: 20, marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 1100, color: '#92400e', fontSize: 14, marginBottom: 4 }}>
                          New Category / Services Detected
                        </div>
                        <div style={{ fontSize: 13, color: '#78350f', fontWeight: 800, lineHeight: 1.6 }}>
                          This supplier registered with items not yet in the service catalog. Send for approval to the Operational Manager (Admin2) to add them.
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {flags.isNewCategory && (
                            <span className="flag-new" style={{ marginLeft: 0 }}>
                              <i className="fas fa-folder-plus" style={{ fontSize: 10 }} /> Category: {editingProfile ? resolveCategoryFromEdit() : (selectedSupplier?.category || selectedSupplier?.serviceCategory || '')}
                            </span>
                          )}
                          {(flags.newServices || []).map((svc) => (
                            <span key={svc} className="flag-new" style={{ marginLeft: 0 }}>
                              <i className="fas fa-plus-circle" style={{ fontSize: 10 }} /> {svc}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        width: '100%',
                        padding: '12px 18px',
                        borderRadius: 14,
                        border: '1px solid rgba(245,158,11,0.55)',
                        background: requestSent
                          ? 'rgba(16,185,129,0.12)'
                          : 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: requestSent ? '#065f46' : '#fff',
                        fontWeight: 1100,
                        fontSize: 14,
                        cursor: requestSending || requestSent ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        opacity: requestSending ? 0.7 : 1,
                      }}
                      onClick={() => {
                        if (requestSending || requestSent) return;
                        if (editingProfile) {
                          handleRequestToAdmin2();
                        } else {
                          const { category: sCat, services: sServices } = getSupplierCategoryAndServices(selectedSupplier);
                          if (!sCat || !sServices.length) {
                            setError('Supplier has no category/services to send.');
                            return;
                          }
                          setRequestSending(true);
                          createCatalogRequest({
                            supplierId: selectedSupplier?.id,
                            supplierName: selectedSupplier?.fullName || '',
                            category: sCat,
                            services: sServices,
                          })
                            .then((res) => {
                              setError(res?.data?.message || 'Request sent for approval.');
                              setRequestSent(true);
                            })
                            .catch((err) => setError(err?.response?.data?.message || 'Failed to send request.'))
                            .finally(() => setRequestSending(false));
                        }
                      }}
                      disabled={requestSending || requestSent}
                    >
                      <i className={`fas ${requestSent ? 'fa-check-circle' : 'fa-paper-plane'}`} />
                      {requestSent ? 'Sent for Approval ✓' : requestSending ? 'Sending…' : 'Send for Approval'}
                    </button>
                  </div>
                );
              })()}

              {error && (
                <div className="auth-error" style={{ marginTop: 12 }}>
                  {error}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="modal-btn ghost" onClick={closeDetails} disabled={savingGrading}>
                  Cancel
                </button>

                {(() => {
                  const flags = editingProfile
                    ? { hasAnyNew: hasNewCategoryOrServicesNow, isNewCategory: isNewCategoryNow, newServices: newServicesNow }
                    : getNewFlagsForSupplier(selectedSupplier);

                  if (!flags.hasAnyNew) return null;

                  return (                    <button
                      type="button"
                      className="modal-btn"
                      style={{
                        background: requestSent ? 'rgba(16,185,129,0.12)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: requestSent ? '#065f46' : '#fff',
                        border: requestSent ? '1px solid rgba(16,185,129,0.35)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onClick={() => {
                        if (requestSending || requestSent) return;
                        if (editingProfile) {
                          handleRequestToAdmin2();
                        } else {
                          const { category: sCat, services: sServices } = getSupplierCategoryAndServices(selectedSupplier);
                          if (!sCat || !sServices.length) {
                            setError('Supplier has no category/services to send.');
                            return;
                          }
                          setRequestSending(true);
                          createCatalogRequest({
                            supplierId: selectedSupplier?.id,
                            supplierName: selectedSupplier?.fullName || '',
                            category: sCat,
                            services: sServices,
                          })
                            .then((res) => {
                              setError(res?.data?.message || 'Request sent for approval.');
                              setRequestSent(true);
                            })
                            .catch((err) => setError(err?.response?.data?.message || 'Failed to send request.'))
                            .finally(() => setRequestSending(false));
                        }
                      }}
                      disabled={requestSending || requestSent}
                    >
                      <i className={`fas ${requestSent ? 'fa-check-circle' : 'fa-paper-plane'}`} />
                      {requestSent ? 'Sent to Admin 2 ✓' : requestSending ? 'Sending…' : 'Send for Approval'}
                    </button>
                  );
                })()}

                {!editingProfile ? (
                  <button
                    type="button"
                    className="modal-btn ghost"
                    onClick={() => setEditingProfile(true)}
                    title={getNewFlagsForSupplier(selectedSupplier).hasAnyNew ? 'This request contains NEW category/services from supplier signup.' : undefined}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span>Edit Supplier</span>
                      {getNewFlagsForSupplier(selectedSupplier).hasAnyNew && <span className="flag-new" style={{ marginLeft: 0 }}>NEW</span>}
                    </span>
                  </button>
                ) : (
                  <button type="button" className="modal-btn primary" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Save Details'}
                  </button>
                )}
                <button
                  type="button"
                  className="modal-btn ghost"
                  onClick={handleSendCredentials}
                  disabled={sendingCreds}
                  title="Approve + send login password"
                >
                  {sendingCreds ? 'Sending...' : 'Send Credentials'}
                </button>
                <button type="button" className="modal-btn primary" onClick={handleSaveGrading} disabled={savingGrading}>
                  {savingGrading ? 'Saving...' : 'Save Grading'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {docsOpen && selectedSupplier && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="docs-modal-title"
          aria-label="Supplier documents"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDocsOpen(false);
          }}
        >
          <div className="modal modal--docs">
            <div className="modal-head">
              <div className="modal-head-main">
                <h3 id="docs-modal-title">View documents</h3>
                {managerTitle ? <div className="modal-manager">{managerTitle}</div> : null}
              </div>
              <button type="button" className="modal-close" onClick={() => setDocsOpen(false)} aria-label="Close documents">
                ×
              </button>
            </div>
            <div className="modal-body">
              {(() => {
                const docs = buildSupplierDocUrls(selectedSupplier);
                if (!docs.length) return <div className="muted">No documents uploaded.</div>;
                const safeIndex = Math.max(0, Math.min(docs.length - 1, Number(activeDocIndex) || 0));
                const active = docs[safeIndex];
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14 }}>
                    <div style={{ border: '1px solid rgba(229,231,235,1)', borderRadius: 16, overflow: 'hidden' }}>
                      <div style={{ padding: 12, borderBottom: '1px solid rgba(229,231,235,1)', fontWeight: 1100 }}>
                        Documents ({docs.length})
                      </div>
                      <div style={{ maxHeight: 420, overflow: 'auto' }}>
                        {docs.map((url, idx) => (
                          <button
                            key={`${idx}_${url}`}
                            type="button"
                            className="nav-item"
                            style={{
                              width: '100%',
                              borderRadius: 0,
                              justifyContent: 'space-between',
                              background: idx === safeIndex ? 'rgba(249,115,22,0.08)' : '#fff',
                              border: 'none',
                              borderBottom: '1px solid rgba(229,231,235,1)'
                            }}
                            onClick={() => setActiveDocIndex(idx)}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: '#6b7280' }}>{idx + 1}.</span>
                              <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {isLikelyPdfUrl(url) ? 'PDF' : isLikelyImageUrl(url) ? 'Image' : 'File'}
                              </span>
                            </span>
                            <span style={{ color: '#6b7280', fontWeight: 900 }}>{idx === safeIndex ? 'Open' : 'View'}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ border: '1px solid rgba(229,231,235,1)', borderRadius: 16, overflow: 'hidden' }}>
                      <div style={{ padding: 12, borderBottom: '1px solid rgba(229,231,235,1)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontWeight: 1100, color: '#111827' }}>Document {safeIndex + 1}</div>
                        <a href={active} target="_blank" rel="noreferrer" style={{ fontWeight: 1100 }}>
                          Open in new tab
                        </a>
                      </div>
                      <div style={{ padding: 12, background: '#fff' }}>
                        {isLikelyImageUrl(active) ? (
                          <img
                            src={active}
                            alt="Supplier document"
                            style={{ width: '100%', maxHeight: 'min(48vh, 380px)', objectFit: 'contain', borderRadius: 12, border: '1px solid rgba(229,231,235,1)' }}
                            onError={(e) => {
                              // fallback: if image cannot load, hide it and rely on open-in-new-tab
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : isLikelyPdfUrl(active) ? (
                          <iframe
                            title="PDF document"
                            src={active}
                            style={{ width: '100%', height: 'min(48vh, 380px)', border: '1px solid rgba(229,231,235,1)', borderRadius: 12 }}
                          />
                        ) : (
                          <div className="muted">
                            Preview not available. Use “Open in new tab”.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSuppliersPage;

