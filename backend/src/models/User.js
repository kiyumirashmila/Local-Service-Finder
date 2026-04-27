const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["customer", "supplier"], required: true },

    // Common fields
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: {
      type: String,
      required: function () {
        return this.role === "customer";
      },
      select: false,
      default: null
    },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, default: "", trim: true },

    // Supplier-specific fields
    avatarUrl: { type: String, default: "" },
    serviceCategory: { type: String, default: "" },
    serviceCategoryOther: { type: String, default: "" },
    category: { type: String, default: "" },
    services: [{ type: String, trim: true }],
    serviceOther: { type: String, default: "" },
    servicesRates: { type: Map, of: Number, default: {} },
    scratchCoupons: [
      {
        code: { type: String, trim: true, uppercase: true, default: "" },
        type: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
        value: { type: Number, min: 0, default: 0 },
        isUsed: { type: Boolean, default: false },
        awardedAt: { type: Date, default: Date.now },
        usedAt: { type: Date, default: null },
        sourceBookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null }
      }
    ],
    yearsOfExperience: { type: Number, default: 0 },
    monthsOfExperience: { type: Number, default: 0 },
    bio: { type: String, default: "" },
    nic: { type: String, trim: true, default: "" },
    experienceCertificateUrl: { type: String, default: "" },
    experienceCertificates: [{ type: String }],

    // Supplier approval workflow (set pending on signup, then admin approves/rejects).
    supplierApprovalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    // Admin grading based on years of experience.
    supplierGrading: {
      type: String,
      enum: ["A", "B", "C"],
      default: null
    },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    tierLevel: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum"],
      default: "Bronze"
    },
    warningCount: { type: Number, default: 0 },
    isBanned: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

