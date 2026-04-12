'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LabReportSummary, getReports } from '@/lib/reports/services';

export default function LabReportPage() {
  const [reports, setReports] = useState<LabReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const result = await getReports({}, 1, 50);
        setReports(result.data);

        // Calculate stats from returned data
        const completed = result.data.filter((r) => r.status === 'completed').length;
        const pending = result.data.filter((r) => r.status === 'pending').length;

        setStats({
          total: result.total,
          completed,
          pending,
        });
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-on-surface">
            Lab Reports
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Create and manage lab test reports
          </p>
        </div>
        <Link
          href="/lab-report/new"
          className="btn-primary inline-flex items-center justify-center gap-2 rounded-md px-6 py-2.5 text-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Report
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface rounded-lg border border-outline-variant/30 p-4 shadow-sm">
          <p className="text-sm text-on-surface-variant">Total Reports</p>
          <p className="text-2xl font-bold text-on-surface">{stats.total}</p>
        </div>
        <div className="surface rounded-lg border border-outline-variant/30 p-4 shadow-sm">
          <p className="text-sm text-on-surface-variant">Completed</p>
          <p className="text-2xl font-bold text-success">{stats.completed}</p>
        </div>
        <div className="surface rounded-lg border border-outline-variant/30 p-4 shadow-sm">
          <p className="text-sm text-on-surface-variant">Pending</p>
          <p className="text-2xl font-bold text-warning">{stats.pending}</p>
        </div>
      </div>

      {/* Reports Table */}
      <section className="surface overflow-hidden rounded-lg border border-outline-variant/30 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant">
            No reports found. Create a new report to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4 font-semibold">Report No.</th>
                  <th className="px-6 py-4 font-semibold">Patient</th>
                  <th className="px-6 py-4 font-semibold">Tests</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {reports.map((report) => (
                  <tr key={report.id} className="transition-colors hover:bg-surface-container/50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">{report.report_no || report.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-on-surface">
                          {report.patient?.[0]?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-on-surface-variant">{report.patient?.[0]?.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {report.tests?.slice(0, 2).map((test, idx) => (
                          <span
                            key={idx}
                            className="inline-block rounded-md bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant"
                          >
                            {test.test?.code || test.testId?.slice(0, 4)}
                          </span>
                        ))}
                        {report.tests && report.tests.length > 2 && (
                          <span className="inline-block rounded-md bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">
                            +{report.tests.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium capitalize ${report.status === 'completed'
                            ? 'border-secondary/30 bg-secondary-container text-on-secondary-container'
                            : 'border-warning/30 bg-warning-container text-on-warning-container'
                          }`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {new Date(report.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/lab-report/${report.id}`}
                          className="rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={`/lab-report/${report.id}#edit`}
                          className="rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container transition-colors"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
