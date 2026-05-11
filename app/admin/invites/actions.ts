"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CreateInviteSchema = z.object({
  email: z.string().email("Invalid email"),
  clinicName: z.string().min(1, "Clinic name is required").max(100),
  role: z.enum(["admin", "lab_staff", "clinician"]).default("admin"),
});

export async function createInviteAction(formData: FormData) {
  const user = await requireSuperAdmin();

  const parsed = CreateInviteSchema.safeParse({
    email: (formData.get("email") as string | null)?.trim().toLowerCase(),
    clinicName: (formData.get("clinicName") as string | null)?.trim(),
    role: (formData.get("role") as string | null) ?? "admin",
  });

  if (!parsed.success) {
    redirect(`/admin/invites?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("invites").insert({
    email: parsed.data.email,
    clinic_name: parsed.data.clinicName,
    role: parsed.data.role,
    created_by: user.id,
  });

  if (error) {
    redirect(`/admin/invites?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/invites");
  redirect("/admin/invites?success=Invite+created");
}

export async function revokeInviteAction(formData: FormData) {
  await requireSuperAdmin();

  const id = formData.get("id") as string;
  if (!id) return;

  const admin = createSupabaseAdminClient();
  await admin.from("invites").delete().eq("id", id).is("used_at", null);

  revalidatePath("/admin/invites");
}
