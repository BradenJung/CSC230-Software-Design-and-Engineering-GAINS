// routes/login.js
// Login route with JWT access+refresh tokens, bcrypt, and secure cookie.
//
// Assumes you have a User model with fields:
//   - email (String, unique, lowercase)
//   - passwordHash (String, bcrypt hash)
//   - isActive (Boolean)  [optional, defaults true]
//   - roles (Array<String>) [optional]
//
// ENV VARS required:
//   JWT_ACCESS_SECRET
//   JWT_REFRESH_SECRET
//   NODE_ENV ("production" to force secure cookies in prod)
//   ACCESS_TOKEN_TTL (e.g., "15m")
//   REFRESH_TOKEN_TTL (e.g., "7d")

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// TODO: update path to your actual User model
const User = require('../models/User');

// ---- helpers ---------------------------------------------------------------

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_TTL || '15m',
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_TTL || '7d',
  });
}

function setRefreshCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: isProd,        // true on HTTPS in prod
    sameSite: 'strict',    // helps mitigate CSRF
    path: '/auth/refresh', // only sent to refresh endpoint
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

function badRequest(res, message, details = undefined) {
  return res.status(400).json({ ok: false, error: { code: 'BAD_REQUEST', message, details } });
}

// ---- rate limit: protect brute-force attempts -----------------------------

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,                   // 20 tries / 15 min / IP
  standardHeaders: true,
  legacyHeaders: false,
});

// ---- POST /auth/login -----------------------------------------------------

router.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    // Basic input validation (fast, explicit)
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return badRequest(res, 'Email and password are required.');
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      return badRequest(res, 'Email and password cannot be empty.');
    }

    // Find user
    const user = await User.findOne({ email: cleanEmail }).lean(false); // need doc for bcrypt compare if using methods
    if (!user) {
      // Avoid user enumeration: same message for bad email or password
      return res.status(401).json({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    // Optional: check active/verified flags
    if (user.isActive === false) {
      return res.status(403).json({ ok: false, error: { code: 'ACCOUNT_DISABLED', message: 'Account is disabled.' } });
    }

    // Verify password
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    // Build JWT payload (keep minimal PII)
    const payload = {
      sub: String(user._id),
      email: user.email,
      roles: user.roles || [],
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ sub: payload.sub, tokenUse: 'refresh' });

    // Set refresh token cookie (httpOnly, secure)
    setRefreshCookie(res, refreshToken);

    // Return access token + minimal user profile
    return res.status(200).json({
      ok: true,
      user: {
        id: String(user._id),
        email: user.email,
        roles: user.roles || [],
      },
      accessToken,
      expiresIn: process.env.ACCESS_TOKEN_TTL || '15m',
    });
  } catch (err) {
    console.error('[login] error:', err);
    return res.status(500).json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Something went wrong.' } });
  }
});

// ---- POST /auth/refresh ---------------------------------------------------
// Exchanges a valid refresh cookie for a new access token
router.post('/auth/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) {
      return res.status(401).json({ ok: false, error: { code: 'NO_REFRESH', message: 'Missing refresh token.' } });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: { code: 'INVALID_REFRESH', message: 'Invalid or expired refresh token.' } });
    }

    // (Optional) check token revocation list / version here

    // Load user to ensure still valid
    const user = await User.findById(decoded.sub);
    if (!user || user.isActive === false) {
      return res.status(403).json({ ok: false, error: { code: 'ACCOUNT_DISABLED', message: 'Account is disabled.' } });
    }

    const payload = { sub: String(user._id), email: user.email, roles: user.roles || [] };
    const accessToken = signAccessToken(payload);

    return res.status(200).json({
      ok: true,
      accessToken,
      expiresIn: process.env.ACCESS_TOKEN_TTL || '15m',
    });
  } catch (err) {
    console.error('[refresh] error:', err);
    return res.status(500).json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Something went wrong.' } });
  }
});

// ---- POST /auth/logout ----------------------------------------------------
// Clears the refresh cookie (add server-side revocation if you store tokens)
router.post('/auth/logout', (req, res) => {
  res.clearCookie('refresh_token', { path: '/auth/refresh' });
  return res.status(200).json({ ok: true, message: 'Logged out.' });
});

module.exports = router;

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { email, password, name } = req.body || {};

  // basic validation
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
    return res.status(400).json({ error: "Invalid payload" });
  }
  // simple password policy (tune as needed)
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  // dedupe
  const exists = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: "Email already registered" });
  }

  // create user
  const passwordHash = await bcrypt.hash(password, 12);
  const newUser = {
    id: `u_${Date.now().toString(36)}`,
    email,
    name,
    passwordHash
  };
  USERS.push(newUser);

  // issue tokens (same helper you already have)
  const { accessToken, refreshToken } = issueTokens(newUser);

  // set refresh cookie (HttpOnly)
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: false, // set true in production over HTTPS
    path: "/api/auth",
  });

  // return access token + public user fields
  res.status(201).json({
    accessToken,
    user: { id: newUser.id, email: newUser.email, name: newUser.name }
  });
});

