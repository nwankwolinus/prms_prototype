/**
 * utils/constants.ts
 *
 * Application-wide constants.
 * Centralised here so no magic strings are scattered across
 * services, middleware, or API routes.
 * Contributes zero cyclomatic complexity — pure data.
 */

/** Routes requiring a valid JWT to access. */
export const PROTECTED_ROUTES = [
  "/dashboard",
  "/api/patients",
];

/** Redirect targets. */
export const LOGIN_ROUTE   = "/login";
export const DEFAULT_REDIRECT = "/dashboard";

/** MongoDB collection names. */
export const COLLECTIONS = {
  USERS:    "users",
  PATIENTS: "patients",
} as const;

/** Patient ID prefix for generated IDs. */
export const PATIENT_ID_PREFIX = "PAT";

/** JWT cookie name used across middleware and auth service. */
export const AUTH_COOKIE_NAME = "prms_token";