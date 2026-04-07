import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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

function normalizeName(value) {
  return (value || "").replace(/\s+/g, " ").trim().toUpperCase();
}

function prefersCandidate(candidate, current) {
  if (!current) return true;

  const candidateParameters = Array.isArray(candidate.parameters) ? candidate.parameters.length : 0;
  const currentParameters = Array.isArray(current.parameters) ? current.parameters.length : 0;

  if (candidateParameters !== currentParameters) {
    return candidateParameters > currentParameters;
  }

  return String(candidate.code || "").localeCompare(String(current.code || "")) < 0;
}

async function main() {
  const fileEnv = loadEnvFile(envPath);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: biochemistryRows, error: biochemistryError } = await supabase
    .from("test_catalog")
    .select("id, code, name, category, description, is_active, parameters")
    .eq("category", "Biochemistry");

  if (biochemistryError) throw biochemistryError;

  const richRows = (biochemistryRows || []).filter((row) => {
    const parameters = Array.isArray(row.parameters) ? row.parameters : [];
    return parameters.length > 1 || parameters[0]?.name !== "Result";
  });
  if (!richRows.length) {
    throw new Error("No structured biochemistry tests found to use as a template.");
  }

  const templateByName = new Map();
  for (const row of richRows) {
    const key = normalizeName(row.name);
    const current = templateByName.get(key);
    if (prefersCandidate(row, current)) {
      templateByName.set(key, row);
    }
  }

  const templateByCode = new Map();
  for (const row of templateByName.values()) {
    const key = String(row.code || "").trim().toUpperCase();
    const current = templateByCode.get(key);
    if (prefersCandidate(row, current)) {
      templateByCode.set(key, row);
    }
  }

  const templateRows = Array.from(templateByCode.values());

  const rowsToUpsert = templateRows.map((template) => ({
    id: template.id ?? crypto.randomUUID(),
    name: template.name,
    code: template.code,
    category: template.category,
    description: template.description,
    is_active: true,
    parameters: template.parameters,
  }));

  const { error: upsertError } = await supabase
    .from("test_catalog")
    .upsert(rowsToUpsert, { onConflict: "code" });
  if (upsertError) throw upsertError;

  // Deactivate stub placeholders that have only a single generic "Result" parameter
  const stubPlaceholderIds = (biochemistryRows || [])
    .filter((row) => {
      const parameters = Array.isArray(row.parameters) ? row.parameters : [];
      return (
        row.category === "Biochemistry" &&
        parameters.length === 1 &&
        parameters[0]?.name === "Result" &&
        !parameters[0]?.unit &&
        !parameters[0]?.normal_range
      );
    })
    .map((row) => row.id);

  if (stubPlaceholderIds.length > 0) {
    const { error: updateError } = await supabase
      .from("test_catalog")
      .update({ is_active: false })
      .in("id", stubPlaceholderIds);

    if (updateError) throw updateError;
  }

  console.log(`Biochemistry tests synced: ${rowsToUpsert.length}`);
  console.log(`Placeholder rows deactivated: ${stubPlaceholderIds.length}`);
}

main().catch((error) => {
  console.error("Failed to sync biochemistry catalog:", error);
  process.exitCode = 1;
});
