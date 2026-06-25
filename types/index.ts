/**
 * types/index.ts
 *
 * Single source of truth for all shared TypeScript types.
 * Keeping types here prevents duplication across models,
 * services, and API routes, and makes the data contracts
 * explicit and auditable.
 */

// ─── Roles ────────────────────────────────────────────────────────────────────

/**
 * All valid user roles.
 * An enum (not plain strings) prevents typos and enables
 * exhaustive checks in switch statements, keeping CC low.
 */
export enum UserRole {
  ADMIN        = "ADMIN",
  DOCTOR       = "DOCTOR",
  RECEPTIONIST = "RECEPTIONIST",
}

// ─── User ─────────────────────────────────────────────────────────────────────

/** User document as stored in MongoDB. */
export interface IUser {
  _id?:      string;
  username:  string;
  email:     string;
  password:  string;   // bcrypt hash — never plain text
  role:      UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User shape safe for responses and JWT payloads.
 * Omitting password at the type level makes accidental
 * exposure a compile-time error.
 */
export type PublicUser = Omit<IUser, "password">;

// ─── JWT ──────────────────────────────────────────────────────────────────────

/** Payload embedded in the signed JWT. */
export interface JwtPayload {
  userId: string;
  email:  string;
  role:   UserRole;
}

// ─── Patient ──────────────────────────────────────────────────────────────────

export type Gender = "Male" | "Female" | "Other";

/** Patient document as stored in MongoDB. */
export interface IPatient {
  _id?:        string;
  patientId:   string;
  firstName:   string;
  lastName:    string;
  dateOfBirth: Date;
  gender:      Gender;
  phoneNumber: string;
  address:     string;
  createdAt?:  Date;
  updatedAt?:  Date;
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Standard response envelope for all Route Handlers.
 * Consistent shape means the frontend never needs to
 * guess whether a field exists.
 */
export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?:   T;
  errors?: Record<string, string[]>;
}