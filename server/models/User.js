// server/models/User.js
import { getDB } from "../config/db.js";

export async function createUser({ username, password }) {
  const db = getDB();
  const existing = await db.collection("users").findOne({ username });
  if (existing) throw new Error("User already exists");

  const result = await db.collection("users").insertOne({ username, password });
  return result.insertedId;
}

export async function findUser({ username, password }) {
  const db = getDB();
  const user = await db.collection("users").findOne({ username, password });
  return user;
}