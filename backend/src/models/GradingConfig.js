const mongoose = require("mongoose");

const tierSchema = new mongoose.Schema(
  {
    minYears: { type: Number, default: 0 },
    stars: { type: Number, default: 5 },
    priorityBoost: { type: Number, default: 50 },
    priceRangeMin: { type: Number, default: 0 },
    priceRangeMax: { type: Number, default: 100 },
    label: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const gradingConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true, trim: true },
    A: tierSchema,
    B: tierSchema,
    C: tierSchema
  },
  { timestamps: true }
);

module.exports = mongoose.model("GradingConfig", gradingConfigSchema);
