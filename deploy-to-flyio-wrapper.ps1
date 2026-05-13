# Wrapper script to ensure Fly CLI is in PATH before deploying

Write-Host "======================================"
Write-Host "WAO FELICITATIONS - FLY.IO DEPLOYMENT"
Write-Host "======================================"
Write-Host ""

# Ensure Fly CLI is in PATH
$FlyPath = "$env:LOCALAPPDATA\flyctl"
if ($env:PATH -notlike "*$FlyPath*") {
    Write-Host "[*] Adding Fly CLI to PATH..."
    $env:PATH = "$env:PATH;$FlyPath"
}

# Verify Fly CLI is available
Write-Host "[*] Checking Fly CLI..."
$flyVersion = & flyctl version
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Fly CLI not found"
    exit 1
}
Write-Host "[OK] Fly CLI is available: $flyVersion"
Write-Host ""

# Now run the deployment script
Write-Host "[*] Running deployment script..."
Write-Host ""

cd "c:\Wao Felicitations"

# Read the deploy script and execute it with PATH already set
$deployScript = Get-Content "deploy-to-flyio.ps1" -Raw
Invoke-Expression $deployScript
