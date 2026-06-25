/**
 * scripts/seed.ts
 *
 * Database seed script — creates sample users for testing.
 *
 * RESPONSIBILITIES:
 *   - Connect to MongoDB
 *   - Create one user per role (Administrator, Doctor, Receptionist)
 *     if they do not already exist
 *   - Hash passwords using the same lib/password.ts utility used
 *     by the production auth flow — never insert plain-text passwords
 *
 * USAGE:
 *   npx tsx scripts/seed.ts
 *
 * DESIGN NOTES:
 *   - Idempotent: checks for existing users by email before
 *     inserting. Running this script multiple times will not
 *     create duplicates or throw unique-index errors.
 *
 *   - Uses hashPassword() from lib/password.ts rather than calling
 *     bcrypt directly — this is the same dependency-isolation
 *     principle applied everywhere else in the codebase. If the
 *     hashing strategy ever changes, this script does not need
 *     to change.
 *
 * CYCLOMATIC COMPLEXITY:
 *   seedUsers(): CC = 3
 *     +1  function entry
 *     +1  for...of loop over SEED_USERS
 *     +1  existing user check (skip if already present)
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { hashPassword } from "@/lib/password";
import UserModel from "@/models/User";
import { UserRole } from "@/types";

// ─── Seed Data ────────────────────────────────────────────────────────────────

/**
 * SEED_USERS
 *
 * One user per role, covering all three roles required by the
 * dissertation requirements document. Passwords are intentionally
 * simple — this is synthetic test data for a research prototype,
 * never deployed with real credentials.
 */
const SEED_USERS = [
  {
    username: "admin",
    email: "admin@prms.test",
    password: "Admin@12345",
    role: UserRole.ADMIN,
  },
  {
    username: "doctor",
    email: "doctor@prms.test",
    password: "Doctor@12345",
    role: UserRole.DOCTOR,
  },
  {
    username: "receptionist",
    email: "receptionist@prms.test",
    password: "Reception@12345",
    role: UserRole.RECEPTIONIST,
  },
];

// ─── Seed Function ────────────────────────────────────────────────────────────

/**
 * seedUsers
 *
 * Iterates over SEED_USERS, creating each one if it does not
 * already exist in the database.
 *
 * CC = 3:
 *   +1  function entry
 *   +1  for...of loop
 *   +1  existing user check
 */
async function seedUsers(): Promise<void> {
  for (const userData of SEED_USERS) {
    const existing = await UserModel.findOne({ email: userData.email });

    if (existing) {
      console.log(`Skipped (already exists): ${userData.email}`);
      continue;
    }

    const hashedPassword = await hashPassword(userData.password);

    await UserModel.create({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
    });

    console.log(`Created: ${userData.email} (${userData.role})`);
  }
}

// ─── Script Entry Point ───────────────────────────────────────────────────────

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("MONGODB_URI is not defined. Check your .env.local file.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  await seedUsers();

  await mongoose.disconnect();
  console.log("Seed complete. Disconnected.");
}

run().catch((error) => {
  console.error("Seed script failed:", error);
  process.exit(1);
});