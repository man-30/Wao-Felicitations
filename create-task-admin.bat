@echo off
REM Auto-Start Scheduled Task Creator
REM This batch file creates a Windows Scheduled Task to auto-start the backend

setlocal enabledelayedexpansion

echo.
echo ========================================================================
echo   Creating Auto-Start Scheduled Task
echo ========================================================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
  echo ERROR: Must run as Administrator
  pause
  exit /b 1
)

echo [OK] Administrator privileges detected
echo.

REM Define task details
set TaskName=Wao-Felicitations-Backend
set ScriptPath=c:\Wao Felicitations\start-backend.bat

echo Removing existing task (if any)...
schtasks /delete /tn "%TaskName%" /f >nul 2>&1

echo Creating new scheduled task...
schtasks /create /tn "%TaskName%" /tr "%ScriptPath%" /sc onstart /ru SYSTEM /rl HIGHEST /f

if %errorLevel% equ 0 (
  echo.
  echo ========================================================================
  echo   SUCCESS: Auto-Start Task Created!
  echo ========================================================================
  echo.
  echo   Task Details:
  echo     Name: %TaskName%
  echo     Trigger: System Startup
  echo     User: SYSTEM
  echo     Run Level: HIGHEST
  echo     Script: %ScriptPath%
  echo.
  echo   Backend will automatically start on next system reboot
  echo   Check: schtasks /query /tn "%TaskName%" /v
  echo.
  
  REM Display task details
  echo Verifying task...
  schtasks /query /tn "%TaskName%" /v
  
) else (
  echo.
  echo ERROR: Failed to create task
  echo Make sure you are running as Administrator
  echo.
)

pause
