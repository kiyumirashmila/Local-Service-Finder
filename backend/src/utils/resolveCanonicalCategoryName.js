const Category = require("../models/Category");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * If a Category row exists whose name matches case-insensitively, return its stored `name`.
 * Otherwise return the trimmed input (allows new names until a Category doc exists).
 */
async function resolveCanonicalCategoryName(raw) {
  const t = String(raw || "").trim();
  if (!t) return t;
  const row = await Category.findOne({ name: new RegExp(`^${escapeRegex(t)}$`, "i") })
    .select("name")
    .lean();
  return row?.name ? String(row.name).trim() : t;
}

/**
 * Canonical display name + Category _id when a row exists (for Service.categoryId link).
 */
async function resolveCategoryRef(raw) {
  const t = String(raw || "").trim();
  if (!t) return { name: t, categoryId: null };
  const row = await Category.findOne({ name: new RegExp(`^${escapeRegex(t)}$`, "i") })
    .select("_id name")
    .lean();
  if (!row?.name) return { name: t, categoryId: null };
  return { name: String(row.name).trim(), categoryId: row._id };
}

module.exports = { resolveCanonicalCategoryName, resolveCategoryRef, escapeRegex };
