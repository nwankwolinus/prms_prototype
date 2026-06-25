/**
 * app/api/patients/route.ts
 *
 * POST /api/patients
 *
 * HTTP boundary layer for patient registration.
 */

import { NextRequest, NextResponse } from "next/server";
import { registerPatient }           from "@/services/patientService";
import { successResponse, errorResponse } from "@/utils/apiResponse";
import { IPatient, PatientRegistrationInput } from "@/types/patient";

interface PatientRegistrationResponseData {
  patient: IPatient;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as PatientRegistrationInput;

    const result = await registerPatient(body);

    if (!result.success) {
      const fieldErrors = result.fieldErrors
        ? Object.fromEntries(
            Object.entries(result.fieldErrors).map(([k, v]) => [k, Array.isArray(v) ? v : [v as string]])
          ) as Record<string, string[]>
        : undefined;

      return errorResponse(result.message, 400, fieldErrors);
    }

    return successResponse<PatientRegistrationResponseData>(
      "Patient registered successfully.",
      { patient: result.patient },
      201
    );

  } catch (error) {
    console.error("[POST /api/patients]", error);
    return errorResponse("An unexpected error occurred. Please try again.", 500);
  }
}