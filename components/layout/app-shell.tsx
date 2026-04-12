import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { MobileNav } from "@/components/layout/mobile-nav";

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string;
};

export function AppShell({ children, userEmail }: AppShellProps) {
  return (
    <div className="min-h-screen bg-surface-container-lowest xl:bg-background xl:p-10">
      <MobileNav userEmail={userEmail} />

      <div className="mx-auto flex flex-col xl:grid min-h-screen xl:min-h-[calc(100vh-5rem)] max-w-[1800px] xl:gap-8 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
        
        {/* Sidebar (Desktop) */}
        <aside className="sticky top-10 hidden h-[calc(100vh-5rem)] flex-col xl:flex">
          <div className="space-y-3 px-2">
            <p className="eyebrow text-primary">Lab Workflow</p>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-on-surface">
                Better CRM
              </h1>
              <p className="mt-3 max-w-[220px] text-xs leading-relaxed text-on-surface-variant">
                Clinic workspace for patient registration, test selection,
                and printable lab reports.
              </p>
            </div>
          </div>

          <div className="mt-10 flex-1">
            <SidebarNav />
          </div>

          <div className="shrink-0 space-y-3 pt-6">
            <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                Signed in
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-primary">{userEmail}</p>
            </div>
            <SignOutButton />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden px-4 pb-28 pt-20 sm:px-6 md:px-8 xl:surface xl:min-h-[calc(100vh-5rem)] xl:rounded-[2rem] xl:p-10 xl:shadow-sm">
          <div className="animate-fade-in h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}