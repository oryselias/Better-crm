"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logAdminAction } from "@/lib/admin/audit";
import {
  deleteClinicAccountPermanently,
  emailHasAuthAccount,
  resetOrphanInvite,
  setClinicLifecycleStatus,
} from "@/lib/admin/clinic-accounts";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CreateInviteSchema = z.object({
  email: z.string().email("Invalid email"),
  clinicName: z.string().min(1, "Clinic name is required").max(100),
  role: z.enum(["admin", "lab_staff", "clinician"]).default("admin"),
});

const ClinicIdSchema = z.object({
  clinicId: z.string().uuid("Invalid clinic id"),
});

const InviteIdSchema = z.object({
  inviteId: z.string().uuid("Invalid invite id"),
});

function invitesRedirect(query: { error?: string; success?: string }): never {
  const params = new URLSearchParams();
  if (query.error) params.set("error", query.error);
  if (query.success) params.set("success", query.success);
  const suffix = params.toString();
  redirect(suffix ? `/admin/invites?${suffix}` : "/admin/invites");
}

export async function createInviteAction(formData: FormData) {
  const user = await requireSuperAdmin();

  const parsed = CreateInviteSchema.safeParse({
    email: (formData.get("email") as string | null)?.trim().toLowerCase(),
    clinicName: (formData.get("clinicName") as string | null)?.trim(),
    role: (formData.get("role") as string | null) ?? "admin",
  });

  if (!parsed.success) {
    invitesRedirect({ error: parsed.error.issues[0].message });
  }

  try {
    if (await emailHasAuthAccount(parsed.data.email)) {
      invitesRedirect({
        error: "An account already exists for this email. Suspend or delete the clinic account first.",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify email availability.";
    invitesRedirect({ error: message });
  }

  const admin = createSupabaseAdminClient();

  const { data: created, error } = await admin
    .from("invites")
    .insert({
      email: parsed.data.email,
      clinic_name: parsed.data.clinicName,
      role: parsed.data.role,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    invitesRedirect({ error: error.message });
  }

  await logAdminAction({
    actorId: user.id,
    action: "invite.create",
    targetType: "invite",
    targetId: created.id,
    metadata: { email: parsed.data.email, clinicName: parsed.data.clinicName, role: parsed.data.role },
  });

  revalidatePath("/admin/invites");
  invitesRedirect({ success: "Invite created" });
}

export async function revokeInviteAction(formData: FormData) {
  const user = await requireSuperAdmin();

  const parsed = InviteIdSchema.safeParse({
    inviteId: formData.get("id"),
  });

  if (!parsed.success) {
    invitesRedirect({ error: parsed.error.issues[0].message });
  }

  const admin = createSupabaseAdminClient();
  const { data: deleted, error } = await admin
    .from("invites")
    .delete()
    .eq("id", parsed.data.inviteId)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    invitesRedirect({ error: error.message });
  }

  if (!deleted) {
    invitesRedirect({ error: "Invite not found or already used." });
  }

  await logAdminAction({
    actorId: user.id,
    action: "invite.revoke",
    targetType: "invite",
    targetId: parsed.data.inviteId,
  });

  revalidatePath("/admin/invites");
  invitesRedirect({ success: "Invite revoked" });
}

export async function resetOrphanInviteAction(formData: FormData) {
  const user = await requireSuperAdmin();

  const parsed = InviteIdSchema.safeParse({
    inviteId: formData.get("id"),
  });

  if (!parsed.success) {
    invitesRedirect({ error: parsed.error.issues[0].message });
  }

  try {
    await resetOrphanInvite(parsed.data.inviteId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset invite.";
    invitesRedirect({ error: message });
  }

  await logAdminAction({
    actorId: user.id,
    action: "invite.reset_orphan",
    targetType: "invite",
    targetId: parsed.data.inviteId,
  });

  revalidatePath("/admin/invites");
  invitesRedirect({ success: "Orphan invite reset — link is usable again" });
}

export async function suspendClinicAccountAction(formData: FormData) {
  const user = await requireSuperAdmin();

  const parsed = ClinicIdSchema.safeParse({
    clinicId: formData.get("clinicId"),
  });

  if (!parsed.success) {
    invitesRedirect({ error: parsed.error.issues[0].message });
  }

  try {
    await setClinicLifecycleStatus(parsed.data.clinicId, "suspended");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to suspend clinic.";
    invitesRedirect({ error: message });
  }

  await logAdminAction({
    actorId: user.id,
    action: "clinic.suspend",
    targetType: "clinic",
    targetId: parsed.data.clinicId,
  });

  revalidatePath("/admin/invites");
  invitesRedirect({ success: "Clinic suspended" });
}

export async function activateClinicAccountAction(formData: FormData) {
  const user = await requireSuperAdmin();

  const parsed = ClinicIdSchema.safeParse({
    clinicId: formData.get("clinicId"),
  });

  if (!parsed.success) {
    invitesRedirect({ error: parsed.error.issues[0].message });
  }

  try {
    await setClinicLifecycleStatus(parsed.data.clinicId, "active");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to activate clinic.";
    invitesRedirect({ error: message });
  }

  await logAdminAction({
    actorId: user.id,
    action: "clinic.activate",
    targetType: "clinic",
    targetId: parsed.data.clinicId,
  });

  revalidatePath("/admin/invites");
  invitesRedirect({ success: "Clinic activated" });
}

export async function deleteClinicAccountAction(formData: FormData) {
  const user = await requireSuperAdmin();

  const parsed = ClinicIdSchema.safeParse({
    clinicId: formData.get("clinicId"),
  });

  if (!parsed.success) {
    invitesRedirect({ error: parsed.error.issues[0].message });
  }

  try {
    await deleteClinicAccountPermanently(parsed.data.clinicId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete clinic.";
    invitesRedirect({ error: message });
  }

  await logAdminAction({
    actorId: user.id,
    action: "clinic.delete",
    targetType: "clinic",
    targetId: parsed.data.clinicId,
  });

  revalidatePath("/admin/invites");
  invitesRedirect({ success: "Clinic deleted permanently" });
}
