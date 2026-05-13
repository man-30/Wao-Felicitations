# GitHub Push with Personal Access Token
# This script will help push your code to GitHub using a token

Write-Host "======================================"
Write-Host "GitHub Push with Personal Access Token"
Write-Host "======================================"
Write-Host ""

# Check current git status
Write-Host "[*] Checking git status..."
cd "c:\Wao Felicitations"
$status = git status --short
if ($status) {
    Write-Host "[!] You have uncommitted changes:"
    Write-Host $status
    Write-Host ""
    Write-Host "[?] Do you want to commit first? (y/n)"
    $response = Read-Host
    if ($response -eq 'y') {
        Write-Host "[*] Committing changes..."
        git add .
        $msg = Read-Host "Commit message"
        git commit -m "$msg"
    }
}

# Check commits ahead
Write-Host ""
Write-Host "[*] Commits to push:"
git log origin/main..main --oneline

Write-Host ""
Write-Host "[!] You need a GitHub Personal Access Token to push"
Write-Host "[*] Create one at: https://github.com/settings/tokens/new"
Write-Host "[*] Required scopes: repo (full control of private repositories)"
Write-Host ""
Write-Host "[?] Enter your Personal Access Token (paste with Ctrl+V):"
$token = Read-Host -AsSecureString
$plainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($token))

# Configure git with token
Write-Host ""
Write-Host "[*] Configuring git credentials..."

# Create credential URL
$username = "git"
$credentialUrl = "https://${username}:${plainToken}@github.com"

# Set remote with token
git remote set-url origin "$credentialUrl/man-30/Wao-Felicitations.git"

# Try pushing
Write-Host "[*] Attempting to push to GitHub..."
try {
    $output = git push origin main 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Push successful!"
        Write-Host "[OK] Your code is now on GitHub"
        
        # Reset remote to HTTPS without token for security
        git remote set-url origin https://github.com/man-30/Wao-Felicitations.git
        Write-Host "[OK] Remote URL reset to HTTPS (without token)"
    } else {
        Write-Host "[ERROR] Push failed:"
        Write-Host $output
        Write-Host ""
        Write-Host "[!] Possible causes:"
        Write-Host "  - Token doesn't have repo write permissions"
        Write-Host "  - Token has expired"
        Write-Host "  - Branch protection rules prevent push"
    }
} catch {
    Write-Host "[ERROR] Exception during push: $_"
}

# Clear token from memory
[System.Runtime.InteropServices.Marshal]::ZeroFreeCoTaskMemUnicode($token)

Write-Host ""
Write-Host "[*] Done!"
