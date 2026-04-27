const mongoose = require("mongoose");

const marketResearchSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    service: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    minRatePerHour: { type: Number, required: true },
    maxRatePerHour: { type: Number, required: true },
    currency: { type: String, default: "LKR", trim: true },
    updatedBy: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

marketResearchSchema.index({ category: 1, service: 1 }, { unique: true });

module.exports = mongoose.model("MarketResearch", marketResearchSchema);
