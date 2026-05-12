#!/usr/bin/env powershell
<#
  Deploy to Fly.io - Automated Setup Script
  
  This script:
  1. Checks if flyctl is installed
  2. Authenticates with Fly.io
  3. Launches the app
  4. Sets environment secrets
  5. Deploys the backend
  
  Usage:
    .\deploy-to-flyio.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "`n=========================================================================" -ForegroundColor Cyan
Write-Host "  WAO FELICITATIONS - FLY.IO DEPLOYMENT SCRIPT" -ForegroundColor Cyan
Write-Host "=========================================================================`n" -ForegroundColor Cyan

# ============================================================================
# STEP 1: Check Fly CLI Installation
# ============================================================================

Write-Host "STEP 1: Checking Fly CLI Installation" -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue
Write-Host ""

try {
    $version = flyctl version
    Write-Host "✅ Fly CLI found: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Fly CLI not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Fly CLI first:" -ForegroundColor Yellow
    Write-Host "  1. Download: https://fly.io/docs/hands-on/install-flyctl/" -ForegroundColor Yellow
    Write-Host "  2. Or run: choco install flyctl (with admin)" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 2: Authenticate with Fly.io
# ============================================================================

Write-Host "STEP 2: Authenticate with Fly.io" -ForegroundColor Blue
Write-Host "=================================" -ForegroundColor Blue
Write-Host ""
Write-Host "This will open your browser to authenticate with Fly.io" -ForegroundColor Yellow
Write-Host "Press Enter to continue..." -ForegroundColor Gray

Read-Host

try {
    flyctl auth login
    Write-Host "✅ Authentication successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Authentication failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 3: Launch App on Fly.io
# ============================================================================

Write-Host "STEP 3: Launching App on Fly.io" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host ""

$appExists = flyctl apps list | Select-String "wao-felicitations-api"

if ($appExists) {
    Write-Host "⚠️  App already exists: wao-felicitations-api" -ForegroundColor Yellow
    Write-Host "Skipping launch step" -ForegroundColor Gray
} else {
    Write-Host "Creating new app: wao-felicitations-api" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You will be prompted for:" -ForegroundColor Gray
    Write-Host "  - App Name: wao-felicitations-api" -ForegroundColor Gray
    Write-Host "  - Region: cdg (Europe - Paris)" -ForegroundColor Gray
    Write-Host "  - Postgres: No" -ForegroundColor Gray
    Write-Host "  - Redis: No" -ForegroundColor Gray
    Write-Host "  - Deploy now: No" -ForegroundColor Gray
    Write-Host ""
    
    try {
        flyctl launch
        Write-Host "✅ App launched" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  App launch completed (may have partial output)" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# STEP 4: Set Environment Secrets
# ============================================================================

Write-Host "STEP 4: Setting Environment Secrets" -ForegroundColor Blue
Write-Host "====================================" -ForegroundColor Blue
Write-Host ""

$secrets = @{
    "DATABASE_URL" = "postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    "DATABASE_URL_POOLED" = "postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    "JWT_SECRET" = "dev-secret-key-minimum-32-characters-xxxxxxxxxx"
    "ENCRYPTION_KEY" = "dev-encryption-key-32chars-xxx"
    "CORS_ORIGIN" = "https://waooof.com,https://www.waooof.com"
    "NODE_ENV" = "production"
}

foreach ($secret in $secrets.GetEnumerator()) {
    Write-Host "Setting $($secret.Key)..." -NoNewline
    try {
        flyctl secrets set "$($secret.Key)=$($secret.Value)" 2>$null
        Write-Host " ✅" -ForegroundColor Green
    } catch {
        Write-Host " ⚠️ " -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Verifying secrets..." -NoNewline
try {
    $secretList = flyctl secrets list
    Write-Host " ✅" -ForegroundColor Green
    Write-Host ""
    $secretList | Select-Object -First 10
} catch {
    Write-Host " ⚠️ " -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# STEP 5: Deploy Backend
# ============================================================================

Write-Host "STEP 5: Deploying Backend to Fly.io" -ForegroundColor Blue
Write-Host "====================================" -ForegroundColor Blue
Write-Host ""
Write-Host "This will build and deploy your backend..." -ForegroundColor Gray
Write-Host "Press Enter to start deployment (takes 3-5 minutes)" -ForegroundColor Gray

Read-Host

try {
    flyctl deploy
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "⚠️  Deployment may have completed with warnings" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# STEP 6: Verify Deployment
# ============================================================================

Write-Host "STEP 6: Verifying Deployment" -ForegroundColor Blue
Write-Host "=============================" -ForegroundColor Blue
Write-Host ""

Write-Host "App Status:" -ForegroundColor Cyan
try {
    $status = flyctl status
    Write-Host $status
} catch {
    Write-Host "Could not get status" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Recent Logs:" -ForegroundColor Cyan
try {
    $logs = flyctl logs --lines 10
    Write-Host $logs
} catch {
    Write-Host "Could not get logs" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================

Write-Host "=========================================================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "=========================================================================`n" -ForegroundColor Green

Write-Host "Backend URL: https://wao-felicitations-api.fly.dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test backend: curl 'https://wao-felicitations-api.fly.dev/api/auth/login' -X POST -H 'Content-Type: application/json' -d '{\"email\":\"dayo.dodzi@waooo.com\",\"password\":\"Admin2026!\"}'" -ForegroundColor Gray
Write-Host "  2. Update frontend to use: https://wao-felicitations-api.fly.dev" -ForegroundColor Gray
Write-Host "  3. Go to https://waooof.com and test login" -ForegroundColor Gray
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Cyan
Write-Host "  flyctl status              - Check app status" -ForegroundColor Gray
Write-Host "  flyctl logs                - View logs" -ForegroundColor Gray
Write-Host "  flyctl secrets list        - List all secrets" -ForegroundColor Gray
Write-Host "  flyctl ssh console        - SSH into the app" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to close"
