/**
 * app/(auth)/login/page.tsx
 *
 * Login page — React Server Component.
 *
 * RESPONSIBILITIES:
 *   - Render the page layout and visual branding
 *   - Mount the LoginForm component
 *   - Export Next.js metadata for the browser tab title
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Form state management       → components/forms/LoginForm.tsx
 *   - API calls                   → components/forms/LoginForm.tsx
 *   - Credential validation       → services/authService.ts
 *   - Route protection            → middleware.ts
 *
 * DESIGN NOTES:
 *   - This is a React Server Component (RSC) by default in Next.js
 *     App Router. It runs only on the server — no JavaScript is
 *     sent to the browser for this file specifically.
 *
 *   - LoginForm is a Client Component ("use client") and is mounted
 *     inside this Server Component. Next.js handles the boundary
 *     automatically — the server renders the shell, the client
 *     hydrates the form.
 *
 *   - No logic exists in this file. CC = 1 is the theoretical
 *     minimum and is intentional. Page components in a layered
 *     architecture should be as thin as possible — they are
 *     composition roots, not logic containers.
 *
 *   - The card layout (white panel on grey background) is a
 *     deliberate UX decision for a clinical application:
 *     clean, uncluttered, focused on the task. No decorative
 *     elements that could distract in a healthcare environment.
 *
 * CYCLOMATIC COMPLEXITY:
 *   LoginPage: CC = 1
 *     +1  component entry
 *     No decision points — pure JSX composition.
 */

import type { Metadata } from "next";
import LoginForm from "@/components/forms/LoginForm";

// ─── Metadata ─────────────────────────────────────────────────────────────────

/**
 * Next.js page metadata.
 * Rendered into <title> and <meta name="description"> by the framework.
 * Defined here rather than in layout.tsx so each page controls
 * its own title independently.
 */
export const metadata: Metadata = {
  title:       "Sign In — PRMS",
  description: "Sign in to access the Patient Record Management System.",
};

// ─── Page Component ───────────────────────────────────────────────────────────

/**
 * LoginPage
 *
 * Server Component shell for the authentication screen.
 * Renders branding, a descriptive heading, and the LoginForm.
 *
 * CC = 1 — no branching, pure composition.
 */
export default function LoginPage() {
  return (

    /*
     * Full-screen centred layout.
     * min-h-screen ensures the card is vertically centred
     * regardless of viewport height.
     * bg-gray-50 provides a neutral clinical background.
     */
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">

      <div className="w-full max-w-md">

        {/* ── Branding Header ───────────────────────────────────────────────
            System name and subtitle positioned above the card.
            Kept outside the card so the card remains focused
            entirely on the form interaction. */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600">
            {/* Medical cross icon — reinforces healthcare context */}
            <svg
              className="h-7 w-7 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Patient Record Management System
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Research Prototype — MSc Software Engineering
          </p>
        </div>

        {/* ── Login Card ────────────────────────────────────────────────────
            White elevated panel containing the form.
            Shadow and rounded corners follow standard
            card conventions for clinical web interfaces. */}
        <div className="rounded-xl bg-white px-8 py-10 shadow-md ring-1 ring-gray-200">

          {/* Card heading — separate from the page h1 above */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter your credentials to access patient records.
            </p>
          </div>

          {/* ── Login Form ──────────────────────────────────────────────────
              All interactive behaviour lives here.
              This page knows nothing about how the form works —
              it only knows that a LoginForm exists. */}
          <LoginForm />

        </div>

        {/* ── Footer Note ───────────────────────────────────────────────────
            Reinforces that this is a research prototype.
            Important for ethical compliance — synthetic data context. */}
        <p className="mt-6 text-center text-xs text-gray-400">
          This system uses synthetic data for research purposes only.
          No real patient information is stored or processed.
        </p>

      </div>
    </main>
  );
}