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

const norm = (p: ReferenceRangeParameter) => ({
  ...p,
  normal_range: p.normal_range ?? p.normalRange ?? null,
  male_normal_range: p.male_normal_range ?? p.normalRangeMale,
  female_normal_range: p.female_normal_range ?? p.normalRangeFemale,
});

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
  if (typeof b.max === "number") return `${b.maxInclusive === false ? "<" : "\u2264"} ${b.max}`;
  if (typeof b.min === "number") return `${b.minInclusive === false ? ">" : "\u2265"} ${b.min}`;
  return "\u2014";
}

function coerce(v: string | number | boolean): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const m = String(v).replace(/,/g, "").trim().match(/-?\d+(\.\d+)?/);
  return m ? (Number.isFinite(+m[0]) ? +m[0] : null) : null;
}

function hasQual(r: string) { return [...NEG,...POS,...INCON].some(t => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(r)); }
function qLabels(r: string) { const rr = /\b(reactive|non.?reactive)\b/i.test(r); return { negative: rr ? "Negative / Non-Reactive" : "Negative", positive: rr ? "Positive / Reactive" : "Positive" }; }
function qStatus(v: string) { const n = v.trim(); if (!n) return "unknown"; const wb = (t: string) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(n); if (INCON.some(wb)) return "inconclusive"; if (NEG.some(wb)) return "negative"; if (POS.some(wb)) return "positive"; return "unknown"; }
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
  return "\u2014";
}

export function evaluateReferenceRange(p: ReferenceRangeParameter, raw: string | number | boolean | null | undefined, sex?: SupportedSex) {
  const n = norm(p);
  const ref = resolveReferenceRange(n, sex);
  if (!raw && raw !== 0) return { isAbnormal: false, status: "unknown" as const, flagLabel: "\u2014", referenceRange: ref };
  const num = coerce(raw);
  const nb = bounds(n, sex) || parseBounds(ref);
  const isNum = num !== null && !!nb;
  if (isNum && num !== null) {
    if (hasQual(ref) && nb) { const l = qLabels(ref); const ok = inBounds(num, nb); return { isAbnormal: !ok, status: ok ? "negative" : "positive", flagLabel: ok ? l.negative : l.positive, referenceRange: ref }; }
    if (!nb?.min && !nb?.max && nb?.min !== 0 && nb?.max !== 0) return { isAbnormal: false, status: "unknown" as const, flagLabel: "\u2014", referenceRange: ref };
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
  if (ref.trim().toLowerCase() && ref.trim().toLowerCase() !== "\u2014" && String(raw).trim().toLowerCase() === ref.trim().toLowerCase()) return { isAbnormal: false, status: "normal" as const, flagLabel: "Normal", referenceRange: ref };
  return { isAbnormal: false, status: "unknown" as const, flagLabel: "\u2014", referenceRange: ref };
}

export function normalizeTestCatalogEntry<T extends TestLike>(t: T): T {
  if (!Array.isArray(t.parameters)) return t;
  return {
    ...t,
    parameters: t.parameters.map((p) => norm(p) as T["parameters"][number]),
  };
}