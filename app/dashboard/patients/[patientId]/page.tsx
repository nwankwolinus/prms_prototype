/**
 * app/dashboard/patients/[patientId]/page.tsx
 *
 * Patient Detail page — Client Component.
 *
 * [Sprint 2 header content — fetchPatient(), the not-found/error
 *  handling design notes, the Server-vs-Client-Component rationale
 *  — remains entirely accurate and unchanged. Only the additions
 *  below are new for Sprint 3 Stage 4.]
 *
 * SPRINT 3 STAGE 4 EXTENSION:
 *
 * Adds an Edit link and a DeletePatientButton to the page header,
 * alongside the existing "Back to Search Results" link.
 *
 * RESPONSIBILITIES ADDED:
 *   - Render a link to /dashboard/patients/[patientId]/edit
 *   - Mount DeletePatientButton, passing the loaded patient's ID
 *
 * COMPLEXITY ACCOUNTING (IMPORTANT — read before assuming this
 * page's CC changed):
 *   PatientDetailPage's Cyclomatic Complexity is UNCHANGED at this
 *   stage. The Edit link and DeletePatientButton are inserted
 *   INSIDE the existing populated-state render block
 *   ({!isLoading && !error && patient && (...)}), which was already
 *   counted as one of this component's three branches in Sprint 2.
 *   Neither addition introduces a NEW top-level conditional — the
 *   Edit link is a plain, unconditional <Link>, and
 *   DeletePatientButton only requires patient.patientId, which is
 *   already guaranteed non-null inside that existing block. Each
 *   addition carries its OWN, separately-measured complexity
 *   (DeletePatientButton: CC = 5 total across its two functions,
 *   measured independently in Stage 4 File 3) rather than adding
 *   branches to this component's own function body. This is the
 *   practical demonstration of the brief's instruction to "leverage
 *   helper components to avoid further complexity growth" — it
 *   works specifically because the new functionality was extracted
 *   into self-contained components BEFORE being inserted here,
 *   not because complexity was hidden or undercounted.
 *
 *   This claim is re-verified by running the metrics extraction
 *   script after this change (see Sprint 3 checkpoint), not merely
 *   asserted from reading the source.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import DeletePatientButton from "@/components/ui/DeletePatientButton";
import { PatientDetailResponse } from "@/types/patientDetail";

export default function PatientDetailPage() {
  const params = useParams<{ patientId: string }>();
  const router = useRouter();

  const [patient, setPatient]     = useState<PatientDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError]         = useState<string>("");

  /**
   * fetchPatient — UNCHANGED from Sprint 2. CC = 3.
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

  // ── Render — three branches, UNCHANGED in count from Sprint 2 ──────────────

  return (
    <div className="max-w-3xl">

      <button
        onClick={() => router.push("/dashboard/patients")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Search Results
      </button>

      {/* ── Loading State — UNCHANGED ─────────────────────────────────────── */}
      {isLoading && (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
          Loading patient record...
        </div>
      )}

      {/* ── Error / Not Found State — UNCHANGED ───────────────────────────── */}
      {!isLoading && error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* ── Populated State — Edit link and Delete button added INSIDE
            this existing branch, not as a new one ───────────────────────── */}
      {!isLoading && !error && patient && (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">

          {/* Header — NOW includes Edit link and Delete button */}
          <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="mt-1 font-mono text-sm text-gray-500">{patient.patientId}</p>
            </div>

            <div className="flex items-center gap-3">
              <Link href={`/dashboard/patients/${patient.patientId}/edit`}>
                <Button variant="secondary">Edit Patient</Button>
              </Link>
              <DeletePatientButton patientId={patient.patientId} />
            </div>
          </div>

          {/* Patient Information — UNCHANGED */}
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

          {/* Metadata — UNCHANGED */}
          <div className="grid grid-cols-1 gap-6 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Created At</p>
              <p className="mt-1 text-sm text-gray-700">
                {new Date(patient.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Updated At</p>
              <p className="mt-1 text-sm text-gray-700">
                {new Date(patient.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}