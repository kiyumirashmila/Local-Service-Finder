const Category = require("../models/Category");
const Service = require("../models/Service");
const User = require("../models/User");
const MarketResearch = require("../models/MarketResearch");
const CatalogRequest = require("../models/CatalogRequest");

const DEFAULT_CATALOG = {
  Plumbing: ["Pipe leak repair", "Drain cleaning"],
  Electrical: ["Wiring installation", "Light fixture repair"],
  Cleaning: ["Home deep cleaning", "Sofa cleaning"],
  Carpentry: ["Furniture repair", "Door fitting"]
};

const DEFAULT_SERVICE_MARKET_RATES = [
  { category: "Plumbing", service: "Pipe leak repair", minRatePerHour: 2500, maxRatePerHour: 4500, currency: "LKR" },
  { category: "Plumbing", service: "Drain cleaning", minRatePerHour: 2000, maxRatePerHour: 4000, currency: "LKR" },
  { category: "Electrical", service: "Wiring installation", minRatePerHour: 3000, maxRatePerHour: 5500, currency: "LKR" },
  { category: "Electrical", service: "Light fixture repair", minRatePerHour: 1800, maxRatePerHour: 3500, currency: "LKR" },
  { category: "Cleaning", service: "Home deep cleaning", minRatePerHour: 1500, maxRatePerHour: 3200, currency: "LKR" },
  { category: "Cleaning", service: "Sofa cleaning", minRatePerHour: 2200, maxRatePerHour: 4800, currency: "LKR" },
  { category: "Carpentry", service: "Furniture repair", minRatePerHour: 2000, maxRatePerHour: 5000, currency: "LKR" },
  { category: "Carpentry", service: "Door fitting", minRatePerHour: 2500, maxRatePerHour: 6000, currency: "LKR" }
];

async function buildCatalogOptions({ publicMode = true } = {}) {
  const servicesByCategory = {};
  
  // 1. Fetch DB Categories map
  const categoryDocs = await Category.find({}).select("name active");
  const dbCategoriesMap = new Map();
  categoryDocs.forEach((c) => {
    dbCategoriesMap.set(String(c.name || "").trim().toLowerCase(), {
       name: String(c.name || "").trim(),
       active: c.active !== false
    });
  });

  const categoryAllowed = (name) => {
    const k = String(name || "").trim().toLowerCase();
    if (!k || !dbCategoriesMap.has(k)) return false;
    if (publicMode && !dbCategoriesMap.get(k).active) return false;
    return true;
  };

  const addPair = (rawCategory, rawService) => {
    const category = String(rawCategory || "").trim();
    const service = String(rawService || "").trim();
    if (!category || !categoryAllowed(category)) return;
    
    // Use the correctly cased name from DB
    const correctName = dbCategoriesMap.get(category.toLowerCase()).name;
    if (!servicesByCategory[correctName]) servicesByCategory[correctName] = new Set();
    if (service) servicesByCategory[correctName].add(service);
  };

  // Seed with all DB categories, so even empty categories are returned if allowed.
  dbCategoriesMap.forEach((meta) => {
     if (!publicMode || meta.active) {
         servicesByCategory[meta.name] = new Set();
     }
  });

  const serviceRowAllowed = (row) => {
    if (!publicMode) return true;
    if (row.active === false) return false;
    return true;
  };

  Object.entries(DEFAULT_CATALOG).forEach(([category, services]) => {
    if (!categoryAllowed(category)) return;
    (services || []).forEach((service) => addPair(category, service));
  });

  const serviceQuery = publicMode ? { $or: [{ active: { $ne: false } }, { active: { $exists: false } }] } : {};
  const serviceRows = await Service.find(serviceQuery).select("category title active");
  serviceRows.forEach((row) => {
    if (!serviceRowAllowed(row)) return;
    addPair(row.category, row.title);
  });

  const marketRatesByKey = {};
  DEFAULT_SERVICE_MARKET_RATES.forEach((row) => {
    if (!categoryAllowed(row.category)) return;
    const ck = String(row.category || "").trim().toLowerCase();
    const sk = String(row.service || "").trim().toLowerCase();
    if (!ck || !sk || !Number.isFinite(row.minRatePerHour) || !Number.isFinite(row.maxRatePerHour)) return;
    marketRatesByKey[`${ck}|||${sk}`] = {
      minRatePerHour: row.minRatePerHour,
      maxRatePerHour: row.maxRatePerHour,
      currency: String(row.currency || "LKR").trim() || "LKR",
      description: ""
    };
  });

  const marketRows = await MarketResearch.find({}).select(
    "category service minRatePerHour maxRatePerHour currency description"
  );
  marketRows.forEach((row) => {
    if (!categoryAllowed(row.category)) return;
    addPair(row.category, row.service);
    const ck = String(row.category || "").trim().toLowerCase();
    const sk = String(row.service || "").trim().toLowerCase();
    if (ck && sk && Number.isFinite(row.minRatePerHour) && Number.isFinite(row.maxRatePerHour)) {
      marketRatesByKey[`${ck}|||${sk}`] = {
        minRatePerHour: row.minRatePerHour,
        maxRatePerHour: row.maxRatePerHour,
        currency: String(row.currency || "LKR").trim() || "LKR",
        description: String(row.description || "").trim()
      };
    }
  });

  const completedRequests = await CatalogRequest.find({ status: "completed" }).select("category services");
  completedRequests.forEach((reqRow) => {
    const category = String(reqRow.category || "").trim();
    if (!categoryAllowed(category)) return;
    (reqRow.services || []).forEach((svc) => addPair(category, svc));
  });

  const supplierRows = await User.find({ role: "supplier", supplierApprovalStatus: "approved" }).select("category services serviceCategory serviceCategoryOther");
  supplierRows.forEach((row) => {
    const category = String(row.category || row.serviceCategoryOther || row.serviceCategory || "").trim();
    if (!categoryAllowed(category)) return;
    (row.services || []).forEach((svc) => addPair(category, svc));
  });

  const categories = Object.keys(servicesByCategory).sort((a, b) => a.localeCompare(b));
  const normalized = {};
  categories.forEach((c) => {
    normalized[c] = Array.from(servicesByCategory[c]).sort((a, b) => a.localeCompare(b));
  });

  return { categories, servicesByCategory: normalized, marketRatesByKey };
}

module.exports = { buildCatalogOptions, DEFAULT_CATALOG, DEFAULT_SERVICE_MARKET_RATES };
