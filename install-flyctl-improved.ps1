# Install Fly CLI - Improved version with better error handling
# Downloads directly from Fly.io official source

$OutputPath = "$env:LOCALAPPDATA\flyctl"
$ExePath = "$OutputPath\flyctl.exe"

Write-Host "=================================="
Write-Host "FLY CLI INSTALLATION"
Write-Host "=================================="
Write-Host ""

# Create directory
if (!(Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

# Download with retries
Write-Host "[*] Downloading Fly CLI..."
$DownloadUrl = "https://fly.io/dl/flyctl/releases/latest/windows/x86_64/flyctl.exe"
$MaxRetries = 3
$Downloaded = $false

for ($i = 1; $i -le $MaxRetries; $i++) {
    try {
        Write-Host "[*] Attempt $i/$MaxRetries..."
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExePath -UseBasicParsing -TimeoutSec 120
        
        if ((Test-Path $ExePath) -and ((Get-Item $ExePath).Length -gt 5MB)) {
            Write-Host "[OK] Downloaded successfully"
            $Downloaded = $true
            break
        }
    } catch {
        Write-Host "[!] Attempt failed: $($_.Exception.Message)"
    }
}

if (-not $Downloaded) {
    Write-Host "[ERROR] Installation failed"
    Write-Host "[INFO] Manual download: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
}

# Add to PATH
$CurrentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($CurrentPath -notlike "*$OutputPath*") {
    [Environment]::SetEnvironmentVariable("PATH", "$CurrentPath;$OutputPath", "User")
    $env:PATH = "$env:PATH;$OutputPath"
}

Write-Host "[OK] Installation complete!"
Write-Host "[INFO] Location: $ExePath"
Write-Host ""
Write-Host "Next: Close and reopen PowerShell, then run:"
Write-Host "  flyctl version"
