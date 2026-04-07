import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string;
};

export function AppShell({ children, userEmail }: AppShellProps) {
  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8 lg:px-12 lg:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1800px] gap-8 xl:grid-cols-[260px_minmax(0,1fr)] items-start">

        {/* Sidebar */}
        <aside className="sticky top-10 flex flex-col h-[calc(100vh-5rem)]">
          <div className="space-y-3 px-2">
            <p className="eyebrow text-primary">Lab Workflow</p>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-on-surface">
                Better CRM
              </h1>
              <p className="mt-3 text-xs leading-relaxed text-on-surface-variant max-w-[220px]">
                Clinic workspace for patient registration, test selection,
                and printable lab reports.
              </p>
            </div>
          </div>

          <div className="mt-10 flex-1">
            <SidebarNav />
          </div>

          <div className="space-y-3 pt-6 shrink-0">
            <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/40">
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                Signed in
              </p>
              <p className="mt-1 text-xs font-semibold text-primary truncate">{userEmail}</p>
            </div>
            <SignOutButton />
          </div>
        </aside>

        {/* Main Content */}
        <main className="surface rounded-3xl px-6 py-8 md:px-10 md:py-10 overflow-hidden min-h-[calc(100vh-5rem)]">
          <div className="animate-fade-in h-full">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
