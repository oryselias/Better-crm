'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getReports, type LabReportSummary } from '@/lib/reports/services';

export function LabDashboard() {
    const [reports, setReports] = useState<LabReportSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });

    useEffect(() => {
        const fetch = async () => {
            try {
                const result = await getReports({}, 1, 10);
                setReports(result.data);
                const completed = result.data.filter((r) => r.status === 'completed').length;
                const pending = result.data.filter((r) => r.status === 'pending').length;
                setStats({ total: result.total, completed, pending });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    return (
        <div className="space-y-8">
            {/* Hero header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] text-on-surface">
                        Lab Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-on-surface-variant">
                        Quick overview of recent reports
                    </p>
                </div>
                <Link
                    href="/lab-report/new"
                    className="btn-primary inline-flex items-center justify-center gap-2 rounded-md px-6 py-2.5 text-sm shadow-sm"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Report
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Reports', value: stats.total, color: 'text-on-surface' },
                    { label: 'Completed', value: stats.completed, color: 'text-success' },
                    { label: 'Pending', value: stats.pending, color: 'text-warning' },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="surface rounded-lg border border-outline-variant/30 p-5 shadow-sm"
                    >
                        <p className="text-sm text-on-surface-variant">{s.label}</p>
                        <p className={`text-3xl font-bold ${s.color} mt-1`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Recent Reports */}
            <section className="surface overflow-hidden rounded-lg border border-outline-variant/30 shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
                    <h2 className="font-semibold text-on-surface">Recent Reports</h2>
                    <Link
                        href="/lab-report"
                        className="text-xs font-medium text-primary hover:underline"
                    >
                        View all →
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                ) : reports.length === 0 ? (
                    <div className="py-12 text-center text-on-surface-variant">
                        No reports yet.{' '}
                        <Link href="/lab-report/new" className="text-primary underline">
                            Create the first one.
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-outline-variant/30">
                        {reports.map((report) => (
                            <div
                                key={report.id}
                                className="flex flex-col sm:flex-row gap-4 sm:gap-0 items-start sm:items-center justify-between px-6 py-4 hover:bg-surface-container/40 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-xs text-on-surface-variant">
                                        #{report.report_no || report.id.slice(0, 6).toUpperCase()}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium text-on-surface">
                                            {report.patient?.[0]?.full_name || 'Unknown Patient'}
                                        </p>
                                        <p className="text-xs text-on-surface-variant">
                                            {new Date(report.created_at).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-3 md:gap-4 mt-2 sm:mt-0">
                                    <span className="text-xs md:text-sm text-on-surface-variant shrink-0">
                                        {report.tests?.length ?? 0} test{(report.tests?.length ?? 0) !== 1 ? 's' : ''}
                                    </span>
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <span
                                            className={`inline-flex rounded-md border px-2 md:px-2.5 py-1 text-[10px] md:text-xs font-medium capitalize shrink-0 ${report.status === 'completed'
                                                    ? 'border-secondary/30 bg-secondary-container text-on-secondary-container'
                                                    : 'border-warning/30 bg-warning-container text-on-warning-container'
                                                }`}
                                        >
                                            {report.status}
                                        </span>
                                        <Link
                                            href={`/lab-report/${report.id}`}
                                            className="rounded-lg border border-outline-variant/30 px-3 py-1.5 md:py-1 text-xs font-medium text-on-surface hover:bg-surface-container transition-colors shrink-0"
                                        >
                                            View
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
