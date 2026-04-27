const authMiddleware = require("./authMiddleware");

const requireAdmin = (req, res, next) => {
  // Ensure token was already parsed by authMiddleware.
  if (req.auth?.role !== "admin") {
    return res.status(403).json({ message: "Admin access only." });
  }
  return next();
};

// Helper: combine auth middleware + admin role check.
const requireAdminAll = [authMiddleware, requireAdmin];

module.exports = requireAdminAll;

