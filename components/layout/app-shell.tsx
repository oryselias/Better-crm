import { ActivitySquare, CalendarRange, FileText, LayoutDashboard, Wallet } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: ActivitySquare },
  { href: "/appointments", label: "Appointments", icon: CalendarRange },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/billing", label: "Billing", icon: Wallet },
];

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string;
};

export function AppShell({ children, userEmail }: AppShellProps) {
  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="surface flex flex-col rounded-[2rem] border border-[var(--line)] px-5 py-5">
          <div className="space-y-3">
            <p className="eyebrow">Better CRM</p>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.05em]">
                Health operations, without the legacy drag.
              </h1>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Clinic-scoped admin workspace for patient flow, report review,
                and compliance-ready operations.
              </p>
            </div>
          </div>

          <div className="mt-8 flex-1">
            <SidebarNav items={navItems} />
          </div>

          <div className="space-y-4 border-t border-[var(--line)] pt-5">
            <div className="rounded-[1.5rem] border border-white/60 bg-white/60 p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                Signed in
              </p>
              <p className="mt-2 text-sm font-medium">{userEmail}</p>
            </div>
            <SignOutButton />
          </div>
        </aside>

        <main className="surface rounded-[2rem] border border-[var(--line)] px-5 py-5 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
