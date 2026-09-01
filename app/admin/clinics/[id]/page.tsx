import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { StatusSwitcher } from "./status-switcher";

export default async function AdminClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id: clinicId } = await params;

  const admin = createSupabaseAdminClient();

  // Fetch clinic, profiles, reports, patients, and auth users in parallel
  const [
    { data: clinic, error: clinicError },
    { data: profiles },
    { data: reports },
    { data: patients },
    { data: authUsersResponse },
  ] = await Promise.all([
    admin.from("clinics").select("*").eq("id", clinicId).single(),
    admin.from("profiles").select("id, clinic_id, role, created_at").eq("clinic_id", clinicId),
    admin
      .from("lab_reports")
      .select("id, clinic_id, report_no, status, tests, notes, referred_by, created_by, created_at, completed_at, patient:patients(id, full_name, phone)")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false }),
    admin.from("patients").select("id, full_name, phone, created_at").eq("clinic_id", clinicId),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (clinicError || !clinic) {
    notFound();
  }

  const clinicReports = reports ?? [];
  const clinicProfiles = profiles ?? [];
  const clinicPatients = patients ?? [];
  const authUsers = authUsersResponse?.users ?? [];

  // Create lookup map for user email
  const userEmailMap = new Map<string, string>();
  for (const u of authUsers) {
    if (u.id && u.email) {
      userEmailMap.set(u.id, u.email);
    }
  }

  // Clinic KPI metrics
  const totalReportsCount = clinicReports.length;
  const completedReportsCount = clinicReports.filter((r) => r.status === "completed").length;
  const pendingReportsCount = clinicReports.filter((r) => r.status === "pending").length;
  const totalPatientsCount = clinicPatients.length;
  const totalStaffCount = clinicProfiles.length;

  // Aggregate stats per staff member (user-wise)
  const staffStats = clinicProfiles.map((p) => {
    const userReports = clinicReports.filter((r) => r.created_by === p.id);
    const userCompleted = userReports.filter((r) => r.status === "completed").length;
    const userPending = userReports.filter((r) => r.status === "pending").length;
    const lastReport = userReports.length > 0 ? userReports[0].created_at : null;

    return {
      userId: p.id,
      email: userEmailMap.get(p.id) || "Email not available",
      role: p.role,
      joinedAt: p.created_at,
      totalReports: userReports.length,
      completedReports: userCompleted,
      pendingReports: userPending,
      lastReportAt: lastReport,
    };
  });

  // Sort staff by total reports authored descending
  staffStats.sort((a, b) => b.totalReports - a.totalReports);

  // Unattributed reports (reports where created_by is null or not in profiles)
  const knownUserIds = new Set(clinicProfiles.map((p) => p.id));
  const unattributedReports = clinicReports.filter((r) => !r.created_by || !knownUserIds.has(r.created_by));

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
        <Link href="/admin/clinics" className="hover:text-on-surface transition-colors">
          &larr; Back to Clinics
        </Link>
        <span>/</span>
        <span className="font-semibold text-on-surface">{clinic.name}</span>
      </div>

      {/* Clinic Header Card */}
      <div className="surface rounded-3xl border border-outline-variant/30 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-on-surface">{clinic.name}</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  clinic.status === "active"
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : clinic.status === "trial"
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    clinic.status === "active"
                      ? "bg-emerald-500"
                      : clinic.status === "trial"
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                />
                {clinic.status}
              </span>
            </div>
            {clinic.tagline && <p className="text-sm text-on-surface-variant">{clinic.tagline}</p>}
            <div className="flex flex-wrap gap-4 text-xs text-on-surface-variant">
              {clinic.phone && <span>📞 {clinic.phone}</span>}
              {clinic.address && <span>📍 {clinic.address}</span>}
              <span>📅 Registered: {new Date(clinic.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
              <span className="font-mono">ID: {clinic.id}</span>
            </div>
          </div>

          {/* Status Switcher & Suspension Control */}
          <div className="flex flex-col items-start lg:items-end gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Account Status</span>
            <StatusSwitcher clinicId={clinic.id} currentStatus={clinic.status} />
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface rounded-3xl border border-outline-variant/30 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Reports</p>
          <p className="mt-2 text-3xl font-bold text-on-surface">{totalReportsCount}</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            {completedReportsCount} completed · {pendingReportsCount} pending
          </p>
        </div>

        <div className="surface rounded-3xl border border-outline-variant/30 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Completion Rate</p>
          <p className="mt-2 text-3xl font-bold text-emerald-500">
            {totalReportsCount > 0 ? `${Math.round((completedReportsCount / totalReportsCount) * 100)}%` : "N/A"}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">{completedReportsCount} of {totalReportsCount} completed</p>
        </div>

        <div className="surface rounded-3xl border border-outline-variant/30 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Registered Patients</p>
          <p className="mt-2 text-3xl font-bold text-on-surface">{totalPatientsCount}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Total unique patient profiles</p>
        </div>

        <div className="surface rounded-3xl border border-outline-variant/30 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Staff Members</p>
          <p className="mt-2 text-3xl font-bold text-on-surface">{totalStaffCount}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Doctors, technicians & admins</p>
        </div>
      </div>

      {/* Staff & User-wise Report Volume Tracking Table */}
      <section className="surface rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-on-surface">Staff Members & Report Contribution</h2>
            <p className="text-xs text-on-surface-variant">
              Track how many lab reports each individual user/staff member is generating
            </p>
          </div>
          <span className="text-xs text-on-surface-variant">{staffStats.length} staff registered</span>
        </div>

        {staffStats.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-on-surface-variant">
            No staff profiles registered under this clinic yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant/30 bg-surface-container-low text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Staff Member</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5 text-center">Reports Created</th>
                  <th className="px-6 py-3.5 text-center">Completed</th>
                  <th className="px-6 py-3.5 text-center">Pending</th>
                  <th className="px-6 py-3.5 text-center">% Share</th>
                  <th className="px-6 py-3.5">Last Report Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {staffStats.map((st) => {
                  const sharePct = totalReportsCount > 0 ? Math.round((st.totalReports / totalReportsCount) * 100) : 0;

                  return (
                    <tr key={st.userId} className="transition-colors hover:bg-surface-container/40">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-on-surface">{st.email}</p>
                          <p className="font-mono text-xs text-on-surface-variant truncate max-w-[200px]">{st.userId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-surface-container px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-on-surface">
                          {st.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-on-surface">
                        {st.totalReports}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-emerald-500">
                        {st.completedReports}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-amber-500">
                        {st.pendingReports}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-surface-container-high overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${sharePct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-on-surface">{sharePct}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-on-surface-variant">
                        {st.lastReportAt
                          ? new Date(st.lastReportAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Never"}
                      </td>
                    </tr>
                  );
                })}

                {unattributedReports.length > 0 && (
                  <tr className="bg-surface-container-low/30 text-on-surface-variant">
                    <td className="px-6 py-4 font-medium italic">
                      Legacy / Unassigned Authors
                    </td>
                    <td className="px-6 py-4 text-xs">—</td>
                    <td className="px-6 py-4 text-center font-semibold">{unattributedReports.length}</td>
                    <td className="px-6 py-4 text-center">
                      {unattributedReports.filter((r) => r.status === "completed").length}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {unattributedReports.filter((r) => r.status === "pending").length}
                    </td>
                    <td className="px-6 py-4 text-center text-xs">
                      {totalReportsCount > 0 ? `${Math.round((unattributedReports.length / totalReportsCount) * 100)}%` : "0%"}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {unattributedReports[0]?.created_at
                        ? new Date(unattributedReports[0].created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Reports Table */}
      <section className="surface rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-on-surface">Recent Reports in this Clinic</h2>
            <p className="text-xs text-on-surface-variant">Latest reports generated by this clinic's team</p>
          </div>
          <p className="text-xs text-on-surface-variant">Showing up to {Math.min(clinicReports.length, 20)} reports</p>
        </div>

        {clinicReports.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-on-surface-variant">
            No reports created yet for this clinic.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant/30 bg-surface-container-low text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Report No.</th>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-6 py-3.5">Author</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {clinicReports.slice(0, 20).map((r) => {
                  const patientName = Array.isArray(r.patient)
                    ? r.patient[0]?.full_name
                    : (r.patient as { full_name?: string } | null)?.full_name ?? "Unknown Patient";

                  const authorEmail = r.created_by ? userEmailMap.get(r.created_by) || "Staff" : "System / Unknown";

                  return (
                    <tr key={r.id} className="transition-colors hover:bg-surface-container/40">
                      <td className="px-6 py-4 font-mono font-medium text-on-surface">
                        #{r.report_no || r.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-on-surface">{patientName}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-on-surface-variant">
                        {authorEmail}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${
                            r.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-on-surface-variant">
                        {new Date(r.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a
                          href={`/api/reports/${r.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/30 px-3 py-1 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
                        >
                          View PDF
                        </a>
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
