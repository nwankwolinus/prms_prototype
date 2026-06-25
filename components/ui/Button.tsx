/**
 * components/ui/Button.tsx
 *
 * Reusable button primitive for the PRMS application.
 *
 * RESPONSIBILITIES:
 *   - Render a styled, accessible HTML button element
 *   - Support three visual variants: primary, secondary, danger
 *   - Handle loading state with visual feedback
 *   - Forward all native button props to the underlying element
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Form submission logic       → parent form components
 *   - Navigation                  → Next.js Link or router
 *   - Business actions            → service layer
 *
 * DESIGN NOTES:
 *   - Variants are defined as a lookup object (VARIANT_STYLES) rather
 *     than a switch statement or chained ternaries. This keeps CC at
 *     its minimum — a lookup has no decision points. An equivalent
 *     switch statement would add CC = 3 (one case per variant).
 *     This is a deliberate, dissertation-relevant design decision.
 *
 *   - The component extends React.ButtonHTMLAttributes<HTMLButtonElement>
 *     so consumers can pass any native button prop (type, onClick,
 *     disabled, aria-label, etc.) without the component needing to
 *     explicitly declare each one. This is the correct pattern for
 *     primitive UI components.
 *
 *   - isLoading disables the button AND replaces the label with a
 *     spinner to prevent duplicate form submissions — a common UX
 *     failure in healthcare applications where double-submission
 *     can create duplicate patient records.
 *
 * CYCLOMATIC COMPLEXITY:
 *   Button: CC = 4
 *     +1  component entry
 *     +1  isLoading || disabled check (combined disable condition)
 *     +1  isLoading check (spinner vs label rendering)
 *     +1  fullWidth check (width class)
 *   Variant lookup: CC = 1 (object lookup — no branching)
 */

import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Visual style variants available for the Button. */
type ButtonVariant = "primary" | "secondary" | "danger";

/** Props accepted by the Button component. */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Controls the visual style of the button. Defaults to "primary". */
  variant?:   ButtonVariant;
  /** When true, shows a loading spinner and disables interaction. */
  isLoading?: boolean;
  /** When true, the button stretches to fill its container width. */
  fullWidth?: boolean;
  /** Button label or child elements. */
  children:   React.ReactNode;
}

// ─── Variant Styles ───────────────────────────────────────────────────────────

/**
 * VARIANT_STYLES
 *
 * Maps each variant name to its Tailwind class string.
 *
 * Using an object lookup instead of a switch statement or ternary chain
 * keeps the component's CC at its minimum. This is an explicit
 * architectural decision made to reduce complexity — worth noting
 * in Chapter 5 as an example of style-driven CC reduction.
 *
 * Equivalent switch: would add CC +3 (one per case).
 * Object lookup:     CC contribution = 0 (no decision points).
 */
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:   "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
  secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400",
  danger:    "bg-red-600  text-white hover:bg-red-700  focus:ring-red-500",
};

/** Styles shared by all variants regardless of type. */
const BASE_STYLES = [
  "inline-flex items-center justify-center",
  "px-4 py-2 rounded-md",
  "text-sm font-medium",
  "focus:outline-none focus:ring-2 focus:ring-offset-2",
  "transition-colors duration-150",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Button
 *
 * Primary interactive element for the PRMS application.
 * All form submissions and actions should use this component.
 *
 * @example
 * // Primary submit button with loading state
 * <Button type="submit" isLoading={isPending} fullWidth>
 *   Sign In
 * </Button>
 *
 * @example
 * // Danger variant for destructive actions
 * <Button variant="danger" onClick={handleDelete}>
 *   Delete Patient
 * </Button>
 */
export default function Button({
  variant   = "primary",
  isLoading = false,
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  // Resolve the variant-specific class string via lookup (CC = 0).
  const variantClass = VARIANT_STYLES[variant];

  // Width modifier applied conditionally.
  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      disabled={isLoading || disabled}
      className={`${BASE_STYLES} ${variantClass} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {/* Loading state: spinner replaces label to signal pending action */}
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}