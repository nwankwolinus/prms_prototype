/**
 * app/layout.tsx
 *
 * Root layout for the entire application.
 * Every page is wrapped in this component.
 * Kept minimal to avoid coupling layout to any feature.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PRMS — Patient Record Management System",
  description:
    "An Agile-developed patient record management system evaluated using McCabe and Halstead complexity metrics.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}