/**
 * app/page.tsx
 * Root route — immediately redirects to /login.
 */
import { redirect } from "next/navigation";
import { LOGIN_ROUTE } from "@/utils/constants";

export default function RootPage() {
  redirect(LOGIN_ROUTE);
}