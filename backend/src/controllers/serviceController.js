const Service = require("../models/Service");

const getServices = async (req, res, next) => {
  try {
    const { search = "", category = "", location = "" } = req.query;

    // Ensure seeded demo data exists (serviceSeeder.js).
    const { seedDatabase, SEED_DATA } = require("../../serviceSeeder");
    const existingCount = await Service.countDocuments();
    if (existingCount < SEED_DATA.length) {
      await seedDatabase({ clearExisting: true });
    }

    const activeOnly = { $or: [{ active: { $ne: false } }, { active: { $exists: false } }] };
    const parts = [activeOnly];
    if (category) parts.push({ category: new RegExp(category, "i") });
    if (location) parts.push({ location: new RegExp(location, "i") });
    if (search) {
      parts.push({
        $or: [
          { title: new RegExp(search, "i") },
          { providerName: new RegExp(search, "i") },
          { description: new RegExp(search, "i") }
        ]
      });
    }
    const filters = parts.length > 1 ? { $and: parts } : parts[0];

    const services = await Service.find(filters).sort({ createdAt: -1 });
    res.status(200).json(services);
  } catch (error) {
    next(error);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      res.status(404);
      throw new Error("Service not found");
    }
    res.status(200).json(service);
  } catch (error) {
    next(error);
  }
};

const createService = async (req, res, next) => {
  try {
    const { title, providerName, category, location, contact, description, durationMinutes, skillLevel, active } = req.body;

    if (!title || !providerName || !category || !location || !contact) {
      res.status(400);
      throw new Error("Please provide all required fields");
    }

    const service = await Service.create({
      title,
      providerName,
      category,
      location,
      contact,
      description,
      durationMinutes: Number(durationMinutes) || 60,
      skillLevel: skillLevel || "Intermediate",
      active: active !== false
    });

    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const { title, providerName, category, location, contact, description, experience, durationMinutes, skillLevel, active } =
      req.body || {};
    if (title !== undefined) service.title = title;
    if (providerName !== undefined) service.providerName = providerName;
    if (category !== undefined) service.category = category;
    if (location !== undefined) service.location = location;
    if (contact !== undefined) service.contact = contact;
    if (description !== undefined) service.description = description;
    if (experience !== undefined) service.experience = experience;
    if (durationMinutes !== undefined) service.durationMinutes = Number(durationMinutes) || service.durationMinutes;
    if (skillLevel !== undefined) service.skillLevel = skillLevel;
    if (active !== undefined) service.active = !!active;

    await service.save();
    return res.status(200).json(service);
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    await Service.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Service deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};
