import { BetterCrmLogo } from "@/components/brand/better-crm-logo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { signupWithInviteAction } from "./actions";

type InviteStatus =
  | { ok: true; email: string; clinicName: string; role: string; token: string }
  | { ok: false; reason: string };

async function lookupInvite(token: string | undefined): Promise<InviteStatus> {
  const normalized = token?.trim();
  if (!normalized) return { ok: false, reason: "Missing invite token." };

  const admin = createSupabaseAdminClient();
  const { data: invite, error } = await admin
    .from("invites")
    .select("email, clinic_name, clinic_id, role, expires_at, used_at, token")
    .eq("token", normalized)
    .maybeSingle();

  if (error || !invite) return { ok: false, reason: "Invite not found." };
  if (invite.used_at) return { ok: false, reason: "This invite has already been used." };
  if (new Date(invite.expires_at) < new Date())
    return { ok: false, reason: "This invite has expired." };

  let clinicName = invite.clinic_name;
  if (!clinicName && invite.clinic_id) {
    const { data: clinic } = await admin
      .from("clinics")
      .select("name")
      .eq("id", invite.clinic_id)
      .maybeSingle();
    clinicName = clinic?.name ?? null;
  }

  return {
    ok: true,
    email: invite.email,
    clinicName: clinicName ?? "",
    role: invite.role,
    token: String(invite.token),
  };
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const status = await lookupInvite(token);

  if (error && !token?.trim()) {
    return (
      <main className="min-h-screen bg-surface-container-lowest px-4 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center gap-8">
          <div className="rounded-[2rem] border border-outline-variant/30 bg-surface p-6 md:p-8">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
            <p className="mt-4 text-sm text-on-surface-variant">
              Open the full invite link from your email (it includes <code className="text-xs">?token=</code>
              ). If the problem persists, ask your administrator for a new invite.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-container-lowest px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center gap-8">
        <div className="space-y-4 text-center">
          <BetterCrmLogo size="lg" />
          <div>
            <p className="eyebrow text-primary">Invite signup</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Create your account</h1>
          </div>
        </div>

        <div className="rounded-[2rem] border border-outline-variant/30 bg-surface p-6 md:p-8">
          {!status.ok ? (
            <div className="space-y-3 text-center">
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {status.reason}
              </div>
              <p className="text-sm text-on-surface-variant">
                Ask your administrator for a fresh invite link.
              </p>
            </div>
          ) : (
            <form action={signupWithInviteAction} className="space-y-5">
              <input type="hidden" name="token" value={status.token} />

              <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Email</span>
                  <span className="font-medium">{status.email}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-on-surface-variant">Clinic</span>
                  <span className="font-medium">{status.clinicName}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-on-surface-variant">Role</span>
                  <span className="font-medium uppercase tracking-wide text-xs">{status.role}</span>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Choose a password</span>
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="btn-primary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                Create account &amp; continue
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
