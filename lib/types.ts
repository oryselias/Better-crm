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

export interface TestCatalog { id: string; name: string; code: string; category: string | null; parameters: TestParameter[]; description: string | null; is_active: boolean; }
export interface TestParameter {
  id: string;
  name: string;
  unit: string;
  normal_range: string;
  male_normal_range?: string;
  female_normal_range?: string;
  selectOptions?: string[];
  defaultValue?: string;
  formula?: string;
  /** When true, row is a section heading only (no result / unit / reference range). */
  is_segment?: boolean;
}
export interface TestResult { parameterId: string; value: string|number|boolean; isAbnormal?: boolean; notes?: string; }
export interface SelectedTest { testId: string; test?: TestCatalog; results?: TestResult[]; }
export interface LabReport { id: string; clinic_id: string; patient_id: string; patient?: Patient; clinic?: { name: string | null }; report_no: number; status: 'pending'|'completed'; tests: SelectedTest[]; notes: string | null; referred_by: string | null; created_at: string; completed_at: string | null; created_by: string | null; discount?: number; total_amount?: number; final_amount?: number; }
export interface LabReportSummary { id: string; report_no: number; status: 'pending'|'completed'; tests: SelectedTest[]; created_at: string; patient_id?: string; patient?: { id: string; full_name: string; phone: string | null }[]; discount?: number; total_amount?: number; final_amount?: number; }
export interface CreateReportParams { patientId: string; selectedTests: string[]; results: TestResult[]; notes?: string; referredBy?: string; }
export interface UpdateReportDetailsParams extends CreateReportParams { status?: 'pending'|'completed'; }
export interface ReportFilters { patientName?: string; status?: 'pending'|'completed'; dateFrom?: string; dateTo?: string; }
