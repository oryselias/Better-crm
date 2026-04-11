import { ArrowLeft, FileText, Phone, User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, age, sex, phone, created_at")
    .eq("id", id)
    .single();

  if (!patient) notFound();

  const { data: reports } = await supabase
    .from("lab_reports")
    .select("id, report_no, status, created_at, final_amount")
    .eq("patient_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const reportStatusColors: Record<string, string> = {
    pending: "bg-warning-container text-on-warning-container border-warning/30",
    completed: "bg-secondary-container text-on-secondary-container border-secondary/30",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/patients"
          className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Patients
        </Link>
      </div>

      {/* Header */}
      <div className="surface rounded-lg border border-outline-variant/30 p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
            <User className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-on-surface">
              {patient.full_name}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              {patient.age !== null ? `${patient.age} years` : "No age"} &bull;{" "}
              {patient.sex ?? "Unknown sex"}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-on-surface-variant">
              {patient.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {patient.phone}
                </span>
              )}
              <span>Added {new Date(patient.created_at).toLocaleDateString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lab Reports */}
      <section className="surface overflow-hidden rounded-lg border border-outline-variant/30 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-semibold text-on-surface flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Lab Reports
          </h2>
        </div>
        {reports && reports.length > 0 ? (
          <ul className="divide-y divide-outline-variant/30">
            {reports.map((report) => (
              <li key={report.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    Report #{report.report_no}
                  </p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {new Date(report.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    <span className="ml-2">Rs. {Number(report.final_amount ?? 0).toFixed(0)}</span>
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium capitalize ${
                    reportStatusColors[report.status] ?? "bg-surface-container text-on-surface-variant border-outline-variant/30"
                  }`}
                >
                  {report.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-8 text-center text-sm text-on-surface-variant">
            No lab reports on record.
          </p>
        )}
      </section>
    </div>
  );
}
