import { headers } from "next/headers";

import { listActiveClinicAccounts, getOrphanUsedInviteIds } from "@/lib/admin/clinic-accounts";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ClinicAccountActions } from "@/components/admin/clinic-account-actions";

import { createInviteAction, resetOrphanInviteAction, revokeInviteAction } from "./actions";

type Invite = {
  id: string;
  email: string;
  clinic_name: string | null;
  clinic_id: string | null;
  role: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function InvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireSuperAdmin();
  const { error, success } = await searchParams;
  const baseUrl = await getBaseUrl();

  const admin = createSupabaseAdminClient();
  const { data: invites } = await admin
    .from("invites")
    .select("id, email, clinic_name, clinic_id, role, token, expires_at, used_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (invites ?? []) as Invite[];

  let activeAccounts: Awaited<ReturnType<typeof listActiveClinicAccounts>> = [];
  let accountsError: string | null = null;
  let orphanInviteIds = new Set<string>();

  try {
    [activeAccounts, orphanInviteIds] = await Promise.all([
      listActiveClinicAccounts(),
      getOrphanUsedInviteIds(),
    ]);
  } catch (loadError) {
    accountsError =
      loadError instanceof Error ? loadError.message : "Failed to load clinic accounts.";
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Invites</h1>
        <p className="text-sm text-on-surface-variant">
          Create invite links for clinics to join Better CRM. Each invite creates a new clinic on signup.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      ) : null}

      <section className="rounded-3xl border border-outline-variant/30 bg-surface p-6">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">New invite</h2>
        <form action={createInviteAction} className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1.2fr_0.8fr_auto] md:items-end">
          <label className="space-y-1">
            <span className="text-xs font-medium text-on-surface-variant">Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="owner@clinic.com"
              className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-on-surface-variant">Clinic name</span>
            <input
              name="clinicName"
              type="text"
              required
              placeholder="Aether Medical"
              className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-on-surface-variant">Role</span>
            <select
              name="role"
              defaultValue="admin"
              className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="admin">Admin</option>
              <option value="lab_staff">Lab Staff</option>
              <option value="clinician">Clinician</option>
            </select>
          </label>
          <button
            type="submit"
            className="btn-primary inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Create invite
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-outline-variant/30 bg-surface">
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Recent invites</h2>
          <p className="text-xs text-on-surface-variant">{rows.length} total</p>
        </div>
        <div className="divide-y divide-outline-variant/20">
          {rows.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-on-surface-variant">
              No invites yet. Create one above.
            </div>
          ) : (
            rows.map((inv) => {
              const expired = new Date(inv.expires_at) < new Date();
              const status = inv.used_at ? "used" : expired ? "expired" : "active";
              const link = `${baseUrl}/signup?token=${inv.token}`;

              return (
                <div key={inv.id} className="grid gap-3 px-6 py-4 md:grid-cols-[1.5fr_1.2fr_0.6fr_1.5fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-on-surface-variant">{new Date(inv.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-sm">
                    {inv.clinic_name ?? <span className="text-on-surface-variant">(existing clinic)</span>}
                    <span className="ml-2 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                      {inv.role}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        status === "active"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : status === "used"
                            ? "bg-sky-500/10 text-sky-400"
                            : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="min-w-0">
                    {status === "active" ? (
                      <code className="block truncate rounded-lg bg-surface-container-low px-2 py-1 font-mono text-xs">
                        {link}
                      </code>
                    ) : status === "used" ? (
                      <span className="text-xs text-on-surface-variant">
                        {orphanInviteIds.has(inv.id)
                          ? "Signup incomplete — reset to re-use link"
                          : "Account created — manage below"}
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-variant">—</span>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    {status === "active" ? (
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container"
                        >
                          Revoke
                        </button>
                      </form>
                    ) : status === "used" && orphanInviteIds.has(inv.id) ? (
                      <form action={resetOrphanInviteAction}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/10"
                        >
                          Reset invite
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-outline-variant/30 bg-surface">
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em]">Clinic accounts</h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              Clinics that completed signup. Suspend blocks login but keeps data. Delete removes everything permanently.
            </p>
          </div>
          <p className="text-xs text-on-surface-variant">{activeAccounts.length} clinics</p>
        </div>
        {accountsError ? (
          <div className="border-b border-outline-variant/20 px-6 py-4 text-sm text-red-400">
            {accountsError}
          </div>
        ) : null}
        <div className="divide-y divide-outline-variant/20">
          {activeAccounts.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-on-surface-variant">
              {accountsError ? "Clinic accounts could not be loaded." : "No clinic accounts yet."}
            </div>
          ) : (
            activeAccounts.map((account) => (
              <div
                key={account.clinicId}
                className="grid gap-3 px-6 py-4 md:grid-cols-[1.4fr_1.2fr_0.7fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{account.email}</p>
                  <p className="text-xs text-on-surface-variant">
                    Signed up {new Date(account.usedAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-sm">
                  {account.clinicName}
                  <span className="ml-2 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                    {account.role}
                  </span>
                </div>
                <div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      account.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : account.status === "suspended"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-sky-500/10 text-sky-400"
                    }`}
                  >
                    {account.status}
                  </span>
                </div>
                <ClinicAccountActions
                  clinicId={account.clinicId}
                  clinicName={account.clinicName}
                  status={account.status}
                />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
