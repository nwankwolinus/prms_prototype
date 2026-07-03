/**
 * components/ui/Select.tsx
 *
 * REFACTORED (Sprint 4 Stage 5):
 *
 * Pre-refactor CC: 9 (anonymous Select inner function, tool-reported).
 * Root cause: the aria-describedby attribute used a nested ternary
 * (two chained ternary operators), each contributing a decision
 * point under McCabe's formal definition, along with the label/
 * error/helperText JSX conditional render blocks.
 *
 * Fix: extracted getDescribedBy() — a named pure function
 * computing the aria-describedby value from the three possible
 * inputs, converting two inline ternary decision points into a
 * single, named function with its own measurable CC profile.
 *
 * This is the same pattern applied to Button.tsx's VARIANT_STYLES
 * in Sprint 1 (extracting a value-lookup concern into a named
 * construct rather than leaving it as an inline expression) —
 * extended here from a Record lookup to a conditional-value
 * derivation.
 *
 * CYCLOMATIC COMPLEXITY (post-refactor):
 *   getDescribedBy(): CC = 3
 *     +1  function entry
 *     +1  error check
 *     +1  helperText check
 *
 *   Select (forwardRef component): CC ≈ 4 (target; to be
 *   tool-verified — the three JSX conditional render blocks
 *   for label/error/helperText remain, each contributing one
 *   decision point as before)
 */

import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:       string;
  error?:       string;
  helperText?:  string;
  options:      SelectOption[];
  placeholder?: string;
}

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

/**
 * getDescribedBy
 *
 * Derives the aria-describedby value from error/helperText state.
 * Extracted from an inline nested ternary to a named function so
 * its two decision points are measured independently of the
 * component that uses it, rather than inflating the component's
 * own CC.
 *
 * CC = 3:
 *   +1  function entry
 *   +1  error check
 *   +1  helperText check
 */
function getDescribedBy(
  id:         string,
  error?:     string,
  helperText?: string
): string | undefined {
  if (error)      return `${id}-error`;
  if (helperText) return `${id}-helper`;
  return undefined;
}

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
    const selectId    = id ?? name;
    const stateStyles = error ? ERROR_SELECT_STYLES : NORMAL_SELECT_STYLES;

    return (
      <div className="flex flex-col gap-1">

        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          name={name}
          className={`${BASE_SELECT_STYLES} ${stateStyles} ${className}`.trim()}
          aria-invalid={!!error}
          aria-describedby={getDescribedBy(selectId ?? "", error, helperText)}
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

        {error && (
          <p
            id={`${selectId}-error`}
            role="alert"
            className="text-xs text-red-600"
          >
            {error}
          </p>
        )}

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