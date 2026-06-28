/**
 * components/ui/DeletePatientButton.tsx
 *
 * Reusable patient-deletion trigger — Client Component.
 *
 * RESPONSIBILITIES:
 *   - Confirm intent before deleting (native window.confirm())
 *   - Call DELETE /api/patients/[patientId]
 *   - Display a loading state during the request
 *   - Navigate to patient search results on success
 *   - Surface an error message if deletion fails
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Existence checking, actual deletion
 *       → services/patientService.ts
 *   - Authentication                → middleware.ts
 *
 * DESIGN NOTE — confirmation mechanism:
 *   Uses the native window.confirm() rather than a custom modal
 *   component. No dialog/modal primitive exists anywhere in this
 *   codebase, and building one now — with the associated overlay,
 *   focus-trapping, and dismiss-on-escape concerns a "proper" modal
 *   requires — would introduce a new UI pattern justified by a
 *   single use case. window.confirm() is a native browser API
 *   requiring no new component or dependency, and is functionally
 *   sufficient as a destructive-action guard. This is a deliberate
 *   scope decision, consistent with this project's repeated
 *   rejection of unjustified structural additions (see
 *   metrics/methodology.md Sections 2.2, 2.11-2.13), not an
 *   oversight.
 *
 * DESIGN NOTE — props:
 *   Takes only a patientId string, not a full patient object,
 *   matching deletePatient(patientId: string)'s own signature.
 *   Deletion never needs more than the identifier.
 *
 * DESIGN NOTE — navigation:
 *   Navigates to /dashboard/patients (search results) on success,
 *   not back to the (now-deleted, now-404) detail page the user
 *   was viewing.
 *
 * CYCLOMATIC COMPLEXITY:
 *   handleDelete():            CC = 4
 *     +1  function entry
 *     +1  confirmation check (window.confirm() result)
 *     +1  response.ok check
 *     +1  try/catch decision point
 *
 *   DeletePatientButton():     CC = 1
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface DeletePatientButtonProps {
  patientId: string;
}

export default function DeletePatientButton({ patientId }: DeletePatientButtonProps) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError]           = useState<string>("");

  /**
   * handleDelete
   *
   * CC = 4:
   *   +1  function entry
   *   +1  confirmation check
   *   +1  response.ok check
   *   +1  try/catch decision point
   */
  async function handleDelete(): Promise<void> {
    setError("");

    // Guard — require explicit confirmation before proceeding.
    // A "Cancel" response aborts with no further action and no
    // network call made.
    const confirmed = window.confirm(
      `Are you sure you want to delete patient ${patientId}? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Unable to delete patient. Please try again.");
        return;
      }

      router.push("/dashboard/patients");

    } catch {
      setError("Unable to connect. Please check your connection and try again.");

    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="danger"
        isLoading={isDeleting}
        onClick={handleDelete}
      >
        Delete Patient
      </Button>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}