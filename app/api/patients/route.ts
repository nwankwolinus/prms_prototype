/**
 * app/api/patients/route.ts
 *
 * POST /api/patients
 *
 * HTTP boundary layer for patient registration.
 */

import { NextRequest, NextResponse } from "next/server";
import { registerPatient }           from "@/services/patientService";
import { successResponse, errorResponse, toApiFieldErrors } from "@/utils/apiResponse";
import { IPatient, PatientRegistrationInput } from "@/types/patient";

interface PatientRegistrationResponseData {
  patient: IPatient;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as PatientRegistrationInput;

    const result = await registerPatient(body);

    if (!result.success) {
      const fieldErrors = toApiFieldErrors(result.fieldErrors);
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