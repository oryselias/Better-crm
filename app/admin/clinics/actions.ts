"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UpdateClinicStatusSchema = z.object({
  clinicId: z.string().uuid("Invalid clinic ID"),
  status: z.enum(["active", "trial", "suspended"]),
});

export async function updateClinicStatusAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = UpdateClinicStatusSchema.safeParse({
    clinicId: formData.get("clinicId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("clinics")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.clinicId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clinics");
  revalidatePath(`/admin/clinics/${parsed.data.clinicId}`);
  return { success: true };
}
