const express = require("express");
const requireAdmin = require("../middleware/requireAdmin");
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");

const router = express.Router();

router.get("/", ...requireAdmin, listCategories);
router.post("/", ...requireAdmin, createCategory);
router.put("/:id", ...requireAdmin, updateCategory);
router.delete("/:id", ...requireAdmin, deleteCategory);

module.exports = router;

