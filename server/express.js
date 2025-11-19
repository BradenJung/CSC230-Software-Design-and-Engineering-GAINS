import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

// Mount routes
app.use("/api", authRoutes);

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
