import { MongoClient, ObjectId } from "mongodb";

let client;
let db;

function recordMongoUriDetails(uri) {
  const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\//);
  if (!match) {
    console.log("⚠ Could not parse MONGO_URI format");
    return;
  }
  console.log(
    "Mongo → user:",
    decodeURIComponent(match[1]),
    "| passLen:",
    decodeURIComponent(match[2]).length,
    "| host:",
    match[3]
  );
}

function createMemoryDB(dbName) {
  console.log("🧠 Using in-memory database. Data resets on restart.");
  const collections = new Map();

  function ensureCollection(name) {
    if (!collections.has(name)) collections.set(name, []);
    return collections.get(name);
  }

  function matches(doc, query = {}) {
    return Object.entries(query).every(([key, value]) => doc[key] === value);
  }

  return {
    name: dbName,
    collection(name) {
      const store = ensureCollection(name);
      return {
        async findOne(query) {
          return store.find(doc => matches(doc, query)) ?? null;
        },
        async insertOne(doc) {
          const record = { ...doc, _id: new ObjectId() };
          store.push(record);
          return { insertedId: record._id };
        },
      };
    },
    listCollections() {
      return {
        async toArray() {
          return Array.from(collections.keys()).map(name => ({ name }));
        },
      };
    },
  };
}

export async function connectDB() {
  if (db) return db; // already connected

  const uri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || "mydb";

  if (uri) {
    try {
      recordMongoUriDetails(uri);
      client = new MongoClient(uri);
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      db = client.db(dbName);
      console.log("✅ Connected to MongoDB Atlas! DB:", dbName);
      return db;
    } catch (err) {
      console.error("⚠ MongoDB Atlas connection failed:", err.message);
      if (client) {
        try {
          await client.close();
        } catch {
          // ignore cleanup errors
        }
        client = undefined;
      }
    }
  } else {
    console.log("ℹ️ No MONGO_URI provided; falling back to in-memory DB.");
  }

  db = createMemoryDB(dbName);
  return db;
}

export function getDB() {
  if (!db) throw new Error("DB not connected yet. Call connectDB() first.");
  return db;
}
