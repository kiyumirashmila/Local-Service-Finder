const Booking = require("../models/Booking");
const User = require("../models/User");
const Discount = require("../models/Discount");
const { buildCatalogOptions } = require("../utils/buildCatalogOptions");

function normCatalogKey(s) {
  return String(s || "").trim().toLowerCase();
}

function resolveServiceRateRange(marketRatesByKey, categoryLabel, serviceName) {
  const rateLookupCategoryNorm = normCatalogKey(categoryLabel);
  const sk = normCatalogKey(serviceName);
  const k = `${rateLookupCategoryNorm}|||${sk}`;
  const direct = marketRatesByKey[k];
  if (direct && Number.isFinite(direct.minRatePerHour) && Number.isFinite(direct.maxRatePerHour)) {
    return direct;
  }
  const rows = [];
  for (const [key, v] of Object.entries(marketRatesByKey || {})) {
    if (!key.startsWith(`${rateLookupCategoryNorm}|||`)) continue;
    if (Number.isFinite(v?.minRatePerHour) && Number.isFinite(v?.maxRatePerHour)) {
      rows.push(v);
    }
  }
  if (!rows.length) return null;
  const mins = rows.map((r) => r.minRatePerHour);
  const maxs = rows.map((r) => r.maxRatePerHour);
  return {
    minRatePerHour: Math.min(...mins),
    maxRatePerHour: Math.max(...maxs),
    currency: String(rows[0].currency || "LKR").trim() || "LKR"
  };
}

function getProviderRoleForRates(supplier) {
  if (supplier?.serviceCategory === 'other' && supplier?.serviceCategoryOther) {
    return `Other (${supplier.serviceCategoryOther})`;
  }
  return supplier?.serviceCategory || '';
}

function computeDiscountAmount(subtotal, discount) {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  if (!discount || safeSubtotal <= 0) return 0;

  if (discount.type === "percentage") {
    const pct = Math.max(0, Number(discount.value) || 0);
    return Math.min(safeSubtotal, Math.round((safeSubtotal * pct) / 100));
  }

  if (discount.type === "fixed") {
    const fixed = Math.max(0, Number(discount.value) || 0);
    return Math.min(safeSubtotal, Math.round(fixed));
  }

  return 0;
}

function createScratchReward() {
  const rewards = [
    { type: "percentage", value: 10, label: "10% OFF" },
    { type: "percentage", value: 15, label: "15% OFF" },
    { type: "percentage", value: 20, label: "20% OFF" },
    { type: "fixed", value: 250, label: "LKR 250 OFF" },
    { type: "fixed", value: 500, label: "LKR 500 OFF" }
  ];
  const pick = rewards[Math.floor(Math.random() * rewards.length)];
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return {
    code: `SCRATCH-${rand}`,
    type: pick.type,
    value: pick.value,
    label: pick.label
  };
}

function findSupplierServiceRate(supplier, serviceName) {
  const rates = supplier?.servicesRates;
  if (!rates || typeof rates !== "object") return null;

  const parts = Array.isArray(serviceName)
    ? serviceName
    : String(serviceName || "")
        .split(",")
        .map((s) => String(s).trim())
        .filter(Boolean);

  if (!parts.length) return null;

  let total = 0;
  let foundAny = false;
  for (const part of parts) {
    const rawRate =
      typeof rates.get === "function"
        ? rates.get(part)
        : rates[part];
    const rate = Number(rawRate);
    if (Number.isFinite(rate) && rate > 0) {
      total += rate;
      foundAny = true;
    }
  }

  return foundAny ? total : null;
}

const tierFromXp = (xp) => {
  const value = Number(xp) || 0;
  if (value <= 100) return "Bronze";
  if (value <= 250) return "Silver";
  if (value <= 500) return "Gold";
  return "Platinum";
};

const REVIEW_WINDOW_DAYS = 3;
const REVIEW_WINDOW_MS = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const getBookingCompletedAtDate = (booking) => {
  const completed = booking?.completedAt ? new Date(booking.completedAt) : null;
  if (completed && !Number.isNaN(completed.getTime())) return completed;
  return null;
};

const isWithinReviewWindow = (booking) => {
  const completedAt = getBookingCompletedAtDate(booking);
  if (!completedAt) return false;
  return Date.now() - completedAt.getTime() <= REVIEW_WINDOW_MS;
};

const recalcSupplierRatingStats = async (supplierId) => {
  if (!supplierId) return;

  const reviewedBookings = await Booking.find({
    supplierId,
    status: "completed",
    "review.rating": { $exists: true }
  }).select("review.rating");

  const ratings = reviewedBookings
    .map((b) => Number(b?.review?.rating || 0))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);

  const totalRatings = ratings.length;
  const ratingSum = ratings.reduce((acc, n) => acc + n, 0);
  const averageRating = totalRatings ? Number((ratingSum / totalRatings).toFixed(2)) : 0;
  const xp = ratings.reduce((acc, n) => acc + (n * 20), 0);
  const tierLevel = tierFromXp(xp);

  await User.findByIdAndUpdate(supplierId, {
    averageRating,
    totalRatings,
    xp,
    tierLevel
  });
};

const complaintCategories = new Set([
  "Late Arrival",
  "Quality of Work",
  "Payment Issue",
  "Unprofessional Behavior",
  "Other"
]);

/** Parse MM / YY or MM/YY from client. */
function parseExpiry(exp) {
  const t = String(exp || "").trim();
  const m = t.match(/^(\d{1,2})\s*\/\s*(\d{2})$/);
  if (!m) return null;
  const mm = parseInt(m[1], 10);
  const yy = parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return null;
  return { mm, yy };
}

function expiryNotPast({ mm, yy }) {
  const year = 2000 + yy;
  const endOfMonth = new Date(year, mm, 0, 23, 59, 59, 999);
  return endOfMonth >= new Date();
}

/**
 * Validates payment method fields for payBooking. Card number / CVV / expiry are checked then discarded (never stored).
 */
function validatePaymentMethodBody(body) {
  const { cardholderName, cardNumber, expiry, cvv, billingZip } = body || {};
  const fieldErrors = {};

  const nameRaw = String(cardholderName || "").trim();
  const nameParts = nameRaw.split(/\s+/);

  if (nameParts.length !== 2) {
    fieldErrors.cardholderName = "Enter exactly first and last name (2 words).";
  } else if (!/^[A-Za-z\s]+$/.test(nameRaw)) {
    fieldErrors.cardholderName = "Name must contain letters only.";
  }

  const num = String(cardNumber || "").trim();
  if (!/^\d{16}$/.test(num)) {
    fieldErrors.cardNumber = "Card number must be exactly 16 digits (numbers only).";
  }

  const ex = parseExpiry(expiry);
  if (!ex) {
    fieldErrors.expiry = "Use MM / YY (e.g. 08 / 29).";
  } else if (!expiryNotPast(ex)) {
    fieldErrors.expiry = "Card has expired.";
  }

  const cv = String(cvv || "").trim();
  if (!/^\d{3}$/.test(cv)) {
    fieldErrors.cvv = "CVV must be exactly 3 digits.";
  }

  const zip = String(billingZip || "").trim();
  if (!/^\d{5}$/.test(zip)) {
    fieldErrors.billingZip = "Postal code must be exactly 5 digits.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    const message =
      fieldErrors.cardholderName ||
      fieldErrors.cardNumber ||
      fieldErrors.expiry ||
      fieldErrors.cvv ||
      fieldErrors.billingZip ||
      "Invalid payment details.";
    return { ok: false, message, fieldErrors };
  }

  return { ok: true, name: nameRaw };
}

const requireAuthed = (req, res) => {
  if (!req.auth?.userId) {
    res.status(401).json({ message: "Unauthorized." });
    return false;
  }
  return true;
};

const createBooking = async (req, res, next) => {
  try {
    if (!requireAuthed(req, res)) return;
    if (req.auth.role !== "customer") {
      return res.status(403).json({ message: "Only customers can create bookings." });
    }

    const { supplierId, requestedDate, requestedTimeLabel, serviceTitle, hours: hoursRaw, discountCode: discountCodeRaw } = req.body || {};
    if (!supplierId || !requestedDate || !requestedTimeLabel) {
      return res.status(400).json({ message: "Missing required fields." });
    }
    const serviceName = String(serviceTitle || "").trim().slice(0, 240);

    let hours = parseInt(hoursRaw, 10);
    if (!Number.isFinite(hours)) hours = 1;
    hours = Math.min(5, Math.max(1, hours));

    const supplier = await User.findById(supplierId).select(
      "role supplierApprovalStatus fullName serviceCategory serviceCategoryOther category servicesRates"
    );
    if (!supplier || supplier.role !== "supplier") {
      return res.status(404).json({ message: "Supplier not found." });
    }
    if (supplier.supplierApprovalStatus !== "approved") {
      return res.status(400).json({ message: "Supplier is not approved yet." });
    }

    const customer = await User.findById(req.auth.userId).select("fullName");
    if (!customer) {
      return res.status(401).json({ message: "User no longer exists." });
    }
    const customerNameSnapshot = String(customer.fullName || "").trim().slice(0, 120);
    const supplierNameSnapshot = String(supplier.fullName || "").trim().slice(0, 120);

    const categoryLabel = getProviderRoleForRates(supplier);

    const supplierRate = findSupplierServiceRate(supplier, serviceName);
    const { marketRatesByKey } = await buildCatalogOptions({ publicMode: true });
    const rateRange = resolveServiceRateRange(marketRatesByKey, categoryLabel, serviceName);

    let subtotalAmount = 0;
    let currency = "LKR";
    if (Number.isFinite(supplierRate) && supplierRate > 0) {
      subtotalAmount = Math.round(supplierRate * hours);
    } else if (rateRange) {
      const avgPerHour = (Number(rateRange.minRatePerHour) + Number(rateRange.maxRatePerHour)) / 2;
      if (Number.isFinite(avgPerHour) && avgPerHour > 0) {
        subtotalAmount = Math.round(avgPerHour * hours);
      }
      currency = String(rateRange.currency || "LKR").trim() || "LKR";
    } else {
      subtotalAmount = 0;
    }

    let appliedDiscount = null;
    let appliedScratchCoupon = null;
    const discountCode = String(discountCodeRaw || "").trim().toUpperCase();
    if (discountCode) {
      const customerUser = await User.findById(req.auth.userId).select("scratchCoupons");
      const scratchCoupons = Array.isArray(customerUser?.scratchCoupons) ? customerUser.scratchCoupons : [];
      const scratchMatch = scratchCoupons.find(
        (c) => String(c?.code || "").trim().toUpperCase() === discountCode && !Boolean(c?.isUsed)
      );

      if (scratchMatch) {
        appliedScratchCoupon = {
          code: String(scratchMatch.code || "").trim().toUpperCase(),
          type: scratchMatch.type === "fixed" ? "fixed" : "percentage",
          value: Number(scratchMatch.value || 0)
        };
      } else {
        const now = new Date();
        const discount = await Discount.findOne({
          code: discountCode,
          isActive: true,
          expiryDate: { $gte: now }
        });
        if (!discount) {
          return res.status(400).json({ message: "Invalid or expired discount code." });
        }
        const maxUses = Number(discount.maxUses || 0);
        const usesCount = Number(discount.usesCount || 0);
        if (maxUses > 0 && usesCount >= maxUses) {
          return res.status(400).json({ message: "This discount code has reached its usage limit." });
        }
        appliedDiscount = discount;
      }
    }

    const discountSource = appliedScratchCoupon || appliedDiscount;
    const discountAmount = discountSource ? computeDiscountAmount(subtotalAmount, discountSource) : 0;
    const amount = Math.max(0, subtotalAmount - discountAmount);

    if (appliedDiscount) {
      appliedDiscount.usesCount = Number(appliedDiscount.usesCount || 0) + 1;
      await appliedDiscount.save();
    }
    if (appliedScratchCoupon) {
      await User.updateOne(
        { _id: req.auth.userId, "scratchCoupons.code": appliedScratchCoupon.code, "scratchCoupons.isUsed": false },
        {
          $set: {
            "scratchCoupons.$.isUsed": true,
            "scratchCoupons.$.usedAt": new Date()
          }
        }
      );
    }

    const booking = await Booking.create({
      customerId: req.auth.userId,
      customerName: customerNameSnapshot,
      customerNameSnapshot,
      supplierId,
      supplierName: supplierNameSnapshot,
      supplierNameSnapshot,
      requestedDate,
      requestedTimeLabel,
      serviceName,
      hours,
      status: "pending",
      baseAmount: subtotalAmount,
      discountCode: discountSource ? String(discountSource.code || "").trim().toUpperCase() : "",
      discountType: discountSource ? discountSource.type : "",
      discountValue: discountSource ? Number(discountSource.value) || 0 : 0,
      discountAmount,
      amount,
      currency,
      paymentStatus: "unpaid"
    });

    return res.status(201).json({
      booking: {
        id: booking._id,
        supplierId: booking.supplierId,
        supplierName: booking.supplierName || "",
        supplierNameSnapshot: booking.supplierNameSnapshot || "",
        customerId: booking.customerId,
        customerName: booking.customerName || "",
        customerNameSnapshot: booking.customerNameSnapshot || "",
        requestedDate: booking.requestedDate,
        requestedTimeLabel: booking.requestedTimeLabel,
        serviceName: booking.serviceName || "",
        hours: booking.hours,
        baseAmount: booking.baseAmount || 0,
        discountCode: booking.discountCode || "",
        discountType: booking.discountType || "",
        discountValue: Number(booking.discountValue || 0),
        discountAmount: Number(booking.discountAmount || 0),
        amount: booking.amount,
        currency: booking.currency,
        status: booking.status,
        createdAt: booking.createdAt
      }
    });
  } catch (error) {
    return next(error);
  }
};

const listMyBookings = async (req, res, next) => {
  try {
    if (!requireAuthed(req, res)) return;

    const role = req.auth.role;
    const userId = req.auth.userId;

    const filter = role === "supplier" ? { supplierId: userId } : { customerId: userId };

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .populate("customerId", "fullName email phone city avatarUrl")
      .populate(
        "supplierId",
        "fullName email phone city avatarUrl serviceCategory serviceCategoryOther yearsOfExperience supplierGrading averageRating totalRatings xp tierLevel servicesRates"
      );

    const mapped = bookings.map((b) => {
      const storedAmount = typeof b.amount === "number" ? b.amount : 0;
      return {
        id: b._id,
        status: b.status,
        requestedDate: b.requestedDate,
        requestedTimeLabel: b.requestedTimeLabel,
        serviceName: b.serviceName || "",
        createdAt: b.createdAt,
        hours: Number.isFinite(b.hours) && b.hours >= 1 && b.hours <= 5 ? b.hours : 1,
        baseAmount: Number.isFinite(b.baseAmount) ? b.baseAmount : storedAmount,
        discountCode: String(b.discountCode || ""),
        discountType: String(b.discountType || ""),
        discountValue: Number(b.discountValue || 0),
        discountAmount: Number(b.discountAmount || 0),
        amount: storedAmount,
        currency: b.currency || "LKR",
        paymentStatus: b.paymentStatus || "unpaid",
        estimatedFee: storedAmount,
        paidAt: b.paidAt || null,
        paymentRef: b.paymentRef || "",
        cardholderNameSnapshot: b.cardholderNameSnapshot || "",
        completedAt: b.completedAt || null,
        reviewBlockedByAdmin: Boolean(b.reviewBlockedByAdmin),
        complaintBlockedByAdmin: Boolean(b.complaintBlockedByAdmin),
        review: b.review?.rating
          ? {
              rating: b.review.rating,
              feedback: b.review.feedback || "",
              createdAt: b.review.createdAt || null,
              updatedAt: b.review.updatedAt || null,
            }
          : null,
        complaint: b.complaint?.submittedAt
          ? {
              category: b.complaint.category || "",
              description: b.complaint.description || "",
              evidenceUrl: b.complaint.evidenceUrl || "",
              submittedAt: b.complaint.submittedAt || null,
              supplierNotifiedAt: b.complaint.supplierNotifiedAt || null,
              status: b.complaint.status || "pending",
              supplierResponse: b.complaint.supplierResponse || "",
              supplierRespondedAt: b.complaint.supplierRespondedAt || null,
              adminDecision: b.complaint.adminDecision || "none",
              adminDecidedAt: b.complaint.adminDecidedAt || null,
            }
          : null,
        customer: b.customerId
          ? {
              id: b.customerId._id,
              fullName: b.customerId.fullName,
              email: b.customerId.email,
              phone: b.customerId.phone,
              city: b.customerId.city,
              avatarUrl: b.customerId.avatarUrl || "",
            }
          : null,
        customerNameSnapshot: b.customerNameSnapshot || b.customerId?.fullName || "",
        customerName: b.customerName || b.customerNameSnapshot || b.customerId?.fullName || "",
        supplier: b.supplierId
          ? {
              id: b.supplierId._id,
              fullName: b.supplierId.fullName,
              email: b.supplierId.email,
              phone: b.supplierId.phone,
              city: b.supplierId.city,
              avatarUrl: b.supplierId.avatarUrl || "",
              serviceCategory: b.supplierId.serviceCategory || "",
              serviceCategoryOther: b.supplierId.serviceCategoryOther || "",
              yearsOfExperience: b.supplierId.yearsOfExperience || 0,
              supplierGrading: b.supplierId.supplierGrading || null,
              averageRating: Number(b.supplierId.averageRating || 0),
              totalRatings: Number(b.supplierId.totalRatings || 0),
              xp: Number(b.supplierId.xp || 0),
              tierLevel: b.supplierId.tierLevel || "Bronze",
              servicesRates:
                b.supplierId.servicesRates && typeof b.supplierId.servicesRates === "object"
                  ? Object.fromEntries(b.supplierId.servicesRates)
                  : {},
            }
          : null,
        supplierNameSnapshot: b.supplierNameSnapshot || b.supplierId?.fullName || "",
        supplierName: b.supplierName || b.supplierNameSnapshot || b.supplierId?.fullName || "",
      };
    });

    return res.status(200).json({ bookings: mapped });
  } catch (error) {
    return next(error);
  }
};

const updateBookingStatus = async (req, res, next) => {
  try {
    if (!requireAuthed(req, res)) return;
    if (req.auth.role !== "supplier") {
      return res.status(403).json({ message: "Only suppliers can update booking status." });
    }

    const { status } = req.body;
    if (!status || !["approved", "rejected", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Use approved, rejected, or completed." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (String(booking.supplierId) !== String(req.auth.userId)) {
      return res.status(403).json({ message: "You can only update your own booking requests." });
    }

    // Complete is allowed only for already approved bookings.
    if (status === "completed" && booking.status !== "approved") {
      return res.status(400).json({ message: "Only approved bookings can be marked completed." });
    }
    if (status === "completed" && booking.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Only paid bookings can be marked completed." });
    }

    booking.status = status;
    booking.completedAt = status === "completed" ? new Date() : booking.completedAt;
    await booking.save();

    return res.status(200).json({ message: "Booking updated.", status: booking.status });
  } catch (error) {
    return next(error);
  }
};

const payBooking = async (req, res, next) => {
  try {
    if (!requireAuthed(req, res)) return;
    if (req.auth.role !== "customer") {
      return res.status(403).json({ message: "Only customers can complete payment." });
    }

    const payCheck = validatePaymentMethodBody(req.body);
    if (!payCheck.ok) {
      return res.status(400).json({ message: payCheck.message, fieldErrors: payCheck.fieldErrors || {} });
    }
    const name = payCheck.name;

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (String(booking.customerId) !== String(req.auth.userId)) {
      return res.status(403).json({ message: "You can only pay for your own bookings." });
    }
    if (booking.status !== "approved") {
      return res.status(400).json({ message: "Payment is only available after the supplier approves this booking." });
    }
    const ps = booking.paymentStatus || "unpaid";
    if (ps === "paid") {
      return res.status(400).json({ message: "This booking is already paid." });
    }

    const ref = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    booking.paymentStatus = "paid";
    booking.paidAt = new Date();
    booking.paymentRef = ref;
    booking.cardholderNameSnapshot = name.slice(0, 120);
    await booking.save();

    const scratchReward = createScratchReward();
    await User.findByIdAndUpdate(req.auth.userId, {
      $push: {
        scratchCoupons: {
          code: scratchReward.code,
          type: scratchReward.type,
          value: scratchReward.value,
          isUsed: false,
          awardedAt: new Date(),
          sourceBookingId: booking._id
        }
      }
    });

    return res.status(200).json({
      message: "Payment successful.",
      booking: {
        id: booking._id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paidAt: booking.paidAt,
        paymentRef: booking.paymentRef,
        amount: typeof booking.amount === "number" ? booking.amount : 0,
        currency: booking.currency || "LKR",
        requestedDate: booking.requestedDate,
        requestedTimeLabel: booking.requestedTimeLabel,
        cardholderNameSnapshot: booking.cardholderNameSnapshot
      },
      scratchCoupon: scratchReward
    });
  } catch (error) {
    return next(error);
  }
};

const createBookingReview = async (req, res, next) => {
  try {
    if (!requireAuthed(req, res)) return;
    if (req.auth.role !== "customer") {
      return res.status(403).json({ message: "Only customers can submit reviews." });
    }

    const { rating, feedback } = req.body || {};
    if (rating === undefined || rating === null || (typeof rating === "string" && !String(rating).trim())) {
      return res.status(400).json({ message: "Ratings is required" });
    }
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5." });
    }
    const fb = String(feedback || "").trim();
    if (fb.length < 10) {
      return res.status(400).json({ message: "Feedback must be at least 10 characters." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (String(booking.customerId) !== String(req.auth.userId)) {
      return res.status(403).json({ message: "You can only review your own bookings." });
    }
    if (booking.status !== "completed") {
      return res.status(400).json({ message: "You can only review completed bookings." });
    }
    if (!isWithinReviewWindow(booking)) {
      return res.status(400).json({ message: "Reviews can only be submitted within 3 days of completion." });
    }
    if (booking.reviewBlockedByAdmin) {
      return res.status(403).json({ message: "Review submission is disabled for this booking by admin action." });
    }
    if (booking.review?.rating) {
      return res.status(400).json({ message: "Review already exists for this booking. Use edit review." });
    }

    const now = new Date();
    booking.review = {
      rating: numericRating,
      feedback: fb.slice(0, 1000),
      createdAt: now,
      updatedAt: now
    };
    await booking.save();
    await recalcSupplierRatingStats(booking.supplierId);

    return res.status(201).json({
      message: "Review submitted.",
      review: booking.review
    });
  } catch (error) {
    return next(error);
  }
};

const updateBookingReview = async (req, res, next) => {
  try {
    if (!requireAuthed(req, res)) return;
    if (req.auth.role !== "customer") {
      return res.status(403).json({ message: "Only customers can edit reviews." });
    }

    const { rating, feedback } = req.body || {};
    if (rating === undefined || rating === null || (typeof rating === "string" && !String(rating).trim())) {
      return res.status(400).json({ message: "Ratings is required" });
    }
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5." });
    }
    const fb = String(feedback || "").trim();
    if (fb.length < 10) {
      return res.status(400).json({ message: "Feedback must be at least 10 characters." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (String(booking.customerId) !== String(req.auth.userId)) {
      return res.status(403).json({ message: "You can only edit your own booking review." });
    }
    if (booking.status !== "completed") {
      return res.status(400).json({ message: "You can only edit reviews for completed bookings." });
    }
    if (!isWithinReviewWindow(booking)) {
      return res.status(400).json({ message: "Reviews can only be edited within 3 days of completion." });
    }
    if (!booking.review?.rating) {
      return res.status(404).json({ message: "No review exists for this booking." });
    }

    booking.review.rating = numericRating;
    booking.review.feedback = fb.slice(0, 1000);
    booking.review.updatedAt = new Date();
    await booking.save();
    await recalcSupplierRatingStats(booking.supplierId);

    return res.status(200).json({
      message: "Review updated.",
      review: booking.review
    });
  } catch (error) {
    return next(error);
  }
};

const deleteBookingReview = async (req, res, next) => {
  try {
    if (!requireAuthed(req, res)) return;
    if (req.auth.role !== "customer") {
      return res.status(403).json({ message: "Only customers can delete reviews." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (String(booking.customerId) !== String(req.auth.userId)) {
      return res.status(403).json({ message: "You can only delete your own booking review." });
    }
    if (booking.status !== "completed") {
      return res.status(400).json({ message: "You can only delete reviews for completed bookings." });
    }
    if (!isWithinReviewWindow(booking)) {
      return res.status(400).json({ message: "Reviews can only be deleted within 3 days of completion." });
    }
    if (!booking.review?.rating) {
      return res.status(404).json({ message: "No review exists for this booking." });
    }

    booking.review = undefined;
    await booking.save();
    await recalcSupplierRatingStats(booking.supplierId);

    return res.status(200).json({ message: "Review deleted." });
  } catch (error) {
    return next(error);
  }
};

const createBookingComplaint = async (req, res, next) => {
  try {
    if (!requireAuthed(req, res)) return;
    if (req.auth.role !== "customer") {
      return res.status(403).json({ message: "Only customers can submit complaints." });
    }

    const { category, description } = req.body || {};
    const normalizedCategory = String(category || "").trim();
    const normalizedDescription = String(description || "").trim();
    if (!normalizedCategory || !complaintCategories.has(normalizedCategory)) {
      return res.status(400).json({ message: "Please select a valid complaint category." });
    }
    if (normalizedDescription.length < 10) {
      return res.status(400).json({ message: "Description must be at least 10 characters." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (String(booking.customerId) !== String(req.auth.userId)) {
      return res.status(403).json({ message: "You can only submit complaints for your own bookings." });
    }
    if (booking.status !== "completed") {
      return res.status(400).json({ message: "Complaints can only be submitted for completed bookings." });
    }
    if (booking.complaintBlockedByAdmin) {
      return res.status(403).json({ message: "Complaint submission is disabled for this booking by admin action." });
    }
    if (booking.complaint?.submittedAt) {
      return res.status(400).json({ message: "A complaint has already been submitted for this booking." });
    }

    const evidenceFile = req.complaintEvidenceFile;
    const evidenceUrl = evidenceFile?.filename
      ? `${req.protocol}://${req.get("host")}/uploads/complaints/${evidenceFile.filename}`
      : "";

    booking.complaint = {
      category: normalizedCategory,
      description: normalizedDescription.slice(0, 2000),
      evidenceUrl,
      submittedAt: new Date(),
      status: "pending",
      supplierResponse: "",
      supplierRespondedAt: null,
      adminDecision: "none",
      adminDecidedAt: null
    };
    await booking.save();

    return res.status(201).json({
      message: "Complaint submitted successfully.",
      complaint: booking.complaint
    });
  } catch (error) {
    return next(error);
  }
};

const updateBookingComplaint = async (req, res, next) => {
  try {
    if (!requireAuthed(req, res)) return;
    if (req.auth.role !== "customer") {
      return res.status(403).json({ message: "Only customers can edit complaints." });
    }

    const { category, description } = req.body || {};
    const normalizedCategory = String(category || "").trim();
    const normalizedDescription = String(description || "").trim();
    if (!normalizedCategory || !complaintCategories.has(normalizedCategory)) {
      return res.status(400).json({ message: "Please select a valid complaint category." });
    }
    if (normalizedDescription.length < 10) {
      return res.status(400).json({ message: "Description must be at least 10 characters." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (String(booking.customerId) !== String(req.auth.userId)) {
      return res.status(403).json({ message: "You can only edit complaints for your own bookings." });
    }
    if (!booking.complaint?.submittedAt) {
      return res.status(404).json({ message: "No complaint exists for this booking." });
    }
    if ((booking.complaint.status || "pending") !== "pending") {
      return res.status(400).json({ message: "Resolved complaints cannot be edited." });
    }

    const evidenceFile = req.complaintEvidenceFile;
    const evidenceUrl = evidenceFile?.filename
      ? `${req.protocol}://${req.get("host")}/uploads/complaints/${evidenceFile.filename}`
      : booking.complaint.evidenceUrl || "";

    booking.complaint.category = normalizedCategory;
    booking.complaint.description = normalizedDescription.slice(0, 2000);
    booking.complaint.evidenceUrl = evidenceUrl;
    await booking.save();

    return res.status(200).json({ message: "Complaint updated successfully.", complaint: booking.complaint });
  } catch (error) {
    return next(error);
  }
};

const deleteBookingComplaint = async (req, res, next) => {
  try {
    if (!requireAuthed(req, res)) return;
    if (req.auth.role !== "customer") {
      return res.status(403).json({ message: "Only customers can delete complaints." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (String(booking.customerId) !== String(req.auth.userId)) {
      return res.status(403).json({ message: "You can only delete complaints for your own bookings." });
    }
    if (!booking.complaint?.submittedAt) {
      return res.status(404).json({ message: "No complaint exists for this booking." });
    }
    if ((booking.complaint.status || "pending") !== "pending") {
      return res.status(400).json({ message: "Resolved complaints cannot be deleted." });
    }

    booking.complaint = undefined;
    await booking.save();
    return res.status(200).json({ message: "Complaint deleted." });
  } catch (error) {
    return next(error);
  }
};

const deleteBooking = async (req, res, next) => {
  try {
    if (!requireAuthed(req, res)) return;
    if (req.auth.role !== "customer") {
      return res.status(403).json({ message: "Only customers can delete bookings." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (String(booking.customerId) !== String(req.auth.userId)) {
      return res.status(403).json({ message: "You can only delete your own bookings." });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Only pending bookings can be deleted." });
    }

    await Booking.deleteOne({ _id: booking._id });
    return res.status(200).json({ message: "Booking deleted." });
  } catch (error) {
    return next(error);
  }
};

const supplierRespondToComplaint = async (req, res, next) => {
  try {
    if (!requireAuthed(req, res)) return;
    if (req.auth.role !== "supplier") {
      return res.status(403).json({ message: "Only suppliers can respond to complaints." });
    }

    const responseText = String(req.body?.responseText || "").trim();
    if (responseText.length < 10) {
      return res.status(400).json({ message: "Response must be at least 10 characters." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking || !booking.complaint?.submittedAt) {
      return res.status(404).json({ message: "Complaint not found." });
    }
    if (String(booking.supplierId) !== String(req.auth.userId)) {
      return res.status(403).json({ message: "You can only respond to complaints against your bookings." });
    }

    booking.complaint.supplierResponse = responseText.slice(0, 2000);
    booking.complaint.supplierRespondedAt = new Date();
    await booking.save();

    return res.status(200).json({
      message: "Complaint response submitted.",
      supplierResponse: booking.complaint.supplierResponse,
      supplierRespondedAt: booking.complaint.supplierRespondedAt
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createBooking,
  listMyBookings,
  updateBookingStatus,
  payBooking,
  createBookingReview,
  updateBookingReview,
  deleteBookingReview,
  recalcSupplierRatingStats,
  createBookingComplaint,
  updateBookingComplaint,
  deleteBookingComplaint,
  deleteBooking,
  supplierRespondToComplaint
};

