import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI;

if (!global._mongooseConnected) {
  global._mongooseConnected = mongoose
    .connect(MONGO_URI, { bufferCommands: false })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));
}

// --- User Model ---
const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      passwordHash: { type: String, required: true },
    })
  );

// --- API Handler ---
export default async function handler(req, res) {
  console.log("➡️ HIT /api/signup");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      passwordHash,
    });

    return res.status(200).json({ message: "Account created successfully!" });
  } catch (err) {
    console.error("Signup error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}
