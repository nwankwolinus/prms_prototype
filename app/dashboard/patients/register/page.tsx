/**
 * app/(dashboard)/patients/register/page.tsx
 *
 * Patient registration page — React Server Component.
 *
 * RESPONSIBILITIES:
 *   - Render the page heading and descriptive context
 *   - Mount the PatientRegistrationForm component
 *   - Export Next.js metadata for the browser tab title
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Form state management        → components/forms/PatientRegistrationForm.tsx
 *   - Validation logic             → components/forms/PatientRegistrationForm.tsx
 *   - Persistence                  → services/patientService.ts (Stage 5 wiring pending)
 *   - Sidebar / header / nav       → app/(dashboard)/layout.tsx
 *   - Route protection             → middleware.ts
 *
 * DESIGN NOTES:
 *   - This file lives inside the (dashboard) route group, so it
 *     automatically inherits the sidebar, header, and role-based
 *     nav filtering from layout.tsx — no duplication needed here.
 *
 *   - middleware.ts already protects every path under this route
 *     group (PROTECTED_ROUTES includes "/patients"). This page
 *     does not need to re-check authentication — that would
 *     duplicate a concern that belongs solely to the middleware.
 *
 *   - Structurally identical to app/(auth)/login/page.tsx and
 *     app/(dashboard)/page.tsx: metadata export, thin Server
 *     Component, single composed child. This consistency is a
 *     direct, measurable maintainability property — every page
 *     in this codebase shares one template.
 *
 * CYCLOMATIC COMPLEXITY:
 *   PatientRegistrationPage: CC = 1
 *     +1  component entry
 *     No decision points — pure JSX composition.
 */

import type { Metadata } from "next";
import PatientRegistrationForm from "@/components/forms/PatientRegistrationForm";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       "Register Patient — PRMS",
  description: "Register a new patient record in the system.",
};

// ─── Page Component ───────────────────────────────────────────────────────────

/**
 * PatientRegistrationPage
 *
 * Server Component shell for patient registration.
 * The sidebar, header, and route protection are all inherited
 * from the (dashboard) layout — this file is purely content.
 *
 * CC = 1 — pure composition, no branching.
 */
export default function PatientRegistrationPage() {
  return (
    <div className="max-w-3xl">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="mb-6 border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold text-gray-900">
          Register Patient
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter the patient&apos;s details below. A unique Patient ID will
          be generated automatically upon registration.
        </p>
      </div>

      {/* ── Stage 4 Notice ────────────────────────────────────────────────────
          Honest scope indicator, consistent with the dashboard's
          Sprint 1 status banner. Removed once Stage 5 wires this
          form to the persistence layer. */}
      <div className="mb-6 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
        <strong className="font-semibold">Stage 4 — UI only:</strong>{" "}
        This form validates input but does not yet save to the database.
        Persistence will be enabled once the registration API is built.
      </div>

      {/* ── Registration Form ─────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white px-8 py-8 shadow-sm ring-1 ring-gray-200">
        <PatientRegistrationForm />
      </div>

    </div>
  );
}