import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import Header from '../Header';
import Footer from '../Footer';
import '../../styles/HomePage.css';
import {
  completeCatalogRequest,
  fetchCatalogRequestCount,
  fetchCatalogRequests,
  fetchAdminCatalogOptions,
  fetchPublicCatalogOptions,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchAdminServices,
  createService,
  updateService,
  deleteService,
  updateCatalogRequest,
  fetchMarketResearch,
  upsertMarketResearch,
  fetchGradingConfig,
  saveGradingConfig
} from '../../services/api';

/** Dummy regional rates for dashboard research preview (UI only). */
const DUMMY_RESEARCH_ROWS = [
  { region: 'Colombo', avgMin: 1200, avgMax: 2800, demandPct: 72 },
  { region: 'Kandy', avgMin: 900, avgMax: 2100, demandPct: 58 },
  { region: 'Galle', avgMin: 800, avgMax: 1900, demandPct: 49 },
  { region: 'Jaffna', avgMin: 750, avgMax: 1700, demandPct: 41 }
];

const PREDICTION_DATA = [
  { category: "Plumber", service: "Tap & Leak Repair", min: 1200, max: 3000 },
  { category: "Plumber", service: "Commode/Sink Installation", min: 1800, max: 4500 },
  { category: "Plumber", service: "Drainage & Gully Cleaning", min: 1500, max: 4000 },
  { category: "Plumber", service: "Hot Water (Geyser) Service", min: 2500, max: 6000 },
  { category: "Electrician", service: "Fan & Light Installation", min: 1500, max: 3500 },
  { category: "Electrician", service: "DB Box/Circuit Troubleshooting", min: 2000, max: 5500 },
  { category: "Electrician", service: "Industrial/3-Phase Wiring", min: 4000, max: 10000 },
  { category: "Carpenter", service: "Door & Window Repair", min: 1500, max: 4000 },
  { category: "Carpenter", service: "Pantry Cupboard Refurbishing", min: 2000, max: 5500 },
  { category: "Carpenter", service: "Furniture Assembly (Flat-pack)", min: 1200, max: 3000 },
  { category: "Cleaner", service: "Full House Deep Cleaning", min: 1500, max: 3500 },
  { category: "Cleaner", service: "Sofa/Upholstery Shampooing", min: 2000, max: 5000 },
  { category: "Cleaner", service: "Office/Commercial Janitorial", min: 1000, max: 2500 },
  { category: "Cleaner", service: "Window/Glass Facade Cleaning", min: 1800, max: 4500 },
  { category: "Mechanic", service: "On-site Vehicle Inspection", min: 2500, max: 6500 },
  { category: "Mechanic", service: "Roadside Assistance/Jumpstart", min: 2000, max: 5000 },
  { category: "Gardener", service: "Grass Cutting & Weeding", min: 800, max: 2000 },
  { category: "Gardener", service: "Tree Felling/Pruning", min: 2500, max: 7000 },
  { category: "Gardener", service: "Garden Landscaping Design", min: 3500, max: 12000 },
  { category: "Painter", service: "Interior Wall Painting", min: 1200, max: 3500 },
  { category: "Painter", service: "Exterior Weather-Shielding", min: 2500, max: 6000 },
  { category: "Painter", service: "Waterproofing/Sealing", min: 3000, max: 7500 },
  { category: "HVAC Tech", service: "AC Master Service", min: 1500, max: 3500 },
  { category: "HVAC Tech", service: "AC Gas Refilling", min: 2500, max: 5500 },
  { category: "HVAC Tech", service: "Fridge/Freezer Repair", min: 2000, max: 5000 },
  { category: "Pest Control", service: "General Pest Spraying", min: 3000, max: 7500 },
  { category: "Pest Control", service: "Termite Soil Treatment", min: 5000, max: 15000 },
  { category: "IT Support", service: "Laptop/PC Repair", min: 2000, max: 5500 },
  { category: "IT Support", service: "Wi-Fi/Network Configuration", min: 1500, max: 4000 },
  { category: "IT Support", service: "CCTV Installation", min: 2500, max: 6000 },
  { category: "IT Support", service: "Data Recovery Services", min: 4000, max: 12000 },
  { category: "Tutor", service: "Primary Education (Grades 1-5)", min: 1000, max: 2500 },
  { category: "Tutor", service: "O/L & A/L Subjects", min: 2000, max: 5500 },
  { category: "Tutor", service: "Music/Instruments", min: 2500, max: 6000 },
  { category: "Fitness", service: "Personal Gym Coaching", min: 2500, max: 8000 },
  { category: "Fitness", service: "Yoga/Pilates Sessions", min: 3000, max: 9000 },
  { category: "Pet Care", service: "Dog Walking & Basic Care", min: 1000, max: 2500 },
  { category: "Pet Care", service: "Professional Dog Training", min: 3000, max: 7500 },
  { category: "Pet Care", service: "Mobile Pet Grooming", min: 2500, max: 6000 },
  { category: "Stylist", service: "Home Haircut/Styling", min: 1500, max: 5000 },
  { category: "Stylist", service: "Bridal Makeup & Dressing", min: 5000, max: 25000 },
  { category: "Stylist", service: "Skin Care/Facial at Home", min: 2500, max: 8000 },
  { category: "Photo", service: "Event Photography", min: 10000, max: 35000 },
  { category: "Photo", service: "Video Editing/Post-Production", min: 3000, max: 8500 },
  { category: "Photo", service: "Product/Drone Shoot", min: 15000, max: 50000 },
  { category: "Mover", service: "Professional Packing", min: 1200, max: 3500 },
  { category: "Mover", service: "Furniture Loading/Unloading", min: 1500, max: 4000 },
  { category: "Locksmith", service: "Key Duplication", min: 500, max: 2000 },
  { category: "Locksmith", service: "Smart Lock Installation", min: 3000, max: 8000 },
  { category: "Locksmith", service: "Emergency Lock Opening", min: 2500, max: 6500 },
  { category: "Handyman", service: "Wall Mount TV/Shelving", min: 1500, max: 4000 },
  { category: "Handyman", service: "Tile/Masonry Patchwork", min: 2000, max: 5500 },
  { category: "Handyman", service: "Door/Window Mesh Fixing", min: 1200, max: 3000 },
  { category: "Tailor", service: "Alterations & Repairs", min: 1000, max: 3000 },
  { category: "Tailor", service: "Custom Shirt/Trouser Stitching", min: 2500, max: 7000 },
  { category: "Tech Admin", service: "Data Entry & Formatting", min: 800, max: 2500 },
  { category: "Tech Admin", service: "Digital Marketing/Social Media", min: 2500, max: 7500 },
  { category: "Tech Admin", service: "Virtual Assistant Support", min: 1500, max: 4500 }
];

const Admin2DashboardPage = () => {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const [tab, setTab] = useState('overview');
  const [overviewSort, setOverviewSort] = useState('title');
  const [requests, setRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestForm, setRequestForm] = useState({
    category: '',
    categoryDescription: '',
    servicesText: '',
    minRatePerHour: '',
    maxRatePerHour: '',
    currency: 'LKR'
  });
  const [requestServices, setRequestServices] = useState([]);
  /** @type {Record<string, string>} */
  const [serviceDescriptionsByService, setServiceDescriptionsByService] = useState({});
  /** @type {Record<string, { min: number; max: number }>} */
  const [serviceRatesByService, setServiceRatesByService] = useState({});
  const [activeServiceName, setActiveServiceName] = useState(null);
  const [serviceRateMsg, setServiceRateMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [catalogOptions, setCatalogOptions] = useState({ categories: [], servicesByCategory: {} });
  const [categories, setCategories] = useState([]);
  const [taxSearch, setTaxSearch] = useState('');
  const [taxFilter, setTaxFilter] = useState('all');
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    active: true
  });
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const GRADING_KEY = 'lsf_grading_config_v1';
  const defaultGrading = {
    A: { minYears: 5, stars: 5, priceRangeMin: 80, priceRangeMax: 100, label: 'A - 5+ yers experience' },
    B: { minYears: 3, stars: 4, priceRangeMin: 60, priceRangeMax: 80, label: 'Grade B — 3+ years experience' },
    C: { minYears: 0, stars: 3, priceRangeMin: 0, priceRangeMax: 60, label: 'Grade C — emerging tier' }
  };
  const [gradingDraft, setGradingDraft] = useState(defaultGrading);
  const [gradingSaved, setGradingSaved] = useState(defaultGrading);
  const [gradingMsg, setGradingMsg] = useState('');

  // Services command center state
  const [services, setServices] = useState([]);
  const [marketRows, setMarketRows] = useState([]);
  const [researchSearchCat, setResearchSearchCat] = useState('');
  const [researchSearchSvc, setResearchSearchSvc] = useState('');
  const [svcSearch, setSvcSearch] = useState('');
  const [svcCategory, setSvcCategory] = useState('');
  const [svcStatus, setSvcStatus] = useState('all'); // all | active | inactive

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: '',
    durationMinutes: 60,
    skillLevel: 'Intermediate',
    minRatePerHour: 500,
    maxRatePerHour: 2000,
    currency: 'LKR',
    active: true
  });
  const [creating, setCreating] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [createFormTouched, setCreateFormTouched] = useState({});

  const validateServiceField = (name, value) => {
    if (name === 'title') {
      if (!value.trim()) return 'Service name is required';
      if (value.trim().length < 3) return 'Min 3 chars';
      return '';
    }
    if (name === 'description') {
      if (!value.trim()) return 'Description is required';
      if (value.trim().length < 10) return 'Min 10 chars';
      if (value.trim().length > 500) return 'Max 500 chars';
      return '';
    }
    return '';
  };

  const getSvcValidationClass = (name, value) => {
    if (!createFormTouched[name]) return '';
    return validateServiceField(name, value) ? 'invalid' : 'valid';
  };

  const handleSvcBlur = (name) => {
    setCreateFormTouched(prev => ({ ...prev, [name]: true }));
  };


  const isAdmin2 = useMemo(
    () => isAuthenticated && String(user?.email || '').toLowerCase() === 'admin2@admin.com',
    [isAuthenticated, user?.email]
  );

  const requestStatusBadge = (status) => {
    const s = String(status || 'pending').toLowerCase();
    if (s === 'completed') {
      return { label: 'Complete', bg: 'rgba(22,163,74,0.22)', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.5)' };
    }
    return { label: 'Pending', bg: 'rgba(217,119,6,0.2)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.45)' };
  };

  const loadRequests = async () => {
    const [rowsRes, countRes] = await Promise.all([fetchCatalogRequests(), fetchCatalogRequestCount()]);
    setRequests(rowsRes.data.requests || []);
    setPendingCount(countRes.data.pendingCount || 0);
  };

  const loadCatalog = async () => {
    try {
      const res = await fetchAdminCatalogOptions();
      setCatalogOptions({
        categories: res.data?.categories || [],
        servicesByCategory: res.data?.servicesByCategory || {}
      });
    } catch {
      try {
        const pub = await fetchPublicCatalogOptions();
        setCatalogOptions({
          categories: pub.data?.categories || [],
          servicesByCategory: pub.data?.servicesByCategory || {}
        });
      } catch {
        setCatalogOptions({ categories: [], servicesByCategory: {} });
      }
    }
  };

  const loadMarket = async () => {
    const res = await fetchMarketResearch();
    setMarketRows(res.data.items || []);
  };

  const loadCategories = async () => {
    const res = await fetchCategories({ search: taxSearch.trim() || undefined });
    setCategories(res.data || []);
  };

  const loadServices = async () => {
    const res = await fetchAdminServices({
      search: svcSearch.trim() || undefined,
      category: svcCategory.trim() || undefined
    });
    setServices(res.data || []);
  };

  useEffect(() => {
    if (!isAdmin2) return;
    loadRequests().catch(() => {});
    loadCatalog().catch(() => {});
    loadMarket().catch(() => {});
    loadServices().catch(() => {});
    loadCategories().catch(() => {});
  }, [isAdmin2]);



  useEffect(() => {
    if (!isAdmin2) return;
    (async () => {
      try {
        const res = await fetchGradingConfig();
        const d = res.data;
        if (d?.A && d?.B && d?.C) {
          setGradingDraft(d);
          setGradingSaved(d);
          return;
        }
      } catch {
        // ignore
      }
      try {
        const raw = localStorage.getItem(GRADING_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && parsed.A && parsed.B && parsed.C) {
          setGradingDraft(parsed);
          setGradingSaved(parsed);
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin2]);

  if (!isAdmin2) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 760, background: '#fff', borderRadius: 18, border: '1px solid rgba(229,231,235,1)', padding: 22 }}>
          <h2 style={{ margin: 0, fontWeight: 1100, color: '#111827' }}>Operational Manager access required</h2>
          <p style={{ margin: '8px 0 0', color: '#6b7280', fontWeight: 800 }}>
            Please sign in with operational manager credentials to manage categories, services, and live requests.
          </p>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => (window.location.hash = 'login')}>
              Go to Login
            </button>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  window.location.hash = 'login';
                }}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const openRequestEditor = (req) => {
    setSelectedRequest(req);
    setServiceRateMsg('');
    const svcs = Array.isArray(req.services) ? [...req.services] : [];
    setRequestServices(svcs);
    const fallbackMin = Number(req.minRatePerHour);
    const fallbackMax = Number(req.maxRatePerHour);
    const fbMin = Number.isFinite(fallbackMin) && fallbackMin >= 0 ? fallbackMin : 500;
    const fbMax = Number.isFinite(fallbackMax) && fallbackMax >= fbMin ? fallbackMax : Math.max(fbMin + 500, 1500);
    const existing = Array.isArray(req.serviceRates) ? req.serviceRates : [];
    /** @type {Record<string, { min: number; max: number }>} */
    const rates = {};
    svcs.forEach((raw) => {
      const name = String(raw || '').trim();
      if (!name) return;
      const found = existing.find((r) => String(r?.service || '').trim() === name);
      let min = found ? Number(found.minRatePerHour) : fbMin;
      let max = found ? Number(found.maxRatePerHour) : fbMax;
      if (!Number.isFinite(min) || min < 0) min = fbMin;
      if (!Number.isFinite(max) || max <= min) max = min + 500;
      rates[name] = { min, max };
    });
    setServiceRatesByService(rates);
    const legacyDesc = String(req.serviceDescription || '').trim();
    const fromApi = Array.isArray(req.serviceDescriptions) ? req.serviceDescriptions : [];
    /** @type {Record<string, string>} */
    const descMap = {};
    svcs.forEach((raw) => {
      const name = String(raw || '').trim();
      if (!name) return;
      const found = fromApi.find((d) => String(d?.service || '').trim() === name);
      descMap[name] = found ? String(found.description || '') : legacyDesc;
    });
    setServiceDescriptionsByService(descMap);
    const firstName = svcs.map((s) => String(s || '').trim()).find(Boolean) || null;
    setActiveServiceName(firstName);
    setRequestForm({
      category: req.category || '',
      categoryDescription: req.categoryDescription || '',
      servicesText: (req.services || []).join(', '),
      minRatePerHour: req.minRatePerHour ?? '',
      maxRatePerHour: req.maxRatePerHour ?? '',
      currency: req.currency || 'LKR'
    });
  };

  const requestType = (req) => {
    const cat = String(req?.category || '').trim();
    const knownCats = (catalogOptions.categories || []).map((c) => String(c).toLowerCase());
    const isKnownCategory = !!cat && knownCats.includes(cat.toLowerCase());
    if (!isKnownCategory) return 'category';

    const knownSvcs = (catalogOptions.servicesByCategory?.[req?.category] || []).map((s) => String(s).toLowerCase());
    const reqSvcs = Array.isArray(req?.services) ? req.services : [];
    const hasNewService = reqSvcs.some((s) => s && !knownSvcs.includes(String(s).toLowerCase()));
    return hasNewService ? 'service' : 'service';
  };

  useEffect(() => {
    if (!selectedRequest) return;
    const names = (requestServices || []).map((s) => String(s || '').trim()).filter(Boolean);
    setServiceRatesByService((prev) => {
      const next = { ...prev };
      const sample =
        Object.values(next)[0] ||
        (() => {
          const a = Number(requestForm.minRatePerHour);
          const b = Number(requestForm.maxRatePerHour);
          const mn = Number.isFinite(a) && a >= 0 ? a : 500;
          const mx = Number.isFinite(b) && b > mn ? b : mn + 500;
          return { min: mn, max: mx };
        })();
      let changed = false;
      names.forEach((name) => {
        if (!next[name]) {
          next[name] = { min: sample.min, max: sample.max };
          changed = true;
        }
      });
      Object.keys(next).forEach((k) => {
        if (!names.includes(k)) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    setActiveServiceName((cur) => {
      if (cur && names.includes(cur)) return cur;
      return names[0] || null;
    });
    setServiceDescriptionsByService((prev) => {
      const next = { ...prev };
      let changed = false;
      names.forEach((name) => {
        if (!(name in next)) {
          next[name] = '';
          changed = true;
        }
      });
      Object.keys(next).forEach((k) => {
        if (!names.includes(k)) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [requestServices, selectedRequest?._id]);

  const goToRequestTarget = (req) => {
    const type = requestType(req);
    if (type === 'category') {
      setTab('category');
      setCategoryForm((f) => ({
        ...f,
        name: String(req?.category || '').trim(),
        description: String(req?.categoryDescription || '').trim(),
        active: true
      }));
      return;
    }
    setTab('services');
    const list = Array.isArray(req?.services) ? req.services : [];
    const first = list[0] || '';
    setCreateForm((f) => ({
      ...f,
      category: String(req?.category || '').trim(),
      title: String(first || '').trim()
    }));
  };

  const buildServiceRatesPayload = () => {
    const list = (requestServices || []).map((s) => String(s || '').trim()).filter(Boolean);
    return list.map((service) => {
      const r = serviceRatesByService[service] || { min: 0, max: 0 };
      return {
        service,
        minRatePerHour: Number(r.min),
        maxRatePerHour: Number(r.max)
      };
    });
  };

  const buildServiceDescriptionsPayload = () => {
    const list = (requestServices || []).map((s) => String(s || '').trim()).filter(Boolean);
    return list.map((service) => ({
      service,
      description: String(serviceDescriptionsByService[service] ?? '').trim()
    }));
  };

  const legacyServiceDescriptionForApi = () => {
    const list = (requestServices || []).map((s) => String(s || '').trim()).filter(Boolean);
    for (const s of list) {
      const t = String(serviceDescriptionsByService[s] ?? '').trim();
      if (t) return t;
    }
    return '';
  };

  const saveRequest = async () => {
    if (!selectedRequest) return;
    try {
      setSaving(true);
      setError('');
      const serviceRates = buildServiceRatesPayload();
      const nums = serviceRates.flatMap((r) => [r.minRatePerHour, r.maxRatePerHour]).filter((n) => Number.isFinite(n) && n > 0);
      const aggMin = nums.length ? Math.min(...nums) : Number(requestForm.minRatePerHour) || 0;
      const aggMax = nums.length ? Math.max(...nums) : Number(requestForm.maxRatePerHour) || 0;
      const res = await updateCatalogRequest(selectedRequest._id, {
        category: requestForm.category,
        categoryDescription: requestForm.categoryDescription,
        services: (requestServices || []).map((s) => String(s || '').trim()).filter(Boolean),
        serviceDescriptions: buildServiceDescriptionsPayload(),
        serviceDescription: legacyServiceDescriptionForApi(),
        serviceRates,
        minRatePerHour: aggMin,
        maxRatePerHour: aggMax,
        currency: requestForm.currency,
        status: 'in_review'
      });
      const updated = res?.data?.request;
      if (updated) setSelectedRequest(updated);
      await loadRequests();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save request.');
    } finally {
      setSaving(false);
    }
  };

  const saveActiveServiceRate = async () => {
    if (!selectedRequest || !activeServiceName) return;
    const key = String(activeServiceName).trim();
    if (!serviceRatesByService[key]) return;
    try {
      setSaving(true);
      setError('');
      setServiceRateMsg('');
      const serviceRates = buildServiceRatesPayload();
      const nums = serviceRates.flatMap((r) => [r.minRatePerHour, r.maxRatePerHour]).filter((n) => Number.isFinite(n) && n > 0);
      const aggMin = nums.length ? Math.min(...nums) : Number(requestForm.minRatePerHour) || 0;
      const aggMax = nums.length ? Math.max(...nums) : Number(requestForm.maxRatePerHour) || 0;
      const res = await updateCatalogRequest(selectedRequest._id, {
        category: requestForm.category,
        categoryDescription: requestForm.categoryDescription,
        services: (requestServices || []).map((s) => String(s || '').trim()).filter(Boolean),
        serviceDescriptions: buildServiceDescriptionsPayload(),
        serviceDescription: legacyServiceDescriptionForApi(),
        serviceRates,
        minRatePerHour: aggMin,
        maxRatePerHour: aggMax,
        currency: requestForm.currency,
        status: 'in_review'
      });
      const updated = res?.data?.request;
      if (updated) setSelectedRequest(updated);
      setServiceRateMsg(`Saved rate for “${key}”.`);
      await loadRequests();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save service rate.');
    } finally {
      setSaving(false);
    }
  };

  const completeRequest = async () => {
    if (!selectedRequest) return;
    try {
      setSaving(true);
      setError('');
      const serviceRates = buildServiceRatesPayload();
      const nums = serviceRates.flatMap((r) => [r.minRatePerHour, r.maxRatePerHour]).filter((n) => Number.isFinite(n) && n > 0);
      const aggMin = nums.length ? Math.min(...nums) : Number(requestForm.minRatePerHour) || 0;
      const aggMax = nums.length ? Math.max(...nums) : Number(requestForm.maxRatePerHour) || 0;
      await updateCatalogRequest(selectedRequest._id, {
        category: requestForm.category,
        categoryDescription: requestForm.categoryDescription,
        services: (requestServices || []).map((s) => String(s || '').trim()).filter(Boolean),
        serviceDescriptions: buildServiceDescriptionsPayload(),
        serviceDescription: legacyServiceDescriptionForApi(),
        serviceRates,
        minRatePerHour: aggMin,
        maxRatePerHour: aggMax,
        currency: requestForm.currency,
        status: 'in_review'
      });
      await completeCatalogRequest(selectedRequest._id);
      setSelectedRequest(null);
      setServiceRateMsg('');
      await Promise.all([loadRequests(), loadCatalog(), loadMarket(), loadServices(), loadCategories()]);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to complete request.');
    } finally {
      setSaving(false);
    }
  };

  const activeRateDomain = useMemo(() => {
    const hasSvc = (requestServices || []).some((s) => String(s || '').trim());
    if (hasSvc && activeServiceName && serviceRatesByService[activeServiceName]) {
      const r = serviceRatesByService[activeServiceName];
      return computeRateDomain(r.min, r.max);
    }
    const mn = Number(requestForm.minRatePerHour) || 0;
    const mx = Number(requestForm.maxRatePerHour) || 0;
    return computeRateDomain(mn, mx);
  }, [activeServiceName, serviceRatesByService, requestForm.minRatePerHour, requestForm.maxRatePerHour, requestServices]);

  useEffect(() => {
    if (!isAdmin2) return;
    const t = setTimeout(() => loadServices().catch(() => {}), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcSearch, svcCategory]);

  useEffect(() => {
    if (!isAdmin2) return;
    if (tab === 'category') {
      loadCategories().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (!isAdmin2) return;
    const t = setTimeout(() => loadCategories().catch(() => {}), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxSearch]);

  const marketMap = useMemo(() => {
    const map = new Map();
    marketRows.forEach((r) => {
      map.set(`${String(r.category || '').toLowerCase()}::${String(r.service || '').toLowerCase()}`, r);
    });
    return map;
  }, [marketRows]);

  const serviceCreateDomain = useMemo(
    () => computeRateDomain(Number(createForm.minRatePerHour) || 0, Number(createForm.maxRatePerHour) || 0),
    [createForm.minRatePerHour, createForm.maxRatePerHour]
  );

  const visibleServices = useMemo(() => {
    let rows = [...services];
    if (svcStatus === 'active') rows = rows.filter((s) => s.active !== false);
    if (svcStatus === 'inactive') rows = rows.filter((s) => s.active === false);
    return rows;
  }, [services, svcStatus]);

  const metrics = useMemo(() => {
    const total = services.length;
    const activeCount = services.filter((s) => s.active !== false).length;
    const coverage = services.reduce((acc, s) => {
      const key = `${String(s.category || '').toLowerCase()}::${String(s.title || '').toLowerCase()}`;
      return acc + (marketMap.has(key) ? 1 : 0);
    }, 0);
    const coveragePct = total ? Math.round((coverage / total) * 100) : 0;
    const uniqueCats = Array.from(new Set(services.map((s) => s.category).filter(Boolean))).length;
    return { total, activeCount, coveragePct, uniqueCats };
  }, [services, marketMap]);

  const overviewServicesSorted = useMemo(() => {
    const rows = [...services];
    const cmp = (a, b) => {
      if (overviewSort === 'category') {
        return String(a.category || '').localeCompare(String(b.category || ''), undefined, { sensitivity: 'base' });
      }
      if (overviewSort === 'status') {
        const sa = a.active !== false ? 1 : 0;
        const sb = b.active !== false ? 1 : 0;
        return sb - sa;
      }
      return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' });
    };
    rows.sort(cmp);
    return rows;
  }, [services, overviewSort]);

  // Research command center state
  const [ledgerRows, setLedgerRows] = useState(() => [
    { id: cryptoId(), category: '', service: '', location: '', minRatePerHour: '', maxRatePerHour: '', currency: 'LKR', demand: 55 }
  ]);
  const [ledgerSaving, setLedgerSaving] = useState(false);

  const ledgerInsights = useMemo(() => {
    const parsed = ledgerRows
      .map((r) => ({
        ...r,
        min: Number(r.minRatePerHour),
        max: Number(r.maxRatePerHour),
        demandNum: Number(r.demand)
      }))
      .filter((r) => r.category && r.service && Number.isFinite(r.min) && Number.isFinite(r.max) && r.max >= r.min);

    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const avgMin = avg(parsed.map((r) => r.min));
    const avgMax = avg(parsed.map((r) => r.max));
    const avgDemand = avg(parsed.map((r) => r.demandNum));
    const overallRange = parsed.length ? { min: Math.min(...parsed.map((r) => r.min)), max: Math.max(...parsed.map((r) => r.max)) } : { min: 0, max: 0 };

    // Recommend a competitive entry point:
    // base = midpoint, then adjust +-8% based on demand vs 50.
    const midpoint = (avgMin + avgMax) / 2 || 0;
    const demandAdj = midpoint * (((avgDemand - 50) / 50) * 0.08);
    const recommended = Math.max(0, midpoint + demandAdj);

    return {
      count: parsed.length,
      avgMin: Math.round(avgMin),
      avgMax: Math.round(avgMax),
      avgDemand: Math.round(avgDemand),
      overallMin: Math.round(overallRange.min),
      overallMax: Math.round(overallRange.max),
      recommended: Math.round(recommended)
    };
  }, [ledgerRows]);

  const intelligenceFeed = useMemo(() => {
    const alerts = [];
    const now = new Date();
    const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    ledgerRows.forEach((r) => {
      const min = Number(r.minRatePerHour);
      const max = Number(r.maxRatePerHour);
      const demand = Number(r.demand);
      if (!r.category || !r.service || !Number.isFinite(min) || !Number.isFinite(max) || max < min) return;
      const mid = (min + max) / 2 || 1;
      const volatility = (max - min) / mid;
      if (volatility >= 0.6) {
        alerts.push({
          t: fmt(now),
          level: 'high',
          msg: `Volatility alert: ${r.service} (${r.location || 'All'}) has a wide band (${min}–${max} ${r.currency}).`
        });
      } else if (demand >= 80 && volatility >= 0.35) {
        alerts.push({
          t: fmt(now),
          level: 'med',
          msg: `Demand surge: ${r.service} shows high demand (${demand}%). Consider tightening range.`
        });
      }
    });

    if (!alerts.length) {
      alerts.push({ t: fmt(now), level: 'ok', msg: 'No regional volatility alerts detected in current ledger.' });
    }
    return alerts.slice(0, 6);
  }, [ledgerRows]);

  const calibrationSeries = useMemo(() => {
    // Build a smooth curve from ledger recommended baseline across experience levels (1..5).
    const base = ledgerInsights.recommended || 0;
    const levels = [1, 2, 3, 4, 5].map((lvl) => {
      const factor = 0.78 + lvl * 0.11; // 0.89..1.33 (premium scaling)
      return { level: lvl, rate: Math.round(base * factor) };
    });
    return levels;
  }, [ledgerInsights.recommended]);

  const saveLedgerToBackend = async () => {
    const rows = ledgerRows
      .map((r) => ({
        category: String(r.category || '').trim(),
        service: String(r.service || '').trim(),
        location: String(r.location || '').trim(),
        min: Number(r.minRatePerHour),
        max: Number(r.maxRatePerHour),
        currency: String(r.currency || 'LKR').trim(),
        demand: Number(r.demand)
      }))
      .filter((r) => r.category && r.service && Number.isFinite(r.min) && Number.isFinite(r.max) && r.max >= r.min);

    if (!rows.length) {
      setError('Add at least one valid ledger row (category, service, min/max).');
      return;
    }

    try {
      setLedgerSaving(true);
      setError('');
      // Persist each node into MarketResearch.
      // Location + demand are embedded into description for now (backend schema stays unchanged).
      await Promise.all(
        rows.map((r) =>
          upsertMarketResearch({
            category: r.category,
            service: r.service,
            description: `Location: ${r.location || 'All'} | Demand: ${Number.isFinite(r.demand) ? r.demand : 0}%`,
            minRatePerHour: r.min,
            maxRatePerHour: r.max,
            currency: r.currency || 'LKR'
          })
        )
      );
      await loadMarket();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save ledger entries.');
    } finally {
      setLedgerSaving(false);
    }
  };

  const visibleCategories = useMemo(() => {
    let rows = [...categories];
    if (taxFilter === 'active') rows = rows.filter((c) => c.active);
    if (taxFilter === 'inactive') rows = rows.filter((c) => !c.active);
    return rows;
  }, [categories, taxFilter]);

  const duplicateNames = useMemo(() => {
    const count = {};
    categories.forEach((c) => {
      const key = String(c.name || '').trim().toLowerCase();
      if (!key) return;
      count[key] = (count[key] || 0) + 1;
    });
    return Object.entries(count)
      .filter(([, n]) => n > 1)
      .map(([name]) => name);
  }, [categories]);

  const createServiceRow = async () => {
    try {
      setCreating(true);
      setError('');
      setCreateFormTouched({ title: true, description: true });
      if (validateServiceField('title', createForm.title) || validateServiceField('description', createForm.description) || !createForm.category.trim()) {
        setError('Please fix validation errors and ensure category is selected.');
        setCreating(false);
        return;
      }
      const min = Number(createForm.minRatePerHour);
      const max = Number(createForm.maxRatePerHour);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
        setError('Set a valid hourly rate range (min must be less than max).');
        return;
      }
      const payload = {
        title: createForm.title.trim(),
        category: createForm.category.trim(),
        durationMinutes: Number(createForm.durationMinutes) || 60,
        skillLevel: createForm.skillLevel,
        active: createForm.active !== false,
        providerName: 'System Catalog',
        location: 'All',
        contact: 'N/A',
        description: String(createForm.description || '').trim()
      };
      if (editingService) {
        await updateService(editingService._id, payload);
      } else {
        await createService(payload);
      }
      await upsertMarketResearch({
        category: createForm.category.trim(),
        service: createForm.title.trim(),
        description: String(createForm.description || '').trim(),
        minRatePerHour: min,
        maxRatePerHour: max,
        currency: createForm.currency || 'LKR'
      });
      resetServiceForm();
      await Promise.all([loadServices(), loadCatalog(), loadMarket(), loadCategories()]);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save service.');
    } finally {
      setCreating(false);
    }
  };

  const createCategoryRow = async () => {
    try {
      setCreatingCategory(true);
      setError('');
      if (!categoryForm.name.trim()) {
        setError('Category name is required.');
        return;
      }
      await createCategory({
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        active: !!categoryForm.active
      });
      setCategoryForm({ name: '', description: '', active: true });
      await Promise.all([loadCategories(), loadCatalog()]);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create category.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const toggleCategoryStatus = async (row) => {
    try {
      setSaving(true);
      setError('');
      await updateCategory(row.id, { active: !row.active });
      await Promise.all([loadCategories(), loadCatalog()]);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update category.');
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = (row) => {
    setCategoryToDelete(row);
  };

  const confirmRemoveCategory = async () => {
    if (!categoryToDelete) return;
    try {
      setSaving(true);
      setError('');
      await deleteCategory(categoryToDelete.id);
      await Promise.all([loadCategories(), loadCatalog()]);
      setCategoryToDelete(null);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to remove category.');
    } finally {
      setSaving(false);
    }
  };

  const resetServiceForm = () => {
    setEditingService(null);
    setCreateFormTouched({});
    setCreateForm({
      title: '',
      description: '',
      category: '',
      durationMinutes: 60,
      skillLevel: 'Intermediate',
      minRatePerHour: 500,
      maxRatePerHour: 2000,
      currency: 'LKR',
      active: true
    });
  };

  const openEditService = (svc) => {
    const key = `${String(svc.category || '').toLowerCase()}::${String(svc.title || '').toLowerCase()}`;
    const mr = marketMap.get(key);
    const minR = mr ? Number(mr.minRatePerHour) : 500;
    const maxR = mr ? Number(mr.maxRatePerHour) : Math.max(minR + 500, 2000);
    setEditingService(svc);
    setCreateFormTouched({});
    setCreateForm({
      title: svc.title || '',
      description: String(svc.description || ''),
      category: svc.category || '',
      durationMinutes: svc.durationMinutes ?? 60,
      skillLevel: svc.skillLevel || 'Intermediate',
      minRatePerHour: Number.isFinite(minR) ? minR : 500,
      maxRatePerHour: Number.isFinite(maxR) && maxR > minR ? maxR : minR + 500,
      currency: mr?.currency || 'LKR',
      active: svc.active !== false
    });
  };

  const removeService = async (svc) => {
    if (!window.confirm(`Remove "${svc.title}"?`)) return;
    try {
      setSaving(true);
      setError('');
      await deleteService(svc._id);
      await Promise.all([loadServices(), loadCatalog()]);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to remove service.');
    } finally {
      setSaving(false);
    }
  };

  const categoryServiceCounts = useMemo(() => {
    const m = new Map();
    services.forEach((s) => {
      const c = String(s.category || '—').trim() || '—';
      m.set(c, (m.get(c) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [services]);

  const maxDummyDemand = Math.max(...DUMMY_RESEARCH_ROWS.map((r) => r.demandPct), 1);

  const handleLoginClick = () => {
    window.location.hash = 'login';
  };
  const handleSignupClick = () => {
    window.location.hash = 'signup';
  };
  const handleProfileClick = () => {
    window.location.hash = 'profile';
  };

  return (
    <>
      <Header
        user={user}
        isAuthenticated={isAuthenticated}
        onAddServiceClick={() => {}}
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
        onLogout={logout}
        onProfileClick={handleProfileClick}
      />
      <div className="cc-shell cc-shell-light">
      <style>{`
        .cc-shell{
          min-height: calc(100vh - 80px);
          display:flex;
          background: radial-gradient(circle at 10% 0%, rgba(30,41,59,0.95), rgba(2,6,23,1) 55%);
          color:#e5e7eb;
        }
        .cc-sidebar{
          width: 260px;
          border-right: 1px solid rgba(148,163,184,0.22);
          background: radial-gradient(circle at top, rgba(2,6,23,0.75), rgba(2,6,23,0.98));
          padding: 16px;
          display:flex;
          flex-direction:column;
          gap: 14px;
        }
        .cc-brand{
          display:flex;
          align-items:center;
          gap: 10px;
          padding: 10px 8px;
        }
        .cc-badge{
          width: 42px;
          height: 42px;
          border-radius: 16px;
          background: linear-gradient(120deg, #22d3ee, #0ea5e9);
          color:#0b1120;
          font-weight: 1100;
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow: 0 18px 45px rgba(14,165,233,0.25);
        }
        .cc-brand h3{ margin:0; font-weight:1100; font-size: 15px; color:#e5e7eb; }
        .cc-brand p{ margin:4px 0 0; color:#94a3b8; font-weight:800; font-size: 12px; }
        .cc-role{
          margin: 2px 0 0 !important;
          color:#7dd3fc !important;
          font-weight: 900 !important;
          font-size: 11px !important;
        }
        .cc-nav{
          display:flex;
          flex-direction:column;
          gap: 8px;
          padding: 6px;
          border: 1px solid rgba(148,163,184,0.14);
          border-radius: 18px;
          background: rgba(2,6,23,0.55);
        }
        .cc-nav button{
          text-align:left;
          border-radius: 16px;
          padding: 12px 12px;
          border: 1px solid transparent;
          background: transparent;
          cursor:pointer;
          font-weight: 1100;
          font-size: 13px;
          color:#cbd5e1;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
        }
        .cc-nav button.active{
          border-color: rgba(34,211,238,0.35);
          background: radial-gradient(circle at 0 0, rgba(34,211,238,0.20), rgba(2,6,23,0.9));
          color:#e0f2fe;
        }
        .pill{
          font-size: 12px;
          font-weight: 1100;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.18);
          color:#94a3b8;
          background: rgba(2,6,23,0.6);
        }
        .cc-main{
          flex:1;
          display:flex;
          flex-direction:column;
          min-width:0;
        }
        .cc-header{
          height: 68px;
          border-bottom: 1px solid rgba(148,163,184,0.18);
          background: rgba(2,6,23,0.65);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
          padding: 0 18px;
        }
        .cc-header h2{ margin:0; font-size: 18px; font-weight: 1100; color:#e5e7eb; }
        .cc-header .sub{ margin-top:4px; font-size: 13px; font-weight:900; color:#94a3b8; }
        .cc-actions{ display:flex; align-items:center; gap: 10px; }
        .icon-btn{
          width: 42px;
          height: 42px;
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(2,6,23,0.6);
          color:#cbd5e1;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          position: relative;
        }
        .notif{
          position:absolute;
          top: -6px;
          right: -6px;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: rgba(34,197,94,0.95);
          color:#052e16;
          font-weight: 1100;
          font-size: 12px;
          display:flex;
          align-items:center;
          justify-content:center;
          border: 1px solid rgba(16,185,129,0.45);
        }
        .logout-btn{
          border-radius: 16px;
          padding: 10px 14px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(2,6,23,0.6);
          color:#e5e7eb;
          font-weight: 1100;
          cursor:pointer;
        }
        .cc-content{
          padding: 18px;
        }

        .zone{
          display:grid;
          grid-template-columns: 1.7fr 1fr;
          gap: 14px;
          align-items:start;
        }
        .card{
          background: rgba(2,6,23,0.65);
          border: 1px solid rgba(148,163,184,0.18);
          border-radius: 20px;
          padding: 14px;
          box-shadow: 0 25px 70px rgba(0,0,0,0.25);
        }
        .card h3{ margin:0; font-weight:1100; color:#e5e7eb; font-size: 14px; }
        .card p{ margin:6px 0 0; font-weight:800; color:#94a3b8; font-size: 12px; }
        .grid{
          display:grid;
          gap: 10px;
          margin-top: 12px;
        }
        .row2{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .row3{ display:grid; grid-template-columns: 1fr 1fr 120px; gap: 10px; }
        .with-error { position: relative; padding-top: 18px; }
        .Validation-msg {
          position: absolute; top: 0; right: 0; font-size: 11px; font-weight: 900;
          padding: 2px 6px; border-radius: 6px; z-index: 2;
        }
        .Validation-msg.error { background: #fee2e2; color: #ef4444; }
        .Validation-msg.success { background: #dcfce7; color: #22c55e; }
        .input.valid, .textarea.valid, .select.valid { border: 2px solid #22c55e !important; }
        .input.invalid, .textarea.invalid, .select.invalid { border: 2px solid #ef4444 !important; }

        .input, .select{
          width:100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(51,65,85,1);
          background: rgba(15,23,42,0.92);
          color:#e5e7eb;
          outline:none;
          font-weight: 800;
        }
        .primary{
          border:none;
          border-radius: 999px;
          padding: 10px 12px;
          background: linear-gradient(120deg, #22d3ee, #0ea5e9);
          color:#0b1120;
          font-weight: 1100;
          cursor:pointer;
        }
        .primary:disabled{ opacity: 0.7; cursor:not-allowed; }
        .metric-grid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 12px;
        }
        .metric{
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,0.14);
          background: rgba(2,6,23,0.55);
          padding: 12px;
        }
        .metric .k{ color:#94a3b8; font-weight:900; font-size: 12px; }
        .metric .v{ margin-top:6px; font-size: 20px; font-weight:1100; color:#e5e7eb; }

        .table-wrap{
          margin-top: 14px;
          border-radius: 20px;
          border: 1px solid rgba(59,130,246,0.22);
          overflow:hidden;
          background: rgba(2,6,23,0.65);
        }
        table{
          width:100%;
          border-collapse: collapse;
        }
        th, td{
          padding: 12px 10px;
          border-bottom: 1px solid rgba(59,130,246,0.14);
          text-align:left;
          font-size: 12px;
          font-weight: 900;
          color:#e5e7eb;
          vertical-align: middle;
        }
        th{
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color:#94a3b8;
          font-size: 11px;
          background: rgba(15,23,42,0.75);
        }
        .status{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(2,6,23,0.55);
          color:#cbd5e1;
          font-weight: 1100;
        }
        .dot{
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(148,163,184,0.55);
        }
        .dot.green{ background: rgba(34,197,94,0.95); }
        .dot.red{ background: rgba(248,113,113,0.95); }
        .actions{
          display:flex;
          gap: 8px;
        }
        .btn{
          border-radius: 999px;
          padding: 8px 10px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(2,6,23,0.55);
          color:#e5e7eb;
          font-weight: 1100;
          cursor:pointer;
          font-size: 12px;
        }
        .btn.danger{
          border-color: rgba(248,113,113,0.28);
          color:#fecaca;
        }

        .modal{
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.55);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 18px;
          z-index: 9999;
        }
        .modal-card{
          width:100%;
          max-width: 640px;
          background: rgba(2,6,23,0.95);
          border: 1px solid rgba(59,130,246,0.28);
          border-radius: 20px;
          padding: 14px;
          box-shadow: 0 25px 70px rgba(0,0,0,0.35);
        }
        .tax-zone{
          display:grid;
          grid-template-columns: 1fr 1.8fr;
          gap: 14px;
        }
        .inventory-top{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .inventory-tools{
          display:flex;
          gap: 10px;
          align-items:center;
          flex-wrap: wrap;
        }
        .integrity{
          margin-top: 12px;
          border: 1px solid rgba(148,163,184,0.18);
          border-radius: 16px;
          padding: 10px;
          background: rgba(2,6,23,0.5);
        }
        .integrity h4{
          margin:0;
          font-size: 12px;
          color:#e5e7eb;
          font-weight:1100;
        }
        .integrity p{
          margin:6px 0 0;
          color:#94a3b8;
          font-weight:800;
          font-size: 12px;
        }
        .grade-zone{
          display:grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 14px;
          align-items:start;
        }
        .grade-stack{
          display:grid;
          gap: 12px;
        }
        .grade-card{
          border-radius: 20px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(2,6,23,0.65);
          padding: 14px;
          box-shadow: 0 25px 70px rgba(0,0,0,0.25);
        }
        .grade-head{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap: 12px;
        }
        .grade-title{
          display:flex;
          align-items:center;
          gap: 10px;
        }
        .grade-badge{
          width: 40px;
          height: 40px;
          border-radius: 16px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight: 1100;
          color:#0b1120;
        }
        .grade-badge.a{ background: linear-gradient(120deg, #22d3ee, #0ea5e9); }
        .grade-badge.b{ background: linear-gradient(120deg, #fde68a, #f59e0b); }
        .grade-badge.c{ background: linear-gradient(120deg, #cbd5e1, #64748b); color:#020617; }
        .grade-card h3{ margin:0; font-weight:1100; color:#e5e7eb; font-size: 14px; }
        .grade-card p{ margin:6px 0 0; font-weight:800; color:#94a3b8; font-size: 12px; }
        .slider-row{
          margin-top: 12px;
          display:grid;
          grid-template-columns: 1fr 160px;
          gap: 10px;
          align-items:center;
        }
        .slider-row label{
          color:#cbd5e1;
          font-weight: 900;
          font-size: 12px;
        }
        .slider{
          width:100%;
        }
        .pill2{
          justify-self:end;
          font-size: 12px;
          font-weight: 1100;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(2,6,23,0.55);
          color:#e5e7eb;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .preview{
          border-radius: 20px;
          border: 1px solid rgba(59,130,246,0.22);
          background: rgba(2,6,23,0.65);
          padding: 14px;
          box-shadow: 0 25px 70px rgba(0,0,0,0.25);
        }
        .preview h3{ margin:0; font-weight:1100; color:#e5e7eb; font-size: 14px; }
        .preview p{ margin:6px 0 0; font-weight:800; color:#94a3b8; font-size: 12px; }
        .profile-mock{
          margin-top: 12px;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(15,23,42,0.75);
          padding: 12px;
          display:flex;
          gap: 12px;
          align-items:center;
        }
        .avatar{
          width: 52px;
          height: 52px;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(2,6,23,0.55);
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight: 1100;
          color:#e5e7eb;
        }
        .mock-meta{
          flex:1;
          min-width:0;
        }
        .mock-meta .name{
          font-weight:1100;
          color:#e5e7eb;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mock-meta .sub{
          margin-top:4px;
          color:#94a3b8;
          font-weight:800;
          font-size: 12px;
        }
        .badge-pill{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(2,6,23,0.55);
          color:#e5e7eb;
          font-weight: 1100;
          font-size: 12px;
          margin-top: 8px;
        }
        .boost-bar{
          margin-top: 10px;
          height: 10px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.14);
          background: rgba(2,6,23,0.45);
          overflow:hidden;
        }
        .boost-fill{
          height: 100%;
          background: linear-gradient(120deg, #22d3ee, #0ea5e9);
        }
        .footer-bar{
          position: sticky;
          bottom: 0;
          margin-top: 14px;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.18);
          background: rgba(2,6,23,0.78);
          padding: 12px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap: 12px;
          backdrop-filter: blur(10px);
        }
        .footer-msg{
          color:#94a3b8;
          font-weight: 800;
          font-size: 12px;
        }
        .footer-actions{
          display:flex;
          gap: 10px;
          align-items:center;
        }

        @media (max-width: 980px){
          .cc-shell{ flex-direction:column; }
          .cc-sidebar{ width:100%; }
          .zone{ grid-template-columns: 1fr; }
          .tax-zone{ grid-template-columns: 1fr; }
          .grade-zone{ grid-template-columns: 1fr; }
        }

        .cc-shell-light{
          background: linear-gradient(180deg, #fff7ed 0%, #f8fafc 45%, #ffffff 100%);
          color: #111827;
        }
        .cc-shell-light .cc-sidebar{
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
        }
        .cc-shell-light .cc-brand h3{ color: #111827; }
        .cc-shell-light .cc-brand p{ color: #64748b; }
        .cc-shell-light .cc-nav{
          background: #f8fafc;
          border-color: #e5e7eb;
        }
        .cc-shell-light .cc-nav button{
          color: #475569;
        }
        .cc-shell-light .cc-nav button.active{
          border-color: rgba(249,115,22,0.45);
          background: linear-gradient(120deg, rgba(249,115,22,0.12), rgba(255,255,255,0.95));
          color: #c2410c;
        }
        .cc-shell-light .pill{
          background: #fff;
          border-color: #e5e7eb;
          color: #64748b;
        }
        .cc-shell-light .cc-header{
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
        }
        .cc-shell-light .cc-header h2{ color: #111827; }
        .cc-shell-light .cc-header .sub{ color: #64748b; }
        .cc-shell-light .icon-btn, .cc-shell-light .logout-btn{
          background: #f8fafc;
          border-color: #e5e7eb;
          color: #334155;
        }
        .cc-shell-light .card{
          background: #ffffff;
          border-color: #e5e7eb;
          box-shadow: 0 12px 40px rgba(15,23,42,0.06);
          text-align: left;
        }
        .cc-shell-light .card h3{ color: #111827; }
        .cc-shell-light .card p{ color: #64748b; }
        .cc-shell-light .metric{
          background: #f8fafc;
          border-color: #e5e7eb;
        }
        .cc-shell-light .metric .k{ color: #64748b; }
        .cc-shell-light .metric .v{ color: #111827; }
        .cc-shell-light .table-wrap{
          background: #ffffff;
          border-color: #fed7aa;
        }
        .cc-shell-light th{
          background: #fff7ed;
          color: #9a3412;
          border-bottom-color: #e5e7eb;
        }
        .cc-shell-light td{
          color: #334155;
          border-bottom-color: #f1f5f9;
        }
        .cc-shell-light .input, .cc-shell-light .select{
          background: #ffffff;
          border-color: #e5e7eb;
          color: #111827;
        }
        .cc-shell-light .btn{
          background: #f8fafc;
          border-color: #e5e7eb;
          color: #334155;
        }
        .cc-shell-light .primary{
          background: linear-gradient(120deg, #fb923c, #f97316);
          color: #fff;
        }
        .cc-shell-light .status{
          background: #f8fafc;
          border-color: #e5e7eb;
          color: #334155;
        }
        .cc-shell-light .integrity,
        .cc-shell-light .grade-card,
        .cc-shell-light .preview,
        .cc-shell-light .profile-mock,
        .cc-shell-light .badge-pill,
        .cc-shell-light .footer-bar,
        .cc-shell-light .modal-card{
          background: #ffffff;
          border-color: #e5e7eb;
          box-shadow: 0 12px 40px rgba(15,23,42,0.06);
          text-align: left;
        }
        .cc-shell-light .grade-card h3,
        .cc-shell-light .preview h3,
        .cc-shell-light .integrity h4,
        .cc-shell-light .mock-meta .name{
          color: #111827;
          font-size: 15px;
        }
        .cc-shell-light .grade-card p,
        .cc-shell-light .preview p,
        .cc-shell-light .integrity p,
        .cc-shell-light .mock-meta .sub,
        .cc-shell-light .footer-msg{
          color: #475569;
          font-size: 13px;
          font-weight: 800;
        }
        .cc-shell-light .slider-row label{
          color: #334155;
          font-size: 13px;
        }
        .cc-shell-light .pill2{
          background: #f8fafc;
          border-color: #e5e7eb;
          color: #334155;
          font-size: 13px;
        }
        .cc-shell-light .cc-content{
          font-size: 14px;
          color: #1f2937;
        }
        .cc-shell-light .cc-content .card *,
        .cc-shell-light .cc-content .table-wrap *,
        .cc-shell-light .cc-content .integrity *,
        .cc-shell-light .cc-content .grade-card *,
        .cc-shell-light .cc-content .preview *,
        .cc-shell-light .cc-content .profile-mock *,
        .cc-shell-light .cc-content .badge-pill *,
        .cc-shell-light .cc-content .footer-bar *,
        .cc-shell-light .cc-content .modal-card *{
          color: #1f2937 !important;
          font-size: 14px;
        }
        .cc-shell-light .cc-content .card h3,
        .cc-shell-light .cc-content .grade-card h3,
        .cc-shell-light .cc-content .preview h3,
        .cc-shell-light .cc-content .integrity h4{
          font-size: 16px !important;
          font-weight: 1100 !important;
          color: #111827 !important;
        }
        .cc-shell-light .cc-content .card p,
        .cc-shell-light .cc-content .preview p,
        .cc-shell-light .cc-content .integrity p{
          font-size: 13px !important;
          font-weight: 800 !important;
          color: #334155 !important;
        }
        .cc-shell-light .cc-content .grid,
        .cc-shell-light .cc-content .row2,
        .cc-shell-light .cc-content .row3,
        .cc-shell-light .cc-content .zone,
        .cc-shell-light .cc-content .tax-zone,
        .cc-shell-light .cc-content .grade-zone{
          align-items: start;
        }
        .cc-shell-light .table-wrap td{
          font-size: 13px;
          color: #1f2937;
        }
        .cc-shell-light .table-wrap th{
          font-size: 12px;
          font-weight: 900;
        }
        .cc-shell-light .research-bar{
          height: 10px;
          border-radius: 999px;
          background: #f1f5f9;
          overflow: hidden;
        }
        .cc-shell-light .research-bar-fill{
          display:block;
          height:100%;
          background: linear-gradient(90deg, #fb923c, #f97316);
          border-radius: 999px;
        }
      `}</style>

      <aside className="cc-sidebar">
        <div className="cc-brand">
          <div className="cc-badge">OM</div>
          <div>
            <h3>Operational Manager</h3>
            <p className="cc-role">Catalog, rates &amp; live operations</p>
          </div>
        </div>

        <div className="cc-nav" role="navigation" aria-label="Admin2 navigation">
          <button type="button" className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
            <span>Overview</span>
            <span className="pill">Summary</span>
          </button>
          <button type="button" className={tab === 'category' ? 'active' : ''} onClick={() => setTab('category')}>
            <span>Category</span>
          </button>
          <button type="button" className={tab === 'services' ? 'active' : ''} onClick={() => setTab('services')}>
            <span>Services</span>
            <span className="pill">Command</span>
          </button>
          <button type="button" className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>
            <span>Requests</span>
            <span className="pill">{pendingCount}</span>
          </button>
          <button type="button" className={tab === 'research' ? 'active' : ''} onClick={() => setTab('research')}>
            <span>Research</span>
            <span className="pill">Rates</span>
          </button>
          <button type="button" className={tab === 'grading' ? 'active' : ''} onClick={() => setTab('grading')}>
            <span>Grading</span>
            <span className="pill">A/B/C</span>
          </button>
        </div>

        <div style={{ marginTop: 'auto', color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>
          Operational Manager · sidebar navigation
        </div>
      </aside>

      <div className="cc-main">
        <div className="cc-header">
          <div>
            <h2>
              {tab === 'overview'
                ? 'Dashboard overview'
                : tab === 'services'
                  ? 'Services Command Center'
                  : tab === 'category'
                    ? 'Category'
                    : tab === 'requests'
                      ? 'Requests'
                      : tab === 'research'
                        ? 'Market Research'
                        : 'Grading'}
            </h2>
            <div className="sub">Operational Manager workspace · authorized catalog &amp; rate changes</div>
          </div>
          <div className="cc-actions">
            <button type="button" className="icon-btn" title="Notifications" onClick={() => setTab('requests')}>
              <i className="fas fa-bell" />
              {pendingCount > 0 && <span className="notif">{pendingCount}</span>}
            </button>
            <button
              type="button"
              className="logout-btn"
              onClick={() => {
                logout();
                window.location.hash = 'login';
              }}
            >
              Logout
            </button>
          </div>
        </div>

      {error && <div style={{ marginBottom: 10, color: '#991b1b', fontWeight: 900 }}>{error}</div>}

        <div className="cc-content">
          {error && <div style={{ marginBottom: 10, color: '#b91c1c', fontWeight: 900 }}>{error}</div>}

          {tab === 'overview' && (
            <>
              <div className="zone">
                <div className="card">
                  <h3>Operational snapshot</h3>
                  <p>Read-only totals from the live catalog.</p>
                  <div className="metric-grid">
                    <div className="metric">
                      <div className="k">Total services</div>
                      <div className="v">{metrics.total}</div>
                    </div>
                    <div className="metric">
                      <div className="k">Active services</div>
                      <div className="v">{metrics.activeCount}</div>
                    </div>
                    <div className="metric">
                      <div className="k">Unique categories</div>
                      <div className="v">{metrics.uniqueCats}</div>
                    </div>
                    <div className="metric">
                      <div className="k">Research coverage</div>
                      <div className="v">{metrics.coveragePct}%</div>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <h3>Market research (dummy)</h3>
                  <p>Sample regional demand — placeholder data for UI research.</p>
                  <div style={{ marginTop: 12 }}>
                    {DUMMY_RESEARCH_ROWS.map((row) => (
                      <div key={row.region} style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            fontSize: 12,
                            fontWeight: 800,
                            color: '#334155'
                          }}
                        >
                          <span>{row.region}</span>
                          <span>
                            {row.avgMin.toLocaleString()}–{row.avgMax.toLocaleString()} LKR · {row.demandPct}% demand
                          </span>
                        </div>
                        <div className="research-bar" aria-hidden="true">
                          <span
                            className="research-bar-fill"
                            style={{ width: `${(row.demandPct / maxDummyDemand) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="zone">
                <div className="card">
                  <h3>Categories in use</h3>
                  <p>Service counts per category (from registered services).</p>
                  <div className="table-wrap" style={{ marginTop: 12 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Services</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryServiceCounts.length ? (
                          categoryServiceCounts.map(([name, count]) => (
                            <tr key={name}>
                              <td>{name}</td>
                              <td>{count}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2}>
                              No services yet — add services under the Services tab.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card">
                  <h3>Grading tiers</h3>
                  <p>Current saved thresholds (read-only here; edit under Grading).</p>
                  <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: '#334155', fontWeight: 800, fontSize: 13, lineHeight: 1.7 }}>
                    {(['A', 'B', 'C']).map((k) => {
                      const g = gradingSaved[k];
                      const y = g ? Number(g.minYears) : 0;
                      const line = g?.label
                        ? `${k} — ${g.label}`
                        : `${k} — Experience ≥ ${Number.isFinite(y) ? y : 0} years`;
                      return <li key={k}>{line}</li>;
                    })}
                  </ul>
                </div>
              </div>

              <div className="card" style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Service catalog</h3>
                    <p style={{ margin: '6px 0 0' }}>Read-only list — sort for review only.</p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 900, color: '#475569' }}>
                    Sort services
                    <select
                      className="select"
                      style={{ width: 200 }}
                      value={overviewSort}
                      onChange={(e) => setOverviewSort(e.target.value)}
                    >
                      <option value="title">Name (A–Z)</option>
                      <option value="category">Category (A–Z)</option>
                      <option value="status">Status (active first)</option>
                    </select>
                  </label>
                </div>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Category</th>
                        <th>Rate (min–max)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overviewServicesSorted.length ? (
                        overviewServicesSorted.map((s) => (
                          <tr key={s._id}>
                            <td>{s.title}</td>
                            <td>{s.category || '—'}</td>
                            <td>
                              {Number(s.minRatePerHour) || 0}–{Number(s.maxRatePerHour) || 0} {s.currency || 'LKR'}
                            </td>
                            <td>
                              <span className="status">
                                <span className={`dot ${s.active !== false ? 'green' : 'red'}`} />
                                {s.active !== false ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4}>No services loaded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab === 'services' && (
            <>
              <div className="zone">
                <div className="card">
                  <h3>{editingService ? 'Edit service' : 'Register one service'}</h3>
                  <p>Name, description, hourly rate band, and operational status (one service at a time).</p>
                  <div className="grid">
                    <div className="row2">
                      <div className="with-error" style={{ width: '100%' }}>
                        {createFormTouched.title && (
                          <div className={`Validation-msg ${validateServiceField('title', createForm.title) ? 'error' : 'success'}`}>
                            {validateServiceField('title', createForm.title) || 'Looks good!'}
                          </div>
                        )}
                        <input className={`input ${getSvcValidationClass('title', createForm.title)}`} value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} onBlur={() => handleSvcBlur('title')} placeholder="Service name" />
                      </div>
                      <select className="select" value={createForm.category} onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}>
                        <option value="">Select category…</option>
                        {catalogOptions.categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="with-error" style={{ width: '100%' }}>
                      {createFormTouched.description && (
                        <div className={`Validation-msg ${validateServiceField('description', createForm.description) ? 'error' : 'success'}`}>
                          {validateServiceField('description', createForm.description) || 'Looks good!'}
                        </div>
                      )}
                      <textarea
                        className={`input ${getSvcValidationClass('description', createForm.description)}`}
                        style={{ minHeight: 72, resize: 'vertical' }}
                        value={createForm.description}
                        onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                        onBlur={() => handleSvcBlur('description')}
                        placeholder="Service description"
                      />
                    </div>
                    <div style={{ color: '#94a3b8', fontWeight: 900, fontSize: 12 }}>Hourly rate band (min – max)</div>
                    <DualThumbRateSlider
                      domainMin={serviceCreateDomain.domainMin}
                      domainMax={serviceCreateDomain.domainMax}
                      min={Number(createForm.minRatePerHour) || 0}
                      max={Number(createForm.maxRatePerHour) || 0}
                      onChange={({ min, max }) =>
                        setCreateForm((f) => ({
                          ...f,
                          minRatePerHour: min,
                          maxRatePerHour: max
                        }))
                      }
                      currency={createForm.currency || 'LKR'}
                      disabled={creating}
                    />
                    <div className="row2">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setCreateForm((f) => ({ ...f, active: !f.active }))}
                      >
                        Status: {createForm.active ? 'Active' : 'Inactive'}
                      </button>
                      {editingService ? (
                        <button type="button" className="btn" onClick={resetServiceForm} disabled={creating}>
                          Cancel edit
                        </button>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: 12, fontWeight: 800 }}>Inactive hides this service from the public catalog.</span>
                      )}
                    </div>
                    <button type="button" className="primary" disabled={creating} onClick={createServiceRow}>
                      {creating ? 'Saving…' : editingService ? 'Update service' : 'Register service'}
                    </button>
                  </div>
                </div>

                <div className="card">
                  <h3>Live Metrics</h3>
                  <p>System grades and efficiency stats</p>
                  <div className="metric-grid">
                    <div className="metric">
                      <div className="k">Total services</div>
                      <div className="v">{metrics.total}</div>
                    </div>
                    <div className="metric">
                      <div className="k">Active services</div>
                      <div className="v">{metrics.activeCount}</div>
                    </div>
                    <div className="metric">
                      <div className="k">Unique categories</div>
                      <div className="v">{metrics.uniqueCats}</div>
                    </div>
                    <div className="metric">
                      <div className="k">Market value coverage</div>
                      <div className="v">{metrics.coveragePct}%</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>
                    Tip: Use the Research tab to add missing per-hour values.
                  </div>
                </div>
              </div>

              <div className="table-wrap">
                <div style={{ padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 1100, color: '#e5e7eb' }}>Service Inventory Table</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input className="input" style={{ width: 220 }} value={svcSearch} onChange={(e) => setSvcSearch(e.target.value)} placeholder="Search…" />
                    <select className="select" style={{ width: 220 }} value={svcCategory} onChange={(e) => setSvcCategory(e.target.value)}>
                      <option value="">All categories</option>
                      {catalogOptions.categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <select className="select" style={{ width: 160 }} value={svcStatus} onChange={(e) => setSvcStatus(e.target.value)}>
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Category</th>
                      <th>Duration</th>
                      <th>Skill</th>
                      <th>Market/hr</th>
                      <th>Status</th>
                      <th style={{ width: 210 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleServices.length ? (
                      visibleServices.map((s) => {
                        const key = `${String(s.category || '').toLowerCase()}::${String(s.title || '').toLowerCase()}`;
                        const mr = marketMap.get(key);
                        const isActive = s.active !== false;
                        return (
                          <tr key={s._id}>
                            <td style={{ fontWeight: 1100 }}>{s.title}</td>
                            <td style={{ color: '#cbd5e1' }}>{s.category || '-'}</td>
                            <td style={{ color: '#cbd5e1' }}>{Number(s.durationMinutes || 0) || 60} min</td>
                            <td style={{ color: '#cbd5e1' }}>{s.skillLevel || 'Intermediate'}</td>
                            <td style={{ color: '#cbd5e1' }}>
                              {mr ? `${mr.currency || 'LKR'} ${mr.minRatePerHour}–${mr.maxRatePerHour}` : <span style={{ color: '#94a3b8' }}>Not set</span>}
                            </td>
                            <td>
                              <span className="status">
                                <span className={`dot ${isActive ? 'green' : 'red'}`} />
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="actions">
                                <button type="button" className="btn" onClick={() => openEditService(s)}>
                                  Edit
                                </button>
                                <button type="button" className="btn danger" onClick={() => removeService(s)} disabled={saving}>
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ color: '#94a3b8', fontWeight: 800 }}>
                          No services found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'category' && (
            <div className="tax-zone">
              <div>
                <div className="card">
                  <h3>Category Creation</h3>
                  <p>Create categories and set active or inactive for the public catalog.</p>
                  <div className="grid">
                    <input
                      className="input"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Category name"
                    />
                    <textarea
                      className="input"
                      style={{ minHeight: 90, resize: 'vertical' }}
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Short description"
                    />
                    <div className="row2">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setCategoryForm((f) => ({ ...f, active: !f.active }))}
                      >
                        Status: {categoryForm.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <button type="button" className="primary" onClick={createCategoryRow} disabled={creatingCategory}>
                      {creatingCategory ? 'Creating…' : 'Create Category'}
                    </button>
                  </div>
                </div>

                <div className="integrity">
                  <h4>System Integrity Panel</h4>
                  <p>Total categories: {categories.length}</p>
                  <p>Duplicate warnings: {duplicateNames.length}</p>
                  {duplicateNames.length ? (
                    <p style={{ color: '#fecaca' }}>Duplicates: {duplicateNames.join(', ')}</p>
                  ) : (
                    <p style={{ color: '#bbf7d0' }}>No duplicate category names found.</p>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="inventory-top">
                  <div>
                    <h3>Category Inventory Table</h3>
                    <p>High-density list with identifiers and status badges</p>
                  </div>
                  <div className="inventory-tools">
                    <input className="input" style={{ width: 220 }} value={taxSearch} onChange={(e) => setTaxSearch(e.target.value)} placeholder="Search categories…" />
                    <select className="select" style={{ width: 160 }} value={taxFilter} onChange={(e) => setTaxFilter(e.target.value)}>
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="table-wrap" style={{ marginTop: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>ID</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th style={{ width: 180 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCategories.length ? (
                        visibleCategories.map((c) => (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 1100 }}>{c.name}</td>
                            <td style={{ color: '#cbd5e1' }}>{c.code}</td>
                            <td style={{ color: '#cbd5e1' }}>{c.description || '-'}</td>
                            <td>
                              <span className="status">
                                <span className={`dot ${c.active ? 'green' : 'red'}`} />
                                {c.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="actions">
                                <button type="button" className="btn" onClick={() => setEditingCategory(c)}>
                                  Edit
                                </button>
                                <button type="button" className="btn" onClick={() => toggleCategoryStatus(c)} disabled={saving}>
                                  Toggle
                                </button>
                                <button type="button" className="btn danger" onClick={() => removeCategory(c)} disabled={saving}>
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ color: '#94a3b8', fontWeight: 800 }}>
                            No categories found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {categoryToDelete && (
                <div className="modal">
                  <div className="modal-card">
                    <h3 style={{ margin: 0, fontWeight: 1100, color: '#e5e7eb', fontSize: 18 }}>Confirm Deletion</h3>
                    <p style={{ marginTop: 10, color: '#fca5a5', fontWeight: 800 }}>
                      Are you sure you want to delete the category <strong>&quot;{categoryToDelete.name}&quot;</strong>?<br/><br/>
                      <span style={{ color: '#ef4444' }}>Warning:</span> This will irreversibly remove all services under this category and freeze any suppliers assigned to it.
                    </p>
                    <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button type="button" className="btn" onClick={() => setCategoryToDelete(null)} disabled={saving}>
                        Cancel
                      </button>
                      <button type="button" className="btn danger" onClick={confirmRemoveCategory} disabled={saving}>
                        {saving ? 'Deleting...' : 'Delete Category'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

      {tab === 'requests' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h3>Incoming Requests</h3>
                <p>Each request routes to Category or Service creation</p>
              </div>
              <div style={{ color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>Count: {requests.length}</div>
            </div>

            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>From</th>
                    <th>Category</th>
                    <th>Services</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length ? (
                    requests.map((req) => (
                      <tr key={req._id} style={{ cursor: 'pointer' }} onClick={() => openRequestEditor(req)}>
                        <td>
                          <button
                            type="button"
                            className="btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              goToRequestTarget(req);
                            }}
                            title="Go to related page"
                          >
                            {requestType(req) === 'category' ? 'Category' : 'Service'}
                          </button>
                        </td>
                        <td style={{ color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>{req.supplierName || 'Admin'}</td>
                        <td style={{ fontWeight: 1100 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {req.category || '-'}
                            <span style={{ padding: '1px 5px', borderRadius: 999, border: '1px solid rgba(245,158,11,0.55)', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontWeight: 1100, fontSize: 9 }}>NEW</span>
                          </span>
                        </td>
                        <td style={{ color: '#cbd5e1' }}>
                          {(req.services || []).map((svc, si) => (
                            <span key={si} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
                              {svc}
                              <span style={{ padding: '1px 4px', borderRadius: 999, border: '1px solid rgba(245,158,11,0.45)', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', fontWeight: 1100, fontSize: 8 }}>NEW</span>
                            </span>
                          ))}
                          {!(req.services || []).length && '-'}
                        </td>
                        <td>
                          {(() => {
                            const b = requestStatusBadge(req.status);
                            return (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: 999,
                                  fontWeight: 900,
                                  fontSize: 12,
                                  background: b.bg,
                                  color: b.color,
                                  border: b.border
                                }}
                              >
                                {b.label}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ color: '#94a3b8', fontWeight: 800 }}>
                        No requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h3>Request Detail</h3>
                <p>Admin1 approval — set each service rate on the slider, save, then publish</p>
              </div>
              {selectedRequest && (
                <div style={{ color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>#{String(selectedRequest._id).slice(-6)}</div>
              )}
            </div>

            {selectedRequest ? (
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                {/* Supplier info banner */}
                {(selectedRequest.supplierName || selectedRequest.supplierId) && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 14,
                    border: '1px solid rgba(245,158,11,0.35)',
                    background: 'rgba(245,158,11,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap'
                  }}>
                    <i className="fas fa-user-tie" style={{ color: '#f59e0b', fontSize: 14 }} />
                    <span style={{ fontWeight: 900, color: '#92400e', fontSize: 13 }}>
                      Supplier: <strong>{selectedRequest.supplierName || 'Unknown'}</strong>
                    </span>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 999,
                      border: '1px solid rgba(245,158,11,0.55)',
                      background: 'rgba(245,158,11,0.12)',
                      color: '#92400e',
                      fontWeight: 1100,
                      fontSize: 11
                    }}>
                      NEW REQUEST
                    </span>
                    {selectedRequest.supplierId && (
                      <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 800 }}>
                        ID: {String(selectedRequest.supplierId).slice(-8)}
                      </span>
                    )}
                  </div>
                )}

                <div style={{ border: '1px solid rgba(59,130,246,0.18)', borderRadius: 16, padding: 12, background: 'rgba(2,6,23,0.55)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 1100, color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {requestForm.category || selectedRequest.category}
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1px solid rgba(245,158,11,0.55)',
                        background: 'rgba(245,158,11,0.15)',
                        color: '#fbbf24',
                        fontWeight: 1100,
                        fontSize: 10,
                        letterSpacing: '0.04em'
                      }}>NEW</span>
                      <span style={{ marginLeft: 4, color: '#94a3b8', fontWeight: 900, fontSize: 12 }}>
                        ({requestType(selectedRequest)})
                      </span>
                    </div>
                    <div>
                      {(() => {
                        const b = requestStatusBadge(selectedRequest.status);
                        return (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: 999,
                              fontWeight: 900,
                              fontSize: 12,
                              background: b.bg,
                              color: b.color,
                              border: b.border
                            }}
                          >
                            {b.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                    {(requestServices || []).filter((s) => String(s || '').trim()).length ? (
                      requestServices.map((svc, idx) => {
                        const name = String(svc || '').trim();
                        if (!name) return null;
                        const r = serviceRatesByService[name] || { min: 0, max: 0 };
                        const active = activeServiceName === name;
                        return (
                          <button
                            type="button"
                            key={`${idx}_${name}`}
                            onClick={() => {
                              setActiveServiceName(name);
                              setServiceRateMsg('');
                            }}
                            style={{
                              textAlign: 'left',
                              cursor: 'pointer',
                              border: active ? '1px solid rgba(34,211,238,0.55)' : '1px solid rgba(148,163,184,0.18)',
                              borderRadius: 16,
                              padding: 10,
                              background: active ? 'rgba(14,165,233,0.12)' : 'rgba(2,6,23,0.55)',
                              color: 'inherit',
                              font: 'inherit'
                            }}
                          >
                            <div style={{ fontWeight: 1100, color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {name}
                              <span style={{
                                padding: '1px 6px',
                                borderRadius: 999,
                                border: '1px solid rgba(245,158,11,0.55)',
                                background: 'rgba(245,158,11,0.15)',
                                color: '#fbbf24',
                                fontWeight: 1100,
                                fontSize: 9,
                                letterSpacing: '0.04em'
                              }}>NEW</span>
                            </div>
                            <div style={{ marginTop: 6, color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>
                              {requestForm.currency || selectedRequest.currency || 'LKR'} {r.min} – {r.max} / hr
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div style={{ color: '#94a3b8', fontWeight: 800, gridColumn: '1 / -1' }}>No services listed — use the slider below for a category-level band.</div>
                    )}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div style={{ color: '#94a3b8', fontWeight: 900, fontSize: 12, marginBottom: 8 }}>
                      {(requestServices || []).filter((s) => String(s || '').trim()).length
                        ? `Rate band — ${activeServiceName || 'select a service'}`
                        : 'Rate band (category)'}
                    </div>
                    {(requestServices || []).filter((s) => String(s || '').trim()).length ? (
                      activeServiceName && serviceRatesByService[activeServiceName] ? (
                        <DualThumbRateSlider
                          domainMin={activeRateDomain.domainMin}
                          domainMax={activeRateDomain.domainMax}
                          min={serviceRatesByService[activeServiceName].min}
                          max={serviceRatesByService[activeServiceName].max}
                          onChange={({ min, max }) => {
                            const key = String(activeServiceName).trim();
                            setServiceRatesByService((prev) => ({
                              ...prev,
                              [key]: { min, max }
                            }));
                          }}
                          currency={requestForm.currency || selectedRequest.currency || 'LKR'}
                          disabled={saving}
                        />
                      ) : (
                        <div style={{ color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>Click a service above to adjust its range.</div>
                      )
                    ) : (
                      <DualThumbRateSlider
                        domainMin={activeRateDomain.domainMin}
                        domainMax={activeRateDomain.domainMax}
                        min={Number(requestForm.minRatePerHour) || 0}
                        max={Number(requestForm.maxRatePerHour) || 0}
                        onChange={({ min, max }) =>
                          setRequestForm((f) => ({
                            ...f,
                            minRatePerHour: String(min),
                            maxRatePerHour: String(max)
                          }))
                        }
                        currency={requestForm.currency || selectedRequest.currency || 'LKR'}
                        disabled={saving}
                      />
                    )}
                  </div>

                  {(requestServices || []).filter((s) => String(s || '').trim()).length > 0 && activeServiceName ? (
                    <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                      <div style={{ color: '#94a3b8', fontWeight: 900, fontSize: 12 }}>
                        Service description — <span style={{ color: '#e5e7eb' }}>{activeServiceName}</span>
                      </div>
                      <textarea
                        className="input"
                        style={{ minHeight: 96, resize: 'vertical' }}
                        value={serviceDescriptionsByService[activeServiceName] ?? ''}
                        onChange={(e) =>
                          setServiceDescriptionsByService((prev) => ({
                            ...prev,
                            [activeServiceName]: e.target.value
                          }))
                        }
                        placeholder={`Notes for “${activeServiceName}” only`}
                      />
                    </div>
                  ) : null}
                </div>

                <input className="input" value={requestForm.category} onChange={(e) => setRequestForm((f) => ({ ...f, category: e.target.value }))} placeholder="Category name" />
                <input className="input" value={requestForm.categoryDescription} onChange={(e) => setRequestForm((f) => ({ ...f, categoryDescription: e.target.value }))} placeholder="Category description" />
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ color: '#94a3b8', fontWeight: 900, fontSize: 12 }}>Services (one per box)</div>
                  {(requestServices || []).length ? (
                    requestServices.map((svc, i) => (
                      <input
                        key={`${i}_${svc}`}
                        className="input"
                        value={svc}
                        onChange={(e) =>
                          setRequestServices((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))
                        }
                        placeholder={`Service #${i + 1}`}
                      />
                    ))
                  ) : (
                    <div style={{ color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>No services listed.</div>
                  )}
                </div>
                {serviceRateMsg ? (
                  <div style={{ color: '#22d3ee', fontWeight: 800, fontSize: 12 }}>{serviceRateMsg}</div>
                ) : null}
                <div className="actions" style={{ flexWrap: 'wrap' }}>
                  {(requestServices || []).filter((s) => String(s || '').trim()).length > 0 && activeServiceName ? (
                    <button type="button" className="btn" onClick={saveActiveServiceRate} disabled={saving}>
                      Save rate (this service)
                    </button>
                  ) : null}
                  <button type="button" className="btn" onClick={saveRequest} disabled={saving}>
                    Save all
                  </button>
                  <button type="button" className="primary" onClick={completeRequest} disabled={saving}>
                    Complete + Publish
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12, color: '#94a3b8', fontWeight: 800 }}>Select a request from the table to inspect.</div>
            )}
          </div>
        </div>
      )}

      {tab === 'research' && (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="card">
            <h3>Pricing Guidelines Lookup</h3>
            <p style={{ marginTop: 6, color: '#64748b', fontWeight: 800 }}>
              Reference data set only. Use these predicted values as a guideline when you manually register new services.
              This data is strictly isolated from the live catalog.
            </p>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <select 
                className="select" 
                value={researchSearchCat} 
                onChange={e => setResearchSearchCat(e.target.value)}
                style={{ minWidth: 200 }}
              >
                <option value="">All Categories</option>
                {[...new Set(PREDICTION_DATA.map(p => p.category))].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input 
                className="input" 
                placeholder="Search service..." 
                value={researchSearchSvc} 
                onChange={e => setResearchSearchSvc(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>

            <div className="table-wrap" style={{ marginTop: 16, maxHeight: '65vh', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Service</th>
                    <th>Min LKR/hr</th>
                    <th>Max LKR/hr</th>
                  </tr>
                </thead>
                <tbody>
                  {PREDICTION_DATA.filter(p => 
                    (researchSearchCat === '' || p.category === researchSearchCat) &&
                    (researchSearchSvc === '' || p.service.toLowerCase().includes(researchSearchSvc.toLowerCase()))
                  ).map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 1100, color: '#3b82f6' }}>{row.category}</td>
                      <td style={{ fontWeight: 900 }}>{row.service}</td>
                      <td>{row.min.toLocaleString()}</td>
                      <td>{row.max.toLocaleString()}</td>
                    </tr>
                  ))}
                  {PREDICTION_DATA.filter(p => 
                    (researchSearchCat === '' || p.category === researchSearchCat) &&
                    (researchSearchSvc === '' || p.service.toLowerCase().includes(researchSearchSvc.toLowerCase()))
                  ).length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>
                        No predictions match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {tab === 'grading' && (
        <div className="grade-zone">
          <div>
            <div className="grade-stack">
              <div className="grade-card">
                <div className="grade-head">
                  <div className="grade-title">
                    <div className="grade-badge a">A</div>
                    <div>
                      <h3>Grade A</h3>
                      <p>Top-tier visibility and premium trust</p>
                    </div>
                  </div>
                  <span className="pill">Priority</span>
                </div>

                <div className="slider-row">
                  <div>
                    <label>Experience threshold (years)</label>
                    <input
                      className="slider"
                      type="range"
                      min="0"
                      max="20"
                      value={gradingDraft.A.minYears}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, A: { ...g.A, minYears: Number(e.target.value) } }))}
                    />
                  </div>
                  <span className="pill2">{gradingDraft.A.minYears} yrs</span>
                </div>

                <div className="slider-row">
                  <div>
                    <label>Star rating</label>
                    <input
                      className="slider"
                      type="range"
                      min="1"
                      max="5"
                      value={gradingDraft.A.stars}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, A: { ...g.A, stars: Number(e.target.value) } }))}
                    />
                  </div>
                  <span className="pill2">{gradingDraft.A.stars}★</span>
                </div>

                <div className="slider-row">
                  <div>
                    <label>Tier Price Minimum (%)</label>
                    <input
                      className="slider"
                      type="range"
                      min="0"
                      max="100"
                      value={gradingDraft.A.priceRangeMin || 80}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, A: { ...g.A, priceRangeMin: Number(e.target.value) } }))}
                    />
                  </div>
                  <span className="pill2">{gradingDraft.A.priceRangeMin || 80}%</span>
                </div>
                <div className="slider-row">
                  <div>
                    <label>Tier Price Maximum (%)</label>
                    <input
                      className="slider"
                      type="range"
                      min="0"
                      max="100"
                      value={gradingDraft.A.priceRangeMax || 100}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, A: { ...g.A, priceRangeMax: Number(e.target.value) } }))}
                    />
                  </div>
                  <span className="pill2">{gradingDraft.A.priceRangeMax || 100}%</span>
                </div>
                <div className="slider-row">
                  <div style={{ width: '100%' }}>
                    <label>Public label (customers see this)</label>
                    <input
                      className="input"
                      value={gradingDraft.A.label || ''}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, A: { ...g.A, label: e.target.value } }))}
                      placeholder="e.g. Grade A — 10+ years experience"
                    />
                  </div>
                </div>
              </div>

              <div className="grade-card">
                <div className="grade-head">
                  <div className="grade-title">
                    <div className="grade-badge b">B</div>
                    <div>
                      <h3>Grade B</h3>
                      <p>Balanced ranking and strong quality signal</p>
                    </div>
                  </div>
                  <span className="pill">Standard</span>
                </div>

                <div className="slider-row">
                  <div>
                    <label>Experience threshold (years)</label>
                    <input
                      className="slider"
                      type="range"
                      min="0"
                      max="20"
                      value={gradingDraft.B.minYears}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, B: { ...g.B, minYears: Number(e.target.value) } }))}
                    />
                  </div>
                  <span className="pill2">{gradingDraft.B.minYears} yrs</span>
                </div>

                <div className="slider-row">
                  <div>
                    <label>Star rating</label>
                    <input
                      className="slider"
                      type="range"
                      min="1"
                      max="5"
                      value={gradingDraft.B.stars}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, B: { ...g.B, stars: Number(e.target.value) } }))}
                    />
                  </div>
                  <span className="pill2">{gradingDraft.B.stars}★</span>
                </div>

                <div className="slider-row">
                  <div>
                    <label>Tier Price Minimum (%)</label>
                    <input
                      className="slider"
                      type="range"
                      min="0"
                      max="100"
                      value={gradingDraft.B.priceRangeMin || 60}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, B: { ...g.B, priceRangeMin: Number(e.target.value) } }))}
                    />
                  </div>
                  <span className="pill2">{gradingDraft.B.priceRangeMin || 60}%</span>
                </div>
                <div className="slider-row">
                  <div>
                    <label>Tier Price Maximum (%)</label>
                    <input
                      className="slider"
                      type="range"
                      min="0"
                      max="100"
                      value={gradingDraft.B.priceRangeMax || 80}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, B: { ...g.B, priceRangeMax: Number(e.target.value) } }))}
                    />
                  </div>
                  <span className="pill2">{gradingDraft.B.priceRangeMax || 80}%</span>
                </div>
                <div className="slider-row">
                  <div style={{ width: '100%' }}>
                    <label>Public label (customers see this)</label>
                    <input
                      className="input"
                      value={gradingDraft.B.label || ''}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, B: { ...g.B, label: e.target.value } }))}
                      placeholder="e.g. Grade B — solid experience"
                    />
                  </div>
                </div>
              </div>

              <div className="grade-card">
                <div className="grade-head">
                  <div className="grade-title">
                    <div className="grade-badge c">C</div>
                    <div>
                      <h3>Grade C</h3>
                      <p>Base tier, limited boost and visibility</p>
                    </div>
                  </div>
                  <span className="pill">Base</span>
                </div>

                <div className="slider-row">
                  <div>
                    <label>Experience threshold (years)</label>
                    <input
                      className="slider"
                      type="range"
                      min="0"
                      max="20"
                      value={gradingDraft.C.minYears}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, C: { ...g.C, minYears: Number(e.target.value) } }))}
                    />
                  </div>
                  <span className="pill2">{gradingDraft.C.minYears} yrs</span>
                </div>

                <div className="slider-row">
                  <div>
                    <label>Star rating</label>
                    <input
                      className="slider"
                      type="range"
                      min="1"
                      max="5"
                      value={gradingDraft.C.stars}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, C: { ...g.C, stars: Number(e.target.value) } }))}
                    />
                  </div>
                  <span className="pill2">{gradingDraft.C.stars}★</span>
                </div>

                <div className="slider-row">
                  <div>
                    <label>Tier Price Minimum (%)</label>
                    <input
                      className="slider"
                      type="range"
                      min="0"
                      max="100"
                      value={gradingDraft.C.priceRangeMin || 0}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, C: { ...g.C, priceRangeMin: Number(e.target.value) } }))}
                    />
                  </div>
                  <span className="pill2">{gradingDraft.C.priceRangeMin || 0}%</span>
                </div>
                <div className="slider-row">
                  <div>
                    <label>Tier Price Maximum (%)</label>
                    <input
                      className="slider"
                      type="range"
                      min="0"
                      max="100"
                      value={gradingDraft.C.priceRangeMax || 60}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, C: { ...g.C, priceRangeMax: Number(e.target.value) } }))}
                    />
                  </div>
                  <span className="pill2">{gradingDraft.C.priceRangeMax || 60}%</span>
                </div>
                <div className="slider-row">
                  <div style={{ width: '100%' }}>
                    <label>Public label (customers see this)</label>
                    <input
                      className="input"
                      value={gradingDraft.C.label || ''}
                      onChange={(e) => setGradingDraft((g) => ({ ...g, C: { ...g.C, label: e.target.value } }))}
                      placeholder="e.g. Grade C — new professionals"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="footer-bar">
              <div className="footer-msg">
                {gradingMsg || 'Commit or discard global grading configuration changes.'}
              </div>
              <div className="footer-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setGradingDraft(gradingSaved);
                    setGradingMsg('Discarded changes.');
                    setTimeout(() => setGradingMsg(''), 2000);
                  }}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={async () => {
                    const draft = gradingDraft;
                    const ok =
                      draft.A.minYears >= draft.B.minYears &&
                      draft.B.minYears >= draft.C.minYears &&
                      draft.A.stars >= draft.B.stars &&
                      draft.B.stars >= draft.C.stars;
                    if (!ok) {
                      setGradingMsg('Integrity warning: ensure A ≥ B ≥ C for years and stars.');
                      return;
                    }
                    try {
                      setSaving(true);
                      await saveGradingConfig(draft);
                      try {
                        localStorage.setItem(GRADING_KEY, JSON.stringify(draft));
                      } catch {
                        /* ignore */
                      }
                      setGradingSaved(draft);
                      setGradingMsg('Saved grading configuration to the server.');
                      setTimeout(() => setGradingMsg(''), 2500);
                    } catch (e) {
                      setGradingMsg(e?.response?.data?.message || 'Failed to save grading configuration.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Commit Changes
                </button>
              </div>
            </div>
          </div>

          <div className="preview">
            <h3>Real-Time Public View Preview</h3>
            <p>Badge style and priority boost mockup</p>

            {(() => {
              // pick the grade with highest maximum price as a preview focus
              const entries = [
                { grade: 'A', ...gradingDraft.A },
                { grade: 'B', ...gradingDraft.B },
                { grade: 'C', ...gradingDraft.C }
              ];
              entries.sort((a, b) => (b.priceRangeMax || 0) - (a.priceRangeMax || 0));
              const focus = entries[0];
              const badgeClass = focus.grade === 'A' ? 'a' : focus.grade === 'B' ? 'b' : 'c';
              const stars = '★'.repeat(Math.max(1, Math.min(5, focus.stars)));
              return (
                <div className="profile-mock">
                  <div className="avatar">PR</div>
                  <div className="mock-meta">
                    <div className="name">Provider Profile Mock</div>
                    <div className="sub">
                      {focus.label || `Experience ≥ ${focus.minYears} yrs · Rating ${focus.stars}/5`}
                    </div>
                    <div className="badge-pill">
                      <span className={`grade-badge ${badgeClass}`} style={{ width: 28, height: 28, borderRadius: 12 }}>
                        {focus.grade}
                      </span>
                      <span>{stars}</span>
                      <span style={{ color: '#94a3b8', fontWeight: 900 }}>Price Range: {focus.priceRangeMin}% - {focus.priceRangeMax}%</span>
                    </div>
                    <div className="boost-bar" title="Service price tier">
                      <div className="boost-fill" style={{ width: `${Math.max(0, Math.min(100, focus.priceRangeMax || 100))}%` }} />
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ marginTop: 12, color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>
              Preview uses the highest price tier as the featured badge.
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {editingCategory && (
        <div className="modal">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ fontWeight: 1100, color: '#e5e7eb' }}>Edit Category</div>
              <button type="button" className="btn" onClick={() => setEditingCategory(null)}>
                Close
              </button>
            </div>
            <div className="grid">
              <input
                className="input"
                value={editingCategory.name}
                onChange={(e) => setEditingCategory((c) => ({ ...c, name: e.target.value }))}
              />
              <textarea
                className="input"
                style={{ minHeight: 90, resize: 'vertical' }}
                value={editingCategory.description || ''}
                onChange={(e) => setEditingCategory((c) => ({ ...c, description: e.target.value }))}
              />
              <button
                type="button"
                className="btn"
                onClick={() => setEditingCategory((c) => ({ ...c, active: !c.active }))}
              >
                Status: {editingCategory.active ? 'Active' : 'Inactive'}
              </button>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn" onClick={() => setEditingCategory(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={async () => {
                    try {
                      setSaving(true);
                      setError('');
                      await updateCategory(editingCategory.id, {
                        name: editingCategory.name,
                        description: editingCategory.description,
                        active: editingCategory.active
                      });
                      setEditingCategory(null);
                      await Promise.all([loadCategories(), loadCatalog()]);
                    } catch (e) {
                      setError(e?.response?.data?.message || 'Failed to update category.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
      <Footer />
    </>
  );
};

export default Admin2DashboardPage;

function cryptoId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function CalibrationChart({ series }) {
  const width = 520;
  const height = 180;
  const pad = 24;
  const maxY = Math.max(...series.map((s) => s.rate), 1);
  const minY = Math.min(...series.map((s) => s.rate), 0);
  const spanY = Math.max(1, maxY - minY);

  const xFor = (idx) => pad + (idx * (width - pad * 2)) / Math.max(1, series.length - 1);
  const yFor = (val) => pad + ((maxY - val) * (height - pad * 2)) / spanY;

  const path = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.rate).toFixed(1)}`)
    .join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ marginTop: 10 }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* grid */}
      {[0, 1, 2, 3].map((i) => {
        const y = pad + (i * (height - pad * 2)) / 3;
        return <line key={i} x1={pad} x2={width - pad} y1={y} y2={y} stroke="rgba(148,163,184,0.18)" strokeWidth="1" />;
      })}

      <path d={path} fill="none" stroke="url(#lineGrad)" strokeWidth="3" />
      {series.map((p, i) => (
        <g key={p.level}>
          <circle cx={xFor(i)} cy={yFor(p.rate)} r="4.2" fill="#22d3ee" stroke="rgba(2,6,23,0.9)" strokeWidth="2" />
          <text x={xFor(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="700">
            Lv {p.level}
          </text>
        </g>
      ))}
      <text x={pad} y={12} fontSize="10" fill="#94a3b8" fontWeight="800">
        Rate (per hour)
      </text>
    </svg>
  );
}

/** Fits the track to the current min/max with padding; when max drops, extra headroom keeps the usable line from feeling cramped. */
function computeRateDomain(lo, hi) {
  const minV = Math.min(Number(lo) || 0, Number(hi) || 0);
  const maxV = Math.max(Number(lo) || 0, Number(hi) || 0);
  const span = Math.max(1, maxV - minV);
  const padAbove = Math.max(45, span * 0.5, maxV * 0.22);
  const padBelow = Math.max(28, span * 0.4, minV > 0 ? minV * 0.22 : 0);
  const domainMin = Math.max(0, Math.floor(minV - padBelow));
  let domainMax = Math.ceil(maxV + padAbove);
  if (domainMax <= domainMin) domainMax = domainMin + Math.max(100, span * 2);
  return { domainMin, domainMax };
}

function DualThumbRateSlider({ domainMin = 0, domainMax = 15000, min, max, onChange, currency = 'LKR', disabled = false }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(null);
  const frozenDomainRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const minPropRef = useRef(min);
  const maxPropRef = useRef(max);
  const [, setDragSession] = useState(0);
  onChangeRef.current = onChange;
  minPropRef.current = min;
  maxPropRef.current = max;

  const dMin = frozenDomainRef.current ? frozenDomainRef.current.min : domainMin;
  const dMax = frozenDomainRef.current ? frozenDomainRef.current.max : domainMax;

  const curLo = Math.min(Number(min) || 0, Number(max) || 0);
  const curHi = Math.max(Number(min) || 0, Number(max) || 0);
  const lo = Math.max(dMin, Math.min(dMax, curLo));
  const hi = Math.max(dMin, Math.min(dMax, Math.max(lo + 1, curHi)));

  const span = Math.max(1e-6, dMax - dMin);
  const pct = (v) => ((v - dMin) / span) * 100;

  useEffect(() => {
    const onMove = (e) => {
      const which = draggingRef.current;
      if (!which || disabled || !trackRef.current) return;
      const dom = frozenDomainRef.current;
      if (!dom) return;
      const rect = trackRef.current.getBoundingClientRect();
      const p = (e.clientX - rect.left) / Math.max(1e-6, rect.width);
      const raw = dom.min + p * (dom.max - dom.min);
      const rounded = Math.round(raw);
      const clamp = (x) => Math.max(dom.min, Math.min(dom.max, x));
      const v = clamp(rounded);
      const loP = Number(minPropRef.current) || 0;
      const hiP = Number(maxPropRef.current) || 0;
      if (which === 'low') {
        const hiStable = Math.max(loP, hiP);
        const next = Math.min(v, hiStable - 1);
        if (next < hiStable) onChangeRef.current({ min: next, max: hiStable });
      } else {
        const loStable = Math.min(loP, hiP);
        const next = Math.max(v, loStable + 1);
        if (next > loStable) onChangeRef.current({ min: loStable, max: next });
      }
    };
    const onUp = () => {
      if (draggingRef.current !== null) {
        draggingRef.current = null;
        frozenDomainRef.current = null;
        setDragSession((t) => t + 1);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [disabled]);

  const pLo = pct(lo);
  const pHi = pct(hi);

  const startDrag = (thumb) => {
    if (disabled) return;
    frozenDomainRef.current = { min: domainMin, max: domainMax };
    draggingRef.current = thumb;
    setDragSession((s) => s + 1);
  };

  return (
    <div style={{ userSelect: 'none', touchAction: 'none', opacity: disabled ? 0.55 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ color: '#22d3ee', fontWeight: 900, fontSize: 13 }}>
          Low: {lo} <span style={{ color: '#64748b', fontWeight: 800 }}>{currency}</span>
        </span>
        <span style={{ color: '#e5e7eb', fontWeight: 900, fontSize: 13 }}>
          High: {hi} <span style={{ color: '#64748b', fontWeight: 800 }}>{currency}</span>
        </span>
        <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: 11 }}>Span: {Math.max(0, hi - lo)}</span>
      </div>
      <div
        ref={trackRef}
        style={{
          position: 'relative',
          height: 56,
          minHeight: 52,
          cursor: disabled ? 'not-allowed' : 'default'
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 12,
            marginTop: -6,
            borderRadius: 999,
            background: 'rgba(148,163,184,0.14)',
            border: '1px solid rgba(148,163,184,0.22)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${pLo}%`,
            width: `${Math.max(0, pHi - pLo)}%`,
            top: '50%',
            height: 12,
            marginTop: -6,
            borderRadius: 999,
            background: 'linear-gradient(90deg, rgba(34,211,238,0.45), rgba(14,165,233,0.55))',
            pointerEvents: 'none'
          }}
        />
        <button
          type="button"
          aria-label="Minimum hourly rate"
          disabled={disabled}
          onPointerDown={(e) => {
            if (disabled) return;
            e.preventDefault();
            startDrag('low');
          }}
          style={{
            position: 'absolute',
            left: `${pLo}%`,
            top: '50%',
            width: 22,
            height: 22,
            marginLeft: -11,
            marginTop: -11,
            borderRadius: 999,
            border: '2px solid #22d3ee',
            background: 'rgba(2,6,23,0.95)',
            cursor: disabled ? 'not-allowed' : 'grab',
            padding: 0,
            boxShadow: '0 2px 10px rgba(0,0,0,0.35)'
          }}
        />
        <button
          type="button"
          aria-label="Maximum hourly rate"
          disabled={disabled}
          onPointerDown={(e) => {
            if (disabled) return;
            e.preventDefault();
            startDrag('high');
          }}
          style={{
            position: 'absolute',
            left: `${pHi}%`,
            top: '50%',
            width: 22,
            height: 22,
            marginLeft: -11,
            marginTop: -11,
            borderRadius: 999,
            border: '2px solid #38bdf8',
            background: 'rgba(2,6,23,0.95)',
            cursor: disabled ? 'not-allowed' : 'grab',
            padding: 0,
            boxShadow: '0 2px 10px rgba(0,0,0,0.35)'
          }}
        />
      </div>
    </div>
  );
}
