// server/index.js
import express from "express";
import cors from "cors";
import authRouter from "./auth.js";
import userRouter from "./api/user.js";
app.use("/api/user", userRouter);

const app = express();
app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"], // your frontend
  credentials: true
}));

app.use("/api/auth", authRouter);

// Example protected API
import jwt from "jsonwebtoken";
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const requireAuth = (req, res, next) => {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_ACCESS_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid/expired token" });
  }
};
app.get("/api/profile", requireAuth, (req, res) => {
  res.json({ id: req.user.sub, email: "test@example.com" });
});

app.listen(8080, () => console.log("API on :8080"));
