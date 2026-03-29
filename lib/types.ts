export type AppRole = "admin" | "lab_staff" | "clinician";
export type LabReportReviewState = "pending" | "reviewed" | "rejected";
export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "completed"
  | "cancelled";

export type DashboardMetric = {
  label: string;
  value: string;
  copy: string;
};

export type Profile = {
  id: string;
  clinic_id: string;
  role: AppRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Patient = {
  id: string;
  clinic_id: string;
  external_id: string | null;
  full_name: string;
  date_of_birth: string | null;
  sex: "male" | "female" | "other" | "unknown" | null;
  whatsapp_number: string | null;
  email: string | null;
  medical_history: unknown;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Appointment = {
  id: string;
  clinic_id: string;
  patient_id: string;
  scheduled_at: string;
  status: AppointmentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LabReport = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  appointment_id: string | null;
  source_file_path: string;
  source_file_name: string | null;
  source_file_checksum: string | null;
  parser_version: string;
  parser_confidence: number | null;
  review_state: LabReportReviewState;
  parsed_payload: Record<string, unknown>;
  extracted_summary: string | null;
  ingested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditEvent = {
  id: number;
  clinic_id: string;
  actor_id: string | null;
  action: string;
  table_name: string;
  row_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type DashboardSnapshot = {
  metrics: DashboardMetric[];
  foundationStatus: Array<{
    title: string;
    copy: string;
    iconName: string;
  }>;
  upcomingAppointments: Array<{
    id: string;
    title: string;
    scheduledFor: string;
    status: string;
  }>;
  pendingReports: Array<{
    id: string;
    fileName: string;
    patientName: string | null;
    ingestedAt: string;
  }>;
};
