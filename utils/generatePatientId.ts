/**
 * utils/generatePatientId.ts
 *
 * Pure utility function for generating unique Patient IDs.
 *
 * WHY ISOLATED HERE:
 * - Single Responsibility: this module does exactly one thing.
 * - Testability: pure functions with no side effects are trivial to unit test.
 * - Low Cyclomatic Complexity: no branching logic, CC = 1.
 * - Halstead Volume: minimal operator/operand count.
 */

import { customAlphabet } from "nanoid";
import { PATIENT_ID_PREFIX } from "@/utils/constants";

/**
 * Alphabet restricted to uppercase letters and digits only.
 * Avoids ambiguous characters (0/O, 1/I/l) for readability.
 */
const generateId = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

/**
 * generatePatientId
 *
 * Returns a unique patient identifier in the format: PAT-XXXXXX
 * Example: PAT-K7MN3Q
 *
 * @returns A string patient ID.
 */
export function generatePatientId(): string {
  return `${PATIENT_ID_PREFIX}-${generateId()}`;
}