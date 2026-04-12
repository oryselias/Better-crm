"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { normalizePatientPhone } from "@/lib/patients/phone";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CreatePatientSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(200, "Name is too long"),
  age: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 150), {
      message: "Age must be between 0 and 150",
    }),
  sex: z.enum(["male", "female", "other", ""]).optional().nullable(),
  phone: z.string().max(20, "Phone number is too long").optional().nullable(),
});

export async function createPatient(formData: FormData) {
  // Validate inputs before hitting the database
  const parsed = CreatePatientSchema.safeParse({
    full_name: formData.get("full_name"),
    age: formData.get("age") || undefined,
    sex: formData.get("sex") || null,
    phone: formData.get("phone") || null,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue: z.ZodIssue) => issue.message).join(", ");
    throw new Error(message);
  }

  const { full_name, age, sex, phone } = parsed.data;

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
    full_name,
    age,
    sex: sex || null,
    phone: normalizePatientPhone(typeof phone === "string" ? phone : null),
    created_by: user.id,
  });

  if (error) throw new Error("Failed to create patient. Please try again.");
  revalidatePath("/patients");
}
