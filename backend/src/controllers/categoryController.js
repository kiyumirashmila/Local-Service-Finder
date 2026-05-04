const Category = require("../models/Category");
const Service = require("../models/Service");
const User = require("../models/User");
const MarketResearch = require("../models/MarketResearch");
const CatalogRequest = require("../models/CatalogRequest");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Helper: generate a normalized code prefix from category name
// Example: "Plumbing Services" → "PLUMBING-SERVICES"
const normalizeCode = (name) => {
  const base = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "CAT";
};

// Helper: generate unique code like "PLUMBING-01", "PLUMBING-02", ...
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

// READ categories with optional search (by name, code, description)
// GET /api/categories?search=...
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
    // Transform response to match frontend expectations
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

// CREATE a new category
// POST /api/categories
const createCategory = async (req, res, next) => {
  try {
    const { name, description = "", active = true } = req.body || {};
    const cleanedName = String(name || "").trim();
    // Validation: name is required
    if (!cleanedName) return res.status(400).json({ message: "Name is required." });
    // Generate a unique code for the category
    const code = await nextCode(cleanedName);
    // Insert into database
    const row = await Category.create({
      name: cleanedName,
      code,
      description: String(description || "").trim(),
      active: !!active
    });
    // Return the newly created category
    return res.status(201).json({
      id: row._id,
      name: row.name,
      code: row.code,
      description: row.description,
      active: !!row.active
    });
  } catch (e) {
    // Duplicate key error (MongoDB code 11000)
    if (e?.code === 11000) return res.status(409).json({ message: "Category already exists." });
    return next(e);
  }
};

// UPDATE an existing category (by ID)
// PUT /api/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const row = await Category.findById(req.params.id);
    if (!row) return res.status(404).json({ message: "Category not found." });
    const previousName = String(row.name || "").trim();
    const { name, description, active } = req.body || {};
    let nextName = previousName;
    if (name !== undefined) nextName = String(name || "").trim();

    // Update fields only if provided
    if (name !== undefined) row.name = nextName;
    if (description !== undefined) row.description = String(description || "").trim();
    if (active !== undefined) row.active = !!active;
    await row.save();

    // Keep denormalized category strings + Service.categoryId in sync whenever the client sends `name`.
    if (name !== undefined && nextName) {
      const serviceMatch = [{ categoryId: row._id }];
      if (previousName) {
        serviceMatch.push({
          category: new RegExp(`^${escapeRegex(previousName)}$`, "i")
        });
      }
      await Service.updateMany(
        { $or: serviceMatch },
        { $set: { category: nextName, categoryId: row._id } }
      );

      const rxCanon = new RegExp(`^${escapeRegex(nextName)}$`, "i");
      await Service.updateMany(
        { category: rxCanon },
        { $set: { category: nextName, categoryId: row._id } }
      );

      if (previousName) {
        const rxPrev = new RegExp(`^${escapeRegex(previousName)}$`, "i");
        await Promise.all([
          User.updateMany(
            {
              role: "supplier",
              $or: [{ category: rxPrev }, { serviceCategory: rxPrev }]
            },
            { $set: { category: nextName, serviceCategory: nextName } }
          ),
          MarketResearch.updateMany({ category: rxPrev }, { $set: { category: nextName } }),
          CatalogRequest.updateMany({ category: rxPrev }, { $set: { category: nextName } })
        ]);
      }

      await Promise.all([
        User.updateMany(
          {
            role: "supplier",
            $or: [{ category: rxCanon }, { serviceCategory: rxCanon }]
          },
          { $set: { category: nextName, serviceCategory: nextName } }
        ),
        MarketResearch.updateMany({ category: rxCanon }, { $set: { category: nextName } }),
        CatalogRequest.updateMany({ category: rxCanon }, { $set: { category: nextName } })
      ]);
    }

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

// DELETE a category (cascade: remove all its services & ban suppliers)
// DELETE /api/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const row = await Category.findById(req.params.id);
    if (!row) return res.status(404).json({ message: "Category not found." });
    
    const categoryName = row.name;

    // 1. Delete the category itself
    await Category.findByIdAndDelete(req.params.id);

    // 2. Cascade: delete all services that belong to this category
    // This prevents orphaned services
    try {
      await Service.deleteMany({
        $or: [
          { categoryId: row._id },
          { category: new RegExp(`^${escapeRegex(categoryName)}$`, "i") }
        ]
      });
      
      // 3. Cascade: find all suppliers with this category and ban them
      // This freezes their accounts because their category no longer exists
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