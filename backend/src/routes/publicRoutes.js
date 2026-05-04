const express = require("express");
const {
  getRecentApprovedSuppliers,
  getSupplierPublicById,
  getCatalogOptions,
  getGradingConfig,
  getSupplierBookedTimes,
  getActiveDiscountBanner,
  previewDiscount
} = require("../controllers/publicController");

const router = express.Router();

router.get("/suppliers/recent", getRecentApprovedSuppliers);
router.get("/suppliers/:id/booked-times", getSupplierBookedTimes);
router.get("/suppliers/:id", getSupplierPublicById);
router.get("/catalog/options", getCatalogOptions);
router.get("/grading-config", getGradingConfig);
router.get("/discount-banner", getActiveDiscountBanner);
router.post("/discounts/preview", previewDiscount);

module.exports = router;

