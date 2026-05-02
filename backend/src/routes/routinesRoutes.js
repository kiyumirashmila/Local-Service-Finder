const express = require("express");
const { getRoutines } = require("../controllers/routinesController");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

// GET /api/routines — admin-only endpoint; requires a valid admin JWT
router.get("/", ...requireAdmin, getRoutines);

module.exports = router;
