const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    /** Plain customer name stored directly on booking */
    customerName: { type: String, default: "", trim: true },
    /** Snapshot of customer name at booking time */
    customerNameSnapshot: { type: String, default: "", trim: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    /** Plain supplier name stored directly on booking */
    supplierName: { type: String, default: "", trim: true },
    /** Snapshot of supplier name at booking time */
    supplierNameSnapshot: { type: String, default: "", trim: true },

    // requested slot
    requestedDate: { type: String, required: true }, // ISO date: YYYY-MM-DD
    requestedTimeLabel: { type: String, required: true }, // e.g. "09:00 AM"

    /** Customer-selected catalog service name at booking time */
    serviceName: { type: String, default: "", trim: true },

    /** Session length in whole hours (UI: 1–5) */
    hours: { type: Number, min: 1, max: 5, default: 1 },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending"
    },

    amount: { type: Number, default: 0 },
    currency: { type: String, default: "LKR" },
    baseAmount: { type: Number, default: 0 },
    discountCode: { type: String, default: "", trim: true },
    discountType: { type: String, enum: ["", "percentage", "fixed"], default: "" },
    discountValue: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid"
    },
    paidAt: { type: Date },
    paymentRef: { type: String, default: "" },
    /** Stored only after successful pay (name on card for receipt) */
    cardholderNameSnapshot: { type: String, default: "" },
    completedAt: { type: Date, default: null },
    review: {
      rating: { type: Number, min: 1, max: 5 },
      feedback: { type: String, default: "" },
      createdAt: { type: Date },
      updatedAt: { type: Date }
    },
    // When true, customer cannot submit another review for this booking.
    reviewBlockedByAdmin: { type: Boolean, default: false },
    // When true, customer cannot submit another complaint for this booking.
    complaintBlockedByAdmin: { type: Boolean, default: false },
    complaint: {
      category: { type: String, default: "" },
      description: { type: String, default: "" },
      evidenceUrl: { type: String, default: "" },
      submittedAt: { type: Date },
      status: {
        type: String,
        enum: ["pending", "resolved"],
        default: "pending"
      },
      supplierNotifiedAt: { type: Date, default: null },
      supplierResponse: { type: String, default: "" },
      supplierRespondedAt: { type: Date, default: null },
      adminDecision: {
        type: String,
        enum: ["none", "warning", "resolved"],
        default: "none"
      },
      adminDecidedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);

