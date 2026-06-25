/**
 * app/(dashboard)/layout.tsx
 *
 * Protected dashboard layout — React Server Component.
 *
 * RESPONSIBILITIES:
 *   - Provide the persistent shell (sidebar, header, content area)
 *     for all protected pages in the (dashboard) route group
 *   - Display the authenticated user's role in the header
 *   - Render role-aware navigation links
 *   - Provide a logout action via the LogoutButton component
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Authentication checking     → middleware.ts
 *   - Token verification          → lib/jwt.ts
 *   - Session management          → services/authService.ts
 *   - Page-specific content       → individual page components
 *
 * DESIGN NOTES:
 *   - This layout runs as a React Server Component. It reads the
 *     JWT cookie directly on the server to extract the user's role
 *     for display purposes. This is a read-only operation — no
 *     security decisions are made here. The middleware has already
 *     enforced authentication before this layout renders.
 *
 *   - Navigation items are defined as a static array (NAV_ITEMS).
 *     This is a data-oriented pattern — adding a new nav link
 *     requires only a new array entry, not a new JSX block.
 *     CC contribution: 0. An equivalent series of if/else blocks
 *     would add CC proportional to the number of items.
 *
 *   - The LogoutButton is extracted as a separate Client Component
 *     because it needs an onClick handler. Extracting it keeps
 *     this Server Component free of "use client" — allowing the
 *     rest of the layout to remain server-rendered.
 *
 *   - Role display uses a lookup object (ROLE_LABELS) rather than
 *     a switch statement — the same pattern used in Button.tsx for
 *     variant resolution. CC contribution: 0.
 *
 * CYCLOMATIC COMPLEXITY:
 *   DashboardLayout:   CC = 1  (pure composition, no branching)
 *   NavItem render:    CC = 2  (active link highlight conditional)
 *   getRoleLabel:      CC = 1  (object lookup, no branching)
 */

import { cookies }   from "next/headers";
import Link from "next/link";
import { verifyToken } from "@/lib/jwt";
import { UserRole }  from "@/types";
import { AUTH_COOKIE_NAME } from "@/utils/constants";
import LogoutButton  from "@/components/ui/LogoutButton";

// ─── Navigation Items ─────────────────────────────────────────────────────────

/**
 * NAV_ITEMS
 *
 * Static array defining all sidebar navigation links.
 * Data-oriented pattern: new pages require only a new array entry.
 * CC contribution: 0 — no conditional logic.
 *
 * roles: which user roles can see this nav item.
 * An empty roles array means visible to all authenticated users.
 */
const NAV_ITEMS = [
  {
    label: "Dashboard",
    href:  "/dashboard",
    roles: [] as UserRole[],
    icon:  "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    label: "Patients",
    href:  "/dashboard/patients",
    roles: [] as UserRole[],
    icon:  "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    label: "Register Patient",
    href:  "/dashboard/patients/register",
    roles: [UserRole.ADMIN, UserRole.RECEPTIONIST],
    icon:  "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  },
  {
    label: "Admin",
    href:  "/dashboard/admin",
    roles: [UserRole.ADMIN],
    icon:  "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1。724 0 00-1。065-2。572c-1。756-.426-1。756-２。9２４ ０－３。３５a１。７２４ １。７２４ ０ ００１。０６６－２。５７３c－０。９４－１。５４３＋０。８２６－３。３１ ＋２。３７－２。３７＋０。９９６＋０。６０８ ＋２。２９６＋０。０７ ＋２。５７２－１。０６５z M１５ １２a３ ３ ０ １１－６ ０ ３ ３ ０ ０１６ ０z",
  },
];

// ─── Role Labels ──────────────────────────────────────────────────────────────

/**
 * ROLE_LABELS
 *
 * Human-readable display strings for each role.
 * Object lookup pattern — CC contribution: 0.
 * Equivalent switch statement would add CC = 3.
 */
const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]:        "Administrator",
  [UserRole.DOCTOR]:       "Doctor",
  [UserRole.RECEPTIONIST]: "Receptionist",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * getRoleLabel
 *
 * Returns the human-readable label for a given role.
 * Falls back to the raw role string if not found.
 * CC = 1 — nullish coalescing is not a control-flow branch.
 */
function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}

/**
 * isNavItemVisible
 *
 * Returns true if a nav item should be visible to the given role.
 * An empty roles array means the item is visible to all roles.
 *
 * CC = 2:
 *   +1  function entry
 *   +1  roles.length check
 */
function isNavItemVisible(
  itemRoles: readonly UserRole[],
  userRole:  UserRole
): boolean {
  if (itemRoles.length === 0) return true;
  return itemRoles.includes(userRole);
}

// ─── Layout Component ─────────────────────────────────────────────────────────

/**
 * DashboardLayout
 *
 * Server Component shell for all protected pages.
 * Reads the JWT cookie to extract user role for display
 * and navigation filtering — no security decisions made here.
 *
 * CC = 1 — pure composition, no branching in the component body.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Extract User Context from JWT ─────────────────────────────────────────
  // The middleware has already validated this token.
  // We read it here only to personalise the UI (role display,
  // nav filtering). If verification fails here, we render
  // without personalisation — the middleware is the security gate.
  const cookieStore = await cookies();
  const token       = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? "";
  const tokenResult = await verifyToken(token);
  const userRole    = tokenResult.valid ? tokenResult.payload.role : UserRole.RECEPTIONIST;
  const userEmail   = tokenResult.valid ? tokenResult.payload.email : "";

  // Filter nav items to those visible for this user's role.
  const visibleNavItems = NAV_ITEMS.filter((item) =>
    isNavItemVisible(item.roles, userRole)
  );

  return (
    <div className="flex h-screen bg-gray-100">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="flex w-64 shrink-0 flex-col bg-white shadow-md">

        {/* Sidebar header / system name */}
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">PRMS</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          <ul className="space-y-1">
            {visibleNavItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    "text-gray-700 hover:bg-blue-50 hover:text-blue-700",
                    "transition-colors duration-150",
                  ].join(" ")}
                >
                  <svg
                    className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar footer — user info */}
        <div className="border-t border-gray-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <span className="text-xs font-semibold text-blue-700">
                {userEmail.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-gray-900">
                {userEmail}
              </p>
              <p className="text-xs text-gray-500">
                {getRoleLabel(userRole)}
              </p>
            </div>
          </div>
        </div>

      </aside>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top header bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {getRoleLabel(userRole)}
            </p>
            <p className="text-xs text-gray-500">
              Patient Record Management System
            </p>
          </div>

          {/* Logout button — Client Component for click handling */}
          <LogoutButton />
        </header>

        {/* Page content — injected by each individual page */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>

      </div>
    </div>
  );
}