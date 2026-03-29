import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string;
};

export function AppShell({ children, userEmail }: AppShellProps) {
  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8 lg:px-12 lg:py-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-bright/20 via-background to-background">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1800px] gap-8 xl:grid-cols-[280px_minmax(0,1fr)] items-start">
        {/* Minimalist Floating Sidebar */}
        <aside className="sticky top-10 flex flex-col h-[calc(100vh-5rem)]">
          <div className="space-y-4 px-2">
            <p className="eyebrow text-primary tracking-widest opacity-80">Aether Medical</p>
            <div>
              <h1 className="text-3xl font-bold tracking-tighter text-on-surface bg-clip-text text-transparent bg-gradient-to-r from-on-surface to-on-surface-variant">
                Better CRM
              </h1>
              <p className="mt-4 text-xs leading-relaxed text-on-surface-variant/80 font-medium max-w-[240px]">
                Clinic-scoped admin workspace for patient flow, report review,
                and compliance-ready operations.
              </p>
            </div>
          </div>

          <div className="mt-12 flex-1">
            <SidebarNav />
          </div>

          <div className="space-y-4 pt-8 shrink-0">
            <div className="rounded-2xl bg-surface-lowest p-4 transition-all duration-300 hover:shadow-ambient hover:border-primary-container/30 border border-transparent">
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase opacity-70">
                Signed in
              </p>
              <p className="mt-1.5 text-xs font-semibold text-primary-container truncate">{userEmail}</p>
            </div>
            <SignOutButton />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="surface rounded-[2.5rem] border border-outline-variant/20 px-6 py-8 md:px-10 md:py-10 overflow-hidden min-h-[calc(100vh-5rem)] shadow-2xl shadow-black/50">
          <div className="animate-fade-in h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
