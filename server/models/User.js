// server/models/User.js
import { getDB } from "../config/db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function createUser({ name, email, password }) {
  const db = getDB();
  const normalizedEmail = normalizeEmail(email);

  const existing = await db.collection("users").findOne({ email: normalizedEmail });
  if (existing) throw new Error("User already exists");

  const hashed = await bcrypt.hash(password, 10);

  const result = await db.collection("users").insertOne({
    name,
    email: normalizedEmail,
    password: hashed,
    createdAt: new Date(),
  });

  return result.insertedId;
}

export async function findUser({ email, password }) {
  const db = getDB();
  const normalizedEmail = normalizeEmail(email);

  const user = await db.collection("users").findOne({ email: normalizedEmail });
  if (!user) return null;

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) return null;

  return user;
}

export async function requestPasswordReset(email) {
  const db = getDB();
  const normalizedEmail = normalizeEmail(email);
  const user = await db.collection("users").findOne({ email: normalizedEmail });
  if (!user) return null;

  const token = crypto.randomBytes(3).toString("hex"); // 6 hex chars
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db.collection("users").updateOne(
    { _id: user._id },
    { $set: { resetToken: token, resetExpires: expiresAt } }
  );

  return { token, expiresAt };
}

export async function resetPassword({ email, token, newPassword }) {
  const db = getDB();
  const normalizedEmail = normalizeEmail(email);
  const user = await db.collection("users").findOne({ email: normalizedEmail });
  if (!user || !user.resetToken || !user.resetExpires) return false;

  const now = new Date();
  if (user.resetToken !== token || user.resetExpires < now) return false;

  const hashed = await bcrypt.hash(newPassword, 10);

  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: { password: hashed },
      $unset: { resetToken: "", resetExpires: "" },
    }
  );

  return true;
}
