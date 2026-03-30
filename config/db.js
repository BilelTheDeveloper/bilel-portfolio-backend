const mongoose = require('mongoose');
require('dotenv').config();

/**
 * We use Mongoose instead of the raw MongoClient because 
 * it makes creating "Models" (like Projects or Messages) 
 * much easier for your MERN stack.
 */

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    // Exit process with failure if we can't connect
    process.exit(1);
  }
};

module.exports = connectDB;