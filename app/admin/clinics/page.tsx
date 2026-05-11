import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminClinicsPage() {
  await requireSuperAdmin();

  const admin = createSupabaseAdminClient();
  const { data: clinics } = await admin
    .from("clinics")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Clinics</h1>
        <p className="text-sm text-on-surface-variant">Read-only list for super admins.</p>
      </header>

      <div className="divide-y divide-outline-variant/20 rounded-3xl border border-outline-variant/30 bg-surface">
        {(clinics ?? []).length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-on-surface-variant">No clinics yet.</div>
        ) : (
          (clinics ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-on-surface-variant">{c.id}</p>
              </div>
              <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                {c.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
