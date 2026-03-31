require('dotenv').config();
const mongoose = require('mongoose');
const Access = require('./models/Access');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Clear any old attempts
    await Access.deleteMany({ email: "bilel.thedeveloper@gmail.com" });

    // Create the NEW admin using the password from your .env
    const newAdmin = new Access({
      email: "bilel.thedeveloper@gmail.com",
      password: process.env.ADMIN_PASSWORD // this will be hashed automatically by your model
    });

    await newAdmin.save();
    console.log("✅ Admin Created Successfully in MongoDB!");
    process.exit();
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();