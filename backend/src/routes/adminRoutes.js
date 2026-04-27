const express = require("express");
const requireAdmin = require("../middleware/requireAdmin");
const {
  getSuppliers,
  approveSupplier,
  rejectSupplier,
  updateSupplierGrading,
  sendSupplierCredentials,
  updateSupplierByAdmin,
  createCatalogRequest,
  listCatalogRequests,
  countPendingCatalogRequests,
  updateCatalogRequest,
  completeCatalogRequest,
  listMarketResearch,
  upsertMarketResearch,
  deleteMarketResearch,
  getAdminCatalogOptions,
  listAdminServices,
  listAdminBookings,
  listAdminReviews,
  deleteAdminReview,
  putGradingConfig,
  listComplaints,
  updateComplaintStatus,
  notifyComplaintSupplier,
  decideComplaint,
  deleteComplaint,
  recoverSupplierProfile,
  createDiscount,
  listDiscounts
} = require("../controllers/adminController");

const router = express.Router();

router.get("/suppliers", ...requireAdmin, getSuppliers);

router.put("/suppliers/:id/approve", ...requireAdmin, approveSupplier);

router.put("/suppliers/:id/reject", ...requireAdmin, rejectSupplier);

router.put("/suppliers/:id/grading", ...requireAdmin, updateSupplierGrading);
router.put("/suppliers/:id", ...requireAdmin, updateSupplierByAdmin);

router.post("/suppliers/:id/send-credentials", ...requireAdmin, sendSupplierCredentials);
router.post("/suppliers/:id/recover", ...requireAdmin, recoverSupplierProfile);
router.post("/discounts", ...requireAdmin, createDiscount);
router.get("/discounts", ...requireAdmin, listDiscounts);

router.post("/catalog/requests", ...requireAdmin, createCatalogRequest);
router.get("/catalog/requests", ...requireAdmin, listCatalogRequests);
router.get("/catalog/requests/count", ...requireAdmin, countPendingCatalogRequests);
router.put("/catalog/requests/:id", ...requireAdmin, updateCatalogRequest);
router.post("/catalog/requests/:id/complete", ...requireAdmin, completeCatalogRequest);
router.get("/market-research", ...requireAdmin, listMarketResearch);
router.post("/market-research", ...requireAdmin, upsertMarketResearch);
router.delete("/market-research/:id", ...requireAdmin, deleteMarketResearch);

router.get("/catalog/options", ...requireAdmin, getAdminCatalogOptions);
router.get("/services", ...requireAdmin, listAdminServices);
router.get("/bookings", ...requireAdmin, listAdminBookings);
router.get("/reviews", ...requireAdmin, listAdminReviews);
router.delete("/reviews/:id", ...requireAdmin, deleteAdminReview);
router.put("/grading-config", ...requireAdmin, putGradingConfig);

// Placeholders for future modules.
router.get("/catalog", ...requireAdmin, (req, res) => res.status(200).json({ message: "Use /catalog/requests APIs." }));
router.get("/complaints", ...requireAdmin, listComplaints);
router.put("/complaints/:id/status", ...requireAdmin, updateComplaintStatus);
router.post("/complaints/:id/notify-supplier", ...requireAdmin, notifyComplaintSupplier);
router.post("/complaints/:id/decision", ...requireAdmin, decideComplaint);
router.delete("/complaints/:id", ...requireAdmin, deleteComplaint);

module.exports = router;

