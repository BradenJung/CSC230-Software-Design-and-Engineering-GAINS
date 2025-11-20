// server/config/db.js
import { MongoClient } from "mongodb";

let client, db;

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || "mydb";

  if (!uri) throw new Error("MONGO_URI missing");

  if (db) return db;

  client = new MongoClient(uri, {
    tls: true,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  await client.db("admin").command({ ping: 1 });

  db = client.db(dbName);
  console.log("✅ Connected to MongoDB:", dbName);
  return db;
}

export function getDB() {
  if (!db) throw new Error("Database not initialized. Call connectDB() first.");
  return db;
}
