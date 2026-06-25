/**
 * models/User.ts
 *
 * Mongoose schema and model for the users collection.
 *
 * RESPONSIBILITIES (this file):
 *   - Define the document shape
 *   - Enforce field-level constraints (required, unique, enum)
 *   - Enable automatic timestamps
 *
 * RESPONSIBILITIES (elsewhere):
 *   - Password hashing    → lib/password.ts
 *   - Token generation    → lib/jwt.ts
 *   - Login logic         → services/authService.ts
 *
 * Keeping these concerns separate ensures each module can be
 * measured and evaluated independently by McCabe / Halstead tools.
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { UserRole } from "@/types";
import { COLLECTIONS } from "@/utils/constants";

// ─── Document Interface ───────────────────────────────────────────────────────

/**
 * IUserDocument extends mongoose Document so TypeScript understands
 * both our custom fields and the built-in _id, save(), etc.
 */
export interface IUserDocument extends Document {
  username:  string;
  email:     string;
  password:  string;
  role:      UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const UserSchema = new Schema<IUserDocument>(
  {
    username: {
      type:     String,
      required: [true, "Username is required"],
      trim:     true,
    },
    email: {
      type:     String,
      required: [true, "Email is required"],
      unique:   true,             // MongoDB unique index
      lowercase: true,
      trim:     true,
    },
    password: {
      type:     String,
      required: [true, "Password is required"],
      // Raw passwords are NEVER stored — see lib/password.ts
    },
    role: {
      type:     String,
      enum:     Object.values(UserRole),   // Restricts to ADMIN | DOCTOR | RECEPTIONIST
      required: [true, "Role is required"],
    },
  },
  {
    timestamps:  true,                 // Adds createdAt and updatedAt automatically
    collection:  COLLECTIONS.USERS,   // Explicit collection name — no magic pluralisation
  }
);

// ─── Model ────────────────────────────────────────────────────────────────────

/**
 * Guard against Next.js hot-reload registering the model multiple times.
 * In development, modules are re-evaluated on each save; without this
 * guard Mongoose throws "Cannot overwrite model once compiled."
 */
const UserModel: Model<IUserDocument> =
  mongoose.models.User ?? mongoose.model<IUserDocument>("User", UserSchema);

export default UserModel;