@echo off
REM Install Fly CLI via Chocolatey with administrator privileges

echo.
echo ========================================================================
echo   Installing Fly CLI
echo ========================================================================
echo.

REM Check administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Requires Administrator
    echo Please run as Administrator
    pause
    exit /b 1
)

echo [OK] Administrator privileges confirmed
echo.

echo Installing Fly CLI via Chocolatey...
choco install flyctl -y

if %errorLevel% equ 0 (
    echo.
    echo SUCCESS: Fly CLI installed!
    echo.
    echo Verify installation:
    flyctl version
    echo.
) else (
    echo.
    echo ERROR: Installation failed
    echo.
    echo Alternative: Download from https://fly.io/docs/hands-on/install-flyctl/
    echo.
)

pause
