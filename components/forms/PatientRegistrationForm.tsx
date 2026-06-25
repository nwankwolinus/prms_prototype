/**
 * components/forms/PatientRegistrationForm.tsx
 *
 * Patient registration form component — UI orchestration layer.
 *
 * [Stage 4 sections unchanged — see previous version for full
 *  header documentation of validateForm, hasErrors, handleChange]
 *
 * STAGE 5 UPDATE:
 *   handleSubmit now calls POST /api/patients instead of logging
 *   to the console. This is the integration point explicitly
 *   marked as pending in the Stage 4 version of this file.
 *
 *   Server-side field errors (from validateRegistrationInput in
 *   patientService.ts) are merged into the same FormErrors state
 *   used for client-side errors. This means a single error display
 *   mechanism in the JSX handles both validation layers — no
 *   separate UI path needed for server vs. client errors.
 *
 * CYCLOMATIC COMPLEXITY (handleSubmit only — others unchanged):
 *   handleSubmit(): CC = 5
 *     +1  function entry
 *     +1  hasErrors() client validation failure check
 *     +1  response.ok check
 *     +1  data.errors presence check (server field errors)
 *     +1  try/catch decision point
 */

"use client";

import { useState } from "react";
import Input         from "@/components/ui/Input";
import Select        from "@/components/ui/Select";
import Button        from "@/components/ui/Button";
import { Gender }    from "@/types/patient";

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

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_VALUES: FormValues = {
  firstName:   "",
  lastName:    "",
  dateOfBirth: "",
  gender:      "",
  phoneNumber: "",
  address:     "",
};

const GENDER_OPTIONS = [
  { value: "Male",   label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other",  label: "Other" },
];

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * validateForm — unchanged from Stage 4. CC = 6.
 */
function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.firstName.trim())   errors.firstName   = "First name is required.";
  if (!values.lastName.trim())    errors.lastName    = "Last name is required.";
  if (!values.dateOfBirth)        errors.dateOfBirth = "Date of birth is required.";
  if (!values.gender)              errors.gender      = "Gender is required.";
  if (!values.phoneNumber.trim()) errors.phoneNumber = "Phone number is required.";
  if (!values.address.trim())     errors.address     = "Address is required.";

  return errors;
}

/**
 * hasErrors — unchanged from Stage 4. CC = 1.
 */
function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PatientRegistrationForm — CC = 1 (component body, unchanged).
 */
export default function PatientRegistrationForm() {

  const [values, setValues]         = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors]         = useState<FormErrors>({});
  const [formError, setFormError]   = useState<string>("");
  const [isLoading, setIsLoading]   = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [patientId, setPatientId]   = useState<string>("");

  /**
   * handleChange — unchanged from Stage 4. CC = 1.
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
   * STAGE 5: Now calls POST /api/patients and handles the real
   * response, replacing the Stage 4 console.log placeholder.
   *
   * CC = 5:
   *   +1  function entry
   *   +1  hasErrors() client validation failure check
   *   +1  response.ok check
   *   +1  data.errors presence check (merge server field errors)
   *   +1  try/catch decision point
   */
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setFormError("");

    // Step 1 — Client-side validation (unchanged from Stage 4).
    const validationErrors = validateForm(values);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Step 2 — Submit to the registration endpoint.
      const response = await fetch("/api/patients", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(values),
      });

      const data = await response.json();

      // Step 3a — Handle API failure (400 validation, 500 server error).
      if (!response.ok) {
        setFormError(data.message ?? "Registration failed. Please try again.");

        // Merge server-side field errors into the same error state
        // used for client-side errors — one display mechanism for both.
        if (data.errors) {
          setErrors(data.errors as FormErrors);
        }
        return;
      }

      // Step 3b — Success: capture the generated Patient ID for display.
      setPatientId(data.data.patient.patientId);
      setIsSubmitted(true);

    } catch {
      setFormError("Unable to connect. Please check your connection and try again.");

    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isSubmitted) {
    return (
      <div
        role="status"
        className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
      >
        Patient registered successfully. Patient ID:{" "}
        <span className="font-mono font-semibold">{patientId}</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
      aria-label="Patient registration form"
    >

      {/* ── Form-Level Error ─────────────────────────────────────────────── */}
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
          label="First name" name="firstName" type="text" placeholder="Jane"
          value={values.firstName} onChange={handleChange}
          error={errors.firstName} disabled={isLoading}
        />
        <Input
          label="Last name" name="lastName" type="text" placeholder="Doe"
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
          label="Gender" name="gender" placeholder="Select gender"
          options={GENDER_OPTIONS}
          value={values.gender} onChange={handleChange}
          error={errors.gender} disabled={isLoading}
        />
      </div>

      <Input
        label="Phone number" name="phoneNumber" type="tel"
        placeholder="+234 801 234 5678"
        value={values.phoneNumber} onChange={handleChange}
        error={errors.phoneNumber} disabled={isLoading}
        helperText="Include country code."
      />

      <Input
        label="Address" name="address" type="text"
        placeholder="14 Allen Avenue, Ikeja, Lagos"
        value={values.address} onChange={handleChange}
        error={errors.address} disabled={isLoading}
      />

      <Button type="submit" isLoading={isLoading} fullWidth>
        Register patient
      </Button>

    </form>
  );
}