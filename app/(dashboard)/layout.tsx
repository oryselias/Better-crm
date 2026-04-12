import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    .select("clinic_id")
    .eq("id", user.id)
    .single();

  if (!profile?.clinic_id) {
    // If user has no associated clinic, they shouldn't access the dashboard
    // In a full app you might direct to a "Contact Admin" page,
    // here we clear their session and send them back to login.
    await supabase.auth.signOut();
    redirect("/login?error=No+clinic+assigned.+Please+contact+administrator.");
  }

  return <AppShell userEmail={user.email || ""}>{children}</AppShell>;
}