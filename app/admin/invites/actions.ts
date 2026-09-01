"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CreateInviteSchema = z.discriminatedUnion("inviteType", [
  z.object({
    inviteType: z.literal("new"),
    email: z.string().email("Invalid email"),
    clinicName: z.string().min(1, "Clinic name is required").max(100),
    role: z.enum(["admin", "lab_staff", "clinician"]).default("admin"),
  }),
  z.object({
    inviteType: z.literal("existing"),
    email: z.string().email("Invalid email"),
    clinicId: z.string().uuid("Invalid clinic selection"),
    role: z.enum(["admin", "lab_staff", "clinician"]).default("lab_staff"),
  }),
]);

export async function createInviteAction(formData: FormData) {
  const user = await requireSuperAdmin();

  const inviteType = (formData.get("inviteType") as string | null) ?? "new";

  const rawData =
    inviteType === "existing"
      ? {
          inviteType: "existing" as const,
          email: (formData.get("email") as string | null)?.trim().toLowerCase(),
          clinicId: (formData.get("clinicId") as string | null)?.trim(),
          role: (formData.get("role") as string | null) ?? "lab_staff",
        }
      : {
          inviteType: "new" as const,
          email: (formData.get("email") as string | null)?.trim().toLowerCase(),
          clinicName: (formData.get("clinicName") as string | null)?.trim(),
          role: (formData.get("role") as string | null) ?? "admin",
        };

  const parsed = CreateInviteSchema.safeParse(rawData);

  if (!parsed.success) {
    redirect(`/admin/invites?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const admin = createSupabaseAdminClient();

  const payload =
    parsed.data.inviteType === "existing"
      ? {
          email: parsed.data.email,
          clinic_id: parsed.data.clinicId,
          clinic_name: null,
          role: parsed.data.role,
          created_by: user.id,
        }
      : {
          email: parsed.data.email,
          clinic_name: parsed.data.clinicName,
          clinic_id: null,
          role: parsed.data.role,
          created_by: user.id,
        };

  const { error } = await admin.from("invites").insert(payload);

  if (error) {
    redirect(`/admin/invites?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/invites");
  redirect("/admin/invites?success=Invite+created+successfully");
}

export async function revokeInviteAction(formData: FormData) {
  await requireSuperAdmin();

  const id = formData.get("id") as string;
  if (!id) return;

  const admin = createSupabaseAdminClient();
  await admin.from("invites").delete().eq("id", id).is("used_at", null);

  revalidatePath("/admin/invites");
}
