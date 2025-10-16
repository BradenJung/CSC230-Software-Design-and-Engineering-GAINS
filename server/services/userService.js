// server/services/userService.js
import bcrypt from "bcrypt";

/**
 * In-memory store (swap with a real DB later).
 * id -> user record (includes passwordHash)
 */
const users = new Map();
const emailIdx = new Map(); // lowercased email -> id

// ---------- helpers ----------
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function toPublicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role ?? "user",
    createdAt: u.createdAt,
  };
}

function makeId() {
  return `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- core API ----------
/**
 * Create a new user. Throws Error with .code if conflict/invalid.
 * @param {{email:string, name:string, password:string, role?:string}} payload
 * @returns {Promise<{id:string,email:string,name:string,role:string,createdAt:string}>}
 */
async function createUser({ email, name, password, role = "user" }) {
  if (!email || !name || !password) {
    const err = new Error("Name, email, and password are required");
    err.code = "MISSING_FIELDS";
    throw err;
  }
  if (typeof email !== "string" || typeof name !== "string" || typeof password !== "string") {
    const err = new Error("Invalid payload");
    err.code = "INVALID_PAYLOAD";
    throw err;
  }
  const lower = email.toLowerCase();
  if (emailIdx.has(lower)) {
    const err = new Error("Email already registered");
    err.code = "EMAIL_EXISTS";
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const id = makeId();
  const createdAt = new Date().toISOString();

  const user = { id, email, name, role, passwordHash, createdAt };
  users.set(id, user);
  emailIdx.set(lower, id);

  return toPublicUser(user);
}

/**
 * Returns full user record (including passwordHash) or null.
 */
async function getUserById(id) {
  return users.get(id) || null;
}

/**
 * Returns full user record (including passwordHash) or null.
 */
async function getUserByEmail(email) {
  if (!email) return null;
  const id = emailIdx.get(email.toLowerCase());
  return id ? users.get(id) : null;
}

/**
 * Ensure a demo user exists for local testing.
 * email: test@example.com  password: Password123!
 */
async function ensureDemoUser() {
  const demoEmail = "test@example.com";
  if (emailIdx.has(demoEmail)) return;

  const passwordHash = await hashPassword("Password123!");
  const user = {
    id: "u1",
    email: demoEmail,
    name: "Test User",
    role: "student",
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.set(user.id, user);
  emailIdx.set(demoEmail, user.id);
}

export default {
  // auth helpers
  hashPassword,
  verifyPassword,
  toPublicUser,

  // queries & mutations
  createUser,
  getUserById,
  getUserByEmail,

  // local dev convenience
  ensureDemoUser,
};
