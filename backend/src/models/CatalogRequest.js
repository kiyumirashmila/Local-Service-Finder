const mongoose = require("mongoose");

const catalogRequestSchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    supplierName: { type: String, default: "" },
    category: { type: String, required: true, trim: true },
    categoryDescription: { type: String, default: "", trim: true },
    services: [{ type: String, trim: true }],
    serviceDescription: { type: String, default: "", trim: true },
    serviceDescriptions: [
      {
        service: { type: String, trim: true, default: "" },
        description: { type: String, default: "", trim: true }
      }
    ],
    minRatePerHour: { type: Number, default: null },
    maxRatePerHour: { type: Number, default: null },
    serviceRates: [
      {
        service: { type: String, trim: true, default: "" },
        minRatePerHour: { type: Number, default: null },
        maxRatePerHour: { type: Number, default: null }
      }
    ],
    currency: { type: String, default: "LKR", trim: true },
    status: { type: String, enum: ["pending", "in_review", "completed"], default: "pending" },
    requestedBy: { type: String, default: "", trim: true },
    handledBy: { type: String, default: "", trim: true },
    requestKey: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

catalogRequestSchema.index({ requestKey: 1, status: 1 });

module.exports = mongoose.model("CatalogRequest", catalogRequestSchema);
