import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DashboardSnapshot } from "@/lib/types";

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.clinic_id) {
    redirect("/onboarding");
  }

  const clinicId = profile.clinic_id;

  const [patientsCount, appointmentsCount, reportsCount, pendingReportsResult] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId),
    supabase.from("lab_reports").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId),
    supabase
      .from("lab_reports")
      .select("id, source_file_name, ingested_at, patients(full_name)")
      .eq("clinic_id", clinicId)
      .eq("review_state", "pending")
      .order("ingested_at", { ascending: true })
      .limit(5),
  ]);

  type UpcomingAppt = { id: string; status: string; scheduled_at: string; patients: { full_name: string } | null };
  const { data } = await supabase
    .from("appointments")
    .select("id, status, scheduled_at, patients(full_name)")
    .eq("clinic_id", clinicId)
    .eq("status", "scheduled")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(5);
  const upcomingData = data as UpcomingAppt[] | null;

  return {
    metrics: [
      {
        label: "Patients",
        value: (patientsCount.count || 0).toString(),
        copy: "Clinic-scoped patient records ready for WhatsApp and report workflows.",
      },
      {
        label: "Appointments",
        value: (appointmentsCount.count || 0).toString(),
        copy: "Scheduling data stays linked to patient follow-up and future reminders.",
      },
      {
        label: "Reports",
        value: (reportsCount.count || 0).toString(),
        copy: "Parsed report records with review state and parser metadata.",
      },
    ],
    foundationStatus: [
      {
        title: "Clinic isolation",
        copy: "Single-clinic profile membership drives first-slice access policies.",
        iconName: "ShieldCheck",
      },
      {
        title: "Audit posture",
        copy: "Core business tables are designed to emit append-only audit events.",
        iconName: "Workflow",
      },
      {
        title: "Report readiness",
        copy: "Lab records preserve raw source references and parsed payloads together.",
        iconName: "FileText",
      },
    ],
    pendingReports: ((pendingReportsResult.data ?? []) as unknown as Array<{
      id: string;
      source_file_name: string | null;
      ingested_at: string;
      patients: { full_name: string } | { full_name: string }[] | null;
    }>).map((r) => ({
      id: r.id,
      fileName: r.source_file_name ?? r.id.slice(0, 8),
      patientName: (Array.isArray(r.patients) ? r.patients[0] : r.patients)?.full_name ?? null,
      ingestedAt: new Date(r.ingested_at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
    })),
    upcomingAppointments: (upcomingData || []).map((appt) => ({
      id: appt.id,
      title: appt.patients?.full_name ? `${appt.patients.full_name}'s Appointment` : "Scheduled appointment",
      scheduledFor: new Date(appt.scheduled_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      status: appt.status,
    })),
  };
}
