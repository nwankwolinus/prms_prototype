/**
 * components/ui/LogoutButton.tsx
 *
 * Logout trigger — Client Component.
 *
 * RESPONSIBILITIES:
 *   - Call POST /api/auth/logout on click
 *   - Redirect to /login after the cookie is cleared
 *
 * WHY EXTRACTED:
 *   DashboardLayout is a Server Component. Adding "use client"
 *   to the layout would force the entire shell — sidebar, header,
 *   nav items — to ship as client JavaScript. Extracting only the
 *   interactive element keeps the layout server-rendered and limits
 *   the client bundle to the minimum necessary code.
 *
 * CYCLOMATIC COMPLEXITY:
 *   handleLogout: CC = 2
 *     +1  function entry
 *     +1  try/catch decision point
 */

"use client";

import { useRouter } from "next/navigation";
import { LOGIN_ROUTE } from "@/utils/constants";

export default function LogoutButton() {
  const router = useRouter();

  /**
   * handleLogout
   * Calls the logout endpoint then redirects to login.
   * CC = 2 — single try/catch.
   */
  async function handleLogout(): Promise<void> {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Redirect regardless of fetch outcome —
      // the cookie will be cleared server-side.
      // Even a network failure should send the user to login.
      router.push(LOGIN_ROUTE);
    }
  }

  return (
    <button
      onClick={handleLogout}
      className={[
        "inline-flex items-center gap-2 rounded-md",
        "px-3 py-1.5 text-sm font-medium",
        "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        "transition-colors duration-150",
      ].join(" ")}
      aria-label="Sign out"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      Sign out
    </button>
  );
}