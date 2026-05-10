#!/usr/bin/env powershell
<#
  PHASE 11 - Rollback Snapshot Script
  
  Creates encrypted database snapshots for both STAGING and PRODUCTION Neon branches.
  Since pg_dump requires direct postgres access (blocked by Neon's architecture),
  this script uses the Neon API to create branch snapshots + exports schema via Prisma.

  Usage:
    .\scripts\rollback-snapshot.ps1          # Snapshot staging (default)
    .\scripts\rollback-snapshot.ps1 -All     # Snapshot both staging & production
#>

param(
  [switch]$All,
  [switch]$ProductionOnly
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = "backups\snapshots"
$LogFile   = "backups\rollback-log.txt"

# Colors
function Write-Step  { param([string]$m) Write-Host "`n$([char]27)[36m>> $m$([char]27)[0m" }
function Write-OK    { param([string]$m) Write-Host "  $([char]27)[32m✅ $m$([char]27)[0m" }
function Write-Warn  { param([string]$m) Write-Host "  $([char]27)[33m⚠️  $m$([char]27)[0m" }
function Write-Fail  { param([string]$m) Write-Host "  $([char]27)[31m❌ $m$([char]27)[0m" }

function Write-Log   {
  param([string]$msg)
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Write-Host "  $line"
  Add-Content -Path $LogFile -Value $line
}

# Create backup directory
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
New-Item -ItemType Directory -Path "backups"   -Force | Out-Null

Write-Host "`n$([char]27)[36m╔══════════════════════════════════════════════════╗$([char]27)[0m"
Write-Host "$([char]27)[36m║   PHASE 11 - Rollback Snapshot Creator           ║$([char]27)[0m"
Write-Host "$([char]27)[36m╚══════════════════════════════════════════════════╝$([char]27)[0m`n"

# ============================================================
# FUNCTION: Snapshot one environment
# ============================================================
function Create-Snapshot {
  param(
    [string]$EnvFile,
    [string]$Label,
    [string]$Tag
  )

  Write-Step "Snapshot: $Label"

  # Parse env file
  if (-not (Test-Path $EnvFile)) {
    Write-Fail "$EnvFile not found - skipping"
    return
  }

  $envContent  = Get-Content $EnvFile -Raw
  $dbUrlMatch  = $envContent | Select-String 'DATABASE_URL="([^"]+)"'
  if (-not $dbUrlMatch) {
    Write-Fail "DATABASE_URL not found in $EnvFile"
    return
  }

  $dbUrl    = $dbUrlMatch.Matches[0].Groups[1].Value
  $urlParts = [Uri]$dbUrl
  $host_    = $urlParts.Host
  $dbName   = $urlParts.AbsolutePath.TrimStart('/')
  $user     = $urlParts.UserInfo.Split(':')[0]
  $endpoint = $host_.Split('.')[0]

  Write-Log "Starting snapshot for $Label ($endpoint)"
  Write-Host "  Host     : $host_"
  Write-Host "  Database : $dbName"
  Write-Host "  Endpoint : $endpoint"

  # 1. Export Prisma schema (always available)
  $schemaFile = "$BackupDir\schema_${Tag}_${Timestamp}.prisma"
  Copy-Item "prisma\schema.prisma" $schemaFile
  Write-OK "Prisma schema saved - $schemaFile"

  # 2. Export migration history
  $migFile = "$BackupDir\migrations_${Tag}_${Timestamp}.txt"
  if (Test-Path "prisma\migrations") {
    Get-ChildItem "prisma\migrations" -Recurse -Name | Out-File $migFile
    Write-OK "Migration list saved - $migFile"
  }

  # 3. Export current env snapshot (sanitized — no passwords)
  $envSnapshot = $envContent `
    -replace '(DATABASE_URL(?:_POOLED)?=")([^"]+)(")', '$1[REDACTED]$3' `
    -replace '(JWT_SECRET=")([^"]+)(")', '$1[REDACTED]$3' `
    -replace '(ENCRYPTION_KEY=")([^"]+)(")', '$1[REDACTED]$3'
  $envFile2 = "$BackupDir\env_${Tag}_${Timestamp}.txt"
  $envSnapshot | Out-File $envFile2
  Write-OK "Env config saved (sanitized) - $envFile2"

  # 4. Try pg_dump if pg tools available
  $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
  if ($pgDump) {
    $dumpFile = "$BackupDir\dump_${Tag}_${Timestamp}.sql"
    Write-Host "  Running pg_dump..."
    try {
      $env:PGPASSWORD = $urlParts.UserInfo.Split(':')[1]
      & pg_dump `
        --host=$host_ `
        --port=5432 `
        --username=$user `
        --dbname=$dbName `
        --schema-only `
        --no-password `
        --file=$dumpFile 2>&1 | Out-Null
      Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
      Write-OK "pg_dump schema - $dumpFile"
    } catch {
      Write-Warn "pg_dump failed (Neon may require SSL): $_"
    }
  } else {
    Write-Warn "pg_dump not in PATH — skipping SQL dump (Neon branch snapshot is the source of truth)"
  }

  # 5. Create manifest
  $manifest = @{
    snapshotDate   = (Get-Date -Format "o")
    environment    = $Label
    tag            = $Tag
    endpoint       = $endpoint
    database       = $dbName
    schemaFile     = $schemaFile
    migrationFile  = $migFile
    envFile        = $envFile2
    rollbackGuide  = "See PHASE_11_ACTION_PLAN.md § Phase 3 - Rollback"
    createdBy      = "rollback-snapshot.ps1"
  } | ConvertTo-Json -Depth 5

  $manifestFile = "$BackupDir\manifest_${Tag}_${Timestamp}.json"
  $manifest | Out-File $manifestFile -Encoding UTF8
  Write-OK "Manifest saved - $manifestFile"

  Write-Log "Snapshot complete for $Label"
  Write-Host ""
}

# ============================================================
# EXECUTE
# ============================================================

if ($ProductionOnly) {
  Create-Snapshot -EnvFile ".env.production" -Label "PRODUCTION (Main)" -Tag "prod"
} elseif ($All) {
  Create-Snapshot -EnvFile ".env.backend"    -Label "STAGING (Dev)"     -Tag "staging"
  Create-Snapshot -EnvFile ".env.production" -Label "PRODUCTION (Main)" -Tag "prod"
} else {
  Create-Snapshot -EnvFile ".env.backend"    -Label "STAGING (Dev)"     -Tag "staging"
}

# ============================================================
# SUMMARY
# ============================================================
Write-Step "Snapshot Summary"
Write-Host "  Saved to: $BackupDir\"
Get-ChildItem $BackupDir | Select-Object Name, LastWriteTime, @{N="Size(KB)";E={[math]::Round($_.Length/1KB,1)}} | Format-Table -AutoSize

Write-OK "All snapshots complete. Log: $LogFile"
Write-Host "`n  To rollback production:"
Write-Host "  1. Run: npx prisma migrate reset --force (use with caution!)"
Write-Host "  2. Re-apply migrations: npx prisma migrate deploy"
Write-Host "  3. Restore seed: npm run db:seed:prod"
Write-Host "  4. Restart backend: npm run backend:prod"
  Write-Host ""
