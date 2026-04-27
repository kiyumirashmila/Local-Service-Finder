const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

const CERTS_DIR = path.join(__dirname, "..", "..", "uploads", "certificates");
const PROFILE_PICS_DIR = path.join(__dirname, "..", "..", "uploads", "profile_pictures");
const COMPLAINTS_DIR = path.join(__dirname, "..", "..", "uploads", "complaints");
ensureDir(CERTS_DIR);
ensureDir(PROFILE_PICS_DIR);
ensureDir(COMPLAINTS_DIR);

const makeUniqueFilename = (originalName, defaultExt) => {
  const ext = path.extname(originalName || "") || defaultExt;
  const base = path.basename(originalName || "file", ext);
  const safeBase = base.replace(/[^a-z0-9_-]/gi, "");
  const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${safeBase || "file"}_${unique}${ext}`;
};

// Parse BOTH supplier upload fields in a single middleware.
// This avoids multipart stream issues that happen when chaining two multers.
const supplierSignupUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      if (file.fieldname === "experienceCertificate") return cb(null, CERTS_DIR);
      return cb(null, PROFILE_PICS_DIR);
    },
    filename: function (req, file, cb) {
      const defaultExt = file.fieldname === "experienceCertificate" ? ".pdf" : ".png";
      cb(null, makeUniqueFilename(file.originalname, defaultExt));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB each (roughly)
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "profilePicture") {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowed.includes(file.mimetype)) return cb(null, true);
      return cb(new Error("Invalid profile picture type. Upload an image."), false);
    }

    if (file.fieldname === "experienceCertificate") {
      const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowed.includes(file.mimetype)) return cb(null, true);
      return cb(new Error("Invalid experience certificate type. Upload a PDF or image."), false);
    }

    return cb(new Error("Unexpected upload field."), false);
  }
});

const complaintEvidenceUpload = multer({
  storage: multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, COMPLAINTS_DIR);
    },
    filename: function (_req, file, cb) {
      cb(null, makeUniqueFilename(file.originalname, ".pdf"));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Invalid evidence type. Upload image, PDF, DOC, or DOCX."), false);
  }
});

module.exports = {
  supplierSignupUpload,
  complaintEvidenceUpload
};

