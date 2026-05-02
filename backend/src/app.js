const express = require("express");
const cors = require("cors");
const serviceRoutes = require("./routes/serviceRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const publicRoutes = require("./routes/publicRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const routinesRoutes = require("./routes/routinesRoutes");
const path = require("path");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files (experience certificates).
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"))
);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/services", serviceRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/routines", routinesRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

