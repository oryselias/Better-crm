export type SupportedSex = "male" | "female" | "other" | "unknown" | string | null | undefined;

export type ReferenceRangeParameter = {
  name: string;
  normal_range?: string | null;
  normalRange?: string | null;
  male_normal_range?: string; female_normal_range?: string;
  normalRangeMale?: string; normalRangeFemale?: string;
};

export type ReferenceRangeStatus = "normal"|"low"|"high"|"positive"|"negative"|"inconclusive"|"unknown";

type ParameterLike = ReferenceRangeParameter & { id?: string; unit?: string };
type TestLike<TParam extends ParameterLike = ParameterLike> = { name: string; code?: string | null; parameters: TParam[] };
type NumericBounds = { min?: number; max?: number; minInclusive?: boolean; maxInclusive?: boolean };

const NEG = ["negative","non-reactive","non reactive","nonreactive","not detected","absent","nil","none","normal"];
const POS = ["positive","reactive","detected","present"];
const INCON = ["equivocal","inconclusive","indeterminate","borderline","weakly positive","weak positive"];

const OVERRIDES: Record<string, Record<string, Partial<ParameterLike>>> = {
  CBC: {
    HEMOGLOBIN:                      { male_normal_range:"13-18", female_normal_range:"12-16" },
    "TOTAL LEUCOCYTE COUNT (TLC)":   { normal_range:"4000-11000" },
    "NEUTROPHILS (POLYMORPHS)":      { normal_range:"50-70" },
    LYMPHOCYTES:                     { normal_range:"20-40" },
    EOSINOPHILS:                     { normal_range:"1-6" },
    MONOCYTES:                       { normal_range:"2-8" },
    BASOPHILS:                       { normal_range:"0-2" },
    "PLATELET COUNT":                { normal_range:"1.5-4.0" },
    LPCR:                            { normal_range:"11.9-66.9" },
    MPV:                             { normal_range:"8.6-15.5" },
    PDW:                             { normal_range:"8.3-25.0" },
    PCT:                             { normal_range:"0.15-0.62" },
    "TOTAL RBCS":                    { male_normal_range:"4.5-5.9", female_normal_range:"4.1-5.1" },
    "MCV (MEAN CELL VOLUME)":        { normal_range:"79-93" },
    "MCH (MEAN CORPUSCULAR HB)":     { normal_range:"26.7-31.9" },
    "MCHC (MEAN CORPUSCULAR HB CONC.)": { normal_range:"32-36" },
    "HCT (HEMATOCRIT)":              { male_normal_range:"40-52", female_normal_range:"36-46" },
    "RDW-SD":                        { normal_range:"37.0-54.0" },
    "RDW-CV":                        { normal_range:"11.5-14.5" },
  },
  LFT: {
    "SGPT (ALT)":           { normal_range:"4-36" },
    "SGOT (AST)":           { normal_range:"8-33" },
    "BILIRUBIN TOTAL":      { normal_range:"0.1-1.2" },
    "ALKALINE PHOSPHATASE": { normal_range:"20-130" },
  },
  LP: {
    "TOTAL CHOLESTEROL": { normal_range:"<200" },
    TRIGLYCERIDES:       { normal_range:"<150" },
    "HDL CHOLESTEROL":   { male_normal_range:">=40", female_normal_range:">=50" },
    "LDL CHOLESTEROL":   { normal_range:"<100" },
  },
};
OVERRIDES["LIPID"] = OVERRIDES.LP;

const norm = (p: ReferenceRangeParameter) => ({
  ...p,
  normal_range: p.normal_range ?? p.normalRange ?? null,
  male_normal_range: p.male_normal_range ?? p.normalRangeMale,
  female_normal_range: p.female_normal_range ?? p.normalRangeFemale,
});

const key = (v: string) => v.trim().toUpperCase();

// Priority: sex-specific range string → generic range string.
function bounds(p: ReferenceRangeParameter, sex?: SupportedSex): NumericBounds | null {
  const n = norm(p);
  const isMale   = sex === "male";
  const isFemale = sex === "female";

  if (isMale) {
    const b = parseBounds(n.male_normal_range ?? "");
    if (b) return b;
  }
  if (isFemale) {
    const b = parseBounds(n.female_normal_range ?? "");
    if (b) return b;
  }
  return parseBounds(n.normal_range ?? "");
}

function parseBounds(r: string): NumericBounds | null {
  const t = r.trim();
  if (!t) return null;
  const b = t.match(/(-?\d+(\.\d+)?)\s*(?:to|-)\s*(-?\d+(\.\d+)?)/i);
  if (b) return { min: +b[1], max: +b[3], minInclusive: true, maxInclusive: true };
  const lt = t.match(/^<=?\s*(-?\d+(\.\d+)?)/);
  if (lt) return { max: +lt[1], maxInclusive: t.startsWith("<=") };
  const gt = t.match(/^>=?\s*(-?\d+(\.\d+)?)/);
  if (gt) return { min: +gt[1], minInclusive: t.startsWith(">=") };
  return null;
}

function fmtBounds(b: NumericBounds) {
  if (typeof b.min === "number" && typeof b.max === "number") return `${b.min}-${b.max}`;
  if (typeof b.max === "number") return `${b.maxInclusive === false ? "<" : "≤"} ${b.max}`;
  if (typeof b.min === "number") return `${b.minInclusive === false ? ">" : "≥"} ${b.min}`;
  return "—";
}

function coerce(v: string | number | boolean): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const m = String(v).replace(/,/g, "").trim().match(/-?\d+(\.\d+)?/);
  return m ? (Number.isFinite(+m[0]) ? +m[0] : null) : null;
}

function hasQual(r: string) { const n = r.trim().toLowerCase(); return [...NEG,...POS,...INCON].some(t => n.includes(t)); }
function qLabels(r: string) { const n = r.toLowerCase(); const rr = n.includes("reactive"); return { negative: rr ? "Negative / Non-Reactive" : "Negative", positive: rr ? "Positive / Reactive" : "Positive" }; }
function qStatus(v: string) { const n = v.trim().toLowerCase(); if (!n) return "unknown"; if (INCON.some(t => n.includes(t))) return "inconclusive"; if (NEG.some(t => n.includes(t))) return "negative"; if (POS.some(t => n.includes(t))) return "positive"; return "unknown"; }
function inBounds(v: number, b: NumericBounds) {
  if (typeof b.min === "number" && (b.minInclusive === false ? v <= b.min : v < b.min)) return false;
  if (typeof b.max === "number" && (b.maxInclusive === false ? v >= b.max : v > b.max)) return false;
  return true;
}

export function resolveReferenceRange(p: ReferenceRangeParameter, sex?: SupportedSex): string {
  const n = norm(p);
  const b = bounds(n, sex);
  if (b) return fmtBounds(b);
  // Auto-build display when sex unknown but sex-specific fields exist
  if (n.male_normal_range && n.female_normal_range)
    return `M: ${n.male_normal_range} / F: ${n.female_normal_range}`;
  if (n.normal_range) return n.normal_range;
  return "—";
}

export function evaluateReferenceRange(p: ReferenceRangeParameter, raw: string | number | boolean | null | undefined, sex?: SupportedSex) {
  const n = norm(p);
  const ref = resolveReferenceRange(n, sex);
  if (!raw && raw !== 0) return { isAbnormal: false, status: "unknown" as const, flagLabel: "—", referenceRange: ref };
  const num = coerce(raw);
  const nb = bounds(n, sex) || parseBounds(ref);
  const isNum = num !== null && !!nb;
  if (isNum && num !== null) {
    if (hasQual(ref) && nb) { const l = qLabels(ref); const ok = inBounds(num, nb); return { isAbnormal: !ok, status: ok ? "negative" : "positive", flagLabel: ok ? l.negative : l.positive, referenceRange: ref }; }
    if (!nb?.min && !nb?.max && nb?.min !== 0 && nb?.max !== 0) return { isAbnormal: false, status: "unknown" as const, flagLabel: "—", referenceRange: ref };
    if (typeof nb?.min === "number" && (nb.minInclusive === false ? num <= nb.min : num < nb.min)) return { isAbnormal: true, status: "low" as const, flagLabel: "Low", referenceRange: ref };
    if (typeof nb?.max === "number" && (nb.maxInclusive === false ? num >= nb.max : num > nb.max)) return { isAbnormal: true, status: "high" as const, flagLabel: hasQual(ref) ? qLabels(ref).positive : "High", referenceRange: ref };
    return { isAbnormal: false, status: hasQual(ref) ? "negative" : "normal", flagLabel: hasQual(ref) ? qLabels(ref).negative : "Normal", referenceRange: ref };
  }
  // Text/qualitative evaluation
  const qs = qStatus(String(raw));
  const l = qLabels(ref);
  if (qs === "positive") return { isAbnormal: true, status: "positive" as const, flagLabel: l.positive, referenceRange: ref };
  if (qs === "negative") return { isAbnormal: false, status: "negative" as const, flagLabel: l.negative, referenceRange: ref };
  if (qs === "inconclusive") return { isAbnormal: true, status: "inconclusive" as const, flagLabel: "Inconclusive", referenceRange: ref };
  if (ref.trim().toLowerCase() && ref.trim().toLowerCase() !== "—" && String(raw).trim().toLowerCase() === ref.trim().toLowerCase()) return { isAbnormal: false, status: "normal" as const, flagLabel: "Normal", referenceRange: ref };
  return { isAbnormal: false, status: "unknown" as const, flagLabel: "—", referenceRange: ref };
}

export function normalizeTestCatalogEntry<T extends TestLike>(t: T): T {
  const ov = OVERRIDES[key(t.code ?? "")];
  if (!ov || !Array.isArray(t.parameters)) return t;
  return { ...t, parameters: t.parameters.map(p => {
    const n = norm(p) as T["parameters"][number];
    const o = ov[key(n.name)];
    return o ? norm({ ...n, ...o }) as T["parameters"][number] : n;
  }) };
}
