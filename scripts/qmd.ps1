param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$QmdArgs
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $repoRoot ".tools\\qmd-runtime"
$cliPath = Join-Path $runtimeRoot "dist\\cli\\qmd.js"
$qmdRoot = Join-Path $repoRoot ".qmd"
$configDir = Join-Path $qmdRoot "config"
$indexPath = Join-Path $qmdRoot "better-crm.sqlite"
$configPath = Join-Path $configDir "index.yml"

if (-not (Test-Path $cliPath)) {
  throw "QMD runtime not found at '$cliPath'. Re-copy the runtime into .tools/qmd-runtime."
}

New-Item -ItemType Directory -Force $qmdRoot | Out-Null
New-Item -ItemType Directory -Force $configDir | Out-Null

$escapedRepoRoot = $repoRoot.Replace('\', '/')
$newConfig = @"
global_context: |
  Better CRM is a lightweight multi-clinic lab report generator for lab assistants.
  Prioritize patient registration, test catalog, report generation, PDF flows, schema design, and clinic-scoped access control.
collections:
  better-crm:
    path: "$escapedRepoRoot"
    pattern: "**/*.{ts,tsx,js,jsx,md,json,html,css,yml,sql,toml}"
    ignore:
      - "node_modules/**"
      - ".next/**"
      - "dist/**"
      - ".git/**"
      - ".qmd/**"
      - ".tools/**"
      - ".env*.local"
      - "output/**"
      - "TEST-DATA/**"
      - ".playwright-cli/**"
      - "scripts/e2e/**"
      - "coverage/**"
      - "public/**"
      - "**/*.lock"
      - "**/*.sqlite"
      - "**/*.sqlite-wal"
      - "**/*.sqlite-shm"
      - "supabase/.temp/**"
    context:
      "/": "Lean repo context: app shell, AGENTS rules, migrations, and the current lab workflow implementation."
      "/docs": "Project knowledge base for product scope, schema, architecture, operations, and tooling guidance."
"@
$existingConfig = if (Test-Path $configPath) { Get-Content -Path $configPath -Raw -ErrorAction SilentlyContinue } else { $null }
if ($newConfig -ne $existingConfig) {
  $newConfig | Set-Content -Path $configPath -Encoding UTF8
}

$env:INDEX_PATH = $indexPath
$env:QMD_CONFIG_DIR = $configDir

$output = & bun $cliPath @QmdArgs 2>&1
$exitCode = $LASTEXITCODE

foreach ($line in $output) {
  if ($line -is [string]) {
    $line.Replace("`r", "")
  } else {
    $line
  }
}

exit $exitCode
