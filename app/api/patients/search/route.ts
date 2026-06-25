/**
 * app/api/patients/search/route.ts
 *
 * GET /api/patients/search?query=...
 *
 * HTTP boundary layer for patient search.
 *
 * RESPONSIBILITIES:
 *   - Extract the `query` search parameter from the request URL
 *   - Delegate to patientSearchService.searchPatients()
 *   - Return the result in the standard API response envelope
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Matching strategy (case-insensitivity, ID/name matching)
 *       → services/patientSearchService.ts
 *   - Database queries            → services/patientSearchService.ts
 *   - Authentication               → middleware.ts (this route must be
 *                                     added to PROTECTED_ROUTES — see
 *                                     utils/constants.ts update below)
 *
 * DESIGN NOTES:
 *   - This handler is deliberately thinner than the Sprint 1 login
 *     and registration routes. Those routes branch on
 *     result.success because their underlying service functions
 *     have genuine failure cases (wrong password, validation
 *     failure). searchPatients() has no failure case — it always
 *     succeeds, returning either a populated or empty array. There
 *     is therefore no result-shape branch here, only the try/catch
 *     for genuinely unexpected errors (e.g. a database connection
 *     failure). This is why this route's CC sits at the low end of
 *     the 2–3 target range — the thinness is a correct reflection
 *     of the route's actual responsibility, not an artificial
 *     reduction.
 *
 *   - An empty query parameter is not treated as a request error.
 *     It is passed through to searchPatients() as-is, which
 *     already defines (in Stage 2) that an empty/whitespace query
 *     returns an empty result array. This route does not duplicate
 *     that decision with its own validation branch.
 *
 * CYCLOMATIC COMPLEXITY:
 *   GET handler: CC = 2
 *     +1  function entry
 *     +1  try/catch decision point
 */

import { NextRequest, NextResponse } from "next/server";
import { searchPatients }            from "@/services/patientSearchService";
import { successResponse, errorResponse } from "@/utils/apiResponse";
import { PatientSearchResult }       from "@/types/patientSearch";

// ─── Response Type ────────────────────────────────────────────────────────────

interface PatientSearchResponseData {
  results: PatientSearchResult[];
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

/**
 * GET /api/patients/search?query=...
 *
 * Returns: { success, message, data: { results } }
 *
 * CC = 2
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // ── Parse Query Parameter ─────────────────────────────────────────────────

    const query = request.nextUrl.searchParams.get("query") ?? undefined;

    // ── Delegate to Service Layer ─────────────────────────────────────────────

    // searchPatients() owns all matching logic. This handler does
    // not know HOW search works, only what to do with the result.
    const results = await searchPatients({ query });

    // ── Respond ────────────────────────────────────────────────────────────────

    // No result.success branch needed — searchPatients() always
    // returns an array (possibly empty). An empty array is a
    // complete, valid answer, not a failure.
    return successResponse<PatientSearchResponseData>(
      "Search completed.",
      { results },
      200
    );

  } catch (error) {
    console.error("[GET /api/patients/search]", error);
    return errorResponse("An unexpected error occurred. Please try again.", 500);
  }
}