/**
 * app/api/patients/[patientId]/route.ts
 *
 * GET /api/patients/:patientId
 *
 * HTTP boundary layer for retrieving a single patient's detail
 * record.
 *
 * RESPONSIBILITIES:
 *   - Extract patientId from the dynamic route segment
 *   - Delegate to patientSearchService.getPatientById()
 *   - Map the discriminated-union result to 200 (found) or
 *     404 (not found)
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Determining WHY a patient wasn't found
 *       → services/patientSearchService.ts
 *   - Database queries            → services/patientSearchService.ts
 *   - Authentication               → middleware.ts (this route must be
 *                                     added to PROTECTED_ROUTES — see
 *                                     utils/constants.ts update below)
 *
 * DESIGN NOTES:
 *   - This handler mirrors app/api/auth/login/route.ts in shape:
 *     delegate → branch on result.success → respond. The status
 *     code on failure differs deliberately: 404 here (the
 *     resource genuinely does not exist), versus 401 for a failed
 *     login (the credentials were rejected) — distinct, correct
 *     REST semantics for distinct failure categories, consistent
 *     with the status-code reasoning already established for
 *     POST /api/patients (201 on creation) in Sprint 1.
 *
 *   - This route does not inspect why getPatientById() failed
 *     (e.g. empty patientId vs. genuinely missing record) — both
 *     map to the same 404 response. Distinguishing "bad request"
 *     (400) from "not found" (404) was considered but rejected for
 *     this stage: the dynamic route segment guarantees patientId
 *     is always a non-empty string at this point (Next.js would
 *     not match this route at all for an empty segment), so the
 *     "empty patientId" guard inside getPatientById() is
 *     effectively unreachable from this specific caller — it
 *     exists in the service layer because that function may have
 *     other future callers (e.g. an internal service-to-service
 *     call) that are not guaranteed the same precondition.
 *
 * CYCLOMATIC COMPLEXITY:
 *   GET handler: CC = 3
 *     +1  function entry
 *     +1  result.success check
 *     +1  try/catch decision point
 */

import { NextRequest, NextResponse } from "next/server";
import { getPatientById }            from "@/services/patientSearchService";
import { successResponse, errorResponse } from "@/utils/apiResponse";
import { PatientDetailResponse }     from "@/types/patientDetail";

// ─── Response Type ────────────────────────────────────────────────────────────

interface PatientDetailResponseData {
  patient: PatientDetailResponse;
}

// ─── Route Params Type ────────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ patientId: string }>;
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

/**
 * GET /api/patients/:patientId
 *
 * Returns: { success, message, data: { patient } }
 *          or 404 if the patient does not exist
 *
 * CC = 3
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // ── Extract Route Parameter ───────────────────────────────────────────────

    const { patientId } = await params;

    // ── Delegate to Service Layer ─────────────────────────────────────────────

    const result = await getPatientById(patientId);

    // ── Handle Not Found ──────────────────────────────────────────────────────

    if (!result.success) {
      return errorResponse(result.message, 404);
    }

    // ── Handle Success ────────────────────────────────────────────────────────

    return successResponse<PatientDetailResponseData>(
      "Patient retrieved successfully.",
      { patient: result.patient },
      200
    );

  } catch (error) {
    console.error("[GET /api/patients/[patientId]]", error);
    return errorResponse("An unexpected error occurred. Please try again.", 500);
  }
}