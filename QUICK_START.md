# QUICK START — Lancer le Backend Localement

**Durée**: 5 minutes  
**Prérequis**: Node.js v18+, npm, PostgreSQL accessible  

---

## ✅ Étape 1: Vérifier que les Dépendances sont Installées

```bash
cd c:\Wao Felicitations

# Vérifier npm
npm --version
# ✅ Doit afficher: v9.x.x ou plus récent

# Vérifier que les libs backend existent
npm list express cors jsonwebtoken bcryptjs @prisma/client

# ✅ Doit afficher toutes les versions
# Si manquant, installer:
npm install express cors jsonwebtoken bcryptjs @prisma/client
```

---

## ✅ Étape 2: Configurer la Base de Données

### 2.1 Créer un fichier `.env.backend`

```bash
# Créer le fichier (ou modifier le .env existant)
cat .env.backend
```

Contenu minimal `.env.backend`:
```
NODE_ENV=development
PORT=3001

# Remplacer par vos URLs Neon réelles!
DATABASE_URL="postgresql://neonuser:password@ep-xxxxx.neon.tech:5432/neondb"
DATABASE_URL_POOLED="postgresql://neonuser:password@ep-xxxxx-pooled.neon.tech:5432/neondb"

# Secrets (dev - pas sécurisé, juste pour tests)
JWT_SECRET="dev-secret-key-minimum-32-characters-xxxxxxxxxx"
ENCRYPTION_KEY="dev-encryption-key-32-chars-xxxxxxxxxxxxxx"

CORS_ORIGIN="http://localhost:3000,http://localhost:5173"
LOG_LEVEL=info
```

**🔴 IMPORTANT**: Remplacer `DATABASE_URL` et `DATABASE_URL_POOLED` avec vos URLs Neon réelles!

### 2.2 Tester la Connexion Base de Données

```bash
# Vérifier que Prisma peut se connecter
npx prisma db execute --stdin < /dev/null

# ✅ Résultat:
# Connection successful

# Si erreur:
# Error: Can't reach database server at `xxxx`
# → Vérifier DATABASE_URL_POOLED est correct
# → Vérifier Neon project est actif
```

---

## ✅ Étape 3: Lancer le Backend

### Option A: Démarrage Simple (Développement)

```bash
# Terminal 1: Lancer le backend
cd c:\Wao Felicitations
npx ts-node backend-express-complete.ts

# ✅ Résultat attendu:
# ✅ Server running on port 3001
# ✅ Database connected
# ✅ Ready to accept requests

# Le terminal reste ouvert et affiche les requêtes entrantes
```

### Option B: Démarrage avec PM2 (Production-Like)

```bash
# Installer PM2 (si pas déjà)
npm install -g pm2

# Terminal 1: Lancer avec PM2
pm2 start backend-express-complete.ts --name "waooo-api-dev"

# Voir les logs
pm2 logs waooo-api-dev

# Arrêter
pm2 stop waooo-api-dev

# Restart
pm2 restart waooo-api-dev
```

### Option C: Build + Node (Performance)

```bash
# Compiler TypeScript
npm run build

# Lancer le JS compilé
node dist/backend-express-complete.js
```

---

## ✅ Étape 4: Vérifier que l'API Répond

### Terminal 2 (nouveau terminal, garder le premier actif)

```bash
# Tester le health check
curl http://localhost:3001/api/health

# ✅ Résultat (200 OK):
{
  "status": "ok",
  "timestamp": "2026-05-05T10:00:00Z"
}

# Tester login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wao-felicitations.com",
    "password": "your_password"
  }'

# ✅ Résultat (200 OK):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}

# Si login échoue (401):
# → Vérifier que seed a été exécuté
# → Vérifier que email + password existent en base
```

---

## 🧪 Étape 5: Lancer les Tests Manuels

Maintenant que le backend tourne:

```bash
# Ouvrir le guide de tests manuels
open PHASE_9_MANUAL_TESTING.md
# ou sur Windows:
start PHASE_9_MANUAL_TESTING.md
```

Puis suivre **SECTION 1 → SECTION 5** du guide avec:
- Postman (recommandé - import de collection possible)
- Insomnia
- curl (depuis Terminal 3)

---

## 📊 Monitor l'Application

### Voir les requêtes en temps réel

```bash
# Terminal 1 (où le backend tourne):
# Vous verrez les logs de chaque requête:

POST /api/auth/login 200 45ms
GET /api/clients/xxx 200 32ms
POST /api/transactions 201 78ms
PUT /api/transactions/xxx/validate 200 55ms
GET /api/audit-logs 200 89ms
```

### Voir les erreurs

```bash
# Si une requête retourne 500 ou erreur:
# Regarder Terminal 1 pour voir le stack trace
# Exemple:
ERROR: Cannot find user with id 'xxx'
  at recordTransaction (/path/to/businessLogic.ts:45)
```

---

## 🛑 Arrêter le Backend

```bash
# Terminal 1: Appuyer sur Ctrl+C

# Ou si lancé avec PM2:
pm2 stop waooo-api-dev
```

---

## 🔧 Troubleshooting

### Erreur: "Port 3001 already in use"
```bash
# Un autre processus utilise le port
# Option 1: Utiliser un port différent
PORT=3002 npx ts-node backend-express-complete.ts

# Option 2: Tuer le processus existant
# PowerShell:
Get-Process | Where-Object {$_.Name -like "*node*"} | Stop-Process
```

### Erreur: "Cannot find module '@prisma/client'"
```bash
npm install @prisma/client
npx prisma generate
```

### Erreur: "Connection refused" ou "ECONNREFUSED"
```bash
# Vérifier DATABASE_URL_POOLED
cat .env.backend | grep DATABASE_URL_POOLED

# Vérifier le format:
# postgresql://user:password@host:5432/database

# Tester la connexion Neon directement:
npx prisma db execute --stdin < /dev/null
```

### Erreur: "User not found" (401 lors login)
```bash
# Vérifier que la base a du seed
# Aller sur Neon console → SQL Editor et exécuter:
SELECT email, user_role FROM users LIMIT 10;

# Si table vide, exécuter le seed:
npx prisma db seed
```

### Performance très lente (> 1s)
```bash
# Option 1: Vérifier la connexion réseau
# Vérifier latence vers Neon
ping neon.tech

# Option 2: Vérifier les requêtes DB
# Activer Prisma logging
DATABASE_DEBUG=* npx ts-node backend-express-complete.ts

# Option 3: Vérifier les index
# Aller sur Neon console → SQL Editor:
SELECT schemaname, tablename, indexname FROM pg_indexes
WHERE tablename NOT LIKE 'pg_%'
ORDER BY tablename;
```

---

## 📚 Documentation Complète

| Document | Contenu |
|----------|---------|
| [PHASE_9_MANUAL_TESTING.md](./PHASE_9_MANUAL_TESTING.md) | Guide détaillé des tests (✅ LANCER APRÈS DÉMARRAGE) |
| [backend-express-complete.ts](./backend-express-complete.ts) | Code API (13 routes) |
| [RECAP_PHASES_6_7_8.md](./RECAP_PHASES_6_7_8.md) | Référence technique |
| [.env.backend](./.env.backend) | Configuration (modifiez vos URLs Neon!) |

---

## 🎯 Prochaines Étapes

1. ✅ Démarrer le backend (Étape 3)
2. ✅ Vérifier qu'il répond (Étape 4)
3. ✅ Lancer tests manuels (Étape 5)
4. ✅ Collectionner les résultats
5. → Quand tous tests PASS: Passer à **PHASE 10** (Staging)

---

**Créé**: May 4, 2026  
**Temps estimation**: 5 min startup + 2-3h tests  
**Status**: ✅ Prêt

