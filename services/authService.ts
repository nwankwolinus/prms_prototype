/**
 * services/authService.ts
 *
 * Authentication service — business logic layer.
 *
 * RESPONSIBILITIES:
 *   - Validate login credentials against the database
 *   - Orchestrate password comparison via lib/password.ts
 *   - Generate and return a signed JWT via lib/jwt.ts
 *   - Return structured results to the Route Handler
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - HTTP request parsing       → app/api/auth/login/route.ts
 *   - Setting cookies            → app/api/auth/login/route.ts
 *   - Database connection        → lib/mongodb.ts (called here via connectToDatabase)
 *   - Password hashing algorithm → lib/password.ts
 *   - Token signing algorithm    → lib/jwt.ts
 *
 * DESIGN NOTES:
 *   - Guard clauses are used instead of nested conditionals.
 *     Each guard is an early return on failure, which keeps the
 *     happy path unindented and the CC at its minimum necessary value.
 *
 *   - The service returns a discriminated union (AuthResult) rather
 *     than throwing exceptions. This means the Route Handler decides
 *     what HTTP status to send — the service stays HTTP-agnostic.
 *
 *   - No try/catch here: database errors propagate to the Route
 *     Handler, which is the correct place to return a 500 response.
 *
 * CYCLOMATIC COMPLEXITY:
 *   - login()       CC = 4  (three guard clauses = three decision points + 1)
 *   - getUserById() CC = 2  (one null check)
 *
 * These values are intentionally higher than the utility files and
 * represent the first meaningful complexity data point in Sprint 1.
 */

import { connectToDatabase } from "@/lib/mongodb";
import { comparePassword } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import UserModel from "@/models/User";
import { PublicUser, JwtPayload, UserRole } from "@/types";

// ─── Result Types ─────────────────────────────────────────────────────────────

/**
 * AuthResult — discriminated union returned by login().
 *
 * Using a union (rather than throwing errors) means:
 *   - The caller is forced by TypeScript to handle both outcomes.
 *   - The service has no knowledge of HTTP — no status codes here.
 *   - Unit testing requires no try/catch blocks in the test file.
 *
 * This pattern directly reduces CC in the Route Handler because
 * it can use a simple if/else on `result.success` rather than
 * wrapping everything in a try/catch with nested conditionals.
 */
export type AuthResult =
  | { success: true; user: PublicUser; token: string }
  | { success: false; message: string };

// ─── Login Credentials Input ──────────────────────────────────────────────────

/**
 * LoginCredentials
 *
 * Typed input for the login function.
 * Defining this here (not in types/index.ts) keeps it co-located
 * with the function that uses it — a cohesion decision.
 * If login input requirements change, only this file changes.
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

/**
 * login
 *
 * Validates credentials and returns a signed JWT on success.
 *
 * GUARD CLAUSE PATTERN:
 *   Each failure condition returns early with a failure result.
 *   The happy path (token generation) is reached only if all
 *   guards pass — it sits at the lowest indentation level.
 *
 * CC = 4:
 *   +1  function entry
 *   +1  missing email or password check
 *   +1  user not found check
 *   +1  password mismatch check
 *
 * @param credentials - Email and plain-text password from login form.
 * @returns AuthResult — success with token, or failure with message.
 */
export async function login(credentials: LoginCredentials): Promise<AuthResult> {
  const { email, password } = credentials;

  // Guard 1 — Reject obviously incomplete input immediately.
  // Keeps downstream code free from null-handling.
  if (!email || !password) {
    return { success: false, message: "Email and password are required." };
  }

  // Ensure the database connection is active before querying.
  await connectToDatabase();

  // Query by email. .lean() returns a plain JS object instead of a
  // Mongoose Document — faster, and sufficient for our read-only use here.
  const user = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean();

  // Guard 2 — User not found.
  // Return the same message as a wrong password to prevent
  // user enumeration attacks (an attacker cannot distinguish
  // "no such email" from "wrong password").
  if (!user) {
    return { success: false, message: "Invalid email or password." };
  }

  // Compare the submitted plain-text password against the stored hash.
  const passwordMatch = await comparePassword(password, user.password);

  // Guard 3 — Password does not match.
  if (!passwordMatch) {
    return { success: false, message: "Invalid email or password." };
  }

  // ── Happy Path ──────────────────────────────────────────────────────────────
  // All guards passed. Build the JWT payload and sign the token.

  const payload: JwtPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role as UserRole,
  };

  const token = await signToken(payload);

  // Build the public user object — password is excluded at the type level.
  const publicUser: PublicUser = {
    _id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role as UserRole,
  };

  return { success: true, user: publicUser, token };
}

// ─── Get User By ID ───────────────────────────────────────────────────────────

/**
 * getUserById
 *
 * Retrieves a public user record by MongoDB _id.
 * Used by protected Route Handlers that need to hydrate
 * user details from a verified JWT payload.
 *
 * CC = 2:
 *   +1  function entry
 *   +1  null check on query result
 *
 * @param userId - MongoDB ObjectId string from the JWT payload.
 * @returns PublicUser if found, null otherwise.
 */
export async function getUserById(userId: string): Promise<PublicUser | null> {
  await connectToDatabase();

  const user = await UserModel.findById(userId)
    .select("-password")   // Exclude password at the query level — defence in depth
    .lean();

  if (!user) return null;

  return {
    _id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role as UserRole,
  };
}