"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createPatient(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("No clinic profile");

  const { error } = await supabase.from("patients").insert({
    clinic_id: profile.clinic_id,
    full_name: formData.get("full_name") as string,
    date_of_birth: (formData.get("date_of_birth") as string) || null,
    sex: (formData.get("sex") as string) || null,
    whatsapp_number: (formData.get("whatsapp_number") as string) || null,
    email: (formData.get("email") as string) || null,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/patients");
}
