/**
 * types/patientDetail.ts
 *
 * Shared TypeScript contract for retrieving a single patient's
 * full record — the "View Patient" use case.
 *
 * WHY THIS FILE EXISTS:
 * Declares the API response shape for patient detail retrieval.
 *
 * DESIGN NOTE — alias rather than duplicate (Stage 1 correction):
 *   An earlier draft of this file duplicated every field from
 *   IPatient into a separately-declared PatientDetailResponse
 *   interface, on the reasoning that the storage contract and the
 *   API response contract should be decoupled in case they diverge
 *   later. On review, this was corrected: PatientDetailResponse is
 *   currently IDENTICAL in shape to IPatient, with no genuine
 *   difference between them (unlike PatientRegistrationInput vs.
 *   IPatient in Sprint 1, which differ in real, structural ways —
 *   PatientRegistrationInput omits patientId and represents
 *   dateOfBirth as a string rather than a Date). Duplicating
 *   identical fields here would create a synchronisation burden
 *   without a corresponding benefit: any future field added to
 *   IPatient would need to be manually mirrored here, and a
 *   forgotten update would silently desynchronise the two types.
 *   For a prototype at this scale, the risk of that drift outweighs
 *   the benefit of speculative decoupling. PatientDetailResponse is
 *   therefore declared as an alias of IPatient.
 *
 * RELATIONSHIP TO OTHER PATIENT TYPES:
 *   IPatient                  → full stored patient record (types/patient.ts)
 *   PatientSearchResult       → minimal subset, for list display (types/patientSearch.ts)
 *   PatientDetailResponse     → alias of IPatient, for single-patient view (this file)
 *
 * DESIGN NOTE — no request type:
 *   No PatientDetailRequest interface is declared. A detail lookup
 *   route (e.g. GET /api/patients/[id]) already supplies the
 *   patientId via the route parameter — wrapping a single string
 *   in an object type would be unjustified abstraction, the same
 *   reasoning already applied when pagination was removed from
 *   patientSearch.ts.
 *
 * SCOPE NOTE — no "not found" type:
 *   "Patient not found" is an outcome-handling concern, not a
 *   data-shape concern. Consistent with AuthResult and
 *   PatientRegistrationResult from Sprint 1, this will be modelled
 *   as a discriminated union inside the service layer (Stage 2),
 *   e.g.:
 *
 *     type PatientLookupResult =
 *       | { success: true;  patient: PatientDetailResponse }
 *       | { success: false; message: string };
 *
 *   not declared here.
 *
 * VALIDATION NOTE:
 *   No validation logic lives here, per the Sprint 2 Stage 1
 *   constraint. Whether a given patientId string is well-formed is
 *   a service-layer concern, deferred to Stage 2.
 *
 * CYCLOMATIC COMPLEXITY: 0
 *   A type alias contributes no executable logic.
 */

import { IPatient } from "@/types/patient";
import { PersistedPatient } from "@/types/patient";
// ─── Patient Detail Response ──────────────────────────────────────────────────

/**
 * PatientDetailResponse
 *
 * Full patient record as returned by the "View Patient" use case.
 * An alias of PersistedPatient — a detail response always
 * represents a successfully-retrieved, fully-persisted patient.
 */
export type PatientDetailResponse = PersistedPatient;