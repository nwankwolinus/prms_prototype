/**
 * types/patientSearch.ts
 *
 * Shared TypeScript contracts for patient search operations.
 *
 * WHY THIS FILE EXISTS:
 * Search is a read operation with its own request/response shape,
 * distinct from the storage shape (IPatient, defined in
 * types/patient.ts). Keeping these separate means changes to how
 * search results are displayed do not require touching the
 * Mongoose schema or the core domain type, and vice versa.
 *
 * RELATIONSHIP TO types/patient.ts:
 *   IPatient                  → full stored patient record
 *   PatientSearchRequest      → what a caller sends to search
 *   PatientSearchResult       → a single row in a search results list
 *                                (intentionally a SUBSET of IPatient)
 *
 * DESIGN NOTE — single query field, dual matching:
 *   A single free-text `query` field supports searching by EITHER
 *   Patient ID (e.g. "PAT-2026-0001") OR patient name (e.g. "John"
 *   or "John Doe"), through one search box. The matching strategy
 *   itself (which field(s) to check, partial vs. exact match) is a
 *   service-layer decision, deferred to a later stage — this type
 *   only declares that a single query string is the caller's input.
 *
 * DESIGN NOTE — why PatientSearchResult is not IPatient:
 *   A search results list should not carry every field of a full
 *   patient record. This mirrors the existing
 *   PatientRegistrationInput vs. IPatient separation from Sprint 1
 *   — applied here to the read side rather than the write side.
 *
 * SCOPE NOTE (Sprint 2 Stage 1 correction):
 *   Pagination fields (page, pageSize) and a paginated response
 *   wrapper were initially included in a draft of this file, then
 *   removed. Sprint 2's requirement is search and view by Patient
 *   ID or Name only — pagination was not part of the requirements
 *   document and would have introduced unjustified structure ahead
 *   of genuine need. If Sprint 4 reporting requirements later
 *   demand pagination, it should be added at that point, against
 *   an actual stated requirement.
 *
 * VALIDATION NOTE:
 *   Per the Sprint 2 Stage 1 constraint, no validation logic lives
 *   here. These are pure type declarations. Validation of search
 *   parameters belongs in the service layer, to be implemented in
 *   a later stage.
 *
 * CYCLOMATIC COMPLEXITY: 0
 *   Type declarations contain no executable logic and contribute
 *   zero to McCabe's Cyclomatic Complexity — consistent with
 *   types/patient.ts and types/index.ts from Sprint 1.
 */

import { Gender } from "@/types/patient";

// ─── Patient Search Request ───────────────────────────────────────────────────

/**
 * PatientSearchRequest
 *
 * Shape of the query a caller supplies when searching for
 * patients. A single free-text field supports matching by either
 * Patient ID or patient name through one search box.
 *
 * query - free-text search term, matched against patientId,
 *         firstName, and/or lastName (matching strategy decided
 *         in the service layer, in a later stage)
 */
export interface PatientSearchRequest {
  query?: string;
}

// ─── Patient Search Result ────────────────────────────────────────────────────

/**
 * PatientSearchResult
 *
 * Shape of a single row in a search results list.
 * Deliberately a subset of IPatient — see design note above.
 * Excludes: dateOfBirth, phoneNumber, address, createdAt,
 * updatedAt (not useful in a list view — available via the
 * Patient Detail view instead, see types/patientDetail.ts).
 */
export interface PatientSearchResult {
  patientId:  string;
  firstName:  string;
  lastName:   string;
  gender:     Gender;
}