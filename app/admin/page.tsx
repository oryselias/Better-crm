import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminDashboardPage() {
  await requireSuperAdmin();

  const admin = createSupabaseAdminClient();

  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  // Fetch aggregate data in parallel using admin client
  const [
    { data: allClinics },
    { data: allReports },
    { data: allPatients },
    { data: allProfiles },
    { data: todayReports },
    { data: monthReports },
  ] = await Promise.all([
    admin.from("clinics").select("id, name, status, phone, created_at").order("created_at", { ascending: false }),
    admin.from("lab_reports").select("id, clinic_id, created_by, status, created_at").order("created_at", { ascending: false }),
    admin.from("patients").select("id, clinic_id"),
    admin.from("profiles").select("id, clinic_id, role"),
    admin.from("lab_reports").select("id").gte("created_at", startOfToday),
    admin.from("lab_reports").select("id").gte("created_at", startOfMonth),
  ]);

  const clinics = allClinics ?? [];
  const reports = allReports ?? [];
  const patients = allPatients ?? [];
  const profiles = allProfiles ?? [];

  // Platform Metrics
  const totalReportsCount = reports.length;
  const todayReportsCount = todayReports?.length ?? 0;
  const monthReportsCount = monthReports?.length ?? 0;
  const totalClinicsCount = clinics.length;
  const activeClinicsCount = clinics.filter((c) => c.status === "active").length;
  const trialClinicsCount = clinics.filter((c) => c.status === "trial").length;
  const suspendedClinicsCount = clinics.filter((c) => c.status === "suspended").length;
  const totalPatientsCount = patients.length;
  const totalStaffCount = profiles.length;

  // Build Clinic-wise aggregations
  const clinicMetricsMap = new Map<
    string,
    {
      reportCount: number;
      completedCount: number;
      pendingCount: number;
      patientCount: number;
      staffCount: number;
      lastReportDate: string | null;
    }
  >();

  // Initialize map for each clinic
  for (const c of clinics) {
    clinicMetricsMap.set(c.id, {
      reportCount: 0,
      completedCount: 0,
      pendingCount: 0,
      patientCount: 0,
      staffCount: 0,
      lastReportDate: null,
    });
  }

  // Aggregate reports
  for (const r of reports) {
    const entry = clinicMetricsMap.get(r.clinic_id);
    if (entry) {
      entry.reportCount += 1;
      if (r.status === "completed") entry.completedCount += 1;
      if (r.status === "pending") entry.pendingCount += 1;
      if (!entry.lastReportDate || new Date(r.created_at) > new Date(entry.lastReportDate)) {
        entry.lastReportDate = r.created_at;
      }
    }
  }

  // Aggregate patients
  for (const p of patients) {
    const entry = clinicMetricsMap.get(p.clinic_id);
    if (entry) {
      entry.patientCount += 1;
    }
  }

  // Aggregate staff
  for (const pr of profiles) {
    const entry = clinicMetricsMap.get(pr.clinic_id);
    if (entry) {
      entry.staffCount += 1;
    }
  }

  // Calculate top clinics by report count
  const sortedClinics = [...clinics].sort((a, b) => {
    const countA = clinicMetricsMap.get(a.id)?.reportCount ?? 0;
    const countB = clinicMetricsMap.get(b.id)?.reportCount ?? 0;
    return countB - countA;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-on-surface">Platform Overview</h1>
          <p className="text-sm text-on-surface-variant">
            Cross-clinic analytics, report volume tracking, and account management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/invites"
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite Clinic / Staff
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Reports */}
        <div className="surface rounded-3xl border border-outline-variant/30 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Reports</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-on-surface">{totalReportsCount.toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="font-semibold text-emerald-500">+{todayReportsCount} today</span>
            <span>•</span>
            <span>{monthReportsCount} this month</span>
          </div>
        </div>

        {/* Clinics Breakdown */}
        <div className="surface rounded-3xl border border-outline-variant/30 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Clinics</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-on-surface">{totalClinicsCount}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="font-medium text-emerald-500">{activeClinicsCount} active</span>
            {trialClinicsCount > 0 && <span className="text-amber-500">• {trialClinicsCount} trial</span>}
            {suspendedClinicsCount > 0 && <span className="text-red-400">• {suspendedClinicsCount} suspended</span>}
          </div>
        </div>

        {/* Total Patients */}
        <div className="surface rounded-3xl border border-outline-variant/30 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Patients</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-on-surface">{totalPatientsCount.toLocaleString()}</p>
          <p className="mt-2 text-xs text-on-surface-variant">Across all registered clinics</p>
        </div>

        {/* Platform Staff */}
        <div className="surface rounded-3xl border border-outline-variant/30 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Active Staff</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-on-surface">{totalStaffCount.toLocaleString()}</p>
          <p className="mt-2 text-xs text-on-surface-variant">Doctors, lab staff & clinic admins</p>
        </div>
      </div>

      {/* Clinic Breakdown Table */}
      <section className="surface rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-on-surface">Clinic-Wise Report Volume</h2>
            <p className="text-xs text-on-surface-variant">Track usage, patient loads, and staff engagement per clinic</p>
          </div>
          <Link
            href="/admin/clinics"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View All Clinics ({clinics.length}) &rarr;
          </Link>
        </div>

        {sortedClinics.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-on-surface-variant">
            No clinics found. Create an invite to onboard a clinic.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant/30 bg-surface-container-low text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Clinic</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-center">Total Reports</th>
                  <th className="px-6 py-3.5 text-center">Patients</th>
                  <th className="px-6 py-3.5 text-center">Staff</th>
                  <th className="px-6 py-3.5">Last Activity</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {sortedClinics.map((c) => {
                  const m = clinicMetricsMap.get(c.id);
                  const reportCount = m?.reportCount ?? 0;
                  const patientCount = m?.patientCount ?? 0;
                  const staffCount = m?.staffCount ?? 0;
                  const lastActive = m?.lastReportDate
                    ? new Date(m.lastReportDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "No reports yet";

                  return (
                    <tr key={c.id} className="transition-colors hover:bg-surface-container/40">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-on-surface">{c.name}</p>
                          <p className="text-xs font-mono text-on-surface-variant truncate max-w-[200px]">{c.id}</p>
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
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-on-surface">{reportCount}</span>
                        {m && reportCount > 0 && (
                          <div className="text-[11px] text-on-surface-variant">
                            {m.completedCount} done · {m.pendingCount} pend
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-on-surface">
                        {patientCount}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-on-surface">
                        {staffCount}
                      </td>
                      <td className="px-6 py-4 text-xs text-on-surface-variant">
                        {lastActive}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/clinics/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
                        >
                          View Staff &rarr;
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
