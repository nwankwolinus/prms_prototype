/**
 * types/patientReport.ts
 *
 * Shared TypeScript contracts for the patient report.
 *
 * WHY THIS FILE EXISTS:
 * Declares the shape of a single report row and the full report
 * response. The report is a read-only, parameter-free use case
 * (a complete, unpaginated patient listing) — no request DTO is
 * declared, consistent with this project's established avoidance
 * of unjustified wrapper types (see types/patientDetail.ts,
 * types/patientDelete.ts).
 *
 * DESIGN NOTE — PatientReportItem is a genuinely distinct shape,
 * not a reuse of PatientSearchResult or PatientDetailResponse:
 *   PatientSearchResult (Sprint 2) deliberately excludes
 *   dateOfBirth and phoneNumber, both of which the report requires
 *   — reusing it is not possible without first widening it, which
 *   would undo Sprint 2's data-minimisation design for the search
 *   use case. PatientDetailResponse (= PersistedPatient) carries
 *   every field, including address, createdAt, and updatedAt,
 *   none of which the report needs — reusing it directly would
 *   expose more data than this specific use case requires,
 *   repeating the exact problem PatientSearchResult was introduced
 *   to solve. A distinct, narrower type is therefore justified by
 *   genuine structural difference from both existing types, not
 *   speculative future flexibility.
 *
 * DESIGN NOTE — full name as a single field vs. separate
 * firstName/lastName:
 *   The brief specifies "Full Name" as a report column. This is
 *   modelled here as separate firstName/lastName fields, NOT a
 *   single concatenated fullName string. Reasoning: concatenation
 *   ("Jane" + " " + "Doe") is a presentation concern, not a data
 *   concern — the UI layer (Stage 4) can trivially combine these
 *   two fields for display, but if the DTO stored a pre-concatenated
 *   string, any future consumer needing first/last name separately
 *   (e.g. for sorting by last name) would have to re-split it. This
 *   mirrors PatientSearchResult and PatientDetailResponse, both of
 *   which already store firstName/lastName separately rather than
 *   combined, for the same reason.
 *
 * VALIDATION NOTE:
 *   No validation logic lives here. The report has no caller-
 *   supplied input to validate — it is a parameter-free listing.
 *
 * CYCLOMATIC COMPLEXITY: 0
 *   Pure type declarations — no executable logic.
 */

import { Gender } from "@/types/patient";

// ─── Patient Report Item ───────────────────────────────────────────────────────

/**
 * PatientReportItem
 *
 * Shape of a single row in the patient report. Distinct from
 * PatientSearchResult (narrower) and PatientDetailResponse
 * (broader) — see design note above.
 */
export interface PatientReportItem {
  patientId:    string;
  firstName:    string;
  lastName:     string;
  gender:       Gender;
  dateOfBirth:  Date;
  phoneNumber:  string;
  address: string;     
  createdAt: Date;
}

// ─── Patient Report Response ───────────────────────────────────────────────────

/**
 * PatientReportResponse
 *
 * The full report: a complete, unpaginated listing of all
 * registered patients.
 *
 * CORRECTION (pre-Stage-2 review): an earlier draft of this type
 * included a totalCount: number field, reasoning that displaying
 * "N patients registered" alongside the listing was a reasonable
 * UI convenience. This was removed on review: because the report
 * is explicitly unpaginated and returns the complete patient
 * collection (per the Stage 1 requirement — "no pagination is
 * required"), patients.length always equals the true total. A
 * dedicated totalCount field would therefore duplicate information
 * already present in the response — a second source of truth for
 * a fact the client can derive directly — rather than supply
 * information the client could not otherwise obtain. This is
 * consistent with the project's recurring bias against adding
 * fields beyond what current requirements genuinely need (see
 * types/patientSearch.ts's removal of pagination metadata in
 * Sprint 2, and types/patientDetail.ts's removal of duplicated
 * fields in the same sprint). If a future sprint introduces
 * pagination or server-side filtering for this endpoint,
 * totalCount would become genuinely necessary at that point
 * (patients.length would then only reflect the current page, not
 * the true total) — and should be added then, as a justified
 * extension responding to an actual requirement, not pre-emptively.
 */
export interface PatientReportResponse {
  patients: PatientReportItem[];
}