"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createClinicAction(formData: FormData) {
  const clinicName = (formData.get("clinicName") as string | null)?.trim();

  if (!clinicName) {
    redirect("/onboarding?error=Clinic+name+is+required.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const slug = clinicName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const admin = createSupabaseAdminClient();

  // Create the clinic
  const { data: clinic, error: clinicError } = await admin
    .from("clinics")
    .insert({ name: clinicName, slug: `${slug}-${Date.now()}` })
    .select("id")
    .single();

  if (clinicError || !clinic) {
    redirect(`/onboarding?error=${encodeURIComponent(clinicError?.message ?? "Failed to create clinic.")}`);
  }

  // Create the admin profile for this user
  const { error: profileError } = await admin
    .from("profiles")
    .insert({
      id: user.id,
      clinic_id: clinic.id,
      role: "admin",
      full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? null,
    });

  if (profileError) {
    // Clean up the clinic we just created
    await admin.from("clinics").delete().eq("id", clinic.id);
    redirect(`/onboarding?error=${encodeURIComponent(profileError.message)}`);
  }

  redirect("/dashboard");
}
