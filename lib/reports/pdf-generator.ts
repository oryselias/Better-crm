import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type SupabaseClient } from "@supabase/supabase-js";
import { evaluateReferenceRange, normalizeTestCatalogEntry } from "@/lib/reports/reference-ranges";
import { countResultParameters, isSegmentParameter, shouldShowSegmentHeader } from "@/lib/reports/catalog-parameters";

interface ClinicInfo {
  name: string | null;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  logo_url?: string | null;
}

let cachedLogoBuffer: Buffer | null = null;
let cachedLogoUrl: string | null = null;

interface GenerateReportOptions {
  reportId?: string;
  paperSize?: "A4" | "A5";
  supabaseClient?: SupabaseClient;
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
          defaultValue?: string;
          formula?: string;
          is_segment?: boolean;
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
      defaultValue?: string;
      formula?: string;
      is_segment?: boolean;
    }>;
  };
  price?: number;
  results?: Array<{ parameterId: string; value: string | number; isAbnormal?: boolean }>;
};

// Color palette — Grayscale / Black & White
const C = {
  primary: "#000000",
  banner: "#000000",
  gray: "#6b7280",
  light: "#f3f4f6",
  abnormal: "#000000",
  abnormalBg: "#ffffff",
  critical: "#000000",
  criticalBg: "#ffffff",
};

export async function generateLabReportPDF(opts: GenerateReportOptions): Promise<GenerateReportResult> {
  try {
    let report = opts.reportData;
    if (!report) {
      if (!opts.reportId) return { success: false, error: "Report not found" };
      const s = opts.supabaseClient ?? createSupabaseAdminClient();
      const { data, error } = await s
        .from("lab_reports")
        .select(`*, patient:patients(full_name,age,sex,phone), clinic:clinics(name,tagline,address,phone,logo_url)`)
        .eq("id", opts.reportId)
        .single();

      if (error) {
        return { success: false, error: `Database error: ${error.message}` };
      }
      if (!data) {
        return { success: false, error: "Report not found" };
      }
      report = data;
    }
    if (!report) return { success: false, error: "Report not found" };

    const paperSize = opts.paperSize ?? "A4";
    const reportTests = await hydrateReportTests(report.tests ?? [], report.clinic_id);
    const clinic: ClinicInfo = report.clinic ?? { name: null };

    // Fetch logo buffer if available and cache it
    let logoBuffer = null;
    if (clinic.logo_url) {
      if (cachedLogoUrl === clinic.logo_url && cachedLogoBuffer) {
        logoBuffer = cachedLogoBuffer;
      } else {
        logoBuffer = await fetch(clinic.logo_url)
          .then(r => r.arrayBuffer())
          .then(b => Buffer.from(b))
          .catch(() => null);
        if (logoBuffer) {
          cachedLogoBuffer = logoBuffer;
          cachedLogoUrl = clinic.logo_url;
        }
      }
    }

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
      const c1 = sx + 10;
      const c3 = sx + cw * 0.72;
      const qrX = sx + cw * 0.42;

      infoCell(doc, "Name", pName, c1, bT + 8);
      infoCell(doc, "Patient No", (report.patient as { id?: string })?.id?.slice(0, 8).toUpperCase() ?? "N/A", c1, bT + 20);
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
      param: Math.floor(pw * 0.38),
      value: Math.floor(pw * 0.16),
      unit: Math.floor(pw * 0.16),
      range: 0,
    };
    colW.range = pw - colW.param - colW.value - colW.unit;

    const padX = 5, padY = 5;
    const mH = (t: string, w: string | number, f: string, s: number, a: "left" | "center" = "left") => {
      doc.font(f).fontSize(s);
      return doc.heightOfString(t || "—", { width: Math.max(Number(w) - padX * 2, 10), align: a }) + padY * 2;
    };

    const drawTableHeader = (y: number) => {
      doc.fillColor(C.primary).fontSize(9).font("Helvetica-Bold");
      doc.text("TEST DESCRIPTION", sx + 5, y + 6, { width: colW.param - 5 });
      doc.text("RESULT", sx + colW.param + 5, y + 6, { width: colW.value - 10, align: "center" });
      doc.text("UNIT", sx + colW.param + colW.value + 5, y + 6, { width: colW.unit - 10, align: "center" });
      doc.text("REFERENCE RANGE", sx + colW.param + colW.value + colW.unit + 5, y + 6, { width: colW.range - 10, align: "center" });
      doc.moveTo(sx, y + 22).lineTo(sx + pw, y + 22).lineWidth(0.5).strokeColor("#000000").stroke();
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
      const resultParamCount = countResultParameters(params);
      let testHeight = 0;

      const hasParamValue = (p: (typeof params)[number]) => {
        const r = resolveResult(p.id, results, resultParamCount);
        const raw = r?.value?.toString() ?? "—";
        return raw !== "—" && raw.trim() !== "";
      };

      if (resultParamCount === 0 && !params.length) {
        const v = results[0]?.value?.toString() ?? "—";
        if (v !== "—" && v.trim() !== "") testHeight = 20;
        return testHeight;
      }

      if (!params.some((p) => !isSegmentParameter(p) && hasParamValue(p))) return 0;

      if (resultParamCount > 1) testHeight += 20;

      for (let i = 0; i < params.length; i++) {
        const p = params[i];
        if (isSegmentParameter(p)) {
          if (shouldShowSegmentHeader(params, i, (parameter) => hasParamValue(parameter))) {
            testHeight += 18;
          }
          continue;
        }
        if (!hasParamValue(p)) continue;

        const r = resolveResult(p.id, results, resultParamCount);
        const ev = evaluateReferenceRange(p, r?.value ?? "", report.patient?.sex);
        const abn = ev.isAbnormal || r?.isAbnormal === true;
        const lbl = resultParamCount <= 1 || tn.trim().toLowerCase() === p.name.trim().toLowerCase() ? tn : p.name;
        const valStr = r?.value?.toString().trim() || "—";
        const unitStr = p.unit || "—";
        const fontParam = resultParamCount <= 1 ? "Helvetica-Bold" : "Helvetica";
        const fontVal = abn ? "Helvetica-Bold" : (resultParamCount <= 1 ? "Helvetica-Bold" : "Helvetica");
        const paramPadX = resultParamCount > 1 ? padX + 8 : padX;
        testHeight += Math.max(20,
          mH(lbl, colW.param - (paramPadX - padX), fontParam, 9),
          mH(valStr, colW.value, fontVal, 9, "center"),
          mH(unitStr, colW.unit, "Helvetica", 9, "center"),
          mH(ev.referenceRange ?? "—", colW.range, "Helvetica", 9, "center")
        );
      }
      return testHeight;
    };

    const drawDeptHeader = (name: string) => {
      if (doc.y + 20 > uY()) { newPage(); doc.y = drawTableHeader(doc.y); }
      const dy = doc.y;
      doc.fillColor(C.primary).fontSize(9).font("Helvetica-Bold")
        .text(name.toUpperCase(), sx + 5, dy + 5, { width: pw - 10, align: "center" });
      doc.y = dy + 20;
      doc.fillColor("#000");
    };

    /** Height of the patient-info box drawn at the top of each page (drawPatientInfo). */
    const PATIENT_INFO_BOX_HEIGHT = 96;
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

        const resultParamCount = countResultParameters(params);
        const hasParamValue = (p: (typeof params)[number]) => {
          const r = resolveResult(p.id, results, resultParamCount);
          const raw = r?.value?.toString() ?? "—";
          return raw !== "—" && raw.trim() !== "";
        };

        const testHeight = getTestHeight(st);
        if (testHeight === 0) continue; // Skip test entirely if no results

        if (doc.y + testHeight > uY() && testHeight <= contentSpace) {
          newPage(); doc.y = drawTableHeader(doc.y);
        }

        if (resultParamCount === 0 && !params.length) {
          const v = results[0]?.value?.toString() ?? "—";
          if (doc.y + 20 > uY()) { newPage(); doc.y = drawTableHeader(doc.y); }
          const ry = doc.y;
          doc.fillColor("#374151").fontSize(9).font("Helvetica-Bold").text(tn, sx + 5, ry + 5, { width: colW.param - 5 });
          doc.fillColor("#111827").font("Helvetica").text(v, sx + colW.param + 5, ry + 5, { width: colW.value - 10, align: "center" });
          doc.y = ry + 20; ri++;
          continue;
        }

        if (resultParamCount > 1) {
          if (doc.y + 20 > uY()) { newPage(); doc.y = drawTableHeader(doc.y); }
          const ry = doc.y;
          doc.fillColor("#374151").fontSize(9).font("Helvetica-Bold").text(tn, sx + 5, ry + 6, { width: pw });
          doc.y = ry + 20;
          doc.fillColor("#000");
        }

        for (let i = 0; i < params.length; i++) {
          const p = params[i];

          if (isSegmentParameter(p)) {
            if (!shouldShowSegmentHeader(params, i, (parameter) => hasParamValue(parameter))) continue;
            if (doc.y + 18 > uY()) { newPage(); doc.y = drawTableHeader(doc.y); }
            const ry = doc.y;
            const paramPadX = resultParamCount > 1 ? padX + 8 : padX;
            doc.fillColor("#374151").fontSize(9).font("Helvetica-Bold")
              .text(p.name, sx + paramPadX, ry + padY, { width: colW.param - paramPadX * 2 });
            doc.y = ry + 18;
            doc.fillColor("#000");
            continue;
          }

          if (!hasParamValue(p)) continue;

          const r = resolveResult(p.id, results, resultParamCount);
          const raw = r?.value?.toString() ?? "—";
          const ev = evaluateReferenceRange(p, r?.value ?? "", report.patient?.sex);
          const abn = ev.isAbnormal || r?.isAbnormal === true;
          const crit = ev.status === "critical_low" || ev.status === "critical_high";
          const lbl = resultParamCount <= 1 || tn.trim().toLowerCase() === p.name.trim().toLowerCase()
            ? tn
            : p.name;
          const valStr = raw !== "—" ? `${raw}`.trim() : "—";
          const unitStr = p.unit || "—";

          const fontParam = resultParamCount <= 1 ? "Helvetica-Bold" : "Helvetica";
          const fontVal = abn ? "Helvetica-Bold" : (resultParamCount <= 1 ? "Helvetica-Bold" : "Helvetica");
          const fontUnit = "Helvetica";
          const fontRange = "Helvetica";

          const colorParam = resultParamCount <= 1 ? "#374151" : "#111827";
          const colorVal = crit ? C.critical : abn ? C.abnormal : (resultParamCount <= 1 ? "#374151" : "#111827");
          const colorUnit = "#111827";
          const colorRange = C.gray;

          const paramPadX = resultParamCount > 1 ? padX + 8 : padX;
          const rh = Math.max(20,
            mH(lbl, colW.param - (paramPadX - padX), fontParam, 9),
            mH(valStr, colW.value, fontVal, 9, "center"),
            mH(unitStr, colW.unit, fontUnit, 9, "center"),
            mH(ev.referenceRange ?? "—", colW.range, fontRange, 9, "center")
          );

          if (doc.y + rh > uY()) { newPage(); doc.y = drawTableHeader(doc.y); }
          const ry = doc.y;

          doc.fillColor(colorParam).fontSize(9).font(fontParam)
            .text(lbl, sx + paramPadX, ry + padY, { width: colW.param - paramPadX * 2 });
          doc.fillColor(colorVal).font(fontVal)
            .text(valStr, sx + colW.param + padX, ry + padY, { width: colW.value - padX * 2, align: "center" });
          doc.fillColor(colorUnit).font(fontUnit)
            .text(unitStr, sx + colW.param + colW.value + padX, ry + padY, { width: colW.unit - padX * 2, align: "center" });
          doc.fillColor(colorRange).font(fontRange)
            .text(ev.referenceRange ?? "—", sx + colW.param + colW.value + colW.unit + padX, ry + padY, { width: colW.range - padX * 2, align: "center" });

          // Draw red up/down arrow if abnormal and not empty
          if (abn && valStr !== "—") {
            const isHigh = ev.status.includes("high");
            const isLow = ev.status.includes("low");
            if (isHigh || isLow) {
              doc.font(fontVal).fontSize(9);
              const valW = doc.widthOfString(valStr);
              const cx = sx + colW.param + colW.value / 2;
              const arrowX = cx + valW / 2 + 4;
              const arrowY = ry + padY + 0.5;

              doc.save();
              doc.fillColor("#dc2626"); // Red color for abnormal arrow
              if (isHigh) {
                doc.rect(arrowX + 2, arrowY + 4, 2, 4).fill();
                doc.moveTo(arrowX, arrowY + 4)
                   .lineTo(arrowX + 6, arrowY + 4)
                   .lineTo(arrowX + 3, arrowY)
                   .closePath()
                   .fill();
              } else {
                doc.rect(arrowX + 2, arrowY, 2, 4).fill();
                doc.moveTo(arrowX, arrowY + 4)
                   .lineTo(arrowX + 6, arrowY + 4)
                   .lineTo(arrowX + 3, arrowY + 8)
                   .closePath()
                   .fill();
              }
              doc.restore();
            }
          }

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

      footer();

      return new Promise(res => {
        doc.on("end", () => res({ success: true, pdfBuffer: Buffer.concat(chunks.map(c => Buffer.from(c))) }));
        doc.on("error", e => { 
          const d = doc as { destroy?: () => void; end: () => void };
          if (typeof d.destroy === "function") d.destroy(); 
          else d.end(); 
          res({ success: false, error: e.message }); 
        });
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
    const labelWidth = doc.widthOfString(`${label}  :`);
    doc.fillColor("#111827").fontSize(9).font("Helvetica-Bold")
      .text(value, x + labelWidth, y, { lineBreak: false });
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
          is_segment: p.is_segment ?? c?.is_segment,
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

  export async function uploadGeneratedReport(id: string, opts?: { paperSize?: "A4" | "A5"; supabaseClient?: SupabaseClient }): Promise<GenerateReportResult> {
    const r = await generateLabReportPDF({ reportId: id, supabaseClient: opts?.supabaseClient, ...(opts ?? {}) });
    if (!r.success || !r.pdfBuffer) return r;
    const s = opts?.supabaseClient ?? createSupabaseAdminClient();
    const { error } = await s.storage.from("lab-reports")
      .upload(`generated/${id}.pdf`, r.pdfBuffer, { contentType: "application/pdf", upsert: true });
    return error ? { success: false, error: error.message } : { success: true };
  }
