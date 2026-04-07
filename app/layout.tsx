import type { Metadata, Viewport } from "next";

import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#00f2ff",
};

export const metadata: Metadata = {
  title: "Better CRM",
  description:
    "Lightweight health CRM foundation with clinic-scoped workflows, repeatable lab report generation, and Supabase-backed operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background font-sans text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
