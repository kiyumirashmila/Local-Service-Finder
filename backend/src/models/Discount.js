const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    type: { type: String, enum: ["percentage", "fixed"], required: true, default: "percentage" },
    value: { type: Number, required: true, min: 0 },
    maxUses: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    usesCount: { type: Number, default: 0, min: 0 },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Discount", discountSchema);
