import { Clock } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { NewAppointmentDialog } from "@/components/appointments/new-appointment-dialog";
import { StatusFilter } from "@/components/appointments/status-filter";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateAppointmentStatus } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary border-primary/20",
  checked_in: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const NEXT_STATUS: Record<string, { label: string; value: string }> = {
  scheduled: { label: "Check In", value: "checked_in" },
  checked_in: { label: "Complete", value: "completed" },
};

const CANCELLABLE = new Set(["scheduled", "checked_in"]);

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("appointments")
    .select("id, scheduled_at, status, notes, patients(id, full_name)")
    .order("scheduled_at", { ascending: true });

  if (status) query = query.eq("status", status);

  const [{ data: appointments }, { data: patients }] = await Promise.all([
    query,
    supabase.from("patients").select("id, full_name").order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-on-surface">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Next actions for the front desk and care team.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense>
            <StatusFilter />
          </Suspense>
          <NewAppointmentDialog patients={patients ?? []} />
        </div>
      </div>

      <section className="surface overflow-hidden rounded-[2rem] border border-outline-variant/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant">
              <tr>
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">Date &amp; Time</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Notes</th>
                <th className="px-6 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {appointments && appointments.length > 0 ? (
                appointments.map((apt) => {
                  const patient = (Array.isArray(apt.patients) ? apt.patients[0] : apt.patients) as { id: string; full_name: string } | null;
                  const next = NEXT_STATUS[apt.status];
                  return (
                    <tr key={apt.id} className="transition-colors hover:bg-surface-container/50">
                      <td className="px-6 py-4">
                        {patient ? (
                          <Link
                            href={`/patients/${patient.id}`}
                            className="font-medium text-on-surface hover:text-primary transition-colors"
                          >
                            {patient.full_name}
                          </Link>
                        ) : (
                          <span className="text-on-surface-variant">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {new Date(apt.scheduled_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium capitalize ${
                            STATUS_STYLES[apt.status] ??
                            "bg-surface-container text-on-surface-variant border-outline-variant/30"
                          }`}
                        >
                          {apt.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="max-w-[180px] truncate px-6 py-4 text-on-surface-variant">
                        {apt.notes || "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {next && (
                            <form action={updateAppointmentStatus.bind(null, apt.id, next.value)}>
                              <button
                                type="submit"
                                className="rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors"
                              >
                                {next.label}
                              </button>
                            </form>
                          )}
                          {CANCELLABLE.has(apt.status) && (
                            <form action={updateAppointmentStatus.bind(null, apt.id, "cancelled")}>
                              <button
                                type="submit"
                                className="rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:border-red-500/40 hover:text-red-400 transition-colors"
                              >
                                Cancel
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                    No appointments{status ? ` with status "${status.replace("_", " ")}"` : ""}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
