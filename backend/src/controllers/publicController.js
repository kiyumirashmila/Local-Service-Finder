const User = require("../models/User");
const Booking = require("../models/Booking");
const GradingConfig = require("../models/GradingConfig");
const Discount = require("../models/Discount");
const { buildCatalogOptions } = require("../utils/buildCatalogOptions");
const { DEFAULT_GRADING_TIERS } = require("../constants/gradingDefaults");

const getRecentApprovedSuppliers = async (req, res, next) => {
  try {
    const rawLimit = req.query.limit;
    let limit = 4;
    if (rawLimit === "all") {
      limit = 0; // 0 means no limit
    } else {
      limit = Math.min(Number(rawLimit || 4) || 4, 48);
    }
    
    const query = User.find({ role: "supplier", supplierApprovalStatus: "approved" })
      .sort({ createdAt: -1 })
      .select("fullName email phone city district avatarUrl category serviceCategory serviceCategoryOther yearsOfExperience supplierGrading averageRating totalRatings services servicesRates");

    if (limit > 0) {
      query.limit(limit);
    }
    
    const suppliers = await query;

    const mapped = suppliers.map((s) => ({
      id: s._id,
      fullName: s.fullName,
      email: s.email,
      phone: s.phone,
      city: s.city,
      district: s.district || "",
      avatar: s.avatarUrl || "",
      serviceCategory: s.serviceCategory || "",
      serviceCategoryOther: s.serviceCategoryOther || "",
      yearsOfExperience: s.yearsOfExperience || 0,
      supplierGrading: s.supplierGrading || null,
      averageRating: s.averageRating || 0,
      totalRatings: s.totalRatings || 0,
      services: s.services || [],
      servicesRates: s.servicesRates ? Object.fromEntries(s.servicesRates) : {}
    }));

    return res.status(200).json({ suppliers: mapped });
  } catch (error) {
    return next(error);
  }
};

const getCatalogOptions = async (req, res, next) => {
  try {
    const data = await buildCatalogOptions({ publicMode: true });
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const getGradingConfig = async (req, res, next) => {
  try {
    let doc = await GradingConfig.findOne({ key: "default" });
    if (!doc) {
      doc = await GradingConfig.create({
        key: "default",
        A: { ...DEFAULT_GRADING_TIERS.A },
        B: { ...DEFAULT_GRADING_TIERS.B },
        C: { ...DEFAULT_GRADING_TIERS.C }
      });
    }
    const shape = (t, fallback) => ({
      minYears: t?.minYears ?? fallback.minYears,
      stars: t?.stars ?? fallback.stars,
      priorityBoost: t?.priorityBoost ?? fallback.priorityBoost,
      priceRangeMin: t?.priceRangeMin ?? fallback.priceRangeMin ?? 0,
      priceRangeMax: t?.priceRangeMax ?? fallback.priceRangeMax ?? 100,
      label: String(t?.label || fallback.label || "").trim() || fallback.label
    });
    return res.status(200).json({
      A: shape(doc.A, DEFAULT_GRADING_TIERS.A),
      B: shape(doc.B, DEFAULT_GRADING_TIERS.B),
      C: shape(doc.C, DEFAULT_GRADING_TIERS.C)
    });
  } catch (error) {
    return next(error);
  }
};

const getSupplierBookedTimes = async (req, res, next) => {
  try {
    const supplierId = req.params.id;
    const date = String(req.query.date || "").trim(); // YYYY-MM-DD
    if (!supplierId) return res.status(400).json({ message: "Supplier ID is required." });
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "Valid date query param is required (YYYY-MM-DD)." });
    }

    const rows = await Booking.find({
      supplierId,
      requestedDate: date,
      status: { $in: ["pending", "approved"] }
    }).select("requestedTimeLabel status hours");

    const bookedTimes = rows
      .map((b) => ({
        time: String(b.requestedTimeLabel || "").trim(),
        status: String(b.status || "").trim(),
        hours: Number(b.hours) || 1
      }))
      .filter((x) => x.time);

    return res.status(200).json({ bookedTimes });
  } catch (error) {
    return next(error);
  }
};

const getActiveDiscountBanner = async (req, res, next) => {
  try {
    const now = new Date();
    const rows = await Discount.find({
      isActive: true,
      expiryDate: { $gte: now }
    }).sort({ createdAt: -1 });
    const row = rows.find((d) => Number(d.maxUses || 0) === 0 || Number(d.usesCount || 0) < Number(d.maxUses || 0));

    if (!row) return res.status(200).json({ promo: null });
    return res.status(200).json({
      promo: {
        code: row.code,
        type: row.type,
        value: row.value,
        maxUses: row.maxUses,
        usesCount: row.usesCount,
        expiryDate: row.expiryDate
      }
    });
  } catch (error) {
    return next(error);
  }
};

const previewDiscount = async (req, res, next) => {
  try {
    const code = String(req.body?.code || "").trim().toUpperCase();
    const subtotal = Math.max(0, Number(req.body?.subtotal) || 0);
    if (!code) return res.status(400).json({ message: "Discount code is required." });

    const now = new Date();
    const row = await Discount.findOne({
      code,
      isActive: true,
      expiryDate: { $gte: now }
    });

    if (!row) return res.status(400).json({ message: "Invalid or expired discount code." });
    const maxUses = Number(row.maxUses || 0);
    const usesCount = Number(row.usesCount || 0);
    if (maxUses > 0 && usesCount >= maxUses) {
      return res.status(400).json({ message: "This discount code has reached its usage limit." });
    }

    let discountAmount = 0;
    if (row.type === "percentage") {
      discountAmount = Math.round((subtotal * Math.max(0, Number(row.value) || 0)) / 100);
    } else {
      discountAmount = Math.round(Math.max(0, Number(row.value) || 0));
    }
    discountAmount = Math.min(subtotal, discountAmount);
    const total = Math.max(0, subtotal - discountAmount);

    return res.status(200).json({
      promo: {
        code: row.code,
        type: row.type,
        value: Number(row.value) || 0
      },
      subtotal,
      discountAmount,
      total
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getRecentApprovedSuppliers, getCatalogOptions, getGradingConfig, getSupplierBookedTimes, getActiveDiscountBanner, previewDiscount };
