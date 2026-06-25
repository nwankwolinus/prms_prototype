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