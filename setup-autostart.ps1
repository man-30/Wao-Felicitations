#!/usr/bin/env powershell
<#
  Setup Auto-Start Task for Wao Felicitations Backend
  
  This script creates a Windows Scheduled Task that automatically starts
  the backend server when Windows boots up.
  
  Requirements: Run as Administrator
  
  Usage:
    .\setup-autostart.ps1
#>

# Check if running as Administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
  Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
  exit 1
}

Write-Host "`n=========================================================================" -ForegroundColor Cyan
Write-Host "  Setup Auto-Start Task for Wao Felicitations Backend" -ForegroundColor Cyan
Write-Host "=========================================================================`n" -ForegroundColor Cyan

$TaskName = "Wao-Felicitations-Backend"
$ProjectPath = "C:\Wao Felicitations"
$ScriptPath = "$ProjectPath\start-backend.bat"

# Create the task trigger (At system startup)
$Trigger = New-ScheduledTaskTrigger -AtStartup
Write-Host "  [1/4] Trigger created: AtStartup" -ForegroundColor Green

# Create the action (Run the batch file)
$Action = New-ScheduledTaskAction `
  -Execute "cmd.exe" `
  -Argument "/c `"$ScriptPath`"" `
  -WorkingDirectory "$ProjectPath"
Write-Host "  [2/4] Action created: Start $ScriptPath" -ForegroundColor Green

# Create the principal (Run with highest privileges)
$Principal = New-ScheduledTaskPrincipal `
  -UserID "NT AUTHORITY\SYSTEM" `
  -LogonType ServiceAccount `
  -RunLevel Highest
Write-Host "  [3/4] Principal created: SYSTEM (Highest privileges)" -ForegroundColor Green

# Register the task
try {
  # Check if task already exists
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Write-Host "  Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  }
  
  # Register the new task
  Register-ScheduledTask `
    -TaskName $TaskName `
    -Trigger $Trigger `
    -Action $Action `
    -Principal $Principal `
    -Description "Automatically starts Wao Felicitations backend API server on system startup"
  
  Write-Host "  [4/4] Task registered: $TaskName" -ForegroundColor Green
  
  Write-Host "`n=========================================================================" -ForegroundColor Green
  Write-Host "  AUTO-START CONFIGURED SUCCESSFULLY" -ForegroundColor Green
  Write-Host "=========================================================================`n" -ForegroundColor Green
  
  Write-Host "  Task Details:" -ForegroundColor Cyan
  Write-Host "    Name: $TaskName" -ForegroundColor Gray
  Write-Host "    Trigger: System Startup" -ForegroundColor Gray
  Write-Host "    User: SYSTEM" -ForegroundColor Gray
  Write-Host "    Action: $ScriptPath" -ForegroundColor Gray
  Write-Host "    Run Level: Highest (Admin)" -ForegroundColor Gray
  
  Write-Host "`n  What happens next:" -ForegroundColor Cyan
  Write-Host "    1. When Windows restarts, this task will automatically run" -ForegroundColor Gray
  Write-Host "    2. The backend will start on http://localhost:3001" -ForegroundColor Gray
  Write-Host "    3. If the backend crashes, it will automatically restart" -ForegroundColor Gray
  
  Write-Host "`n  View the task:" -ForegroundColor Cyan
  Write-Host "    Open Task Scheduler and look for '$TaskName'" -ForegroundColor Gray
  Write-Host "    Command: Get-ScheduledTask -TaskName '$TaskName' | Select-Object -Property *" -ForegroundColor Gray
  
  Write-Host "`n  Remove the task (if needed):" -ForegroundColor Cyan
  Write-Host "    Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false" -ForegroundColor Gray
  
} catch {
  Write-Host "ERROR: Failed to register task: $_" -ForegroundColor Red
  exit 1
}

Write-Host "`n=========================================================================" -ForegroundColor Green
Write-Host "  READY - Backend will restart automatically after reboot" -ForegroundColor Green
Write-Host "=========================================================================`n" -ForegroundColor Green
