import { User, Activity, FileText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { formatDistanceToNow } from "date-fns";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewPatientDialog } from "@/components/patients/new-patient-dialog";
import { PatientSearch } from "@/components/patients/patient-search";

export const metadata = {
  title: "Patients - Better CRM",
  description: "Manage patient records and lab reports.",
};

async function PatientList({ query }: { query?: string }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .single();

  if (!profile?.clinic_id) return null;

  let dbQuery = supabase
    .from("patients")
    .select("*, lab_reports(count)")
    .eq("clinic_id", profile.clinic_id)
    .order("created_at", { ascending: false });

  if (query) {
    dbQuery = dbQuery.or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`);
  }

  const { data: patients, error } = await dbQuery;

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
        Failed to load patients. Please try again later.
      </div>
    );
  }

  if (!patients.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-highest/50">
          <User className="h-8 w-8 text-on-surface-variant" />
        </div>
        <h3 className="text-lg font-semibold text-on-surface">No patients found</h3>
        <p className="mt-2 text-sm text-on-surface-variant">
          {query ? "Try adjusting your search terms." : "Get started by adding your first patient."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low/50 text-xs text-on-surface-variant uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 sm:px-6 font-medium">Patient</th>
              <th className="px-4 py-3 sm:px-6 font-medium hidden sm:table-cell">Contact</th>
              <th className="px-4 py-3 sm:px-6 font-medium hidden md:table-cell">Age/Sex</th>
              <th className="px-4 py-3 sm:px-6 font-medium w-[120px]">Stats</th>
              <th className="px-4 py-3 sm:px-6 font-medium text-right">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {patients.map((patient) => {
              const reportCount = patient.lab_reports[0]?.count ?? 0;
              return (
                <tr
                  key={patient.id}
                  className="group transition-colors hover:bg-surface-container-highest/20 cursor-pointer"
                >
                  <td className="px-4 py-3 sm:px-6">
                    <Link href={`/patients/${patient.id}`} className="block">
                      <div className="font-semibold text-on-surface tracking-tight group-hover:text-primary transition-colors truncate max-w-[150px] sm:max-w-[200px]">
                        {patient.full_name}
                      </div>
                      <div className="mt-0.5 sm:hidden text-xs text-on-surface-variant truncate max-w-[150px]">
                        {patient.phone || "No phone"} • {patient.age ? `${patient.age}y` : "—"} {patient.sex ? patient.sex.charAt(0).toUpperCase() : ""}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 sm:px-6 hidden sm:table-cell">
                    <div className="text-on-surface-variant">{patient.phone || "—"}</div>
                  </td>
                  <td className="px-4 py-3 sm:px-6 hidden md:table-cell">
                    <div className="text-on-surface-variant capitalize">
                      {patient.age ? `${patient.age} yrs` : "—"}
                      <span className="mx-2 text-outline-variant/50">•</span>
                      {patient.sex || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 sm:px-6">
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary-container/50 px-2.5 py-1 text-xs font-medium text-on-secondary-container">
                      <FileText className="h-3.5 w-3.5 opacity-70" />
                      {reportCount}
                    </div>
                  </td>
                  <td className="px-4 py-3 sm:px-6 text-right">
                    <div className="text-on-surface-variant text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(patient.created_at), { addSuffix: true })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Patients</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Manage your clinic&apos;s patient registry.
          </p>
        </div>
        <div className="flex w-full flex-col sm:w-auto sm:flex-row gap-3">
          <PatientSearch />
          <NewPatientDialog />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center rounded-xl border border-outline-variant/30 bg-surface">
              <div className="flex flex-col items-center gap-4">
                <Activity className="h-8 w-8 animate-pulse text-primary/50" />
                <p className="text-sm font-medium text-on-surface-variant">Loading patients...</p>
              </div>
            </div>
          }
        >
          <PatientList query={q} />
        </Suspense>
      </div>
    </div>
  );
}