/**
 * components/forms/LoginForm.tsx
 *
 * Login form component — UI orchestration layer.
 *
 * RESPONSIBILITIES:
 *   - Manage form field state (email, password)
 *   - Perform client-side validation before submission
 *   - Call POST /api/auth/login and handle the response
 *   - Display field-level and form-level error messages
 *   - Redirect to dashboard on successful authentication
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Verifying credentials         → services/authService.ts
 *   - Setting the JWT cookie        → app/api/auth/login/route.ts
 *   - Token signing                 → lib/jwt.ts
 *   - Route protection              → middleware.ts
 *
 * DESIGN NOTES:
 *   - Client-side validation runs before the network request.
 *     This is not a security measure — the API validates independently.
 *     Its purpose is UX: immediate feedback without a round trip.
 *     Having two validation layers (client + server) is deliberate
 *     and worth noting in Chapter 4 under system design.
 *
 *   - Form state is managed with useState rather than a form library.
 *     For two fields, a library would add Halstead Volume (more imports,
 *     more operators) without meaningful benefit. Keeping it simple
 *     keeps the metrics clean and the code readable.
 *
 *   - useRouter().push() handles post-login navigation.
 *     The component does not know which route is "correct" —
 *     it reads DEFAULT_REDIRECT from constants, maintaining
 *     the single source of truth established in Stage 1.
 *
 *   - Errors are stored in a Record<string, string> keyed by field
 *     name. This structure scales naturally to patient registration
 *     (many more fields) without changing the pattern.
 *
 * CYCLOMATIC COMPLEXITY:
 *   validateForm():  CC = 3
 *     +1  function entry
 *     +1  email empty check
 *     +1  password empty check
 *
 *   handleSubmit():  CC = 4
 *     +1  function entry
 *     +1  validateForm() failure check
 *     +1  response.ok check
 *     +1  try/catch decision point
 *
 *   LoginForm():     CC = 1
 *     +1  component entry
 *     No branching — pure JSX composition of Input and Button
 *
 *   Total file CC contribution: 8 (sum across all functions)
 *   Highest single function:    CC = 4 (handleSubmit)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { DEFAULT_REDIRECT } from "@/utils/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of the form field values. */
interface FormValues {
  email: string;
  password: string;
}

/** Shape of the field-level error map. */
type FormErrors = Partial<Record<keyof FormValues, string>>;

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * validateForm
 *
 * Performs client-side validation on the login form fields.
 * Returns an error map — an empty object means all fields are valid.
 *
 * Isolated as a pure function (no side effects, no state access)
 * so it can be unit tested independently of the component.
 *
 * CC = 3:
 *   +1  function entry
 *   +1  email empty check
 *   +1  password empty check
 *
 * @param values - Current form field values.
 * @returns A map of field names to error messages.
 */
function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.email.trim()) {
    errors.email = "Email address is required.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

/**
 * hasErrors
 *
 * Returns true if the error map contains at least one entry.
 * Extracted to keep handleSubmit readable.
 * CC = 1 — single expression.
 */
function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * LoginForm
 *
 * Stateful form component for user authentication.
 * Composes Input and Button primitives — contains no raw HTML
 * form elements outside of those two components.
 *
 * CC = 1 — the component function itself has no branching.
 * All conditional logic lives in validateForm and handleSubmit.
 */
export default function LoginForm() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────

  const [values, setValues] = useState<FormValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ── Field Change Handler ───────────────────────────────────────────────────

  /**
   * handleChange
   *
   * Updates form values and clears the error for the changed field.
   * Clearing on change gives immediate positive feedback as the
   * user corrects a mistake.
   *
   * CC = 1 — no branching (spread update is not a decision point).
   */
  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;

    setValues((previous) => ({ ...previous, [name]: value }));

    // Clear the field-level error as the user types.
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  }

  // ── Submit Handler ─────────────────────────────────────────────────────────

  /**
   * handleSubmit
   *
   * Orchestrates the login flow:
   *   1. Prevent default form submission
   *   2. Run client-side validation
   *   3. POST credentials to the API
   *   4. Handle success (redirect) or failure (display error)
   *
   * CC = 4:
   *   +1  function entry
   *   +1  hasErrors() check — abort if client validation fails
   *   +1  response.ok check — handle API-level failure
   *   +1  try/catch — handle network or unexpected errors
   */
  async function handleSubmit(
    event: React.SubmitEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setFormError("");

    // Step 1 — Client-side validation.
    const validationErrors = validateForm(values);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Step 2 — Submit credentials to the Route Handler.
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      // Step 3a — Handle API failure (401 invalid credentials, 500 server error).
      if (!response.ok) {
        setFormError(data.message ?? "Login failed. Please try again.");
        return;
      }

      // Step 3b — Success: navigate to the dashboard.
      // The JWT cookie was set by the Route Handler — no token handling here.
      // Force a full page navigation so the browser is guaranteed
      // to send the newly-set cookie on the very next request.
      window.location.href = DEFAULT_REDIRECT;

    } catch {
      // Network failure or JSON parse error.
      setFormError("Unable to connect. Please check your connection and try again.");

    } finally {
      // Always restore the button to its interactive state.
      setIsLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
      aria-label="Login form"
    >

      {/* ── Form-Level Error ─────────────────────────────────────────────────
          Displayed when the API returns a failure response.
          Positioned above the fields so it is encountered first
          in the reading/tab order. */}
      {formError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {formError}
        </div>
      )}

      {/* ── Email Field ───────────────────────────────────────────────────── */}
      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@hospital.org"
        value={values.email}
        onChange={handleChange}
        error={errors.email}
        disabled={isLoading}
      />

      {/* ── Password Field ────────────────────────────────────────────────── */}
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        value={values.password}
        onChange={handleChange}
        error={errors.password}
        disabled={isLoading}
      />

      {/* ── Submit Button ─────────────────────────────────────────────────── */}
      <Button
        type="submit"
        isLoading={isLoading}
        fullWidth
      >
        Sign in
      </Button>

    </form>
  );
}