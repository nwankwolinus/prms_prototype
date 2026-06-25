/**
 * models/Patient.ts
 *
 * Mongoose schema and model for the patients collection.
 *
 * RESPONSIBILITIES (this file):
 *   - Define the document shape
 *   - Enforce field-level constraints (required, unique, enum)
 *   - Enable automatic timestamps
 *
 * RESPONSIBILITIES (elsewhere):
 *   - Patient ID generation   → utils/generatePatientId.ts
 *   - Registration validation → services/patientService.ts
 *   - HTTP request handling   → app/api/patients/route.ts (Stage 5)
 *
 * DESIGN NOTES:
 *   - This file mirrors the structure of models/User.ts exactly,
 *     maintaining consistency across the data layer. Anyone
 *     reading one Mongoose model in this codebase already knows
 *     how to read the other.
 *
 *   - The IPatientDocument interface imports IPatient from
 *     types/patient.ts rather than redefining the fields here.
 *     This is the single-source-of-truth principle enforced at
 *     the type level — if a field is added to IPatient, TypeScript
 *     will flag this schema as incomplete at compile time.
 *
 *   - patientId carries a unique index. Even though the service
 *     layer generates this value (via generatePatientId), the
 *     database-level constraint is a second line of defence
 *     against duplicate IDs in the rare case of a collision.
 *
 * CYCLOMATIC COMPLEXITY:
 *   Schema definition: 0  (pure declarative configuration)
 *   Model export guard: 1  (mongoose.models.Patient ?? ... )
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { IPatient, Gender } from "@/types/patient";
import { COLLECTIONS } from "@/utils/constants";

// ─── Document Interface ───────────────────────────────────────────────────────

/**
 * IPatientDocument extends both IPatient and mongoose.Document.
 * This gives TypeScript awareness of our custom fields (from
 * IPatient) AND the built-in Mongoose document methods
 * (_id, save(), toObject(), etc.) in a single interface.
 *
 * Omit<IPatient, "_id"> avoids a type conflict — Document already
 * defines _id with a different (ObjectId) type than our string
 * version in IPatient.
 */
export interface IPatientDocument extends Omit<IPatient, "_id">, Document {}

// ─── Schema ───────────────────────────────────────────────────────────────────

const PatientSchema = new Schema<IPatientDocument>(
  {
    patientId: {
      type:     String,
      required: [true, "Patient ID is required"],
      unique:   true,    // Database-level guard against duplicate IDs
      trim:     true,
    },
    firstName: {
      type:     String,
      required: [true, "First name is required"],
      trim:     true,
    },
    lastName: {
      type:     String,
      required: [true, "Last name is required"],
      trim:     true,
    },
    dateOfBirth: {
      type:     Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type:     String,
      enum:     ["Male", "Female", "Other"] satisfies Gender[],
      required: [true, "Gender is required"],
    },
    phoneNumber: {
      type:     String,
      required: [true, "Phone number is required"],
      trim:     true,
    },
    address: {
      type:     String,
      required: [true, "Address is required"],
      trim:     true,
    },
  },
  {
    timestamps: true,                  // Adds createdAt and updatedAt automatically
    collection: COLLECTIONS.PATIENTS,  // Explicit collection name
  }
);

// ─── Model ────────────────────────────────────────────────────────────────────

/**
 * Guard against Next.js hot-reload registering the model multiple
 * times during development — identical pattern to models/User.ts.
 */
const PatientModel: Model<IPatientDocument> =
  mongoose.models.Patient ?? mongoose.model<IPatientDocument>("Patient", PatientSchema);

export default PatientModel;