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
      <header className="border-b border-outline-variant/30 bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/invites" className="text-lg font-semibold tracking-[-0.02em]">
              Better CRM · Super Admin
            </Link>
            <nav className="flex gap-4 text-sm text-on-surface-variant">
              <Link href="/admin/invites" className="hover:text-on-surface">
                Invites
              </Link>
              <Link href="/admin/clinics" className="hover:text-on-surface">
                Clinics
              </Link>
            </nav>
          </div>
          <div className="text-xs text-on-surface-variant">{user.email}</div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
