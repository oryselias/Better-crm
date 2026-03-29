"use client";

import { useEffect, useState } from "react";
import { FileText, ShieldCheck, Stethoscope, Workflow, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { MetricCard } from "@/components/dashboard/metric-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { DashboardSnapshot } from "@/lib/types";
import { refreshDashboardAction } from "./actions";

const iconMap: Record<string, LucideIcon> = {
  ShieldCheck,
  Workflow,
  FileText,
};

function FoundationIcon({ name }: { name: string }) {
  const Icon = iconMap[name];
  return Icon ? <Icon className="mt-1 h-4 w-4 text-primary" /> : null;
}

interface RealtimeDashboardProps {
    initialSnapshot: DashboardSnapshot;
}

export function RealtimeDashboard({ initialSnapshot }: RealtimeDashboardProps) {
    const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);

    useEffect(() => {
        const supabase = createSupabaseBrowserClient();

        const channel = supabase
            .channel("dashboard-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "patients" },
                async () => {
                    const freshSnapshot = await refreshDashboardAction();
                    setSnapshot(freshSnapshot);
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "appointments" },
                async () => {
                    const freshSnapshot = await refreshDashboardAction();
                    setSnapshot(freshSnapshot);
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "lab_reports" },
                async () => {
                    const freshSnapshot = await refreshDashboardAction();
                    setSnapshot(freshSnapshot);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="space-y-8">
            <section className="surface-lowest overflow-hidden rounded-[2.5rem] px-8 py-10 md:px-12 md:py-12 transition-all duration-500 hover:shadow-ambient border-b border-transparent hover:border-outline-variant/30">
                <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
                    <div className="space-y-5">
                        <div className="space-y-3">
                            <p className="eyebrow text-primary">Daily Control Room</p>
                            <div className="max-w-3xl">
                                <h1 className="text-3xl leading-tight font-semibold tracking-[-0.05em] text-balance md:text-5xl text-on-surface">
                                    Operate the clinic with clean signals instead of noisy admin.
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant md:text-base">
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

                    <div className="rounded-[2rem] bg-surface-container-low/40 p-8 transition-colors duration-300 hover:bg-surface-container-low/80">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold tracking-[-0.02em] text-on-surface">
                                    Foundation status
                                </p>
                                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                                    First slice is schema-first, audit-ready, and prepared for
                                    secure rollout.
                                </p>
                            </div>
                            <ShieldCheck className="h-5 w-5 text-primary-container" />
                        </div>

                        <div className="mt-6 space-y-4">
                            {snapshot.foundationStatus.map((item) => (
                                <div
                                    key={item.title}
                                    className="flex items-start gap-3 border-t border-outline-variant/50 pt-4 first:border-t-0 first:pt-0"
                                >
                                    <FoundationIcon name={item.iconName} />
                                    <div>
                                        <p className="text-sm font-semibold text-on-surface">{item.title}</p>
                                        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
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
                <div className="surface-lowest rounded-[2.5rem] px-8 py-10 transition-all duration-500 hover:shadow-ambient border-b border-transparent hover:border-outline-variant/30">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-lg font-semibold tracking-[-0.03em] text-on-surface">
                                Upcoming appointments
                            </p>
                            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                                Next actions for the front desk and care team.
                            </p>
                        </div>
                        <Stethoscope className="h-5 w-5 text-primary" />
                    </div>

                    <div className="mt-6 space-y-4">
                        {snapshot.upcomingAppointments.length ? (
                            snapshot.upcomingAppointments.map((appointment) => (
                                <div
                                    key={appointment.id}
                                    className="group flex flex-col gap-3 rounded-[1.5rem] bg-surface-container-low/40 p-5 md:flex-row md:items-center md:justify-between transition-all duration-300 hover:bg-surface-container-low/80 hover:pl-6 hover:shadow-[0_0_20px_rgba(0,242,255,0.05)]"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-on-surface">
                                            {appointment.title}
                                        </p>
                                        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                                            {appointment.scheduledFor}
                                        </p>
                                    </div>
                                    <span className="w-fit rounded-full bg-primary-container/10 px-4 py-1.5 text-xs font-bold tracking-[0.1em] text-primary-container uppercase shadow-[inset_0_0_10px_rgba(0,242,255,0.05)]">
                                        {appointment.status}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-[1.5rem] border border-dashed border-outline-variant/30 p-5 text-sm leading-6 text-on-surface-variant">
                                No appointment data yet. Once Supabase is connected, the clinic
                                queue will hydrate from the live schedule.
                            </div>
                        )}
                    </div>
                </div>

                <div className="surface-lowest rounded-[2.5rem] px-8 py-10 transition-all duration-500 hover:shadow-ambient border-b border-transparent hover:border-outline-variant/30">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-lg font-semibold tracking-[-0.03em] text-on-surface">
                                Reports pending review
                            </p>
                            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                                Oldest unreviewed lab reports in the queue.
                            </p>
                        </div>
                        <FileText className="h-5 w-5 text-primary" />
                    </div>

                    <div className="mt-6 space-y-3">
                        {snapshot.pendingReports.length > 0 ? (
                            <>
                                {snapshot.pendingReports.map((report) => (
                                    <div
                                        key={report.id}
                                        className="flex items-center justify-between gap-3 rounded-[1.5rem] bg-surface-container-low/40 px-5 py-4 transition-colors duration-300 hover:bg-surface-container-low/80"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-on-surface">
                                                {report.fileName}
                                            </p>
                                            <p className="mt-0.5 text-xs text-on-surface-variant">
                                                {report.patientName ?? "No patient"} · {report.ingestedAt}
                                            </p>
                                        </div>
                                        <span className="shrink-0 rounded-md border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
                                            pending
                                        </span>
                                    </div>
                                ))}
                                <Link
                                    href="/reports"
                                    className="block rounded-[1.5rem] border border-outline-variant/30 px-5 py-3 text-center text-xs font-medium text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
                                >
                                    View all reports →
                                </Link>
                            </>
                        ) : (
                            <div className="rounded-[1.5rem] border border-dashed border-outline-variant/30 p-6 text-center text-sm text-on-surface-variant">
                                No reports pending review.
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
