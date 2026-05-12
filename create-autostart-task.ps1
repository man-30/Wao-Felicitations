$TaskName = "Wao-Felicitations-Backend"
$ScriptPath = "c:\Wao Felicitations\start-backend.bat"

Write-Host "`nCreating Auto-Start Task..." -ForegroundColor Cyan

# Remove existing task
schtasks /delete /tn $TaskName /f 2>$null

# Create new task
$result = schtasks /create /tn $TaskName /tr "`"$ScriptPath`"" /sc onstart /ru SYSTEM /rl HIGHEST /f 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Task created!" -ForegroundColor Green
    Write-Host "`nTask Details:`n  Name: $TaskName`n  Trigger: System Startup`n  User: SYSTEM`n  Script: $ScriptPath`n" -ForegroundColor Cyan
    
    # Verify
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($task) {
        Write-Host "Task verified: $($task.TaskName) - State: $($task.State)" -ForegroundColor Green
    }
} else {
    Write-Host "ERROR: Failed to create task" -ForegroundColor Red
    Write-Host "Output: $result" -ForegroundColor Yellow
}

Read-Host "`nPress Enter to close"
