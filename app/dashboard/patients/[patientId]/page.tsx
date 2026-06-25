/**
 * app/dashboard/patients/[patientId]/page.tsx
 *
 * Patient Detail page — Client Component.
 *
 * RESPONSIBILITIES:
 *   - Extract patientId from the dynamic route segment
 *   - Call GET /api/patients/[patientId] on mount
 *   - Render the full patient record, or a not-found / error state
 *   - Provide navigation back to the search page
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Lookup / not-found logic     → services/patientSearchService.ts
 *   - Authentication                → middleware.ts
 *   - Database access               → never touches Mongoose directly
 *
 * DESIGN NOTE — why this is a Client Component, not a Server Component:
 *   app/dashboard/page.tsx and app/dashboard/layout.tsx (Sprint 1)
 *   are Server Components that read the JWT cookie directly to
 *   personalise content. This page deliberately does NOT follow
 *   that pattern. Instead, it calls GET /api/patients/[patientId]
 *   from the client, the same route File 1 (the search page) is
 *   built against. This keeps both pages consistent with the
 *   Presentation → API → Service → Model layering established for
 *   Stage 3 — a Server Component calling getPatientById() directly
 *   would bypass the API layer entirely, which is architecturally
 *   inconsistent with how this sprint's data flow was designed.
 *   The trade-off is an unavoidable client-side loading state
 *   (a brief spinner) that a Server Component fetch would not need
 *   — accepted deliberately for architectural consistency.
 *
 * DESIGN NOTES:
 *   - useParams() (not props) is used to read the dynamic route
 *     segment, since this is a Client Component. Server
 *     Components receive params as a prop (see File 2 of Sprint 2
 *     Stage 3's API route for the prop-based equivalent); Client
 *     Components must use the useParams() hook instead.
 *
 *   - The fetch runs inside a useEffect on mount, keyed on
 *     patientId, so navigating directly between two different
 *     patient detail URLs (without an intermediate page load)
 *     correctly re-fetches rather than showing stale data.
 *
 *   - "Not found" and "API failure" are rendered as the same
 *     visual error state in this stage, consistent with the
 *     decision already made in the Stage 3 API route (both map to
 *     a non-2xx response with a message) — this page does not
 *     re-introduce a distinction the API layer deliberately did
 *     not provide.
 *
 * CYCLOMATIC COMPLEXITY:
 *   fetchPatient():        CC = 3
 *     +1  function entry
 *     +1  response.ok check
 *     +1  try/catch decision point
 *
 *   PatientDetailPage():   CC = 4
 *     +1  component entry
 *     +1  isLoading conditional render
 *     +1  error conditional render
 *     +1  (implicit) populated-state render — the final fallthrough,
 *         not a separate counted branch, but noted here for
 *         completeness since it is the third distinct render path
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";        
import { PatientDetailResponse } from "@/types/patientDetail";

export default function PatientDetailPage() {
  const params = useParams<{ patientId: string }>();
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────

  const [patient, setPatient]     = useState<PatientDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError]         = useState<string>("");

  // ── Fetch Handler ──────────────────────────────────────────────────────────

  /**
   * fetchPatient
   *
   * Calls GET /api/patients/[patientId] and updates state based
   * on the response. "Not found" and generic API failure are
   * treated identically here, matching the Stage 3 API route's
   * own decision not to distinguish them beyond a 404 status.
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

  // Fetch on mount, and again if the route's patientId changes
  // (e.g. navigating directly from one detail URL to another).
  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl">

      {/* ── Back Navigation ───────────────────────────────────────────────── */}
      <button
        onClick={() => router.push("/dashboard/patients")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Search Results
      </button>

      {/* ── Loading State ─────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
          Loading patient record...
        </div>
      )}

      {/* ── Error / Not Found State ───────────────────────────────────────── */}
      {!isLoading && error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* ── Populated State ───────────────────────────────────────────────── */}
      {!isLoading && !error && patient && (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">

          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-5">
            <h1 className="text-xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="mt-1 font-mono text-sm text-gray-500">{patient.patientId}</p>
          </div>

          {/* Patient Information */}
          <div className="grid grid-cols-1 gap-6 px-6 py-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">First Name</p>
              <p className="mt-1 text-sm text-gray-900">{patient.firstName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Last Name</p>
              <p className="mt-1 text-sm text-gray-900">{patient.lastName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Date of Birth</p>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(patient.dateOfBirth).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Gender</p>
              <p className="mt-1 text-sm text-gray-900">{patient.gender}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Phone Number</p>
              <p className="mt-1 text-sm text-gray-900">{patient.phoneNumber}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Address</p>
              <p className="mt-1 text-sm text-gray-900">{patient.address}</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 gap-6 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Created At</p>
              <p className="mt-1 text-sm text-gray-700">
                {patient.createdAt && new Date(patient.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Updated At</p>
              <p className="mt-1 text-sm text-gray-700">
                {patient.updatedAt && new Date(patient.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}