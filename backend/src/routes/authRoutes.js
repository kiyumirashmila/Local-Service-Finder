const express = require("express");
const {
  signupCustomer,
  signupSupplier,
  loginUser,
  login,
  getMe,
  updateCustomerProfile,
  updateSupplierProfile,
  deleteMyAccount,
  changePassword
} = require("../controllers/authController");
const { supplierSignupUpload } = require("../middleware/uploadMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup/customer", signupCustomer);

router.post(
  "/signup/supplier",
  supplierSignupUpload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "experienceCertificate", maxCount: 5 }
  ]),
  (req, res, next) => {
    req.profilePictureFile = req.files?.profilePicture?.[0];
    next();
  },
  (req, res, next) => {
    req.experienceCertificateFiles = req.files?.experienceCertificate || [];
    next();
  },
  signupSupplier
);

router.post("/login/customer", loginUser);
router.post("/login", login);

router.get("/me", authMiddleware, getMe);

router.put("/profile/customer", authMiddleware, updateCustomerProfile);
router.put(
  "/profile/supplier",
  authMiddleware,
  supplierSignupUpload.single("profilePicture"),
  (req, res, next) => {
    req.profilePictureFile = req.file;
    next();
  },
  updateSupplierProfile
);
router.put("/profile/password", authMiddleware, changePassword);
router.delete("/profile/me", authMiddleware, deleteMyAccount);

module.exports = router;

