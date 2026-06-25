/**
 * services/patientSearchService.ts
 *
 * Patient search and retrieval service — business logic layer
 * for read-oriented patient operations.
 *
 * RESPONSIBILITIES:
 *   - Search patients by Patient ID, first name, or last name
 *     (case-insensitive, single query string)
 *   - Retrieve a single patient's full record by Patient ID
 *   - Map Mongoose documents to the DTOs declared in Sprint 2
 *     Stage 1 (PatientSearchResult, PatientDetailResponse)
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - HTTP request parsing        → future API route (Stage 3)
 *   - UI rendering of results     → future page/component (Stage 4)
 *   - Schema definition           → models/Patient.ts (Sprint 1)
 *   - Patient registration        → services/patientService.ts (Sprint 1)
 *
 * DESIGN NOTES:
 *   - This file is deliberately separate from patientService.ts.
 *     patientService.ts owns the write workflow (validate, generate
 *     ID, persist a new patient). This file owns read workflows
 *     (search, view). Neither shares helper functions with the
 *     other, and a change to registration logic has no reason to
 *     touch search logic, or vice versa — high cohesion within
 *     each file, low coupling between them.
 *
 *   - No repository layer is introduced. PatientModel is queried
 *     directly, consistent with the existing architecture decision
 *     recorded in Sprint 1 (services communicate directly with
 *     Mongoose models).
 *
 *   - searchPatients() uses a single MongoDB query with an $or
 *     clause and case-insensitive regex matching, rather than
 *     fetching all patients and filtering in application code.
 *     This keeps matching logic inside the database query rather
 *     than inside branching application logic, which is why
 *     searchPatients() has a notably lower CC than its
 *     responsibility (matching across three fields) might suggest
 *     at first glance — the "matching" itself is data, not control
 *     flow.
 *
 *   - getPatientById() returns a discriminated union
 *     (PatientDetailResult), consistent with AuthResult and
 *     PatientRegistrationResult from Sprint 1. "Not found" is a
 *     genuine, expected failure outcome for a specific-ID lookup —
 *     distinct from searchPatients() returning an empty array,
 *     which is a valid (non-failure) outcome of a broad search.
 *
 * CYCLOMATIC COMPLEXITY:
 *   buildSearchFilter():  CC = 2
 *     +1  function entry
 *     +1  empty/whitespace query check
 *
 *   mapToSearchResult():  CC = 1
 *     +1  function entry (pure mapping, no branching)
 *
 *   searchPatients():     CC = 2
 *     +1  function entry
 *     +1  empty filter check (avoid querying when there is nothing to search)
 *
 *   mapToDetailResponse(): CC = 1
 *     +1  function entry (pure mapping, no branching)
 *
 *   getPatientById():     CC = 3
 *     +1  function entry
 *     +1  empty/whitespace patientId check
 *     +1  document-not-found check
 *
 *   These values are intentionally not minimised below what each
 *   function's genuine responsibility requires — per the Sprint 2
 *   constraint that complexity should not be artificially reduced
 *   solely to satisfy metrics.
 */

import { connectToDatabase }  from "@/lib/mongodb";
import PatientModel           from "@/models/Patient";
import { IPatient }           from "@/types/patient";
import {
  PatientSearchRequest,
  PatientSearchResult,
} from "@/types/patientSearch";
import { PatientDetailResponse } from "@/types/patientDetail";
import { PersistedPatient } from "@/types/patient";

// ─── Result Types ─────────────────────────────────────────────────────────────

/**
 * PatientDetailResult — discriminated union returned by
 * getPatientById(). Mirrors AuthResult and
 * PatientRegistrationResult from Sprint 1 in shape and intent.
 */
export type PatientDetailResult =
  | { success: true;  patient: PatientDetailResponse }
  | { success: false; message: string };

// ─── Query Construction ────────────────────────────────────────────────────────

/**
 * buildSearchFilter
 *
 * Translates a free-text query string into a MongoDB filter
 * object matching patientId, firstName, or lastName,
 * case-insensitively.
 *
 * Extracted as its own pure function so the query-construction
 * concern is independently readable and testable, separate from
 * searchPatients()'s orchestration logic (database connection,
 * query execution, result mapping).
 *
 * CC = 2:
 *   +1  function entry
 *   +1  empty/whitespace query check
 *
 * @param query - The caller's free-text search term.
 * @returns A Mongoose filter object, or an empty object if the
 *          query is empty/whitespace (matches all patients).
 */
function buildSearchFilter(query: string | undefined): Record<string, unknown> {
  const trimmed = query?.trim();

  if (!trimmed) {
    return {};
  }

  // Case-insensitive partial match against any of the three fields.
  // $options: "i" makes the regex case-insensitive; no anchors are
  // used, so "doe" matches "Doe", "Doering", and "Adoe" alike —
  // a deliberate choice for a forgiving, real-world search box.
  const pattern = new RegExp(trimmed, "i");

  return {
    $or: [
      { patientId: pattern },
      { firstName: pattern },
      { lastName:  pattern },
    ],
  };
}

// ─── DTO Mapping ──────────────────────────────────────────────────────────────

/**
 * mapToSearchResult
 *
 * Maps a Mongoose patient document to the minimal
 * PatientSearchResult DTO declared in Stage 1.
 *
 * Extracted as its own function (rather than inlined inside a
 * .map() callback) so the mapping logic has a name, a single
 * responsibility, and is independently testable.
 *
 * CC = 1 — pure mapping, no branching.
 *
 * @param doc - A Mongoose patient document (or lean object).
 * @returns The minimal search-result shape.
 */
function mapToSearchResult(doc: IPatient): PatientSearchResult {
  return {
    patientId: doc.patientId,
    firstName: doc.firstName,
    lastName:  doc.lastName,
    gender:    doc.gender,
  };
}

/**
 * mapToDetailResponse
 *
 * Maps a Mongoose patient document to the full
 * PatientDetailResponse DTO (an alias of IPatient, per the Stage 1
 * correction).
 *
 * CC = 1 — pure mapping, no branching.
 *
 * @param doc - A Mongoose patient document (or lean object).
 * @returns The full patient detail shape.
 */
export function mapToDetailResponse(doc: PersistedPatient): PatientDetailResponse {
  return {
    _id:         doc._id,
    patientId:   doc.patientId,
    firstName:   doc.firstName,
    lastName:    doc.lastName,
    dateOfBirth: doc.dateOfBirth,
    gender:      doc.gender,
    phoneNumber: doc.phoneNumber,
    address:     doc.address,
    createdAt:   doc.createdAt,
    updatedAt:   doc.updatedAt,
  };
}

// ─── Search Patients ───────────────────────────────────────────────────────────

/**
 * searchPatients
 *
 * Searches the patients collection by Patient ID, first name, or
 * last name, case-insensitively, using a single free-text query.
 *
 * Returns an empty array when no matches exist — this is the
 * correct, expected outcome of a search with no results, not a
 * failure. No discriminated union is used here, per the explicit
 * Stage 2 requirement: a search is not a "did this succeed or
 * fail" operation, it is a "what matches this" operation, and an
 * empty answer is still a complete, valid answer.
 *
 * CC = 2:
 *   +1  function entry
 *   +1  empty filter check — when the query is empty/whitespace,
 *       avoid running a full-collection query with no actual
 *       filtering criteria; return an empty result set immediately
 *       instead of returning every patient in the database
 *
 * @param request - The search request (currently just { query }).
 * @returns A Promise resolving to an array of search results
 *          (empty array if no matches, or if the query was empty).
 */
export async function searchPatients(
  request: PatientSearchRequest
): Promise<PatientSearchResult[]> {
  const filter = buildSearchFilter(request.query);

  if (Object.keys(filter).length === 0) {
    return [];
  }

  await connectToDatabase();

  const documents = await PatientModel.find(filter).lean<IPatient[]>();

  return documents.map(mapToSearchResult);
}


// ─── Get Patient By ID ──────────────────────────────────────────────────────────

/**
 * getPatientById
 *
 * Retrieves a single patient's full record by exact Patient ID
 * match. Returns a discriminated union — success with the patient
 * detail, or failure with a message — consistent with the
 * AuthResult / PatientRegistrationResult pattern from Sprint 1.
 *
 * "Not found" is treated as a genuine failure outcome here,
 * unlike searchPatients()'s empty array, because this function
 * represents looking up ONE SPECIFIC patient the caller already
 * believes exists (e.g. they clicked a search result) — failing
 * to find it is meaningfully different from a broad search simply
 * returning nothing.
 *
 * CC = 3:
 *   +1  function entry
 *   +1  empty/whitespace patientId guard
 *   +1  document-not-found check
 *
 * @param patientId - The exact Patient ID to look up.
 * @returns A Promise resolving to PatientDetailResult.
 */
export async function getPatientById(
  patientId: string
): Promise<PatientDetailResult> {

  if (!patientId?.trim()) {
    return { success: false, message: "Patient ID is required." };
  }

  await connectToDatabase();

  const document = await PatientModel.findOne({
    patientId: patientId.trim(),
  }).lean<PersistedPatient>();   // ← changed from .lean<IPatient>()

  if (!document) {
    return { success: false, message: "Patient not found." };
  }

  return { success: true, patient: mapToDetailResponse(document) };
}