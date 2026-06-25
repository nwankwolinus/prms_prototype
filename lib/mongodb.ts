/**
 * lib/mongodb.ts
 *
 * Reusable MongoDB connection utility using Mongoose.
 *
 * WHY THIS FILE EXISTS:
 * Next.js runs in a serverless/edge environment where each API route
 * invocation may spin up a new module instance. Without connection
 * caching, every request would open a new MongoDB connection,
 * exhausting the connection pool rapidly.
 *
 * SOLUTION:
 * Store the Mongoose connection promise on the Node.js `global` object.
 * On subsequent calls, reuse the cached promise instead of reconnecting.
 *
 * This pattern is the standard recommendation for Next.js + Mongoose.
 */

import mongoose, { Mongoose } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable in .env.local"
  );
}

/**
 * Extend the Node.js global type to include our mongoose cache.
 * This prevents TypeScript from complaining about a non-standard
 * property on `global`.
 */
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

/** Shape of the connection cache stored on `global`. */
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Initialise the cache if it does not exist yet.
const cache: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cache;

/**
 * connectToDatabase
 *
 * Establishes (or reuses) a Mongoose connection to MongoDB.
 * Call this at the top of every Route Handler or server action
 * that needs database access.
 *
 * @returns A resolved Mongoose instance.
 */
export async function connectToDatabase(): Promise<Mongoose> {
  // Return existing connection if available.
  if (cache.conn) {
    return cache.conn;
  }

  // If no pending promise, create one.
  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false, // Fail fast — do not queue operations if disconnected.
    });
  }

  // Await the connection and cache the result.
  cache.conn = await cache.promise;
  return cache.conn;
}