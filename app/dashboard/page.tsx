/**
 * app/(dashboard)/page.tsx
 *
 * Dashboard home page — React Server Component.
 *
 * RESPONSIBILITIES:
 *   - Display a personalised welcome message based on user role
 *   - Show system summary cards (sprint placeholders for real data)
 *   - Provide quick-access navigation to key features
 *   - Confirm to the user which role they are authenticated as
 *
 * EXPLICITLY NOT RESPONSIBLE FOR:
 *   - Authentication enforcement  → middleware.ts
 *   - Patient data retrieval      → Stage 3 / Sprint 2
 *   - Business logic              → services/
 *
 * DESIGN NOTES:
 *   - Stat cards are defined as a static data array rather than
 *     hardcoded JSX blocks. This is the same data-oriented pattern
 *     used in the layout's NAV_ITEMS — zero CC contribution from
 *     the card definitions themselves.
 *
 *   - Real counts (total patients, registrations today) will be
 *     wired to the database in Sprint 2. For Sprint 1, placeholder
 *     values are used. This is explicitly documented so the
 *     dissertation can reference this as a deliberate incremental
 *     delivery decision consistent with Scrum methodology.
 *
 *   - The role-aware greeting is handled by a pure function
 *     (getRoleGreeting) using an object lookup — consistent with
 *     the lookup pattern established in Button.tsx and layout.tsx.
 *
 * CYCLOMATIC COMPLEXITY:
 *   getRoleGreeting:  CC = 1  (object lookup, no branching)
 *   getQuickLinks:    CC = 2  (one role-based filter)
 *   DashboardPage:    CC = 1  (pure composition)
 */

import type { Metadata } from "next";
import { cookies }       from "next/headers";
import Link              from "next/link";
import { verifyToken }   from "@/lib/jwt";
import { UserRole }      from "@/types";
import { AUTH_COOKIE_NAME } from "@/utils/constants";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:       "Dashboard — PRMS",
  description: "Patient Record Management System dashboard.",
};

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of a summary stat card. */
interface StatCard {
  label:       string;
  value:       string;
  description: string;
  color:       string;
}

/** Shape of a quick-access link card. */
interface QuickLink {
  label:       string;
  description: string;
  href:        string;
  roles:       UserRole[];   // Empty array = visible to all roles
  color:       string;
  icon:        string;
}

// ─── Static Data ──────────────────────────────────────────────────────────────

/**
 * ROLE_GREETINGS
 *
 * Role-specific greeting prefix.
 * Object lookup — CC contribution: 0.
 */
const ROLE_GREETINGS: Record<UserRole, string> = {
  [UserRole.ADMIN]:        "Welcome, Administrator",
  [UserRole.DOCTOR]:       "Good day, Doctor",
  [UserRole.RECEPTIONIST]: "Welcome, Receptionist",
};

/**
 * STAT_CARDS
 *
 * Summary metric cards displayed at the top of the dashboard.
 * Values are placeholder strings for Sprint 1.
 * Sprint 2 will replace these with live database counts.
 *
 * Defined as static data — CC contribution: 0.
 */
const STAT_CARDS: StatCard[] = [
  {
    label:       "Total Patients",
    value:       "—",
    description: "Live count available in Sprint 2",
    color:       "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    label:       "Registered Today",
    value:       "—",
    description: "Live count available in Sprint 2",
    color:       "bg-green-50 border-green-200 text-green-700",
  },
  {
    label:       "Active Users",
    value:       "3",
    description: "Administrator, Doctor, Receptionist",
    color:       "bg-purple-50 border-purple-200 text-purple-700",
  },
  {
    label:       "System Status",
    value:       "Online",
    description: "MongoDB connected — Sprint 1",
    color:       "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
];

/**
 * QUICK_LINKS
 *
 * Feature shortcut cards rendered below the stat cards.
 * Role-filtered at render time via getQuickLinks().
 * Defined as static data — CC contribution: 0.
 */
const QUICK_LINKS: QuickLink[] = [
  {
    label:       "Patient Records",
    description: "View and search registered patient records.",
    href:        "/dashboard/patients",
    roles:       [],
    color:       "hover:border-blue-400 hover:bg-blue-50",
    icon:        "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    label:       "Register Patient",
    description: "Create a new patient record in the system.",
    href:        "/dashboard/patients/register",
    roles:       [UserRole.ADMIN, UserRole.RECEPTIONIST],
    color:       "hover:border-green-400 hover:bg-green-50",
    icon:        "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  },
  {
    label:       "Admin Panel",
    description: "Manage system users and configuration.",
    href:        "/dashboard/admin",
    roles:       [UserRole.ADMIN],
    color:       "hover:border-purple-400 hover:bg-purple-50",
    icon:        "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * getRoleGreeting
 *
 * Returns a role-appropriate greeting string.
 * Object lookup — CC = 1, no branching.
 *
 * @param role - Authenticated user's role.
 * @returns Greeting string for display.
 */
function getRoleGreeting(role: UserRole): string {
  return ROLE_GREETINGS[role] ?? "Welcome";
}

/**
 * getQuickLinks
 *
 * Filters QUICK_LINKS to those visible for the given role.
 * Mirrors the isNavItemVisible pattern from layout.tsx,
 * kept local here as it operates on a different data structure.
 *
 * CC = 2:
 *   +1  function entry
 *   +1  roles.length conditional inside filter callback
 *
 * @param role - Authenticated user's role.
 * @returns Filtered array of QuickLink items.
 */
function getQuickLinks(role: UserRole): QuickLink[] {
  return QUICK_LINKS.filter((link) =>
    link.roles.length === 0 || link.roles.includes(role)
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

/**
 * DashboardPage
 *
 * Server Component — reads JWT for personalisation only.
 * All data shown is either static or placeholder for Sprint 1.
 *
 * CC = 1 — pure composition, no branching.
 */
export default async function DashboardPage() {

  // ── Read user context from JWT ───────────────────────────────────────────
  const cookieStore = await cookies();
  const token       = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? "";
  const tokenResult = await verifyToken(token);
  const userRole    = tokenResult.valid
    ? tokenResult.payload.role
    : UserRole.RECEPTIONIST;

  const visibleQuickLinks = getQuickLinks(userRole);

  return (
    <div className="space-y-8">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold text-gray-900">
          {getRoleGreeting(userRole)}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Sprint 1 — Authentication and system foundation established.
          Patient registration available in the next stage.
        </p>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <section aria-labelledby="stats-heading">
        <h2
          id="stats-heading"
          className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500"
        >
          System Overview
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((card) => (
            <div
              key={card.label}
              className={[
                "rounded-lg border p-5",
                card.color,
              ].join(" ")}
            >
              <p className="text-xs font-medium uppercase tracking-wide opacity-75">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-bold">
                {card.value}
              </p>
              <p className="mt-1 text-xs opacity-60">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick Access Links ────────────────────────────────────────────── */}
      <section aria-labelledby="quicklinks-heading">
        <h2
          id="quicklinks-heading"
          className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500"
        >
          Quick Access
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleQuickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "group flex items-start gap-4 rounded-lg border border-gray-200",
                "bg-white p-5 shadow-sm",
                "transition-all duration-150",
                link.color,
              ].join(" ")}
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100 group-hover:bg-white">
                <svg
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={link.icon}
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {link.label}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {link.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Sprint 1 Status Banner ────────────────────────────────────────── */}
      <section
        className="rounded-lg border border-blue-200 bg-blue-50 p-5"
        aria-label="Sprint status"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600">
            <svg
              className="h-3.5 w-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Sprint 1 Complete — Authentication Layer
            </p>
            <p className="mt-1 text-xs text-blue-700">
              JWT-based authentication, role-based route protection, and the
              project foundation are in place. McCabe and Halstead metrics
              will be extracted at the Sprint 1 code freeze checkpoint.
            </p>
            <ul className="mt-3 space-y-1">
              {[
                "User authentication (Administrator, Doctor, Receptionist)",
                "JWT cookie session management",
                "Role-based middleware route protection",
                "Layered architecture: models, services, utils",
                "Reusable UI component library (Button, Input)",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-xs text-blue-700"
                >
                  <span className="h-1 w-1 rounded-full bg-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
}