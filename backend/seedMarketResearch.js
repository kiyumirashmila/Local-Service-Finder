const mongoose = require('mongoose');
const MarketResearch = require('./src/models/MarketResearch');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localservicefinder';

const data = [
  { category: "Plumber", service: "Tap & Leak Repair", min: 1200, max: 3000 },
  { category: "Plumber", service: "Commode/Sink Installation", min: 1800, max: 4500 },
  { category: "Plumber", service: "Drainage & Gully Cleaning", min: 1500, max: 4000 },
  { category: "Plumber", service: "Hot Water (Geyser) Service", min: 2500, max: 6000 },
  { category: "Electrician", service: "Fan & Light Installation", min: 1500, max: 3500 },
  { category: "Electrician", service: "DB Box/Circuit Troubleshooting", min: 2000, max: 5500 },
  { category: "Electrician", service: "Industrial/3-Phase Wiring", min: 4000, max: 10000 },
  { category: "Carpenter", service: "Door & Window Repair", min: 1500, max: 4000 },
  { category: "Carpenter", service: "Pantry Cupboard Refurbishing", min: 2000, max: 5500 },
  { category: "Carpenter", service: "Furniture Assembly (Flat-pack)", min: 1200, max: 3000 },
  { category: "Cleaner", service: "Full House Deep Cleaning", min: 1500, max: 3500 },
  { category: "Cleaner", service: "Sofa/Upholstery Shampooing", min: 2000, max: 5000 },
  { category: "Cleaner", service: "Office/Commercial Janitorial", min: 1000, max: 2500 },
  { category: "Cleaner", service: "Window/Glass Facade Cleaning", min: 1800, max: 4500 },
  { category: "Mechanic", service: "On-site Vehicle Inspection", min: 2500, max: 6500 },
  { category: "Mechanic", service: "Roadside Assistance/Jumpstart", min: 2000, max: 5000 },
  { category: "Gardener", service: "Grass Cutting & Weeding", min: 800, max: 2000 },
  { category: "Gardener", service: "Tree Felling/Pruning", min: 2500, max: 7000 },
  { category: "Gardener", service: "Garden Landscaping Design", min: 3500, max: 12000 },
  { category: "Painter", service: "Interior Wall Painting", min: 1200, max: 3500 },
  { category: "Painter", service: "Exterior Weather-Shielding", min: 2500, max: 6000 },
  { category: "Painter", service: "Waterproofing/Sealing", min: 3000, max: 7500 },
  { category: "HVAC Tech", service: "AC Master Service", min: 1500, max: 3500 },
  { category: "HVAC Tech", service: "AC Gas Refilling", min: 2500, max: 5500 },
  { category: "HVAC Tech", service: "Fridge/Freezer Repair", min: 2000, max: 5000 },
  { category: "Pest Control", service: "General Pest Spraying", min: 3000, max: 7500 },
  { category: "Pest Control", service: "Termite Soil Treatment", min: 5000, max: 15000 },
  { category: "IT Support", service: "Laptop/PC Repair", min: 2000, max: 5500 },
  { category: "IT Support", service: "Wi-Fi/Network Configuration", min: 1500, max: 4000 },
  { category: "IT Support", service: "CCTV Installation", min: 2500, max: 6000 },
  { category: "IT Support", service: "Data Recovery Services", min: 4000, max: 12000 },
  { category: "Tutor", service: "Primary Education (Grades 1-5)", min: 1000, max: 2500 },
  { category: "Tutor", service: "O/L & A/L Subjects", min: 2000, max: 5500 },
  { category: "Tutor", service: "Music/Instruments", min: 2500, max: 6000 },
  { category: "Fitness", service: "Personal Gym Coaching", min: 2500, max: 8000 },
  { category: "Fitness", service: "Yoga/Pilates Sessions", min: 3000, max: 9000 },
  { category: "Pet Care", service: "Dog Walking & Basic Care", min: 1000, max: 2500 },
  { category: "Pet Care", service: "Professional Dog Training", min: 3000, max: 7500 },
  { category: "Pet Care", service: "Mobile Pet Grooming", min: 2500, max: 6000 },
  { category: "Stylist", service: "Home Haircut/Styling", min: 1500, max: 5000 },
  { category: "Stylist", service: "Bridal Makeup & Dressing", min: 5000, max: 25000 },
  { category: "Stylist", service: "Skin Care/Facial at Home", min: 2500, max: 8000 },
  { category: "Photo", service: "Event Photography", min: 10000, max: 35000 },
  { category: "Photo", service: "Video Editing/Post-Production", min: 3000, max: 8500 },
  { category: "Photo", service: "Product/Drone Shoot", min: 15000, max: 50000 },
  { category: "Mover", service: "Professional Packing", min: 1200, max: 3500 },
  { category: "Mover", service: "Furniture Loading/Unloading", min: 1500, max: 4000 },
  { category: "Locksmith", service: "Key Duplication", min: 500, max: 2000 },
  { category: "Locksmith", service: "Smart Lock Installation", min: 3000, max: 8000 },
  { category: "Locksmith", service: "Emergency Lock Opening", min: 2500, max: 6500 },
  { category: "Handyman", service: "Wall Mount TV/Shelving", min: 1500, max: 4000 },
  { category: "Handyman", service: "Tile/Masonry Patchwork", min: 2000, max: 5500 },
  { category: "Handyman", service: "Door/Window Mesh Fixing", min: 1200, max: 3000 },
  { category: "Tailor", service: "Alterations & Repairs", min: 1000, max: 3000 },
  { category: "Tailor", service: "Custom Shirt/Trouser Stitching", min: 2500, max: 7000 },
  { category: "Tech Admin", service: "Data Entry & Formatting", min: 800, max: 2500 },
  { category: "Tech Admin", service: "Digital Marketing/Social Media", min: 2500, max: 7500 },
  { category: "Tech Admin", service: "Virtual Assistant Support", min: 1500, max: 4500 }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');
    
    // Clear existing
    await MarketResearch.deleteMany({});
    console.log('Cleared existing market research');

    for (const d of data) {
      await MarketResearch.create({
        category: d.category,
        service: d.service,
        minRatePerHour: d.min,
        maxRatePerHour: d.max,
        currency: 'LKR',
        description: 'System seeded value'
      });
      console.log("Seeded: " + d.category + " -> " + d.service + " (" + d.min + " - " + d.max + ")");
    }

    console.log('Done seeding!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
