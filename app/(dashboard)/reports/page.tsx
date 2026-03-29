import { FileText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ReviewFilter } from "@/components/reports/review-filter";
import { UploadReportDialog } from "@/components/reports/upload-report-dialog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateReviewState } from "./actions";

const STATE_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  reviewed: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("lab_reports")
    .select(
      "id, source_file_name, source_file_path, parser_version, parser_confidence, review_state, ingested_at, patients(id, full_name)",
    )
    .order("ingested_at", { ascending: false });

  if (state) query = query.eq("review_state", state);

  const [{ data: reports }, { data: patients }] = await Promise.all([
    query,
    supabase.from("patients").select("id, full_name").order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-on-surface">
            Lab Reports
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Raw files and parsed payloads held for clinician review.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense>
            <ReviewFilter />
          </Suspense>
          <UploadReportDialog patients={patients ?? []} />
        </div>
      </div>

      <section className="surface overflow-hidden rounded-[2rem] border border-outline-variant/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant">
              <tr>
                <th className="px-6 py-4 font-semibold">File</th>
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">Parser</th>
                <th className="px-6 py-4 font-semibold">State</th>
                <th className="px-6 py-4 font-semibold">Ingested</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {reports && reports.length > 0 ? (
                reports.map((r) => {
                  const patient = (
                    Array.isArray(r.patients) ? r.patients[0] : r.patients
                  ) as { id: string; full_name: string } | null;

                  return (
                    <tr key={r.id} className="transition-colors hover:bg-surface-container/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-on-surface-variant" />
                          <span className="max-w-[180px] truncate font-medium text-on-surface">
                            {r.source_file_name ?? r.source_file_path}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {patient ? (
                          <Link
                            href={`/patients/${patient.id}`}
                            className="text-on-surface hover:text-primary transition-colors"
                          >
                            {patient.full_name}
                          </Link>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        <span className="font-mono text-xs">{r.parser_version}</span>
                        {r.parser_confidence != null && (
                          <span className="ml-2 text-xs text-on-surface-variant/60">
                            {(Number(r.parser_confidence) * 100).toFixed(0)}%
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium capitalize ${
                            STATE_STYLES[r.review_state] ??
                            "bg-surface-container text-on-surface-variant border-outline-variant/30"
                          }`}
                        >
                          {r.review_state}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {new Date(r.ingested_at).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {r.review_state === "pending" && (
                            <>
                              <form action={updateReviewState.bind(null, r.id, "reviewed")}>
                                <button
                                  type="submit"
                                  className="rounded-lg border border-green-500/30 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/10 transition-colors"
                                >
                                  Approve
                                </button>
                              </form>
                              <form action={updateReviewState.bind(null, r.id, "rejected")}>
                                <button
                                  type="submit"
                                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  Reject
                                </button>
                              </form>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                    No reports{state ? ` with state "${state}"` : ""}. Upload one to start the review queue.
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
