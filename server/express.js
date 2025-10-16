import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

console.log("Loaded MONGO_URI:", process.env.MONGO_URI ? "✅ yes" : "❌ no");

import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json());

// health
app.get("/api/health/db", async (_req, res) => {
  try {
    const db = await connectDB();
    const names = await db.listCollections().toArray();
    res.json({ ok: true, collections: names.map(c => c.name) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 4000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`🚀 API on http://localhost:${PORT}`)))
  .catch(err => { console.error("❌ DB connect failed:", err.message); process.exit(1); });
