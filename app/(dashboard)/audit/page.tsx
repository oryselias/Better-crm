import { Activity } from "lucide-react";
import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const ACTION_STYLES: Record<string, string> = {
  INSERT: "bg-green-500/10 text-green-400 border-green-500/20",
  UPDATE: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
};

const TABLE_LABELS: Record<string, string> = {
  patients: "Patient",
  appointments: "Appointment",
  lab_reports: "Lab Report",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; action?: string; date?: string }>;
}) {
  const { table, action, date } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("audit_events")
    .select("id, action, table_name, row_id, payload, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (table) query = query.eq("table_name", table);
  if (action) query = query.eq("action", action);
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.gte("created_at", startOfDay.toISOString()).lte("created_at", endOfDay.toISOString());
  }

  const { data: events } = await query;

  const tables = ["patients", "appointments", "lab_reports"];
  const actions = ["INSERT", "UPDATE", "DELETE"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-on-surface">
            Audit Log
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Append-only record of every mutation in the clinic.
          </p>
        </div>

        {/* Table filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-1">
            <Link
              href="/audit"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                !table ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              All
            </Link>
            {tables.map((t) => (
              <Link
                key={t}
                href={`/audit?table=${t}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  table === t ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {TABLE_LABELS[t] ?? t}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-1">
            <Link
              href={table ? `/audit?table=${table}` : "/audit"}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                !action ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              All
            </Link>
            {actions.map((a) => (
              <Link
                key={a}
                href={`/audit?${table ? `table=${table}&` : ""}action=${a}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  action === a ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {a}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="surface overflow-hidden rounded-[2rem] border border-outline-variant/30">
        {events && events.length > 0 ? (
          <ul className="divide-y divide-outline-variant/30">
            {events.map((event) => {
              const actor = (
                Array.isArray(event.profiles) ? event.profiles[0] : event.profiles
              ) as { full_name: string } | null;

              const payload = event.payload as Record<string, unknown>;
              const label =
                (payload?.full_name as string) ??
                (payload?.source_file_name as string) ??
                (payload?.scheduled_at as string)?.split("T")[0] ??
                event.row_id?.slice(0, 8);

              return (
                <li key={event.id} className="flex items-start gap-4 px-6 py-4 hover:bg-surface-container/50 transition-colors">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container border border-outline-variant/30">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${
                          ACTION_STYLES[event.action] ??
                          "bg-surface-container text-on-surface-variant border-outline-variant/30"
                        }`}
                      >
                        {event.action}
                      </span>
                      <span className="text-sm font-medium text-on-surface">
                        {TABLE_LABELS[event.table_name] ?? event.table_name}
                      </span>
                      {label && (
                        <span className="text-sm text-on-surface-variant truncate max-w-[200px]">
                          — {label}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {actor?.full_name ?? "System"} &bull;{" "}
                      {new Date(event.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-sm text-on-surface-variant">
            No audit events{table ? ` for ${TABLE_LABELS[table] ?? table}` : ""} yet.
            Events are recorded automatically on every patient, appointment, and report mutation.
          </div>
        )}
      </section>
    </div>
  );
}
