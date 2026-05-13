# Install Fly CLI directly from official source (bypass Chocolatey)
# No admin required if saving to user folder

$FlyVersion = "latest"
$OutputPath = "$env:LOCALAPPDATA\flyctl"
$ExePath = "$OutputPath\flyctl.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FLY CLI DIRECT INSTALLATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create output directory
if (!(Test-Path $OutputPath)) {
    Write-Host "Creating directory: $OutputPath"
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

# Download Fly CLI
Write-Host "Downloading Fly CLI..."
$DownloadUrl = "https://fly.io/dl/flyctl/releases/latest/windows/x86_64/flyctl.exe"

try {
    # Use curl.exe if available (faster)
    if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
        Write-Host "Downloading with curl..."
        curl.exe -L $DownloadUrl -o $ExePath
    } else {
        # Fallback to PowerShell's Invoke-WebRequest
        Write-Host "Downloading with PowerShell..."
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExePath -UseBasicParsing
    }
    
    if (Test-Path $ExePath) {
        Write-Host "[OK] Downloaded successfully!" -ForegroundColor Green
        Write-Host "Location: $ExePath" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Download failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Error downloading: $_" -ForegroundColor Red
    exit 1
}

# Add to PATH
$CurrentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($CurrentPath -notlike "*$OutputPath*") {
    Write-Host ""
    Write-Host "Adding to PATH..."
    [Environment]::SetEnvironmentVariable(
        "PATH", 
        "$CurrentPath;$OutputPath", 
        "User"
    )
    Write-Host "[OK] Added to PATH" -ForegroundColor Green
}

# Verify installation
Write-Host ""
Write-Host "Verifying installation..."
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")

& $ExePath version
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "[SUCCESS] FLY CLI INSTALLED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Close this PowerShell window" -ForegroundColor Cyan
    Write-Host "2. Open a NEW PowerShell window" -ForegroundColor Cyan
    Write-Host "3. Run: flyctl auth login" -ForegroundColor Cyan
    Write-Host "4. Run: .\deploy-to-flyio.ps1" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "[ERROR] Installation verification failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Read-Host "Press Enter to close this window"
