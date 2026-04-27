const CATALOG_KEY = 'lsf_catalog_v1';
const REQUESTS_KEY = 'lsf_catalog_requests_v1';

const DEFAULT_CATALOG = {
  categories: ['Plumbing', 'Electrical', 'Cleaning', 'Carpentry'],
  servicesByCategory: {
    Plumbing: ['Pipe leak repair', 'Drain cleaning'],
    Electrical: ['Wiring installation', 'Light fixture repair'],
    Cleaning: ['Home deep cleaning', 'Sofa cleaning'],
    Carpentry: ['Furniture repair', 'Door fitting']
  }
};

const normalize = (value) => String(value || '').trim();

const dedupe = (items) => {
  const seen = new Set();
  const result = [];
  (items || []).forEach((item) => {
    const cleaned = normalize(item);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) return;
    seen.add(key);
    result.push(cleaned);
  });
  return result;
};

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const getCatalog = () => {
  const stored = readJson(CATALOG_KEY, null);
  if (!stored || typeof stored !== 'object') return DEFAULT_CATALOG;
  const categories = dedupe(stored.categories);
  const servicesByCategory = {};
  categories.forEach((category) => {
    servicesByCategory[category] = dedupe(stored.servicesByCategory?.[category] || []);
  });
  return { categories, servicesByCategory };
};

export const saveCatalog = (catalog) => {
  const categories = dedupe(catalog?.categories || []);
  const servicesByCategory = {};
  categories.forEach((category) => {
    servicesByCategory[category] = dedupe(catalog?.servicesByCategory?.[category] || []);
  });
  writeJson(CATALOG_KEY, { categories, servicesByCategory });
};

export const ensureCatalogDefaults = () => {
  const existing = readJson(CATALOG_KEY, null);
  if (!existing) writeJson(CATALOG_KEY, DEFAULT_CATALOG);
};

export const getCatalogRequests = () => readJson(REQUESTS_KEY, []);

export const addCatalogRequest = (payload) => {
  const current = getCatalogRequests();
  const next = [
    {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      category: normalize(payload?.category),
      service: normalize(payload?.service),
      supplierName: normalize(payload?.supplierName),
      createdAt: new Date().toISOString(),
      status: 'pending'
    },
    ...current
  ];
  writeJson(REQUESTS_KEY, next);
};

export const markCatalogRequestDone = (id) => {
  const current = getCatalogRequests();
  const next = current.map((r) => (r.id === id ? { ...r, status: 'done' } : r));
  writeJson(REQUESTS_KEY, next);
};
