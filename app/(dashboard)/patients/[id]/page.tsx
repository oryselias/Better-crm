import { ArrowLeft, Calendar, FileText, Mail, Phone, User } from "lucide-react";
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
    .select("*")
    .eq("id", id)
    .single();

  if (!patient) notFound();

  const [{ data: appointments }, { data: reports }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, scheduled_at, status, notes")
      .eq("patient_id", id)
      .order("scheduled_at", { ascending: false })
      .limit(10),
    supabase
      .from("lab_reports")
      .select("id, source_file_name, review_state, parser_confidence, ingested_at")
      .eq("patient_id", id)
      .order("ingested_at", { ascending: false })
      .limit(10),
  ]);

  const reportStateColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    reviewed: "bg-green-500/10 text-green-400 border-green-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const statusColors: Record<string, string> = {
    scheduled: "bg-primary/10 text-primary border-primary/20",
    checked_in: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    completed: "bg-green-500/10 text-green-400 border-green-500/20",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
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
      <div className="surface rounded-[2rem] border border-outline-variant/30 p-6">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
            <User className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-on-surface">
              {patient.full_name}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              {patient.date_of_birth ?? "No DOB"} &bull;{" "}
              {patient.sex ?? "Unknown sex"} &bull;{" "}
              <span className="inline-flex rounded-md bg-surface-container px-2 py-0.5 text-xs font-medium border border-outline-variant/30">
                {patient.external_id ?? "EXT-PENDING"}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-on-surface-variant">
              {patient.whatsapp_number && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {patient.whatsapp_number}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {patient.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {patient.notes && (
          <div className="mt-5 rounded-xl bg-surface-container/50 border border-outline-variant/20 px-4 py-3 text-sm text-on-surface-variant">
            {patient.notes}
          </div>
        )}
      </div>

      {/* Appointments */}
      <section className="surface overflow-hidden rounded-[2rem] border border-outline-variant/30">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-semibold text-on-surface flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Appointments
          </h2>
        </div>
        {appointments && appointments.length > 0 ? (
          <ul className="divide-y divide-outline-variant/30">
            {appointments.map((appt) => (
              <li key={appt.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    {new Date(appt.scheduled_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  {appt.notes && (
                    <p className="mt-0.5 text-xs text-on-surface-variant">{appt.notes}</p>
                  )}
                </div>
                <span
                  className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium capitalize ${
                    statusColors[appt.status] ?? "bg-surface-container text-on-surface-variant border-outline-variant/30"
                  }`}
                >
                  {appt.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-8 text-center text-sm text-on-surface-variant">
            No appointments on record.
          </p>
        )}
      </section>

      {/* Lab Reports */}
      <section className="surface overflow-hidden rounded-[2rem] border border-outline-variant/30">
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
                    {report.source_file_name ?? report.id.slice(0, 8)}
                  </p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {new Date(report.ingested_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    {report.parser_confidence != null && (
                      <span className="ml-2">
                        {(Number(report.parser_confidence) * 100).toFixed(0)}% confidence
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium capitalize ${
                    reportStateColors[report.review_state] ?? "bg-surface-container text-on-surface-variant border-outline-variant/30"
                  }`}
                >
                  {report.review_state}
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
