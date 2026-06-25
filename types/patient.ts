/**
 * types/patient.ts
 *
 * Shared TypeScript types for the Patient domain.
 *
 * WHY THIS FILE EXISTS:
 * This is the single source of truth for the shape of a Patient
 * record. The Mongoose schema (models/Patient.ts), the service
 * layer (services/patientService.ts), the API route, and the
 * registration form will all import from here — never redefine
 * these fields independently. This prevents the kind of field
 * mismatch that occurred when two different prompts proposed
 * different field sets for patient registration.
 *
 * FIELDS (per original dissertation requirements document):
 *   patientId    - system-generated unique identifier
 *   firstName    - patient's first name
 *   lastName     - patient's last name
 *   dateOfBirth  - patient's date of birth
 *   gender       - patient's gender
 *   phoneNumber  - contact phone number
 *   address      - residential address
 *
 * CYCLOMATIC COMPLEXITY: 0
 *   Type declarations contain no executable logic and therefore
 *   contribute zero to McCabe's Cyclomatic Complexity. This file
 *   serves as a useful zero-complexity baseline when comparing
 *   against the service layer in Chapter 5.
 */

// ─── Gender ───────────────────────────────────────────────────────────────────

/**
 * Valid gender values for a patient record.
 * A union type (not a free-form string) prevents invalid values
 * at compile time and removes the need for a runtime enum check
 * in the service layer — reducing CC there by one decision point.
 */
export type Gender = "Male" | "Female" | "Other";

// ─── Patient Document Shape ───────────────────────────────────────────────────

/**
 * IPatient
 *
 * Shape of a patient record as stored in MongoDB.
 * Used by the Mongoose schema, the service layer, and any
 * component or API response that handles a full patient record.
 */
export interface IPatient {
  _id?:         string;
  patientId:    string;   // System-generated — e.g. PAT-K7MN3Q
  firstName:    string;
  lastName:     string;
  dateOfBirth:  Date;
  gender:       Gender;
  phoneNumber:  string;
  address:      string;
  createdAt?:   Date;
  updatedAt?:   Date;
}

// ─── Patient Registration Input ───────────────────────────────────────────────

/**
 * PatientRegistrationInput
 *
 * Shape of the data submitted when registering a new patient.
 * Deliberately excludes system-generated fields (patientId,
 * _id, createdAt, updatedAt) since the caller never supplies these —
 * the service layer generates or assigns them.
 *
 * This is the type the Stage 4 registration form will conform to,
 * and the type the Stage 5 API route will accept as its request body.
 */
export interface PatientRegistrationInput {
  firstName:   string;
  lastName:    string;
  dateOfBirth: string;   // ISO date string from form input — converted to Date in the service layer
  gender:      Gender;
  phoneNumber: string;
  address:     string;
}

/**
 * PersistedPatient
 *
 * Represents a patient record as it exists once successfully
 * persisted in MongoDB. Unlike IPatient (which marks _id,
 * createdAt, and updatedAt as optional to support pre-persistence
 * contexts such as registration input), PersistedPatient
 * guarantees these fields are present — Mongoose's
 * `timestamps: true` and ID assignment-on-create make this a safe,
 * accurate guarantee for any document actually read back from the
 * database.
 *
 * This is the correct type for:
 *   - The result of a .lean<T>() query against PatientModel
 *   - Any function that only ever receives data already confirmed
 *     to exist in the database (e.g. mapToDetailResponse)
 *
 * IPatient remains correct and unchanged for contexts where a
 * patient object may not yet be persisted.
 */
export type PersistedPatient = Required<Pick<IPatient, "_id" | "createdAt" | "updatedAt">> &
  Omit<IPatient, "_id" | "createdAt" | "updatedAt">;

// ─── Patient Registration Errors ──────────────────────────────────────────────

/**
 * PatientRegistrationErrors
 *
 * Field-level validation error map for the registration form.
 * Mirrors the FormErrors pattern already established in
 * components/forms/LoginForm.tsx — kept consistent across
 * the codebase so both forms share the same error-handling shape.
 */
export type PatientRegistrationErrors = Partial<Record<keyof PatientRegistrationInput, string>>;