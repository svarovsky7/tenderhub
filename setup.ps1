#!/usr/bin/env pwsh
param([switch]$Dev)
$ErrorActionPreference = "Stop"

Write-Host "== Detect package manager =="
if     (Test-Path "pnpm-lock.yaml") { $pm="pnpm" }
elseif (Test-Path "yarn.lock")      { $pm="yarn" }
else                                { $pm="npm" }

if ($pm -in @("pnpm","yarn")) { try { corepack enable | Out-Null } catch {} }

function Run([string]$cmd) {
  Write-Host ">> $cmd"
  & $env:ComSpec /c $cmd
  if ($LASTEXITCODE -ne 0) { throw "Command failed: $cmd" }
}

Write-Host "== Install deps =="
if ($pm -eq "pnpm")      { Run "pnpm install" }
elseif ($pm -eq "yarn")  { Run "yarn install" }
else {
  if (Test-Path "package-lock.json") { Run "npm ci" } else { Run "npm install" }
}

Write-Host "== Ensure .env =="
if (Test-Path ".env.example" -and -not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }

Write-Host "== Docker compose (optional) =="
if (Test-Path "docker-compose.yml" -or Test-Path "compose.yml" -or Test-Path "docker-compose.yaml") {
  try { Run "docker compose pull" } catch {}
  try { Run "docker compose up -d" } catch { Run "docker-compose up -d" }
}

Write-Host "== DB migrations (optional) =="
if (Test-Path "package.json")) {
  $pkg = Get-Content package.json | ConvertFrom-Json
  if ($pkg.scripts."db:migrate") {
    if ($pm -eq "pnpm")     { Run "pnpm run db:migrate" }
    elseif ($pm -eq "yarn") { Run "yarn db:migrate" }
    else                    { Run "npm run db:migrate" }
  }
}

if ($Dev) {
  Write-Host "== Start dev =="
  if ($pm -eq "pnpm")     { Run "pnpm run dev" }
  elseif ($pm -eq "yarn") { Run "yarn dev" }
  else                    { Run "npm run dev" }
}

Write-Host "✅ Setup finished."
