/**
 * utils/apiResponse.ts
 *
 * Factory functions for building standardised API responses.
 *
 * WHY THIS EXISTS:
 * Without this utility, every Route Handler constructs its own
 * response object literal, leading to:
 *   - Duplicated structure (high Halstead Volume)
 *   - Inconsistent shapes (bugs on the frontend)
 *
 * These small, single-purpose functions keep each Route Handler
 * focused only on its own logic.
 */

import { NextResponse } from "next/server";
import { ApiResponse } from "@/types";

/**
 * successResponse
 * Wraps data in a standard success envelope and returns an HTTP 200.
 */
export function successResponse<T>(
  message: string,
  data?: T,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, message, data }, { status });
}

/**
 * errorResponse
 * Wraps an error message in a standard error envelope.
 * Optionally includes field-level validation errors.
 */
export function errorResponse(
  message: string,
  status = 400,
  errors?: Record<string, string[]>
): NextResponse<ApiResponse<null>> {
  return NextResponse.json({ success: false, message, errors }, { status });
}

/**
 * toApiFieldErrors
 *
 * Converts a service-layer field-errors map (each value a single
 * optional string, e.g. PatientUpdateErrors, PatientRegistrationErrors)
 * into the shape errorResponse() expects (Record<string, string[]>).
 *
 * EXTRACTED (Sprint 3 Stage 3 correction): this exact transform had
 * been independently re-implemented three times across the codebase
 * — once in app/api/patients/route.ts (registration), once in an
 * earlier draft of app/api/patients/[patientId]/route.ts (update),
 * and once more during review of that same file. Two of the three
 * implementations had a latent bug: fields with no actual error
 * (undefined) were either included as an empty array or, worse,
 * included as an array containing the literal value `undefined`
 * mis-cast as a string. Only one implementation correctly filtered
 * out untouched fields entirely. Extracting this once, here, and
 * having every call site import it eliminates the possibility of
 * this kind of drift recurring a fourth time.
 *
 * CC = 1 — pure transformation, no branching beyond the filter
 * predicate itself (which Halstead/escomplex will count as part of
 * the function, not as a separate decision point at this level of
 * analysis, since Array.prototype.filter's callback is its own
 * separately-measured method).
 *
 * @param fieldErrors - A partial map of field name to error message.
 * @returns A Record<string, string[]>, with untouched (undefined)
 *          fields omitted entirely, or undefined if no fieldErrors
 *          were provided at all.
 */
export function toApiFieldErrors(
  fieldErrors: Record<string, string | undefined> | undefined
): Record<string, string[]> | undefined {
  if (!fieldErrors) return undefined;

  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, message]) => typeof message === "string")
      .map(([field, message]) => [field, [message as string]])
  );
}