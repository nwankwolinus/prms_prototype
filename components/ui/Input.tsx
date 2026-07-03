/**
 * components/ui/Input.tsx
 *
 * REFACTORED (Sprint 4 Stage 5):
 *
 * Pre-refactor CC: 8 (anonymous Input inner function).
 * Same root cause and same fix as Select.tsx — the nested ternary
 * in aria-describedby extracted into getDescribedBy().
 *
 * CYCLOMATIC COMPLEXITY (post-refactor):
 *   getDescribedBy(): CC = 3 (same shape as Select.tsx's)
 *   Input (forwardRef): CC ≈ 4 (to be tool-verified)
 */

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:      string;
  error?:      string;
  helperText?: string;
}

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

const NORMAL_INPUT_STYLES = "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
const ERROR_INPUT_STYLES  = "border-red-500 focus:border-red-500 focus:ring-red-500";

/**
 * getDescribedBy
 *
 * Derives the aria-describedby value from error/helperText state.
 * Identical in shape to Select.tsx's getDescribedBy() — kept
 * local here rather than extracted to a shared utility, on the
 * same grounds the project has consistently applied: two
 * occurrences of a small, stable function do not yet justify the
 * coupling a shared import would introduce. A third occurrence
 * would be the appropriate trigger.
 *
 * CC = 3:
 *   +1  function entry
 *   +1  error check
 *   +1  helperText check
 */
function getDescribedBy(
  id:          string,
  error?:      string,
  helperText?: string
): string | undefined {
  if (error)      return `${id}-error`;
  if (helperText) return `${id}-helper`;
  return undefined;
}

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
    const inputId     = id ?? name;
    const stateStyles = error ? ERROR_INPUT_STYLES : NORMAL_INPUT_STYLES;

    return (
      <div className="flex flex-col gap-1">

        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          className={`${BASE_INPUT_STYLES} ${stateStyles} ${className}`.trim()}
          aria-invalid={!!error}
          aria-describedby={getDescribedBy(inputId ?? "", error, helperText)}
          {...props}
        />

        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-red-600"
          >
            {error}
          </p>
        )}

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

Input.displayName = "Input";
export default Input;