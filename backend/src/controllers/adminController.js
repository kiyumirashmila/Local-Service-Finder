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
    if (request.category) {
      const codeBase = request.category.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 8) || "CAT";
      try {
         await Category.findOneAndUpdate(
           { name: new RegExp(`^${request.category.trim()}$`, "i") },
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
      if (minRate > 0 && maxRate >= minRate) {
        await MarketResearch.findOneAndUpdate(
          { category: request.category, service: serviceName },
          {
            category: request.category,
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
          { category: request.category, title: serviceName },
          {
            title: serviceName,
            providerName: "System Catalog",
            category: request.category,
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
        if (supplier && supplier.role === "supplier") {
          // Update supplier's category to the official catalog category
          supplier.category = request.category;
          supplier.serviceCategory = request.category;
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
    const category = String(payload.category || "").trim();
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
    if (category) filters.category = new RegExp(String(category).trim(), "i");
    if (search) {
      const q = String(search).trim();
      filters.$or = [
        { title: new RegExp(q, "i") },
        { providerName: new RegExp(q, "i") },
        { description: new RegExp(q, "i") }
      ];
    }
    const services = await Service.find(filters).sort({ createdAt: -1 });
    return res.status(200).json(services);
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
  listDiscounts
};

