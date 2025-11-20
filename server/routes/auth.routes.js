import express from "express";
import { createUser, findUser, requestPasswordReset, resetPassword } from "../models/User.js";
import { sendResetEmail } from "../services/emailService.js";

export default function authRoutes({
  validatePassword,
  minLength,
  issueToken,
  tokenName,
  cookieOptions,
  jwtSecret,
}) {
  const router = express.Router();

  // Signup
  router.post("/signup", async (req, res) => {
    try {
      const { name, email, password } = req.body || {};

      if (!name || !email || !password)
        return res.status(400).json({ error: "Missing fields" });

      if (!validatePassword(password)) {
        return res.status(400).json({
          error: `Password must be at least ${minLength} characters and include a number.`,
        });
      }

      const id = await createUser({ name, email, password });

      // Auto-login after signup
      const token = issueToken({ _id: id, name, email });
      res
        .cookie(tokenName, token, cookieOptions)
        .json({
          message: "Signup successful",
          user: { id, name, email: String(email).toLowerCase() },
        });
    } catch (err) {
      res.status(400).json({ error: err.message || "Signup failed" });
    }
  });

  // Login
  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};

      if (!email || !password)
        return res.status(400).json({ error: "Missing email or password" });

      const user = await findUser({ email, password });

      if (!user)
        return res.status(401).json({ error: "Invalid email or password" });

      const token = issueToken(user);

      res
        .cookie(tokenName, token, cookieOptions)
        .json({
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
          error: `Password must be at least ${minLength} characters and include a number.`,
        });
      }

      const success = await resetPassword({ email, token, newPassword });
      if (!success) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      res.status(500).json({ error: "Could not reset password" });
    }
  });

  // Logout clears the auth cookie
  router.post("/logout", (_req, res) => {
    res.clearCookie(tokenName, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieOptions.secure,
    });
    res.json({ message: "Logged out" });
  });

  return router;
}
