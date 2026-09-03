import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithRole } from "@/lib/auth/super-admin";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Clinic enforcement check
  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id, clinics:clinics(name, status)")
    .eq("id", user.id)
    .single();

  if (!profile?.clinic_id) {
    // If user has no associated clinic, they shouldn't access the dashboard
    // In a full app you might direct to a "Contact Admin" page,
    // here we clear their session and send them back to login.
    await supabase.auth.signOut();
    redirect("/login?error=No+clinic+assigned.+Please+contact+administrator.");
  }

  const clinic = Array.isArray(profile.clinics) ? profile.clinics[0] : profile.clinics;
  if (clinic?.status === "suspended") {
    const { isSuperAdmin } = await getCurrentUserWithRole();
    if (!isSuperAdmin) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface-container-lowest p-6 text-center">
          <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-surface p-8 shadow-xl shadow-red-500/5">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-on-surface">Clinic Account Suspended</h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Access for <span className="font-semibold text-on-surface">{clinic?.name ?? "this clinic"}</span> is currently suspended. Please contact platform administration to restore access.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="btn-primary w-full rounded-xl py-2.5 text-sm font-semibold"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      );
    }
  }

  return <AppShell userEmail={user.email || ""}>{children}</AppShell>;
}