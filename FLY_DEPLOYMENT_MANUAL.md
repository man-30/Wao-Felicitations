# 🚀 DÉPLOIEMENT MANUEL FLY.IO - GUIDE COMPLET

## ÉTAPE 1: Authentification Fly.io (Browser Login)

Le script a ouvert votre navigateur à:
```
https://fly.io/app/auth/cli/[session-token]
```

**À faire:**
1. ✅ Allez sur le lien (ou ouvrez le navigateur si fermé)
2. ✅ Connectez-vous avec votre compte Fly.io (créez un compte si needed)
3. ✅ Cliquez "Authorize" ou "Login"
4. ✅ Revenez au terminal PowerShell
5. ✅ Appuyez sur **Enter** pour continuer

---

## ÉTAPE 2: Configuration Automatique (Après Auth)

Après avoir appuyé sur Enter, le script va:

```powershell
# Vérifier si l'app existe (sinon la créer)
flyctl launch --name wao-felicitations-api --region cdg --yes

# Définir les variables d'environnement secrets
flyctl secrets set \
  DATABASE_URL="postgresql://..." \
  DATABASE_URL_POOLED="postgresql://..." \
  JWT_SECRET="..." \
  ENCRYPTION_KEY="..." \
  CORS_ORIGIN="https://waooof.com,https://www.waooof.com" \
  NODE_ENV="production"

# Déployer le Docker container
flyctl deploy --force-machines

# Vérifier le statut
flyctl status
flyctl logs
```

---

## SI LE SCRIPT S'ARRÊTE

**Option A: Continuer Manuellement**

```powershell
cd "c:\Wao Felicitations"

# 1. Vérifier l'auth
flyctl auth whoami

# 2. Créer/mettre à jour l'app
flyctl launch --name wao-felicitations-api --region cdg --yes

# 3. Définir les secrets (voir section ci-dessous)
# Copier-coller chaque commande

# 4. Déployer
flyctl deploy --force-machines

# 5. Vérifier
flyctl status
flyctl logs --all
```

---

## ÉTAPE 3: Ajouter les Secrets Manuellement

**Option 1: Une par une (Plus simple)**

```powershell
# Base de données
flyctl secrets set DATABASE_URL="postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Pool de connexions
flyctl secrets set DATABASE_URL_POOLED="postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# JWT secret
flyctl secrets set JWT_SECRET="dev-secret-key-minimum-32-characters-xxxxxxxxxx"

# Encryption key
flyctl secrets set ENCRYPTION_KEY="dev-encryption-key-32chars-xxx"

# CORS origin
flyctl secrets set CORS_ORIGIN="https://waooof.com,https://www.waooof.com"

# Environment
flyctl secrets set NODE_ENV="production"
```

**Option 2: Fichier .env**

Créer `fly-secrets.env`:
```
DATABASE_URL=postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DATABASE_URL_POOLED=postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=dev-secret-key-minimum-32-characters-xxxxxxxxxx
ENCRYPTION_KEY=dev-encryption-key-32chars-xxx
CORS_ORIGIN=https://waooof.com,https://www.waooof.com
NODE_ENV=production
```

Puis:
```powershell
flyctl secrets import < fly-secrets.env
```

---

## ÉTAPE 4: Déployer

```powershell
cd "c:\Wao Felicitations"
flyctl deploy --force-machines
```

**Attendez:** La build Docker et le déploiement prennent 3-5 minutes

**Vous verrez:**
```
...
==> Building image with Docker
...
==> Pushing image to registry
...
==> Releasing new machine
...
==> Monitoring deployment
```

---

## ÉTAPE 5: Vérifier le Déploiement

```powershell
# Statut de l'app
flyctl status

# Logs en temps réel
flyctl logs --all

# Tester l'endpoint
curl https://wao-felicitations-api.fly.dev/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"dayo.dodzi@waooo.com","password":"Admin2026!"}'
```

**Succès si:**
- ✅ Status: "Running"
- ✅ Logs montrent: "Server running on port 3001"
- ✅ Curl retourne un JWT token

---

## 🎯 RÉSUMÉ DES COMMANDES

```powershell
# 1. Auth (une seule fois)
flyctl auth login

# 2. App setup
flyctl launch --name wao-felicitations-api --region cdg --yes

# 3. Secrets
flyctl secrets set DATABASE_URL="..."
flyctl secrets set DATABASE_URL_POOLED="..."
flyctl secrets set JWT_SECRET="..."
flyctl secrets set ENCRYPTION_KEY="..."
flyctl secrets set CORS_ORIGIN="https://waooof.com,https://www.waooof.com"
flyctl secrets set NODE_ENV="production"

# 4. Deploy
flyctl deploy --force-machines

# 5. Verify
flyctl status
flyctl logs --all
```

---

## 🔗 URL DE PRODUCTION

Une fois déployé:
- **Backend API:** https://wao-felicitations-api.fly.dev
- **Frontend:** https://waooof.com (connecté automatiquement)

---

## ❓ TROUBLESHOOTING

**"Fly CLI not found"**
```powershell
$env:PATH = "$env:PATH;$env:LOCALAPPDATA\flyctl"
```

**"Cannot reach Fly.io"**
- Vérifiez votre connexion internet
- Vérifiez: https://status.fly.io

**"Deploy failed"**
```powershell
flyctl logs --all
# Lisez les erreurs
```

**"Port 3001 already in use"**
- Le backend local est encore en cours d'exécution
- Fermez le terminal local du backend

---

## ✅ PROCHAINES ÉTAPES

1. Authentifiez-vous via le navigateur
2. Attendez le déploiement (3-5 min)
3. Testez: https://waooof.com
4. Verifiez pas de "Mode hors ligne"

---

**Status:** 🔧 EN ATTENTE D'AUTHENTIFICATION BROWSER
