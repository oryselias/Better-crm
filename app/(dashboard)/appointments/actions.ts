"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createAppointment(formData: FormData) {
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

  const scheduled_at = new Date(
    `${formData.get("date")}T${formData.get("time")}`,
  ).toISOString();

  const { error } = await supabase.from("appointments").insert({
    clinic_id: profile.clinic_id,
    patient_id: formData.get("patient_id") as string,
    scheduled_at,
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/appointments");
}

export async function updateAppointmentStatus(id: string, status: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/appointments");
}
