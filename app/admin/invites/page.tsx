import Link from "next/link";
import { headers } from "next/headers";

import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { revokeInviteAction } from "./actions";
import { CopyButton } from "./copy-button";
import { InviteForm } from "./invite-form";

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
  searchParams: Promise<{ error?: string; success?: string; status?: string }>;
}) {
  await requireSuperAdmin();
  const { error, success, status: statusFilter } = await searchParams;
  const baseUrl = await getBaseUrl();

  const admin = createSupabaseAdminClient();

  const [{ data: invites }, { data: clinics }] = await Promise.all([
    admin
      .from("invites")
      .select("id, email, clinic_name, clinic_id, role, token, expires_at, used_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    admin.from("clinics").select("id, name, status").order("name", { ascending: true }),
  ]);

  const clinicMap = new Map<string, string>();
  for (const c of clinics ?? []) {
    clinicMap.set(c.id, c.name);
  }

  const allRows = (invites ?? []) as Invite[];

  // Filter invites
  const filteredRows = allRows.filter((inv) => {
    const expired = new Date(inv.expires_at) < new Date();
    const currentStatus = inv.used_at ? "used" : expired ? "expired" : "active";
    if (statusFilter && statusFilter !== "all" && currentStatus !== statusFilter) return false;
    return true;
  });

  const activeCount = allRows.filter((inv) => !inv.used_at && new Date(inv.expires_at) >= new Date()).length;
  const usedCount = allRows.filter((inv) => !!inv.used_at).length;
  const expiredCount = allRows.filter((inv) => !inv.used_at && new Date(inv.expires_at) < new Date()).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-on-surface">Platform Invites</h1>
        <p className="text-sm text-on-surface-variant">
          Create, track, and manage invitation links for new clinics or existing clinic staff members.
        </p>
      </div>

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

      {/* Interactive Invite Generator Form */}
      <InviteForm clinics={clinics ?? []} />

      {/* Invites List Section */}
      <section className="rounded-3xl border border-outline-variant/30 bg-surface shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/30 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-on-surface">Invitation Links</h2>
            <p className="text-xs text-on-surface-variant">{allRows.length} total invitations generated</p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 rounded-2xl bg-surface-container-low p-1 border border-outline-variant/30 text-xs font-semibold">
            <Link
              href="/admin/invites"
              className={`rounded-xl px-3 py-1.5 transition-all ${
                !statusFilter || statusFilter === "all"
                  ? "bg-surface text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              All ({allRows.length})
            </Link>
            <Link
              href="/admin/invites?status=active"
              className={`rounded-xl px-3 py-1.5 transition-all ${
                statusFilter === "active"
                  ? "bg-surface text-emerald-500 shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Active ({activeCount})
            </Link>
            <Link
              href="/admin/invites?status=used"
              className={`rounded-xl px-3 py-1.5 transition-all ${
                statusFilter === "used"
                  ? "bg-surface text-sky-500 shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Used ({usedCount})
            </Link>
            <Link
              href="/admin/invites?status=expired"
              className={`rounded-xl px-3 py-1.5 transition-all ${
                statusFilter === "expired"
                  ? "bg-surface text-red-400 shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Expired ({expiredCount})
            </Link>
          </div>
        </div>

        <div className="divide-y divide-outline-variant/20">
          {filteredRows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-on-surface-variant">
              No invitations matching current filter.
            </div>
          ) : (
            filteredRows.map((inv) => {
              const expired = new Date(inv.expires_at) < new Date();
              const status = inv.used_at ? "used" : expired ? "expired" : "active";
              const link = `${baseUrl}/signup?token=${inv.token}`;
              const targetClinicName = inv.clinic_name ?? (inv.clinic_id ? clinicMap.get(inv.clinic_id) ?? "Existing Clinic" : "Existing Clinic");

              return (
                <div
                  key={inv.id}
                  className="grid gap-3 px-6 py-4 md:grid-cols-[1.5fr_1.5fr_0.6fr_1.6fr_auto] md:items-center hover:bg-surface-container/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">{inv.email}</p>
                    <p className="text-xs text-on-surface-variant">
                      Created {new Date(inv.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium text-on-surface">{targetClinicName}</span>
                    <span className="ml-2 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant border border-outline-variant/30">
                      {inv.role}
                    </span>
                    {inv.clinic_id && (
                      <span className="ml-1 text-[11px] text-on-surface-variant/70">(Staff Add)</span>
                    )}
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        status === "active"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : status === "used"
                            ? "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          status === "active"
                            ? "bg-emerald-500"
                            : status === "used"
                              ? "bg-sky-500"
                              : "bg-red-500"
                        }`}
                      />
                      {status}
                    </span>
                  </div>

                  <div className="min-w-0 flex items-center gap-2">
                    {status === "active" ? (
                      <>
                        <code className="block truncate rounded-xl bg-surface-container-low px-2.5 py-1.5 font-mono text-xs text-on-surface-variant flex-1 border border-outline-variant/20">
                          {link}
                        </code>
                        <CopyButton text={link} />
                      </>
                    ) : (
                      <span className="text-xs text-on-surface-variant">
                        {status === "used"
                          ? `Used ${new Date(inv.used_at!).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
                          : "Expired"}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end">
                    {status === "active" ? (
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button
                          type="submit"
                          className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/15 transition-colors"
                        >
                          Revoke
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
    </div>
  );
}
