const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Message = require('./models/Message'); // Ensure path is correct

dotenv.config();

const randomMessages = [
  {
    name: "John Doe",
    email: "john@example.com",
    subject: "Project Inquiry",
    message: "Hey Bilel, I love your portfolio! Are you available for a MERN project?"
  },
  {
    name: "Sarah Smith",
    email: "sarah.design@web.com",
    subject: "UI/UX Collaboration",
    message: "Your Tailwind components are clean. Let's work together."
  },
  {
    name: "Meta Ads Team",
    email: "ads-noreply@meta.com",
    subject: "Ad Campaign Question",
    message: "Checking in on the latest ROI stats for the case study."
  },
  {
    name: "Alex Rivera",
    email: "alex@startup.io",
    subject: "Urgent: Web Dev Needed",
    message: "We need a developer to build a scalable dashboard ASAP."
  },
  {
    name: "Bilel Tester",
    email: "test@bilel.dev",
    subject: "System Test 01",
    message: "This is a random test message to check the admin dashboard layout."
  }
];

const injectData = async () => {
  try {
    // 1. Connect using your fixed .env (Uses BilelDev case)
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🚀 Connected to MongoDB for Injection...");

    // 2. Clear old test messages (Optional - remove if you want to keep them)
    // await Message.deleteMany(); 

    // 3. Insert the random data
    await Message.insertMany(randomMessages);
    
    console.log("✅ 5 Random Messages Injected Successfully!");
    process.exit();
  } catch (error) {
    console.error("❌ Injection Failed:", error);
    process.exit(1);
  }
};

injectData();