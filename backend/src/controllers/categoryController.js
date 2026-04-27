const Category = require("../models/Category");
const Service = require("../models/Service");
const User = require("../models/User");

const normalizeCode = (name) => {
  const base = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "CAT";
};

const nextCode = async (name) => {
  const prefix = normalizeCode(name).slice(0, 8);
  const existing = await Category.find({ code: new RegExp(`^${prefix}-\\d+$`) }).select("code");
  const nums = existing
    .map((c) => String(c.code || "").split("-").pop())
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(n).padStart(2, "0")}`;
};

const listCategories = async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const q = {};
    if (search) {
      q.$or = [
        { name: new RegExp(search, "i") },
        { code: new RegExp(search, "i") },
        { description: new RegExp(search, "i") }
      ];
    }
    const rows = await Category.find(q).sort({ createdAt: -1 });
    return res.status(200).json(rows.map((c) => ({
      id: c._id,
      name: c.name,
      code: c.code,
      description: c.description,
      active: !!c.active
    })));
  } catch (e) {
    return next(e);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description = "", active = true } = req.body || {};
    const cleanedName = String(name || "").trim();
    if (!cleanedName) return res.status(400).json({ message: "Name is required." });
    const code = await nextCode(cleanedName);
    const row = await Category.create({
      name: cleanedName,
      code,
      description: String(description || "").trim(),
      active: !!active
    });
    return res.status(201).json({
      id: row._id,
      name: row.name,
      code: row.code,
      description: row.description,
      active: !!row.active
    });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: "Category already exists." });
    return next(e);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const row = await Category.findById(req.params.id);
    if (!row) return res.status(404).json({ message: "Category not found." });
    const { name, description, active } = req.body || {};
    if (name !== undefined) row.name = String(name || "").trim();
    if (description !== undefined) row.description = String(description || "").trim();
    if (active !== undefined) row.active = !!active;
    await row.save();
    return res.status(200).json({
      id: row._id,
      name: row.name,
      code: row.code,
      description: row.description,
      active: !!row.active
    });
  } catch (e) {
    return next(e);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const row = await Category.findById(req.params.id);
    if (!row) return res.status(404).json({ message: "Category not found." });
    
    const categoryName = row.name;

    await Category.findByIdAndDelete(req.params.id);

    // Cascading deletes & Freezes
    try {
      await Service.deleteMany({ category: categoryName });
      
      await User.updateMany(
        { 
          role: "supplier", 
          $or: [
            { category: categoryName },
            { serviceCategory: { $regex: new RegExp(`^${categoryName}$`, "i") } }
          ]
        },
        { 
          $set: { 
            isBanned: true, 
            supplierApprovalStatus: "rejected" 
          } 
        }
      );
    } catch (err) {
      console.error("Cascade deletion error:", err.message);
    }

    return res.status(200).json({ message: "Category deleted." });
  } catch (e) {
    return next(e);
  }
};

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };

