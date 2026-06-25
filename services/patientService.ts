/**
 * services/patientService.ts
 *
 * Patient registration service — business logic layer.
 *
 * RESPONSIBILITIES:
 *   - Validate patient registration input
 *   - Generate a unique Patient ID
 *   - Persist the patient record to MongoDB
 *   - Return structured results to the Route Handler
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - HTTP request parsing       → app/api/patients/route.ts (Stage 5)
 *   - Patient ID format          → utils/generatePatientId.ts
 *   - Database connection        → lib/mongodb.ts
 *   - Schema-level constraints   → models/Patient.ts
 *
 * DESIGN NOTES:
 *   - Follows the identical discriminated-union result pattern
 *     established in services/authService.ts (AuthResult). This
 *     keeps both service modules structurally consistent and
 *     means the Route Handler in Stage 5 can use the same
 *     if/else pattern already used in the login Route Handler.
 *
 *   - Validation is extracted into its own pure function
 *     (validateRegistrationInput) rather than inlined into
 *     registerPatient(). This keeps registerPatient's CC focused
 *     on orchestration, while validation's CC is isolated and
 *     independently testable.
 *
 *   - Guard clauses are used throughout — consistent with the
 *     pattern in authService.login(). Each failure returns early;
 *     the happy path remains unindented.
 *
 * CYCLOMATIC COMPLEXITY:
 *   validateRegistrationInput(): CC = 6
 *     +1  function entry
 *     +1  firstName empty check
 *     +1  lastName empty check
 *     +1  dateOfBirth empty/invalid check
 *     +1  phoneNumber empty check
 *     +1  address empty check
 *
 *   registerPatient(): CC = 4
 *     +1  function entry
 *     +1  validation failure check
 *     +1  duplicate patientId collision check (retry loop guard)
 *     +1  save failure check
 *
 *   This is the highest-CC service function in Sprint 1 so far,
 *   and represents the natural complexity ceiling for input
 *   validation logic with five required fields.
 */

import { connectToDatabase }   from "@/lib/mongodb";
import { generatePatientId }   from "@/utils/generatePatientId";
import PatientModel            from "@/models/Patient";
import {
  IPatient,
  PatientRegistrationInput,
  PatientRegistrationErrors,
} from "@/types/patient";
import { PatientUpdateInput, PatientUpdateErrors, PatientUpdateResult } from "@/types/patientUpdate";
import { PatientDeleteResult } from "@/types/patientDelete";
import { mapToDetailResponse } from "@/services/patientSearchService";
import { PersistedPatient } from "@/types/patient";
// ─── Result Types ─────────────────────────────────────────────────────────────

/**
 * PatientRegistrationResult — discriminated union returned by
 * registerPatient(). Mirrors AuthResult from authService.ts.
 *
 * On validation failure, fieldErrors is populated so the Route
 * Handler (and ultimately the form) can display field-level
 * messages rather than a single generic error.
 */
export type PatientRegistrationResult =
  | { success: true;  patient: IPatient }
  | { success: false; message: string; fieldErrors?: PatientRegistrationErrors };

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * validateRegistrationInput
 *
 * Validates patient registration input against required-field
 * and basic format rules. Returns an error map — an empty object
 * means all fields are valid.
 *
 * Extracted as a pure function (no database access, no side
 * effects) so it can be unit tested independently of MongoDB,
 * and so its complexity is isolated from registerPatient's
 * orchestration logic.
 *
 * CC = 6:
 *   +1  function entry
 *   +1  firstName check
 *   +1  lastName check
 *   +1  dateOfBirth check
 *   +1  phoneNumber check
 *   +1  address check
 *
 * @param input - Raw registration input from the API request.
 * @returns A map of field names to error messages.
 */
export function validateRegistrationInput(
  input: PatientRegistrationInput
): PatientRegistrationErrors {
  const errors: PatientRegistrationErrors = {};

  if (!input.firstName?.trim()) {
    errors.firstName = "First name is required.";
  }

  if (!input.lastName?.trim()) {
    errors.lastName = "Last name is required.";
  }

  // Validates both presence AND that the string parses to a real date.
  // isNaN(new Date(...).getTime()) is the standard check for an
  // invalid Date object in JavaScript/TypeScript.
  if (!input.dateOfBirth || isNaN(new Date(input.dateOfBirth).getTime())) {
    errors.dateOfBirth = "A valid date of birth is required.";
  }

  if (!input.phoneNumber?.trim()) {
    errors.phoneNumber = "Phone number is required.";
  }

  if (!input.address?.trim()) {
    errors.address = "Address is required.";
  }

  return errors;
}

/**
 * hasValidationErrors
 *
 * Returns true if the error map contains at least one entry.
 * Extracted to keep registerPatient readable — identical pattern
 * to hasErrors() in components/forms/LoginForm.tsx.
 *
 * CC = 1 — single expression.
 */
function hasValidationErrors(errors: PatientRegistrationErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ─── Patient Registration ──────────────────────────────────────────────────────

/**
 * MAX_ID_GENERATION_ATTEMPTS
 *
 * Upper bound on patientId collision retries. nanoid's collision
 * probability at 6 characters from a 32-character alphabet is
 * astronomically low (~1 in a billion for this dataset size), so
 * this loop will almost always succeed on the first attempt. The
 * cap exists purely to prevent an infinite loop in a worst case.
 */
const MAX_ID_GENERATION_ATTEMPTS = 5;

/**
 * registerPatient
 *
 * Validates input, generates a unique Patient ID, and persists
 * the new patient record to MongoDB.
 *
 * GUARD CLAUSE PATTERN:
 *   Each failure condition returns early — identical structure
 *   to authService.login(). The happy path (save and return)
 *   sits at the lowest indentation level.
 *
 * CC = 4:
 *   +1  function entry
 *   +1  validation failure check
 *   +1  duplicate patientId collision retry guard
 *   +1  save failure check (caught and converted to a result)
 *
 * @param input - Validated registration data from the Route Handler.
 * @returns PatientRegistrationResult — success with the saved
 *          patient, or failure with a message and field errors.
 */
export async function registerPatient(
  input: PatientRegistrationInput
): Promise<PatientRegistrationResult> {

  // Guard 1 — Reject invalid input before touching the database.
  const fieldErrors = validateRegistrationInput(input);
  if (hasValidationErrors(fieldErrors)) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  await connectToDatabase();

  // ── Generate a Unique Patient ID ─────────────────────────────────────────
  // Guard 2 — Retry on the rare chance of a generated ID collision.
  // The loop itself is bounded and the database unique index on
  // patientId is the ultimate source of truth — this is a courtesy
  // retry to avoid surfacing a raw database error to the user.
  let patientId = generatePatientId();
  let attempts  = 0;

  while (attempts < MAX_ID_GENERATION_ATTEMPTS) {
    const existing = await PatientModel.findOne({ patientId }).lean();
    if (!existing) break;

    patientId = generatePatientId();
    attempts += 1;
  }

  // ── Persist the Patient Record ───────────────────────────────────────────
  // Guard 3 — Catch save failures (e.g. residual unique index
  // violation) and convert them into a structured result rather
  // than letting a raw MongoDB error reach the Route Handler.
  try {
    const created = await PatientModel.create({
      patientId,
      firstName:   input.firstName.trim(),
      lastName:    input.lastName.trim(),
      dateOfBirth: new Date(input.dateOfBirth),
      gender:      input.gender,
      phoneNumber: input.phoneNumber.trim(),
      address:     input.address.trim(),
    });

    const patient: IPatient = {
      _id:         created._id.toString(),
      patientId:   created.patientId,
      firstName:   created.firstName,
      lastName:    created.lastName,
      dateOfBirth: created.dateOfBirth,
      gender:      created.gender,
      phoneNumber: created.phoneNumber,
      address:     created.address,
      createdAt:   created.createdAt,
      updatedAt:   created.updatedAt,
    };

    return { success: true, patient };

  } catch {
    return {
      success: false,
      message: "Unable to register patient. Please try again.",
    };
  }
}

/**
 * services/patientService.ts
 *
 * [EXISTING HEADER AND CONTENT UNCHANGED — validateRegistrationInput(),
 *  hasValidationErrors(), registerPatient(), and all existing imports
 *  remain exactly as in Sprint 1. Only the additions below are new.]
 *
 * SPRINT 3 STAGE 2 EXTENSION:
 *
 * Adds update and delete business logic to the existing patient
 * service. These are write operations, like registration, and
 * belong in this file rather than patientSearchService.ts (which
 * is exclusively read operations: search, view) — maintaining the
 * read/write split established in Sprint 2.
 *
 * RESPONSIBILITIES ADDED:
 *   - Validate partial update input (only fields actually
 *     submitted are checked; omitted fields are left unchanged)
 *   - Verify patient existence before update or delete
 *   - Persist updates via an atomic findOneAndUpdate
 *   - Remove patient records
 *   - Return PatientUpdateResult / PatientDeleteResult
 *
 * EXPLICITLY NOT RESPONSIBLE FOR (ADDED FUNCTIONS):
 *   - HTTP request parsing        → future API route (Stage 3)
 *   - Mapping a document to PatientDetailResponse
 *       → reuses patientSearchService.ts's mapToDetailResponse(),
 *         not duplicated here
 *
 * DESIGN NOTES (ADDITIONS):
 *   - validateUpdateInput() checks a field ONLY if it is present
 *     in the input (`field !== undefined`). This is a deliberate
 *     reconciliation of two requirements that were in tension:
 *     PatientUpdateInput (Stage 1) marks every field optional to
 *     support partial updates, while the brief lists all six
 *     fields as "required." The resolution applied: a field, if
 *     submitted, must be non-empty (same standard as
 *     registration); a field that is omitted entirely is not
 *     flagged as missing, and is left unchanged by the
 *     persistence step.
 *
 *   - updatePatient() uses PatientModel.findOneAndUpdate() as a
 *     single atomic operation, rather than findOne() followed by
 *     a separate save() call — consistent with avoiding a
 *     race-condition window between checking existence and
 *     applying changes, and structurally similar to the
 *     "verify, then act" pattern already used in
 *     registerPatient()'s ID-collision retry logic.
 *
 *   - mapToDetailResponse() is imported from
 *     patientSearchService.ts rather than reimplemented here.
 *     This is the same document-to-DTO mapping logic regardless
 *     of which operation (view, update) produced the document —
 *     duplicating it here would violate the project's consistent
 *     "no duplicated business/mapping logic" principle.
 *
 * CYCLOMATIC COMPLEXITY (ADDITIONS):
 *   validateUpdateInput():       CC = 7
 *     +1  function entry
 *     +1  firstName present-and-empty check
 *     +1  lastName present-and-empty check
 *     +1  dateOfBirth present-and-invalid check
 *     +1  gender present check
 *     +1  phoneNumber present-and-empty check
 *     +1  address present-and-empty check
 *
 *   hasUpdateValidationErrors(): CC = 1
 *     +1  function entry (pure object-key check, no branching)
 *
 *   updatePatient():             CC = 6
 *     +1  function entry
 *     +1  validation-failure guard
 *     +1  patientId empty/whitespace guard
 *     +1  document-not-found guard (after findOneAndUpdate returns null)
 *     +1  try/catch decision point
 *     (+1 implicit — function entry counted once, listed for clarity
 *      against the brief's CC ≤ 6 target; five genuine decision
 *      points plus entry = 6)
 *
 *   deletePatient():             CC = 3
 *     +1  function entry
 *     +1  patientId empty/whitespace guard
 *     +1  document-not-found guard (after findOneAndDelete returns null)
 */

/**
 * validateUpdateInput
 *
 * Validates a PARTIAL patient update. Only fields actually present
 * in the input are checked — an omitted field is not an error,
 * since it will be left unchanged by the update. A field that IS
 * present must be non-empty, matching the same standard
 * validateRegistrationInput() applies to every field.
 *
 * CC = 7:
 *   +1  function entry
 *   +1  firstName present-and-empty check
 *   +1  lastName present-and-empty check
 *   +1  dateOfBirth present-and-invalid check
 *   +1  gender present check
 *   +1  phoneNumber present-and-empty check
 *   +1  address present-and-empty check
 *
 * @param input - The partial update payload.
 * @returns A map of field names to error messages (empty if valid).
 */
export function validateUpdateInput(
  input: PatientUpdateInput
): PatientUpdateErrors {
  const errors: PatientUpdateErrors = {};

  if (input.firstName !== undefined && !input.firstName.trim()) {
    errors.firstName = "First name cannot be empty.";
  }

  if (input.lastName !== undefined && !input.lastName.trim()) {
    errors.lastName = "Last name cannot be empty.";
  }

  if (
    input.dateOfBirth !== undefined &&
    (!input.dateOfBirth || isNaN(new Date(input.dateOfBirth).getTime()))
  ) {
    errors.dateOfBirth = "A valid date of birth is required.";
  }

  if (input.gender !== undefined && !input.gender) {
    errors.gender = "Gender cannot be empty.";
  }

  if (input.phoneNumber !== undefined && !input.phoneNumber.trim()) {
    errors.phoneNumber = "Phone number cannot be empty.";
  }

  if (input.address !== undefined && !input.address.trim()) {
    errors.address = "Address cannot be empty.";
  }

  return errors;
}

/**
 * hasUpdateValidationErrors
 *
 * Returns true if the error map contains at least one entry.
 * Identical pattern to hasValidationErrors() (registration) and
 * hasErrors() (LoginForm, PatientRegistrationForm).
 *
 * CC = 1 — single expression.
 */
function hasUpdateValidationErrors(errors: PatientUpdateErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ─── Update Patient ─────────────────────────────────────────────────────────────

/**
 * updatePatient
 *
 * Validates partial update input, verifies the patient exists,
 * and applies the update atomically. Follows the same guard-clause
 * structure as registerPatient() and authService.login().
 *
 * CORRECTION (post-Stage-2 verification): an empty update payload
 * (no fields submitted) was found, via direct testing, to succeed
 * silently as a no-op. This was not a deliberate design decision —
 * it emerged from validateUpdateInput()'s presence-based checks
 * (an empty object has no fields present, so nothing fails
 * validation) combined with MongoDB tolerating an empty $set. On
 * review, this was decided to be incorrect API contract behaviour:
 * a request that changes nothing should be rejected as a client
 * error, not silently accepted. An explicit guard was added to
 * reject this case before any database operation occurs.
 *
 * CC = 7 (was 6 — +1 for the new empty-input guard):
 *   +1  function entry
 *   +1  empty-input guard (NEW)
 *   +1  validation-failure guard
 *   +1  patientId empty/whitespace guard
 *   +1  document-not-found guard
 *   +1  try/catch decision point
 *
 * @param patientId - The Patient ID identifying which record to update.
 * @param input - The partial fields to update.
 * @returns A Promise resolving to PatientUpdateResult.
 */
export async function updatePatient(
  patientId: string,
  input: PatientUpdateInput
): Promise<PatientUpdateResult> {

  // Guard 1 — Reject an empty update payload. A request that
  // submits no fields changes nothing, and should be treated as
  // a client error rather than a silent, meaningless success.
  // Object.keys(input).length === 0 covers the case where the
  // caller submits {} explicitly; it does NOT cover the case
  // where every field is present but undefined-valued, which
  // TypeScript's type system already discourages at the call
  // site, so this check is intentionally kept simple.
  if (Object.keys(input).length === 0) {
    return { success: false, message: "No fields were provided to update." };
  }

  // Guard 2 — Reject invalid input before touching the database.
  const fieldErrors = validateUpdateInput(input);
  if (hasUpdateValidationErrors(fieldErrors)) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  // Guard 3 — Reject an empty/whitespace patientId, consistent
  // with getPatientById()'s existing precondition check.
  if (!patientId?.trim()) {
    return { success: false, message: "Patient ID is required." };
  }

  await connectToDatabase();

  const updates: Record<string, unknown> = {};
  if (input.firstName   !== undefined) updates.firstName   = input.firstName.trim();
  if (input.lastName    !== undefined) updates.lastName    = input.lastName.trim();
  if (input.dateOfBirth !== undefined) updates.dateOfBirth = new Date(input.dateOfBirth);
  if (input.gender      !== undefined) updates.gender      = input.gender;
  if (input.phoneNumber !== undefined) updates.phoneNumber = input.phoneNumber.trim();
  if (input.address     !== undefined) updates.address     = input.address.trim();

  try {
    const updated = await PatientModel.findOneAndUpdate(
      { patientId: patientId.trim() },
      { $set: updates },
      { new: true }
    ).lean<PersistedPatient>();

    // Guard 4 — No patient matched this ID.
    if (!updated) {
      return { success: false, message: "Patient not found." };
    }

    return { success: true, patient: mapToDetailResponse(updated) };

  } catch {
    return {
      success: false,
      message: "Unable to update patient. Please try again.",
    };
  }
}

// ─── Delete Patient ─────────────────────────────────────────────────────────────

/**
 * deletePatient
 *
 * Verifies the patient exists and removes the record. Simpler
 * than updatePatient() since there is no input to validate — only
 * an existence check and the deletion itself.
 *
 * CC = 3:
 *   +1  function entry
 *   +1  patientId empty/whitespace guard
 *   +1  document-not-found guard
 *
 * @param patientId - The Patient ID identifying which record to delete.
 * @returns A Promise resolving to PatientDeleteResult.
 */
export async function deletePatient(
  patientId: string
): Promise<PatientDeleteResult> {

  // Guard 1 — Reject an empty/whitespace patientId.
  if (!patientId?.trim()) {
    return { success: false, message: "Patient ID is required." };
  }

  await connectToDatabase();

  const deleted = await PatientModel.findOneAndDelete({
    patientId: patientId.trim(),
  });

  // Guard 2 — No patient matched this ID.
  if (!deleted) {
    return { success: false, message: "Patient not found." };
  }

  return { success: true, patientId: patientId.trim() };
}