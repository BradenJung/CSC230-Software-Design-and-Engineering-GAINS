// server/controllers/auth.controller.js
import { createUser, findUser } from "../models/User.js";

export async function signup(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const userId = await createUser({ name, email, password });

    res.json({
      message: "Signup successful",
      userId,
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Missing email or password" });

    const user = await findUser({ email, password });
    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      }
    });

  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
}
