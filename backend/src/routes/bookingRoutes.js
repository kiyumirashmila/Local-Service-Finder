const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createBooking,
  listMyBookings,
  updateBookingStatus,
  payBooking,
  createBookingReview,
  updateBookingReview,
  deleteBookingReview,
  createBookingComplaint,
  updateBookingComplaint,
  deleteBookingComplaint,
  deleteBooking,
  supplierRespondToComplaint
} = require("../controllers/bookingController");
const { complaintEvidenceUpload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createBooking);
router.get("/me", authMiddleware, listMyBookings);
router.post("/:id/pay", authMiddleware, payBooking);
router.put("/:id/status", authMiddleware, updateBookingStatus);
router.delete("/:id", authMiddleware, deleteBooking);
router.post("/:id/review", authMiddleware, createBookingReview);
router.put("/:id/review", authMiddleware, updateBookingReview);
router.delete("/:id/review", authMiddleware, deleteBookingReview);
router.post(
  "/:id/complaint",
  authMiddleware,
  complaintEvidenceUpload.single("evidence"),
  (req, _res, next) => {
    req.complaintEvidenceFile = req.file;
    next();
  },
  createBookingComplaint
);
router.put(
  "/:id/complaint",
  authMiddleware,
  complaintEvidenceUpload.single("evidence"),
  (req, _res, next) => {
    req.complaintEvidenceFile = req.file;
    next();
  },
  updateBookingComplaint
);
router.delete("/:id/complaint", authMiddleware, deleteBookingComplaint);
router.post("/:id/complaint/respond", authMiddleware, supplierRespondToComplaint);

module.exports = router;

