// server/models/User.js
import { getDB } from "../config/db.js";
import bcrypt from "bcrypt";

export async function createUser({ name, email, password }) {
  const db = getDB();

  const existing = await db.collection("users").findOne({ email });
  if (existing) throw new Error("User already exists");

  const hashed = await bcrypt.hash(password, 10);

  const result = await db.collection("users").insertOne({
    name,
    email,
    password: hashed,
    createdAt: new Date(),
  });

  return result.insertedId;
}

export async function findUser({ email, password }) {
  const db = getDB();

  const user = await db.collection("users").findOne({ email });
  if (!user) return null;

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) return null;

  return user;
}
