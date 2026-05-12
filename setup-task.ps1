# Setup auto-start scheduled task
# Run with administrator privileges

$TaskName = "Wao-Felicitations-Backend"
$ScriptPath = "c:\Wao Felicitations\start-backend.bat"

Write-Host "`n=========================================================================" -ForegroundColor Cyan
Write-Host "  SETUP AUTO-START WINDOWS SCHEDULED TASK" -ForegroundColor Cyan
Write-Host "=========================================================================`n" -ForegroundColor Cyan

# Check admin privileges
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
  Write-Host "ERROR: Not running as Administrator!" -ForegroundColor Red
  Write-Host "`nPlease run this script as Administrator" -ForegroundColor Yellow
  exit 1
}

Write-Host "  [OK] Running with Administrator privileges" -ForegroundColor Green

# Delete existing task if it exists
Write-Host "  Removing existing task (if any)..." -NoNewline
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
  Write-Host " REMOVED" -ForegroundColor Yellow
} else {
  Write-Host " NONE" -ForegroundColor Gray
}

# Create trigger (At system startup)
Write-Host "  Creating trigger..." -NoNewline
$Trigger = New-ScheduledTaskTrigger -AtStartup
Write-Host " OK" -ForegroundColor Green

# Create action
Write-Host "  Creating action..." -NoNewline
$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$ScriptPath`""
Write-Host " OK" -ForegroundColor Green

# Create principal (SYSTEM with highest privileges)
Write-Host "  Creating principal..." -NoNewline
$Principal = New-ScheduledTaskPrincipal -UserID "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Write-Host " OK" -ForegroundColor Green

# Register task
Write-Host "  Registering task..." -NoNewline
try {
  Register-ScheduledTask -TaskName $TaskName -Trigger $Trigger -Action $Action -Principal $Principal `
    -Description "Automatically starts Wao Felicitations backend API server on system startup" `
    -ErrorAction Stop | Out-Null
  Write-Host " OK" -ForegroundColor Green
} catch {
  Write-Host " FAILED" -ForegroundColor Red
  Write-Host "  Error: $_" -ForegroundColor Red
  exit 1
}

# Verify task was created
Write-Host "  Verifying task..." -NoNewline
$TaskCheck = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($TaskCheck) {
  Write-Host " OK" -ForegroundColor Green
} else {
  Write-Host " FAILED" -ForegroundColor Red
  exit 1
}

Write-Host "`n=========================================================================" -ForegroundColor Green
Write-Host "  AUTO-START CONFIGURATION SUCCESSFUL" -ForegroundColor Green
Write-Host "=========================================================================`n" -ForegroundColor Green

Write-Host "  Task Details:" -ForegroundColor Cyan
Write-Host "    Name: $TaskName" -ForegroundColor Gray
Write-Host "    Trigger: At System Startup" -ForegroundColor Gray
Write-Host "    User: SYSTEM (NT AUTHORITY\SYSTEM)" -ForegroundColor Gray
Write-Host "    Run Level: HIGHEST (Administrator)" -ForegroundColor Gray
Write-Host "    Script: $ScriptPath" -ForegroundColor Gray

Write-Host "`n  What happens next:" -ForegroundColor Cyan
Write-Host "    1. When Windows restarts, this task will automatically run" -ForegroundColor Gray
Write-Host "    2. Backend will start on http://localhost:3001" -ForegroundColor Gray
Write-Host "    3. Backend will continue running with auto-restart if it crashes" -ForegroundColor Gray
Write-Host "    4. No manual action required after reboot" -ForegroundColor Gray

Write-Host "`n  Verify the task:" -ForegroundColor Cyan
Write-Host "    tasklist | findstr backend" -ForegroundColor Gray
Write-Host "    schtasks /query /tn `"$TaskName`" /v" -ForegroundColor Gray

Write-Host "`n  View detailed info:" -ForegroundColor Cyan
Write-Host "    Get-ScheduledTask -TaskName '$TaskName' | Select-Object -Property *" -ForegroundColor Gray

Write-Host "`n  Remove task (if needed):" -ForegroundColor Cyan
Write-Host "    Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false" -ForegroundColor Gray

Write-Host "`n=========================================================================" -ForegroundColor Green
Write-Host "  READY - Backend will auto-start on next system reboot" -ForegroundColor Green
Write-Host "=========================================================================`n" -ForegroundColor Green
