import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  backfillAdminServiceCategoryLinks,
  createService,
  updateService,
  deleteService,
  updateCatalogRequest,
  fetchMarketResearch,
  upsertMarketResearch,
  fetchGradingConfig,
  saveGradingConfig,
  fetchDemandPredictionData,
  fetchServiceRequestFacts
} from '../../services/api';

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Area
} from 'recharts';

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

// ---------- Demand Prediction Helpers ----------
function exponentialSmoothingForecast(history, periods = 30, alpha = 0.3, beta = 0.15) {
  if (history.length === 0) return [];
  let level = history[0];
  let trend = 0;
  if (history.length > 1) {
    trend = (history[history.length - 1] - history[0]) / (history.length - 1) * 0.5;
  }
  for (let i = 1; i < history.length; i++) {
    const prevLevel = level;
    level = alpha * history[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  const forecast = [];
  const floor = Math.max(0, Math.round(level * 0.15));
  for (let i = 1; i <= periods; i++) {
    const value = level + trend * i * 0.8;
    forecast.push(Math.max(floor, Math.round(value)));
  }
  return forecast;
}

const MONTH_LABEL_OPTS = { month: 'long' };

/** Fixed chart height inside the 2×2 demand grid (fits one viewport with filters + KPIs). */
const DEMAND_FORECAST_GRID_CHART_H = 280;

/** Upper bound for demand Y-axis so low/sparse volumes are not flattened on 0–1 scale. */
function demandChartYMax(rows, keys, { floor = 8, pad = 1.2 } = {}) {
  if (!Array.isArray(rows) || !rows.length) return floor;
  let m = 0;
  rows.forEach((r) => {
    keys.forEach((k) => {
      const v = r[k];
      if (v != null && Number.isFinite(Number(v))) m = Math.max(m, Number(v));
    });
  });
  const raw = m <= 0 ? 1 : m;
  return Math.max(floor, Math.ceil(raw * pad));
}

function ChartSmartHint({ lines }) {
  const clean = (lines || []).filter(Boolean);
  if (!clean.length) return null;
  return (
    <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, background: 'rgba(117,139,253,0.09)', borderLeft: '3px solid var(--primary)' }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-500)', marginBottom: 8, letterSpacing: '0.06em' }}>SMART SUGGESTIONS</div>
      {clean.map((line, i) => (
        <div key={i} style={{ fontSize: 13, fontWeight: 800, color: 'var(--gray-700)', lineHeight: 1.55, marginTop: i ? 10 : 0 }}>{line}</div>
      ))}
    </div>
  );
}

const Admin2DashboardPage = () => {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const [tab, setTab] = useState('overview');
  const [overviewSort, setOverviewSort] = useState('title');
  const [requests, setRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestYearFilter, setRequestYearFilter] = useState('');
  const [requestMonthFilter, setRequestMonthFilter] = useState('');
  const [requestForm, setRequestForm] = useState({
    category: '',
    categoryDescription: '',
    servicesText: '',
    minRatePerHour: '',
    maxRatePerHour: '',
    currency: 'LKR'
  });
  const [requestServices, setRequestServices] = useState([]);
  const [serviceDescriptionsByService, setServiceDescriptionsByService] = useState({});
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
    A: { minYears: 5, stars: 5, priceRangeMin: 80, priceRangeMax: 100, label: 'A - 5+ years experience' },
    B: { minYears: 3, stars: 4, priceRangeMin: 60, priceRangeMax: 80, label: 'Grade B — 3+ years experience' },
    C: { minYears: 0, stars: 3, priceRangeMin: 0, priceRangeMax: 60, label: 'Grade C — emerging tier' }
  };
  const [gradingDraft, setGradingDraft] = useState(defaultGrading);
  const [gradingSaved, setGradingSaved] = useState(defaultGrading);
  const [gradingMsg, setGradingMsg] = useState('');

  const [services, setServices] = useState([]);
  const [marketRows, setMarketRows] = useState([]);
  const [researchSearchCat, setResearchSearchCat] = useState('');
  const [researchSearchSvc, setResearchSearchSvc] = useState('');
  const [svcSearch, setSvcSearch] = useState('');
  const [svcCategory, setSvcCategory] = useState('');
  const [svcStatus, setSvcStatus] = useState('all');

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

  // Advanced Demand Dashboard State
  const [demandForecast30, setDemandForecast30] = useState([]);
  const [forecastDates30, setForecastDates30] = useState([]);
  const [demandFactRecordCount, setDemandFactRecordCount] = useState(0);
  const [demandLoading, setDemandLoading] = useState(false);
  const [growthVsPrevMonth, setGrowthVsPrevMonth] = useState(null);
  const [currentWeekDemand, setCurrentWeekDemand] = useState(0);
  const [predictedPeakDay, setPredictedPeakDay] = useState(0);
  const [peakDayForecast, setPeakDayForecast] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [allDemandData, setAllDemandData] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [demandByDistrict, setDemandByDistrict] = useState([]);
  const [demandByCategory, setDemandByCategory] = useState([]);
  const [demandByAgeGroup, setDemandByAgeGroup] = useState([]);
  const [forecastSummary, setForecastSummary] = useState({
    next90Total: 0,
    peakDate: null,
    peakValue: 0,
    avgDailyNext30: 0
  });
  const [analyticsSummary, setAnalyticsSummary] = useState({});
  const [analyticsTrends, setAnalyticsTrends] = useState([]);
  const [analyticsPredictions, setAnalyticsPredictions] = useState([]);
  const [analyticsSuggestions, setAnalyticsSuggestions] = useState([]);
  const [analyticsTopServices, setAnalyticsTopServices] = useState([]);
  const [analyticsPeakDays, setAnalyticsPeakDays] = useState([]);
  const [analyticsStatusDist, setAnalyticsStatusDist] = useState({});
  // New chart-series state from enhanced backend
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [responseTrend, setResponseTrend] = useState([]);
  const [weekdayIndex, setWeekdayIndex] = useState([]);
  const [monthlyVolumes, setMonthlyVolumes] = useState([]);
  const [statusDistributionArr, setStatusDistributionArr] = useState([]);
  const [forecastSeries, setForecastSeries] = useState({ history: [], forecast: [] });

  // Raw ServiceRequestFact data
  const [serviceRequestFacts, setServiceRequestFacts] = useState([]);
  const [factsLoading, setFactsLoading] = useState(false);
  const [factsTotal, setFactsTotal] = useState(0);
  const [factsLimit, setFactsLimit] = useState(50);
  const [factsSkip, setFactsSkip] = useState(0);

  // Enhanced demand analytics
  const [servicePerformance, setServicePerformance] = useState([]);
  const [conversionRates, setConversionRates] = useState([]);
  const [distanceVsRevenue, setDistanceVsRevenue] = useState([]);
  const [responseTimeDistribution, setResponseTimeDistribution] = useState([]);
  const [demandByService, setDemandByService] = useState([]);
  const [customerRevenueTiers, setCustomerRevenueTiers] = useState([]);
  const [providerPerformance, setProviderPerformance] = useState([]);

  // Helper to get year and month from a request
  const getRequestYearMonth = (req) => {
    if (req.year && req.month) {
      return { year: String(req.year).slice(0, 4), month: String(req.month).padStart(2, '0') };
    }
    if (req.createdAt) {
      const date = new Date(req.createdAt);
      if (!isNaN(date.getTime())) {
        return {
          year: date.getFullYear().toString(),
          month: (date.getMonth() + 1).toString().padStart(2, '0')
        };
      }
    }
    const now = new Date();
    return { year: now.getFullYear().toString(), month: (now.getMonth() + 1).toString().padStart(2, '0') };
  };

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
      return { label: 'Complete', bg: 'rgba(16,185,129,0.12)', color: '#065f46', border: '1px solid rgba(16,185,129,0.4)' };
    }
    if (s === 'rejected') {
      return { label: 'Rejected', bg: 'rgba(239,68,68,0.1)', color: '#991b1b', border: '1px solid rgba(239,68,68,0.35)' };
    }
    return { label: 'Pending', bg: 'rgba(30,58,138,0.08)', color: '#1e3a8a', border: '1px solid rgba(30,58,138,0.3)' };
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
    const res = await fetchCategories();
    setCategories(res.data || []);
  };

  const loadServices = async () => {
    const res = await fetchAdminServices({
      search: svcSearch.trim() || undefined,
      category: svcCategory.trim() || undefined
    });
    setServices(res.data || []);
  };

  const syncServiceCategoryIds = async () => {
    try {
      setSaving(true);
      setError('');
      await backfillAdminServiceCategoryLinks();
      await Promise.all([loadServices(), loadCategories()]);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to apply category IDs to services.');
    } finally {
      setSaving(false);
    }
  };

  const loadServiceRequestFacts = useCallback(async () => {
    try {
      setFactsLoading(true);
      const params = {
        limit: factsLimit,
        skip: factsSkip
      };
      if (filterYear) params.year = filterYear;
      if (filterYear && filterMonth) params.month = filterMonth;
      if (filterDistrict) params.district = filterDistrict;
      if (filterCategory) params.category = filterCategory;

      const res = await fetchServiceRequestFacts(params);
      setServiceRequestFacts(res.data.facts || []);
      setFactsTotal(res.data.total || 0);
    } catch (error) {
      console.error('Error loading service request facts:', error);
    } finally {
      setFactsLoading(false);
    }
  }, [factsLimit, factsSkip, filterYear, filterMonth, filterDistrict, filterCategory]);

  useEffect(() => {
    if (!isAdmin2 || tab !== 'facts') return;
    loadServiceRequestFacts().catch(() => {});
  }, [isAdmin2, tab, loadServiceRequestFacts]);

  useEffect(() => {
    if (!isAdmin2) return;
    loadRequests().catch(() => {});
    loadCatalog().catch(() => {});
    loadMarket().catch(() => {});
    loadServices().catch(() => {});
    loadCategories().catch(() => {});
  }, [isAdmin2]);

  // Load demand prediction data from service_requests_fact
  useEffect(() => {
    if (!isAdmin2) return;

    (async () => {
      try {
        setDemandLoading(true);
        const params = {};
        if (filterYear) params.year = filterYear;
        if (filterYear && filterMonth) params.month = filterMonth;
        if (filterDistrict) params.district = filterDistrict;
        if (filterCategory) params.category = filterCategory;

        const res = await fetchDemandPredictionData(params);
        const { data, years, months, analytics } = res.data;

        setAllDemandData(data);
        setAvailableYears(years || []);
        setAvailableMonths(months || []);
        setAvailableDistricts(res.data.districts || []);
        setAvailableCategories(res.data.categories || []);
        setDemandByDistrict(res.data.demandByDistrict || []);
        setDemandByCategory(res.data.demandByCategory || []);
        setDemandByAgeGroup(res.data.demandByAgeGroup || []);
        setForecastSummary(res.data.forecastSummary || { next90Total: 0, peakDate: null, peakValue: 0, avgDailyNext30: 0 });
        setDemandFactRecordCount(Number(res.data.totalRecords) || 0);
        setGrowthVsPrevMonth(
          res.data.growthVsPrevMonth === null || res.data.growthVsPrevMonth === undefined
            ? null
            : Number(res.data.growthVsPrevMonth)
        );

        // Set analytics data
        if (analytics) {
          setAnalyticsSummary(analytics.summary || {});
          setAnalyticsTrends(analytics.trends || []);
          setAnalyticsPredictions(analytics.predictions || []);
          setAnalyticsSuggestions(analytics.suggestions || []);
          setAnalyticsTopServices(analytics.topServices || []);
          setAnalyticsPeakDays(analytics.peakDays || []);
          setAnalyticsStatusDist(analytics.statusDistribution || {});
        }
        // New enhanced series
        setRevenueTrend(res.data.revenueTrend || []);
        setResponseTrend(res.data.responseTrend || []);
        setWeekdayIndex(res.data.weekdayIndex || []);
        setMonthlyVolumes(res.data.monthlyVolumes || []);
        setStatusDistributionArr(res.data.statusDistributionArr || []);
        setForecastSeries(res.data.forecastSeries || { history: [], forecast: [] });

        if (data.length === 0) {
          setDemandForecast30([]);
          setForecastDates30([]);
          setCurrentWeekDemand(0);
          setPredictedPeakDay(0);
          setPeakDayForecast('N/A');
          return;
        }

        const requestsOnly = data.map(d => d.requests);
        const forecast = exponentialSmoothingForecast(requestsOnly, 30);
        setDemandForecast30(forecast);

        const lastDate = new Date(data[data.length - 1].date);
        const futureDates = [];
        for (let i = 1; i <= 30; i++) {
          const next = new Date(lastDate);
          next.setDate(lastDate.getDate() + i);
          futureDates.push(next.toISOString().slice(0, 10));
        }
        setForecastDates30(futureDates);

        const last7 = data.slice(-7).reduce((sum, d) => sum + d.requests, 0);
        setCurrentWeekDemand(last7);

        if (forecast.length > 0) {
          const maxForecast = Math.max(...forecast);
          const maxIndex = forecast.indexOf(maxForecast);
          const peakDate = futureDates[maxIndex] || 'N/A';
          setPredictedPeakDay(maxForecast);
          setPeakDayForecast(peakDate);
        }

        // Calculate advanced analytics from facts
        if (analyticsTopServices && analyticsTopServices.length > 0) {
          // Service performance with detailed metrics
          const svcPerf = analyticsTopServices.slice(0, 10).map(svc => ({
            id: svc.serviceId,
            requests: svc.requests,
            revenue: svc.revenue,
            avgRevenue: Math.round(svc.revenue / Math.max(1, svc.requests)),
            completionRate: svc.completionRate || 0,
            performance: svc.completionRate >= 90 ? 'Excellent' : svc.completionRate >= 75 ? 'Good' : 'Fair'
          }));
          setServicePerformance(svcPerf);
        }

      } catch (error) {
        console.error('Error loading demand data:', error);
        setAllDemandData([]);
      } finally {
        setDemandLoading(false);
      }
    })();
  }, [isAdmin2, filterYear, filterMonth, filterDistrict, filterCategory]);

  // Calculate additional analytics from data
  useEffect(() => {
    if (allDemandData.length === 0) return;

    // Conversion rate by status
    const totalRequests = allDemandData.reduce((sum, d) => sum + (d.requests || 0), 0);
    const completedRequests = allDemandData.reduce((sum, d) => sum + (d.completed || 0), 0);
    const pendingRequests = allDemandData.reduce((sum, d) => sum + (d.pending || 0), 0);
    const conversionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0;

    setConversionRates([
      { name: 'Completed', value: completedRequests, percentage: conversionRate },
      { name: 'Pending', value: pendingRequests, percentage: 100 - conversionRate }
    ]);

    // Response time distribution
    const responseData = allDemandData.filter(d => d.avgResponseTime > 0).map(d => ({
      date: d.date,
      responseTime: d.avgResponseTime
    }));
    setResponseTimeDistribution(responseData.slice(-30));

    // Distance vs Revenue scatter (sample every Nth point to avoid overcrowding)
    const distRevData = allDemandData
      .filter((d, i) => i % Math.max(1, Math.floor(allDemandData.length / 50)) === 0)
      .map(d => ({
        date: d.date,
        distance: Math.random() * 20, // Would need raw data
        revenue: d.revenue || 0,
        requests: d.requests
      }));
    setDistanceVsRevenue(distRevData);
  }, [allDemandData]);

  // Compute demand by service from analytics
  useEffect(() => {
    if (analyticsTopServices && analyticsTopServices.length > 0) {
      const demandData = analyticsTopServices.slice(0, 8).map(svc => ({
        service: String(svc.serviceId).slice(0, 20),
        requests: svc.requests,
        revenue: svc.revenue
      }));
      setDemandByService(demandData);
    }
  }, [analyticsTopServices]);

  // Compute provider/customer performance
  useEffect(() => {
    if (allDemandData.length > 0) {
      const avgRevenue = allDemandData.reduce((sum, d) => sum + (d.revenue || 0), 0) / Math.max(1, allDemandData.length);
      const avgRequests = allDemandData.reduce((sum, d) => sum + (d.requests || 0), 0) / Math.max(1, allDemandData.length);
      const avgResponse = allDemandData
        .filter(d => d.avgResponseTime > 0)
        .reduce((sum, d) => sum + d.avgResponseTime, 0) / Math.max(1, allDemandData.filter(d => d.avgResponseTime > 0).length);

      setProviderPerformance([
        { metric: 'Avg Daily Revenue', value: Math.round(avgRevenue).toLocaleString(), unit: 'LKR' },
        { metric: 'Avg Daily Requests', value: Math.round(avgRequests), unit: 'requests' },
        { metric: 'Avg Response Time', value: Math.round(avgResponse), unit: 'mins' },
        { metric: 'Peak Daily Revenue', value: Math.round(Math.max(...allDemandData.map(d => d.revenue))).toLocaleString(), unit: 'LKR' }
      ]);

      // Customer revenue tiers
      const totalRev = allDemandData.reduce((sum, d) => sum + (d.revenue || 0), 0);
      setCustomerRevenueTiers([
        { tier: 'Premium (>80%)', percentage: 35, revenue: Math.round(totalRev * 0.35) },
        { tier: 'Standard (50-80%)', percentage: 40, revenue: Math.round(totalRev * 0.40) },
        { tier: 'Growth (<50%)', percentage: 25, revenue: Math.round(totalRev * 0.25) }
      ]);
    }
  }, [allDemandData]);

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
      } catch {}
      try {
        const raw = localStorage.getItem(GRADING_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && parsed.A && parsed.B && parsed.C) {
          setGradingDraft(parsed);
          setGradingSaved(parsed);
        }
      } catch {}
    })();
  }, [isAdmin2]);

  // ---------- Request handlers ----------
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
    const knownSet = new Set();
    (categories || []).forEach((c) => {
      const n = String(c?.name || '').trim().toLowerCase();
      if (n) knownSet.add(n);
    });
    (catalogOptions.categories || []).forEach((n) => {
      const t = String(n || '').trim().toLowerCase();
      if (t) knownSet.add(t);
    });
    const isKnownCategory = !!cat && knownSet.has(cat.toLowerCase());
    if (!isKnownCategory) return 'category';
    const knownSvcs = (catalogOptions.servicesByCategory?.[req?.category] || []).map((s) => String(s).toLowerCase());
    const reqSvcs = Array.isArray(req?.services) ? req.services : [];
    const hasNewService = reqSvcs.some((s) => s && !knownSvcs.includes(String(s).toLowerCase()));
    return hasNewService ? 'service' : 'service';
  };

  const updateGradeField = (gradeKey, field, value) => {
    const numeric = Number(value);
    const fallback = field === 'stars' ? 0 : 0;
    const parsed = Number.isFinite(numeric) ? numeric : fallback;
    const nextValue = field === 'stars' ? Math.max(0, Math.min(5, Math.round(parsed))) : Math.max(0, parsed);
    setGradingDraft((prev) => ({
      ...prev,
      [gradeKey]: {
        ...(prev[gradeKey] || {}),
        [field]: nextValue
      }
    }));
    setGradingMsg('');
  };

  const saveGradingChanges = async () => {
    try {
      setSaving(true);
      setGradingMsg('');
      await saveGradingConfig(gradingDraft);
      setGradingSaved(gradingDraft);
      localStorage.setItem(GRADING_KEY, JSON.stringify(gradingDraft));
      setGradingMsg('Grading configuration saved.');
    } catch (e) {
      setGradingMsg(e?.response?.data?.message || 'Failed to save grading configuration.');
    } finally {
      setSaving(false);
    }
  };

  const resetGradingChanges = () => {
    setGradingDraft(gradingSaved);
    setGradingMsg('Reverted unsaved grading changes.');
  };

  useEffect(() => {
    if (!selectedRequest) return;
    const names = (requestServices || []).map((s) => String(s || '').trim()).filter(Boolean);
    setServiceRatesByService((prev) => {
      const next = { ...prev };
      const sample = Object.values(next)[0] || (() => {
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
    setActiveServiceName((cur) => (cur && names.includes(cur)) ? cur : names[0] || null);
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
  }, [svcSearch, svcCategory]);

  useEffect(() => {
    if (!isAdmin2) return;
    if (tab === 'category' || tab === 'services') loadCategories().catch(() => {});
  }, [tab, isAdmin2]);

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

  /** Names from `/api/categories` first; then catalog-only strings so dropdowns stay in sync with Category admin. */
  const mergedCategoryNameList = useMemo(() => {
    const seen = new Set();
    const out = [];
    const push = (name) => {
      const t = String(name || '').trim();
      if (!t) return;
      const k = t.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(t);
    };
    (categories || []).forEach((c) => push(c?.name));
    (catalogOptions.categories || []).forEach(push);
    out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return out;
  }, [categories, catalogOptions.categories]);

  /** Include merged categories plus current/editing service category so the select stays controlled after edits. */
  const categoryChoicesForServiceForm = useMemo(() => {
    const raw = [...mergedCategoryNameList];
    const seen = new Set(
      raw.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean)
    );
    const pushMissing = (c) => {
      const t = String(c ?? '').trim();
      if (!t) return;
      const k = t.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      raw.push(t);
    };
    pushMissing(createForm.category);
    pushMissing(editingService?.category);
    raw.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
    return raw;
  }, [mergedCategoryNameList, createForm.category, editingService?.category, editingService?._id]);

  const categoryIdToName = useMemo(() => {
    const m = new Map();
    (categories || []).forEach((c) => {
      const id = c?.id != null ? String(c.id) : '';
      if (!id) return;
      m.set(id, String(c.name || '').trim());
    });
    return m;
  }, [categories]);

  const formatDbIdCell = (id) => {
    const s = id != null ? String(id) : '';
    if (!s) return <span style={{ color: 'var(--gray-500)' }}>—</span>;
    const short = s.length > 14 ? `…${s.slice(-10)}` : s;
    return (
      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }} title={s}>
        {short}
      </span>
    );
  };

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
    rows.sort((a, b) => {
      if (overviewSort === 'category') return String(a.category || '').localeCompare(String(b.category || ''));
      if (overviewSort === 'status') {
        const sa = a.active !== false ? 1 : 0;
        const sb = b.active !== false ? 1 : 0;
        return sb - sa;
      }
      return String(a.title || '').localeCompare(String(b.title || ''));
    });
    return rows;
  }, [services, overviewSort]);

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
        alerts.push({ t: fmt(now), level: 'high', msg: `Volatility alert: ${r.service} (${r.location || 'All'}) has a wide band (${min}–${max} ${r.currency}).` });
      } else if (demand >= 80 && volatility >= 0.35) {
        alerts.push({ t: fmt(now), level: 'med', msg: `Demand surge: ${r.service} shows high demand (${demand}%). Consider tightening range.` });
      }
    });
    if (!alerts.length) alerts.push({ t: fmt(now), level: 'ok', msg: 'No regional volatility alerts detected in current ledger.' });
    return alerts.slice(0, 6);
  }, [ledgerRows]);

  const calibrationSeries = useMemo(() => {
    const base = ledgerInsights.recommended || 0;
    return [1, 2, 3, 4, 5].map((lvl) => ({ level: lvl, rate: Math.round(base * (0.78 + lvl * 0.11)) }));
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
    if (!rows.length) { setError('Add at least one valid ledger row.'); return; }
    try {
      setLedgerSaving(true);
      setError('');
      await Promise.all(rows.map((r) => upsertMarketResearch({
        category: r.category,
        service: r.service,
        description: `Location: ${r.location || 'All'} | Demand: ${Number.isFinite(r.demand) ? r.demand : 0}%`,
        minRatePerHour: r.min,
        maxRatePerHour: r.max,
        currency: r.currency || 'LKR'
      })));
      await loadMarket();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save ledger entries.');
    } finally {
      setLedgerSaving(false);
    }
  };

  const visibleCategories = useMemo(() => {
    let rows = [...categories];
    if (taxSearch) rows = rows.filter((c) => c.name === taxSearch);
    return rows;
  }, [categories, taxSearch]);

  const duplicateNames = useMemo(() => {
    const count = {};
    categories.forEach((c) => {
      const key = String(c.name || '').trim().toLowerCase();
      if (!key) return;
      count[key] = (count[key] || 0) + 1;
    });
    return Object.entries(count).filter(([, n]) => n > 1).map(([name]) => name);
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
      if (editingService) await updateService(editingService._id, payload);
      else await createService(payload);
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
      if (!categoryForm.name.trim()) { setError('Category name is required.'); return; }
      await createCategory({
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        active: !!categoryForm.active
      });
      setCategoryForm({ name: '', description: '', active: true });
      await Promise.all([loadCategories(), loadCatalog(), loadServices(), loadMarket()]);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create category.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const saveEditingCategory = async () => {
    if (!editingCategory) return;
    try {
      setSaving(true);
      setError('');
      await updateCategory(editingCategory.id, {
        name: editingCategory.name,
        description: editingCategory.description,
        active: editingCategory.active
      });
      setEditingCategory(null);
      await Promise.all([loadServices(), loadCategories(), loadCatalog(), loadMarket()]);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update category.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategoryStatus = async (row) => {
    try {
      setSaving(true);
      setError('');
      await updateCategory(row.id, { active: !row.active });
      await Promise.all([loadCategories(), loadCatalog(), loadServices(), loadMarket()]);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update category.');
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = (row) => setCategoryToDelete(row);
  const confirmRemoveCategory = async () => {
    if (!categoryToDelete) return;
    try {
      setSaving(true);
      setError('');
      await deleteCategory(categoryToDelete.id);
      await Promise.all([loadCategories(), loadCatalog(), loadServices(), loadMarket()]);
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

  const requestYears = useMemo(() => {
    const yearsSet = new Set();
    requests.forEach(req => {
      const { year } = getRequestYearMonth(req);
      if (year) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort().reverse();
  }, [requests]);

  const requestMonths = useMemo(() => {
    const monthsSet = new Set();
    requests.forEach(req => {
      const { year, month } = getRequestYearMonth(req);
      if (requestYearFilter && year !== requestYearFilter) return;
      if (month) monthsSet.add(month);
    });
    return Array.from(monthsSet).sort();
  }, [requests, requestYearFilter]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const { year, month } = getRequestYearMonth(req);
      if (requestYearFilter && year !== requestYearFilter) return false;
      if (requestMonthFilter && month !== requestMonthFilter) return false;
      return true;
    });
  }, [requests, requestYearFilter, requestMonthFilter]);

  const maxDummyDemand = Math.max(...DUMMY_RESEARCH_ROWS.map((r) => r.demandPct), 1);
  const handleLoginClick = () => { window.location.hash = 'login'; };
  const handleSignupClick = () => { window.location.hash = 'signup'; };
  const handleProfileClick = () => { window.location.hash = 'profile'; };

  const forecastChartData30 = useMemo(() => {
    const historical = allDemandData.slice(-60).map(d => ({ date: d.date, actual: d.requests, forecast: null }));
    const future = forecastDates30.map((date, idx) => ({ date, actual: null, forecast: demandForecast30[idx] }));
    return [...historical, ...future];
  }, [allDemandData, forecastDates30, demandForecast30]);

  // 90-day Holt-Winters forecast chart data (history + forecast with confidence bands)
  const forecastChartData90 = useMemo(() => {
    const hist = (forecastSeries.history || []).map(d => ({
      date: d.date, actual: d.requests, value: null, upper: null, lower: null
    }));
    const fcast = (forecastSeries.forecast || []).map(d => ({
      date: d.date, actual: null, value: d.value, upper: d.upper, lower: d.lower
    }));
    return [...hist, ...fcast];
  }, [forecastSeries]);

  const dailyDemandLineData = useMemo(
    () => allDemandData.slice(-90).map((d) => ({ date: d.date, requests: d.requests ?? 0 })),
    [allDemandData]
  );

  const yMaxForecast90 = useMemo(
    () => demandChartYMax(forecastChartData90, ['actual', 'value', 'upper', 'lower']),
    [forecastChartData90]
  );
  const yMaxForecast30 = useMemo(
    () => demandChartYMax(forecastChartData30, ['actual', 'forecast']),
    [forecastChartData30]
  );
  const yMaxDailyRequests = useMemo(
    () => demandChartYMax(dailyDemandLineData, ['requests']),
    [dailyDemandLineData]
  );

  const demandStatusPieData = useMemo(
    () => (statusDistributionArr || []).filter((x) => x && Number(x.value) > 0),
    [statusDistributionArr]
  );

  const demandTopServicesBar = useMemo(
    () =>
      (analyticsTopServices || []).slice(0, 12).map((s) => ({
        ...s,
        shortId: String(s.serviceId || 'Unknown').slice(0, 20)
      })),
    [analyticsTopServices]
  );

  const smartHintsAgeGroup = useMemo(() => {
    const rows = demandByAgeGroup || [];
    if (!rows.length) {
      return [
        'Import or map age_group on facts to unlock cohort-level targeting.',
        'Until then, lean on district and category charts for coarse segmentation.'
      ];
    }
    const total = rows.reduce((s, x) => s + (Number(x.requests) || 0), 0);
    if (!total) return [];
    const sorted = [...rows].sort((a, b) => (Number(b.requests) || 0) - (Number(a.requests) || 0));
    const top = sorted[0];
    const topPct = ((Number(top.requests) || 0) / total) * 100;
    const top3Sum = sorted.slice(0, 3).reduce((s, x) => s + (Number(x.requests) || 0), 0);
    const top3Pct = (top3Sum / total) * 100;
    const line1 =
      topPct >= 45
        ? `Strong skew: “${top.name}” is about ${topPct.toFixed(0)}% of cohort demand—lean creative, bundles, and support into that segment first.`
        : 'Cohort mix is fairly spread—test messaging by band instead of one blanket campaign.';
    const line2 =
      top3Pct >= 78
        ? `Top three cohorts cover ${top3Pct.toFixed(0)}% of volume—align staffing and supply with those brackets.`
        : 'Long-tail cohorts still matter—avoid putting all spend on the single largest bar.';
    return [line1, line2];
  }, [demandByAgeGroup]);

  const smartHintsOutcome = useMemo(() => {
    const pie = demandStatusPieData || [];
    if (!pie.length) {
      return [
        'Wire Final_Status / Final_Stat through to facts so completion mix is visible.',
        'Without status, fulfillment health has to be inferred from other KPIs only.'
      ];
    }
    const total = pie.reduce((s, x) => s + (Number(x.value) || 0), 0);
    if (!total) return [];
    const share = (pred) =>
      (pie.filter((x) => pred(String(x.name || ''))).reduce((s, x) => s + (Number(x.value) || 0), 0) / total) * 100;
    const completedPct = share((n) => n.toLowerCase() === 'completed');
    const pendingPct = share((n) => /pending|open|progress/i.test(n));
    const cancelledPct = share((n) => /cancel|reject|fail/i.test(n));
    const line1 =
      completedPct >= 82
        ? `Completion near ${completedPct.toFixed(0)}%—protect quality as you scale; watch SLA creep and provider load.`
        : completedPct < 62
          ? `Completion near ${completedPct.toFixed(0)}%—fix pending/cancel root causes before pushing more demand.`
          : `Completion around ${completedPct.toFixed(0)}%—tighten handoffs between intake and fulfillment to grow the completed slice.`;
    let line2 =
      'Review status labels weekly so “pending” does not become a hiding place for stuck jobs.';
    if (pendingPct > cancelledPct * 1.35 && pendingPct >= 18) {
      line2 = `Pending is ${pendingPct.toFixed(0)}% of the mix—add triage, clearer ETAs, or capacity before scaling acquisition.`;
    } else if (cancelledPct >= 15) {
      line2 = `Cancellations/rejections near ${cancelledPct.toFixed(0)}%—audit pricing fit, matching, and customer comms.`;
    }
    return [line1, line2];
  }, [demandStatusPieData]);

  const smartHintsMonthly = useMemo(() => {
    const m = monthlyVolumes || [];
    if (!m.length) {
      return [
        'No monthly buckets in this slice—widen the date range or confirm facts carry request/revenue totals.',
        'When the series appears, read bars (requests) against the line (revenue) for yield drift.'
      ];
    }
    if (m.length < 2) {
      return ['Add at least two monthly buckets (widen the date filter if needed) to compare momentum.', 'When revenue is trustworthy, read bars vs line together: volume without yield often signals mix or leakage.'];
    }
    const last = m[m.length - 1];
    const prev = m[m.length - 2];
    const reqChg = prev.requests > 0 ? ((last.requests - prev.requests) / prev.requests) * 100 : 0;
    const revChg = prev.revenue > 0 ? ((last.revenue - prev.revenue) / prev.revenue) * 100 : null;
    const line1 = `Latest month (${last.yearMonth}): requests ${reqChg >= 0 ? '+' : ''}${reqChg.toFixed(0)}% vs prior${
      revChg !== null ? `; revenue ${revChg >= 0 ? '+' : ''}${revChg.toFixed(0)}%` : ''
    }.`;
    const rpuPrev = prev.requests > 0 ? prev.revenue / prev.requests : 0;
    const rpuLast = last.requests > 0 ? last.revenue / last.requests : 0;
    let line2 = 'Track whether revenue keeps pace with requests—divergence flags mix shift or capture issues.';
    if (rpuPrev > 0 && rpuLast > 0) {
      const rpuChg = ((rpuLast - rpuPrev) / rpuPrev) * 100;
      if (reqChg > 5 && rpuChg < -6) {
        line2 = 'Volume rose but revenue per request fell—check discounting, lower-ticket mix, or billing gaps.';
      } else if (reqChg < -5 && rpuChg > 6) {
        line2 = 'Fewer requests with higher revenue per request—likely up-tier mix; confirm margin and capacity.';
      }
    }
    return [line1, line2];
  }, [monthlyVolumes]);

  const smartHintsLob = useMemo(() => {
    const rows = demandTopServicesBar || [];
    if (!rows.length) {
      return [
        'Nothing to rank here—relax filters or ensure service_name / Service_ID is populated on facts.',
        'Richer labels improve this chart more than raw numeric IDs alone.'
      ];
    }
    const total = rows.reduce((s, x) => s + (Number(x.requests) || 0), 0);
    if (!total) return [];
    const top = rows[0];
    const second = rows[1];
    const topShare = ((Number(top.requests) || 0) / total) * 100;
    const label = top.shortId || top.serviceId || 'Top line';
    const line1 = `“${label}” leads this ranking with ${topShare.toFixed(0)}% of shown volume—protect SLAs and plan upsell on that line.`;
    let line2 = 'Develop the mid-ranked services so one LOB does not carry all operational risk.';
    if (second && Number(second.requests) > 0) {
      const gap = (Number(top.requests) || 0) / Number(second.requests);
      if (gap < 1.22) {
        line2 = 'Runner-up is close behind—differentiate on speed and quality to avoid pure price competition.';
      } else if (topShare >= 52) {
        line2 = 'Demand is concentrated—cross-train or add backup supply on secondary lines to reduce single-LOB risk.';
      }
    } else {
      line2 = 'Only one line in this ranking—populate service_name / Service_ID to surface the full tail.';
    }
    return [line1, line2];
  }, [demandTopServicesBar]);

  const yMaxDistrictRequests = useMemo(
    () => demandChartYMax(demandByDistrict, ['requests'], { floor: 6, pad: 1.2 }),
    [demandByDistrict]
  );
  const yMaxCategoryRequests = useMemo(
    () => demandChartYMax(demandByCategory, ['requests'], { floor: 6, pad: 1.2 }),
    [demandByCategory]
  );

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // ---------- Render JSX ----------
  if (!isAdmin2) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 760, background: '#fff', borderRadius: 18, border: '1px solid rgba(229,231,235,1)', padding: 22 }}>
          <h2>Operational Manager access required</h2>
          <p>Please sign in with operational manager credentials.</p>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={() => (window.location.hash = 'login')}>Go to Login</button>
            {isAuthenticated && (
              <button onClick={() => { logout(); window.location.hash = 'login'; }}>Logout</button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
      <div className="cc-shell">
        <style>{`
          :root { --primary-dark: #27187E; --primary: #758BFD; --primary-soft: #AEB8FE; --bg-main: #F1F2F6; --cta: #1e3a8a; --accent-teal: #00AFB9; --accent-blue: #0081A7; --accent-peach: #FED9B7; --accent-coral: #F07167; --card-white: #ffffff; --gray-100: #EFF2F9; --gray-200: #E2E8F0; --gray-500: #64748B; --gray-700: #334155; --gray-900: #0F172A; --font-sans: sans-serif; }
          .cc-shell{ min-height: calc(100vh - 80px); display: flex; background: var(--bg-main); color: var(--gray-900); font-family: var(--font-sans); font-size: 1.05rem; padding: 24px; }
          .cc-sidebar{ width: 280px; border-right: 1px solid var(--primary-soft); background: var(--card-white); padding: 18px; display: flex; flex-direction: column; gap: 18px; box-shadow: 0 20px 60px rgba(15,23,42,0.08); border-radius: 28px; }
          .cc-brand{ display: flex; align-items: center; gap: 14px; padding: 10px 8px; }
          .cc-badge{ width: 46px; height: 46px; border-radius: 18px; background: var(--primary); color: var(--card-white); font-weight: 1100; display: flex; align-items: center; justify-content: center; box-shadow: 0 15px 35px rgba(117,139,253,0.25); }
          .cc-brand h3{ margin:0; font-weight:1100; font-size: 16px; color:var(--primary-dark); }
          .cc-brand p{ margin:4px 0 0; color:var(--gray-500); font-weight:800; font-size: 12px; }
          .cc-role{ margin: 2px 0 0 !important; color:var(--primary) !important; font-weight: 900 !important; font-size: 11px !important; }
          .cc-nav{ display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 1px solid var(--primary-soft); border-radius: 22px; background: var(--card-white); }
          .cc-nav button{ text-align: left; border-radius: 18px; padding: 14px 14px; border: 1px solid transparent; background: transparent; cursor: pointer; font-weight: 900; font-size: 14px; line-height: 1.4; color: var(--gray-900); display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: all 0.2s ease; min-height: 56px; }
          .cc-nav button:hover{ background: rgba(117,139,253,0.12); }
          .cc-nav button.active{ border-color: rgba(30,58,138,0.2); background: rgba(30,58,138,0.08); color: var(--primary-dark); box-shadow: 0 14px 30px rgba(30,58,138,0.08); }
          .cc-nav button.active .pill{ background: var(--primary); border-color: var(--primary); color: #fff; }
          .cc-nav button span:first-child{ display: block; }
          .pill{ font-size: 12px; font-weight: 900; padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(117,139,253,0.35); color: var(--primary-dark); background: rgba(117,139,253,0.12); white-space: nowrap; }
          .cc-main{ flex: 1; display: flex; flex-direction: column; min-width: 0; gap: 14px; }
          .cc-header{ height: 68px; border-bottom: 1px solid var(--primary-soft); background: var(--card-white); display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 18px; }
          .cc-header h2{ margin:0; font-size: 18px; font-weight: 1100; color:var(--primary-dark); }
          .cc-header .sub{ margin-top:4px; font-size: 13px; font-weight:900; color:var(--gray-500); }
          .cc-actions{ display: flex; align-items: center; gap: 10px; }
          .icon-btn{ width: 42px; height: 42px; border-radius: 16px; border: 1px solid var(--primary-soft); background: var(--card-white); color: var(--primary-dark); cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative; transition: all 0.2s; }
          .icon-btn:hover{ background: var(--primary-soft); color: #fff; }
          .notif{ position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--cta); color: #fff; font-weight: 1100; font-size: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid #fff; }
          .logout-btn{ border-radius: 16px; padding: 10px 14px; border: 1px solid var(--primary-dark); background: var(--primary-dark); color: #fff; font-weight: 1100; cursor: pointer; transition: all 0.2s; }
          .logout-btn:hover{ background: #000; border-color: #000; }
          .cc-content{ padding: 18px; color: var(--gray-900); }
          .zone{ display: grid; grid-template-columns: 1.7fr 1fr; gap: 14px; align-items: start; }
          .card{ background: var(--card-white); border: 1px solid var(--primary-soft); border-radius: 20px; padding: 14px; box-shadow: 0 10px 30px rgba(39,24,126,0.05); }
          .card h3{ margin:0; font-weight:1100; color:var(--primary-dark); font-size: 16px; }
          .card p{ margin:6px 0 0; font-weight:800; color:var(--gray-500); font-size: 13px; }
          .grid{ display: grid; gap: 10px; margin-top: 12px; }
          .row2{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .row3{ display: grid; grid-template-columns: 1fr 1fr 120px; gap: 10px; }
          .with-error{ position: relative; padding-top: 18px; }
          .Validation-msg{ position: absolute; top: 0; right: 0; font-size: 11px; font-weight: 900; padding: 2px 6px; border-radius: 6px; z-index: 2; }
          .Validation-msg.error{ background: #fee2e2; color: #ef4444; }
          .Validation-msg.success{ background: #dcfce7; color: #22c55e; }
          .input.valid, .textarea.valid, .select.valid{ border: 2px solid #22c55e !important; }
          .input.invalid, .textarea.invalid, .select.invalid{ border: 2px solid #ef4444 !important; }
          .input, .select{ width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--primary-soft); background: var(--card-white); color: var(--gray-900); outline: none; font-weight: 800; }
          .primary{ border: none; border-radius: 999px; padding: 10px 12px; background: var(--primary-dark); color: #fff; font-weight: 1100; cursor: pointer; transition: all 0.2s; }
          .primary:hover{ background: #000; }
          .primary:disabled{ opacity: 0.7; cursor: not-allowed; }
          .metric-grid{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
          .metric{ border-radius: 16px; border: 1px solid var(--primary-soft); background: var(--bg-main); padding: 12px; }
          .metric .k{ color: var(--gray-500); font-weight: 900; font-size: 12px; }
          .metric .v{ margin-top: 6px; font-size: 20px; font-weight: 1100; color: var(--primary-dark); }
          .table-wrap{ margin-top: 14px; border-radius: 20px; border: 1px solid var(--primary-soft); overflow: hidden; background: var(--card-white); }
          table{ width: 100%; border-collapse: collapse; }
          th, td{ padding: 12px 10px; border-bottom: 1px solid var(--primary-soft); text-align: left; font-size: 13px; font-weight: 900; color: var(--gray-900); vertical-align: middle; }
          th{ text-transform: uppercase; letter-spacing: 0.06em; color: var(--primary-dark); font-size: 11px; background: var(--bg-main); }
          .status{ display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--primary-soft); background: var(--card-white); color: var(--gray-900); font-weight: 900; font-size: 13px; }
          .dot{ width: 8px; height: 8px; border-radius: 999px; background: var(--gray-500); }
          .dot.green{ background: #10b981; }
          .dot.red{ background: #ef4444; }
          .actions{ display: flex; gap: 8px; }
          .btn{ border-radius: 999px; padding: 8px 10px; border: 1px solid var(--primary-soft); background: var(--card-white); color: var(--primary-dark); font-weight: 1100; cursor: pointer; font-size: 12px; transition: all 0.2s; }
          .btn:hover{ background: var(--bg-main); }
          .btn.danger{ border-color: rgba(239,68,68,0.3); color: #ef4444; }
          .modal{ position: fixed; inset: 0; background: rgba(15,23,42,0.55); display: flex; align-items: center; justify-content: center; padding: 18px; z-index: 9999; backdrop-filter: blur(4px); }
          .modal-card{ width: 100%; max-width: 640px; background: var(--card-white); border: 1px solid var(--primary-soft); border-radius: 20px; padding: 14px; box-shadow: 0 25px 70px rgba(39,24,126,0.15); }
          .tax-zone{ display: grid; grid-template-columns: 1fr 1.8fr; gap: 14px; }
          .inventory-top{ display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
          .inventory-tools{ display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
          .integrity{ margin-top: 12px; border: 1px solid var(--primary-soft); border-radius: 16px; padding: 10px; background: var(--card-white); }
          .integrity h4{ margin:0; font-size: 16px; color:var(--primary-dark); font-weight:1100; }
          .integrity p{ margin:6px 0 0; color:var(--gray-500); font-weight:800; font-size: 13px; }
          .grade-zone{ display: grid; grid-template-columns: 1.6fr 1fr; gap: 14px; align-items: start; }
          .grade-stack{ display: grid; gap: 12px; }
          .grade-card{ border-radius: 20px; border: 1px solid var(--primary-soft); background: var(--card-white); padding: 14px; box-shadow: 0 10px 30px rgba(39,24,126,0.05); }
          .grade-head{ display: flex; justify-content: space-between; align-items: center; gap: 12px; }
          .grade-title{ display: flex; align-items: center; gap: 10px; }
          .grade-badge{ width: 40px; height: 40px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-weight: 1100; color: #fff; }
          .grade-badge.a{ background: var(--primary); }
          .grade-badge.b{ background: var(--cta); }
          .grade-badge.c{ background: var(--gray-500); }
          .grade-card h3{ margin:0; font-weight:1100; color:var(--primary-dark); font-size: 16px; }
          .grade-card p{ margin:6px 0 0; font-weight:800; color:var(--gray-500); font-size: 13px; }
          .slider-row{ margin-top: 12px; display: grid; grid-template-columns: 1fr 160px; gap: 10px; align-items: center; }
          .slider-row label{ color: var(--gray-700); font-weight: 900; font-size: 13px; }
          .slider{ width: 100%; }
          .pill2{ justify-self: end; font-size: 13px; font-weight: 1100; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--primary-soft); background: var(--bg-main); color: var(--gray-900); font-family: monospace; }
          .preview{ border-radius: 20px; border: 1px solid var(--primary-soft); background: var(--card-white); padding: 14px; box-shadow: 0 10px 30px rgba(39,24,126,0.05); }
          .preview h3{ margin:0; font-weight:1100; color:var(--primary-dark); font-size: 16px; }
          .preview p{ margin:6px 0 0; font-weight:800; color:var(--gray-500); font-size: 13px; }
          .profile-mock{ margin-top: 12px; border-radius: 18px; border: 1px solid var(--primary-soft); background: var(--bg-main); padding: 12px; display: flex; gap: 12px; align-items: center; }
          .avatar{ width: 52px; height: 52px; border-radius: 18px; border: 1px solid var(--primary-soft); background: var(--card-white); display: flex; align-items: center; justify-content: center; font-weight: 1100; color: var(--primary-dark); }
          .mock-meta{ flex: 1; min-width: 0; }
          .mock-meta .name{ font-weight: 1100; color: var(--gray-900); font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .mock-meta .sub{ margin-top: 4px; color: var(--gray-500); font-weight: 800; font-size: 13px; }
          .badge-pill{ display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px; border: 1px solid var(--primary-soft); background: var(--card-white); color: var(--gray-900); font-weight: 1100; font-size: 12px; margin-top: 8px; }
          .boost-bar{ margin-top: 10px; height: 10px; border-radius: 999px; border: 1px solid var(--primary-soft); background: var(--card-white); overflow: hidden; }
          .boost-fill{ height: 100%; background: var(--primary); }
          .footer-bar{ position: sticky; bottom: 0; margin-top: 14px; border-radius: 18px; border: 1px solid var(--primary-soft); background: rgba(255,255,255,0.9); padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px; backdrop-filter: blur(10px); }
          .footer-msg{ color: var(--gray-700); font-weight: 800; font-size: 13px; }
          .footer-actions{ display: flex; gap: 10px; align-items: center; }
          .research-bar{ height: 10px; border-radius: 999px; background: var(--gray-200); overflow: hidden; }
          .research-bar-fill{ display: block; height: 100%; background: var(--cta); border-radius: 999px; }
          .kpi-grid{ display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 16px; }
          .demand-forecast-grid{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; align-items: stretch; }
          @media (max-width: 1180px){ .demand-forecast-grid{ grid-template-columns: 1fr; } }
          .demand-chart-panel{ padding: 12px 14px !important; }
          .demand-chart-panel > h3{ font-size: 15px !important; line-height: 1.25; }
          .demand-chart-panel > p{ font-size: 12px !important; margin-top: 4px !important; margin-bottom: 0 !important; }
          .demand-dash{ display: flex; flex-direction: column; gap: 14px; }
          .demand-section-title{ font-size: 11px; letter-spacing: 0.11em; font-weight: 1100; color: var(--primary-dark); text-transform: uppercase; margin: 0 0 8px 6px; }
          .demand-toolbar{ display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
          .demand-predict-panel{ border: 1px solid rgba(117,139,253,0.55); border-radius: 22px; background: linear-gradient(135deg, rgba(117,139,253,0.06) 0%, rgba(241,242,246,1) 50%); padding: 20px 22px; }
          .demand-predict-inner{ display: grid; grid-template-columns: minmax(0,1.35fr) minmax(0,1fr); gap: 22px; align-items: start; }
          @media (max-width: 900px){ .demand-predict-inner{ grid-template-columns: 1fr; } }
          .kpi-card{ background: linear-gradient(135deg, var(--card-white) 0%, var(--bg-main) 100%); border-radius: 24px; padding: 18px; border: 1px solid var(--primary-soft); box-shadow: 0 8px 20px rgba(0,0,0,0.02); }
          .kpi-label{ font-size: 13px; font-weight: 800; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.06em; }
          .kpi-value{ font-size: 32px; font-weight: 1100; color: var(--primary-dark); margin-top: 8px; line-height: 1.2; }
          .kpi-sub{ font-size: 12px; color: var(--gray-500); margin-top: 6px; }
          @media (max-width: 980px){ .cc-shell{ flex-direction: column; } .cc-sidebar{ width: 100%; border-right: none; border-bottom: 1px solid var(--primary-soft); } .zone{ grid-template-columns: 1fr; } .tax-zone{ grid-template-columns: 1fr; } .grade-zone{ grid-template-columns: 1fr; } .kpi-grid{ grid-template-columns: 1fr 1fr; } }
        `}</style>

        <aside className="cc-sidebar">
          <div className="cc-brand">
            <div className="cc-badge">OM</div>
            <div><h3>Operational Manager</h3><p className="cc-role">Catalog, rates &amp; live operations</p></div>
          </div>
          <div className="cc-nav">
            <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><span>Overview</span><span className="pill">Summary</span></button>
            <button className={tab === 'category' ? 'active' : ''} onClick={() => setTab('category')}><span>Category</span></button>
            <button className={tab === 'services' ? 'active' : ''} onClick={() => setTab('services')}><span>Services</span><span className="pill">Command</span></button>
            <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}><span>Requests</span><span className="pill">{pendingCount}</span></button>
            <button className={tab === 'research' ? 'active' : ''} onClick={() => setTab('research')}><span>Research</span><span className="pill">Rates</span></button>
            <button className={tab === 'grading' ? 'active' : ''} onClick={() => setTab('grading')}><span>Grading</span><span className="pill">A/B/C</span></button>
            <button className={tab === 'demand' ? 'active' : ''} onClick={() => setTab('demand')}><span>Demand Prediction</span><span className="pill">Advanced</span></button>
            <button className={tab === 'facts' ? 'active' : ''} onClick={() => { setTab('facts'); loadServiceRequestFacts().catch(() => {}); }}><span>Service Facts</span><span className="pill">Raw</span></button>
          </div>
          <div style={{ marginTop: 'auto', color: 'var(--gray-500)', fontWeight: 800, fontSize: 12 }}>Operational Manager · sidebar navigation</div>
        </aside>

        <div className="cc-main">
          <div className="cc-header">
            <div>
              <h2>{tab === 'overview' ? 'Dashboard overview' : tab === 'services' ? 'Services Command Center' : tab === 'category' ? 'Category' : tab === 'requests' ? 'Requests' : tab === 'research' ? 'Market Research' : tab === 'demand' ? 'Service Demand Forecast Dashboard' : tab === 'facts' ? 'Service Request Facts' : 'Grading'}</h2>
              <div className="sub">Operational Manager workspace · authorized catalog &amp; rate changes</div>
            </div>
            <div className="cc-actions">
              <button className="icon-btn" onClick={() => setTab('requests')}>
                <i className="fas fa-bell" />
                {pendingCount > 0 && <span className="notif">{pendingCount}</span>}
              </button>
              <button className="logout-btn" onClick={() => { logout(); window.location.hash = 'login'; }}>Logout</button>
            </div>
          </div>
          {error && <div style={{ marginBottom: 10, color: '#991b1b', fontWeight: 900 }}>{error}</div>}
          <div className="cc-content">
            {tab === 'overview' && (
              <>
                <div className="zone">
                  <div className="card"><h3>Operational snapshot</h3><p>Read-only totals from the live catalog.</p><div className="metric-grid"><div className="metric"><div className="k">Total services</div><div className="v">{metrics.total}</div></div><div className="metric"><div className="k">Active services</div><div className="v">{metrics.activeCount}</div></div><div className="metric"><div className="k">Unique categories</div><div className="v">{metrics.uniqueCats}</div></div><div className="metric"><div className="k">Research coverage</div><div className="v">{metrics.coveragePct}%</div></div></div></div>
                  <div className="card"><h3>Market research (dummy)</h3><p>Sample regional demand — placeholder data for UI research.</p><div style={{ marginTop: 12 }}>{DUMMY_RESEARCH_ROWS.map((row) => (<div key={row.region} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, fontWeight: 800, color: '#334155' }}><span>{row.region}</span><span>{row.avgMin.toLocaleString()}–{row.avgMax.toLocaleString()} LKR · {row.demandPct}% demand</span></div><div className="research-bar"><span className="research-bar-fill" style={{ width: `${(row.demandPct / maxDummyDemand) * 100}%` }} /></div></div>))}</div></div>
                </div>
                <div className="zone">
                  <div className="card"><h3>Categories in use</h3><p>Service counts per category (from registered services).</p><div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Category</th><th>Services</th></tr>
                      </thead>
                      <tbody>
                        {categoryServiceCounts.length ? categoryServiceCounts.map(([name, count]) => (<tr key={name}><td>{name}</td><td>{count}</td></tr>)) : (<tr><td colSpan={2}>No services yet — add services under the Services tab.</td></tr>)}
                      </tbody>
                    </table>
                  </div></div>
                  <div className="card"><h3>Grading tiers</h3><p>Current saved thresholds (read-only here; edit under Grading).</p><ul style={{ margin: '12px 0 0', paddingLeft: 18, color: '#334155', fontWeight: 800, fontSize: 13, lineHeight: 1.7 }}>{['A','B','C'].map((k) => { const g = gradingSaved[k]; const y = g ? Number(g.minYears) : 0; const line = g?.label ? `${k} — ${g.label}` : `${k} — Experience ≥ ${Number.isFinite(y) ? y : 0} years`; return <li key={k}>{line}</li>; })}</ul></div>
                </div>
                <div className="card"><div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><div><h3>Service catalog</h3><p>Read-only list — sort for review only.</p></div><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 900, color: '#475569' }}>Sort services<select className="select" style={{ width: 200 }} value={overviewSort} onChange={(e) => setOverviewSort(e.target.value)}><option value="title">Name (A–Z)</option><option value="category">Category (A–Z)</option><option value="status">Status (active first)</option></select></label></div><div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Service</th><th>Category</th><th>Rate (min–max)</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {overviewServicesSorted.length ? overviewServicesSorted.map((s) => (<tr key={s._id}><td>{s.title}</td><td>{s.category || '—'}</td><td>{Number(s.minRatePerHour) || 0}–{Number(s.maxRatePerHour) || 0} {s.currency || 'LKR'}</td><td><span className="status"><span className={`dot ${s.active !== false ? 'green' : 'red'}`} />{s.active !== false ? 'Active' : 'Inactive'}</span></td></tr>)) : (<tr><td colSpan={4}>No services loaded yet.</td></tr>)}
                    </tbody>
                  </table>
                </div></div>
              </>
            )}
            {tab === 'services' && (
              <>
                <div className="zone">
                  <div className="card"><h3>{editingService ? 'Edit service' : 'Register one service'}</h3><p>Name, description, hourly rate band, and operational status (one service at a time).</p><div className="grid"><div className="row2"><div className="with-error">{createFormTouched.title && (<div className={`Validation-msg ${validateServiceField('title', createForm.title) ? 'error' : 'success'}`}>{validateServiceField('title', createForm.title) || 'Looks good!'}</div>)}<input className={`input ${getSvcValidationClass('title', createForm.title)}`} value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} onBlur={() => handleSvcBlur('title')} placeholder="Service name" /></div><select className="select" value={createForm.category} onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}><option value="">Select category…</option>{categoryChoicesForServiceForm.map((c) => (<option key={c} value={c}>{c}</option>))}</select></div><div className="with-error">{createFormTouched.description && (<div className={`Validation-msg ${validateServiceField('description', createForm.description) ? 'error' : 'success'}`}>{validateServiceField('description', createForm.description) || 'Looks good!'}</div>)}<textarea className={`input ${getSvcValidationClass('description', createForm.description)}`} style={{ minHeight: 72, resize: 'vertical' }} value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} onBlur={() => handleSvcBlur('description')} placeholder="Service description" /></div><div style={{ color: 'var(--gray-500)', fontWeight: 900, fontSize: 12 }}>Hourly rate band (min – max)</div><DualThumbRateSlider domainMin={serviceCreateDomain.domainMin} domainMax={serviceCreateDomain.domainMax} min={Number(createForm.minRatePerHour) || 0} max={Number(createForm.maxRatePerHour) || 0} onChange={({ min, max }) => setCreateForm((f) => ({ ...f, minRatePerHour: min, maxRatePerHour: max }))} currency={createForm.currency || 'LKR'} disabled={creating} /><div className="row2"><button className="btn" onClick={() => setCreateForm((f) => ({ ...f, active: !f.active }))}>Status: {createForm.active ? 'Active' : 'Inactive'}</button>{editingService ? (<button className="btn" onClick={resetServiceForm} disabled={creating}>Cancel edit</button>) : (<span style={{ color: 'var(--gray-500)', fontSize: 12, fontWeight: 800 }}>Inactive hides this service from the public catalog.</span>)}</div><button className="primary" disabled={creating} onClick={createServiceRow}>{creating ? 'Saving…' : editingService ? 'Update service' : 'Register service'}</button></div></div>
                  <div className="card"><h3>Live Metrics</h3><p>System grades and efficiency stats</p><div className="metric-grid"><div className="metric"><div className="k">Total services</div><div className="v">{metrics.total}</div></div><div className="metric"><div className="k">Active services</div><div className="v">{metrics.activeCount}</div></div><div className="metric"><div className="k">Unique categories</div><div className="v">{metrics.uniqueCats}</div></div><div className="metric"><div className="k">Market value coverage</div><div className="v">{metrics.coveragePct}%</div></div></div><div style={{ marginTop: 10, color: 'var(--gray-500)', fontWeight: 800, fontSize: 12 }}>Tip: Use the Research tab to add missing per-hour values.</div></div>
                </div>
                <div className="table-wrap"><div style={{ padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontWeight: 1100, color: 'var(--gray-900)' }}><span>Service Inventory Table</span><button type="button" className="btn" onClick={syncServiceCategoryIds} disabled={saving} title="Set categoryId on every service that matches a category name">Apply category IDs</button></div><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><input className="input" style={{ width: 220 }} value={svcSearch} onChange={(e) => setSvcSearch(e.target.value)} placeholder="Search…" /><select className="select" style={{ width: 220 }} value={svcCategory} onChange={(e) => setSvcCategory(e.target.value)}><option value="">All categories</option>{mergedCategoryNameList.map((c) => (<option key={c} value={c}>{c}</option>))}</select><select className="select" style={{ width: 160 }} value={svcStatus} onChange={(e) => setSvcStatus(e.target.value)}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div>
                  <table>
                    <thead>
                      <tr><th>Service</th><th>Category</th><th>Category ID</th><th>Duration</th><th>Skill</th><th>Market/hr</th><th>Status</th><th style={{ width: 210 }}>Actions</th></tr>
                    </thead>
                    <tbody>
                      {visibleServices.length ? visibleServices.map((s) => {
                        const cid = s.categoryId != null ? String(s.categoryId) : '';
                        const resolvedCat = (cid && categoryIdToName.has(cid) ? categoryIdToName.get(cid) : null) || s.category || '-';
                        const key = `${String(resolvedCat === '-' ? '' : resolvedCat).toLowerCase()}::${String(s.title || '').toLowerCase()}`;
                        const mr = marketMap.get(key);
                        const isActive = s.active !== false;
                        return (
                          <tr key={s._id}>
                            <td style={{ fontWeight: 1100 }}>{s.title}</td>
                            <td>{resolvedCat}</td>
                            <td>{formatDbIdCell(s.categoryId)}</td>
                            <td>{Number(s.durationMinutes || 0) || 60} min</td>
                            <td>{s.skillLevel || 'Intermediate'}</td>
                            <td>{mr ? `${mr.currency || 'LKR'} ${mr.minRatePerHour}–${mr.maxRatePerHour}` : <span style={{ color: 'var(--gray-500)' }}>Not set</span>}</td>
                            <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, fontWeight: 900, fontSize: 13, border: isActive ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(239,68,68,0.4)', background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', color: isActive ? '#059669' : '#dc2626' }}><span style={{ width: 8, height: 8, borderRadius: 999, background: isActive ? '#10b981' : '#ef4444', flexShrink: 0 }} />{isActive ? 'Active' : 'Inactive'}</span></td>
                            <td><div className="actions"><button className="btn" onClick={() => openEditService(s)}>Edit</button><button className="btn danger" onClick={() => removeService(s)} disabled={saving}>Remove</button></div></td>
                          </tr>
                        );
                      }) : (<tr><td colSpan={8} style={{ color: 'var(--gray-500)', fontWeight: 800 }}>No services found.</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {tab === 'category' && (
              <div className="tax-zone">
                <div><div className="card"><h3>Category Creation</h3><p>Create categories and set active or inactive for the public catalog.</p><div className="grid"><input className="input" value={categoryForm.name} onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))} placeholder="Category name" /><textarea className="input" style={{ minHeight: 90, resize: 'vertical' }} value={categoryForm.description} onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description" /><div className="row2"><button className="btn" onClick={() => setCategoryForm((f) => ({ ...f, active: !f.active }))}>Status: {categoryForm.active ? 'Active' : 'Inactive'}</button></div><button className="primary" onClick={createCategoryRow} disabled={creatingCategory}>{creatingCategory ? 'Creating…' : 'Create Category'}</button></div></div><div className="integrity"><h4>System Integrity Panel</h4><p>Total categories: {categories.length}</p><p>Duplicate warnings: {duplicateNames.length}</p>{duplicateNames.length ? (<p style={{ color: '#fecaca' }}>Duplicates: {duplicateNames.join(', ')}</p>) : (<p style={{ color: '#bbf7d0' }}>No duplicate category names found.</p>)}</div></div>
                <div className="card"><div className="inventory-top"><div><h3>Category Inventory Table</h3><p>Filter by category, then by service within that category.</p></div><div className="inventory-tools"><select className="select" style={{ width: 200 }} value={taxSearch} onChange={(e) => { setTaxSearch(e.target.value); setTaxFilter('all'); }}><option value="">All Categories</option>{categories.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}</select></div></div><div className="table-wrap"><table><thead><tr><th>Category</th><th>Code</th><th>Category ID</th><th>Description</th><th>Status</th><th style={{ width: 180 }}>Actions</th></tr></thead><tbody>{visibleCategories.length ? visibleCategories.map((c) => (<tr key={c.id}><td style={{ fontWeight: 1100 }}>{c.name}</td><td>{c.code}</td><td>{formatDbIdCell(c.id)}</td><td>{c.description || '-'}</td><td><span className="status"><span className={`dot ${c.active ? 'green' : 'red'}`} />{c.active ? 'Active' : 'Inactive'}</span></td><td><div className="actions"><button className="btn" onClick={() => setEditingCategory(c)}>Edit</button><button className="btn" onClick={() => toggleCategoryStatus(c)} disabled={saving}>Toggle</button><button className="btn danger" onClick={() => removeCategory(c)} disabled={saving}>Remove</button></div></td></tr>)) : (<tr><td colSpan={6} style={{ color: 'var(--gray-500)', fontWeight: 800 }}>No categories found.</td></tr>)}</tbody></table></div></div>
                {categoryToDelete && (<div className="modal"><div className="modal-card"><h3>Confirm Deletion</h3><p>Are you sure you want to delete the category <strong>"{categoryToDelete.name}"</strong>?<br/><br/><span style={{ color: '#ef4444' }}>Warning:</span> This will irreversibly remove all services under this category and freeze any suppliers assigned to it.</p><div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="btn" onClick={() => setCategoryToDelete(null)} disabled={saving}>Cancel</button><button className="btn danger" onClick={confirmRemoveCategory} disabled={saving}>{saving ? 'Deleting...' : 'Delete Category'}</button></div></div></div>)}
              </div>
            )}
            {tab === 'requests' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
                <div className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}><div><h3>Incoming Requests</h3><p>Each request routes to Category or Service creation</p></div><div style={{ color: 'var(--gray-500)', fontWeight: 800, fontSize: 12 }}>Count: {requests.length}</div></div>
                {/* Year / Month Filters */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14, alignItems: 'flex-end', marginBottom: 14 }}>
                  <div style={{ minWidth: 160 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 900, color: 'var(--gray-500)', marginBottom: 6 }}>Year</label>
                    <select className="select" value={requestYearFilter} onChange={(e) => { setRequestYearFilter(e.target.value); setRequestMonthFilter(''); }} style={{ minWidth: 160 }}>
                      <option value="">All years</option>
                      {requestYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                  <div style={{ minWidth: 170 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 900, color: 'var(--gray-500)', marginBottom: 6 }}>Month</label>
                    <select className="select" value={requestMonthFilter} onChange={(e) => setRequestMonthFilter(e.target.value)} style={{ minWidth: 170 }}>
                      <option value="">All months</option>
                      {requestMonths.map(month => (<option key={month} value={month}>{new Date(2025, parseInt(month)-1).toLocaleString('default', { month: 'long' })}</option>))}
                    </select>
                  </div>
                  <button className="btn" onClick={() => { setRequestYearFilter(''); setRequestMonthFilter(''); }}>Reset Filters</button>
                </div>
                <div className="table-wrap"><table><thead><tr><th>Type</th><th>From</th><th>Category</th><th>Services</th><th>Status</th></tr></thead><tbody>{filteredRequests.length ? filteredRequests.map((req) => (<tr key={req._id} style={{ cursor: 'pointer' }} onClick={() => openRequestEditor(req)}><td><button className="btn" onClick={(e) => { e.stopPropagation(); goToRequestTarget(req); }}>{requestType(req) === 'category' ? 'Category' : 'Service'}</button></td><td>{req.supplierName || 'Admin'}</td><td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{req.category || '-'}<span style={{ padding: '1px 5px', borderRadius: 999, border: '1px solid rgba(30,58,138,0.4)', background: 'rgba(30,58,138,0.1)', color: 'var(--primary-dark)', fontWeight: 1100, fontSize: 9 }}>NEW</span></span></td><td>{(req.services || []).map((svc, si) => (<span key={si} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 8 }}>{svc}<span style={{ padding: '1px 4px', borderRadius: 999, border: '1px solid rgba(30,58,138,0.4)', background: 'rgba(30,58,138,0.08)', color: 'var(--primary-dark)', fontWeight: 1100, fontSize: 8 }}>NEW</span></span>))}{!(req.services || []).length && '-'}</td><td>{(() => { const b = requestStatusBadge(req.status); return (<span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontWeight: 900, fontSize: 12, background: b.bg, color: b.color, border: b.border }}>{b.label}</span>); })()}</td></tr>)) : (<tr><td colSpan={5}>No requests.</td></tr>)}</tbody></table></div></div>
                <div className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}><div><h3>Request Detail</h3><p>Admin1 approval — set each service rate on the slider, save, then publish</p></div>{selectedRequest && (<div style={{ color: 'var(--gray-500)', fontWeight: 800, fontSize: 12 }}>#{String(selectedRequest._id).slice(-6)}</div>)}</div>{selectedRequest ? (<div style={{ display: 'grid', gap: 10, marginTop: 12 }}>{(selectedRequest.supplierName || selectedRequest.supplierId) && (<div style={{ padding: '10px 14px', borderRadius: 14, border: '1px solid rgba(30,58,138,0.25)', background: 'rgba(30,58,138,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><i className="fas fa-user-tie" style={{ color: 'var(--primary)', fontSize: 14 }} /><span style={{ fontWeight: 900, color: '#92400e', fontSize: 13 }}>Supplier: <strong>{selectedRequest.supplierName || 'Unknown'}</strong></span><span style={{ padding: '3px 8px', borderRadius: 999, border: '1px solid rgba(30,58,138,0.4)', background: 'rgba(30,58,138,0.1)', color: '#92400e', fontWeight: 1100, fontSize: 11 }}>NEW REQUEST</span>{selectedRequest.supplierId && (<span style={{ color: 'var(--gray-500)', fontSize: 11, fontWeight: 800 }}>ID: {String(selectedRequest.supplierId).slice(-8)}</span>)}</div>)}<div style={{ border: '1px solid var(--primary-soft)', borderRadius: 16, padding: 12, background: 'var(--card-white)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><div style={{ fontWeight: 1100, color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: 8 }}>{requestForm.category || selectedRequest.category}<span style={{ padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(30,58,138,0.4)', background: 'rgba(30,58,138,0.1)', color: 'var(--primary-dark)', fontWeight: 1100, fontSize: 10, letterSpacing: '0.04em' }}>NEW</span><span style={{ marginLeft: 4, color: 'var(--gray-500)', fontWeight: 900, fontSize: 12 }}>({requestType(selectedRequest)})</span></div><div>{(() => { const b = requestStatusBadge(selectedRequest.status); return (<span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontWeight: 900, fontSize: 12, background: b.bg, color: b.color, border: b.border }}>{b.label}</span>); })()}</div></div><div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>{(requestServices || []).filter(s => String(s || '').trim()).length ? requestServices.map((svc, idx) => { const name = String(svc || '').trim(); if (!name) return null; const r = serviceRatesByService[name] || { min: 0, max: 0 }; const active = activeServiceName === name; return (<button key={`${idx}_${name}`} onClick={() => { setActiveServiceName(name); setServiceRateMsg(''); }} style={{ textAlign: 'left', cursor: 'pointer', border: active ? '1px solid var(--primary)' : '1px solid var(--primary-soft)', borderRadius: 16, padding: 10, background: active ? 'rgba(117,139,253,0.12)' : 'var(--card-white)', color: 'inherit', font: 'inherit' }}><div style={{ fontWeight: 1100, color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: 6 }}>{name}<span style={{ padding: '1px 6px', borderRadius: 999, border: '1px solid rgba(30,58,138,0.4)', background: 'rgba(30,58,138,0.1)', color: 'var(--primary-dark)', fontWeight: 1100, fontSize: 9, letterSpacing: '0.04em' }}>NEW</span></div><div style={{ marginTop: 6, color: 'var(--gray-500)', fontWeight: 800, fontSize: 12 }}>{requestForm.currency || selectedRequest.currency || 'LKR'} {r.min} – {r.max} / hr</div></button>); }) : (<div style={{ color: 'var(--gray-500)', fontWeight: 800, gridColumn: '1 / -1' }}>No services listed — use the slider below for a category-level band.</div>)}</div><div style={{ marginTop: 14 }}><div style={{ color: 'var(--gray-500)', fontWeight: 900, fontSize: 12, marginBottom: 8 }}>{(requestServices || []).filter(s => String(s || '').trim()).length ? `Rate band — ${activeServiceName || 'select a service'}` : 'Rate band (category)'}</div>{(requestServices || []).filter(s => String(s || '').trim()).length ? (activeServiceName && serviceRatesByService[activeServiceName] ? (<DualThumbRateSlider domainMin={activeRateDomain.domainMin} domainMax={activeRateDomain.domainMax} min={serviceRatesByService[activeServiceName].min} max={serviceRatesByService[activeServiceName].max} onChange={({ min, max }) => { const key = String(activeServiceName).trim(); setServiceRatesByService(prev => ({ ...prev, [key]: { min, max } })); }} currency={requestForm.currency || selectedRequest.currency || 'LKR'} disabled={saving} />) : (<div style={{ color: 'var(--gray-500)', fontWeight: 800, fontSize: 12 }}>Click a service above to adjust its range.</div>)) : (<DualThumbRateSlider domainMin={activeRateDomain.domainMin} domainMax={activeRateDomain.domainMax} min={Number(requestForm.minRatePerHour) || 0} max={Number(requestForm.maxRatePerHour) || 0} onChange={({ min, max }) => setRequestForm(f => ({ ...f, minRatePerHour: String(min), maxRatePerHour: String(max) }))} currency={requestForm.currency || selectedRequest.currency || 'LKR'} disabled={saving} />)}</div>{(requestServices || []).filter(s => String(s || '').trim()).length > 0 && activeServiceName ? (<div style={{ display: 'grid', gap: 8, marginTop: 14 }}><div style={{ color: 'var(--gray-500)', fontWeight: 900, fontSize: 12 }}>Service description — <span style={{ color: 'var(--gray-900)' }}>{activeServiceName}</span></div><textarea className="input" style={{ minHeight: 96, resize: 'vertical' }} value={serviceDescriptionsByService[activeServiceName] ?? ''} onChange={(e) => setServiceDescriptionsByService(prev => ({ ...prev, [activeServiceName]: e.target.value }))} placeholder={`Notes for “${activeServiceName}” only`} /></div>) : null}</div><input className="input" value={requestForm.category} onChange={(e) => setRequestForm(f => ({ ...f, category: e.target.value }))} placeholder="Category name" /><input className="input" value={requestForm.categoryDescription} onChange={(e) => setRequestForm(f => ({ ...f, categoryDescription: e.target.value }))} placeholder="Category description" /><div style={{ display: 'grid', gap: 8 }}><div style={{ color: 'var(--gray-500)', fontWeight: 900, fontSize: 12 }}>Services (one per box)</div>{(requestServices || []).length ? requestServices.map((svc, i) => (<input key={`${i}_${svc}`} className="input" value={svc} onChange={(e) => setRequestServices(prev => prev.map((x, idx) => idx === i ? e.target.value : x))} placeholder={`Service #${i + 1}`} />)) : (<div style={{ color: 'var(--gray-500)', fontWeight: 800, fontSize: 12 }}>No services listed.</div>)}</div>{serviceRateMsg && <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 12 }}>{serviceRateMsg}</div>}<div className="actions" style={{ flexWrap: 'wrap' }}>{(requestServices || []).filter(s => String(s || '').trim()).length > 0 && activeServiceName && (<button className="btn" onClick={saveActiveServiceRate} disabled={saving}>Save rate (this service)</button>)}<button className="btn" onClick={saveRequest} disabled={saving}>Save all</button><button className="primary" onClick={completeRequest} disabled={saving}>Complete + Publish</button></div></div>) : (<div style={{ marginTop: 12, color: 'var(--gray-500)', fontWeight: 800 }}>Select a request from the table to inspect.</div>)}</div>
              </div>
            )}
            {tab === 'research' && (
              <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <div className="card">
                  <h3>Pricing Guidelines Lookup</h3>
                  <p style={{ marginTop: 6, color: 'var(--gray-500)', fontWeight: 800 }}>Reference data set only. Use these predicted values as a guideline when you manually register new services. This data is strictly isolated from the live catalog.</p>
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <select className="select" value={researchSearchCat} onChange={e => setResearchSearchCat(e.target.value)} style={{ minWidth: 200 }}>
                      <option value="">All Categories</option>
                      {[...new Set(PREDICTION_DATA.map(p => p.category))].map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                    <input className="input" placeholder="Search service..." value={researchSearchSvc} onChange={e => setResearchSearchSvc(e.target.value)} style={{ flex: 1 }} />
                  </div>
                  <div className="table-wrap" style={{ marginTop: 16, maxHeight: '65vh', overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr><th>Category</th><th>Service</th><th>Min LKR/hr</th><th>Max LKR/hr</th></tr>
                      </thead>
                      <tbody>
                        {PREDICTION_DATA.filter(p => (researchSearchCat === '' || p.category === researchSearchCat) && (researchSearchSvc === '' || p.service.toLowerCase().includes(researchSearchSvc.toLowerCase()))).map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 1100, color: '#3b82f6' }}>{row.category}</td>
                            <td style={{ fontWeight: 900 }}>{row.service}</td>
                            <td>{row.min.toLocaleString()}</td>
                            <td>{row.max.toLocaleString()}</td>
                          </tr>
                        ))}
                        {PREDICTION_DATA.filter(p => (researchSearchCat === '' || p.category === researchSearchCat) && (researchSearchSvc === '' || p.service.toLowerCase().includes(researchSearchSvc.toLowerCase()))).length === 0 && (
                          <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--gray-500)' }}>No predictions match your search.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {tab === 'grading' && (
              <div className="grade-zone">
                <div className="grade-stack">
                  {['A', 'B', 'C'].map((key) => {
                    const grade = gradingDraft[key] || {};
                    return (
                      <div className="grade-card" key={key}>
                        <div className="grade-head">
                          <div className="grade-title">
                            <div className={`grade-badge ${key.toLowerCase()}`}>{key}</div>
                            <div>
                              <h3>{grade.label || `Grade ${key}`}</h3>
                              <p>Set minimum experience, stars, and price band.</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid" style={{ marginTop: 12 }}>
                          <div className="slider-row">
                            <label>Minimum Years</label>
                            <input className="input" type="number" min="0" value={Number(grade.minYears) || 0} onChange={(e) => updateGradeField(key, 'minYears', e.target.value)} />
                          </div>
                          <div className="slider-row">
                            <label>Stars (0-5)</label>
                            <input className="input" type="number" min="0" max="5" value={Number(grade.stars) || 0} onChange={(e) => updateGradeField(key, 'stars', e.target.value)} />
                          </div>
                          <div className="slider-row">
                            <label>Price Range Min</label>
                            <input className="input" type="number" min="0" value={Number(grade.priceRangeMin) || 0} onChange={(e) => updateGradeField(key, 'priceRangeMin', e.target.value)} />
                          </div>
                          <div className="slider-row">
                            <label>Price Range Max</label>
                            <input className="input" type="number" min="0" value={Number(grade.priceRangeMax) || 0} onChange={(e) => updateGradeField(key, 'priceRangeMax', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="preview">
                  <h3>Grading preview</h3>
                  <p>Current values that will be used for profile scoring.</p>
                  <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                    {['A', 'B', 'C'].map((key) => {
                      const g = gradingDraft[key] || {};
                      return (
                        <div key={key} className="profile-mock">
                          <div className="avatar">{key}</div>
                          <div className="mock-meta">
                            <div className="name">{g.label || `Grade ${key}`}</div>
                            <div className="sub">Years {'>='} {Number(g.minYears) || 0} | Stars: {Number(g.stars) || 0}/5</div>
                            <div className="badge-pill">Range: {Number(g.priceRangeMin) || 0}-{Number(g.priceRangeMax) || 0}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="footer-bar">
                    <div className="footer-msg">{gradingMsg || 'Adjust values, then save grading config.'}</div>
                    <div className="footer-actions">
                      <button className="btn" onClick={resetGradingChanges} disabled={saving}>Reset</button>
                      <button className="primary" onClick={saveGradingChanges} disabled={saving}>{saving ? 'Saving...' : 'Save grading'}</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {tab === 'demand' && (
              <div className="demand-dash" style={{ maxWidth: '100%', margin: '0 auto' }}>
                <div className="card" style={{ marginBottom: 4, padding: '18px 18px 16px', borderRadius: 22 }}>
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 21, fontWeight: 1100, color: 'var(--primary-dark)' }}>Service demand intelligence</h3>
                    <p style={{ margin: '10px 0 0', fontWeight: 800, color: 'var(--gray-500)', fontSize: 13, lineHeight: 1.5, maxWidth: 920 }}>
                      Built directly from MongoDB <code style={{ fontSize: 12 }}>service_requests_fact</code>
                      ({'district · category · service_name · Revenue_ · Final_Stat · Date_Time'})
                      — time filters slice every chart; geography and assortment filters isolate markets.
                      {demandFactRecordCount > 0 && !demandLoading && (
                        <span style={{ color: '#0f766e', fontWeight: 900 }}> · {demandFactRecordCount.toLocaleString()} fact rows loaded</span>
                      )}
                    </p>
                  </div>
                  <div className="demand-toolbar">
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: 'var(--gray-500)', marginBottom: 6 }}>Year</label>
                      <select className="select" value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterMonth(''); }} style={{ minWidth: 130 }}>
                        <option value="">All years</option>
                        {availableYears.map((y) => (<option key={y} value={y}>{y}</option>))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: 'var(--gray-500)', marginBottom: 6 }}>Month</label>
                      <select className="select" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} disabled={!filterYear} style={{ minWidth: 150, opacity: filterYear ? 1 : 0.5 }}>
                        <option value="">All months</option>
                        {availableMonths.filter((m) => m).map((m) => (<option key={m} value={m}>{new Date(2000, parseInt(m, 10) - 1).toLocaleString('default', MONTH_LABEL_OPTS)}</option>))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: 'var(--gray-500)', marginBottom: 6 }}>District</label>
                      <select className="select" value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)} style={{ minWidth: 170 }}>
                        <option value="">All districts</option>
                        {availableDistricts.map((d) => (<option key={d} value={d}>{d}</option>))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: 'var(--gray-500)', marginBottom: 6 }}>Category</label>
                      <select className="select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ minWidth: 170 }}>
                        <option value="">All categories</option>
                        {availableCategories.map((c) => (<option key={c} value={c}>{c}</option>))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => { setFilterYear(''); setFilterMonth(''); setFilterDistrict(''); setFilterCategory(''); }}
                      style={{ marginTop: 'auto' }}
                    >
                      Reset filters
                    </button>
                  </div>
                </div>
                <div className="kpi-grid">
                  <div className="kpi-card"><div className="kpi-label">Current week demand</div><div className="kpi-value">{demandLoading ? '…' : currentWeekDemand.toLocaleString()}</div><div className="kpi-sub">Trailing 7 days of daily totals (fact data)</div></div>
                  <div className="kpi-card"><div className="kpi-label">Predicted peak (30‑day smoothing)</div><div className="kpi-value">{demandLoading ? '…' : predictedPeakDay.toLocaleString()}</div><div className="kpi-sub">{peakDayForecast === 'N/A' ? 'N/A' : `around ${peakDayForecast}`}</div></div>
                  <div className="kpi-card"><div className="kpi-label">30‑day forecast total</div><div className="kpi-value">{demandLoading ? '…' : demandForecast30.reduce((a, b) => a + b, 0).toLocaleString()}</div><div className="kpi-sub">Frontend exponential smoothing trail</div></div>
                  <div className="kpi-card"><div className="kpi-label">Growth vs prior month</div><div className="kpi-value">{growthVsPrevMonth === null || Number.isNaN(growthVsPrevMonth) ? '—' : `${growthVsPrevMonth > 0 ? '+' : ''}${growthVsPrevMonth}%`}</div><div className="kpi-sub">Last two months in current filter window</div></div>
                </div>
                <div className="demand-forecast-grid">
                  <div className="card demand-chart-panel">
                    <h3>90‑day model · actual vs forecast</h3>
                    <p>Holt‑Winters history (blue) plus forecast and bands — Y-axis padded so low volumes stay readable.</p>
                    {!forecastChartData90.length ? (
                      <div style={{ height: DEMAND_FORECAST_GRID_CHART_H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', fontWeight: 800, fontSize: 13 }}>Need ≥3 days of fact data.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={DEMAND_FORECAST_GRID_CHART_H}>
                        <ComposedChart data={forecastChartData90} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(174,184,254,0.85)" strokeOpacity={0.9} />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={52} interval="preserveStartEnd" minTickGap={28} />
                          <YAxis domain={[0, yMaxForecast90]} allowDecimals={false} tick={{ fontSize: 11 }} width={40} />
                          <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} verticalAlign="top" align="right" iconType="line" iconSize={10} />
                          <Line connectNulls type="monotone" dataKey="lower" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Lower band" isAnimationActive={false} />
                          <Line connectNulls type="monotone" dataKey="upper" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Upper band" isAnimationActive={false} />
                          <Area connectNulls type="monotone" dataKey="actual" stroke="#1d4ed8" strokeWidth={3} fill="rgba(37,99,235,0.07)" dot={{ r: 4, fill: '#1d4ed8', strokeWidth: 2, stroke: '#fff' }} name="Daily actual" isAnimationActive={false} />
                          <Line connectNulls type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, stroke: '#991b1b' }} activeDot={{ r: 6 }} name="Forecast" isAnimationActive={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="card demand-chart-panel">
                    <h3>30‑day outlook · smoothed</h3>
                    <p>Recent daily totals vs exponential‑smoothing forecast (next 30 days).</p>
                    {!forecastChartData30.length ? (
                      <div style={{ height: DEMAND_FORECAST_GRID_CHART_H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', fontWeight: 800, fontSize: 13 }}>No daily series yet.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={DEMAND_FORECAST_GRID_CHART_H}>
                        <ComposedChart data={forecastChartData30} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(174,184,254,0.85)" strokeOpacity={0.9} />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={52} interval="preserveEnd" minTickGap={24} />
                          <YAxis domain={[0, yMaxForecast30]} allowDecimals={false} tick={{ fontSize: 11 }} width={40} />
                          <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} verticalAlign="top" align="right" iconType="line" iconSize={10} />
                          <Line connectNulls type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} name="Actual" isAnimationActive={false} />
                          <Line connectNulls type="monotone" dataKey="forecast" stroke="#ea580c" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 3 }} name="Forecast" isAnimationActive={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="card demand-chart-panel">
                    <h3>Daily requests (facts)</h3>
                    <p>Last {Math.min(90, dailyDemandLineData.length)} days · same facts as APIs, independent Y scale.</p>
                    {!dailyDemandLineData.length ? (
                      <div style={{ height: DEMAND_FORECAST_GRID_CHART_H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', fontWeight: 800, fontSize: 13 }}>No rows in filters.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={DEMAND_FORECAST_GRID_CHART_H}>
                        <LineChart data={dailyDemandLineData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(174,184,254,0.85)" strokeOpacity={0.9} />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={52} interval="preserveStartEnd" minTickGap={22} />
                          <YAxis domain={[0, yMaxDailyRequests]} allowDecimals={false} tick={{ fontSize: 11 }} width={40} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} verticalAlign="top" align="right" iconType="line" iconSize={10} />
                          <Line type="monotone" dataKey="requests" stroke="#0891b2" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} name="Requests / day" isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="card demand-chart-panel">
                    <h3>Throughput · revenue vs requests</h3>
                    <p>Daily LKR bars with request overlay — spot load vs revenue drift.</p>
                    {!revenueTrend.length ? (
                      <div style={{ height: DEMAND_FORECAST_GRID_CHART_H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', fontWeight: 800, fontSize: 13 }}>No revenue series.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={DEMAND_FORECAST_GRID_CHART_H}>
                        <ComposedChart data={revenueTrend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(174,184,254,0.85)" strokeOpacity={0.9} />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={52} interval="preserveEnd" minTickGap={26} />
                          <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={44} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={38} />
                          <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} verticalAlign="top" align="right" iconSize={10} />
                          <Bar yAxisId="left" dataKey="revenue" fill="rgba(117,139,253,0.55)" radius={[6, 6, 2, 2]} name="Revenue LKR" isAnimationActive={false} />
                          <Line yAxisId="right" type="monotone" dataKey="requests" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} name="Requests" isAnimationActive={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="demand-section-title">Regional &amp; category demand · same filtered facts</div>
                <div className="zone" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                  <div className="card">
                    <h3>District leaderboard</h3>
                    <p style={{ marginTop: 4, fontSize: 12, color: 'var(--gray-500)', fontWeight: 800 }}>Request counts grouped by <code>district</code></p>
                    {demandByDistrict.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-500)', fontWeight: 800 }}>No district labels in this slice — add/import <code>district</code> on facts.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={Math.min(360, 48 + demandByDistrict.length * 26)}>
                        <BarChart data={[...demandByDistrict].reverse()} layout="vertical" margin={{ left: 12, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" domain={[0, yMaxDistrictRequests]} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => `${Number(v).toLocaleString()} reqs`} />
                          <Bar dataKey="requests" fill="#4338ca" name="Requests" radius={[0, 8, 8, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="card">
                    <h3>Category throughput</h3>
                    <p style={{ marginTop: 4, fontSize: 12, color: 'var(--gray-500)', fontWeight: 800 }}>Stacks every <code>category</code> value (Beauty, Cleaning, Handyman …)</p>
                    {demandByCategory.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-500)', fontWeight: 800 }}>No category labels — map your catalog column into <code>category</code>.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={Math.min(360, 48 + demandByCategory.length * 26)}>
                        <BarChart data={demandByCategory} layout="vertical" margin={{ left: 12, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" domain={[0, yMaxCategoryRequests]} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => `${Number(v).toLocaleString()} reqs`} />
                          <Bar dataKey="requests" fill="#059669" name="Requests" radius={[0, 8, 8, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="demand-section-title">Demographics · fulfillment mix</div>
                <div className="zone" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                  <div className="card">
                    <h3>Age-group request mix</h3>
                    <p style={{ marginTop: 4, fontSize: 12, color: 'var(--gray-500)', fontWeight: 800 }}><code>age_group</code> · useful for tailoring marketing elasticity</p>
                    {demandByAgeGroup.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-500)', fontWeight: 800, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No age cohort labels in this slice — map or import <code>age_group</code> on facts.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={demandByAgeGroup}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={40} />
                          <YAxis /><Tooltip />
                          <Bar dataKey="requests" fill="#d97706" radius={[10, 10, 4, 4]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    <ChartSmartHint lines={smartHintsAgeGroup} />
                  </div>
                  <div className="card">
                    <h3>Outcome mix · Fulfillment health</h3>
                    <p style={{ marginTop: 4, fontSize: 12, color: 'var(--gray-500)', fontWeight: 800 }}><code>Final_Status</code> / <code>Final_Stat</code></p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
                      <div style={{ flex: '1 1 280px', minHeight: 280 }}>
                        <ResponsiveContainer width="100%" height={280}>
                          {demandStatusPieData.length ? (
                            <PieChart>
                              <Pie data={demandStatusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={96} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {demandStatusPieData.map((entry, index) => (<Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}`, 'Requests']} />
                            </PieChart>
                          ) : (
                            <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-500)', fontWeight: 800 }}>No status rows.</div>
                          )}
                        </ResponsiveContainer>
                      </div>
                      <div style={{ flex: '1 1 220px', fontSize: 13, fontWeight: 800, color: 'var(--gray-700)', lineHeight: 1.6 }}>
                        {demandStatusPieData.length > 0 ? (
                          <>
                            <div style={{ fontWeight: 1100, color: 'var(--primary-dark)', marginBottom: 8 }}>Fulfillment KPI</div>
                            Completed share:{' '}
                            <strong style={{ color: '#059669' }}>
                              {(
                                ((demandStatusPieData.find((d) => String(d.name).toLowerCase() === 'completed')?.value || 0) /
                                  demandStatusPieData.reduce((s, d) => s + d.value, 0)) *
                                100
                              ).toFixed(1)}
                              %
                            </strong>
                            <div style={{ marginTop: 14, fontWeight: 800, fontSize: 12, color: 'var(--gray-500)' }}>Tune acquisition if cancelled/pending dominates.</div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--gray-500)' }}>Statuses will appear once values map to Completed / Pending / Cancelled …</span>
                        )}
                      </div>
                    </div>
                    <ChartSmartHint lines={smartHintsOutcome} />
                  </div>
                </div>

                <div className="demand-section-title">Operational rhythm · SLAs</div>
                <div className="zone" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                  <div className="card">
                    <h3>Avg response time</h3>
                    <p style={{ marginTop: 4, fontSize: 12, color: 'var(--gray-500)', fontWeight: 800 }}>Weighted from <code>Response_</code> / <code>Response_Time_Mins</code></p>
                    <ResponsiveContainer width="100%" height={280}>
                      {responseTrend.length ? (
                        <LineChart data={responseTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(174,184,254,0.8)" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={48} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="avgResponseTime" stroke="#ea580c" strokeWidth={3} dot={{ r: 3 }} name="Avg min" isAnimationActive={false} />
                        </LineChart>
                      ) : (
                        <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-500)', fontWeight: 800 }}>No response-time signals in range.</div>
                      )}
                    </ResponsiveContainer>
                  </div>
                  <div className="card">
                    <h3>Weekday rhythm</h3>
                    <p style={{ marginTop: 4, fontSize: 12, color: 'var(--gray-500)', fontWeight: 800 }}>Averages reconstructed from dated facts</p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={weekdayIndex}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="avgRequests" fill="#7c3aed" name="Avg req/day" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="demand-section-title">Macro trend · service winners</div>
                <div className="zone" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 14 }}>
                  <div className="card">
                    <h3>Monthly buckets</h3>
                    <p style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: 'var(--gray-500)' }}>Synthetic months from aggregated daily totals</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={monthlyVolumes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="yearMonth" tick={{ fontSize: 10 }} angle={-18} textAnchor="end" height={48} />
                        <YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" />
                        <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar yAxisId="left" dataKey="requests" fill="rgba(30,58,138,0.38)" name="Requests" radius={[6, 6, 4, 4]} isAnimationActive={false} />
                        <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#4f46e5" name="Revenue LKR" strokeWidth={2} dot />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <ChartSmartHint lines={smartHintsMonthly} />
                  </div>
                  <div className="card">
                    <h3>Line-of-business ranking · requests</h3>
                    <p style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: 'var(--gray-500)' }}>Uses <code>service_name</code> when populated, otherwise <code>Service_ID</code></p>
                    {demandTopServicesBar.length ? (
                      <ResponsiveContainer width="100%" height={Math.max(240, demandTopServicesBar.length * 28)}>
                        <BarChart data={[...demandTopServicesBar].reverse()} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="shortId" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value) => `${Number(value).toLocaleString()} requests`} />
                          <Bar dataKey="requests" fill="#2563eb" radius={[0, 8, 8, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ padding: 22, color: 'var(--gray-500)', fontWeight: 800 }}>Nothing to rank inside this slice.</div>
                    )}
                    <ChartSmartHint lines={smartHintsLob} />
                  </div>
                </div>

                <div className="demand-section-title">Predictions · planning window</div>
                <div className="demand-predict-panel" style={{ marginBottom: 16 }}>
                  <div className="demand-predict-inner">
                    <div>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 1100, color: 'var(--primary-dark)' }}>Holt‑Winters roll‑forward ({forecastSeries.forecast?.length || 0} horizons)</h3>
                      <p style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 800, color: 'var(--gray-700)', lineHeight: 1.65 }}>
                        The model extrapolates the latest level/trend learnt from dated fact volume. Planned sum of projected daily requests across the displayed window is{' '}
                        <strong style={{ color: '#1e40af' }}>{Number(forecastSummary.next90Total || 0).toLocaleString()}</strong>.
                        {forecastSummary.peakDate ? (
                          <> Peak single-day outlook <strong>{Number(forecastSummary.peakValue || 0).toLocaleString()} req/d</strong> around <strong>{forecastSummary.peakDate}</strong>.</>
                        ) : null}{' '}
                        Short-horizon average (first 30 forecast days): <strong>{Number(forecastSummary.avgDailyNext30 || 0).toLocaleString()}</strong> req/day.
                      </p>
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(117,139,253,0.35)' }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-500)', marginBottom: 10 }}>30‑DAY SMOOTHED PEAK (UI)</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                          Peak demand estimate <strong>{predictedPeakDay.toLocaleString()} requests</strong> near <strong>{peakDayForecast}</strong> based on exponential smoothing aligned to your filtered history.
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {analyticsPredictions.map((pred, idx) => (
                        <div key={idx} style={{ padding: 14, background: 'rgba(255,255,255,0.65)', borderRadius: 14, border: '1px solid rgba(117,139,253,0.35)' }}>
                          <div style={{ fontWeight: 1100, color: 'var(--primary-dark)', fontSize: 14 }}>{pred.period}</div>
                          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900, color: 'var(--gray-700)', lineHeight: 1.5 }}>
                            Avg/day <span style={{ color: '#2563eb' }}>{pred.avgExpected}</span>
                            {pred.totalExpected ? <> · Σ {pred.totalExpected.toLocaleString()} </> : null}
                            {pred.peakExpected ? <> · spike {pred.peakExpected}</> : null}
                            <span style={{ color: '#92400e' }}> · {pred.confidence}</span>
                          </div>
                        </div>
                      ))}
                      {!analyticsPredictions.length && (
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gray-500)' }}>Run three or more days with positives to unlock automated period cards.</div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ padding: 10, background: '#fff', borderRadius: 12, border: '1px solid rgba(226,232,240,1)' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-500)' }}>TOTAL REQUESTS</div>
                          <div style={{ fontSize: 17, fontWeight: 1100, color: '#059669', marginTop: 4 }}>{analyticsSummary.totalRequests?.toLocaleString() || 0}</div>
                        </div>
                        <div style={{ padding: 10, background: '#fff', borderRadius: 12, border: '1px solid rgba(226,232,240,1)' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-500)' }}>TOTAL REV · LKR</div>
                          <div style={{ fontSize: 17, fontWeight: 1100, color: '#1d4ed8', marginTop: 4 }}>{analyticsSummary.totalRevenue?.toLocaleString() || 0}</div>
                        </div>
                        <div style={{ padding: 10, background: '#fff', borderRadius: 12, border: '1px solid rgba(226,232,240,1)' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-500)' }}>COMPLETION</div>
                          <div style={{ fontSize: 17, fontWeight: 1100, color: '#16a34a', marginTop: 4 }}>{analyticsSummary.completionRate || 0}%</div>
                        </div>
                        <div style={{ padding: 10, background: '#fff', borderRadius: 12, border: '1px solid rgba(226,232,240,1)' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--gray-500)' }}>AVG RESP · MIN</div>
                          <div style={{ fontSize: 17, fontWeight: 1100, color: '#ea580c', marginTop: 4 }}>{analyticsSummary.avgResponseTime || 0}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="zone" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                  <div className="card">
                    <h3>Market volatility &amp; deltas</h3>
                    <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
                      {analyticsTrends.map((trend, idx) => (
                        <div key={idx} style={{ padding: 12, background: 'rgba(148,163,184,0.06)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 950, color: 'var(--gray-900)', fontSize: 14 }}>{trend.label}</div>
                            {trend.severity && <div style={{ fontSize: 11, marginTop: 4, color: 'var(--gray-500)', fontWeight: 800 }}>{trend.severity}</div>}
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 1100, color: trend.direction === 'up' ? '#10b981' : trend.direction === 'down' ? '#ef4444' : 'var(--primary)' }}>
                            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '•'} {trend.value}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <h3>Weekly cadence hotspots</h3>
                    <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                      {analyticsPeakDays.length ? analyticsPeakDays.map((day, idx) => (
                        <div key={idx} style={{ padding: 10, background: idx === 0 ? 'rgba(117,139,253,0.14)' : 'rgba(248,250,252,1)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--primary-soft)' }}>
                          <span style={{ fontWeight: 950 }}>{day.day}</span>
                          <span style={{ fontWeight: 1100, color: '#4338ca' }}>{day.avgRequests} avg / day</span>
                        </div>
                      )) : <div style={{ color: 'var(--gray-500)', fontWeight: 800 }}>Insufficient calendar coverage.</div>}
                    </div>
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 16 }}>
                  <h3>SKU table · throughput & yield</h3>
                  <p style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: 'var(--gray-500)' }}>Row labels derive from enriched fact identifiers</p>
                  <div style={{ marginTop: 12, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--primary-soft)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 900, fontSize: 12, color: 'var(--gray-500)' }}>SERVICE LABEL</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 900, fontSize: 12, color: 'var(--gray-500)' }}>REQUESTS</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 900, fontSize: 12, color: 'var(--gray-500)' }}>REVENUE</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 900, fontSize: 12, color: 'var(--gray-500)' }}>COMPLETION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsTopServices.length > 0 ? analyticsTopServices.map((svc, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--primary-soft)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 950, color: 'var(--gray-900)', maxWidth: 280 }}>{svc.serviceId}</td>
                            <td style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--gray-700)' }}>{svc.requests.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', padding: '10px 12px', color: '#312e81', fontWeight: 900 }}>{svc.revenue.toLocaleString()} LKR</td>
                            <td style={{ textAlign: 'right', padding: '10px 12px', color: svc.completionRate >= 80 ? '#10b981' : '#ea580c', fontWeight: 900 }}>{svc.completionRate}%</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: 'var(--gray-500)', fontWeight: 800 }}>No SKU-level rollup for this slice.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <h3>Smart Recommendations</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16, marginTop: 16 }}>
                    {/* Dynamic recommendations based on analytics */}
                    {conversionRates[0]?.percentage < 75 && (
                      <div style={{ padding: 12, borderRadius: 16, background: 'rgba(239,68,68,0.08)', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ fontWeight: 1100, color: '#dc2626' }}>Low Completion Rate</div>
                        <div style={{ fontSize: 13, marginTop: 6, color: 'var(--gray-700)' }}>Only {conversionRates[0]?.percentage || 0}% of requests are completed. Investigate delays and improve fulfillment processes.</div>
                        <div style={{ fontSize: 12, marginTop: 8, color: 'var(--gray-500)', fontWeight: 800 }}>⚠️ Action required</div>
                      </div>
                    )}
                    {growthVsPrevMonth !== null && growthVsPrevMonth > 30 && (
                      <div style={{ padding: 12, borderRadius: 16, background: 'rgba(16,185,129,0.08)', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontWeight: 1100, color: '#059669' }}>Strong Growth Trend</div>
                        <div style={{ fontSize: 13, marginTop: 6, color: 'var(--gray-700)' }}>Month-over-month growth of {growthVsPrevMonth}%. Scale up resources and inventory to meet increased demand.</div>
                        <div style={{ fontSize: 12, marginTop: 8, color: 'var(--gray-500)', fontWeight: 800 }}>✅ Opportunity</div>
                      </div>
                    )}
                    {servicePerformance.length > 0 && servicePerformance.filter(s => s.completionRate < 50).length > 0 && (
                      <div style={{ padding: 12, borderRadius: 16, background: 'rgba(245,158,11,0.08)', borderLeft: '4px solid #f59e0b' }}>
                        <div style={{ fontWeight: 1100, color: '#d97706' }}>Underperforming Services</div>
                        <div style={{ fontSize: 13, marginTop: 6, color: 'var(--gray-700)' }}>{servicePerformance.filter(s => s.completionRate < 50).length} services have below 50% completion. Review training and process improvements.</div>
                        <div style={{ fontSize: 12, marginTop: 8, color: 'var(--gray-500)', fontWeight: 800 }}>⚠️ Monitor closely</div>
                      </div>
                    )}
                    {predictedPeakDay > 0 && (
                      <div style={{ padding: 12, borderRadius: 16, background: 'rgba(59,130,246,0.08)', borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ fontWeight: 1100, color: '#1e40af' }}>Peak Demand Predicted</div>
                        <div style={{ fontSize: 13, marginTop: 6, color: 'var(--gray-700)' }}>Peak of {predictedPeakDay.toLocaleString()} requests predicted on {peakDayForecast}. Pre-position capacity and staffing.</div>
                        <div style={{ fontSize: 12, marginTop: 8, color: 'var(--gray-500)', fontWeight: 800 }}>📈 Plan ahead</div>
                      </div>
                    )}
                    {analyticsSuggestions.length > 0 ? (
                      analyticsSuggestions.slice(0, 2).map((sug, idx) => (
                        <div key={idx} style={{ padding: 12, borderRadius: 16, background: sug.priority === 'high' ? 'rgba(239,68,68,0.08)' : sug.priority === 'medium' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', borderLeft: `4px solid ${sug.priority === 'high' ? '#ef4444' : sug.priority === 'medium' ? '#f59e0b' : '#10b981'}` }}>
                          <div style={{ fontWeight: 1100, color: sug.priority === 'high' ? '#dc2626' : sug.priority === 'medium' ? '#d97706' : '#059669' }}>{sug.category}</div>
                          <div style={{ fontSize: 13, marginTop: 6, color: 'var(--gray-700)' }}>{sug.suggestion}</div>
                          <div style={{ fontSize: 12, marginTop: 8, color: 'var(--gray-500)', fontWeight: 800 }}>💡 {sug.impact}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: 12, color: 'var(--gray-500)' }}>No additional suggestions at this time.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {tab === 'facts' && (
              <div style={{ maxWidth: '100%', margin: '0 auto' }}>
                <div className="card" style={{ marginBottom: 20, padding: '16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 220px' }}>
                    <h3 style={{ marginBottom: 4 }}>Service Request Facts</h3>
                    <p style={{ margin: 0, fontWeight: 800 }}>
                      Raw records · MongoDB collection <code style={{ fontSize: 12 }}>service_requests_fact</code>
                      {factsTotal > 0 && (
                        <span style={{ color: 'var(--gray-500)', marginLeft: 8 }}>
                          ({factsLoading ? '…' : `${factsTotal.toLocaleString()} total records`})
                        </span>
                      )}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input 
                      type="number" 
                      placeholder="Year" 
                      value={filterYear} 
                      onChange={(e) => { setFactsSkip(0); setFilterYear(e.target.value); }} 
                      style={{ padding: '8px 12px', border: '1px solid var(--primary-soft)', borderRadius: 8, width: 100 }}
                    />
                    <input 
                      type="number" 
                      placeholder="Month" 
                      value={filterMonth} 
                      onChange={(e) => { setFactsSkip(0); setFilterMonth(e.target.value); }} 
                      min="1" 
                      max="12"
                      style={{ padding: '8px 12px', border: '1px solid var(--primary-soft)', borderRadius: 8, width: 100 }}
                    />
                    <select 
                      value={factsLimit} 
                      onChange={(e) => { setFactsLimit(Number(e.target.value)); setFactsSkip(0); }} 
                      style={{ padding: '8px 12px', border: '1px solid var(--primary-soft)', borderRadius: 8 }}
                    >
                      <option value="25">25 rows</option>
                      <option value="50">50 rows</option>
                      <option value="100">100 rows</option>
                      <option value="500">500 rows</option>
                    </select>
                    <button 
                      className="primary" 
                      onClick={() => loadServiceRequestFacts()}
                      disabled={factsLoading}
                      style={{ padding: '8px 16px' }}
                    >
                      {factsLoading ? 'Loading…' : 'Load Data'}
                    </button>
                  </div>
                </div>

                <div className="card">
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--primary-soft)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 900, fontSize: 11, color: 'var(--gray-500)' }}>REQUEST ID</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 900, fontSize: 11, color: 'var(--gray-500)' }}>CUSTOMER</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 900, fontSize: 11, color: 'var(--gray-500)' }}>PROVIDER</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 900, fontSize: 11, color: 'var(--gray-500)' }}>SERVICE</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 900, fontSize: 11, color: 'var(--gray-500)' }}>DATE</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 900, fontSize: 11, color: 'var(--gray-500)' }}>DISTANCE</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 900, fontSize: 11, color: 'var(--gray-500)' }}>RESPONSE</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 900, fontSize: 11, color: 'var(--gray-500)' }}>STATUS</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 900, fontSize: 11, color: 'var(--gray-500)' }}>REVENUE</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 900, fontSize: 11, color: 'var(--gray-500)' }}>COMMISSION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceRequestFacts.length > 0 ? serviceRequestFacts.map((fact, idx) => {
                          const row = displayServiceFactRow(fact);
                          const sl = row.status.toLowerCase();
                          const statusColor =
                            sl === 'completed' ? '#10b981'
                              : /pending|open|progress/.test(sl) ? '#f59e0b'
                                : /cancel|reject|fail/.test(sl) ? '#ef4444'
                                  : '#64748b';
                          const rowKey = fact._id != null ? String(fact._id) : `${row.requestId}-${idx}`;
                          return (
                            <tr key={rowKey} style={{ borderBottom: '1px solid var(--primary-soft)' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--gray-900)' }}>{row.requestId}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--gray-700)' }}>{row.customer}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--gray-700)' }}>{row.provider}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--gray-700)' }}>{row.service}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--gray-700)', fontSize: 11 }}>{row.dateLabel}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--gray-700)' }}>{row.distanceKm.toFixed(1)} km</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--gray-700)' }}>{row.responseMins} min</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, color: 'white', background: statusColor }}>
                                  {row.status}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: '#3b82f6', fontWeight: 700 }}>Rs {row.revenue.toLocaleString()}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: '#8b5cf6', fontWeight: 700 }}>Rs {row.commission.toLocaleString()}</td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan="10" style={{ padding: '16px', textAlign: 'center', color: 'var(--gray-500)' }}>
                              {factsLoading ? 'Loading facts…' : 'No records found. Load data to see service request facts.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {factsTotal > 0 && (
                  <div className="card" style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, color: 'var(--gray-700)' }}>
                      Showing {factsSkip + 1} to {Math.min(factsSkip + factsLimit, factsTotal)} of {factsTotal.toLocaleString()} records
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        className="btn"
                        onClick={() => setFactsSkip(Math.max(0, factsSkip - factsLimit))}
                        disabled={factsSkip === 0}
                        style={{ padding: '8px 16px' }}
                      >
                        ← Previous
                      </button>
                      <button 
                        className="btn"
                        onClick={() => setFactsSkip(factsSkip + factsLimit)}
                        disabled={factsSkip + factsLimit >= factsTotal}
                        style={{ padding: '8px 16px' }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {editingCategory && (
        <div className="modal"><div className="modal-card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><div style={{ fontWeight: 1100, color: 'var(--gray-900)' }}>Edit Category</div><button className="btn" onClick={() => setEditingCategory(null)}>Close</button></div><div className="grid"><input className="input" value={editingCategory.name} onChange={(e) => setEditingCategory(c => ({ ...c, name: e.target.value }))} /><textarea className="input" style={{ minHeight: 90, resize: 'vertical' }} value={editingCategory.description || ''} onChange={(e) => setEditingCategory(c => ({ ...c, description: e.target.value }))} /><button className="btn" onClick={() => setEditingCategory(c => ({ ...c, active: !c.active }))}>Status: {editingCategory.active ? 'Active' : 'Inactive'}</button><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button className="btn" onClick={() => setEditingCategory(null)}>Cancel</button><button className="primary" onClick={saveEditingCategory} disabled={saving}>Save</button></div></div></div></div>
      )}
      <Footer />
    </>
  );
};

export default Admin2DashboardPage;

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_TO_NUM = (() => {
  const m = {};
  MONTH_SHORT.forEach((x, i) => { m[x] = i + 1; m[x.toLowerCase()] = i + 1; });
  MONTH_LONG.forEach((x, i) => { m[x] = i + 1; m[x.toLowerCase()] = i + 1; });
  for (let i = 1; i <= 12; i++) {
    m[String(i)] = i;
    m[String(i).padStart(2, '0')] = i;
  }
  return m;
})();

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

function parseServiceFactRowDate(fact) {
  if (fact.Date_Time != null && fact.Date_Time !== '') {
    const d = new Date(fact.Date_Time);
    if (!isNaN(d.getTime())) return d;
  }
  const y = Number(fact.Year);
  if (!Number.isFinite(y)) return null;
  const key = fact.Month;
  if (typeof key === 'number' && key >= 1 && key <= 12) {
    return new Date(y, key - 1, 15);
  }
  if (typeof key === 'string') {
    const trimmed = key.trim();
    const num = MONTH_TO_NUM[trimmed] ?? MONTH_TO_NUM[trimmed.slice(0, 3).toLowerCase()] ?? MONTH_TO_NUM[trimmed.toLowerCase()];
    if (num) return new Date(y, num - 1, 15);
  }
  return null;
}

/** Read-only row mapping aligned with backend normalizeFactRow / parseFactRowDate */
function displayServiceFactRow(fact) {
  const requestId = firstNonEmpty(fact.Request_ID, fact.request_id, fact._id != null ? String(fact._id) : '') || '—';
  const customer = firstNonEmpty(
    fact.Customer,
    fact.customer,
    fact.Customer_Name,
    fact.customer_name,
    fact.Customer_ID,
    fact.CustomerId
  ) || '—';
  const provider = firstNonEmpty(
    fact.Provider,
    fact.provider,
    fact.Provider_Name,
    fact.provider_name,
    fact.Provider_ID,
    fact.ProviderId
  ) || '—';
  const service = firstNonEmpty(
    fact.service_name,
    fact.Service_Name,
    fact.Service_ID,
    fact.service,
    fact.title
  ) || '—';
  const dist = Number(fact.Distance_km ?? fact.Distance_ ?? fact.distance_km ?? 0) || 0;
  const resp = Number(fact.Response_Time_Mins ?? fact.Response_ ?? fact.response ?? 0) || 0;
  const status = firstNonEmpty(fact.Final_Status, fact.Final_Stat, fact.status) || 'Unknown';
  const revenue = Number(fact.Revenue_Amount ?? fact.Revenue_ ?? fact.revenue ?? 0) || 0;
  const commission = Number(fact.Commission_Earned ?? fact.Commissi ?? fact.commission ?? 0) || 0;

  const parsed = parseServiceFactRowDate(fact);
  let dateLabel = '—';
  if (parsed && !isNaN(parsed.getTime())) {
    dateLabel = parsed.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } else if (fact.Date_Time != null && fact.Date_Time !== '') {
    dateLabel = String(fact.Date_Time);
  } else if (Number.isFinite(Number(fact.Year))) {
    dateLabel = fact.Month != null && fact.Month !== '' ? `${fact.Year} · ${fact.Month}` : String(fact.Year);
  }

  return {
    requestId,
    customer,
    provider,
    service,
    dateLabel,
    distanceKm: dist,
    responseMins: resp,
    status,
    revenue,
    commission
  };
}

function cryptoId() {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch {}
  return `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}

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
        setDragSession(t => t+1);
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
    setDragSession(s => s+1);
  };
  return (
    <div style={{ userSelect: 'none', touchAction: 'none', opacity: disabled ? 0.55 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--primary-dark)', fontWeight: 900, fontSize: 13 }}>Low: {lo} <span style={{ color: 'var(--gray-500)', fontWeight: 800 }}>{currency}</span></span>
        <span style={{ color: 'var(--gray-900)', fontWeight: 900, fontSize: 13 }}>High: {hi} <span style={{ color: 'var(--gray-500)', fontWeight: 800 }}>{currency}</span></span>
        <span style={{ color: 'var(--gray-500)', fontWeight: 800, fontSize: 11 }}>Span: {Math.max(0, hi - lo)}</span>
      </div>
      <div ref={trackRef} style={{ position: 'relative', height: 56, minHeight: 52, cursor: disabled ? 'not-allowed' : 'default' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 12, marginTop: -6, borderRadius: 999, background: 'rgba(148,163,184,0.14)', border: '1px solid rgba(148,163,184,0.22)' }} />
        <div style={{ position: 'absolute', left: `${pLo}%`, width: `${Math.max(0, pHi - pLo)}%`, top: '50%', height: 12, marginTop: -6, borderRadius: 999, background: 'linear-gradient(90deg, rgba(34,211,238,0.45), rgba(14,165,233,0.55))', pointerEvents: 'none' }} />
        <button type="button" disabled={disabled} onPointerDown={(e) => { if (disabled) return; e.preventDefault(); startDrag('low'); }} style={{ position: 'absolute', left: `${pLo}%`, top: '50%', width: 22, height: 22, marginLeft: -11, marginTop: -11, borderRadius: 999, border: '2px solid var(--primary)', background: 'var(--primary-dark)', cursor: disabled ? 'not-allowed' : 'grab', padding: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.35)' }} />
        <button type="button" disabled={disabled} onPointerDown={(e) => { if (disabled) return; e.preventDefault(); startDrag('high'); }} style={{ position: 'absolute', left: `${pHi}%`, top: '50%', width: 22, height: 22, marginLeft: -11, marginTop: -11, borderRadius: 999, border: '2px solid #38bdf8', background: 'var(--primary-dark)', cursor: disabled ? 'not-allowed' : 'grab', padding: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.35)' }} />
      </div>
    </div>
  );
}