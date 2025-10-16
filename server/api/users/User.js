// server/api/user.js
import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// Example user store — replace with DB lookup
const USERS = [
  { id: "u1", email: "test@example.com", name: "Test User", role: "student" },
];

// GET /api/user
router.get("/", requireAuth, (req, res) => {
  const user = USERS.find((u) => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});

export default router;
