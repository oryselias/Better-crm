"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UpdateClinicStatusSchema = z.object({
  clinicId: z.string().uuid("Invalid clinic ID"),
  status: z.enum(["active", "trial", "suspended"]),
});

const DeleteClinicSchema = z.object({
  clinicId: z.string().uuid("Invalid clinic ID"),
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

export async function deleteClinicAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = DeleteClinicSchema.safeParse({
    clinicId: formData.get("clinicId"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { clinicId } = parsed.data;
  const admin = createSupabaseAdminClient();

  // 1. Fetch clinic details
  const { data: clinic, error: clinicFetchError } = await admin
    .from("clinics")
    .select("id, name, template_url")
    .eq("id", clinicId)
    .maybeSingle();

  if (clinicFetchError) {
    return { success: false, error: clinicFetchError.message };
  }
  if (!clinic) {
    return { success: false, error: "Clinic not found" };
  }

  // 2. Fetch all staff user profiles linked to this clinic
  const { data: profiles } = await admin
    .from("profiles")
    .select("id")
    .eq("clinic_id", clinicId);

  const staffUserIds = (profiles ?? []).map((p) => p.id);

  // 3. For any user associated with this clinic, check if they are a super_admin.
  // If not super_admin, delete their auth account from Supabase Auth so they cannot log in.
  if (staffUserIds.length > 0) {
    const { data: superAdmins } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("system_role", "super_admin")
      .in("user_id", staffUserIds);

    const superAdminSet = new Set((superAdmins ?? []).map((sa) => sa.user_id));

    for (const userId of staffUserIds) {
      if (!superAdminSet.has(userId)) {
        // Delete user from auth.users (cascades to user_roles, etc.)
        await admin.auth.admin.deleteUser(userId);
      }
    }
  }

  // 4. Delete profiles explicitly
  await admin.from("profiles").delete().eq("clinic_id", clinicId);

  // 5. Clean up storage files in clinic-templates bucket
  try {
    const { data: templateFiles } = await admin.storage.from("clinic-templates").list(clinicId);
    if (templateFiles && templateFiles.length > 0) {
      const pathsToDelete = templateFiles.map((f) => `${clinicId}/${f.name}`);
      await admin.storage.from("clinic-templates").remove(pathsToDelete);
    }
  } catch (err) {
    console.error("Failed to clean up clinic-templates storage:", err);
  }

  // 6. Delete lab reports, patients, clinic test prices, invites
  await admin.from("lab_reports").delete().eq("clinic_id", clinicId);
  await admin.from("patients").delete().eq("clinic_id", clinicId);
  await admin.from("clinic_test_prices").delete().eq("clinic_id", clinicId);
  await admin.from("invites").delete().eq("clinic_id", clinicId);

  // 7. Delete clinic row
  const { error: deleteClinicError } = await admin
    .from("clinics")
    .delete()
    .eq("id", clinicId);

  if (deleteClinicError) {
    return { success: false, error: deleteClinicError.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clinics");
  return { success: true, clinicName: clinic.name };
}
