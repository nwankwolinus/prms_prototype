/**
 * components/ui/Input.tsx
 *
 * Reusable input field primitive for the PRMS application.
 *
 * RESPONSIBILITIES:
 *   - Render a labelled, accessible HTML input element
 *   - Display validation error messages below the field
 *   - Display optional helper text for user guidance
 *   - Forward all native input props to the underlying element
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Form state management       → parent form components
 *   - Validation logic            → services or Zod schemas
 *   - Form submission             → parent form components
 *
 * DESIGN NOTES:
 *   - The component uses React.forwardRef so it is compatible with
 *     ref-based form libraries and direct DOM access patterns.
 *     This is the correct pattern for input primitives — without
 *     forwardRef, a parent component cannot programmatically focus
 *     this input (e.g. on validation failure).
 *
 *   - Error state changes the border colour to red to provide
 *     immediate visual feedback without relying on colour alone —
 *     the error message text is always rendered alongside it,
 *     satisfying basic accessibility requirements.
 *
 *   - The id is derived from the name prop when not explicitly
 *     provided. This ensures the label htmlFor always matches the
 *     input id, which is required for screen reader association.
 *     Generating it here means the caller never has to manage it.
 *
 *   - Three conditional rendering decisions give this file CC = 4.
 *     Each conditional corresponds to a genuine UI requirement:
 *     label visibility, helper text, and error message display.
 *
 * CYCLOMATIC COMPLEXITY:
 *   Input: CC = 4
 *     +1  component entry
 *     +1  label conditional (render label only when provided)
 *     +1  error conditional (red border + error message)
 *     +1  helperText conditional (render hint only when provided)
 */

import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Props accepted by the Input component. */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input field. */
  label?:      string;
  /** Validation error message displayed below the field in red. */
  error?:      string;
  /** Supplementary hint text displayed below the field in grey. */
  helperText?: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

/** Base input styles shared across all states. */
const BASE_INPUT_STYLES = [
  "block w-full rounded-md",
  "px-3 py-2",
  "text-sm text-gray-900",
  "placeholder:text-gray-400",
  "border",
  "focus:outline-none focus:ring-2 focus:ring-offset-0",
  "transition-colors duration-150",
  "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
].join(" ");

/** Border and focus ring styles for a field in its normal (valid) state. */
const NORMAL_INPUT_STYLES = "border-gray-300 focus:border-blue-500 focus:ring-blue-500";

/** Border and focus ring styles for a field in its error state. */
const ERROR_INPUT_STYLES  = "border-red-500 focus:border-red-500 focus:ring-red-500";

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Input
 *
 * Primary form field element for the PRMS application.
 * All text, email, password, date, and tel inputs should
 * use this component to ensure consistent styling and
 * accessible label association.
 *
 * Uses React.forwardRef to support programmatic focus —
 * required for accessibility-compliant form validation.
 *
 * @example
 * // Basic email input with label
 * <Input
 *   label="Email address"
 *   name="email"
 *   type="email"
 *   placeholder="doctor@hospital.org"
 * />
 *
 * @example
 * // Password input with validation error
 * <Input
 *   label="Password"
 *   name="password"
 *   type="password"
 *   error="Password is required."
 * />
 *
 * @example
 * // Input with helper text guidance
 * <Input
 *   label="Phone number"
 *   name="phoneNumber"
 *   type="tel"
 *   helperText="Include country code, e.g. +234 801 234 5678"
 * />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      name,
      id,
      className = "",
      ...props
    },
    ref
  ) => {
    /**
     * Derive a stable id from the name prop when not explicitly supplied.
     * This guarantees the label htmlFor always matches the input id,
     * which is required for screen reader label association.
     * CC contribution: 0 — nullish coalescing is not a decision point
     * in McCabe's graph-theoretic model (no branch in control flow).
     */
    const inputId      = id ?? name;
    const stateStyles  = error ? ERROR_INPUT_STYLES : NORMAL_INPUT_STYLES;

    return (
      <div className="flex flex-col gap-1">

        {/* ── Label ─────────────────────────────────────────────────────────
            Rendered only when a label string is provided.
            htmlFor links to inputId for screen reader association.
            CC +1 */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        {/* ── Input Element ──────────────────────────────────────────────── */}
        <input
          ref={ref}
          id={inputId}
          name={name}
          className={`${BASE_INPUT_STYLES} ${stateStyles} ${className}`.trim()}
          aria-invalid={!!error}
          aria-describedby={
            error      ? `${inputId}-error`  :
            helperText ? `${inputId}-helper` :
            undefined
          }
          {...props}
        />

        {/* ── Error Message ──────────────────────────────────────────────────
            Rendered only when an error string is provided.
            role="alert" ensures screen readers announce it immediately.
            CC +1 */}
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-red-600"
          >
            {error}
          </p>
        )}

        {/* ── Helper Text ────────────────────────────────────────────────────
            Rendered only when helperText is provided AND there is no error.
            Showing both simultaneously would create conflicting guidance.
            CC +1 */}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="text-xs text-gray-500"
          >
            {helperText}
          </p>
        )}

      </div>
    );
  }
);

// Required when using forwardRef — sets the display name visible
// in React DevTools for easier debugging during development.
Input.displayName = "Input";

export default Input;