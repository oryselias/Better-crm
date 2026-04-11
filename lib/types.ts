export type AppRole = "admin" | "lab_staff" | "clinician";

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
  full_name: string;
  age: number | null;
  sex: "male" | "female" | "other" | "unknown" | null;
  phone: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  copy: string;
};

export type DashboardSnapshot = {
  metrics: DashboardMetric[];
  recentReports: Array<{
    id: string;
    report_no: number;
    patientName: string | null;
    status: string;
    finalAmount: number;
    createdAt: string;
  }>;
};
