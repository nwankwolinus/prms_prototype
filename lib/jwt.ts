/**
 * lib/jwt.ts
 *
 * JWT utility — the single point of contact for all token operations.
 *
 * RESPONSIBILITIES:
 *   - Sign a JWT from a payload           → signToken()
 *   - Verify and decode an incoming JWT   → verifyToken()
 *   - Extract a token from a cookie string → extractTokenFromCookie()
 *
 * CHANGE LOG (Stage 6 correction):
 *   Originally implemented using jsonwebtoken, which depends on
 *   Node.js's native 'crypto' module internally. This worked
 *   correctly in Node.js Route Handlers and Server Components,
 *   but failed silently (caught by the try/catch in verifyToken)
 *   when called from middleware.ts, which runs on the Next.js
 *   Edge Runtime — a constrained environment that does not support
 *   Node's 'crypto' module, only the Web Crypto API.
 *
 *   This was discovered during Stage 6 integration testing: login
 *   succeeded and the cookie was correctly set, but every protected
 *   route redirected back to /login. Debug logging traced the
 *   failure to a single error: "The edge runtime does not support
 *   Node.js 'crypto' module."
 *
 *   FIX: jsonwebtoken was replaced with jose, which is built on
 *   the Web Crypto API and runs correctly in both the Node.js
 *   runtime (Route Handlers, Server Components) and the Edge
 *   Runtime (middleware.ts). A single implementation is now used
 *   everywhere — no separate Edge-only verification path exists.
 *
 * DESIGN NOTES:
 *   - jose is imported ONLY here, preserving the original
 *     dependency-isolation principle.
 *
 *   - signToken() and verifyToken() are now both async, since
 *     jose's API is Promise-based throughout — unlike jsonwebtoken,
 *     which was synchronous. Every call site was updated to await
 *     these functions (see authService.ts, middleware.ts, and
 *     app/(dashboard)/layout.tsx).
 *
 *   - The secret must be converted to a Uint8Array via
 *     new TextEncoder().encode(...) — jose does not accept a raw
 *     string secret the way jsonwebtoken did.
 *
 * CYCLOMATIC COMPLEXITY:
 *   signToken():               CC = 1  (no branching)
 *   verifyToken():              CC = 2  (one try/catch)
 *   extractTokenFromCookie():   CC = 2  (two conditionals)
 *
 *   These values are unchanged from the jsonwebtoken implementation
 *   — only the underlying library and async signature changed, not
 *   the control-flow shape.
 */

import { SignJWT, jwtVerify } from "jose";
import { JwtPayload } from "@/types";
import { AUTH_COOKIE_NAME } from "@/utils/constants";

// ─── Environment Guard ────────────────────────────────────────────────────────

const JWT_SECRET_RAW = process.env.JWT_SECRET;

if (!JWT_SECRET_RAW) {
  throw new Error(
    "JWT_SECRET is not defined. Add it to your .env.local file."
  );
}

/**
 * jose requires the secret as a Uint8Array, not a raw string.
 * Encoded once here so every call to sign/verify reuses the
 * same encoded value rather than re-encoding on every request.
 */
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);

// ─── Constants ────────────────────────────────────────────────────────────────

/** Token lifetime. 8 hours covers a full clinical shift. */
const TOKEN_EXPIRY = "8h";

// ─── Token Signing ────────────────────────────────────────────────────────────

/**
 * signToken
 *
 * Creates a signed JWT from a JwtPayload using HS256.
 *
 * Now async (jose's SignJWT API is Promise-based), where the
 * jsonwebtoken version was synchronous. All call sites updated
 * accordingly.
 *
 * CC = 1 (no branching)
 *
 * @param payload - The data to embed in the token.
 * @returns A Promise resolving to a signed JWT string.
 */
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

// ─── Token Verification ───────────────────────────────────────────────────────

export type TokenVerificationResult =
  | { valid: true; payload: JwtPayload }
  | { valid: false; payload: null };

/**
 * verifyToken
 *
 * Verifies the signature and expiry of a JWT string.
 * Works correctly in both the Node.js runtime and the Edge
 * Runtime, since jose uses the Web Crypto API internally rather
 * than Node's 'crypto' module.
 *
 * CC = 2 (one try/catch decision point)
 *
 * @param token - The raw JWT string to verify.
 * @returns A Promise resolving to TokenVerificationResult.
 */
export async function verifyToken(token: string): Promise<TokenVerificationResult> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { valid: true, payload: payload as unknown as JwtPayload };
  } catch {
    // Covers: expired tokens, bad signatures, malformed strings
    return { valid: false, payload: null };
  }
}

// ─── Cookie Extraction ────────────────────────────────────────────────────────

/**
 * extractTokenFromCookie
 *
 * Unchanged — pure string parsing, no cryptographic operations,
 * so this function was never affected by the Edge Runtime issue.
 *
 * CC = 2 (one conditional: found / not found)
 */
export function extractTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (!match) return null;

  return match.split("=")[1] ?? null;
}