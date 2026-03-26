import { FileText, ShieldCheck, Stethoscope, Workflow } from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { getDashboardSnapshot } from "@/lib/dashboard";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="space-y-8">
      <section className="surface overflow-hidden rounded-[2rem] border border-[var(--line)] px-6 py-6 md:px-8 md:py-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="eyebrow">Daily Control Room</p>
              <div className="max-w-3xl">
                <h1
                  className="text-3xl leading-tight font-semibold tracking-[-0.05em] text-balance md:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Operate the clinic with clean signals instead of noisy admin.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] md:text-base">
                  The foundation is ready for patient operations, appointment
                  orchestration, and reviewable lab ingestion. The next slices
                  plug deeper workflows into the same clinic-scoped shell.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {snapshot.metrics.map((metric) => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold tracking-[-0.02em]">
                  Foundation status
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  First slice is schema-first, audit-ready, and prepared for
                  secure rollout.
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
            </div>

            <div className="mt-6 space-y-4">
              {snapshot.foundationStatus.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 border-t border-[var(--line)] pt-4 first:border-t-0 first:pt-0"
                >
                  <item.icon className="mt-1 h-4 w-4 text-[var(--accent)]" />
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {item.copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="surface rounded-[2rem] border border-[var(--line)] px-6 py-6 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold tracking-[-0.03em]">
                Upcoming appointments
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Next actions for the front desk and care team.
              </p>
            </div>
            <Stethoscope className="h-5 w-5 text-[var(--accent)]" />
          </div>

          <div className="mt-6 space-y-4">
            {snapshot.upcomingAppointments.length ? (
              snapshot.upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-col gap-3 rounded-[1.5rem] border border-white/60 bg-white/60 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {appointment.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {appointment.scheduledFor}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold tracking-[0.08em] text-[var(--accent)] uppercase">
                    {appointment.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] p-5 text-sm leading-6 text-[var(--muted)]">
                No appointment data yet. Once Supabase is connected, the clinic
                queue will hydrate from the live schedule.
              </div>
            )}
          </div>
        </div>

        <div className="surface rounded-[2rem] border border-[var(--line)] px-6 py-6 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold tracking-[-0.03em]">
                Report ingestion posture
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                The schema is prepared for a reviewable PDF ingestion pipeline.
              </p>
            </div>
            <FileText className="h-5 w-5 text-[var(--accent)]" />
          </div>

          <div className="mt-6 grid gap-4">
            {[
              "Raw file references and file metadata stay attached to each report.",
              "Parsed payloads, parser version, and confidence are stored together.",
              "Review state and audit events are part of the first schema slice.",
            ].map((copy) => (
              <div
                key={copy}
                className="rounded-[1.5rem] border border-white/60 bg-white/60 p-5 text-sm leading-6 text-[var(--muted)]"
              >
                {copy}
              </div>
            ))}

            <div className="rounded-[1.5rem] border border-white/60 bg-white/60 p-5">
              <div className="flex items-start gap-3">
                <Workflow className="mt-1 h-4 w-4 text-[var(--accent)]" />
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Audit events are designed to capture actor, table, row, and
                  timestamp data from the first mutable workflows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
