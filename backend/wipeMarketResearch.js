const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localservicefinder';
const MarketResearch = require('./src/models/MarketResearch');

async function wipe() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');
    
    await MarketResearch.deleteMany({});
    console.log('Successfully wiped MarketResearch!');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

wipe();
