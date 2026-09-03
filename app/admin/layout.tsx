import Link from "next/link";

import { requireSuperAdmin } from "@/lib/auth/super-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-surface-container-lowest">
      <header className="sticky top-0 z-30 border-b border-outline-variant/30 bg-surface/80 backdrop-blur px-6 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
                SA
              </span>
              <span className="text-base font-bold tracking-tight text-on-surface">
                Better CRM <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase ml-1">Super Admin</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/clinics"
                className="rounded-lg px-3 py-1.5 font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                Clinics
              </Link>
              <Link
                href="/admin/invites"
                className="rounded-lg px-3 py-1.5 font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                Invites
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-primary hover:underline"
            >
              Go to CRM &rarr;
            </Link>
            <span className="text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/30">
              {user.email}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
