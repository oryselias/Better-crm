import type { SupabaseClient } from "@supabase/supabase-js";

export type ClinicAccessBlockReason = "no_clinic" | "suspended";

export async function getClinicAccessBlockReason(
  supabase: SupabaseClient,
  userId: string,
): Promise<ClinicAccessBlockReason | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.clinic_id) return "no_clinic";

  const { data: clinic } = await supabase
    .from("clinics")
    .select("status")
    .eq("id", profile.clinic_id)
    .maybeSingle();

  if (clinic?.status === "suspended") return "suspended";

  return null;
}

export function clinicAccessErrorMessage(reason: ClinicAccessBlockReason): string {
  if (reason === "suspended") {
    return "Your clinic account is suspended. Contact your administrator.";
  }
  return "No clinic assigned. Please contact your administrator.";
}
