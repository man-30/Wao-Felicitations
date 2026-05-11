@echo off
REM Setup Auto-Start Task for Wao Felicitations Backend
REM This batch file creates a Windows Scheduled Task to auto-start the backend on system startup
REM Must be run as Administrator

echo.
echo ========================================================================
echo   Setup Auto-Start Task for Wao Felicitations Backend
echo ========================================================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
  echo ERROR: This script must be run as Administrator
  echo.
  echo Please:
  echo   1. Open Command Prompt as Administrator
  echo   2. Navigate to: cd /d "c:\Wao Felicitations"
  echo   3. Run: setup-autostart.bat
  echo.
  pause
  exit /b 1
)

echo [OK] Running as Administrator
echo.

REM Define variables
set TaskName=Wao-Felicitations-Backend
set ScriptPath=c:\Wao Felicitations\start-backend.bat
set ProjectPath=c:\Wao Felicitations

echo Creating scheduled task...
echo   Task Name: %TaskName%
echo   Trigger: System Startup
echo   Action: %ScriptPath%
echo.

REM Delete existing task if it exists
schtasks /delete /tn "%TaskName%" /f >nul 2>&1

REM Create new scheduled task
schtasks /create /tn "%TaskName%" /tr "%ScriptPath%" /sc onstart /ru "SYSTEM" /rl HIGHEST /f

if %errorLevel% equ 0 (
  echo.
  echo ========================================================================
  echo   [SUCCESS] Auto-Start Task Created
  echo ========================================================================
  echo.
  echo   Task Details:
  echo     Name: %TaskName%
  echo     Trigger: System Startup
  echo     User: SYSTEM
  echo     Run Level: HIGHEST (Admin)
  echo     Script: %ScriptPath%
  echo.
  echo   What happens next:
  echo     1. When Windows restarts, the task will automatically run
  echo     2. The backend will start on http://localhost:3001
  echo     3. The backend will keep running (with auto-restart if needed)
  echo.
  echo   View the task:
  echo     Run: schtasks /query /tn "%TaskName%" /v
  echo     Or open Task Scheduler and search for "%TaskName%"
  echo.
  echo   Remove the task (if needed):
  echo     Run: schtasks /delete /tn "%TaskName%" /f
  echo.
) else (
  echo.
  echo [ERROR] Failed to create scheduled task
  echo Please run this batch file as Administrator
  echo.
)

pause
