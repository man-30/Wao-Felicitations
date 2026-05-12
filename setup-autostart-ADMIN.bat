@echo off
REM ========================================================================
REM Wao Felicitations - Auto-Start Setup
REM ========================================================================
REM This script must be run as Administrator
REM Right-click this file and select "Run as administrator"
REM ========================================================================

title Wao Felicitations - Auto-Start Setup

echo.
echo ========================================================================
echo   Wao Felicitations - Backend Auto-Start Configuration
echo ========================================================================
echo.

REM Check Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERROR: This script requires Administrator privileges!
    echo.
    echo Please:
    echo   1. Close this window
    echo   2. Right-click on this batch file
    echo   3. Select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [✓] Administrator privileges confirmed
echo.

REM Define variables
set TaskName=Wao-Felicitations-Backend
set ScriptPath=c:\Wao Felicitations\start-backend.bat
set ProjectPath=c:\Wao Felicitations

echo Processing...
echo   Project: %ProjectPath%
echo   Task: %TaskName%
echo   Script: %ScriptPath%
echo.

REM Step 1: Delete existing task
echo [1/3] Removing existing task (if any)...
schtasks /delete /tn "%TaskName%" /f >nul 2>&1
echo [✓] Done

REM Step 2: Create new task
echo [2/3] Creating new scheduled task...
schtasks /create /tn "%TaskName%" /tr "%ScriptPath%" /sc onstart /ru SYSTEM /rl HIGHEST /f >nul 2>&1

if %errorLevel% equ 0 (
    echo [✓] Task created successfully
) else (
    echo [✗] Failed to create task - Error code: %errorLevel%
    pause
    exit /b 1
)

REM Step 3: Verify task
echo [3/3] Verifying task...
schtasks /query /tn "%TaskName%" /v >nul 2>&1

if %errorLevel% equ 0 (
    echo [✓] Task verified
) else (
    echo [✗] Task verification failed
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo   SUCCESS - Auto-Start Configuration Complete!
echo ========================================================================
echo.
echo Task Details:
echo   Name: %TaskName%
echo   Trigger: System Startup (at boot)
echo   Run As: SYSTEM
echo   Run Level: HIGHEST (Administrator)
echo   Script: %ScriptPath%
echo.
echo What happens next:
echo   1. When Windows restarts, this task will automatically run
echo   2. The backend server will start on http://localhost:3001
echo   3. Backend will run automatically with auto-restart if it crashes
echo.
echo Verification commands (copy and paste into Command Prompt):
echo   schtasks /query /tn "%TaskName%" /v
echo   tasklist | findstr backend
echo.
echo To remove this task later:
echo   schtasks /delete /tn "%TaskName%" /f
echo.
echo ========================================================================
echo.

pause
