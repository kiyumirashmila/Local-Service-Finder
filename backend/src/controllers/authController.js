const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const cloudinary = require("../config/cloudinary");
const { signToken } = require("../config/jwt");
const User = require("../models/User");

const serializeUser = (userDoc) => {
  const user = userDoc.toObject ? userDoc.toObject() : userDoc;
  return {
    id: user._id,
    role: user.role,
    name: user.fullName,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    city: user.city,
    district: user.district || "",
    avatar: user.avatarUrl || "",
    avatarUrl: user.avatarUrl || "",
    serviceCategory: user.serviceCategory || "",
    serviceCategoryOther: user.serviceCategoryOther || "",
    category: user.category || user.serviceCategory || "",
    services: Array.isArray(user.services) ? user.services : [],
    serviceOther: user.serviceOther || "",
    servicesRates: user.servicesRates ? Object.fromEntries(user.servicesRates) : {},
    scratchCoupons: Array.isArray(user.scratchCoupons)
      ? user.scratchCoupons.map((c) => ({
          code: String(c?.code || "").trim().toUpperCase(),
          type: c?.type === "fixed" ? "fixed" : "percentage",
          value: Number(c?.value || 0),
          isUsed: Boolean(c?.isUsed),
          awardedAt: c?.awardedAt || null,
          usedAt: c?.usedAt || null
        }))
      : [],
    yearsOfExperience: user.yearsOfExperience || 0,
    monthsOfExperience: user.monthsOfExperience || 0,
    nic: user.nic || "",
    bio: user.bio || "",
    experienceCertificateUrl: user.experienceCertificateUrl || "",
    experienceCertificates: user.experienceCertificates || (user.experienceCertificateUrl ? [user.experienceCertificateUrl] : []),
    supplierApprovalStatus: user.supplierApprovalStatus || undefined,
    supplierGrading: user.supplierGrading || null,
    averageRating: Number(user.averageRating || 0),
    totalRatings: Number(user.totalRatings || 0),
    xp: Number(user.xp || 0),
    tierLevel: user.tierLevel || "Bronze",
    warningCount: Number(user.warningCount || 0),
    isBanned: Boolean(user.isBanned)
  };
};

const uploadBufferToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const streamUpload = cloudinary.uploader.upload_stream(
      { folder: "supplier_profile_pictures" },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    streamUpload.end(buffer);
  });
};

const validateEmail = (email) => typeof email === "string" && email.includes("@");

const validateField = (name, value, context = {}) => {
  switch (name) {
    case 'fullName':
      if (!value) return 'Full Name is required';
      if (value.length < 3) return 'Minimum 3 chars';
      if (!/^[A-Za-z\s]+$/.test(value)) return 'Only letters and spaces';
      return '';
    case 'email':
      if (!value) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Valid email format required';
      return '';
    case 'phone':
      if (!value) return 'Phone is required';
      if (!/^07\d{8}$/.test(value)) return 'Valid SL number (07x, 10 digits)';
      return '';
    case 'address':
      if (!value || value.length < 10) return 'Min 10 characters required';
      return '';
    case 'city':
      if (!value) return 'City is required';
      if (!/^[A-Za-z\s]+$/.test(value)) return 'Only letters allowed';
      return '';
    case 'district':
      if (!value) return 'District is required';
      if (!/^[A-Za-z\s-]+$/.test(value)) return 'Only letters allowed';
      return '';
    case 'nic':
      if (!value) return 'NIC is required';
      if (!/^([0-9]{9}[vVxX]|[0-9]{12})$/.test(value)) return 'Invalid NIC format';
      return '';
    case 'yearsOfExperience':
      if (value === '' || value === undefined) return 'Required';
      if (Number(value) < 0 || Number(value) > 50) return '0 to 50';
      return '';
    case 'monthsOfExperience':
      if (value === '' || value === undefined) return 'Required';
      if (Number(value) < 0 || Number(value) > 11) return '0 to 11';
      return '';
    case 'bio':
      if (!value) return 'Required';
      if (value.length < 20) return 'Min 20 chars';
      if (value.length > 300) return 'Max 300 chars';
      return '';
    case 'category':
      if (!value) return 'Category is required';
      return '';
    case 'categoryOther':
      if (context.category === 'other' && !value) return 'New category is required';
      return '';
    case 'services':
      if (!value || value.length === 0) return 'At least one service is required';
      return '';
    default:
      return '';
  }
};

const validateCustomerField = (name, value, context = {}) => {
  switch (name) {
    case 'fullName':
      if (!value || !String(value).trim()) return 'Full name is required.';
      if (String(value).trim().length < 3) return 'Full name must be at least 3 characters.';
      if (!/^[A-Za-z\s]+$/.test(String(value).trim())) return 'Full name can contain letters and spaces only.';
      return '';
    case 'email':
      if (!value || !String(value).trim()) return 'Email address is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) return 'Enter a valid email (example@domain.com).';
      return '';
    case 'phone':
      if (!value || !String(value).trim()) return 'Phone number is required.';
      if (!/^07\d{8}$/.test(String(value).trim())) return 'Use a valid Sri Lankan phone (starts with 07 and 10 digits).';
      return '';
    case 'city':
      if (!value || !String(value).trim()) return 'City is required.';
      if (!/^[A-Za-z\s]+$/.test(String(value).trim())) return 'City can contain letters and spaces only.';
      return '';
    case 'district':
      if (!value || !String(value).trim()) return 'District is required.';
      if (!/^[A-Za-z\s-]+$/.test(String(value).trim())) return 'District can contain letters and spaces only.';
      return '';
    case 'address':
      if (!value || !String(value).trim()) return 'Address is required.';
      return '';
    case 'password':
      if (!value) return 'Password is required.';
      if (
        value.length < 8 ||
        !/[A-Z]/.test(value) ||
        !/[a-z]/.test(value) ||
        !/\d/.test(value) ||
        !/[^A-Za-z0-9]/.test(value)
      ) {
        return 'Password must be 8+ chars and include uppercase, lowercase, number, and special character.';
      }
      return '';
    case 'confirmPassword':
      if (!value) return 'Confirm password is required.';
      if (value !== context.password) return 'Confirm password must match Password.';
      return '';
    case 'termsAccepted':
      if (!value) return 'You must accept the terms and conditions.';
      return '';
    default:
      return '';
  }
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@admin.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin@123";
const ADMIN2_EMAIL = process.env.ADMIN2_EMAIL || "admin2@admin.com";
const ADMIN2_PASSWORD = process.env.ADMIN2_PASSWORD || "admin2@123";

const buildAdminUser = (adminEmail) => ({
  id: "admin",
  role: "admin",
  name: "Admin",
  fullName: "Admin",
  email: adminEmail,
  phone: "",
  address: "",
  city: "",
  avatar: "",
  avatarUrl: "",
  serviceCategory: "",
  yearsOfExperience: 0,
  supplierApprovalStatus: undefined
});

const signupCustomer = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      address,
      city,
      district,
      termsAccepted,
      avatarUrl
    } = req.body;

    const validationErrors = [
      validateCustomerField('fullName', fullName),
      validateCustomerField('email', email),
      validateCustomerField('phone', phone),
      validateCustomerField('password', password),
      validateCustomerField('confirmPassword', confirmPassword, { password }),
      validateCustomerField('address', address),
      validateCustomerField('city', city),
      validateCustomerField('district', district),
      validateCustomerField('termsAccepted', termsAccepted)
    ].filter(Boolean);

    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0] });
    }

    const emailExists = await User.findOne({ email: String(email).toLowerCase() });
    if (emailExists) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      role: "customer",
      fullName,
      email: String(email).toLowerCase(),
      phone,
      passwordHash,
      address,
      city,
      district: String(district || "").trim(),
      avatarUrl: avatarUrl || ""
    });

    const token = signToken({ userId: user._id, role: user.role });
    return res.status(201).json({ user: serializeUser(user), token });
  } catch (error) {
    return next(error);
  }
};

const signupSupplier = async (req, res, next) => {
  try {
    // Fields come from multipart/form-data, while files come from multer.
    const {
      fullName,
      email,
      phone,
      address,
      city,
      district,
      category,
      services,
      serviceOther,
      serviceCategory,
      serviceCategoryOther,
      yearsOfExperience,
      monthsOfExperience,
      nic,
      bio
    } = req.body;

    const profilePictureFile = req.profilePictureFile; // set by the route wrapper
    const experienceCertificateFiles = req.experienceCertificateFiles; // set by the route wrapper

    const validationErrors = [
      validateField('fullName', fullName),
      validateField('email', email),
      validateField('phone', phone),
      validateField('address', address),
      validateField('city', city),
      validateField('district', district),
      validateField('nic', nic),
      validateField('yearsOfExperience', yearsOfExperience),
      validateField('monthsOfExperience', monthsOfExperience),
      validateField('bio', bio)
    ].filter(Boolean);

    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0] });
    }

    const parsedServices = (() => {
      if (Array.isArray(services)) return services.map((s) => String(s).trim()).filter(Boolean);
      if (typeof services === "string") {
        try {
          const arr = JSON.parse(services);
          if (Array.isArray(arr)) return arr.map((s) => String(s).trim()).filter(Boolean);
        } catch (_e) {
          // ignore
        }
      }
      return [];
    })();

    const resolvedCategory = String(category || serviceCategory || "").trim();
    if (!resolvedCategory) {
      return res.status(400).json({ message: "Please provide a category." });
    }

    const allowedCategories = ["plumber", "electrician", "cleaner", "carpenter", "other"];
    const normalizedServiceCategory = String(serviceCategory || "").toLowerCase();
    if (!normalizedServiceCategory || !allowedCategories.includes(normalizedServiceCategory)) {
      return res.status(400).json({ message: "Invalid service category." });
    }

    if (normalizedServiceCategory === "other" && !serviceCategoryOther && !category) {
      return res.status(400).json({ message: "Please specify the other service type." });
    }

    if (!parsedServices.length && !String(serviceOther || "").trim()) {
      return res.status(400).json({ message: "Please provide at least one service." });
    }

    const years = Number(yearsOfExperience);

    if (!profilePictureFile) {
      return res.status(400).json({ message: "Please upload a profile picture." });
    }

    if (!experienceCertificateFiles || experienceCertificateFiles.length === 0) {
      return res.status(400).json({ message: "Please upload at least one experience certificate." });
    }

    const emailExists = await User.findOne({ email: String(email).toLowerCase() });
    if (emailExists) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    let avatarUrl = "";
    if (profilePictureFile) {
      if (!profilePictureFile.path) {
        return res.status(400).json({ message: "Invalid profile picture upload." });
      }
      const buffer = fs.readFileSync(profilePictureFile.path);
      const result = await uploadBufferToCloudinary(buffer);
      avatarUrl = result?.secure_url || "";
    }

    let experienceCertificates = [];
    if (experienceCertificateFiles && experienceCertificateFiles.length > 0) {
      for (const file of experienceCertificateFiles) {
        if (file.filename) {
          experienceCertificates.push(`${req.protocol}://${req.get("host")}/uploads/certificates/${file.filename}`);
        } else if (file.path) {
          experienceCertificates.push(`/uploads/certificates/${path.basename(file.path)}`);
        }
      }
    }
    const experienceCertificateUrl = experienceCertificates[0] || "";

    const user = await User.create({
      role: "supplier",
      fullName,
      email: String(email).toLowerCase(),
      phone,
      address,
      city,
      district: String(district || "").trim(),

      avatarUrl,
      category: resolvedCategory,
      serviceCategory: normalizedServiceCategory,
      serviceCategoryOther: serviceCategoryOther || (normalizedServiceCategory === "other" ? resolvedCategory : ""),
      services: parsedServices.length ? parsedServices : [String(serviceOther || "").trim()].filter(Boolean),
      serviceOther: String(serviceOther || "").trim(),
      yearsOfExperience: years,
      monthsOfExperience: Number(monthsOfExperience) || 0,
      nic: String(nic || "").trim(),
      bio,
      experienceCertificateUrl,
      experienceCertificates
    });

    // Supplier applications are created as "pending" and do not log in yet.
    return res.status(201).json({
      message: "Your application is under review.",
      supplierId: user._id
    });
  } catch (error) {
    return next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password." });
    }

    const user = await User.findOne({
      email: String(email).toLowerCase(),
      role: { $in: ["customer", "supplier"] }
    }).select("+passwordHash supplierApprovalStatus role");

    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    if (user.role === "supplier") {
      if (user.isBanned) {
        return res.status(403).json({ message: "Your supplier account is banned." });
      }
      if (user.supplierApprovalStatus !== "approved" || !user.passwordHash) {
        return res.status(403).json({ message: "Your application is under review." });
      }
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials." });

    const token = signToken({ userId: user._id, role: user.role });
    return res.status(200).json({ user: serializeUser(user), token });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password." });
    }

    const normalizedEmail = String(email).toLowerCase();
    const isAdmin1 = normalizedEmail === String(ADMIN_EMAIL).toLowerCase() && password === ADMIN_PASSWORD;
    const isAdmin2 = normalizedEmail === String(ADMIN2_EMAIL).toLowerCase() && password === ADMIN2_PASSWORD;

    if (isAdmin1 || isAdmin2) {
      const adminEmail = isAdmin2 ? ADMIN2_EMAIL : ADMIN_EMAIL;
      const token = signToken({ role: "admin", adminEmail });
      return res.status(200).json({
        user: buildAdminUser(adminEmail),
        token
      });
    }

    // Fallback: customer or supplier login.
    return loginUser(req, res, next);
  } catch (error) {
    return next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    if (req.auth.role === "admin") {
      const adminEmail = req.auth.adminEmail || ADMIN_EMAIL;
      return res.status(200).json({
        user: buildAdminUser(adminEmail)
      });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json({ user: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
};

const updateCustomerProfile = async (req, res, next) => {
  try {
    if (req.auth.role !== "customer") return res.status(403).json({ message: "Customer access only." });

    const {
      fullName,
      phone,
      address,
      city,
      district,
      avatarUrl
      // email intentionally not editable in this endpoint for safety
    } = req.body;

    const validationErrors = [
      validateCustomerField('fullName', fullName),
      validateCustomerField('phone', phone),
      validateCustomerField('address', address),
      validateCustomerField('city', city),
      validateCustomerField('district', district)
    ].filter(Boolean);

    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0] });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.fullName = fullName;
    user.phone = phone;
    user.address = address;
    user.city = city;
    user.district = district;
    if (typeof avatarUrl === "string") {
      user.avatarUrl = avatarUrl;
    }

    await user.save();

    return res.status(200).json({ user: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
};

const updateSupplierProfile = async (req, res, next) => {
  try {
    if (req.auth.role !== "supplier") return res.status(403).json({ message: "Supplier access only." });

    const {
      fullName,
      phone,
      address,
      city,
      district,
      category,
      services,
      serviceOther,
      servicesRates,
      serviceCategory,
      serviceCategoryOther,
      yearsOfExperience,
      monthsOfExperience,
      nic,
      bio
    } = req.body;

    const parsedServices = (() => {
      if (Array.isArray(services)) return services.map((s) => String(s).trim()).filter(Boolean);
      if (typeof services === "string") {
        try {
          const parsed = JSON.parse(services);
          if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
        } catch (_e) {
          return [];
        }
      }
      return [];
    })();

    const allServices = [...parsedServices, ...(serviceOther ? [String(serviceOther).trim()] : [])].filter(Boolean);

    let parsedRates = {};
    if (typeof servicesRates === 'string') {
      try {
        const parsed = JSON.parse(servicesRates);
        if (typeof parsed === 'object' && parsed !== null) {
          parsedRates = parsed;
        }
      } catch (_e) { }
    }

    const validationErrors = [
      validateField('fullName', fullName),
      validateField('phone', phone),
      validateField('address', address),
      validateField('city', city),
      validateField('nic', nic),
      validateField('yearsOfExperience', yearsOfExperience),
      validateField('monthsOfExperience', monthsOfExperience),
      validateField('bio', bio)
    ].filter(Boolean);
    if (district !== undefined) {
      const districtError = validateField('district', district);
      if (districtError) validationErrors.push(districtError);
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0] });
    }

    if (!allServices.length) {
      return res.status(400).json({ message: "At least one service is required" });
    }

    // Rates are optional during profile save — managed via Price List tab.
    // Only validate rates that are actually provided.
    for (const [svc, rate] of Object.entries(parsedRates)) {
       if (rate === '' || rate === undefined || rate === null) continue;
       const r = Number(rate);
       if (Number.isNaN(r) || r < 0 || r > 100000) {
         return res.status(400).json({ message: `Rate for "${svc}" must be a valid number between LKR 0 and LKR 100000` });
       }
    }

    const allowedCategories = ["plumber", "electrician", "cleaner", "carpenter", "other"];
    if (!allowedCategories.includes(serviceCategory)) {
      return res.status(400).json({ message: "Invalid service category." });
    }
    if (serviceCategory === "other" && !serviceCategoryOther) {
      return res.status(400).json({ message: "Please specify the other service type." });
    }

    const years = Number(yearsOfExperience);

    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.fullName = fullName;
    user.phone = phone;
    user.address = address;
    user.city = city;
    if (district !== undefined) user.district = String(district || "").trim();
    user.category = String(category || serviceCategory).trim();
    user.serviceCategory = serviceCategory;
    user.serviceCategoryOther = serviceCategory === "other" ? String(serviceCategoryOther) : "";
    user.services = parsedServices;
    user.serviceOther = String(serviceOther || "").trim();
    user.servicesRates = parsedRates;
    user.yearsOfExperience = years;
    user.monthsOfExperience = Number(monthsOfExperience) || 0;
    user.nic = String(nic || "").trim();
    user.bio = bio;

    if (req.profilePictureFile?.path) {
      const buffer = fs.readFileSync(req.profilePictureFile.path);
      const result = await uploadBufferToCloudinary(buffer);
      user.avatarUrl = result?.secure_url || user.avatarUrl;
    }

    await user.save();
    return res.status(200).json({ user: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
};

const deleteMyAccount = async (req, res, next) => {
  try {
    if (!req.auth?.userId) return res.status(401).json({ message: "Unauthorized." });
    if (req.auth.role === "admin") return res.status(403).json({ message: "Admin account cannot be deleted here." });

    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    await User.findByIdAndDelete(req.auth.userId);
    return res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    if (!req.auth?.userId) return res.status(401).json({ message: "Unauthorized." });
    if (req.auth.role === "admin") {
      return res.status(403).json({ message: "Admin password cannot be changed here." });
    }

    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ message: "Current password is required." });
    }

    const validationErrors = [
      validateCustomerField('password', newPassword),
      validateCustomerField('confirmPassword', confirmNewPassword, { password: newPassword })
    ].filter(Boolean);

    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0] });
    }

    const user = await User.findById(req.auth.userId).select("+passwordHash role");
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.passwordHash) {
      return res.status(400).json({ message: "Password is not set for this account yet." });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Current password is incorrect." });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  signupCustomer,
  signupSupplier,
  loginUser,
  login,
  getMe,
  updateCustomerProfile,
  updateSupplierProfile,
  deleteMyAccount,
  changePassword
};

