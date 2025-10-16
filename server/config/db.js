import { MongoClient } from "mongodb";

let client, db;

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || "mydb";
  if (!uri) throw new Error("MONGO_URI missing");

  // 🔍 DEBUG — confirm credentials parsed correctly
  const m = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\//);
  if (m) {
    console.log(
      "Mongo → user:",
      decodeURIComponent(m[1]),
      "| passLen:",
      decodeURIComponent(m[2]).length,
      "| host:",
      m[3]
    );
  } else {
    console.log("⚠ Could not parse MONGO_URI format");
  }

  if (db) return db; // already connected

  client = new MongoClient(uri);
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  db = client.db(dbName);
  console.log("✅ Connected to MongoDB Atlas! DB:", dbName);
  return db;
}

export function getDB() {
  if (!db) throw new Error("DB not connected yet. Call connectDB() first.");
  return db;
}
