const express = require("express");
const {
  getServices,       // GET /api/services
  getServiceById,    // GET /api/services/:id
  createService,     // POST /api/services
  updateService,     // PUT /api/services/:id
  deleteService      // DELETE /api/services/:id
} = require("../controllers/serviceController");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

// GET all services (public, no admin required – but your route may use requireAdmin)
// Note: In your original code, getServices is public, only create/update/delete require admin.
router.route("/")
  .get(getServices)                         // Public read
  .post(...requireAdmin, createService);    // Admin only write

// GET a single service by ID (public)
router.route("/:id").get(getServiceById);

// PUT update and DELETE – both require admin privileges
router.route("/:id")
  .put(...requireAdmin, updateService)
  .delete(...requireAdmin, deleteService);

module.exports = router;