const cloudinary = require("cloudinary").v2;

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET
} = process.env;

// Cloudinary credentials are required only for supplier signup uploads.
// Guard here so the server can still start even if env vars aren't configured yet.
if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
  });
} else {
  // eslint-disable-next-line no-console
  console.warn("Cloudinary env vars are missing. Supplier profile picture upload will fail until configured.");
}

module.exports = cloudinary;

