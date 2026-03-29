import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";

import "./globals.css";
import { OfflineIndicator } from "@/components/offline-indicator";

export const viewport: Viewport = {
  themeColor: "#00f2ff",
};

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const displayFont = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Better CRM",
  description:
    "AI-first health CRM foundation with clinic-scoped workflows, auditable lab report ingestion, and Supabase-backed operations.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} dark`}>
      <body className="bg-background text-on-surface antialiased">
        {children}
        <OfflineIndicator />
      </body>
    </html>
  );
}
