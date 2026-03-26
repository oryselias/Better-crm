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
@"
global_context: |
  Better CRM is a markdown-first product workspace for an AI-first health CRM and lab information system.
  Prioritize architecture notes, ADRs, schema design, security boundaries, and implementation plans.
collections:
  health-crm:
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
    context:
      "/": "Lean repo context: app shell, rules, migrations, and implementation history."
      "/docs": "Second-brain knowledge vault for product, schema, prompts, operations, and integrations. Retrieve on demand."
"@ | Set-Content -Path $configPath -Encoding UTF8

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
