#!/usr/bin/env powershell
<#
  Start Wao Felicitations Backend - Persistent Mode
  
  This script:
  1. Starts the backend server in a separate window
  2. Monitors the process and restarts if it crashes
  3. Logs all activity to a file
  
  Usage:
    .\start-backend-persistent.ps1
#>

$ProjectPath = "c:\Wao Felicitations"
$LogFile = "$ProjectPath\logs\backend-service.log"
$LogDir = "$ProjectPath\logs"

# Create logs directory if it doesn't exist
if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# Function to log messages
function Log-Message {
  param([string]$Message)
  $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $LogEntry = "[$Timestamp] $Message"
  Add-Content -Path $LogFile -Value $LogEntry
  Write-Host $LogEntry -ForegroundColor Cyan
}

# Function to start the backend
function Start-Backend {
  Log-Message "Starting Wao Félicitations Backend Server..."
  
  $env:DATABASE_URL = 'postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  $env:DATABASE_URL_POOLED = 'postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  $env:JWT_SECRET = 'dev-secret-key-minimum-32-characters-xxxxxxxxxx'
  $env:ENCRYPTION_KEY = 'dev-encryption-key-32chars-xxx'
  $env:PORT = '3001'
  $env:NODE_ENV = 'production'
  
  # Create a new process for the backend
  $ProcessArgs = @{
    FilePath = "npx"
    ArgumentList = "tsx", "backend-express-complete.ts"
    WorkingDirectory = $ProjectPath
    NoNewWindow = $false
    PassThru = $true
  }
  
  $Process = Start-Process @ProcessArgs
  Log-Message "Backend process started with PID: $($Process.Id)"
  
  return $Process
}

# Function to check if backend is responding
function Test-Backend {
  try {
    $Response = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
    return $Response.StatusCode -eq 200
  } catch {
    return $false
  }
}

Log-Message "=========================================================================="
Log-Message "  WAO FELICITATIONS - BACKEND PERSISTENT SERVICE"
Log-Message "=========================================================================="
Log-Message "Project Path: $ProjectPath"
Log-Message "Log File: $LogFile"
Log-Message "Port: 3001"
Log-Message "Environment: Production"
Log-Message ""

# Main loop - Monitor and restart backend if needed
$ProcessMonitoringInterval = 10  # Check every 10 seconds
$RestartDelay = 5

while ($true) {
  # Start backend process
  $BackendProcess = Start-Backend
  
  # Monitor the process
  while (-not $BackendProcess.HasExited) {
    Start-Sleep -Seconds $ProcessMonitoringInterval
    
    # Check if backend is still healthy
    if (Test-Backend) {
      Write-Host "." -NoNewline -ForegroundColor Green
    } else {
      Write-Host "!" -NoNewline -ForegroundColor Yellow
    }
  }
  
  # Backend process exited unexpectedly
  Log-Message "Backend process exited with code: $($BackendProcess.ExitCode)"
  Log-Message "Waiting $RestartDelay seconds before restart..."
  
  Start-Sleep -Seconds $RestartDelay
}
