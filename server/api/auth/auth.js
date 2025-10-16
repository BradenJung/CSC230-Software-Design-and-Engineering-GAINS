// server/api/auth.js
import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const router = Router();

// ⚠️ Demo user — replace with DB lookup
// Pre-hash one password at startup (in real code, your user table stores hash)
const PASSWORD = "Password123!";
const HASH = await bcrypt.hash(PASSWORD, 12);
const USERS = [{ id: "u1", email: "test@example.com", passwordHash: HASH }];

// Secrets (set in your shell or .env, never commit real secrets)
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev_access_secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";

// Utility
function issueTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email },
    JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign({ sub: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const user = USERS.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const { accessToken, refreshToken } = issueTokens(user);

  // HttpOnly cookie — refresh token only
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: false, // set true when using HTTPS in prod
    path: "/api/auth",
  });

  res.json({ accessToken, user: { id: user.id, email: user.email } });
});

// POST /api/auth/refresh
router.post("/refresh", (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: "Missing refresh token" });

  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET);
    const accessToken = jwt.sign({ sub: payload.sub }, JWT_ACCESS_SECRET, {
      expiresIn: "15m",
    });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("refresh_token", { path: "/api/auth" });
  res.status(204).end();
});

export default router;

import userService from "../services/userService.js";

// make sure the demo user exists in dev
await userService.ensureDemoUser();

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = await userService.getUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await userService.verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const { accessToken, refreshToken } = issueTokens({ id: user.id, email: user.email });
  res.cookie("refresh_token", refreshToken, { httpOnly: true, sameSite: "strict", secure: false, path: "/api/auth" });
  res.json({ accessToken, user: userService.toPublicUser(user) });
});

router.post("/signup", async (req, res) => {
  try {
    const publicUser = await userService.createUser(req.body); // {name,email,password}
    const full = await userService.getUserById(publicUser.id);
    const { accessToken, refreshToken } = issueTokens({ id: full.id, email: full.email });
    res.cookie("refresh_token", refreshToken, { httpOnly: true, sameSite: "strict", secure: false, path: "/api/auth" });
    res.status(201).json({ accessToken, user: publicUser });
  } catch (e) {
    const status = e.code === "EMAIL_EXISTS" ? 409 : 400;
    res.status(status).json({ error: e.message });
  }
});
