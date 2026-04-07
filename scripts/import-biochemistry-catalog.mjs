// Imports BiochemistryTests_parameters.txt into test_catalog.
// Strategy: copy txt → temp .ts, dynamic-import via bun (native TS support), cleanup.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const txtPath  = path.join(projectRoot, "BiochemistryTests_parameters.txt");
const tmpPath  = path.join(__dirname, "_biochem_tmp.ts");
const envPath  = path.join(projectRoot, ".env.local");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, "utf8").split(/\r?\n/)
      .filter(l => l && !l.startsWith("#") && l.includes("="))
      .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^['"]|['"]$/g,"")]; })
  );
}

function normalizeParam(p) {
  const out = {
    id:           p.id,
    name:         (p.name || "").trim(),
    unit:         (p.unit || "").trim(),
  };
  // sex-specific only — no redundant combined string
  if (p.normalRangeMale || p.normalRangeFemale) {
    if (p.normalRangeMale)   out.male_normal_range   = (p.normalRangeMale   || "").trim();
    if (p.normalRangeFemale) out.female_normal_range = (p.normalRangeFemale || "").trim();
  } else {
    out.normal_range = (p.normalRange || "").trim();
  }
  if (Array.isArray(p.selectOptions) && p.selectOptions.length)
    out.selectOptions = p.selectOptions.map(s => String(s).trim()).filter(Boolean);
  return out;
}

async function main() {
  const env = loadEnv(envPath);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL    || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY   || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  // Copy txt → temp ts so bun can import it natively
  fs.copyFileSync(txtPath, tmpPath);
  let tests;
  try {
    const mod = await import(`./_biochem_tmp.ts?t=${Date.now()}`);
    tests = mod.biochemistryTests ?? mod.default?.biochemistryTests;
  } finally {
    fs.unlinkSync(tmpPath);
  }

  if (!Array.isArray(tests) || !tests.length) throw new Error("No tests found in txt file");

  // Deduplicate by normalised code (prefer entry with more parameters)
  const byCode = new Map();
  for (const t of tests) {
    const code = String(t.code || t.id || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g,"");
    const existing = byCode.get(code);
    if (!existing || (t.parameters?.length ?? 0) > (existing.parameters?.length ?? 0))
      byCode.set(code, t);
  }

  const rows = Array.from(byCode.values()).map(t => ({
    name:        (t.name || "").trim(),
    code:        String(t.code || t.id || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g,""),
    category:    (t.category || "Biochemistry").trim(),
    description: (t.description || "").trim(),
    price:       typeof t.price === "number" ? t.price : 0,
    is_active:   true,
    parameters:  (t.parameters || []).map(normalizeParam),
  })).filter(r => r.code && r.name);

  const supabase = createClient(url, key);
  const { error } = await supabase.from("test_catalog").upsert(rows, { onConflict: "code" });
  if (error) throw error;

  console.log(`Biochemistry tests imported: ${rows.length}`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
