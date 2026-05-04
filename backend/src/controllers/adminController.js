const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { sendMail } = require("../utils/mailer");
const CatalogRequest = require("../models/CatalogRequest");
const MarketResearch = require("../models/MarketResearch");
const Service = require("../models/Service");
const Category = require("../models/Category");
const GradingConfig = require("../models/GradingConfig");
const Booking = require("../models/Booking");
const Discount = require("../models/Discount");
const { recalcSupplierRatingStats } = require("./bookingController");
const { buildCatalogOptions } = require("../utils/buildCatalogOptions");
const { resolveCanonicalCategoryName, escapeRegex } = require("../utils/resolveCanonicalCategoryName");
const { DEFAULT_GRADING_TIERS } = require("../constants/gradingDefaults");

const normalizeKey = (v) => String(v || "").trim().toLowerCase();
const stableServicesKey = (services) =>
  (Array.isArray(services) ? services : [])
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase())
    .sort()
    .join("|");

const tierFromXp = (xp) => {
  const value = Number(xp) || 0;
  if (value <= 100) return "Bronze";
  if (value <= 250) return "Silver";
  if (value <= 500) return "Gold";
  return "Platinum";
};

const generatePassword = () => {
  // simple strong-ish password generator
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%^&*";
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  let out = "";
  for (let i = 0; i < 10; i++) out += pick(alphabet);
  out += pick(symbols);
  out += pick("0123456789");
  return out;
};

const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await User.find({ role: "supplier" })
      .sort({ createdAt: -1 })
      .select(
        "fullName email phone address city avatarUrl category services serviceOther serviceCategory serviceCategoryOther yearsOfExperience bio experienceCertificateUrl supplierApprovalStatus supplierGrading"
      );

    // Normalize keys: fullName is stored on `fullName` but some UIs expect `name`.
    const mapped = suppliers.map((s) => ({
      id: s._id,
      role: s.role,
      fullName: s.fullName,
      email: s.email,
      phone: s.phone,
      address: s.address,
      city: s.city,
      avatar: s.avatarUrl || "",
      avatarUrl: s.avatarUrl || "",
      serviceCategory: s.serviceCategory || "",
      serviceCategoryOther: s.serviceCategoryOther || "",
      category: s.category || s.serviceCategory || "",
      services: Array.isArray(s.services) ? s.services : [],
      serviceOther: s.serviceOther || "",
      yearsOfExperience: s.yearsOfExperience || 0,
      bio: s.bio || "",
      experienceCertificateUrl: s.experienceCertificateUrl || "",
      supplierApprovalStatus: s.supplierApprovalStatus || "pending",
      supplierGrading: s.supplierGrading || null
    }));

    return res.status(200).json({ suppliers: mapped });
  } catch (error) {
    return next(error);
  }
};

const approveSupplier = async (req, res, next) => {
  try {
    const supplier = await User.findById(req.params.id);
    if (!supplier || supplier.role !== "supplier") {
      return res.status(404).json({ message: "Supplier not found." });
    }
    supplier.supplierApprovalStatus = "approved";
    await supplier.save();
    return res.status(200).json({ message: "Supplier approved.", supplierApprovalStatus: supplier.supplierApprovalStatus });
  } catch (error) {
    return next(error);
  }
};

const rejectSupplier = async (req, res, next) => {
  try {
    const supplier = await User.findById(req.params.id);
    if (!supplier || supplier.role !== "supplier") {
      return res.status(404).json({ message: "Supplier not found." });
    }
    supplier.supplierApprovalStatus = "rejected";
    await supplier.save();
    return res.status(200).json({ message: "Supplier rejected.", supplierApprovalStatus: supplier.supplierApprovalStatus });
  } catch (error) {
    return next(error);
  }
};

const updateSupplierGrading = async (req, res, next) => {
  try {
    const { grading } = req.body;
    if (!grading || !["A", "B", "C"].includes(grading)) {
      return res.status(400).json({ message: "Invalid grading. Use A, B, or C." });
    }

    const supplier = await User.findById(req.params.id);
    if (!supplier || supplier.role !== "supplier") {
      return res.status(404).json({ message: "Supplier not found." });
    }

    supplier.supplierGrading = grading;
    await supplier.save();

    return res.status(200).json({ message: "Supplier grading updated.", supplierGrading: supplier.supplierGrading });
  } catch (error) {
    return next(error);
  }
};

const sendSupplierCredentials = async (req, res, next) => {
  try {
    const supplier = await User.findById(req.params.id).select("+passwordHash");
    if (!supplier || supplier.role !== "supplier") {
      return res.status(404).json({ message: "Supplier not found." });
    }

    const tempPassword = generatePassword();
    supplier.passwordHash = await bcrypt.hash(tempPassword, 10);
    supplier.supplierApprovalStatus = "approved";
    await supplier.save();

    await sendMail({
      to: supplier.email,
      subject: "Your supplier account credentials",
      text: `Your account has been approved.\n\nEmail: ${supplier.email}\nPassword: ${tempPassword}\n\nLogin and change it after login.`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
          <h2 style="margin:0 0 8px;">Your account is approved</h2>
          <p style="margin:0 0 14px;">Use the credentials below to login.</p>
          <div style="padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
            <div><b>Email:</b> ${supplier.email}</div>
            <div><b>Password:</b> ${tempPassword}</div>
          </div>
          <p style="margin:14px 0 0;color:#6b7280;">Please login and change your password after logging in.</p>
        </div>
      `
    });

    return res.status(200).json({ message: "Credentials sent and supplier approved." });
  } catch (error) {
    return next(error);
  }
};

const updateSupplierByAdmin = async (req, res, next) => {
  try {
    const supplier = await User.findById(req.params.id);
    if (!supplier || supplier.role !== "supplier") {
      return res.status(404).json({ message: "Supplier not found." });
    }

    const {
      fullName,
      email,
      phone,
      address,
      city,
      category,
      services,
      serviceCategory,
      serviceCategoryOther,
      serviceOther,
      yearsOfExperience,
      bio
    } = req.body;

    if (fullName !== undefined) supplier.fullName = String(fullName).trim();
    if (email !== undefined) supplier.email = String(email).toLowerCase().trim();
    if (phone !== undefined) supplier.phone = String(phone).trim();
    if (address !== undefined) supplier.address = String(address).trim();
    if (city !== undefined) supplier.city = String(city).trim();
    if (category !== undefined) supplier.category = String(category).trim();
    if (serviceCategory !== undefined) supplier.serviceCategory = String(serviceCategory).trim().toLowerCase();
    if (serviceCategoryOther !== undefined) supplier.serviceCategoryOther = String(serviceCategoryOther || "").trim();
    if (serviceOther !== undefined) supplier.serviceOther = String(serviceOther || "").trim();
    if (yearsOfExperience !== undefined) supplier.yearsOfExperience = Number(yearsOfExperience) || 0;
    if (bio !== undefined) supplier.bio = String(bio || "").trim();

    if (services !== undefined) {
      supplier.services = Array.isArray(services)
        ? services.map((s) => String(s).trim()).filter(Boolean)
        : [];
    }

    await supplier.save();
    return res.status(200).json({ message: "Supplier updated successfully." });
  } catch (error) {
    return next(error);
  }
};

const createCatalogRequest = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const category = String(payload.category || "").trim();
    const services = Array.isArray(payload.services) ? payload.services.map((s) => String(s).trim()).filter(Boolean) : [];
    const supplierId = payload.supplierId || null;
    const requestKey = `${normalizeKey(category)}::${stableServicesKey(services)}::${String(supplierId || "")}`;

    if (!category) return res.status(400).json({ message: "Category is required." });
    if (!services.length) return res.status(400).json({ message: "At least one service is required." });

    const existing = await CatalogRequest.findOne({
      requestKey,
      status: { $in: ["pending", "in_review"] }
    });
    if (existing) {
      return res.status(200).json({ message: "Request already sent for approval.", request: existing });
    }

    const doc = await CatalogRequest.create({
      supplierId,
      supplierName: String(payload.supplierName || "").trim(),
      category,
      categoryDescription: String(payload.categoryDescription || "").trim(),
      services,
      serviceDescription: String(payload.serviceDescription || "").trim(),
      minRatePerHour: payload.minRatePerHour ?? null,
      maxRatePerHour: payload.maxRatePerHour ?? null,
      currency: String(payload.currency || "LKR").trim(),
      requestedBy: String(req.auth?.adminEmail || "").trim(),
      requestKey
    });
    return res.status(201).json({ request: doc });
  } catch (error) {
    return next(error);
  }
};

const listCatalogRequests = async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status).trim() : "";
    const query = status ? { status } : {};
    const rows = await CatalogRequest.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ requests: rows });
  } catch (error) {
    return next(error);
  }
};

const countPendingCatalogRequests = async (req, res, next) => {
  try {
    const pendingCount = await CatalogRequest.countDocuments({ status: { $in: ["pending", "in_review"] } });
    return res.status(200).json({ pendingCount });
  } catch (error) {
    return next(error);
  }
};

const updateCatalogRequest = async (req, res, next) => {
  try {
    const request = await CatalogRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });

    const payload = req.body || {};
    if (payload.category !== undefined) request.category = String(payload.category || "").trim();
    if (payload.categoryDescription !== undefined) request.categoryDescription = String(payload.categoryDescription || "").trim();
    if (payload.services !== undefined) {
      request.services = Array.isArray(payload.services) ? payload.services.map((s) => String(s).trim()).filter(Boolean) : [];
    }
    if (payload.serviceDescription !== undefined) request.serviceDescription = String(payload.serviceDescription || "").trim();
    if (payload.serviceDescriptions !== undefined) {
      const rows = Array.isArray(payload.serviceDescriptions)
        ? payload.serviceDescriptions
            .map((d) => ({
              service: String(d?.service || "").trim(),
              description: String(d?.description || "").trim()
            }))
            .filter((d) => d.service)
        : [];
      request.serviceDescriptions = rows;
    }
    if (payload.minRatePerHour !== undefined) request.minRatePerHour = payload.minRatePerHour;
    if (payload.maxRatePerHour !== undefined) request.maxRatePerHour = payload.maxRatePerHour;
    if (payload.serviceRates !== undefined) {
      const rows = Array.isArray(payload.serviceRates)
        ? payload.serviceRates
            .map((r) => ({
              service: String(r?.service || "").trim(),
              minRatePerHour: r?.minRatePerHour != null ? Number(r.minRatePerHour) : null,
              maxRatePerHour: r?.maxRatePerHour != null ? Number(r.maxRatePerHour) : null
            }))
            .filter((r) => r.service)
        : [];
      request.serviceRates = rows;
      const mins = rows.map((r) => r.minRatePerHour).filter((n) => Number.isFinite(n) && n > 0);
      const maxs = rows.map((r) => r.maxRatePerHour).filter((n) => Number.isFinite(n) && n > 0);
      if (mins.length) request.minRatePerHour = Math.min(...mins);
      if (maxs.length) request.maxRatePerHour = Math.max(...maxs);
    }
    if (payload.currency !== undefined) request.currency = String(payload.currency || "LKR").trim();
    if (payload.status !== undefined) request.status = String(payload.status || "pending").trim();
    request.handledBy = String(req.auth?.adminEmail || "").trim();

    await request.save();
    return res.status(200).json({ request });
  } catch (error) {
    return next(error);
  }
};

const completeCatalogRequest = async (req, res, next) => {
  try {
    const request = await CatalogRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });

    request.status = "completed";
    request.handledBy = String(req.auth?.adminEmail || "").trim();
    await request.save();

    // ── Enforce Category table presence ──
    let catalogCategoryDoc = null;
    if (request.category) {
      const codeBase = request.category.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 8) || "CAT";
      try {
        catalogCategoryDoc = await Category.findOneAndUpdate(
          { name: new RegExp(`^${escapeRegex(request.category.trim())}$`, "i") },
          {
            $setOnInsert: {
              name: request.category.trim(),
              code: `${codeBase}-${Date.now().toString().slice(-4)}`,
              description: request.categoryDescription || "",
              active: true
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (catErr) {
        console.error("Failed to upsert Category:", catErr.message);
      }
    }

    let categoryCanonical = String(request.category || "").trim();
    if (categoryCanonical) {
      categoryCanonical = await resolveCanonicalCategoryName(categoryCanonical);
      if (catalogCategoryDoc?.name) {
        categoryCanonical = String(catalogCategoryDoc.name).trim();
      }
      if (categoryCanonical !== String(request.category || "").trim()) {
        request.category = categoryCanonical;
        await request.save();
      }
    }

    const services = Array.isArray(request.services) ? request.services : [];
    const rateRows = Array.isArray(request.serviceRates) ? request.serviceRates : [];
    const descRows = Array.isArray(request.serviceDescriptions) ? request.serviceDescriptions : [];
    for (const serviceName of services) {
      const match = rateRows.find((r) => String(r.service || "").trim() === String(serviceName).trim());
      const minRate = match
        ? Number(match.minRatePerHour || 0)
        : Number(request.minRatePerHour || 0);
      const maxRate = match
        ? Number(match.maxRatePerHour || 0)
        : Number(request.maxRatePerHour || 0);
      const descMatch = descRows.find((d) => String(d.service || "").trim() === String(serviceName).trim());
      const serviceDesc = descMatch
        ? String(descMatch.description || "").trim()
        : String(request.serviceDescription || "").trim();
      if (categoryCanonical && minRate > 0 && maxRate >= minRate) {
        await MarketResearch.findOneAndUpdate(
          { category: categoryCanonical, service: serviceName },
          {
            category: categoryCanonical,
            service: serviceName,
            description: serviceDesc || request.categoryDescription || "",
            minRatePerHour: minRate,
            maxRatePerHour: maxRate,
            currency: request.currency || "LKR",
            updatedBy: String(req.auth?.adminEmail || "").trim()
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        await Service.findOneAndUpdate(
          { category: categoryCanonical, title: serviceName },
          {
            title: serviceName,
            providerName: "System Catalog",
            category: categoryCanonical,
            categoryId: catalogCategoryDoc?._id || null,
            location: "All",
            contact: "N/A",
            description: serviceDesc || request.categoryDescription || "",
            active: true
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    // ── Link new category/services back to the supplier's account ──
    if (request.supplierId) {
      try {
        const supplier = await User.findById(request.supplierId);
        if (supplier && supplier.role === "supplier" && categoryCanonical) {
          // Update supplier's category to the official catalog category
          supplier.category = categoryCanonical;
          supplier.serviceCategory = categoryCanonical;
          supplier.serviceCategoryOther = "";

          // Merge new services into the supplier's existing services array
          const existingServices = Array.isArray(supplier.services) ? supplier.services : [];
          const mergedServices = Array.from(
            new Set([...existingServices, ...services].map((s) => String(s).trim()).filter(Boolean))
          );
          supplier.services = mergedServices;

          await supplier.save();
        }
      } catch (linkErr) {
        // Don't fail the whole request if linking fails — log and continue
        console.error("Failed to link catalog to supplier account:", linkErr.message);
      }
    }

    return res.status(200).json({ message: "Request completed.", request });
  } catch (error) {
    return next(error);
  }
};

const listMarketResearch = async (req, res, next) => {
  try {
    const rows = await MarketResearch.find({}).sort({ updatedAt: -1 });
    return res.status(200).json({ items: rows });
  } catch (error) {
    return next(error);
  }
};

const upsertMarketResearch = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const categoryRaw = String(payload.category || "").trim();
    const category = await resolveCanonicalCategoryName(categoryRaw);
    const service = String(payload.service || "").trim();
    const minRatePerHour = Number(payload.minRatePerHour);
    const maxRatePerHour = Number(payload.maxRatePerHour);

    if (!category || !service) {
      return res.status(400).json({ message: "Category and service are required." });
    }
    if (Number.isNaN(minRatePerHour) || Number.isNaN(maxRatePerHour) || minRatePerHour <= 0 || maxRatePerHour < minRatePerHour) {
      return res.status(400).json({ message: "Invalid value range." });
    }

    const row = await MarketResearch.findOneAndUpdate(
      { category, service },
      {
        category,
        service,
        description: String(payload.description || "").trim(),
        minRatePerHour,
        maxRatePerHour,
        currency: String(payload.currency || "LKR").trim(),
        updatedBy: String(req.auth?.adminEmail || "").trim()
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ item: row });
  } catch (error) {
    return next(error);
  }
};

const deleteMarketResearch = async (req, res, next) => {
  try {
    const row = await MarketResearch.findById(req.params.id);
    if (!row) return res.status(404).json({ message: "Market research item not found." });
    await MarketResearch.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Market research item deleted." });
  } catch (error) {
    return next(error);
  }
};

const getAdminCatalogOptions = async (req, res, next) => {
  try {
    const data = await buildCatalogOptions({ publicMode: false });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const listAdminServices = async (req, res, next) => {
  try {
    const { search = "", category = "" } = req.query;
    const filters = {};
    const categoryQ = String(category || "").trim();
    let categoryClause = null;
    if (categoryQ) {
      const catMatch = await Category.findOne({
        name: new RegExp(`^${escapeRegex(categoryQ)}$`, "i")
      })
        .select("_id")
        .lean();
      if (catMatch?._id) {
        categoryClause = {
          $or: [
            { category: new RegExp(categoryQ, "i") },
            { categoryId: catMatch._id }
          ]
        };
      } else {
        categoryClause = { category: new RegExp(categoryQ, "i") };
      }
    }
    const searchQ = String(search || "").trim();
    let searchClause = null;
    if (searchQ) {
      searchClause = {
        $or: [
          { title: new RegExp(searchQ, "i") },
          { providerName: new RegExp(searchQ, "i") },
          { description: new RegExp(searchQ, "i") }
        ]
      };
    }
    if (categoryClause && searchClause) filters.$and = [categoryClause, searchClause];
    else if (categoryClause) Object.assign(filters, categoryClause);
    else if (searchClause) Object.assign(filters, searchClause);
    const categoryRows = await Category.find({}).select("name _id").lean();
    const canonicalByLower = new Map(
      categoryRows.map((c) => {
        const n = String(c.name || "").trim();
        return [n.toLowerCase(), n];
      })
    );
    const nameByCategoryId = new Map(
      categoryRows.map((c) => [String(c._id), String(c.name || "").trim()])
    );

    const services = await Service.find(filters).sort({ createdAt: -1 });
    const payload = services.map((doc) => {
      const s = doc.toObject();
      if (s.categoryId) {
        const byId = nameByCategoryId.get(String(s.categoryId));
        if (byId) s.category = byId;
      }
      const raw = String(s.category || "").trim();
      if (raw) {
        const canon = canonicalByLower.get(raw.toLowerCase());
        if (canon) s.category = canon;
      }
      return s;
    });
    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
};

/**
 * Set categoryId + canonical category name on every Service whose category string matches a Category (case-insensitive).
 */
const backfillServiceCategoryLinks = async (req, res, next) => {
  try {
    const categoryRows = await Category.find({}).select("_id name").lean();
    const byLower = new Map();
    for (const c of categoryRows) {
      const n = String(c.name || "").trim();
      if (!n) continue;
      byLower.set(n.toLowerCase(), { _id: c._id, name: n });
    }

    const services = await Service.find({}).select("_id category categoryId").lean();
    const ops = [];
    let skippedNoCategory = 0;
    let skippedNoMatch = 0;

    for (const s of services) {
      const raw = String(s.category || "").trim();
      if (!raw) {
        skippedNoCategory += 1;
        continue;
      }
      const cat = byLower.get(raw.toLowerCase());
      if (!cat) {
        skippedNoMatch += 1;
        continue;
      }
      const idOk = s.categoryId && String(s.categoryId) === String(cat._id);
      const nameOk = raw === cat.name;
      if (idOk && nameOk) continue;
      ops.push({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { categoryId: cat._id, category: cat.name } }
        }
      });
    }

    if (ops.length) {
      await Service.bulkWrite(ops, { ordered: false });
    }

    return res.status(200).json({
      updated: ops.length,
      examined: services.length,
      skippedNoCategory,
      skippedNoMatch
    });
  } catch (error) {
    return next(error);
  }
};

const putGradingConfig = async (req, res, next) => {
  try {
    const body = req.body || {};
    const shape = (key) => {
      const fb = DEFAULT_GRADING_TIERS[key];
      return {
        minYears: Number(body[key]?.minYears ?? fb.minYears),
        stars: Number(body[key]?.stars ?? fb.stars),
        priorityBoost: Number(body[key]?.priorityBoost ?? fb.priorityBoost),
        priceRangeMin: Number(body[key]?.priceRangeMin ?? fb.priceRangeMin ?? 0),
        priceRangeMax: Number(body[key]?.priceRangeMax ?? fb.priceRangeMax ?? 100),
        label: String(body[key]?.label || fb.label).trim() || fb.label
      };
    };
    const doc = await GradingConfig.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          A: shape("A"),
          B: shape("B"),
          C: shape("C")
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({
      A: doc.A,
      B: doc.B,
      C: doc.C
    });
  } catch (error) {
    return next(error);
  }
};

const listAdminBookings = async (req, res, next) => {
  try {
    const rows = await Booking.find({})
      .sort({ createdAt: -1 })
      .populate("customerId", "fullName")
      .populate("supplierId", "fullName");

    const bookings = rows.map((b) => ({
      id: b._id,
      customer: b.customerId?.fullName || "Customer",
      supplier: b.supplierId?.fullName || "Supplier",
      date: b.requestedDate || "",
      time: b.requestedTimeLabel || "",
      amount: typeof b.amount === "number" ? b.amount : 0,
      currency: b.currency || "LKR",
      status: b.status || "pending"
    }));

    return res.status(200).json({ bookings });
  } catch (error) {
    return next(error);
  }
};

const listAdminReviews = async (req, res, next) => {
  try {
    const rows = await Booking.find({
      "review.rating": { $exists: true, $ne: null }
    })
      .sort({ "review.createdAt": -1 })
      .populate("customerId", "fullName")
      .populate("supplierId", "fullName serviceCategory");

    const reviews = rows.map((b) => ({
      bookingId: b._id,
      customerName: b.customerId?.fullName || "Customer",
      supplierName: b.supplierId?.fullName || "Supplier",
      serviceName: b.supplierId?.serviceCategory || "",
      rating: Number(b.review?.rating || 0),
      feedback: b.review?.feedback || "",
      createdAt: b.review?.createdAt || null,
      updatedAt: b.review?.updatedAt || null,
      bookingStatus: b.status || "",
      completedAt: b.completedAt || null,
      requestedDate: b.requestedDate || ""
    }));

    const totalReviews = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const averageRating = totalReviews ? Math.round((sum / totalReviews) * 100) / 100 : 0;

    return res.status(200).json({
      summary: { totalReviews, averageRating },
      reviews
    });
  } catch (error) {
    return next(error);
  }
};

const deleteAdminReview = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).select("supplierId review reviewBlockedByAdmin");
    if (!booking || !booking.review?.rating) {
      return res.status(404).json({ message: "Review not found for this booking." });
    }
    const supplierId = booking.supplierId;
    // Admin delete permanently blocks re-submission for this booking.
    await Booking.updateOne(
      { _id: booking._id },
      { $unset: { review: 1 }, $set: { reviewBlockedByAdmin: true } }
    );
    await recalcSupplierRatingStats(supplierId);
    return res.status(200).json({ message: "Review removed. New review submission is blocked for this booking." });
  } catch (error) {
    return next(error);
  }
};

const listComplaints = async (req, res, next) => {
  try {
    const rows = await Booking.find({ "complaint.submittedAt": { $exists: true } })
      .sort({ "complaint.submittedAt": -1 })
      .populate("customerId", "fullName")
      .populate("supplierId", "fullName warningCount isBanned averageRating totalRatings");

    const complaints = rows.map((b) => ({
      bookingId: b._id,
      customerName: b.customerId?.fullName || "Customer",
      supplierName: b.supplierId?.fullName || "Supplier",
      supplierId: b.supplierId?._id || null,
      supplierWarningCount: Number(b.supplierId?.warningCount || 0),
      supplierIsBanned: Boolean(b.supplierId?.isBanned),
      supplierAverageRating: Number(b.supplierId?.averageRating || 0),
      supplierTotalRatings: Number(b.supplierId?.totalRatings || 0),
      submittedAt: b.complaint?.submittedAt || null,
      status: b.complaint?.status || "pending",
      category: b.complaint?.category || "",
      description: b.complaint?.description || "",
      evidenceUrl: b.complaint?.evidenceUrl || "",
      serviceName: b.supplierId?.serviceCategory || "",
      supplierNotifiedAt: b.complaint?.supplierNotifiedAt || null,
      supplierResponse: b.complaint?.supplierResponse || "",
      supplierRespondedAt: b.complaint?.supplierRespondedAt || null,
      adminDecision: b.complaint?.adminDecision || "none",
      adminDecidedAt: b.complaint?.adminDecidedAt || null
    }));

    const totalComplaints = complaints.length;
    const pendingComplaints = complaints.filter((c) => c.status === "pending").length;
    const resolvedComplaints = complaints.filter((c) => c.status === "resolved").length;

    return res.status(200).json({
      summary: { totalComplaints, pendingComplaints, resolvedComplaints },
      complaints
    });
  } catch (error) {
    return next(error);
  }
};

const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!["pending", "resolved"].includes(String(status || ""))) {
      return res.status(400).json({ message: "Invalid complaint status." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking || !booking.complaint?.submittedAt) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    booking.complaint.status = status;
    await booking.save();
    return res.status(200).json({ message: "Complaint status updated.", status: booking.complaint.status });
  } catch (error) {
    return next(error);
  }
};

const notifyComplaintSupplier = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("customerId", "fullName")
      .populate("supplierId", "fullName email");
    if (!booking || !booking.complaint?.submittedAt) {
      return res.status(404).json({ message: "Complaint not found." });
    }
    const supplierEmail = String(booking.supplierId?.email || "").trim();
    if (!supplierEmail) {
      return res.status(400).json({ message: "Supplier email is missing." });
    }

    await sendMail({
      to: supplierEmail,
      subject: "Complaint submitted for one of your bookings",
      text:
        `A complaint has been submitted for booking ${booking._id}.\n` +
        `Category: ${booking.complaint.category || "-"}\n` +
        `Description: ${booking.complaint.description || "-"}\n` +
        `Customer: ${booking.customerId?.fullName || "Customer"}\n`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
          <h2 style="margin:0 0 8px;">Complaint Notice</h2>
          <p style="margin:0 0 12px;">A complaint has been submitted for one of your completed bookings.</p>
          <div style="padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
            <div><b>Booking ID:</b> ${booking._id}</div>
            <div><b>Customer:</b> ${booking.customerId?.fullName || "Customer"}</div>
            <div><b>Category:</b> ${booking.complaint.category || "-"}</div>
            <div><b>Description:</b> ${booking.complaint.description || "-"}</div>
          </div>
        </div>
      `
    });

    booking.complaint.supplierNotifiedAt = new Date();
    await booking.save();

    return res.status(200).json({
      message: "Supplier notified successfully.",
      supplierNotifiedAt: booking.complaint.supplierNotifiedAt
    });
  } catch (error) {
    return next(error);
  }
};

const decideComplaint = async (req, res, next) => {
  try {
    const { decision } = req.body || {};
    const normalized = String(decision || "").trim().toLowerCase();
    if (!["warning", "resolved"].includes(normalized)) {
      return res.status(400).json({ message: "Invalid decision. Use warning or resolved." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking || !booking.complaint?.submittedAt) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    const supplierObjectId = booking.supplierId;
    if (supplierObjectId) {
      const supplier = await User.findById(supplierObjectId);
      if (supplier) {
        const currentWarnings = Number(supplier.warningCount || 0);
        const isThresholdBanned = supplier.isBanned && currentWarnings >= 5;

        if (normalized === "warning" && isThresholdBanned) {
          return res.status(400).json({
            message: "Supplier is already banned after 5 or more warnings."
          });
        }

        const previousDecision = String(booking.complaint.adminDecision || "none");
        if (normalized === "warning" && previousDecision !== "warning") {
          supplier.warningCount = currentWarnings + 1;
          supplier.averageRating = Math.max(0, Number((Number(supplier.averageRating || 0) - 0.2).toFixed(2)));
          supplier.xp = Math.max(0, Number(supplier.xp || 0) - 20);
          supplier.tierLevel = tierFromXp(supplier.xp);

          if (supplier.warningCount >= 5) {
            supplier.isBanned = true;
            supplier.supplierApprovalStatus = "rejected";
          }
          await supplier.save();
        }
      }
    }

    booking.complaint.adminDecision = normalized;
    booking.complaint.adminDecidedAt = new Date();
    booking.complaint.status = normalized === "resolved" ? "resolved" : "pending";

    await booking.save();

    let supplierPayload = {};
    if (supplierObjectId) {
      const fresh = await User.findById(supplierObjectId).select("warningCount isBanned");
      if (fresh) {
        supplierPayload = {
          supplierId: fresh._id,
          supplierWarningCount: Number(fresh.warningCount || 0),
          supplierIsBanned: Boolean(fresh.isBanned)
        };
      }
    }

    return res.status(200).json({
      message: "Complaint decision applied.",
      complaint: booking.complaint,
      ...supplierPayload
    });
  } catch (error) {
    return next(error);
  }
};

const deleteComplaint = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || !booking.complaint?.submittedAt) {
      return res.status(404).json({ message: "Complaint not found." });
    }
    // Admin delete permanently blocks re-submission for this booking.
    await Booking.updateOne(
      { _id: booking._id },
      { $unset: { complaint: 1 }, $set: { complaintBlockedByAdmin: true } }
    );
    return res.status(200).json({ message: "Complaint deleted. New complaint submission is blocked for this booking." });
  } catch (error) {
    return next(error);
  }
};

const recoverSupplierProfile = async (req, res, next) => {
  try {
    const supplier = await User.findById(req.params.id);
    if (!supplier || supplier.role !== "supplier") {
      return res.status(404).json({ message: "Supplier not found." });
    }
    supplier.isBanned = false;
    supplier.warningCount = 0;
    if (supplier.supplierApprovalStatus !== "approved") {
      supplier.supplierApprovalStatus = "approved";
    }
    await supplier.save();
    return res.status(200).json({ message: "Supplier profile recovered successfully." });
  } catch (error) {
    return next(error);
  }
};

const createDiscount = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const code = String(payload.code || "").trim().toUpperCase();
    const type = String(payload.type || "percentage").trim().toLowerCase();
    const value = Number(payload.value);
    const maxUses = Number(payload.maxUses || 0);
    const expiryDate = payload.expiryDate ? new Date(payload.expiryDate) : null;

    if (!code) return res.status(400).json({ message: "Discount code is required." });
    if (!["percentage", "fixed"].includes(type)) {
      return res.status(400).json({ message: "Discount type must be percentage or fixed." });
    }
    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ message: "Discount value must be greater than 0." });
    }
    if (type === "percentage" && value > 100) {
      return res.status(400).json({ message: "Percentage discount cannot exceed 100." });
    }
    if (!Number.isFinite(maxUses) || maxUses < 0) {
      return res.status(400).json({ message: "Max uses cannot be negative." });
    }
    if (!expiryDate || Number.isNaN(expiryDate.getTime())) {
      return res.status(400).json({ message: "A valid expiry date is required." });
    }

    const existing = await Discount.findOne({ code });
    if (existing) {
      return res.status(409).json({ message: "Discount code already exists." });
    }

    const doc = await Discount.create({
      code,
      type,
      value,
      maxUses: Math.floor(maxUses),
      expiryDate,
      usesCount: 0,
      isActive: true
    });
    return res.status(201).json({ discount: doc });
  } catch (error) {
    return next(error);
  }
};

const listDiscounts = async (req, res, next) => {
  try {
    const rows = await Discount.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ discounts: rows });
  } catch (error) {
    return next(error);
  }
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_TO_NUM = (() => {
  const m = {};
  MONTH_SHORT.forEach((x, i) => { m[x] = i + 1; m[x.toLowerCase()] = i + 1; });
  MONTH_LONG.forEach((x, i) => { m[x] = i + 1; m[x.toLowerCase()] = i + 1; });
  for (let i = 1; i <= 12; i++) {
    m[String(i)] = i;
    m[String(i).padStart(2, "0")] = i;
  }
  return m;
})();

function normalizeFactRow(fact) {
  const revenue = Number(fact.Revenue_Amount ?? fact.Revenue_ ?? fact.revenue ?? 0) || 0;
  const response = Number(fact.Response_Time_Mins ?? fact.Response_ ?? fact.response ?? 0) || 0;
  const status = String(fact.Final_Status ?? fact.Final_Stat ?? "").trim() || "Unknown";
  const label =
    String(fact.service_name ?? fact.Service_Name ?? fact.Service_ID ?? fact.service ?? "").trim() ||
    "Unknown";
  const category = String(fact.category ?? fact.Category ?? "").trim();
  const district = String(fact.district ?? fact.District ?? "").trim();
  const ageGroup = String(fact.age_group ?? fact.ageGroup ?? "").trim();
  return { revenue, response, status, label, category, district, ageGroup };
}

function parseFactRowDate(fact) {
  if (fact.Date_Time != null && fact.Date_Time !== "") {
    const d = new Date(fact.Date_Time);
    if (!isNaN(d.getTime())) return d;
  }
  const y = Number(fact.Year);
  if (!Number.isFinite(y)) return null;
  const key = fact.Month;
  if (typeof key === "number" && key >= 1 && key <= 12) {
    return new Date(y, key - 1, 15);
  }
  if (typeof key === "string") {
    const trimmed = key.trim();
    const num = MONTH_TO_NUM[trimmed] ?? MONTH_TO_NUM[trimmed.slice(0, 3).toLowerCase()] ?? MONTH_TO_NUM[trimmed.toLowerCase()];
    if (num) return new Date(y, num - 1, 15);
  }
  return null;
}

function buildDemandTimeClauses(yn, mn) {
  if (!Number.isFinite(yn)) return [];
  if (!Number.isFinite(mn) || mn < 1 || mn > 12) {
    return [{ Year: yn }];
  }
  const or = [
    { Month: MONTH_SHORT[mn - 1] },
    { Month: MONTH_LONG[mn - 1] },
    { Month: mn },
    { Month: String(mn) },
    { Month: String(mn).padStart(2, "0") }
  ];
  return [{ Year: yn }, { $or: or }];
}

function buildDemandQuery(yn, mn, districtRaw, categoryRaw) {
  const clauses = [...buildDemandTimeClauses(yn, mn)];
  const d = districtRaw != null ? String(districtRaw).trim() : "";
  const c = categoryRaw != null ? String(categoryRaw).trim() : "";
  if (d) clauses.push({ district: d });
  if (c) clauses.push({ category: c });
  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

function mapFacetsToMonths(distinctMonths) {
  const nums = new Set();
  (distinctMonths || []).forEach((m) => {
    if (m == null) return;
    if (typeof m === "number" && m >= 1 && m <= 12) nums.add(m);
    else {
      const k = String(m).trim();
      const n = MONTH_TO_NUM[k] ?? MONTH_TO_NUM[k.slice(0, 3).toLowerCase()] ?? MONTH_TO_NUM[k.toLowerCase()];
      if (n) nums.add(n);
    }
  });
  return Array.from(nums)
    .sort((a, b) => a - b)
    .map((n) => String(n).padStart(2, "0"));
}

function topSlices(obj, n, labelKey = "name", valueKey = "requests") {
  return Object.entries(obj)
    .filter(([k]) => k && String(k).trim())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, v]) => ({ [labelKey]: name, [valueKey]: v }));
}

/**
 * Fetch raw ServiceRequestFact records with optional filtering
 * Query params: year, month, district, category, limit, skip, sortBy, status
 */
const getServiceRequestFacts = async (req, res, next) => {
  try {
    const ServiceRequestFact = require("../models/ServiceRequestFact");
    const {
      year,
      month,
      district: districtQ,
      category: categoryQ,
      limit = 100,
      skip = 0,
      sortBy = "Date_Time",
      status
    } = req.query;

    const yn = year != null && String(year).trim() !== "" ? parseInt(String(year).trim(), 10) : NaN;
    const mn = month != null && String(month).trim() !== "" ? parseInt(String(month).trim(), 10) : NaN;

    let query = buildDemandQuery(yn, mn, districtQ, categoryQ);

    if (status && String(status).trim() !== "") {
      const s = String(status).trim();
      const statusClause = { $or: [{ Final_Status: s }, { Final_Stat: s }] };
      if (Object.keys(query).length === 0) query = statusClause;
      else if (query.$and) query.$and.push(statusClause);
      else query = { $and: [query, statusClause] };
    }

    const [total, facts] = await Promise.all([
      ServiceRequestFact.countDocuments(query),
      ServiceRequestFact.find(query)
        .sort({ [sortBy]: -1 })
        .skip(Number(skip) || 0)
        .limit(Number(limit) || 100)
        .lean()
    ]);

    return res.status(200).json({
      facts,
      total,
      limit: Number(limit) || 100,
      skip: Number(skip) || 0
    });
  } catch (error) {
    return next(error);
  }
};

const getDemandPredictionData = async (req, res, next) => {
  try {
    const ServiceRequestFact = require("../models/ServiceRequestFact");
    const { year, month, district: districtQ, category: categoryQ } = req.query;

    const yn = year != null && String(year).trim() !== "" ? parseInt(String(year).trim(), 10) : NaN;
    const mn = month != null && String(month).trim() !== "" ? parseInt(String(month).trim(), 10) : NaN;

    const filterQuery = buildDemandQuery(yn, mn, districtQ, categoryQ);
    const facetClauses = [...buildDemandTimeClauses(yn, mn)];
    const facetFilter =
      facetClauses.length === 0 ? {} : facetClauses.length === 1 ? facetClauses[0] : { $and: facetClauses };

    const yearsFacetAgg = ServiceRequestFact.distinct("Year", {});
    const districtsFacetAgg = ServiceRequestFact.distinct("district", facetFilter);
    const categoriesFacetAgg = ServiceRequestFact.distinct("category", facetFilter);

    let monthsFacetAgg = Promise.resolve([]);
    if (Number.isFinite(yn)) {
      monthsFacetAgg = ServiceRequestFact.distinct("Month", facetClauses.length <= 1 ? (facetClauses[0] || {}) : { $and: facetClauses });
    }

    const [facts, distinctYears, distinctMonths, districtOptions, categoryOptions] = await Promise.all([
      ServiceRequestFact.find(filterQuery).lean(),
      yearsFacetAgg,
      monthsFacetAgg,
      districtsFacetAgg,
      categoriesFacetAgg
    ]);

    const years = distinctYears
      .filter((y) => y != null && String(y).trim() !== "")
      .sort((a, b) => Number(b) - Number(a))
      .map((y) => String(Math.trunc(Number(y))));

    const months = mapFacetsToMonths(distinctMonths);

    const demandByDate = {};
    const serviceMetrics = {};
    const statusCounts = {};
    const categoryTotals = {};
    const districtTotals = {};
    const ageGroupTotals = {};
    let totalRevenue = 0;
    let totalRequests = 0;

    facts.forEach((fact) => {
      const parsedDate = parseFactRowDate(fact);
      if (!parsedDate || isNaN(parsedDate.getTime())) return;

      const nf = normalizeFactRow(fact);
      const date = parsedDate.toISOString().slice(0, 10);
      const factYear = parsedDate.getFullYear().toString();
      const factMonth = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const dayOfWeek = parsedDate.getDay();

      if (!demandByDate[date]) {
        demandByDate[date] = {
          requests: 0,
          revenue: 0,
          completed: 0,
          pending: 0,
          responseTimeSum: 0,
          responseTimeCount: 0,
          year: factYear,
          month: factMonth,
          dayOfWeek
        };
      }
      const dRow = demandByDate[date];
      dRow.requests += 1;
      dRow.revenue += nf.revenue;
      if (nf.response > 0) {
        dRow.responseTimeSum += nf.response;
        dRow.responseTimeCount += 1;
      }
      const stKey = nf.status;
      if (stKey.toLowerCase() === "completed") dRow.completed += 1;
      else dRow.pending += 1;

      const svcKey = nf.label;
      if (!serviceMetrics[svcKey]) serviceMetrics[svcKey] = { requests: 0, revenue: 0, completed: 0 };
      serviceMetrics[svcKey].requests += 1;
      serviceMetrics[svcKey].revenue += nf.revenue;
      if (stKey.toLowerCase() === "completed") serviceMetrics[svcKey].completed += 1;

      statusCounts[stKey] = (statusCounts[stKey] || 0) + 1;
      totalRevenue += nf.revenue;
      totalRequests += 1;

      const catK = nf.category || "Uncategorized";
      categoryTotals[catK] = (categoryTotals[catK] || 0) + 1;
      const distK = nf.district || "Unknown district";
      districtTotals[distK] = (districtTotals[distK] || 0) + 1;
      const ageK = nf.ageGroup || "";
      if (ageK) ageGroupTotals[ageK] = (ageGroupTotals[ageK] || 0) + 1;
    });

    const data = Object.entries(demandByDate)
      .map(([date, d]) => ({
        date, ...d,
        avgResponseTime: d.responseTimeCount > 0 ? Math.round(d.responseTimeSum / d.responseTimeCount) : 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // ── Revenue + response trend (daily) ──
    const revenueTrend = data.map(d => ({
      date: d.date, revenue: Math.round(d.revenue), requests: d.requests
    }));
    const responseTrend = data
      .filter(d => d.avgResponseTime > 0)
      .map(d => ({ date: d.date, avgResponseTime: d.avgResponseTime }));

    // ── Weekday demand index ──
    const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayBuckets = {};
    data.forEach(d => {
      const dw = d.dayOfWeek;
      if (!dayBuckets[dw]) dayBuckets[dw] = { reqSum: 0, revSum: 0, count: 0 };
      dayBuckets[dw].reqSum += d.requests;
      dayBuckets[dw].revSum += d.revenue;
      dayBuckets[dw].count += 1;
    });
    const weekdayIndex = Object.entries(dayBuckets).map(([dw, b]) => ({
      day: DAYS[dw],
      avgRequests: Math.round(b.reqSum / b.count),
      avgRevenue: Math.round(b.revSum / b.count)
    })).sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));

    // ── Monthly volume ──
    const monthlyVolumesMap = {};
    data.forEach(d => {
      const ym = `${d.year}-${d.month}`;
      if (!monthlyVolumesMap[ym]) monthlyVolumesMap[ym] = { requests: 0, revenue: 0 };
      monthlyVolumesMap[ym].requests += d.requests;
      monthlyVolumesMap[ym].revenue += d.revenue;
    });
    const monthlyVolumes = Object.entries(monthlyVolumesMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, v]) => ({ yearMonth: ym, requests: v.requests, revenue: Math.round(v.revenue) }));

    // ── Status distribution array for donut chart ──
    const statusDistributionArr = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // ── 90-day Holt-Winters forecast with confidence bands ──
    const forecastSeries = computeHoltWintersForecast(data, 90);

    const analytics = calculateAdvancedAnalytics(data, serviceMetrics, statusCounts, totalRevenue, totalRequests);

    let growthVsPrevMonth = null;
    if (monthlyVolumes.length >= 2) {
      const prev = monthlyVolumes[monthlyVolumes.length - 2];
      const last = monthlyVolumes[monthlyVolumes.length - 1];
      growthVsPrevMonth =
        prev.requests > 0
          ? Math.round(((last.requests - prev.requests) / prev.requests) * 100)
          : null;
    }

    const demandByCategory = topSlices(categoryTotals, 14);
    const demandByDistrict = topSlices(districtTotals, 14);
    const demandByAgeGroup = topSlices(ageGroupTotals, 8);
    const districts = (districtOptions || [])
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    const categories = (categoryOptions || [])
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    const forecastArr = forecastSeries.forecast || [];
    const forecastSummary = {
      next90Total: forecastArr.reduce((s, x) => s + (Number(x.value) || 0), 0),
      peakDate: null,
      peakValue: 0,
      avgDailyNext30: 0
    };
    if (forecastArr.length) {
      const peak = forecastArr.reduce((a, b) =>
        (Number(b.value) || 0) > (Number(a.value) || 0) ? b : a,
        forecastArr[0]
      );
      forecastSummary.peakDate = peak.date;
      forecastSummary.peakValue = Number(peak.value) || 0;
      const first30 = forecastArr.slice(0, 30);
      forecastSummary.avgDailyNext30 = first30.length
        ? Math.round(first30.reduce((s, x) => s + (Number(x.value) || 0), 0) / first30.length)
        : 0;
    }

    return res.status(200).json({
      source: "service_requests_fact",
      data,
      years,
      months,
      districts,
      categories,
      demandByCategory,
      demandByDistrict,
      demandByAgeGroup,
      totalRecords: facts.length,
      growthVsPrevMonth,
      forecastSummary,
      analytics,
      revenueTrend,
      responseTrend,
      weekdayIndex,
      monthlyVolumes,
      statusDistributionArr,
      forecastSeries
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Holt-Winters double-exponential smoothing + 90-day forecast
 * Returns { history:[{date,requests}], forecast:[{date,value,upper,lower}] }
 */
function computeHoltWintersForecast(data, periods = 90, alpha = 0.3, beta = 0.15) {
  if (data.length < 3) return { history: [], forecast: [] };
  const requests = data.map(d => d.requests);
  let level = requests[0];
  let trend = (requests[Math.min(6, requests.length - 1)] - requests[0]) / Math.min(6, requests.length - 1) * 0.1;
  const residuals = [];
  for (let i = 1; i < requests.length; i++) {
    const fitted = level + trend;
    residuals.push(requests[i] - fitted);
    const prevLevel = level;
    level = alpha * requests[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  const variance = residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, residuals.length);
  const sigma = Math.sqrt(variance);
  const lastDate = new Date(data[data.length - 1].date);
  const forecast = [];
  for (let i = 1; i <= periods; i++) {
    const next = new Date(lastDate);
    next.setDate(lastDate.getDate() + i);
    const value = Math.max(0, Math.round(level + trend * i * 0.8));
    const ci = Math.round(sigma * Math.sqrt(i) * 0.5);
    forecast.push({
      date: next.toISOString().slice(0, 10),
      value,
      upper: value + ci,
      lower: Math.max(0, value - ci)
    });
  }
  const history = data.slice(-90).map(d => ({ date: d.date, requests: d.requests }));
  return { history, forecast };
}

function calculateAdvancedAnalytics(data, serviceMetrics, statusCounts, totalRevenue, totalRequests) {
  if (data.length === 0) {
    return {
      summary: {},
      trends: [],
      predictions: [],
      suggestions: [],
      topServices: [],
      peakDays: [],
      statusDistribution: {}
    };
  }

  // Summary Metrics
  const summary = {
    totalRequests,
    totalRevenue: Math.round(totalRevenue),
    avgDailyRequests: Math.round(totalRequests / data.length),
    avgDailyRevenue: Math.round(totalRevenue / data.length),
    completionRate: Math.round((data.reduce((s, d) => s + d.completed, 0) / totalRequests) * 100),
    avgResponseTime: Math.round(data.reduce((s, d) => s + d.avgResponseTime, 0) / data.length)
  };

  // Trend Analysis
  const trends = analyzeTrends(data);

  // Demand Predictions
  const predictions = makePredictions(data);

  // Actionable Suggestions
  const suggestions = generateSuggestions(data, summary, trends, serviceMetrics);

  // Top Services
  const topServices = Object.entries(serviceMetrics)
    .sort((a, b) => b[1].requests - a[1].requests)
    .slice(0, 10)
    .map(([serviceId, metrics]) => ({
      serviceId,
      requests: metrics.requests,
      revenue: Math.round(metrics.revenue),
      completionRate: metrics.requests > 0 ? Math.round((metrics.completed / metrics.requests) * 100) : 0
    }));

  // Peak analysis by day of week
  const dayMetrics = {};
  data.forEach(d => {
    if (!dayMetrics[d.dayOfWeek]) {
      dayMetrics[d.dayOfWeek] = { requests: 0, count: 0 };
    }
    dayMetrics[d.dayOfWeek].requests += d.requests;
    dayMetrics[d.dayOfWeek].count += 1;
  });

  const peakDays = Object.entries(dayMetrics)
    .map(([day, metrics]) => ({
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
      avgRequests: Math.round(metrics.requests / metrics.count)
    }))
    .sort((a, b) => b.avgRequests - a.avgRequests);

  return {
    summary,
    trends,
    predictions,
    suggestions,
    topServices,
    peakDays,
    statusDistribution: statusCounts
  };
}

function analyzeTrends(data) {
  const trends = [];

  // Week-over-week growth
  if (data.length >= 14) {
    const currentWeek = data.slice(-7).reduce((s, d) => s + d.requests, 0);
    const prevWeek = data.slice(-14, -7).reduce((s, d) => s + d.requests, 0);
    const growth = prevWeek > 0 ? Math.round(((currentWeek - prevWeek) / prevWeek) * 100) : 0;
    trends.push({
      type: 'week_growth',
      label: 'Week-over-week growth',
      value: growth,
      direction: growth > 0 ? 'up' : 'down'
    });
  }

  // Month-over-month if enough data
  if (data.length >= 60) {
    const currentMonth = data.slice(-30).reduce((s, d) => s + d.requests, 0);
    const prevMonth = data.slice(-60, -30).reduce((s, d) => s + d.requests, 0);
    const growth = prevMonth > 0 ? Math.round(((currentMonth - prevMonth) / prevMonth) * 100) : 0;
    trends.push({
      type: 'month_growth',
      label: 'Month-over-month growth',
      value: growth,
      direction: growth > 0 ? 'up' : 'down'
    });
  }

  // Volatility (coefficient of variation)
  const avgRequests = data.reduce((s, d) => s + d.requests, 0) / data.length;
  const variance = data.reduce((s, d) => s + Math.pow(d.requests - avgRequests, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  const volatility = Math.round((stdDev / avgRequests) * 100);

  trends.push({
    type: 'volatility',
    label: 'Demand volatility',
    value: volatility,
    severity: volatility > 50 ? 'high' : volatility > 30 ? 'medium' : 'low'
  });

  return trends;
}

function makePredictions(data) {
  const predictions = [];

  if (data.length < 3) return predictions;

  // Simple exponential smoothing forecast
  const requests = data.map(d => d.requests);
  let level = requests[0];
  let trend = (requests[Math.min(7, data.length - 1)] - requests[0]) / Math.min(7, data.length - 1) * 0.1;

  for (let i = 1; i < requests.length; i++) {
    const prevLevel = level;
    level = 0.3 * requests[i] + 0.7 * (prevLevel + trend);
    trend = 0.15 * (level - prevLevel) + 0.85 * trend;
  }

  // Next 7 days forecast
  const forecast7 = [];
  for (let i = 1; i <= 7; i++) {
    const value = Math.max(5, Math.round(level + trend * i * 0.8));
    forecast7.push(value);
  }

  const avgForecast = Math.round(forecast7.reduce((a, b) => a + b) / forecast7.length);
  const maxForecast = Math.max(...forecast7);

  predictions.push({
    period: 'Next 7 days',
    avgExpected: avgForecast,
    peakExpected: maxForecast,
    confidence: 'Medium'
  });

  // Next 30 days
  const forecast30 = [];
  for (let i = 1; i <= 30; i++) {
    const value = Math.max(5, Math.round(level + trend * i * 0.6));
    forecast30.push(value);
  }
  const avgForecast30 = Math.round(forecast30.reduce((a, b) => a + b) / forecast30.length);
  const totalForecast30 = forecast30.reduce((a, b) => a + b);

  predictions.push({
    period: 'Next 30 days',
    avgExpected: avgForecast30,
    totalExpected: totalForecast30,
    confidence: 'Medium'
  });

  return predictions;
}

function generateSuggestions(data, summary, trends, serviceMetrics) {
  const suggestions = [];

  // High demand suggestion
  if (summary.avgDailyRequests > 50) {
    suggestions.push({
      priority: 'high',
      category: 'Capacity',
      suggestion: `High demand detected (${summary.avgDailyRequests} requests/day). Consider expanding provider network.`,
      impact: 'Avoid service delays and improve customer satisfaction'
    });
  }

  // Low completion rate
  if (summary.completionRate < 80) {
    suggestions.push({
      priority: 'high',
      category: 'Quality',
      suggestion: `Completion rate is ${summary.completionRate}%. Investigate reasons for incomplete requests.`,
      impact: 'Improve service reliability and customer trust'
    });
  }

  // High response time
  if (summary.avgResponseTime > 30) {
    suggestions.push({
      priority: 'medium',
      category: 'Operations',
      suggestion: `Average response time is ${Math.round(summary.avgResponseTime)} minutes. Optimize dispatch system.`,
      impact: 'Faster service delivery improves customer experience'
    });
  }

  // Trend analysis suggestions
  const growthTrend = trends.find(t => t.type === 'week_growth');
  if (growthTrend && growthTrend.value > 20) {
    suggestions.push({
      priority: 'medium',
      category: 'Growth',
      suggestion: `Strong growth trend detected (+${growthTrend.value}%). Plan resource allocation accordingly.`,
      impact: 'Maintain service quality during growth'
    });
  }

  // Volatility suggestion
  const volatility = trends.find(t => t.type === 'volatility');
  if (volatility && volatility.severity === 'high') {
    suggestions.push({
      priority: 'medium',
      category: 'Planning',
      suggestion: 'High demand volatility detected. Implement dynamic pricing or surge management.',
      impact: 'Better resource utilization and revenue optimization'
    });
  }

  // Service-specific insights
  const topService = Object.entries(serviceMetrics)
    .sort((a, b) => b[1].requests - a[1].requests)[0];

  if (topService) {
    const completionRate = (topService[1].completed / topService[1].requests) * 100;
    if (completionRate < 70) {
      suggestions.push({
        priority: 'high',
        category: 'Service Quality',
        suggestion: `Top service "${topService[0]}" has low completion rate (${Math.round(completionRate)}%). Review provider training.`,
        impact: 'Improve service reliability for high-demand category'
      });
    }
  }

  // Revenue optimization
  const avgRevenuePerRequest = Math.round(summary.totalRevenue / summary.totalRequests);
  if (avgRevenuePerRequest > 0 && avgRevenuePerRequest < 500) {
    suggestions.push({
      priority: 'low',
      category: 'Revenue',
      suggestion: `Average revenue per request is ${avgRevenuePerRequest}. Review pricing strategy.`,
      impact: 'Increase revenue per transaction'
    });
  }

  return suggestions;
}


module.exports = {
  getSuppliers,
  approveSupplier,
  rejectSupplier,
  updateSupplierGrading,
  sendSupplierCredentials,
  updateSupplierByAdmin,
  createCatalogRequest,
  listCatalogRequests,
  countPendingCatalogRequests,
  updateCatalogRequest,
  completeCatalogRequest,
  listMarketResearch,
  upsertMarketResearch,
  deleteMarketResearch,
  getAdminCatalogOptions,
  listAdminServices,
  backfillServiceCategoryLinks,
  listAdminBookings,
  listAdminReviews,
  deleteAdminReview,
  putGradingConfig,
  listComplaints,
  updateComplaintStatus,
  notifyComplaintSupplier,
  decideComplaint,
  deleteComplaint,
  recoverSupplierProfile,
  createDiscount,
  listDiscounts,
  getServiceRequestFacts,
  getDemandPredictionData
};

