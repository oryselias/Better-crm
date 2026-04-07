import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizePatientPhone } from "@/lib/patients/phone";
import { evaluateReferenceRange, normalizeTestCatalogEntry, type SupportedSex } from "@/lib/reports/reference-ranges";

export interface Patient { id: string; clinic_id: string; full_name: string; date_of_birth: string | null; sex: string | null; phone: string | null; created_at: string; }
export interface TestCatalog { id: string; name: string; code: string; category: string | null; parameters: TestParameter[]; description: string | null; is_active: boolean; }
export interface TestParameter { id: string; name: string; unit: string; normal_range: string; male_normal_range?: string; female_normal_range?: string; selectOptions?: string[]; }
export interface TestResult { parameterId: string; value: string|number|boolean; isAbnormal?: boolean; notes?: string; }
export interface SelectedTest { testId: string; test?: TestCatalog; results?: TestResult[]; }
export interface LabReport { id: string; clinic_id: string; patient_id: string; patient?: Patient; clinic?: { name: string | null }; report_no: number; status: 'pending'|'completed'; tests: SelectedTest[]; notes: string | null; referred_by: string | null; created_at: string; completed_at: string | null; created_by: string | null; }
export interface LabReportSummary { id: string; report_no: number; status: 'pending'|'completed'; tests: SelectedTest[]; created_at: string; patient_id?: string; patient?: { id: string; full_name: string; phone: string | null }[]; }
export interface CreateReportParams { patientId: string; selectedTests: string[]; results: TestResult[]; notes?: string; referredBy?: string; }
export interface UpdateReportDetailsParams extends CreateReportParams { status?: 'pending'|'completed'; }
export interface ReportFilters { patientName?: string; status?: 'pending'|'completed'; dateFrom?: string; dateTo?: string; }

// ── Catalog cache (5-minute TTL, shared across all calls in the same browser tab) ──
let _catalogCache: { data: TestCatalog[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export function invalidateTestCatalog() { _catalogCache = null; }

export async function searchPatients(q: string) {
  const s = createSupabaseBrowserClient();
  // Escape PostgREST meta-characters to prevent query injection
  const escapedQ = q.replace(/[\\%.,()]/g, (c) => `\\${c}`);
  const { data, error } = await s.from('patients').select('id,clinic_id,full_name,date_of_birth,sex,phone,created_at').or(`full_name.ilike.%${escapedQ}%,phone.ilike.%${escapedQ}%`).order('full_name').limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function createPatient(p: { full_name: string; date_of_birth?: string; sex?: string; phone?: string }) {
  const s = createSupabaseBrowserClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile, error: pe } = await s.from('profiles').select('clinic_id').eq('id', user.id).single();
  if (pe || !profile?.clinic_id) throw new Error(pe?.message ?? 'No clinic profile found');
  const { data, error } = await s.from('patients').insert({ clinic_id: profile.clinic_id, full_name: p.full_name, date_of_birth: p.date_of_birth ?? null, sex: p.sex ?? null, phone: normalizePatientPhone(p.phone), created_by: user.id }).select('id,clinic_id,full_name,date_of_birth,sex,phone,created_at').single();
  if (error) throw error;
  return data;
}

export async function getTestCatalog(): Promise<TestCatalog[]> {
  if (_catalogCache && Date.now() - _catalogCache.ts < CACHE_TTL) return _catalogCache.data;
  const s = createSupabaseBrowserClient();
  const { data, error } = await s.from('test_catalog')
    .select('id,name,code,category,parameters,description,is_active')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  const result = (data ?? []).map(normalizeTestCatalogEntry);
  _catalogCache = { data: result, ts: Date.now() };
  return result;
}

export async function getReports(f: ReportFilters = {}, page = 1, limit = 50): Promise<{ data: LabReportSummary[]; total: number }> {
  const s = createSupabaseBrowserClient();
  
  let q = s.from('lab_reports')
    .select(`id,report_no,status,tests,discount,total_amount,final_amount,created_at,patient_id`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page-1)*limit, page*limit-1);
  
  if (f.status) q = q.eq('status', f.status);
  if (f.dateFrom) q = q.gte('created_at', f.dateFrom);
  if (f.dateTo) q = q.lte('created_at', f.dateTo);
  const { data, error, count } = await q;
  if (error) throw error;
  
  // Fetch patient data separately for all reports to avoid RLS join issues
  const reports = data ?? [];
  if (reports.length > 0) {
    const patientIds = reports.map(r => r.patient_id).filter((id): id is string => !!id);
    if (patientIds.length > 0) {
      const { data: patients, error: patientError } = await s
        .from('patients')
        .select('id,full_name,phone')
        .in('id', patientIds);
      
      if (patientError) {
        console.error('[getReports] Error fetching patients:', patientError);
      }
      
      if (patients) {
        const patientMap = new Map(patients.map(p => [p.id, p]));
        // Attach patient data to each report
        reports.forEach(report => {
          if (report.patient_id && patientMap.has(report.patient_id)) {
            (report as unknown as Record<string, unknown>).patient = [patientMap.get(report.patient_id)!];
          }
        });
      }
    }
  }

  return { data: reports as unknown as LabReportSummary[], total: count ?? 0 };
}

export async function getReportById(id: string): Promise<LabReport | null> {
  const s = createSupabaseBrowserClient();
  const { data, error } = await s.from('lab_reports')
    .select(`id,clinic_id,patient_id,report_no,status,tests,discount,total_amount,final_amount,notes,referred_by,created_at,completed_at,created_by,patient:patients(id,clinic_id,full_name,date_of_birth,sex,phone,created_at),clinic:clinics(name)`)
    .eq('id', id)
    .single();
  if (error) return null;
  // Supabase returns nested relations as arrays; unwrap to single objects
  const patient = Array.isArray(data.patient) ? data.patient[0] : data.patient;
  const clinic = Array.isArray(data.clinic) ? data.clinic[0] : data.clinic;
  return { ...data, patient, clinic, tests: await hydrateReportTests((data.tests ?? []) as SelectedTest[]) };
}

// Batch-fetch all required tests in a single query instead of N+1 getTestById calls
async function buildPayload(testIds: string[], results: TestResult[], sex?: SupportedSex) {
  if (!testIds.length) return { tests: [] };
  const s = createSupabaseBrowserClient();
  const { data, error } = await s.from('test_catalog').select('id,name,code,category,parameters').in('id', testIds);
  if (error) throw new Error(`Failed to load tests: ${error.message}`);
  const byId = new Map((data ?? []).map(t => [t.id, normalizeTestCatalogEntry(t)]));
  const missing = testIds.filter(id => !byId.has(id));
  if (missing.length) throw new Error(`Tests not found in catalog: ${missing.join(', ')}`);
  return {
    tests: testIds.map(id => {
      const t = byId.get(id)!;
      return { testId: t.id, test: t, results: (t.parameters ?? []).map((p: TestParameter) => { const r = results.find(x => x.parameterId === p.id); const e = evaluateReferenceRange(p, r?.value ?? '', sex); return { parameterId: p.id, value: r?.value ?? '', isAbnormal: e.isAbnormal, notes: r?.notes }; }) };
    }),
  };
}

export async function createReport(p: CreateReportParams) {
  const s = createSupabaseBrowserClient();
  const [{ data: pat }, { data: { user } }] = await Promise.all([
    s.from('patients').select('sex').eq('id', p.patientId).single(),
    s.auth.getUser(),
  ]);
  const { tests } = await buildPayload(p.selectedTests, p.results, pat?.sex);
  let cid: string | null = null;
  if (user) { const { data: pr } = await s.from('profiles').select('clinic_id').eq('id', user.id).single(); cid = pr?.clinic_id ?? null; }
  if (!cid) throw new Error('User clinic not configured. Cannot create report.');
  const { data, error } = await s.from('lab_reports').insert({ clinic_id: cid, patient_id: p.patientId, tests, notes: p.notes ?? null, referred_by: p.referredBy ?? null, status: 'pending' }).select().single();
  if (error) throw new Error(`Failed to create report: ${error.message}`);
  invalidateTestCatalog();
  return data;
}

export async function updateReportDetails(id: string, p: UpdateReportDetailsParams) {
  const s = createSupabaseBrowserClient();
  const { data: pat } = p.patientId
    ? await s.from('patients').select('sex').eq('id', p.patientId).single()
    : { data: null };
  const { tests } = await buildPayload(p.selectedTests, p.results, pat?.sex);
  const u: Record<string,unknown> = { patient_id: p.patientId, tests, notes: p.notes ?? null, referred_by: p.referredBy ?? null };
  if (p.status) { u.status = p.status; u.completed_at = p.status === 'completed' ? new Date().toISOString() : null; }
  const { data, error } = await s.from('lab_reports').update(u).eq('id', id).select().single();
  if (error) throw new Error(`Failed to save report: ${error.message}`);
  return data;
}

export async function updateReport(id: string, u: { tests?: SelectedTest[]; status?: 'pending'|'completed'; discount?: number; notes?: string }) {
  const s = createSupabaseBrowserClient();
  const d: Record<string,unknown> = { ...u };
  if (u.status === 'completed') d.completed_at = new Date().toISOString();
  else if (u.status === 'pending') d.completed_at = null;
  const { data, error } = await s.from('lab_reports').update(d).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update report: ${error.message}`);
  return data;
}

export async function deleteReport(id: string) {
  const s = createSupabaseBrowserClient();
  const { error } = await s.from('lab_reports').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete report: ${error.message}`);
}

const nkey = (v: string|null|undefined) => (v ?? '').trim().toUpperCase();

async function hydrateReportTests(rpts: SelectedTest[]) {
  if (!rpts.length) return [];
  const cat = await getTestCatalog().catch(() => []);
  const byId   = new Map(cat.map(t => [t.id, t]));
  const byCode = new Map(cat.map(t => [nkey(t.code), t]));
  const byName = new Map(cat.map(t => [nkey(t.name), t]));
  // Flat parameter map for rescuing stale snapshots (empty unit / normal_range)
  const paramByName = new Map<string, TestParameter>();
  for (const t of cat) for (const p of t.parameters ?? []) paramByName.set(nkey(p.name), p);

  return rpts.map(st => {
    const snap  = st.test ? normalizeTestCatalogEntry(st.test) : undefined;
    const match = byId.get(st.testId)
      ?? (snap?.code ? byCode.get(nkey(snap.code)) : undefined)
      ?? (snap?.name ? byName.get(nkey(snap.name)) : undefined);
    return { ...st, test: mergeSnap(snap, match, paramByName) };
  });
}

function mergeSnap(snap: TestCatalog|undefined, cat: TestCatalog|undefined, paramByName?: Map<string, TestParameter>) {
  if (!snap && !cat) return undefined;
  if (!snap) return cat;
  if (!cat) {
    // Rescue stale snapshot parameters using cross-catalog flat lookup
    if (!paramByName) return snap;
    return {
      ...snap,
      parameters: (snap.parameters ?? []).map(p => {
        if (p.unit && p.normal_range) return p; // already complete
        const fresh = paramByName.get(nkey(p.name));
        if (!fresh) return p;
        return { ...fresh, ...p, unit: (p.unit || fresh.unit) ?? '', normal_range: (p.normal_range || fresh.normal_range) ?? '\u2014' };
      }),
    };
  }
  const sp = snap.parameters ?? [];
  const cp = cat.parameters  ?? [];
  const cpId = new Map(cp.map(p => [p.id,       p]));
  const cpNm = new Map(cp.map(p => [nkey(p.name), p]));
  const merged = sp.length ? sp.map(p => {
    const c = cpId.get(p.id) ?? cpNm.get(nkey(p.name));
    return { ...(c ?? {}), ...p, unit: (p.unit || c?.unit) ?? '', normal_range: (p.normal_range || c?.normal_range) ?? '\u2014', male_normal_range: p.male_normal_range ?? c?.male_normal_range, female_normal_range: p.female_normal_range ?? c?.female_normal_range };
  }) : cp;
  return normalizeTestCatalogEntry({ ...snap, ...cat, parameters: merged });
}
