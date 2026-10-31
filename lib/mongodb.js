import { MongoClient } from "mongodb";

// One shared connection, reused across requests (and across hot reloads in dev).
let clientPromise = globalThis._mongoClientPromise;

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
    globalThis._mongoClientPromise = clientPromise;
  }
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || "torrentpower");
}
