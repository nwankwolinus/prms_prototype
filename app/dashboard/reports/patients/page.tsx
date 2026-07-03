/**
 * app/dashboard/reports/patients/page.tsx
 *
 * REFACTORED (Sprint 4 Stage 5):
 *
 * Pre-refactor CC: 11 (PatientReportPage) — over the CC=10 risk
 * threshold. Root cause: four JSX conditional render blocks using
 * compound boolean expressions (&&-chained operands), the most
 * complex of which was:
 *   {!isLoading && !error && hasFetched && patients.length === 0 && (...)}
 * — four chained && operators, each a separate decision point
 * under McCabe's formal definition, contributing 4 decision
 * points from a single render condition alone.
 *
 * This is the same compound-boolean-in-JSX undercount pattern
 * documented in Sprint 1 (Input.tsx, Select.tsx), Sprint 2
 * (PatientDetailPage), and Sprint 3 (validateUpdateInput,
 * updatePatient) — now appearing for the fourth time. The
 * mechanism is identical each time: what reads visually as "one
 * conditional render block" compiles to multiple independent
 * decision points under the tool's AST-based analysis. The
 * recurring nature of this pattern, now confirmed across four
 * sprints in both JSX and non-JSX code, is itself a significant
 * finding for Chapter 5.
 *
 * REFACTORING TECHNIQUE:
 *   A single pure function (getReportState) derives a categorical
 *   state string from the four boolean/count conditions that
 *   previously drove the render blocks. Each render block now
 *   checks a single string equality rather than a compound boolean
 *   chain. This converts what was 10+ decision points spread
 *   across four compound conditions into:
 *     - getReportState():    CC = 5 (four single guards + entry)
 *     - PatientReportPage(): CC = 5 (four single checks + entry)
 *   Both well within the threshold, and the state logic is now
 *   named, independently readable, and independently testable.
 *
 * This mirrors the strategy proposed for PatientDetailPage in the
 * Sprint 2 checkpoint (metrics/checkpoints.md) — which recorded
 * the "collapse compound boolean chains into a single derived
 * status variable" as a candidate refactoring for CC=9 functions.
 * It is now applied in practice here, with verified before/after
 * numbers, providing exactly the evidence for Chapter 5 that
 * that flag was anticipating.
 *
 * CYCLOMATIC COMPLEXITY (post-refactor):
 *   getReportState():     CC = 5
 *     +1  function entry
 *     +1  isLoading check
 *     +1  error check
 *     +1  hasFetched && patientCount === 0 check
 *     +1  default populated return (implicit, completes the graph)
 *
 *   fetchReport():         CC = 3  (unchanged)
 *
 *   PatientReportPage():   CC = 5
 *     +1  component entry
 *     +1  "loading" state check
 *     +1  "error" state check
 *     +1  "empty" state check
 *     +1  "populated" state check
 *
 *   No other logic changed — only the control-flow shape of
 *   the render conditions.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { PatientReportItem } from "@/types/patientReport";

// ─── Report State ─────────────────────────────────────────────────────────────

/**
 * ReportState
 *
 * A discriminated literal union representing the four mutually
 * exclusive states of the report page. Using a named type rather
 * than inline boolean chains makes each state's identity
 * immediately readable — both in getReportState() and in the JSX
 * render block that consumes it.
 */
type ReportState = "loading" | "error" | "empty" | "populated";

/**
 * getReportState
 *
 * Pure function deriving a single categorical ReportState from
 * the component's four state variables. Extracted here so:
 *   (1) the component body only checks a single equality per
 *       render block, contributing one decision point each
 *       (not two to four, as the compound boolean chains did);
 *   (2) the state-derivation logic is independently named,
 *       readable, and testable without mounting the component.
 *
 * CC = 5:
 *   +1  function entry
 *   +1  isLoading guard
 *   +1  error guard
 *   +1  empty guard (hasFetched && patientCount === 0)
 *   +1  implicit populated fallthrough
 *
 * Note: the empty guard still contains one && — but this is a
 * single guard clause inside a named function, not a compound
 * expression inside a JSX attribute, so its intent is clear and
 * its contribution to this function's CC is contained and
 * proportional. The overall compound-boolean count across the
 * entire component has dropped from 10 chained operands (pre-
 * refactor) to this single instance.
 *
 * @param isLoading    - Whether the fetch is in progress.
 * @param error        - The error message, if any.
 * @param hasFetched   - Whether at least one fetch has completed.
 * @param patientCount - The number of patients in the report.
 * @returns The current ReportState.
 */
function getReportState(
  isLoading:    boolean,
  error:        string,
  hasFetched:   boolean,
  patientCount: number
): ReportState {
  if (isLoading)                         return "loading";
  if (error)                             return "error";
  if (hasFetched && patientCount === 0)  return "empty";
  return "populated";
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PatientReportPage
 *
 * CC = 5 (post-refactor, down from 11):
 *   +1  component entry
 *   +1  "loading"   state render check
 *   +1  "error"     state render check
 *   +1  "empty"     state render check
 *   +1  "populated" state render check
 *
 * Each check is a single string equality — one decision point,
 * not a compound boolean chain.
 */
export default function PatientReportPage() {
  const router = useRouter();

  const [patients, setPatients]       = useState<PatientReportItem[]>([]);
  const [isLoading, setIsLoading]     = useState<boolean>(true);
  const [error, setError]             = useState<string>("");
  const [hasFetched, setHasFetched]   = useState<boolean>(false);

  /**
   * fetchReport — unchanged from pre-refactor. CC = 3.
   */
  const fetchReport = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/patients/report");
      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Unable to load patient report.");
        return;
      }

      setPatients(data.data.patients);
      setHasFetched(true);

    } catch {
      setError("Unable to connect. Please check your connection and try again.");

    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // ── Derive single categorical state ───────────────────────────────────────
  const reportState = getReportState(isLoading, error, hasFetched, patients.length);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Report</h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete administrative listing of all registered patients.
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      {/* ── Loading State ─────────────────────────────────────────────────── */}
      {reportState === "loading" && (
        <div className="rounded-xl bg-white p-8 text-center text-sm
                        text-gray-500 shadow-sm ring-1 ring-gray-200">
          Loading patient report...
        </div>
      )}

      {/* ── Error State ───────────────────────────────────────────────────── */}
      {reportState === "error" && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200
                     px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────────────── */}
      {reportState === "empty" && (
        <div className="rounded-md bg-gray-50 border border-gray-200
                        px-4 py-8 text-center text-sm text-gray-500">
          No patient records found.
        </div>
      )}

      {/* ── Populated State ───────────────────────────────────────────────── */}
      {reportState === "populated" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Total Patients:{" "}
            <span className="font-semibold text-gray-900">{patients.length}</span>
          </p>

          <div className="overflow-x-auto rounded-xl bg-white
                          shadow-sm ring-1 ring-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Patient ID</th>
                  <th className="px-4 py-3 font-medium text-gray-500">First Name</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Last Name</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Gender</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Date of Birth</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Phone Number</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Address</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Registration Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((patient) => (
                  <tr key={patient.patientId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-900">
                      {patient.patientId}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{patient.firstName}</td>
                    <td className="px-4 py-3 text-gray-700">{patient.lastName}</td>
                    <td className="px-4 py-3 text-gray-700">{patient.gender}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(patient.dateOfBirth).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{patient.phoneNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{patient.address}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(patient.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}