/**
 * components/forms/PatientUpdateForm.tsx
 *
 * Patient update form component — UI orchestration layer.
 *
 * RESPONSIBILITIES:
 *   - Render fields pre-populated from an existing patient record
 *   - Validate that all fields remain non-empty on submit (same
 *     standard as PatientRegistrationForm)
 *   - Compute the diff between the original record and the
 *     edited values
 *   - Submit PUT /api/patients/[patientId] with ONLY the changed
 *     fields — genuinely exercising the partial-update support
 *     built into updatePatient() (Sprint 3 Stage 2), rather than
 *     always sending a full replacement payload
 *   - Display loading state and validation/API errors
 *   - Call an onSuccess callback (provided by the parent page)
 *     rather than navigating itself
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Fetching the patient to edit  → parent page (Stage 4 File 2)
 *   - Server-side validation        → services/patientService.ts
 *   - Persistence                   → services/patientService.ts
 *   - Deciding where to navigate after success → parent page,
 *     via the onSuccess callback prop
 *
 * DESIGN NOTES:
 *   - Unlike LoginForm (navigates via router.push directly) or
 *     PatientRegistrationForm (shows an inline success message),
 *     this form accepts an onSuccess callback prop. This is a
 *     deliberate design choice: this form is reusable across
 *     potentially different contexts (currently one — the edit
 *     page — but the decoupling is genuine, not speculative,
 *     since "what happens after a successful edit" is legitimately
 *     a parent-context decision, not something this form should
 *     hardcode).
 *
 *   - The diff-computation step (buildChangedFields) is what makes
 *     this form actually exercise updatePatient()'s partial-update
 *     capability, rather than validating all fields but then
 *     submitting all fields regardless of whether they changed.
 *     Validation operates on the FULL form state (catching, e.g.,
 *     an accidentally-blanked field); submission operates on only
 *     the DIFF against the original values.
 *
 *   - Client-side validation mirrors PatientRegistrationForm's
 *     validateForm() exactly in structure (one check per field),
 *     by deliberate choice (see conversation record) rather than
 *     building a more complex "only validate touched fields"
 *     variant — the form is always fully pre-populated, so
 *     requiring every field to remain non-empty is the correct UX
 *     for an editing context, not an oversight.
 *
 * CYCLOMATIC COMPLEXITY:
 *   validateForm():          CC = 6
 *     +1  function entry
 *     +1  firstName empty check
 *     +1  lastName empty check
 *     +1  dateOfBirth empty check
 *     +1  phoneNumber empty check
 *     +1  address empty check
 *     (gender excluded from this count — see note below)
 *
 *   buildChangedFields():    CC = 7
 *     +1  function entry
 *     +1  firstName changed check
 *     +1  lastName changed check
 *     +1  dateOfBirth changed check
 *     +1  gender changed check
 *     +1  phoneNumber changed check
 *     +1  address changed check
 *
 *   hasErrors():             CC = 1
 *   handleChange():          CC = 1
 *
 *   handleSubmit():          CC = 5
 *     +1  function entry
 *     +1  hasErrors() client validation failure check
 *     +1  no-changes-detected check (NEW — see design note)
 *     +1  response.ok check
 *     +1  try/catch decision point
 *
 *   PatientUpdateForm():     CC = 1
 *
 *   File total: 21. Highest single function: 7 (buildChangedFields).
 *   All functions individually well within the ≤8 target.
 */

"use client";

import { useState } from "react";
import Input  from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Gender } from "@/types/patient";
import { PatientDetailResponse } from "@/types/patientDetail";
import { PatientUpdateInput } from "@/types/patientUpdate";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormValues {
  firstName:   string;
  lastName:    string;
  dateOfBirth: string;
  gender:      Gender | "";
  phoneNumber: string;
  address:     string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

interface PatientUpdateFormProps {
  /** The existing patient record to edit. */
  patient: PatientDetailResponse;
  /** Called after a successful update, with the updated record. */
  onSuccess: (updated: PatientDetailResponse) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * toFormValues
 *
 * Converts a PatientDetailResponse into the form's editable field
 * shape, formatting dateOfBirth as an ISO date string suitable for
 * an <input type="date">.
 * CC = 1 — pure mapping, no branching.
 */
function toFormValues(patient: PatientDetailResponse): FormValues {
  return {
    firstName:   patient.firstName,
    lastName:    patient.lastName,
    dateOfBirth: new Date(patient.dateOfBirth).toISOString().split("T")[0],
    gender:      patient.gender,
    phoneNumber: patient.phoneNumber,
    address:     patient.address,
  };
}

const GENDER_OPTIONS = [
  { value: "Male",   label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other",  label: "Other" },
];

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * validateForm
 *
 * Validates that all editable fields remain non-empty. Mirrors
 * PatientRegistrationForm's validateForm() in structure.
 *
 * CC = 6:
 *   +1  function entry
 *   +1  firstName check
 *   +1  lastName check
 *   +1  dateOfBirth check
 *   +1  phoneNumber check
 *   +1  address check
 *
 * NOTE: gender has no empty-string check here because the Select
 * primitive's options array has no empty/placeholder value once
 * the form is pre-populated from an existing patient — gender is
 * guaranteed non-empty by construction in the edit context,
 * unlike registration where it starts as "". This asymmetry with
 * PatientRegistrationForm's validateForm() (which DOES check
 * gender) is deliberate, not an oversight, and is recorded here
 * explicitly so it is not mistaken for one during review.
 */
function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.firstName.trim())   errors.firstName   = "First name is required.";
  if (!values.lastName.trim())    errors.lastName    = "Last name is required.";
  if (!values.dateOfBirth)        errors.dateOfBirth = "Date of birth is required.";
  if (!values.phoneNumber.trim()) errors.phoneNumber = "Phone number is required.";
  if (!values.address.trim())     errors.address     = "Address is required.";

  return errors;
}

/**
 * hasErrors
 * CC = 1.
 */
function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * buildChangedFields
 *
 * Computes the diff between the original patient record and the
 * current (edited) form values, returning only the fields that
 * actually differ. This is what allows the form to exercise
 * updatePatient()'s partial-update support genuinely, rather than
 * always submitting a full replacement payload.
 *
 * CC = 7:
 *   +1  function entry
 *   +1  firstName changed check
 *   +1  lastName changed check
 *   +1  dateOfBirth changed check
 *   +1  gender changed check
 *   +1  phoneNumber changed check
 *   +1  address changed check
 *
 * @param original - The form values as initially loaded.
 * @param current - The form's current (possibly edited) values.
 * @returns A PatientUpdateInput containing only the changed fields.
 */
function buildChangedFields(
  original: FormValues,
  current: FormValues
): PatientUpdateInput {
  const changes: PatientUpdateInput = {};

  if (current.firstName   !== original.firstName)   changes.firstName   = current.firstName;
  if (current.lastName    !== original.lastName)    changes.lastName    = current.lastName;
  if (current.dateOfBirth !== original.dateOfBirth) changes.dateOfBirth = current.dateOfBirth;
  if (current.gender      !== original.gender)      changes.gender      = current.gender as Gender;
  if (current.phoneNumber !== original.phoneNumber) changes.phoneNumber = current.phoneNumber;
  if (current.address     !== original.address)     changes.address     = current.address;

  return changes;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PatientUpdateForm
 *
 * CC = 1 — pure composition, no branching in the component body.
 */
export default function PatientUpdateForm({
  patient,
  onSuccess,
}: PatientUpdateFormProps) {

  // Captured once, at mount, as the basis for the diff computation.
  // Not re-derived on every render, so editing and then reverting a
  // field back to its original value correctly excludes it from the
  // diff again.
  const [originalValues] = useState<FormValues>(() => toFormValues(patient));
  const [values, setValues]       = useState<FormValues>(originalValues);
  const [errors, setErrors]       = useState<FormErrors>({});
  const [formError, setFormError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * handleChange
   * CC = 1 — no branching.
   */
  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  }

  /**
   * handleSubmit
   *
   * CC = 5:
   *   +1  function entry
   *   +1  hasErrors() client validation failure check
   *   +1  no-changes-detected check
   *   +1  response.ok check
   *   +1  try/catch decision point
   */
  async function handleSubmit(
    event: React.ChangeEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setFormError("");

    const validationErrors = validateForm(values);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    const changedFields = buildChangedFields(originalValues, values);

    // Guard — nothing was actually changed. Avoid sending an empty
    // PUT request, which updatePatient() would correctly reject as
    // a 400 anyway (Stage 2/3's empty-update correction) — but
    // catching this client-side avoids an unnecessary network round
    // trip for a request we already know will fail.
    if (Object.keys(changedFields).length === 0) {
      setFormError("No changes were made.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/patients/${patient.patientId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(changedFields),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.message ?? "Update failed. Please try again.");
        if (data.errors) {
          setErrors(data.errors as FormErrors);
        }
        return;
      }

      onSuccess(data.data.patient);

    } catch {
      setFormError("Unable to connect. Please check your connection and try again.");

    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
      aria-label="Patient update form"
    >

      {formError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="First name" name="firstName" type="text"
          value={values.firstName} onChange={handleChange}
          error={errors.firstName} disabled={isLoading}
        />
        <Input
          label="Last name" name="lastName" type="text"
          value={values.lastName} onChange={handleChange}
          error={errors.lastName} disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Date of birth" name="dateOfBirth" type="date"
          value={values.dateOfBirth} onChange={handleChange}
          error={errors.dateOfBirth} disabled={isLoading}
        />
        <Select
          label="Gender" name="gender"
          options={GENDER_OPTIONS}
          value={values.gender} onChange={handleChange}
          error={errors.gender} disabled={isLoading}
        />
      </div>

      <Input
        label="Phone number" name="phoneNumber" type="tel"
        value={values.phoneNumber} onChange={handleChange}
        error={errors.phoneNumber} disabled={isLoading}
      />

      <Input
        label="Address" name="address" type="text"
        value={values.address} onChange={handleChange}
        error={errors.address} disabled={isLoading}
      />

      <Button type="submit" isLoading={isLoading} fullWidth>
        Save changes
      </Button>

    </form>
  );
}