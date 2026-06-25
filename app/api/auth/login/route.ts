/**
 * app/api/auth/login/route.ts
 *
 * POST /api/auth/login
 *
 * HTTP boundary layer for user authentication.
 *
 * RESPONSIBILITIES:
 *   - Parse and validate the incoming JSON request body
 *   - Delegate credential verification to authService.login()
 *   - Set the HttpOnly JWT cookie on successful authentication
 *   - Return standardised API responses via utils/apiResponse.ts
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Verifying passwords         → services/authService.ts
 *   - Signing tokens              → lib/jwt.ts
 *   - Database queries            → services/authService.ts
 *   - Hashing logic               → lib/password.ts
 *
 * DESIGN NOTES:
 *   - A single try/catch wraps the entire handler. Any unexpected
 *     error (network, database, malformed JSON) is caught here and
 *     returned as a 500 response. This keeps CC minimal — there is
 *     no nested error handling.
 *
 *   - The JWT is set as an HttpOnly cookie, not returned in the
 *     response body. This prevents client-side JavaScript from
 *     accessing the token, mitigating XSS token theft.
 *
 *   - Cookie attributes are defined as constants at the top of
 *     this file so they are visible, auditable, and easy to change
 *     without searching through the handler logic.
 *
 *   - The authService returns a discriminated union (AuthResult).
 *     This means the handler needs only a single if/else — no
 *     nested conditionals required to handle failure cases.
 *
 * CYCLOMATIC COMPLEXITY:
 *   POST handler: CC = 3
 *     +1  function entry
 *     +1  authService result check (success / failure)
 *     +1  try/catch decision point
 */

import { NextRequest, NextResponse } from "next/server";
import { login }                     from "@/services/authService";
import { successResponse, errorResponse } from "@/utils/apiResponse";
import { AUTH_COOKIE_NAME }          from "@/utils/constants";
import { PublicUser }                from "@/types";

// ─── Cookie Configuration ─────────────────────────────────────────────────────

/**
 * Cookie attributes defined as constants.
 * Centralising them here means security decisions are visible
 * and auditable at a glance — not buried inside handler logic.
 */
const COOKIE_CONFIG = {
  httpOnly: true,     // Inaccessible to client-side JavaScript — prevents XSS theft
  secure:   process.env.NODE_ENV === "production", // HTTPS only in production
  sameSite: "lax",   // Protects against CSRF while allowing normal navigation
  maxAge:   8 * 60 * 60, // 8 hours in seconds — matches JWT expiry in lib/jwt.ts
  path:     "/",         // Cookie is sent with every request to this domain
} as const;

// ─── Response Type ────────────────────────────────────────────────────────────

/** Shape of the data returned in a successful login response. */
interface LoginResponseData {
  user: PublicUser;
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 *
 * Accepts: { email: string, password: string }
 * Returns: { success, message, data: { user } } + HttpOnly cookie
 *
 * CC = 3
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ── Parse Request Body ────────────────────────────────────────────────────

    const body = await request.json();
    const { email, password } = body as { email: string; password: string };

    // ── Delegate to Service Layer ─────────────────────────────────────────────

    // authService.login() handles all credential logic.
    // This handler does not know HOW authentication works —
    // only what to do with the result.
    const result = await login({ email, password });

    // ── Handle Failure ────────────────────────────────────────────────────────

    if (!result.success) {
      return errorResponse(result.message, 401);
    }

    // ── Handle Success ────────────────────────────────────────────────────────

    // Build the success response first, then attach the cookie to it.
    const response = successResponse<LoginResponseData>(
      "Login successful.",
      { user: result.user },
      200
    );

    // Set the JWT as an HttpOnly cookie.
    // The token never appears in the response body — only in the cookie.
    response.cookies.set(AUTH_COOKIE_NAME, result.token, COOKIE_CONFIG);

    return response;

  } catch (error) {
    // ── Unexpected Errors ─────────────────────────────────────────────────────

    // Catches: malformed JSON, database connection failures,
    // any unhandled exception from the service layer.
    console.error("[POST /api/auth/login]", error);
    return errorResponse("An unexpected error occurred. Please try again.", 500);
  }
}