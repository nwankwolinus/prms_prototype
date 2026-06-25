/**
 * middleware.ts  (project root — must live here for Next.js to recognise it)
 *
 * Next.js Edge Middleware — global route protection layer.
 *
 * RESPONSIBILITIES:
 *   - Intercept every incoming request before it reaches a page or API route
 *   - Allow unauthenticated requests to public routes (login, static assets)
 *   - Redirect unauthenticated requests to protected routes → /login
 *   - Redirect authenticated requests away from /login → /dashboard
 *   - Pass all other (unclassified) requests through unmodified
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Verifying credentials       → services/authService.ts
 *   - Generating tokens           → lib/jwt.ts
 *   - Role-based page content     → individual page components
 *
 * CHANGE LOG (Stage 4 correction):
 *   Earlier versions of this file relied on an implicit catch-all:
 *   any route that was neither public nor auth-only was treated as
 *   requiring authentication by default, while PROTECTED_ROUTES in
 *   utils/constants.ts was imported nowhere and had no effect. This
 *   was corrected to use an explicit isProtectedRoute() allowlist
 *   check, so the constant now genuinely governs middleware behaviour.
 *   A route that is unclassified (neither public, auth-only, nor
 *   protected) now passes through without a token check, rather than
 *   being protected by default. New routes added to the application
 *   must be deliberately added to one of the three route lists.
 *
 * DESIGN NOTES:
 *   - Runs on the Next.js Edge Runtime, not Node.js.
 *     This means it executes at the CDN edge — before the server
 *     processes the request at all. Imports must be edge-compatible.
 *     jsonwebtoken IS edge-compatible; mongoose is NOT (never import
 *     database utilities here).
 *
 *   - verifyToken() from lib/jwt.ts is the only external dependency.
 *     Keeping the dependency surface minimal is critical for edge
 *     middleware — heavy imports increase cold-start latency.
 *
 *   - The matcher config at the bottom tells Next.js which paths
 *     this middleware should run on. Excluding static files and
 *     Next.js internals prevents unnecessary execution on assets.
 *
 *   - Five routing decision points give this file CC = 6.
 *     This is a deliberate increase from the previous CC = 5,
 *     reflecting the move from an implicit catch-all to an
 *     explicit, auditable allowlist check.
 *
 * CYCLOMATIC COMPLEXITY:
 *   middleware(): CC = 6
 *     +1  function entry
 *     +1  public route check (allow through)
 *     +1  auth route check (login page — redirect if already authenticated)
 *     +1  protected route check (NEW — require a token)
 *     +1  token presence check (redirect to login if missing)
 *     +1  token validity check (redirect to login if invalid/expired)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { extractTokenFromCookie } from "@/lib/jwt";
import {
  LOGIN_ROUTE,
  DEFAULT_REDIRECT,
  AUTH_COOKIE_NAME,
  PROTECTED_ROUTES,
} from "@/utils/constants";

// ─── Route Classification ─────────────────────────────────────────────────────

/**
 * Routes accessible without authentication.
 * Any request whose pathname starts with one of these
 * values is allowed through immediately.
 */
const PUBLIC_ROUTES = [LOGIN_ROUTE, "/api/auth/login"];

/**
 * Routes reserved for unauthenticated users.
 * Authenticated users visiting these are redirected
 * to the dashboard — prevents double-login confusion.
 */
const AUTH_ONLY_ROUTES = [LOGIN_ROUTE];

// ─── Route Helpers ────────────────────────────────────────────────────────────

/**
 * isPublicRoute
 * CC = 1 — single expression, no branching.
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * isAuthOnlyRoute
 * CC = 1 — single expression, no branching.
 */
function isAuthOnlyRoute(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * isProtectedRoute
 *
 * Returns true if the pathname matches an entry in PROTECTED_ROUTES.
 * This is the explicit allowlist check that was previously missing —
 * PROTECTED_ROUTES is now genuinely load-bearing rather than dead
 * configuration.
 *
 * CC = 1 — single expression, no branching.
 *
 * @param pathname - The incoming request's path.
 * @returns true if the route requires authentication.
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

// ─── Redirect Helpers ─────────────────────────────────────────────────────────

/**
 * redirectTo
 * CC = 1 — no branching.
 */
function redirectTo(path: string, request: NextRequest): NextResponse {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * middleware
 *
 * Central request interceptor for the PRMS application.
 * Evaluated on every request matched by the config below.
 *
 * DECISION TREE:
 *
 *   Request arrives
 *       │
 *       ├─ Is it a public route?              → allow through
 *       │
 *       ├─ Is it an auth-only route?
 *       │     └─ Does a valid token exist?     → redirect to dashboard
 *       │                                      → allow through (show login)
 *       │
 *       ├─ Is it a protected route?            (NEW explicit check)
 *       │     │
 *       │     ├─ No token present?             → redirect to login
 *       │     ├─ Token invalid or expired?     → redirect to login
 *       │     └─ Token valid                   → allow through
 *       │
 *       └─ Unclassified route                  → allow through unmodified
 *
 * CC = 6 (five decision points + entry)
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // ── Decision 1: Public routes ─────────────────────────────────────────────
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Extract the JWT from the incoming cookie header.
  const cookieHeader = request.headers.get("cookie");
  const token = extractTokenFromCookie(cookieHeader);


  // ── Decision 2: Auth-only routes (e.g. /login) ───────────────────────────
  if (isAuthOnlyRoute(pathname)) {
    if (token) {
      const result = await verifyToken(token);
      if (result.valid) {
        return redirectTo(DEFAULT_REDIRECT, request);
      }
    }
    return NextResponse.next();
  }

  // ── Decision 3: Protected routes ─────────────────────────────────────────
  // Only routes explicitly listed in PROTECTED_ROUTES require a token.
  // This replaces the previous implicit catch-all behaviour.
  if (isProtectedRoute(pathname)) {

    // ── Decision 4: Token absence ──────────────────────────────────────────
    if (!token) {
      return redirectTo(LOGIN_ROUTE, request);
    }

    // ── Decision 5: Token validity ─────────────────────────────────────────
    const result = await verifyToken(token);
    // console.log("MIDDLEWARE DEBUG — verifyToken result:", result.valid);
    if (!result.valid) {
      // console.log("MIDDLEWARE DEBUG — token invalid, redirecting to login");
      return redirectTo(LOGIN_ROUTE, request);
    }
    // console.log("MIDDLEWARE DEBUG — token valid, allowing through");
    return NextResponse.next();
  }

  // ── Unclassified route — allow through unmodified ────────────────────────
  // A route that is neither public, auth-only, nor explicitly protected.
  // This intentionally does NOT default to requiring authentication.
  return NextResponse.next();
}

// ─── Matcher Configuration ────────────────────────────────────────────────────

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};