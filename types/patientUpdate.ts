/**
 * types/patientUpdate.ts
 *
 * Shared TypeScript contracts for the "Update Patient Record" use case.
 *
 * WHY THIS FILE EXISTS:
 * Declares what a caller may submit as an edit to an existing
 * patient record, and the possible outcomes of attempting that
 * edit. No service logic, validation, or persistence concerns
 * live here — this file declares shapes only.
 *
 * DESIGN NOTE — patientId is NOT part of PatientUpdateInput:
 *   patientId identifies WHICH record to update; it is not itself
 *   an editable attribute. This mirrors the existing
 *   getPatientById(patientId: string) pattern from Sprint 2 — the
 *   identifier is supplied as a separate argument (a function
 *   parameter or route parameter in later stages), never
 *   duplicated inside the payload describing the edit itself.
 *
 * DESIGN NOTE — all editable fields are optional, not required:
 *   PatientUpdateInput supports PARTIAL updates. A caller editing
 *   only a phone number should not be forced to resupply every
 *   other field. This is a deliberate design decision that the
 *   Stage 2 service layer must account for: persistence logic
 *   will need to merge only the supplied fields into the existing
 *   record (e.g. via a partial $set-style update), not perform a
 *   full document replacement. Flagging this now so Stage 2 is
 *   designed around this expectation from the outset, rather than
 *   discovering it midway through service implementation.
 *
 * DESIGN NOTE — fields deliberately excluded from PatientUpdateInput:
 *   - patientId   → identifier, supplied separately (see above)
 *   - createdAt   → immutable historical fact, owned by Mongoose
 *   - updatedAt   → managed automatically by Mongoose on every
 *                   successful update; never client-supplied
 *
 * DESIGN NOTE — why this is a distinct interface, not an alias:
 *   Sprint 2 established that types should only be duplicated
 *   (rather than aliased) when they genuinely differ in shape
 *   (see types/patient.ts and the PatientDetailResponse
 *   correction). PatientUpdateInput is NOT identical to
 *   PatientRegistrationInput: registration requires every field
 *   (a new patient must be fully specified), while an update must
 *   allow every field to be optional (partial edits). This is a
 *   genuine structural difference, not speculative flexibility —
 *   a distinct declaration is justified here.
 *
 * RESULT PATTERN:
 *   PatientUpdateResult mirrors AuthResult (Sprint 1) and
 *   PatientRegistrationResult (Sprint 1) exactly: a discriminated
 *   union with a success case carrying the updated patient, and a
 *   failure case carrying a message and optional per-field errors.
 *   This keeps the result-handling shape consistent across every
 *   write operation in the codebase.
 *
 * VALIDATION NOTE:
 *   No validation logic lives here. Whether a submitted field
 *   value is well-formed (e.g. a valid date, a non-empty string)
 *   is a Stage 2 service-layer concern, deferred entirely.
 *
 * CYCLOMATIC COMPLEXITY: 0
 *   Pure type declarations — no executable logic.
 */

import { Gender } from "@/types/patient";
import { PatientDetailResponse } from "@/types/patientDetail";

// ─── Patient Update Input ──────────────────────────────────────────────────────

/**
 * PatientUpdateInput
 *
 * Shape of the data submitted when updating an existing patient
 * record. All fields are optional, supporting partial updates.
 * patientId is intentionally NOT included — see design note above.
 */
export interface PatientUpdateInput {
  firstName?:   string;
  lastName?:    string;
  dateOfBirth?: string;   // ISO date string, consistent with PatientRegistrationInput
  gender?:      Gender;
  phoneNumber?: string;
  address?:     string;
}

// ─── Patient Update Errors ─────────────────────────────────────────────────────

/**
 * PatientUpdateErrors
 *
 * Field-level validation error map for the update operation.
 * Mirrors PatientRegistrationErrors (Sprint 1) in shape.
 */
export type PatientUpdateErrors = Partial<Record<keyof PatientUpdateInput, string>>;

// ─── Patient Update Result ─────────────────────────────────────────────────────

/**
 * PatientUpdateResult — discriminated union returned by the
 * Stage 2 service-layer update function.
 *
 * Mirrors AuthResult and PatientRegistrationResult exactly:
 *   success: true  → carries the updated patient record
 *   success: false → carries a message, and optionally per-field errors
 */
export type PatientUpdateFailureReason = "VALIDATION" | "NOT_FOUND" | "SERVER_ERROR";

export type PatientUpdateResult =
  | { success: true;  patient: PatientDetailResponse }
  | {
      success: false;
      reason: PatientUpdateFailureReason;
      message: string;
      fieldErrors?: PatientUpdateErrors;
    };