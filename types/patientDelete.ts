/**
 * types/patientDelete.ts
 *
 * Shared TypeScript contract for the "Delete Patient Record" use case.
 *
 * WHY THIS FILE EXISTS:
 * Declares the possible outcomes of attempting to delete a
 * patient record. No service logic, existence-checking, or
 * persistence concerns live here — this file declares the result
 * shape only.
 *
 * DESIGN NOTE — no PatientDeleteInput / request type:
 *   A delete operation requires exactly one piece of input: which
 *   patient to delete. Wrapping a single patientId string in an
 *   object type purely for naming symmetry with
 *   PatientUpdateInput would repeat the unjustified-abstraction
 *   pattern already rejected twice in Sprint 2 (no
 *   PatientDetailRequest, no pagination wrapper types). patientId
 *   is passed directly as a function argument wherever this is
 *   consumed — identical to the existing
 *   getPatientById(patientId: string) signature from Sprint 2.
 *
 * DESIGN NOTE — why the success case echoes patientId, not the
 * full deleted record:
 *   Every prior result type in this codebase echoes back data
 *   describing what the operation acted on: AuthResult carries
 *   the user, PatientRegistrationResult carries the new patient,
 *   PatientUpdateResult carries the updated patient. A delete
 *   result follows the same convention, but cannot meaningfully
 *   carry a "deleted patient" object — the record no longer
 *   exists, and returning its last-known full detail
 *   (PatientDetailResponse) would expose more data than the
 *   likely use case (a confirmation message, e.g. "Patient
 *   PAT-XXXXXX was deleted") actually requires. Echoing only the
 *   patientId keeps this consistent with the existing convention
 *   of "the result confirms what was acted on" while remaining
 *   honest about what data is still meaningful after a deletion —
 *   the same data-minimisation discipline already applied to
 *   PatientSearchResult in Sprint 2.
 *
 * SCOPE NOTE:
 *   "Patient not found" (attempting to delete a patientId that
 *   does not exist) is modelled as a failure outcome here,
 *   consistent with getPatientById()'s treatment of the same
 *   scenario in Sprint 2 — looking up or acting on one specific,
 *   named patientId that does not exist is a genuine failure, not
 *   an empty-but-valid result (unlike a search returning no
 *   matches).
 *
 * CYCLOMATIC COMPLEXITY: 0
 *   Pure type declaration — no executable logic.
 */

// ─── Patient Delete Result ─────────────────────────────────────────────────────

/**
 * PatientDeleteResult — discriminated union returned by the
 * Stage 2 service-layer delete function.
 *
 * success: true  → carries the patientId that was deleted, for
 *                   confirmation messaging (e.g. "Patient
 *                   PAT-XXXXXX was deleted")
 * success: false → carries a message (e.g. "Patient not found",
 *                   mirroring getPatientById()'s existing
 *                   not-found handling from Sprint 2)
 */
export type PatientDeleteFailureReason = "NOT_FOUND" | "SERVER_ERROR";

export type PatientDeleteResult =
  | { success: true;  patientId: string }
  | { success: false; reason: PatientDeleteFailureReason; message: string };