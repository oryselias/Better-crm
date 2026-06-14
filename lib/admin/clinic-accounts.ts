import {
  mergeClinicAccounts,
  type ActiveClinicAccount,
  type UsedInviteRow,
} from "@/lib/admin/clinic-account-merge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type { ActiveClinicAccount } from "@/lib/admin/clinic-account-merge";
export type ClinicLifecycleStatus = "active" | "trial" | "suspended";

export async function emailHasAuthAccount(email: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("auth_email_exists", {
    p_email: email.trim().toLowerCase(),
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function listActiveClinicAccounts(): Promise<ActiveClinicAccount[]> {
  const admin = createSupabaseAdminClient();

  const [
    { data: clinics, error: clinicsError },
    { data: profiles, error: profilesError },
    { data: invites, error: invitesError },
  ] = await Promise.all([
    admin.from("clinics").select("id, name, status, created_at").order("created_at", { ascending: false }),
    admin.from("profiles").select("id, clinic_id, role"),
    admin
      .from("invites")
      .select("id, email, clinic_name, clinic_id, role, used_at, used_by")
      .not("used_at", "is", null),
  ]);

  if (clinicsError) throw new Error(clinicsError.message);
  if (profilesError) throw new Error(profilesError.message);
  if (invitesError) throw new Error(invitesError.message);

  const profileRows = profiles ?? [];
  const userIds = [...new Set(profileRows.map((row) => row.id))];
  const emailsByUserId = new Map<string, string>();

  await Promise.all(
    userIds.map(async (userId) => {
      const { data: authUser, error } = await admin.auth.admin.getUserById(userId);
      if (error) return;
      const email = authUser.user.email?.trim().toLowerCase();
      if (email) emailsByUserId.set(userId, email);
    }),
  );

  return mergeClinicAccounts({
    clinics: clinics ?? [],
    profiles: profileRows,
    invites: (invites ?? []) as UsedInviteRow[],
    emailsByUserId,
  });
}

export async function setClinicLifecycleStatus(
  clinicId: string,
  status: Extract<ClinicLifecycleStatus, "active" | "suspended">,
) {
  const admin = createSupabaseAdminClient();
  const { data: clinic, error: lookupError } = await admin
    .from("clinics")
    .select("id, status")
    .eq("id", clinicId)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);
  if (!clinic) throw new Error("Clinic not found.");

  const { error } = await admin.from("clinics").update({ status }).eq("id", clinicId);
  if (error) throw new Error(error.message);
}

async function deleteClinicStorageArtifacts(clinicId: string) {
  const admin = createSupabaseAdminClient();
  const { data: reports, error } = await admin
    .from("lab_reports")
    .select("id")
    .eq("clinic_id", clinicId);

  if (error) throw new Error(error.message);
  if (!reports?.length) return;

  const paths = reports.map((report) => `generated/${report.id}.pdf`);
  const { error: storageError } = await admin.storage.from("lab-reports").remove(paths);

  // Best-effort: missing bucket/files should not block DB purge.
  if (storageError && !storageError.message.toLowerCase().includes("not found")) {
    throw new Error(storageError.message);
  }
}

export async function deleteClinicAccountPermanently(clinicId: string) {
  const admin = createSupabaseAdminClient();

  const { data: clinic, error: clinicLookupError } = await admin
    .from("clinics")
    .select("id")
    .eq("id", clinicId)
    .maybeSingle();

  if (clinicLookupError) throw new Error(clinicLookupError.message);
  if (!clinic) throw new Error("Clinic not found.");

  // Suspend first so no new logins or RLS writes occur during teardown.
  const { error: suspendError } = await admin
    .from("clinics")
    .update({ status: "suspended" })
    .eq("id", clinicId);

  if (suspendError) throw new Error(suspendError.message);

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("clinic_id", clinicId);

  if (profileError) throw new Error(profileError.message);

  const userIds = (profiles ?? []).map((row) => row.id);
  const ownerEmails = new Set<string>();

  for (const userId of userIds) {
    const { data: authUser, error: authLookupError } = await admin.auth.admin.getUserById(userId);
    if (authLookupError) throw new Error(authLookupError.message);
    const email = authUser.user.email?.trim().toLowerCase();
    if (email) ownerEmails.add(email);
  }

  try {
    await deleteClinicStorageArtifacts(clinicId);

    if (ownerEmails.size > 0) {
      const { error: inviteEmailError } = await admin
        .from("invites")
        .delete()
        .in("email", Array.from(ownerEmails));
      if (inviteEmailError) throw new Error(inviteEmailError.message);
    }

    if (userIds.length > 0) {
      const { error: inviteUsedByError } = await admin.from("invites").delete().in("used_by", userIds);
      if (inviteUsedByError) throw new Error(inviteUsedByError.message);

      for (const userId of userIds) {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw new Error(error.message);
      }
    }

    const { error: purgeError } = await admin.rpc("purge_clinic_cascade", { p_clinic_id: clinicId });
    if (purgeError) throw new Error(purgeError.message);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    throw new Error(
      `${message} Clinic was suspended and may be in a partial state — retry Delete from admin.`,
    );
  }
}

export async function resetOrphanInvite(inviteId: string) {
  const admin = createSupabaseAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("id, used_at, used_by, clinic_id")
    .eq("id", inviteId)
    .maybeSingle();

  if (inviteError) throw new Error(inviteError.message);
  if (!invite?.used_at) throw new Error("Invite is not marked as used.");

  let clinicId = invite.clinic_id as string | null;
  if (!clinicId && invite.used_by) {
    const { data: profile } = await admin
      .from("profiles")
      .select("clinic_id")
      .eq("id", invite.used_by)
      .maybeSingle();
    clinicId = profile?.clinic_id ?? null;
  }

  if (clinicId) {
    const { count, error: countError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId);

    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) {
      throw new Error("Invite is linked to an active clinic account and cannot be reset.");
    }
  }

  const { error: resetError } = await admin
    .from("invites")
    .update({ used_at: null, used_by: null })
    .eq("id", inviteId);

  if (resetError) throw new Error(resetError.message);
}

export async function getOrphanUsedInviteIds(): Promise<Set<string>> {
  const admin = createSupabaseAdminClient();
  const [{ data: usedInvites, error }, { data: profiles, error: profilesError }] = await Promise.all([
    admin
      .from("invites")
      .select("id, used_at, used_by, clinic_id")
      .not("used_at", "is", null),
    admin.from("profiles").select("clinic_id, id"),
  ]);

  if (error) throw new Error(error.message);
  if (profilesError) throw new Error(profilesError.message);

  const countByClinic = new Map<string, number>();
  const clinicByUser = new Map<string, string>();
  for (const profile of profiles ?? []) {
    countByClinic.set(profile.clinic_id, (countByClinic.get(profile.clinic_id) ?? 0) + 1);
    clinicByUser.set(profile.id, profile.clinic_id);
  }

  const orphanIds = new Set<string>();

  for (const invite of usedInvites ?? []) {
    let clinicId = invite.clinic_id as string | null;
    if (!clinicId && invite.used_by) {
      clinicId = clinicByUser.get(invite.used_by) ?? null;
    }

    if (!clinicId || (countByClinic.get(clinicId) ?? 0) === 0) {
      orphanIds.add(invite.id);
    }
  }

  return orphanIds;
}
