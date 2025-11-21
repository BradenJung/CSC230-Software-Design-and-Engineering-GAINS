import express from "express";
import { createUser, findUser, requestPasswordReset, resetPassword } from "../models/User.js";
import { sendResetEmail } from "../services/emailService.js";

const router = express.Router();

const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password) {
  return typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    /\d/.test(password);
}

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const id = await createUser({ name, email, password });

    console.log(`[AUTH] Signup created: ${email} (${id})`);
    res.json({
      message: "Signup successful",
      userId: id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await findUser({ email, password });

    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

    console.log(`[AUTH] Login success: ${email}`);
    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Forgot password - issues a short-lived token (for prototype we return it directly)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Email is required" });

    const result = await requestPasswordReset(email);
    if (!result) return res.status(404).json({ error: "No account found for that email" });

    await sendResetEmail({ to: String(email).toLowerCase(), code: result.token });

    console.log(`[AUTH] Forgot password request: ${email}`);
    res.json({
      message: "Reset code sent to your email (valid for 15 minutes).",
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not issue reset code" });
  }
});

// Reset password using token
router.post("/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body || {};

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: "Email, token, and new password are required" });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters and include a number.`,
      });
    }

    const success = await resetPassword({ email, token, newPassword });
    if (!success) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    console.log(`[AUTH] Password reset success: ${email}`);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Could not reset password" });
  }
});

// Logout (stateless; logs event server-side)
router.post("/logout", async (req, res) => {
  const { accountName, email } = req.body || {};
  const identifier = email || accountName || "unknown user";
  console.log(`[AUTH] Logout: ${identifier}`);
  res.json({ message: "Logout recorded" });
});

export default router;
