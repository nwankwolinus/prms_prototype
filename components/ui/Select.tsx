/**
 * components/ui/Select.tsx
 *
 * Reusable select/dropdown primitive for the PRMS application.
 *
 * RESPONSIBILITIES:
 *   - Render a labelled, accessible <select> element
 *   - Display validation error messages below the field
 *   - Display optional helper text for user guidance
 *   - Forward all native select props to the underlying element
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Form state management       → parent form components
 *   - Validation logic            → services or form validators
 *
 * DESIGN NOTES:
 *   - This component is structurally identical to Input.tsx by
 *     deliberate design — same label/error/helperText conditional
 *     pattern, same id-derivation logic, same forwardRef usage.
 *     A developer who understands Input.tsx already understands
 *     this file. This consistency is itself a maintainability
 *     property worth citing in Chapter 4 under design rationale.
 *
 *   - Options are passed as a prop (not hardcoded) so this
 *     component remains generic and reusable beyond gender —
 *     any future constrained-choice field can use it.
 *
 * CYCLOMATIC COMPLEXITY:
 *   Select: CC = 4
 *     +1  component entry
 *     +1  label conditional
 *     +1  error conditional
 *     +1  helperText conditional (only when no error)
 */

import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single selectable option. */
export interface SelectOption {
  value: string;
  label: string;
}

/** Props accepted by the Select component. */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Label text displayed above the select field. */
  label?:      string;
  /** Validation error message displayed below the field in red. */
  error?:      string;
  /** Supplementary hint text displayed below the field in grey. */
  helperText?: string;
  /** The list of selectable options. */
  options:     SelectOption[];
  /** Placeholder shown as a disabled first option. */
  placeholder?: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BASE_SELECT_STYLES = [
  "block w-full rounded-md",
  "px-3 py-2",
  "text-sm text-gray-900",
  "border bg-white",
  "focus:outline-none focus:ring-2 focus:ring-offset-0",
  "transition-colors duration-150",
  "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
].join(" ");

const NORMAL_SELECT_STYLES = "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
const ERROR_SELECT_STYLES  = "border-red-500 focus:border-red-500 focus:ring-red-500";

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Select
 *
 * Primary dropdown element for the PRMS application.
 * Uses React.forwardRef for parity with Input.tsx and to support
 * programmatic focus on validation failure.
 *
 * @example
 * <Select
 *   label="Gender"
 *   name="gender"
 *   placeholder="Select gender"
 *   options={[
 *     { value: "Male",   label: "Male" },
 *     { value: "Female", label: "Female" },
 *     { value: "Other",  label: "Other" },
 *   ]}
 *   error={errors.gender}
 * />
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      name,
      id,
      className = "",
      ...props
    },
    ref
  ) => {
    // Identical id-derivation pattern to Input.tsx — keeps label
    // htmlFor and select id in sync without caller management.
    const selectId     = id ?? name;
    const stateStyles  = error ? ERROR_SELECT_STYLES : NORMAL_SELECT_STYLES;

    return (
      <div className="flex flex-col gap-1">

        {/* ── Label ─────────────────────────────────────────────────────────
            CC +1 */}
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        {/* ── Select Element ──────────────────────────────────────────────── */}
        <select
          ref={ref}
          id={selectId}
          name={name}
          className={`${BASE_SELECT_STYLES} ${stateStyles} ${className}`.trim()}
          aria-invalid={!!error}
          aria-describedby={
            error      ? `${selectId}-error`  :
            helperText ? `${selectId}-helper` :
            undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* ── Error Message ─────────────────────────────────────────────────
            CC +1 */}
        {error && (
          <p
            id={`${selectId}-error`}
            role="alert"
            className="text-xs text-red-600"
          >
            {error}
          </p>
        )}

        {/* ── Helper Text ───────────────────────────────────────────────────
            CC +1 */}
        {helperText && !error && (
          <p
            id={`${selectId}-helper`}
            className="text-xs text-gray-500"
          >
            {helperText}
          </p>
        )}

      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;