/**
 * app/api/auth/logout/route.ts
 *
 * POST /api/auth/logout
 *
 * Clears the authentication cookie, effectively ending the session.
 *
 * RESPONSIBILITIES:
 *   - Delete the HttpOnly JWT cookie from the browser
 *   - Return a confirmation response
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Token invalidation on the server side
 *     JWT tokens are stateless — the server holds no session record.
 *     Clearing the cookie is sufficient for this prototype.
 *     A production system would maintain a token denylist in Redis.
 *
 * DESIGN NOTES:
 *   - No service layer call is needed here. Logout is a
 *     presentation-layer concern: instruct the browser to
 *     discard the cookie. No business logic is involved.
 *
 *   - Cookie deletion is achieved by setting maxAge to 0,
 *     which instructs the browser to expire it immediately.
 *
 *   - This is the simplest Route Handler in the system.
 *     CC = 1, Halstead Volume at its floor for a Route Handler.
 *     It serves as a useful lower-bound reference in Chapter 5
 *     when comparing complexity across API modules.
 *
 * CYCLOMATIC COMPLEXITY:
 *   POST handler: CC = 1
 *     +1  function entry
 *     No decision points — single execution path.
 */

import { NextResponse }    from "next/server";
import { successResponse } from "@/utils/apiResponse";
import { AUTH_COOKIE_NAME } from "@/utils/constants";

// ─── POST Handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/logout
 *
 * Clears the JWT cookie and returns a success confirmation.
 * No request body is required or expected.
 *
 * CC = 1
 */
export async function POST(): Promise<NextResponse> {
  const response = successResponse("Logged out successfully.", null, 200);

  // Overwrite the auth cookie with an identical name but maxAge of 0.
  // The browser immediately expires and discards it.
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   0,      // Immediate expiry — browser deletes the cookie
    path:     "/",
  });

  return response;
}