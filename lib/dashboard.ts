import { FileText, ShieldCheck, Workflow } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DashboardMetric, DashboardSnapshot } from "@/lib/types";

const placeholderMetrics: DashboardMetric[] = [
  {
    label: "Patients",
    value: "0",
    copy: "Patient roster will hydrate from Supabase once the first clinic is seeded.",
  },
  {
    label: "Appointments",
    value: "0",
    copy: "Upcoming scheduling data appears here after the first operational sync.",
  },
  {
    label: "Reports",
    value: "0",
    copy: "Lab reports count includes review-ready parsed records.",
  },
];

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  try {
    const supabase = await createSupabaseServerClient();

    const [patients, appointments, reports, appointmentRows] = await Promise.all([
      supabase.from("patients").select("*", { count: "exact", head: true }),
      supabase.from("appointments").select("*", { count: "exact", head: true }),
      supabase.from("lab_reports").select("*", { count: "exact", head: true }),
      supabase
        .from("appointments")
        .select("id, scheduled_at, status")
        .order("scheduled_at", { ascending: true })
        .limit(3),
    ]);

    return {
      metrics: [
        {
          label: "Patients",
          value: String(patients.count ?? 0),
          copy: "Clinic-scoped patient records ready for WhatsApp and report workflows.",
        },
        {
          label: "Appointments",
          value: String(appointments.count ?? 0),
          copy: "Scheduling data stays linked to patient follow-up and future reminders.",
        },
        {
          label: "Reports",
          value: String(reports.count ?? 0),
          copy: "Parsed report records with review state and parser metadata.",
        },
      ],
      foundationStatus: [
        {
          title: "Clinic isolation",
          copy: "Single-clinic profile membership drives first-slice access policies.",
          icon: ShieldCheck,
        },
        {
          title: "Audit posture",
          copy: "Core business tables are designed to emit append-only audit events.",
          icon: Workflow,
        },
        {
          title: "Report readiness",
          copy: "Lab records preserve raw source references and parsed payloads together.",
          icon: FileText,
        },
      ],
      upcomingAppointments:
        appointmentRows.data?.map((appointment) => ({
          id: appointment.id,
          title: "Scheduled appointment",
          scheduledFor: new Date(appointment.scheduled_at).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          status: appointment.status.replace("_", " "),
        })) ?? [],
    };
  } catch {
    return {
      metrics: placeholderMetrics,
      foundationStatus: [
        {
          title: "Environment setup",
          copy: "Connect Supabase credentials to unlock live counts and auth checks.",
          icon: ShieldCheck,
        },
        {
          title: "Audit posture",
          copy: "Audit events are already part of the schema foundation for live data.",
          icon: Workflow,
        },
        {
          title: "Report readiness",
          copy: "The reports area is already structured around reviewable ingestion.",
          icon: FileText,
        },
      ],
      upcomingAppointments: [],
    };
  }
}
