import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { evaluateReferenceRange, normalizeTestCatalogEntry } from "@/lib/reports/reference-ranges";

interface ClinicInfo {
  name: string | null;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  logo_url?: string | null;
}

interface GenerateReportOptions {
  reportId?: string;
  paperSize?: "A4" | "A5";
  reportData?: {
    id: string;
    clinic_id?: string;
    created_at: string;
    report_no: number | null;
    tests: Array<{
      testId: string;
      test?: {
        name: string;
        code?: string;
        parameters?: Array<{
          id: string; name: string; unit: string; normal_range: string;
          type?: "numeric" | "text" | "boolean" | "select";
          min_value?: number; max_value?: number;
          min_inclusive?: boolean; max_inclusive?: boolean;
          male_min_value?: number; male_max_value?: number;
          female_min_value?: number; female_max_value?: number;
          male_normal_range?: string; female_normal_range?: string;
          selectOptions?: string[];
        }>;
      };
      results?: Array<{ parameterId: string; value: string | number; isAbnormal?: boolean }>;
    }>;
    patient?: { full_name: string | null; age: number | null; sex: string | null; phone: string | null };
    clinic?: ClinicInfo;
    referred_by?: string | null;
  };
}

interface GenerateReportResult { success: boolean; pdfBuffer?: Buffer; error?: string }

type ReportTestSnapshot = {
  testId: string;
  test?: {
    id?: string; name: string; code?: string; category?: string | null; price?: number;
    description?: string | null;
    parameters?: Array<{
      id: string; name: string; unit: string; normal_range: string;
      type?: "numeric" | "text" | "boolean" | "select";
      min_value?: number; max_value?: number;
      min_inclusive?: boolean; max_inclusive?: boolean;
      male_min_value?: number; male_max_value?: number;
      female_min_value?: number; female_max_value?: number;
      male_normal_range?: string; female_normal_range?: string;
      selectOptions?: string[];
    }>;
  };
  price?: number;
  results?: Array<{ parameterId: string; value: string | number; isAbnormal?: boolean }>;
};

// Color palette — maroon/burgundy to match demo
const C = {
  primary: "#8B1A1A",
  banner: "#1f1f1f",
  gray: "#6b7280",
  light: "#f3f4f6",
  abnormal: "#dc2626",
  abnormalBg: "#fef2f2",
  critical: "#7c3aed",
  criticalBg: "#f5f3ff",
};

export async function generateLabReportPDF(opts: GenerateReportOptions): Promise<GenerateReportResult> {
  try {
    let report = opts.reportData;
    if (!report) {
      if (!opts.reportId) return { success: false, error: "Report not found" };
      const s = createSupabaseAdminClient();
      console.log('[PDF Generator] Fetching report:', opts.reportId);
      const { data, error } = await s
        .from("lab_reports")
        .select(`*, patient:patients(full_name,age,sex,phone), clinic:clinics(name,tagline,address,phone,logo_url)`)
        .eq("id", opts.reportId)
        .single();

      console.log('[PDF Generator] Query result - data:', !!data, 'error:', error);
      if (error) {
        console.error('[PDF Generator] Supabase error:', error.message, 'Details:', error.details);
        return { success: false, error: `Database error: ${error.message}` };
      }
      if (!data) {
        console.error('[PDF Generator] No data returned for report:', opts.reportId);
        return { success: false, error: "Report not found" };
      }
      report = data;
    }
    if (!report) return { success: false, error: "Report not found" };

    const paperSize = opts.paperSize ?? "A4";
    const reportTests = await hydrateReportTests(report.tests ?? [], report.clinic_id);
    const clinic: ClinicInfo = report.clinic ?? { name: null };

    // Fetch logo buffer if available
    const logoBuffer = clinic.logo_url
      ? await fetch(clinic.logo_url)
        .then(r => r.arrayBuffer())
        .then(b => Buffer.from(b))
        .catch(() => null)
      : null;

    // Always print without generated header — clinics use their own pre-printed letterhead.
    // 140pt top (~49mm) clears the letterhead area; 90pt bottom clears the pre-printed footer.
    const marginObj = { top: 140, bottom: 90, left: 50, right: 50 };
    const doc = new PDFDocument({ margins: marginObj, size: paperSize });
    const chunks: Uint8Array[] = [];
    doc.on("data", c => chunks.push(c));

    const sx = doc.page.margins.left;
    const cw = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const fY = () => doc.page.height - doc.page.margins.bottom - 12;
    const uY = () => fY() - 12;

    // PATIENT DATA PREP
    const pName = report.patient?.full_name ?? "Unknown";
    const pAge = report.patient?.age !== null && report.patient?.age !== undefined
      ? `${report.patient.age}Y`
      : "N/A";
    const pSex = ((report.patient?.sex ?? "N/A").charAt(0).toUpperCase() + (report.patient?.sex ?? "").slice(1)) || "N/A";
    const rDate = new Date(report.created_at ?? Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const rNo = report.report_no ? `${report.report_no}` : (report.id ?? opts.reportId ?? "").slice(0, 6).toUpperCase();
    const refBy = report.referred_by ?? "Self";
    const qr = await genQR(`https://bettercrm.com/verify/${opts.reportId ?? report.id}`);

    const drawPatientInfo = () => {
      const bT = doc.y;
      const boxH = 80;
      doc.rect(sx, bT, cw, boxH).fill(C.light);
      const c1 = sx + 10;
      const c3 = sx + cw * 0.72;
      const qrX = sx + cw * 0.42;

      infoCell(doc, "Name", pName, c1, bT + 8);
      infoCell(doc, "Patient No", rNo, c1, bT + 20);
      infoCell(doc, "Age / Gender", `${pAge} / ${pSex}`, c1, bT + 32);
      infoCell(doc, "Bill No", rNo, c1, bT + 44);
      infoCell(doc, "Referred By", refBy, c1, bT + 56);

      if (qr) doc.image(qr, qrX, bT + 8, { width: 58, height: 58 });

      infoCell(doc, "Registered Date", rDate, c3, bT + 8);
      infoCell(doc, "Reported Date", rDate, c3, bT + 20);
      infoCell(doc, "Report Printed on", new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), c3, bT + 32);

      // Extra gap after patient info box so test table doesn't ride up against it
      doc.y = bT + boxH + 16;
    };

    const footer = () => {
      // Empty footer; removing default text as requested.
    };

    const newPage = () => {
      footer();
      doc.addPage({ margins: marginObj, size: paperSize });
      drawPatientInfo();
    };

    // ── PATIENT INFO BOX ────────────────────────────────────────────────
    drawPatientInfo();

    // ── TEST TABLE ──────────────────────────────────────────────────────
    const pw = cw;
    const colW = {
      param: Math.floor(pw * 0.45),
      value: Math.floor(pw * 0.25),
      range: 0,
    };
    colW.range = pw - colW.param - colW.value;

    const padX = 5, padY = 5;
    const mH = (t: string, w: string | number, f: string, s: number, a: "left" | "center" = "left") => {
      doc.font(f).fontSize(s);
      return doc.heightOfString(t || "—", { width: Math.max(Number(w) - padX * 2, 10), align: a }) + padY * 2;
    };

    const drawTableHeader = (y: number) => {
      doc.rect(sx, y, pw, 22).fill(C.primary);
      doc.fillColor("#fff").fontSize(9).font("Helvetica-Bold");
      doc.text("TEST DESCRIPTION", sx + 5, y + 6, { width: colW.param });
      doc.text("RESULT", sx + colW.param + 5, y + 6, { width: colW.value, align: "center" });
      doc.text("REFERENCE RANGE", sx + colW.param + colW.value + 5, y + 6, { width: colW.range, align: "center" });
      return y + 22;
    };

    doc.y = drawTableHeader(doc.y);

    const deptMap = new Map<string, typeof reportTests>();
    for (const t of reportTests) {
      const d = t.test?.category ?? "Other";
      if (!deptMap.has(d)) deptMap.set(d, []);
      deptMap.get(d)!.push(t);
    }

    const getTestHeight = (st: typeof reportTests[0]) => {
      const tn = st.test?.name ?? "Unknown Test";
      const params = st.test?.parameters ?? [];
      const results = st.results ?? [];
      let testHeight = 0;
      if (!params.length) {
        testHeight = 20;
      } else {
        if (params.length > 1) testHeight += 20;
        for (const p of params) {
          const r = resolveResult(p.id, results, params.length);
          const raw = r?.value?.toString() ?? "—";
          const ev = evaluateReferenceRange(p, r?.value ?? "", report.patient?.sex);
          const abn = ev.isAbnormal || r?.isAbnormal === true;
          const lbl = params.length <= 1 || tn.trim().toLowerCase() === p.name.trim().toLowerCase() ? tn : p.name;
          const arrow = abn ? (ev.status.includes("low") ? " (L)" : " (H)") : "";
          const dv = raw !== "—" ? `${raw} ${p.unit ?? ""}${arrow}`.trim() : "—";
          const rf = abn ? "Helvetica-Bold" : (params.length <= 1 ? "Helvetica-Bold" : "Helvetica");
          const paramPadX = params.length > 1 ? padX + 8 : padX;
          testHeight += Math.max(20,
            mH(lbl, colW.param - (paramPadX - padX), rf, 9),
            mH(dv, colW.value, rf, 9, "center"),
            mH(ev.referenceRange ?? "—", colW.range, rf, 9, "center")
          );
        }
      }
      return testHeight;
    };

    const drawDeptHeader = (name: string) => {
      if (doc.y + 20 > uY()) { newPage(); doc.y = drawTableHeader(doc.y); }
      const dy = doc.y;
      doc.rect(sx, dy, pw, 20).fill("#f8f8f8");
      doc.strokeColor("#d1d5db").lineWidth(0.5).rect(sx, dy, pw, 20).stroke();
      doc.fillColor(C.primary).fontSize(9).font("Helvetica-Bold")
        .text(name.toUpperCase(), sx + 5, dy + 5, { width: pw - 10, align: "center" });
      doc.y = dy + 20;
      doc.fillColor("#000");
    };

    /** Height of the patient-info box drawn at the top of each page (drawPatientInfo). */
    const PATIENT_INFO_BOX_HEIGHT = 86;
    /** Height of the table-header row drawn by drawTableHeader. */
    const TABLE_HEADER_HEIGHT = 22;
    let ri = 0;
    const contentSpace = uY() - marginObj.top - PATIENT_INFO_BOX_HEIGHT - TABLE_HEADER_HEIGHT;

    for (const [dept, tests] of deptMap) {
      if (tests.length > 0) {
        const firstTestHeight = getTestHeight(tests[0]);
        if (doc.y + 20 + firstTestHeight > uY() && (20 + firstTestHeight) <= contentSpace) {
          newPage(); doc.y = drawTableHeader(doc.y);
        }
      }

      drawDeptHeader(dept);
      for (const st of tests) {
        const tn = st.test?.name ?? "Unknown Test";
        const params = st.test?.parameters ?? [];
        const results = st.results ?? [];

        const testHeight = getTestHeight(st);

        if (doc.y + testHeight > uY() && testHeight <= contentSpace) {
          newPage(); doc.y = drawTableHeader(doc.y);
        }

        if (!params.length) {
          const v = results[0]?.value?.toString() ?? "—";
          if (doc.y + 20 > uY()) { newPage(); doc.y = drawTableHeader(doc.y); }
          const ry = doc.y;
          if (ri % 2 === 1) doc.rect(sx, ry, pw, 20).fill(C.light);
          doc.rect(sx, ry, pw, 20).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
          doc.fillColor("#374151").fontSize(9).font("Helvetica-Bold").text(tn, sx + 5, ry + 5, { width: colW.param });
          doc.fillColor("#111827").font("Helvetica").text(v, sx + colW.param + 5, ry + 5, { width: colW.value, align: "center" });
          doc.y = ry + 20; ri++;
          continue;
        }

        if (params.length > 1) {
          if (doc.y + 20 > uY()) { newPage(); doc.y = drawTableHeader(doc.y); }
          const ry = doc.y;
          doc.rect(sx, ry, pw, 20).fill("#f8fbff");
          doc.rect(sx, ry, pw, 20).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
          doc.fillColor("#374151").fontSize(9).font("Helvetica-Bold").text(tn, sx + 5, ry + 6, { width: pw });
          doc.y = ry + 20;
          doc.fillColor("#000");
        }

        for (const p of params) {
          const r = resolveResult(p.id, results, params.length);
          const raw = r?.value?.toString() ?? "—";
          const ev = evaluateReferenceRange(p, r?.value ?? "", report.patient?.sex);
          const abn = ev.isAbnormal || r?.isAbnormal === true;
          const crit = ev.status === "critical_low" || ev.status === "critical_high";
          const lbl = params.length <= 1 || tn.trim().toLowerCase() === p.name.trim().toLowerCase()
            ? tn
            : p.name;
          const arrow = abn ? (ev.status.includes("low") ? " (L)" : " (H)") : "";
          const dv = raw !== "—" ? `${raw} ${p.unit ?? ""}${arrow}`.trim() : "—";
          const rc = crit ? C.critical : abn ? C.abnormal : (params.length <= 1 ? "#374151" : "#111827");
          const rf = abn ? "Helvetica-Bold" : (params.length <= 1 ? "Helvetica-Bold" : "Helvetica");

          const paramPadX = params.length > 1 ? padX + 8 : padX;
          const rh = Math.max(20,
            mH(lbl, colW.param - (paramPadX - padX), rf, 9),
            mH(dv, colW.value, rf, 9, "center"),
            mH(ev.referenceRange ?? "—", colW.range, rf, 9, "center")
          );

          if (doc.y + rh > uY()) { newPage(); doc.y = drawTableHeader(doc.y); }
          const ry = doc.y;

          if (crit) doc.rect(sx, ry, pw, rh).fill(C.criticalBg);
          else if (abn) doc.rect(sx, ry, pw, rh).fill(C.abnormalBg);
          else if (ri % 2 === 1) doc.rect(sx, ry, pw, rh).fill(C.light);
          doc.rect(sx, ry, pw, rh).strokeColor("#e5e7eb").lineWidth(0.5).stroke();

          doc.fillColor(rc).fontSize(9).font(rf)
            .text(lbl, sx + paramPadX, ry + padY, { width: colW.param - paramPadX * 2 });
          doc.fillColor(rc).font(rf)
            .text(dv, sx + colW.param + padX, ry + padY, { width: colW.value - padX * 2, align: "center" });
          doc.fillColor(abn ? rc : C.gray).font(abn ? "Helvetica-Bold" : "Helvetica")
            .text(ev.referenceRange ?? "—", sx + colW.param + colW.value + padX, ry + padY, { width: colW.range - padX * 2, align: "center" });

          doc.y = ry + rh;
          doc.fillColor("#000");
          ri++;
        }
      }
      }

      if (doc.y + 40 > uY()) {
        newPage();
        doc.y = drawTableHeader(doc.y);
        doc.moveDown(1.5);
      } else {
        doc.moveDown(1.5);
      }

      doc.fillColor(C.gray).fontSize(10).font("Helvetica-Bold")
        .text("End of Report!", sx, doc.y, { align: "center", width: cw });

      footer();

      return new Promise(res => {
        doc.on("end", () => res({ success: true, pdfBuffer: Buffer.concat(chunks.map(c => Buffer.from(c))) }));
        doc.on("error", e => { console.error("PDF error:", e); res({ success: false, error: e.message }); });
        doc.end();
      });
    } catch (e) {
      console.error("PDF generation error:", e);
      return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

async function hydrateReportTests(raw: ReportTestSnapshot[], _cid?: string) {
    const snaps = raw.map(r => ({
      ...r,
      test: r.test ? normalizeTestCatalogEntry({ ...r.test, code: r.test.code ?? "", parameters: r.test.parameters ?? [] }) : undefined,
    }));
    const missing = [...new Set(
      snaps.filter(s => !s.test?.name || s.test.parameters?.some(p => !p.normal_range && !p.male_normal_range))
        .map(s => s.testId).filter(Boolean)
    )];
    if (!missing.length) return snaps;
    const s = createSupabaseAdminClient();
    let q = s.from("test_catalog").select("id,name,code,category,description,is_active,parameters");
    q = q.in("id", missing);
    const { data, error } = await q;
    if (error) throw new Error(`Hydrate tests: ${error.message}`);
    const cat = (data ?? []).map(d => normalizeTestCatalogEntry({
      id: d.id, name: d.name, code: d.code,
      category: d.category, description: d.description,
      is_active: d.is_active, parameters: d.parameters ?? [],
    }));
    const byId = new Map(cat.map(t => [t.id, t]));
    const byCode = new Map(cat.map(t => [nk(t.code), t]));
    const byName = new Map(cat.map(t => [nk(t.name), t]));
    return snaps.map(snap => ({
      ...snap,
      test: mergeSnap(
        snap.test,
        byId.get(snap.testId)
        ?? (snap.test?.code ? byCode.get(nk(snap.test.code)) : undefined)
        ?? (snap.test?.name ? byName.get(nk(snap.test.name)) : undefined)
      ),
    }));
  }

  function infoCell(doc: InstanceType<typeof PDFDocument>, label: string, value: string, x: number, y: number) {
    doc.fillColor(C.gray).fontSize(8).font("Helvetica").text(`${label}  :`, x, y, { lineBreak: false });
    doc.fillColor("#111827").fontSize(9).font("Helvetica-Bold")
      .text(value, x + doc.widthOfString(`${label}  :`), y, { lineBreak: false });
  }


  function resolveResult(pid: string, res: Array<{ parameterId: string; value: string | number; isAbnormal?: boolean }>, pc: number) {
    const m = res.find(r => r.parameterId === pid);
    return m ?? (pc === 1 && res.length === 1 ? res[0] : undefined);
  }

  function mergeSnap(snap: ReportTestSnapshot["test"], cat: ReportTestSnapshot["test"]) {
    if (!snap && !cat) return undefined;
    if (!snap) return cat;
    if (!cat) return snap;
    const sp = snap.parameters ?? [], cp = cat.parameters ?? [];
    const ci = new Map(cp.map(p => [p.id, p]));
    const cn = new Map(cp.map(p => [nk(p.name), p]));
    return normalizeTestCatalogEntry({
      ...snap, ...cat, price: snap.price ?? cat.price,
      parameters: sp.length ? sp.map(p => {
        const c = ci.get(p.id) ?? cn.get(nk(p.name));
        return {
          ...(c ?? {}), ...p,
          unit: (p.unit || c?.unit) ?? "",
          normal_range: (p.normal_range || c?.normal_range) ?? "—",
          type: (p.type || c?.type) ?? "text",
          min_value: p.min_value ?? c?.min_value,
          max_value: p.max_value ?? c?.max_value,
          min_inclusive: p.min_inclusive ?? c?.min_inclusive,
          max_inclusive: p.max_inclusive ?? c?.max_inclusive,
          male_min_value: p.male_min_value ?? c?.male_min_value,
          male_max_value: p.male_max_value ?? c?.male_max_value,
          female_min_value: p.female_min_value ?? c?.female_min_value,
          female_max_value: p.female_max_value ?? c?.female_max_value,
          male_normal_range: p.male_normal_range ?? c?.male_normal_range,
          female_normal_range: p.female_normal_range ?? c?.female_normal_range,
        };
      }) : cp,
    });
  }

  const nk = (v: string | null | undefined) => (v ?? "").trim().toUpperCase();

  async function genQR(text: string): Promise<Buffer | null> {
    try {
      const u = await QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, width: 80 });
      return Buffer.from(u.split(",")[1], "base64");
    } catch {
      return null;
    }
  }

  export async function uploadGeneratedReport(id: string, opts?: { paperSize?: "A4" | "A5" }): Promise<GenerateReportResult> {
    const r = await generateLabReportPDF({ reportId: id, ...(opts ?? {}) });
    if (!r.success || !r.pdfBuffer) return r;
    const s = createSupabaseAdminClient();
    const { error } = await s.storage.from("lab-reports")
      .upload(`generated/${id}.pdf`, r.pdfBuffer, { contentType: "application/pdf", upsert: true });
    return error ? { success: false, error: error.message } : { success: true };
  }
