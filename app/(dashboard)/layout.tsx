import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  clinicAccessErrorMessage,
  getClinicAccessBlockReason,
} from "@/lib/auth/clinic-access";
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
  const blockReason = await getClinicAccessBlockReason(supabase, user.id);

  if (blockReason) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent(clinicAccessErrorMessage(blockReason))}`);
  }

  return <AppShell userEmail={user.email || ""}>{children}</AppShell>;
}