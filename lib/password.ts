/**
 * lib/password.ts
 *
 * bcrypt utility — the single point of contact for all password operations.
 *
 * RESPONSIBILITIES:
 *   - Hash a plain-text password before storage   → hashPassword()
 *   - Compare a plain-text attempt to a hash      → comparePassword()
 *
 * DESIGN NOTES:
 *   - bcryptjs is imported ONLY here.
 *     All other modules call these helpers — never bcrypt directly.
 *     This means the hashing strategy (algorithm, cost factor) can
 *     be changed in one place without touching any other file.
 *
 *   - Both functions are async because bcrypt is CPU-intensive.
 *     Making them async prevents blocking the Node.js event loop
 *     during login or seeding operations.
 *
 *   - Neither function contains conditional logic.
 *     CC = 1 for both — the theoretical minimum.
 *     This makes them clean reference points in Halstead analysis.
 *
 *   - The salt rounds constant is defined once here.
 *     12 rounds is the current industry recommendation:
 *     high enough to resist brute force, low enough for
 *     acceptable server response time (~300ms).
 */

import bcrypt from "bcryptjs";

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * SALT_ROUNDS controls the bcrypt work factor.
 *
 * Each increment doubles the computation time:
 *   10 rounds ≈  100ms
 *   12 rounds ≈  300ms  ← chosen value
 *   14 rounds ≈ 1200ms
 *
 * For an MSc prototype handling non-production data,
 * 12 is appropriate and defensible in Chapter 4.
 */
const SALT_ROUNDS = 12;

// ─── Hash ─────────────────────────────────────────────────────────────────────

/**
 * hashPassword
 *
 * Generates a bcrypt hash from a plain-text password.
 * The resulting hash is the value stored in MongoDB —
 * the plain-text password is never persisted.
 *
 * CC = 1 (no branching)
 *
 * @param plainText - The raw password provided by the user or seed script.
 * @returns A bcrypt hash string (60 characters).
 *
 * @example
 * const hash = await hashPassword("SecurePass123");
 * // "$2a$12$..."
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

// ─── Compare ──────────────────────────────────────────────────────────────────

/**
 * comparePassword
 *
 * Compares a plain-text password attempt against a stored bcrypt hash.
 * bcrypt internally extracts the salt from the hash before comparing,
 * so no salt management is required by the caller.
 *
 * CC = 1 (no branching)
 *
 * @param plainText - The raw password attempt from the login form.
 * @param hash      - The bcrypt hash retrieved from MongoDB.
 * @returns true if the password matches, false otherwise.
 *
 * @example
 * const isValid = await comparePassword("SecurePass123", storedHash);
 * // true | false
 */
export async function comparePassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}