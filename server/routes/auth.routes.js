// server/routes/auth.routes.js
import express from "express";
import { createUser, findUser } from "../models/User.js";

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Missing fields" });

    const id = await createUser({ username, password });
    console.log(`[auth] signup ok user=${username} id=${id}`);
    res.json({ message: "Signup successful", userId: id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await findUser({ username, password });

    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    console.log(`[auth] login ok user=${username} id=${user._id}`);
    res.json({ message: "Login successful", user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
