import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import { authMiddleware } from "./middleware/authMiddleware.js";

const app = express();

const origin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin, credentials: true }));

app.use(express.json());
app.use(cookieParser());

const MIN_PASSWORD_LENGTH = 8;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_NAME = "gains_token";
const TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 2; // 2 hours

function validatePassword(password) {
  return typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    /\d/.test(password);
}

function issueToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

// Mount routes
app.use("/api", authRoutes({
  validatePassword,
  minLength: MIN_PASSWORD_LENGTH,
  issueToken,
  tokenName: TOKEN_NAME,
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TOKEN_MAX_AGE_MS,
  },
  jwtSecret: JWT_SECRET,
}));

// Root info
app.get("/", (_req, res) => {
  res.json({ ok: true, message: "GAINS API is running", docs: ["/api/health/db", "/api/signup", "/api/login"] });
});

// Health check
app.get("/api/health/db", async (_req, res) => {
  try {
    const db = await connectDB();
    const collections = await db.listCollections().toArray();
    res.json({ ok: true, collections: collections.map(c => c.name) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Current user
app.get("/api/me", authMiddleware(JWT_SECRET, TOKEN_NAME), async (req, res) => {
  res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email } });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 API running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ Mongo connection failed:", err.message);
    process.exit(1);
  });
