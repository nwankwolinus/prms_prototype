/**
 * app/api/patients/report/route.ts
 *
 * GET /api/patients/report
 *
 * HTTP boundary layer for the patient report.
 *
 * RESPONSIBILITIES:
 *   - Receive the HTTP request
 *   - Call getPatientReport()
 *   - Return the report in the standard API response format
 *   - Handle unexpected server errors
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Querying, sorting, mapping patients
 *       → services/patientSearchService.ts (NOT a dedicated
 *         patientReportService.ts — that approach was explicitly
 *         considered and rejected at Stage 1, in favour of
 *         preserving the read/write service-file boundary
 *         established in Sprint 3; getPatientReport() and
 *         mapToReportItem() live in patientSearchService.ts
 *         alongside searchPatients() and getPatientById())
 *   - Validation               → none required; the report takes
 *                                 no input
 *   - Authentication            → middleware.ts (this path is
 *                                 already covered by the existing
 *                                 "/api/patients" entry in
 *                                 PROTECTED_ROUTES via prefix
 *                                 matching — no new entry needed)
 *
 * DESIGN NOTES:
 *   - omitted NextRequest parameter:
 *     Unlike every other API route in this project, this handler
 *     intentionally omits the NextRequest parameter
 *     (export async function GET(): Promise<NextResponse>, not
 *     GET(request: NextRequest)). The endpoint neither consumes
 *     query parameters, headers, cookies, nor a request body — it
 *     has no purpose for the request object at all. Declaring an
 *     unused parameter purely for signature consistency with other
 *     routes would itself be a form of unnecessary code, the same
 *     category of unjustified construct this project has
 *     consistently avoided elsewhere (no PatientDetailRequest
 *     wrapper for a single ID; lookup tables instead of long
 *     if/else chains; no placeholder interfaces "just in case").
 *     The smallest construct that accurately represents this
 *     handler's actual responsibility is a parameterless function,
 *     and that is what is used here.
 *
 * CYCLOMATIC COMPLEXITY:
 *   GET handler: CC = 2
 *     +1  function entry
 *     +1  try/catch decision point
 *     (no result.success branch — none exists to check)
 */

import { NextResponse } from "next/server";
import { getPatientReport } from "@/services/patientSearchService";
import { successResponse, errorResponse } from "@/utils/apiResponse";
import { PatientReportResponse } from "@/types/patientReport";

// ─── GET Handler ──────────────────────────────────────────────────────────────

/**
 * GET /api/patients/report
 *
 * Returns: { success, message, data: { patients } }
 *
 * CC = 2
 */
export async function GET(): Promise<NextResponse> {
  try {
    const report = await getPatientReport();

    return successResponse<PatientReportResponse>(
      "Patient report generated successfully.",
      report,
      200
    );

  } catch (error) {
    console.error("[GET /api/patients/report]", error);
    return errorResponse("An unexpected error occurred. Please try again.", 500);
  }
}