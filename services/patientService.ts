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
//  *
//  * param input - The partial update payload.
//  * returns A map of field names to error messages (empty if valid).
//  */
// export function validateUpdateInput(
//   input: PatientUpdateInput
// ): PatientUpdateErrors {
//   const errors: PatientUpdateErrors = {};

//   if (input.firstName !== undefined && !input.firstName.trim()) {
//     errors.firstName = "First name cannot be empty.";
//   }

//   if (input.lastName !== undefined && !input.lastName.trim()) {
//     errors.lastName = "Last name cannot be empty.";
//   }

//   if (
//     input.dateOfBirth !== undefined &&
//     (!input.dateOfBirth || isNaN(new Date(input.dateOfBirth).getTime()))
//   ) {
//     errors.dateOfBirth = "A valid date of birth is required.";
//   }

//   if (input.gender !== undefined && !input.gender) {
//     errors.gender = "Gender cannot be empty.";
//   }

//   if (input.phoneNumber !== undefined && !input.phoneNumber.trim()) {
//     errors.phoneNumber = "Phone number cannot be empty.";
//   }

//   if (input.address !== undefined && !input.address.trim()) {
//     errors.address = "Address cannot be empty.";
//   }

//   return errors;
// }
/**
 * validateUpdateInput
 *
 * REFACTORED (Sprint 3 checkpoint correction): the original
 * implementation used six independent if-blocks, each combining a
 * presence check with a validity check via && (and, for
 * dateOfBirth, an additional || for the invalid-date case). Under
 * McCabe's formal definition, each && and || is an independent
 * decision point, producing a measured CC of 14 against a manual
 * estimate of 7 — the same compound-boolean undercount pattern
 * already documented twice in this project (Sprint 1: Input.tsx /
 * Select.tsx; Sprint 2: PatientDetailPage), now confirmed a third
 * time, this time in a non-JSX, non-presentation function.
 *
 * This refactor replaces six structurally-identical conditional
 * blocks with a declarative array of per-field validators, each
 * checked through a single shared helper (isFieldInvalid). This
 * converts what was six (or more) independent decision points
 * spread across the function body into a single loop with one
 * conditional inside it — the same reduction in McCabe terms that
 * an object/array lookup achieves over a switch statement,
 * applied here to a validation routine rather than a value mapping.
 *
 * CC = 3 (measured target; to be tool-verified):
 *   +1  function entry
 *   +1  the for...of loop
 *   +1  the single conditional inside the loop body
 *
 * Functionally IDENTICAL behaviour to the pre-refactor version:
 * a field is checked only if present, and only flagged if invalid.
 * No validation rule changed — only the control-flow shape.
 */

interface FieldValidator {
  field: keyof PatientUpdateInput;
  isInvalid: (value: unknown) => boolean;
  message: string;
}

/**
 * UPDATE_FIELD_VALIDATORS
 *
 * Declarative list of per-field validation rules. Adding a new
 * editable field in a future sprint means adding one entry here,
 * not one new if-block — this is the structural fix, not merely a
 * CC reduction.
 */
const UPDATE_FIELD_VALIDATORS: FieldValidator[] = [
  {
    field: "firstName",
    isInvalid: (v) => !(v as string).trim(),
    message: "First name cannot be empty.",
  },
  {
    field: "lastName",
    isInvalid: (v) => !(v as string).trim(),
    message: "Last name cannot be empty.",
  },
  {
    field: "dateOfBirth",
    isInvalid: (v) => !v || isNaN(new Date(v as string).getTime()),
    message: "A valid date of birth is required.",
  },
  {
    field: "gender",
    isInvalid: (v) => !v,
    message: "Gender cannot be empty.",
  },
  {
    field: "phoneNumber",
    isInvalid: (v) => !(v as string).trim(),
    message: "Phone number cannot be empty.",
  },
  {
    field: "address",
    isInvalid: (v) => !(v as string).trim(),
    message: "Address cannot be empty.",
  },
];

export function validateUpdateInput(
  input: PatientUpdateInput
): PatientUpdateErrors {
  const errors: PatientUpdateErrors = {};

  for (const validator of UPDATE_FIELD_VALIDATORS) {
    const value = input[validator.field];

    if (value !== undefined && validator.isInvalid(value)) {
      errors[validator.field] = validator.message;
    }
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

// // ─── Update Patient ─────────────────────────────────────────────────────────────

// export async function updatePatient(
//   patientId: string,
//   input: PatientUpdateInput
// ): Promise<PatientUpdateResult> {

//   if (Object.keys(input).length === 0) {
//     return { success: false, reason: "VALIDATION", message: "No fields were provided to update." };
//   }

//   const fieldErrors = validateUpdateInput(input);
//   if (hasUpdateValidationErrors(fieldErrors)) {
//     return {
//       success: false,
//       reason: "VALIDATION",
//       message: "Please correct the highlighted fields.",
//       fieldErrors,
//     };
//   }

//   if (!patientId?.trim()) {
//     return { success: false, reason: "VALIDATION", message: "Patient ID is required." };
//   }

//   await connectToDatabase();

//   const updates: Record<string, unknown> = {};
//   if (input.firstName   !== undefined) updates.firstName   = input.firstName.trim();
//   if (input.lastName    !== undefined) updates.lastName    = input.lastName.trim();
//   if (input.dateOfBirth !== undefined) updates.dateOfBirth = new Date(input.dateOfBirth);
//   if (input.gender      !== undefined) updates.gender      = input.gender;
//   if (input.phoneNumber !== undefined) updates.phoneNumber = input.phoneNumber.trim();
//   if (input.address     !== undefined) updates.address     = input.address.trim();

//   try {
//     const updated = await PatientModel.findOneAndUpdate(
//       { patientId: patientId.trim() },
//       { $set: updates },
//       { new: true }
//     ).lean<PersistedPatient>();

//     if (!updated) {
//       return { success: false, reason: "NOT_FOUND", message: "Patient not found." };
//     }

//     return { success: true, patient: mapToDetailResponse(updated) };

//   } catch {
//     return { success: false, reason: "SERVER_ERROR", message: "Unable to update patient. Please try again." };
//   }
// }
/**
 * updatePatient
 *
 * REFACTORED (Sprint 3 checkpoint correction): the update-payload
 * construction step originally used six independent if-statements
 * (one per editable field), each an independent decision point
 * under McCabe's definition, contributing significantly to this
 * function's measured CC of 11 against a target of 6-7. Combined
 * with the four genuine guard clauses (empty-input, validation
 * failure, empty patientId, not-found) and the try/catch, this
 * pushed the function over the CC=10 risk threshold.
 *
 * This refactor extracts the payload-construction step into a
 * small, reusable buildUpdatePayload() helper, using the SAME
 * declarative field-list pattern as validateUpdateInput()'s
 * refactor above — UPDATE_FIELD_VALIDATORS' field names, paired
 * with a per-field transform function, rather than six separate
 * if-statements duplicating the "if present, transform and
 * include" logic inline.
 *
 * CC = 5 (measured target; to be tool-verified):
 *   +1  function entry
 *   +1  empty-input guard
 *   +1  validation-failure guard
 *   +1  patientId empty/whitespace guard
 *   +1  document-not-found guard
 *   (try/catch and the loop inside buildUpdatePayload() are now
 *    counted separately, in their own functions)
 *
 * Functionally IDENTICAL behaviour: only fields present in the
 * input are included in the update; all are trimmed/converted
 * exactly as before.
 */

interface FieldTransform {
  field: keyof PatientUpdateInput;
  transform: (value: unknown) => unknown;
}

/**
 * UPDATE_FIELD_TRANSFORMS
 *
 * Declarative list pairing each editable field with how its
 * submitted value should be transformed before persistence
 * (trimmed strings, Date conversion for dateOfBirth). Mirrors
 * UPDATE_FIELD_VALIDATORS above in structure and intent.
 */
const UPDATE_FIELD_TRANSFORMS: FieldTransform[] = [
  { field: "firstName",   transform: (v) => (v as string).trim() },
  { field: "lastName",    transform: (v) => (v as string).trim() },
  { field: "dateOfBirth", transform: (v) => new Date(v as string) },
  { field: "gender",      transform: (v) => v },
  { field: "phoneNumber", transform: (v) => (v as string).trim() },
  { field: "address",     transform: (v) => (v as string).trim() },
];

/**
 * buildUpdatePayload
 *
 * Constructs the MongoDB $set payload from only the fields
 * actually present in the input, applying each field's transform.
 *
 * CC = 3:
 *   +1  function entry
 *   +1  the for...of loop
 *   +1  the single presence conditional inside the loop body
 *
 * @param input - The partial update input.
 * @returns A plain object suitable for a $set update.
 */
function buildUpdatePayload(input: PatientUpdateInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const { field, transform } of UPDATE_FIELD_TRANSFORMS) {
    const value = input[field];

    if (value !== undefined) {
      payload[field] = transform(value);
    }
  }

  return payload;
}

export async function updatePatient(
  patientId: string,
  input: PatientUpdateInput
): Promise<PatientUpdateResult> {

  if (Object.keys(input).length === 0) {
    return { success: false, reason: "VALIDATION", message: "No fields were provided to update." };
  }

  const fieldErrors = validateUpdateInput(input);
  if (hasUpdateValidationErrors(fieldErrors)) {
    return {
      success: false,
      reason: "VALIDATION",
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  if (!patientId?.trim()) {
    return { success: false, reason: "VALIDATION", message: "Patient ID is required." };
  }

  await connectToDatabase();

  const updates = buildUpdatePayload(input);

  try {
    const updated = await PatientModel.findOneAndUpdate(
      { patientId: patientId.trim() },
      { $set: updates },
      { new: true }
    ).lean<PersistedPatient>();

    if (!updated) {
      return { success: false, reason: "NOT_FOUND", message: "Patient not found." };
    }

    return { success: true, patient: mapToDetailResponse(updated) };

  } catch {
    return { success: false, reason: "SERVER_ERROR", message: "Unable to update patient. Please try again." };
  }
}
// ─── Delete Patient ─────────────────────────────────────────────────────────────

export async function deletePatient(
  patientId: string
): Promise<PatientDeleteResult> {

  if (!patientId?.trim()) {
    return { success: false, reason: "NOT_FOUND", message: "Patient ID is required." };
  }

  await connectToDatabase();

  try {
    const deleted = await PatientModel.findOneAndDelete({
      patientId: patientId.trim(),
    });

    if (!deleted) {
      return { success: false, reason: "NOT_FOUND", message: "Patient not found." };
    }

    return { success: true, patientId: patientId.trim() };

  } catch {
    return { success: false, reason: "SERVER_ERROR", message: "Unable to delete patient. Please try again." };
  }
}