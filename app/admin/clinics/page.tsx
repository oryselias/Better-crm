import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminClinicsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; deleted?: string }>;
}) {
  await requireSuperAdmin();
  const { status: statusFilter, search: searchQuery, deleted: deletedClinicName } = await searchParams;

  const admin = createSupabaseAdminClient();

  const [
    { data: allClinics },
    { data: allReports },
    { data: allPatients },
    { data: allProfiles },
  ] = await Promise.all([
    admin.from("clinics").select("id, name, tagline, address, phone, status, created_at").order("created_at", { ascending: false }),
    admin.from("lab_reports").select("id, clinic_id"),
    admin.from("patients").select("id, clinic_id"),
    admin.from("profiles").select("id, clinic_id"),
  ]);

  const clinics = allClinics ?? [];
  const reports = allReports ?? [];
  const patients = allPatients ?? [];
  const profiles = allProfiles ?? [];

  // Metrics map
  const reportCounts = new Map<string, number>();
  const patientCounts = new Map<string, number>();
  const staffCounts = new Map<string, number>();

  for (const r of reports) {
    reportCounts.set(r.clinic_id, (reportCounts.get(r.clinic_id) ?? 0) + 1);
  }
  for (const p of patients) {
    patientCounts.set(p.clinic_id, (patientCounts.get(p.clinic_id) ?? 0) + 1);
  }
  for (const pr of profiles) {
    staffCounts.set(pr.clinic_id, (staffCounts.get(pr.clinic_id) ?? 0) + 1);
  }

  // Filter clinics
  const filteredClinics = clinics.filter((c) => {
    if (statusFilter && statusFilter !== "all" && c.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchId = c.id?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchPhone) return false;
    }
    return true;
  });

  const totalCount = clinics.length;
  const activeCount = clinics.filter((c) => c.status === "active").length;
  const trialCount = clinics.filter((c) => c.status === "trial").length;
  const suspendedCount = clinics.filter((c) => c.status === "suspended").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-on-surface">Clinics Management</h1>
          <p className="text-sm text-on-surface-variant">
            Manage clinic accounts, monitor active staff members, and toggle suspension.
          </p>
        </div>
        <Link
          href="/admin/invites"
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite New Clinic
        </Link>
      </div>

      {deletedClinicName && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-500 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              Clinic <strong className="font-semibold text-on-surface">&ldquo;{deletedClinicName}&rdquo;</strong> and all associated reports, patients, and staff logins have been permanently deleted.
            </span>
          </div>
          <Link href="/admin/clinics" className="text-on-surface-variant hover:text-on-surface underline transition-colors">
            Dismiss
          </Link>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 rounded-2xl bg-surface-container-low p-1 border border-outline-variant/30 text-xs font-medium">
          <Link
            href="/admin/clinics"
            className={`rounded-xl px-3 py-1.5 transition-colors ${
              !statusFilter || statusFilter === "all"
                ? "bg-surface text-on-surface font-semibold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            All ({totalCount})
          </Link>
          <Link
            href="/admin/clinics?status=active"
            className={`rounded-xl px-3 py-1.5 transition-colors ${
              statusFilter === "active"
                ? "bg-surface text-emerald-500 font-semibold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Active ({activeCount})
          </Link>
          <Link
            href="/admin/clinics?status=trial"
            className={`rounded-xl px-3 py-1.5 transition-colors ${
              statusFilter === "trial"
                ? "bg-surface text-amber-500 font-semibold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Trial ({trialCount})
          </Link>
          <Link
            href="/admin/clinics?status=suspended"
            className={`rounded-xl px-3 py-1.5 transition-colors ${
              statusFilter === "suspended"
                ? "bg-surface text-red-400 font-semibold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Suspended ({suspendedCount})
          </Link>
        </div>

        {/* Search form */}
        <form method="get" className="flex items-center gap-2">
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <div className="relative">
            <input
              name="search"
              defaultValue={searchQuery ?? ""}
              placeholder="Search clinic name or ID..."
              className="w-64 rounded-xl border border-outline-variant/35 bg-surface px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary placeholder:text-on-surface-variant/60"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Clinics Table */}
      <section className="surface rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
        {filteredClinics.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-on-surface-variant">
            No clinics found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant/30 bg-surface-container-low text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Clinic Details</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-center">Reports</th>
                  <th className="px-6 py-3.5 text-center">Patients</th>
                  <th className="px-6 py-3.5 text-center">Staff</th>
                  <th className="px-6 py-3.5">Registered</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredClinics.map((c) => {
                  const repCount = reportCounts.get(c.id) ?? 0;
                  const patCount = patientCounts.get(c.id) ?? 0;
                  const stfCount = staffCounts.get(c.id) ?? 0;

                  return (
                    <tr key={c.id} className="transition-colors hover:bg-surface-container/40">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-on-surface">{c.name}</p>
                          {c.tagline && <p className="text-xs text-on-surface-variant">{c.tagline}</p>}
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-on-surface-variant/80">
                            {c.phone && <span>📞 {c.phone}</span>}
                            <span className="font-mono text-on-surface-variant/60">ID: {c.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${
                            c.status === "active"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : c.status === "trial"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              c.status === "active"
                                ? "bg-emerald-500"
                                : c.status === "trial"
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                          />
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-on-surface">
                        {repCount}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-on-surface">
                        {patCount}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-on-surface">
                        {stfCount}
                      </td>
                      <td className="px-6 py-4 text-xs text-on-surface-variant">
                        {new Date(c.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/clinics/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-surface-container border border-outline-variant/30 px-3.5 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
                        >
                          Manage & Staff &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
