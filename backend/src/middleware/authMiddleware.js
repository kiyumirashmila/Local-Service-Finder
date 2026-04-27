const { verifyToken } = require("../config/jwt");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing Authorization token." });

    const decoded = verifyToken(token);
    const role = decoded.role;

    // Admin tokens don't need a User document in MongoDB.
    if (role === "admin") {
      req.auth = { role: "admin", adminEmail: decoded.adminEmail || undefined };
      return next();
    }

    const userId = decoded.userId;
    if (!userId) return res.status(401).json({ message: "Invalid token payload." });

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "User no longer exists." });

    req.auth = { userId, role: user.role };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = authMiddleware;

