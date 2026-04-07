import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env.local");
const sourcePath = path.join(projectRoot, "other_lab_tests_parameters.json");
const TARGET_CATEGORIES = new Set([
  "Hematology",
  "Serology",
  "Microbiology",
  "Clinical Pathology",
]);

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

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeCode(value) {
  return normalizeWhitespace(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function normalizeIdentifier(value) {
  return normalizeWhitespace(value).replace(/[^A-Za-z0-9_-]+/g, "_");
}

function buildUniqueCodes(tests) {
  const baseCounts = new Map();

  for (const test of tests) {
    const baseCode = normalizeCode(test.code) || normalizeCode(test.id) || normalizeCode(test.name);
    baseCounts.set(baseCode, (baseCounts.get(baseCode) || 0) + 1);
  }

  return tests.map((test) => {
    const baseCode = normalizeCode(test.code) || normalizeCode(test.id) || normalizeCode(test.name);
    if ((baseCounts.get(baseCode) || 0) === 1) {
      return baseCode;
    }

    return `${baseCode}-${normalizeCode(test.id)}`;
  });
}

function normalizeStructuredTests() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error("other_lab_tests_parameters.json was not found in the project root.");
  }

  const parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const rawTests = Array.isArray(parsed.tests) ? parsed.tests : [];
  const filteredTests = rawTests.filter((test) => TARGET_CATEGORIES.has(normalizeWhitespace(test.category)));
  const uniqueCodes = buildUniqueCodes(filteredTests);

  return filteredTests.map((test, index) => {
    const parameters = Array.isArray(test.parameters) ? test.parameters : [];

    return {
      name: normalizeWhitespace(test.name),
      code: uniqueCodes[index],
      category: normalizeWhitespace(test.category),
      is_active: true,
      description: normalizeWhitespace(test.description) || `Synced from ${path.basename(sourcePath)}.`,
      parameters: parameters.map((parameter, parameterIndex) => {
        const parameterId =
          normalizeIdentifier(parameter.id || `P_${parameterIndex + 1}`) || `P_${parameterIndex + 1}`;
        const selectOptions = Array.isArray(parameter.selectOptions)
          ? Array.from(new Set(parameter.selectOptions.map((option) => normalizeWhitespace(option)).filter(Boolean)))
          : [];

        return {
          id: parameter.id || `${parameterId}`,
          name: normalizeWhitespace(parameter.name) || `Parameter ${parameterIndex + 1}`,
          unit: normalizeWhitespace(parameter.unit),
          normal_range: normalizeWhitespace(parameter.normal_range || parameter.normalRange),
          ...(parameter.male_normal_range || parameter.normalRangeMale ? { male_normal_range: normalizeWhitespace(parameter.male_normal_range ?? parameter.normalRangeMale) } : {}),
          ...(parameter.female_normal_range || parameter.normalRangeFemale ? { female_normal_range: normalizeWhitespace(parameter.female_normal_range ?? parameter.normalRangeFemale) } : {}),
          ...(selectOptions.length > 0 ? { selectOptions } : {}),
        };
      }),
    };
  });
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
  const templates = normalizeStructuredTests();

  const rowsToUpsert = templates.map((template) => ({
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

  const { data: existingRows, error: existingError } = await supabase
    .from("test_catalog")
    .select("id, code, name, category, description, is_active, parameters")
    .in("category", Array.from(TARGET_CATEGORIES));

  if (existingError) throw existingError;

  // Deactivate stub placeholders that have only a single generic "Result" parameter
  const stubPlaceholderIds = (existingRows || [])
    .filter((row) => {
      const parameters = Array.isArray(row.parameters) ? row.parameters : [];
      return (
        TARGET_CATEGORIES.has(normalizeWhitespace(row.category)) &&
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

  console.log(`Structured non-biochemistry tests synced: ${rowsToUpsert.length}`);
  console.log(`Placeholder rows deactivated: ${stubPlaceholderIds.length}`);
}

main().catch((error) => {
  console.error("Failed to sync structured non-biochemistry catalog:", error);
  process.exitCode = 1;
});
