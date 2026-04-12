import { User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { NewPatientDialog } from "@/components/patients/new-patient-dialog";
import { PatientSearch } from "@/components/patients/patient-search";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PatientRow = {
  id: string;
  full_name: string;
  age: number | null;
  sex: string | null;
  phone: string | null;
  created_at: string;
};

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("patients")
    .select("id, full_name, age, sex, phone, created_at")
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("full_name", `%${q}%`);

  const { data: patients } = await query;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-on-surface">
            Patients
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Manage clinic patient records and history.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <Suspense>
            <div className="flex-1 sm:flex-none">
              <PatientSearch />
            </div>
          </Suspense>
          <div className="flex gap-3">
            <Link
              href="/lab-report/new"
              data-testid="patients-create-report-link"
              className="flex-1 text-center rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-highest"
            >
              Create Report
            </Link>
            <div className="flex-1">
              <NewPatientDialog />
            </div>
          </div>
        </div>
      </div>

      <section
        data-testid="patients-table"
        className="surface overflow-hidden rounded-lg border border-outline-variant/30 shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant">
              <tr>
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">Patient ID</th>
                <th className="px-6 py-4 font-semibold">Phone</th>
                <th className="px-6 py-4 font-semibold">Added</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {patients && patients.length > 0 ? (
                patients.map((patient: PatientRow) => (
                  <tr
                    key={patient.id}
                    data-testid={`patient-row-${patient.id}`}
                    className="transition-colors hover:bg-surface-container/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-on-surface">
                            {patient.full_name}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {patient.age !== null ? `${patient.age} years` : "No age"} &bull; {patient.sex ?? "Unknown"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-md bg-surface-container px-2 py-1 text-xs font-medium text-on-surface-variant border border-outline-variant/30">
                        {patient.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      <p>{patient.phone || "No phone"}</p>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {new Date(patient.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="text-primary hover:text-primary-container font-medium hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                    {q
                      ? `No patients matching "${q}".`
                      : "No patients found. Add a patient to get started."}
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
