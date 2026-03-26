param(
  [ValidateSet("skip", "linked", "local")]
  [string]$DbMode = "skip",

  [switch]$SkipBuild,
  [switch]$SkipLint
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$results = [System.Collections.Generic.List[object]]::new()

function Invoke-Check {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [scriptblock]$Action
  )

  Write-Host "==> $Name" -ForegroundColor Cyan

  try {
    & $Action
    if ($LASTEXITCODE -ne 0) {
      throw "$Name failed with exit code $LASTEXITCODE"
    }

    $results.Add([pscustomobject]@{
      Step = $Name
      Status = "passed"
    })
  }
  catch {
    $results.Add([pscustomobject]@{
      Step = $Name
      Status = "failed"
    })

    throw
  }
}

Push-Location $repoRoot

try {
  if (-not $SkipBuild) {
    Invoke-Check -Name "Production build" -Action {
      bun run build
    }
  }

  if (-not $SkipLint) {
    Invoke-Check -Name "Lint" -Action {
      bun run lint
    }
  }

  switch ($DbMode) {
    "linked" {
      Invoke-Check -Name "Supabase DB tests (linked)" -Action {
        supabase test db --linked
      }
    }
    "local" {
      Invoke-Check -Name "Supabase DB tests (local)" -Action {
        supabase test db --local
      }
    }
  }

  Write-Host ""
  Write-Host "MVP loop complete." -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Host "MVP loop failed." -ForegroundColor Red
  throw
}
finally {
  Pop-Location

  Write-Host ""
  Write-Host "Summary" -ForegroundColor Yellow
  foreach ($result in $results) {
    Write-Host ("- {0}: {1}" -f $result.Step, $result.Status)
  }
}
