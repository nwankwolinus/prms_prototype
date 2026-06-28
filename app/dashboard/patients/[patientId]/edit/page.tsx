/**
 * app/dashboard/patients/[patientId]/edit/page.tsx
 *
 * Patient edit page — Client Component.
 *
 * RESPONSIBILITIES:
 *   - Extract patientId from the dynamic route segment
 *   - Fetch the existing patient via GET /api/patients/[patientId]
 *   - Render loading / not-found / populated states
 *   - Mount PatientUpdateForm once the patient is loaded
 *   - Navigate to the detail page on successful update
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Form rendering, validation, diff computation
 *       → components/forms/PatientUpdateForm.tsx
 *   - Persistence, server-side validation
 *       → services/patientService.ts
 *
 * DESIGN NOTE — deliberately NOT extracting a shared fetch hook:
 *   This page's fetch-and-render-three-states logic is structurally
 *   almost identical to PatientDetailPage (Sprint 2). This was
 *   considered and explicitly NOT extracted into a shared
 *   useFetchPatient() hook at this point. Two occurrences of a
 *   pattern, each small and readable, do not yet justify the
 *   coupling a shared abstraction would introduce between two
 *   pages with no other reason to depend on one another —
 *   consistent with this project's repeated rejection of
 *   speculative abstraction (repository layer, DTO duplication
 *   avoidance, deferred request/error types — see
 *   metrics/methodology.md Sections 2.2, 2.11-2.13). If a third
 *   call site for this exact pattern emerges in a future sprint,
 *   that would be the appropriate trigger to revisit this decision.
 *
 * DESIGN NOTE — navigation destination:
 *   onSuccess navigates to the detail page (/dashboard/patients/
 *   [patientId]), not back to search results, since the user
 *   arrived here FROM the detail page (via the Edit button added
 *   in File 4) and is most likely to want to see the updated
 *   record, not return to an unrelated results list.
 *
 * CYCLOMATIC COMPLEXITY:
 *   fetchPatient():     CC = 3
 *     +1  function entry
 *     +1  response.ok check
 *     +1  try/catch decision point
 *
 *   PatientEditPage():  CC = 4
 *     +1  component entry
 *     +1  isLoading conditional render
 *     +1  error conditional render
 *     +1  patient populated conditional render
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import PatientUpdateForm from "@/components/forms/PatientUpdateForm";
import { PatientDetailResponse } from "@/types/patientDetail";

export default function PatientEditPage() {
  const params = useParams<{ patientId: string }>();
  const router = useRouter();

  const [patient, setPatient]     = useState<PatientDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError]         = useState<string>("");

  /**
   * fetchPatient
   *
   * CC = 3:
   *   +1  function entry
   *   +1  response.ok check
   *   +1  try/catch decision point
   */
  const fetchPatient = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/patients/${params.patientId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Unable to load patient record.");
        setPatient(null);
        return;
      }

      setPatient(data.data.patient);

    } catch {
      setError("Unable to connect. Please check your connection and try again.");
      setPatient(null);

    } finally {
      setIsLoading(false);
    }
  }, [params.patientId]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  /**
   * handleUpdateSuccess
   *
   * Navigates back to the patient detail page after a successful
   * update. Passed to PatientUpdateForm as its onSuccess prop.
   * CC = 1 — no branching.
   */
  function handleUpdateSuccess(): void {
    router.push(`/dashboard/patients/${params.patientId}`);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl">

      <button
        onClick={() => router.push(`/dashboard/patients/${params.patientId}`)}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Patient Record
      </button>

      {isLoading && (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
          Loading patient record...
        </div>
      )}

      {!isLoading && error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {!isLoading && !error && patient && (
        <div className="rounded-xl bg-white px-8 py-8 shadow-sm ring-1 ring-gray-200">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">Edit Patient</h1>
            <p className="mt-1 text-sm text-gray-500 font-mono">{patient.patientId}</p>
          </div>
          <PatientUpdateForm patient={patient} onSuccess={handleUpdateSuccess} />
        </div>
      )}

    </div>
  );
}