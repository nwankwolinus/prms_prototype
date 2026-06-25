/**
 * app/dashboard/patients/page.tsx
 *
 * Patient Search page — Client Component.
 *
 * RESPONSIBILITIES:
 *   - Render a single search input (matches Patient ID, first
 *     name, or last name — per the actual capability of
 *     searchPatients())
 *   - Call GET /api/patients/search with the query parameter
 *   - Render results in a table, or an empty-state / error message
 *   - Navigate to the patient detail page on "View" click
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Matching strategy            → services/patientSearchService.ts
 *   - Authentication                → middleware.ts
 *   - Database access               → never touches Mongoose
 *
 * SCOPE NOTE (deliberate, not an oversight):
 *   This page does NOT include a gender filter dropdown or
 *   pagination controls. Both were considered during Stage 4
 *   planning and explicitly excluded: PatientSearchRequest has no
 *   gender field, and searchPatients() returns a plain array, not
 *   a paginated response. Both were deliberately removed from the
 *   API/service layers in Sprint 2 Stage 1 to avoid building
 *   structure ahead of genuine need. Adding UI controls for
 *   capabilities the underlying layers do not support would
 *   produce non-functional UI elements — a maintainability problem
 *   in its own right (UI that lies about what it does). If gender
 *   filtering or pagination become genuine requirements in a later
 *   sprint, the API and service layers should be extended first,
 *   and this page updated to match — not the reverse.
 *
 * DESIGN NOTES:
 *   - Reuses Input and Button from Sprint 1's component library.
 *     No new UI primitives were created for this page.
 *
 *   - "Reset" is implemented as simply clearing the search input
 *     and the results state, not as a separate, more complex
 *     concept — there is no additional filter state to reset to a
 *     default, since gender filtering does not exist.
 *
 *   - This is a Client Component ("use client") because it manages
 *     interactive state (query text, loading, results, error) and
 *     performs a fetch() call on user action — consistent with
 *     LoginForm.tsx and PatientRegistrationForm.tsx from Sprint 1.
 *
 *   - The page itself is the form/results container — no separate
 *     "PatientSearchForm" component was extracted. Unlike
 *     LoginForm/PatientRegistrationForm (which were extracted from
 *     their pages because the pages needed to remain Server
 *     Components), this entire page must be a Client Component
 *     regardless, since the results table itself is interactive
 *     (per-row View navigation). Extracting a separate form
 *     component here would not provide the same Server/Client
 *     boundary benefit it did in Sprint 1, so it was not done
 *     purely for the sake of mirroring that pattern.
 *
 * CYCLOMATIC COMPLEXITY:
 *   handleSearch():       CC = 3
 *     +1  function entry
 *     +1  response.ok check
 *     +1  try/catch decision point
 *
 *   PatientSearchPage():  CC = 4
 *     +1  component entry
 *     +1  isLoading conditional render
 *     +1  error conditional render
 *     +1  empty-results vs. populated-results conditional render
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input  from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { PatientSearchResult } from "@/types/patientSearch";

export default function PatientSearchPage() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────

  const [query, setQuery]       = useState<string>("");
  const [results, setResults]   = useState<PatientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError]       = useState<string>("");
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // ── Search Handler ─────────────────────────────────────────────────────────

  /**
   * handleSearch
   *
   * Calls GET /api/patients/search with the current query and
   * updates state based on the response.
   *
   * CC = 3:
   *   +1  function entry
   *   +1  response.ok check
   *   +1  try/catch decision point
   */
  async function handleSearch(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/patients/search?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Search failed. Please try again.");
        setResults([]);
        return;
      }

      setResults(data.data.results);
      setHasSearched(true);

    } catch {
      setError("Unable to connect. Please check your connection and try again.");
      setResults([]);

    } finally {
      setIsLoading(false);
    }
  }

  /**
   * handleReset
   *
   * Clears the search input and results. No separate filter state
   * exists to reset (see scope note above).
   * CC = 1 — no branching.
   */
  function handleReset(): void {
    setQuery("");
    setResults([]);
    setError("");
    setHasSearched(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="mb-6 border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold text-gray-900">Search Patients</h1>
        <p className="mt-1 text-sm text-gray-500">
          Search by Patient ID, first name, or last name.
        </p>
      </div>

      {/* ── Search Form ───────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSearch}
        className="mb-6 flex items-end gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200"
        aria-label="Patient search form"
      >
        <div className="flex-1">
          <Input
            label="Search"
            name="query"
            type="text"
            placeholder="Patient ID, first name, or last name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" isLoading={isLoading}>
          Search
        </Button>
        <Button type="button" variant="secondary" onClick={handleReset}>
          Reset
        </Button>
      </form>

      {/* ── Error State ───────────────────────────────────────────────────── */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────────────── */}
      {hasSearched && !error && results.length === 0 && (
        <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          No patients found matching &quot;{query}&quot;.
        </div>
      )}

      {/* ── Results Table ─────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">Patient ID</th>
                <th className="px-4 py-3 font-medium text-gray-500">First Name</th>
                <th className="px-4 py-3 font-medium text-gray-500">Last Name</th>
                <th className="px-4 py-3 font-medium text-gray-500">Gender</th>
                <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((patient) => (
                <tr key={patient.patientId}>
                  <td className="px-4 py-3 font-mono text-gray-900">{patient.patientId}</td>
                  <td className="px-4 py-3 text-gray-700">{patient.firstName}</td>
                  <td className="px-4 py-3 text-gray-700">{patient.lastName}</td>
                  <td className="px-4 py-3 text-gray-700">{patient.gender}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/dashboard/patients/${patient.patientId}`)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}