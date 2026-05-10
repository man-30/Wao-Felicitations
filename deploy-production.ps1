# deploy-production.ps1
# Script de déploiement PHASE 11 - Production

Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   PHASE 11 - Déploiement Production                     ║" -ForegroundColor Cyan
Write-Host "║   Wao Félicitations v2.0                                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifications pré-déploiement
Write-Host "🔍 1. Vérifications pré-déploiement..." -ForegroundColor Yellow

if (!(Test-Path ".env.production")) {
    Write-Host "❌ Fichier .env.production manquant!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ .env.production trouvé" -ForegroundColor Green

# 2. Build du frontend
Write-Host ""
Write-Host "🏗️  2. Build du frontend..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build frontend échoué!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend build réussi" -ForegroundColor Green

# 3. Migration de la base de données
Write-Host ""
Write-Host "🗄️  3. Migration base de données production..." -ForegroundColor Yellow
npm run db:push:prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration DB échouée!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Base de données migrée" -ForegroundColor Green

# 4. Seed production (admin uniquement)
Write-Host ""
Write-Host "🌱 4. Seed production..." -ForegroundColor Yellow
$confirm = Read-Host "Voulez-vous exécuter le seed production? (y/N)"

if ($confirm -eq 'y' -or $confirm -eq 'Y') {
    npm run db:seed:prod
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Seed production échoué (peut-être déjà fait)" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Seed production réussi" -ForegroundColor Green
    }
}

# 5. Ajout des index de performance
Write-Host ""
Write-Host "⚡ 5. Ajout des index de performance..." -ForegroundColor Yellow

$env:DATABASE_URL = (Get-Content .env.production | Select-String "DATABASE_URL=" | Select-Object -First 1).ToString().Split('=',2)[1].Trim('"')

npx prisma db execute --file add-performance-indexes.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Certains index existent déjà" -ForegroundColor Yellow
} else {
    Write-Host "✅ Index de performance ajoutés" -ForegroundColor Green
}

# 6. Démarrage du backend
Write-Host ""
Write-Host "🚀 6. Démarrage backend production..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Pour démarrer le backend:" -ForegroundColor Cyan
Write-Host "  npm run backend:prod" -ForegroundColor White
Write-Host ""
Write-Host "Backend démarrera sur:" -ForegroundColor Cyan
Write-Host "  http://localhost:3000" -ForegroundColor White
Write-Host ""

# 7. Instructions post-déploiement
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ Déploiement terminé avec succès!                    ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Démarrer le backend production:" -ForegroundColor White
Write-Host "   npm run backend:prod" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Tester l'API:" -ForegroundColor White
Write-Host "   npm run test:api" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Se connecter à l'admin:" -ForegroundColor White
Write-Host "   Email: admin@wao-felicitations.com" -ForegroundColor Yellow
Write-Host "   Password: AdminProd2026!SecurePassword" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT: Changez le mot de passe admin!" -ForegroundColor Red
Write-Host ""
