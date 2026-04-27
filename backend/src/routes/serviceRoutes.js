const express = require("express");
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} = require("../controllers/serviceController");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.route("/").get(getServices).post(...requireAdmin, createService);
router.route("/:id").get(getServiceById);
router.route("/:id").put(...requireAdmin, updateService).delete(...requireAdmin, deleteService);

module.exports = router;
