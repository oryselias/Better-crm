import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const idx = line.indexOf("=");
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

async function main() {
  const fileEnv = loadEnvFile(envPath);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const clinicId = process.argv[2] || "96dd635e-67da-4780-b770-1853458ae16f";
  const categories = ["Hematology", "Serology", "Microbiology", "Clinical Pathology"];
  const sampleNames = [
    "Dengue IgM & IgG (Card Test)",
    "Dengue IgM & IgG (ELISA)",
    "EBV (VCA) - IgM Antibodies",
    "Widal Test",
    "Urine Routine Examination",
  ];

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: sampleRows, error: sampleError } = await supabase
    .from("test_catalog")
    .select("name, code, category, parameters")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .in("category", categories)
    .in("name", sampleNames)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (sampleError) throw sampleError;

  const { data: allRows, error: allError } = await supabase
    .from("test_catalog")
    .select("name, code, category, parameters")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true })
    .in("category", categories);

  if (allError) throw allError;

  const counts = {};
  const parameterIdCounts = new Map();

  for (const row of allRows || []) {
    counts[row.category] = (counts[row.category] || 0) + 1;
    for (const parameter of row.parameters || []) {
      parameterIdCounts.set(parameter.id, (parameterIdCounts.get(parameter.id) || 0) + 1);
    }
  }

  const duplicateActiveParameterIds = Array.from(parameterIdCounts.entries())
    .filter(([, count]) => count > 1)
    .slice(0, 20);

  console.log(
    JSON.stringify(
      {
        clinicId,
        counts,
        duplicateActiveParameterIds,
        sampleRows,
        fallbackRows: (allRows || []).slice(0, 12),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("Failed to verify structured non-biochemistry sync:", error);
  process.exitCode = 1;
});
