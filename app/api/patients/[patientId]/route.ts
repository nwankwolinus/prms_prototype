/**
 * app/api/patients/[patientId]/route.ts
 *
 * GET    /api/patients/:patientId   — retrieve a patient's full detail record (Sprint 2)
 * PUT    /api/patients/:patientId   — update a patient record (Sprint 3, NEW)
 * DELETE /api/patients/:patientId   — delete a patient record (Sprint 3, NEW)
 *
 * HTTP boundary layer for single-patient operations, keyed by Patient ID.
 *
 * RESPONSIBILITIES:
 *   - Extract patientId from the dynamic route segment (shared logic
 *     across all three methods)
 *   - Parse the request body (PUT only)
 *   - Delegate entirely to services/patientService.ts /
 *     services/patientSearchService.ts
 *   - Map each service result's success/failure (and, for PUT/DELETE,
 *     its `reason`) to the correct HTTP status code
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Validation, business rules    → services/patientService.ts
 *   - Database queries              → services/patientService.ts,
 *                                      services/patientSearchService.ts
 *   - Determining WHY an operation failed beyond what `reason` states
 *
 * DESIGN NOTES:
 *   - PUT and DELETE map `result.reason` directly to a status code via
 *     a literal lookup (REASON_TO_STATUS), rather than inspecting
 *     `result.message` or using a chain of if/else comparisons. This
 *     was a deliberate Stage 3 design correction: the original
 *     PatientUpdateResult/PatientDeleteResult shapes (Stage 1/2) had no
 *     field distinguishing failure types, which would have forced this
 *     route to string-match against message content — a fragile
 *     pattern. Adding the `reason` discriminant to the result types
 *     (done immediately before this file was written, not worked
 *     around here) keeps the service layer HTTP-agnostic while giving
 *     this route a structured, type-safe way to select a status code.
 *
 *   - The REASON_TO_STATUS lookup follows the same data-oriented
 *     pattern already used for ROLE_LABELS (dashboard/layout.tsx) and
 *     VARIANT_STYLES (Button.tsx) — a Record mapping a literal union to
 *     a value, contributing zero Cyclomatic Complexity, versus an
 *     equivalent if/else chain which would add one decision point per
 *     reason value.
 *
 *   - GET's behaviour and complexity are UNCHANGED by this extension.
 *     Only the file's organisation changed (three method exports
 *     instead of one); no logic in the existing GET handler was
 *     modified.
 *
 * CYCLOMATIC COMPLEXITY:
 *   GET handler:    CC = 3   (unchanged from Sprint 2)
 *   PUT handler:     CC = 4
 *     +1  function entry
 *     +1  result.success check
 *     +1  try/catch decision point
 *     (+1 — REASON_TO_STATUS lookup contributes 0; the 4th point is
 *      the function entry counted alongside the three genuine
 *      decision points above)
 *   DELETE handler:  CC = 3
 *     +1  function entry
 *     +1  result.success check
 *     +1  try/catch decision point
 */

import { NextRequest, NextResponse } from "next/server";
import { getPatientById }              from "@/services/patientSearchService";
import { updatePatient, deletePatient } from "@/services/patientService";
import { successResponse, errorResponse, toApiFieldErrors } from "@/utils/apiResponse";
import { PatientDetailResponse }       from "@/types/patientDetail";
import { PatientUpdateInput, PatientUpdateFailureReason } from "@/types/patientUpdate";
import { PatientDeleteFailureReason }  from "@/types/patientDelete";

// ─── Route Params Type ────────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ patientId: string }>;
}

// ─── Response Types ───────────────────────────────────────────────────────────

interface PatientDetailResponseData {
  patient: PatientDetailResponse;
}

interface PatientDeleteResponseData {
  patientId: string;
}

// ─── Reason-to-Status Lookups ──────────────────────────────────────────────────

/**
 * REASON_TO_STATUS (update)
 *
 * Maps each PatientUpdateFailureReason to its corresponding HTTP
 * status code. A lookup, not a conditional chain — contributes 0 to
 * Cyclomatic Complexity, consistent with the ROLE_LABELS /
 * VARIANT_STYLES pattern already used elsewhere in this codebase.
 */
const UPDATE_REASON_TO_STATUS: Record<PatientUpdateFailureReason, number> = {
  VALIDATION:    400,
  NOT_FOUND:     404,
  SERVER_ERROR:  500,
};

/**
 * REASON_TO_STATUS (delete)
 * Same pattern, smaller union (no VALIDATION case for delete).
 */
const DELETE_REASON_TO_STATUS: Record<PatientDeleteFailureReason, number> = {
  NOT_FOUND:     404,
  SERVER_ERROR:  500,
};

// ─── GET Handler (Sprint 2 — UNCHANGED) ────────────────────────────────────────

/**
 * GET /api/patients/:patientId
 *
 * Returns: { success, message, data: { patient } }
 *          or 404 if the patient does not exist
 *
 * CC = 3 — unchanged from Sprint 2.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { patientId } = await params;

    const result = await getPatientById(patientId);

    if (!result.success) {
      return errorResponse(result.message, 404);
    }

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

// ─── PUT Handler (Sprint 3, NEW) ────────────────────────────────────────────────

/**
 * PUT /api/patients/:patientId
 *
 * Accepts: PatientUpdateInput (partial — only submitted fields are
 *          applied)
 * Returns: { success, message, data: { patient } }
 *          400 if validation fails (including an empty payload)
 *          404 if the patient does not exist
 *          500 on an unexpected server/database error
 *
 * CC = 4:
 *   +1  function entry
 *   +1  result.success check
 *   +1  try/catch decision point
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { patientId } = await params;
    const body = (await request.json()) as PatientUpdateInput;

    // updatePatient() owns ALL validation and business rules. This
    // handler does not inspect individual fields — only the overall
    // success/failure outcome and, on failure, the `reason` discriminant.
    const result = await updatePatient(patientId, body);

    if (!result.success) {
      const status = UPDATE_REASON_TO_STATUS[result.reason];
      const fieldErrors = toApiFieldErrors(result.fieldErrors);
      return errorResponse(result.message, status, fieldErrors);
    }

    return successResponse<PatientDetailResponseData>(
      "Patient updated successfully.",
      { patient: result.patient },
      200
    );

  } catch (error) {
    console.error("[PUT /api/patients/[patientId]]", error);
    return errorResponse("An unexpected error occurred. Please try again.", 500);
  }
}

// ─── DELETE Handler (Sprint 3, NEW) ──────────────────────────────────────────────

/**
 * DELETE /api/patients/:patientId
 *
 * Returns: { success, message, data: { patientId } }
 *          404 if the patient does not exist
 *          500 on an unexpected server/database error
 *
 * CC = 3:
 *   +1  function entry
 *   +1  result.success check
 *   +1  try/catch decision point
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { patientId } = await params;

    const result = await deletePatient(patientId);

    if (!result.success) {
      const status = DELETE_REASON_TO_STATUS[result.reason];
      return errorResponse(result.message, status);
    }

    return successResponse<PatientDeleteResponseData>(
      "Patient deleted successfully.",
      { patientId: result.patientId },
      200
    );

  } catch (error) {
    console.error("[DELETE /api/patients/[patientId]]", error);
    return errorResponse("An unexpected error occurred. Please try again.", 500);
  }
}