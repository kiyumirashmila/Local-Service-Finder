require("dotenv").config();
const mongoose = require("mongoose");
const Service = require("./src/models/Service");

const SEED_DATA = [
  {
    title: "Plumbing Service",
    providerName: "FlowRite Plumbing Inc",
    category: "Plumbing",
    location: "Colombo",
    contact: "0771234567",
    experience: "5 years"
  },
  {
    title: "Leak Fix & Tap Repair",
    providerName: "FlowRite Plumbing Inc",
    category: "Plumbing",
    location: "Malabe",
    contact: "0771234567",
    experience: "6 years"
  },
  {
    title: "Home Cleaning",
    providerName: "Spark Maid Squad",
    category: "Cleaning",
    location: "Colombo",
    contact: "0715551234",
    experience: "4 years"
  },
  {
    title: "Deep Cleaning (Kitchen & Bath)",
    providerName: "Spark Maid Squad",
    category: "Cleaning",
    location: "Kandy",
    contact: "0715551234",
    experience: "5 years"
  },
  {
    title: "Electrical Repair",
    providerName: "Watts Up Electrical",
    category: "Electrical",
    location: "Colombo",
    contact: "0778880099",
    experience: "7 years"
  },
  {
    title: "Fan / Switch Installation",
    providerName: "Watts Up Electrical",
    category: "Electrical",
    location: "Negombo",
    contact: "0778880099",
    experience: "4 years"
  },
  {
    title: "Handyman Repairs",
    providerName: "The Fix-It Pro",
    category: "Handyman",
    location: "Colombo",
    contact: "0754442233",
    experience: "8 years"
  },
  {
    title: "General Maintenance",
    providerName: "The Fix-It Pro",
    category: "Handyman",
    location: "Malabe",
    contact: "0754442233",
    experience: "6 years"
  }
];

const seedDatabase = async ({ clearExisting = false } = {}) => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    if (clearExisting) {
      await Service.deleteMany();
    }

    // Insert only if collection is empty when clearExisting=false
    if (!clearExisting) {
      const count = await Service.countDocuments();
      if (count > 0) return { inserted: 0, data: SEED_DATA };
    }

    await Service.insertMany(SEED_DATA);
    return { inserted: SEED_DATA.length, data: SEED_DATA };
  } catch (error) {
    throw error;
  }
};

// Keep the old behavior for `node serviceSeeder.js`
if (require.main === module) {
  seedDatabase({ clearExisting: true })
    .then(() => {
      console.log("✅ Dummy data inserted");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  SEED_DATA,
  seedDatabase
};