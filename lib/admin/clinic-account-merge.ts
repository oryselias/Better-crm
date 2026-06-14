import type { ClinicLifecycleStatus } from "@/lib/admin/clinic-accounts";

export type ClinicRow = {
  id: string;
  name: string | null;
  status: string;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  clinic_id: string;
  role: string;
};

export type UsedInviteRow = {
  id: string;
  email: string;
  clinic_id: string | null;
  clinic_name: string | null;
  role: string;
  used_at: string | null;
  used_by: string | null;
};

export type ActiveClinicAccount = {
  inviteId: string | null;
  email: string;
  clinicId: string;
  clinicName: string;
  role: string;
  status: ClinicLifecycleStatus;
  usedAt: string;
  isOrphanInvite: boolean;
};

const ROLE_RANK: Record<string, number> = {
  admin: 0,
  lab_staff: 1,
  clinician: 2,
};

export function pickPrimaryProfile(profiles: ProfileRow[]): ProfileRow | null {
  if (profiles.length === 0) return null;
  return [...profiles].sort((a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9))[0];
}

export function mergeClinicAccounts(input: {
  clinics: ClinicRow[];
  profiles: ProfileRow[];
  invites: UsedInviteRow[];
  emailsByUserId: Map<string, string>;
}): ActiveClinicAccount[] {
  const profilesByClinic = new Map<string, ProfileRow[]>();
  for (const profile of input.profiles) {
    const list = profilesByClinic.get(profile.clinic_id) ?? [];
    list.push(profile);
    profilesByClinic.set(profile.clinic_id, list);
  }

  const inviteByClinic = new Map<string, UsedInviteRow>();
  for (const invite of input.invites) {
    if (!invite.used_at) continue;
    const clinicId = invite.clinic_id;
    if (!clinicId || inviteByClinic.has(clinicId)) continue;
    inviteByClinic.set(clinicId, invite);
  }

  return input.clinics.map((clinic) => {
    const clinicProfiles = profilesByClinic.get(clinic.id) ?? [];
    const primary = pickPrimaryProfile(clinicProfiles);
    const invite = inviteByClinic.get(clinic.id) ?? null;

    const email =
      invite?.email ??
      (primary ? input.emailsByUserId.get(primary.id) : undefined) ??
      "—";

    const role = invite?.role ?? primary?.role ?? "admin";
    const usedAt = invite?.used_at ?? clinic.created_at;

    const hasProfiles = clinicProfiles.length > 0;
    const isOrphanInvite = Boolean(invite?.used_at && !hasProfiles);

    return {
      inviteId: invite?.id ?? null,
      email,
      clinicId: clinic.id,
      clinicName: clinic.name ?? invite?.clinic_name ?? "Unnamed clinic",
      role,
      status: (clinic.status ?? "active") as ClinicLifecycleStatus,
      usedAt,
      isOrphanInvite,
    };
  });
}

export function isOrphanUsedInvite(invite: UsedInviteRow, clinicProfileCount: number): boolean {
  return Boolean(invite.used_at && clinicProfileCount === 0);
}
