const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("CRITICAL ERROR: MONGODB_URI environment variable is missing.");
  process.exit(1);
}

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("Connected successfully.");

  const email = process.env.INITIAL_ADMIN_EMAIL || "youssef@allurite.com";
  const password = process.env.INITIAL_ADMIN_PASSWORD || "Youssef2005";

  const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true },
    status: { type: String, required: true },
  }, { collection: "users" });

  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = "SuperAdmin";
    existing.status = "Active";
    await existing.save();
    console.log(`SuperAdmin account updated successfully: ${email}`);
  } else {
    await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: "SuperAdmin",
      status: "Active"
    });
    console.log(`SuperAdmin account created/seeded successfully: ${email}`);
  }

  await mongoose.disconnect();
  console.log("Disconnected.");
}

run().catch(err => {
  console.error("Error seeding admin:", err);
  process.exit(1);
});
