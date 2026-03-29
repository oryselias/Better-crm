import { User } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { NewPatientDialog } from "@/components/patients/new-patient-dialog";
import { PatientSearch } from "@/components/patients/patient-search";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PatientRow = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  sex: string | null;
  external_id: string | null;
  whatsapp_number: string | null;
  email: string | null;
  created_at: string;
};

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("patients")
    .select("id, full_name, date_of_birth, sex, external_id, whatsapp_number, email, created_at")
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
        <div className="flex items-center gap-3">
          <Suspense>
            <PatientSearch />
          </Suspense>
          <NewPatientDialog />
        </div>
      </div>

      <section className="surface overflow-hidden rounded-[2rem] border border-outline-variant/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant">
              <tr>
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">ID / External</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Added</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {patients && patients.length > 0 ? (
                patients.map((patient: PatientRow) => (
                  <tr
                    key={patient.id}
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
                            {patient.date_of_birth ?? "No DOB"} • {patient.sex ?? "Unknown"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-md bg-surface-container px-2 py-1 text-xs font-medium text-on-surface-variant border border-outline-variant/30">
                        {patient.external_id || "EXT-PENDING"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      <p>{patient.whatsapp_number || patient.email || "No contact"}</p>
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
