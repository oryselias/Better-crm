import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

interface VerifyPageProps {
  params: Promise<{ id: string }>;
}

export default async function VerifyReportPage({ params }: VerifyPageProps) {
  const { id } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Configuration error</p>
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: report, error } = await supabase
    .from("lab_reports")
    .select(
      `
        id,
        report_no,
        status,
        created_at,
        completed_at,
        patient:patients(full_name, date_of_birth, sex),
        clinic:clinics(name)
      `
    )
    .eq("id", id)
    .single();

  if (error || !report) {
    notFound();
  }

  const patient = Array.isArray(report.patient) ? report.patient[0] : report.patient;
  const clinic = Array.isArray(report.clinic) ? report.clinic[0] : report.clinic;

  const reportDate = new Date(report.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const completedDate = report.completed_at
    ? new Date(report.completed_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-surface-lowest flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="surface rounded-lg shadow-sm border border-outline-variant/30 overflow-hidden">
          {/* Header */}
          <div className="bg-surface-container px-6 py-5 border-b border-outline-variant/30">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {report.status === "completed" ? (
                  <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <h1 className="text-on-surface text-lg font-semibold">Report Verification</h1>
                <p className="text-on-surface-variant text-sm">{clinic?.name || "Laboratory"}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-4">
            {/* Status badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                  report.status === "completed"
                    ? "bg-success-container text-on-success-container border-success/20"
                    : "bg-warning-container text-on-warning-container border-warning/20"
                }`}
              >
                {report.status === "completed" ? "Verified" : "Pending"}
              </span>
            </div>

            <div className="border-t border-gray-100" />

            {/* Report details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Report No</span>
                <span className="text-sm font-semibold text-gray-900">#{report.report_no || id.slice(0, 6)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Patient</span>
                <span className="text-sm font-medium text-gray-900">{patient?.full_name || "Unknown"}</span>
              </div>

              {patient?.sex && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Age / Sex</span>
                  <span className="text-sm text-gray-900">
                    {formatAge(patient.date_of_birth)} / {patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Report Date</span>
                <span className="text-sm text-gray-900">{reportDate}</span>
              </div>

              {completedDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Completed</span>
                  <span className="text-sm text-gray-900">{completedDate}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* Footer */}
            <div className="text-center pt-2">
              <p className="text-xs text-gray-400">
                Verified by{" "}
                <a
                  href="https://bettercrm.com"
                  className="text-blue-600 hover:underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Better CRM
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Branding */}
        <p className="text-center text-xs text-gray-400 mt-4">
          © {new Date().getFullYear()} Better CRM
        </p>
      </div>
    </div>
  );
}

function formatAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return "N/A";
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const years = today.getFullYear() - dob.getFullYear();
  if (years === 0) return `${today.getMonth() - dob.getMonth()}M`;
  return `${years}Y`;
}
