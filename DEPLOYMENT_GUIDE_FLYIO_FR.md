# 🚀 DÉPLOIEMENT BACKEND SUR FLY.IO

## ✅ Ce qui est déjà prêt

- ✅ **Frontend**: Fonctionne sur https://waooof.com
- ✅ **Database**: Neon PostgreSQL prêt
- ✅ **Code GitHub**: Poussé avec Dockerfile et configuration
- ✅ **Domaine**: waooof.com active

## ⏳ À faire: Déployer le backend (15 minutes)

---

## 📥 ÉTAPE 1: Installer Fly CLI

### **Sur Windows:**

**Option A: Via Chocolatey** (si vous avez Chocolatey)
```powershell
choco install flyctl
```

**Option B: Télécharger directement**
1. Allez à: https://fly.io/docs/hands-on/install-flyctl/
2. Téléchargez: **flyctl_windows_amd64.zip**
3. Décompressez dans: `C:\Program Files\` (ou n'importe où)
4. Ajoutez au PATH (ou utilisez le chemin complet)

**Vérifiez l'installation:**
```powershell
flyctl version
```

---

## 🔐 ÉTAPE 2: Créer Compte Fly.io et Se Connecter

1. Allez à: https://fly.io
2. Cliquez **"Sign Up"** (gratuit)
3. Créez un compte avec GitHub (recommandé)
4. Dans PowerShell:

```powershell
flyctl auth login
```

Cela ouvrira votre navigateur pour confirmer la connexion.

---

## 🚀 ÉTAPE 3: Initialiser le Projet Fly.io

```powershell
cd "c:\Wao Felicitations"
flyctl launch
```

**À chaque prompt, répondez ainsi:**

```
? App Name (leave blank to use an auto-generated name):
> wao-felicitations-api

? Select Organization:
> [Your account] (select default)

? Select region:
> cdg (Europe - Paris - closest to you)

? Would you like to set up Postgres now?
> No

? Would you like to set up Redis now?
> No

? Would you like to set up a Upstash Redis database now?
> No

? Create .dockerignore?
> Yes (if not already present)

? Deploy now?
> No (we need to set secrets first)
```

**Résultat:** Crée `fly.toml` (ou vous l'avez déjà)

---

## 🔑 ÉTAPE 4: Ajouter les Variables d'Environnement (Secrets)

Exécutez ces commandes **une par une**:

```powershell
flyctl secrets set DATABASE_URL="postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

flyctl secrets set DATABASE_URL_POOLED="postgresql://neondb_owner:npg_dr9bCzp8hDyv@ep-still-fog-am43u8yd-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

flyctl secrets set JWT_SECRET="dev-secret-key-minimum-32-characters-xxxxxxxxxx"

flyctl secrets set ENCRYPTION_KEY="dev-encryption-key-32chars-xxx"

flyctl secrets set CORS_ORIGIN="https://waooof.com,https://www.waooof.com"

flyctl secrets set NODE_ENV="production"
```

**Vérifiez:**
```powershell
flyctl secrets list
```

Devrait afficher 6 secrets ✅

---

## 🚢 ÉTAPE 5: Déployer le Backend

```powershell
flyctl deploy
```

**Cela prendra 3-5 minutes. Attendez le message:**

```
Searching for an existing app with the name [wao-felicitations-api]...

Provisioning ips for wao-felicitations-api
  Dedicated ipv4: xxx.xxx.xxx.xxx
  Shared ipv4: xxx.xxx.xxx.xxx
  
  ...
  
  Image: registry.fly.io/wao-felicitations-api:deployment-xxxxx
  
  Running wao-felicitations-api with command: npx tsx backend-express-complete.ts
  
✓ Deployment complete
```

**URL de votre backend:**
```
https://wao-felicitations-api.fly.dev
```

---

## ✅ ÉTAPE 6: Vérifier que le Backend Fonctionne

**Commandes:**

```powershell
# Voir l'état du déploiement
flyctl status

# Voir les logs en temps réel
flyctl logs

# Tester l'API
curl "https://wao-felicitations-api.fly.dev/api/auth/login" -X POST -H "Content-Type: application/json" -d "{\"email\":\"dayo.dodzi@waooo.com\",\"password\":\"Admin2026!\"}"
```

**Vous devriez voir:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "admin1",
    "name": "DAYO K. Dodzi",
    "email": "dayo.dodzi@waooo.com",
    "role": "admin",
    "zone": "Agence Centrale"
  }
}
```

---

## 🔗 ÉTAPE 7: Connecter le Frontend au Backend

**Option A: Via Vercel (Recommandé)**

1. Allez à: https://vercel.com
2. Projet: **wao-felicitations**
3. **Settings** → **Environment Variables**
4. Cliquez **Add New**
   - Name: `VITE_API_URL`
   - Value: `https://wao-felicitations-api.fly.dev`
   - Environments: Production
5. Cliquez **Save**
6. **Deployments** → **Redeploy** (le dernier déploiement)

**Option B: Via Code Modifié**

Modifier `src/config/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'https://wao-felicitations-api.fly.dev'
```

Puis:
```powershell
git add src/config/api.ts
git commit -m "Update backend API URL to production"
git push origin main
# Vercel auto-redeploy
```

---

## 🎯 Vérification Finale

Allez à: https://waooof.com

**Testez:**
1. ✅ Page de login s'affiche
2. ✅ Login avec: `dayo.dodzi@waooo.com` / `Admin2026!`
3. ✅ Dashboard charge
4. ✅ Aucun message "Mode hors ligne"
5. ✅ Vous pouvez naviguer

**Si tout fonctionne:** 🎉 **Déploiement réussi!**

---

## 🔧 Troubleshooting

### Backend ne démarre pas:
```powershell
flyctl logs --all
# Cherchez les erreurs
```

### Timeout de connexion:
```powershell
# Redémarrez l'app
flyctl restart

# Vérifiez les secrets
flyctl secrets list
```

### Domaine ne fonctionne pas:
```powershell
# Vérifiez l'URL
flyctl info

# Reconstruire et redéployer
flyctl deploy --local-only
```

---

## 📊 État Après Déploiement

| Composant | Status |
|-----------|--------|
| Frontend | ✅ https://waooof.com |
| Backend | ✅ https://wao-felicitations-api.fly.dev |
| Database | ✅ Neon PostgreSQL |
| Domaine | ✅ waooof.com |
| **Application** | ✅ **24/7 LIVE** |

---

## ⚡ Prochaines Étapes

1. ✅ Installer Fly CLI
2. ✅ `flyctl auth login`
3. ✅ `flyctl launch` (dans le dossier du projet)
4. ✅ Ajouter les 6 secrets
5. ✅ `flyctl deploy`
6. ✅ Tester sur https://waooof.com
7. ✅ 🎉 Fini!

**Estimé: 15 minutes total**

---

**Questions? Lire DEPLOY_TO_FLY.md pour plus de détails**
