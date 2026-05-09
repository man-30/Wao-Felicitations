# DEPLOYMENT GUIDE - PHASE 6, 7, 8 ✅

## Table des Matières

1. [Vérification Pré-Déploiement](#vérification)
2. [Installation & Configuration](#installation)
3. [Tests & Validation](#tests)
4. [Déploiement Local](#déploiement-local)
5. [Déploiement Production](#déploiement-production)
6. [Monitoring & Support](#monitoring)
7. [Roadmap PHASE 9-11](#roadmap)

---

## Vérification Pré-Déploiement {#vérification}

### Checklist des Fichiers

Vérifier que tous les fichiers suivants sont présents:

```bash
✅ lib/security.ts                          # PHASE 6
✅ lib/db/businessLogic.ts                  # PHASE 7
✅ lib/db/actionLog.ts                      # PHASE 8
✅ lib/middleware/auth.ts                   # PHASE 6 Middlewares
✅ backend-express-complete.ts              # API complète
✅ prisma/schema.prisma                     # Schema (PHASE 2-4)
✅ prisma/seed.js                           # Seed data (PHASE 5)
✅ tsconfig.backend.json                    # TypeScript config
✅ RECAP_PHASES_6_7_8.md                    # Documentation
✅ BACKEND_SETUP.md                         # Setup guide
✅ USAGE_EXAMPLES.ts                        # Exemples
✅ VALIDATION_TESTS.ts                      # Tests
```

### Vérifier les Dépendances

```bash
npm list | grep -E "(express|@prisma|jsonwebtoken|bcrypt|cors)"

# Résultats attendus:
# ├── @prisma/client@7.8.0
# ├── bcrypt@5.1.0
# ├── cors@2.8.5
# ├── dotenv@16.0.0
# ├── express@4.18.0
# └── jsonwebtoken@9.0.0
```

### Vérifier la Configuration

```bash
# Vérifier .env backend existe
cat .env.backend

# Doit contenir:
# DATABASE_URL=postgresql://...
# DATABASE_URL_POOLED=postgresql://...
# JWT_SECRET=<32+ chars>
# ENCRYPTION_KEY=<32 chars>
```

---

## Installation & Configuration {#installation}

### 1. Installer les Dépendances

```bash
npm install express cors dotenv jsonwebtoken bcrypt
npm install -D @types/express @types/node typescript ts-node
```

### 2. Générer les Clés de Sécurité

```bash
# JWT_SECRET (256 bits = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY (32 chars pour AES-256)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 3. Créer .env.backend

```bash
cat > .env.backend << 'EOF'
# Database
DATABASE_URL="postgresql://user:pass@host/dbname"
DATABASE_URL_POOLED="postgresql://user:pass@host:6432/dbname"

# Sécurité
JWT_SECRET="<votre-clé-jwt-de-32-caractères-minimum>"
ENCRYPTION_KEY="<votre-clé-encryption-32-caractères>"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:5173,http://localhost:3000"
EOF
```

### 4. Initialiser la Base de Données

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate deploy

# Charger les données de test (optionnel)
npm run seed
```

---

## Tests & Validation {#tests}

### Exécuter les Tests de Validation

```bash
npx ts-node VALIDATION_TESTS.ts

# Résultat attendu:
# ✅ hashPassword: crée un hash bcrypt ...
# ✅ verifyPassword: vérifie le bon password ...
# ✅ encryptField: chiffre et retourne format iv:ciphertext ...
# [... 30+ tests ...]
# ✅ TOUS LES TESTS RÉUSSIS!
```

### Exécuter les Exemples

```bash
npx ts-node USAGE_EXAMPLES.ts

# Résultat:
# === PHASE 6: SÉCURITÉ ===
# 1. Hachage password:
#    Original: MySecurePassword123!
#    Hashed: $2b$10$...
#    Verification: ✅ Valid
# [... exemples complets ...]
```

---

## Déploiement Local {#déploiement-local}

### Démarrer le Serveur en Développement

```bash
# Mode ts-node (live reload)
npx ts-node backend-express-complete.ts

# Résultat:
# ╔══════════════════════════════════════════════════════════╗
# ║   Wao Félicitations - API Server                        ║
# ║   PHASE 6, 7, 8 - Sécurité, Logique Métier, Logs       ║
# ╚══════════════════════════════════════════════════════════╝
# 
# Server running on http://localhost:3000
```

### Test Basique de l'API

```bash
# 1. Vérifier que le serveur répond
curl -i http://localhost:3000/api/dashboard/stats
# Réponse: 401 Unauthorized (pas de token - c'est normal!)

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wao.com","password":"password123"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# 3. Accéder à une ressource protégée
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/dashboard/stats | jq

# Résultat:
# {
#   "users": 5,
#   "clients": 5,
#   "transactions": 2,
#   "tontineAccounts": 3,
#   "caisses": [...]
# }
```

### Tester les Routes Principales

```bash
# Créer un client
curl -X POST http://localhost:3000/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "type": "apprenant",
    "phone": "+243812345678",
    "address": "Test City"
  }' | jq

# Récupérer les logs
curl http://localhost:3000/api/audit-logs \
  -H "Authorization: Bearer $TOKEN" | jq '.logs | length'
```

---

## Déploiement Production {#déploiement-production}

### 1. Compiler TypeScript

```bash
npx tsc --project tsconfig.backend.json

# Vérifie la syntaxe et génère .js dans dist/
```

### 2. Utiliser PM2 pour Manager l'Application

```bash
npm install -g pm2

# Créer configuration PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'wao-api',
    script: './dist/backend-express-complete.js',
    instances: 4,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '500M',
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 3000,
    kill_timeout: 5000
  }]
}
EOF

# Démarrer
pm2 start ecosystem.config.js

# Vérifier le status
pm2 status

# Voir les logs
pm2 logs wao-api

# Sauvegarder la configuration
pm2 save

# Lancer au démarrage (Linux)
pm2 startup
```

### 3. Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/wao-api.conf
upstream wao_api {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 443 ssl http2;
    server_name api.waofelicitations.com;

    ssl_certificate /etc/letsencrypt/live/waofelicitations.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/waofelicitations.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req zone=api_limit burst=200 nodelay;

    location / {
        proxy_pass http://wao_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 4. Healthcheck Endpoint (Optionnel)

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  })
})
```

---

## Monitoring & Support {#monitoring}

### Logs et Monitoring

```bash
# Voir les logs PM2
pm2 logs wao-api --lines 100

# Voir les erreurs
tail -f logs/error.log

# Voir les logs complets
tail -f logs/output.log

# Statistiques
pm2 monit

# Sauvegarder les logs
pm2 save
```

### Alertes & Notifications

Intégrer avec service de monitoring:
- **Datadog**: Pour APM et monitoring
- **Sentry**: Pour error tracking
- **PagerDuty**: Pour alertes critiques

```typescript
// Exemple Sentry
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.errorHandler());
```

### Backups Database

```bash
# Neon (Cloud Postgres) - backups automatiques
# Vérifier dans Neon Dashboard: 
# Settings > Backups > Retention: 7 jours

# Backup manuel (optionnel)
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
zcat backup_20240115.sql.gz | psql $DATABASE_URL
```

---

## Roadmap PHASE 9-11 {#roadmap}

### ✋ PHASE 9: Tests & Validation

**Objectifs:**
- [ ] Tests unitaires pour security.ts (20+ tests)
- [ ] Tests unitaires pour businessLogic.ts (15+ tests)
- [ ] Tests d'intégration API (25+ tests)
- [ ] Tests de permission RBAC
- [ ] Tests de constraints CHECK database
- [ ] Load testing (1000+ req/s)

**Fichiers à Créer:**
```
tests/
├── unit/
│   ├── security.test.ts
│   ├── businessLogic.test.ts
│   └── actionLog.test.ts
├── integration/
│   ├── auth.test.ts
│   ├── clients.test.ts
│   ├── transactions.test.ts
│   └── cotisations.test.ts
└── e2e/
    └── workflow.test.ts
```

**Framework Recommandé:** Jest + Supertest
```bash
npm install -D jest @types/jest ts-jest supertest @types/supertest
```

### ✋ PHASE 10: Promotion Staging

**Objectifs:**
- [ ] Configurer environnement staging
- [ ] Déployer code complet
- [ ] Tests de charge
- [ ] Validation sécurité (OWASP Top 10)
- [ ] Penetration testing (optionnel)
- [ ] UAT avec stakeholders

**Checklist Sécurité:**
- [ ] SQL Injection (parameterized queries ✅)
- [ ] XSS Protection (JWT + CORS)
- [ ] CSRF Protection (SameSite cookies)
- [ ] Authentication bypass (JWT validation ✅)
- [ ] Unauthorized access (RBAC ✅)
- [ ] Sensitive data exposure (Encryption ✅)
- [ ] XML External Entities (N/A - JSON only)
- [ ] Broken access control (RBAC ✅)
- [ ] Using components with known vulnerabilities (npm audit)
- [ ] Insufficient logging (ActionLog ✅)

### ✋ PHASE 11: Déploiement Production

**Pré-Déploiement:**
- [ ] Cloner la config staging
- [ ] Vérifier les variables d'environnement
- [ ] Tester les backups
- [ ] Notifier les équipes
- [ ] Préparer rollback plan

**Déploiement:**
```bash
# 1. Compiler
npm run build

# 2. Lancer les migrations
npx prisma migrate deploy

# 3. Démarrer avec PM2
pm2 start ecosystem.config.js
pm2 save

# 4. Vérifier la santé
curl https://api.waofelicitations.com/health

# 5. Monitorer
pm2 logs wao-api
```

**Post-Déploiement:**
- [ ] Vérifier tous les endpoints
- [ ] Confirmer les logs d'audit
- [ ] Tester les workflows critiques
- [ ] Monitorer les métriques (CPU, RAM, requêtes)
- [ ] Prévoir support 24/7

---

## Structure de Répertoires Finale

```
Wao Felicitations/
├── src/
│   ├── components/          (Frontend React)
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── lib/
│   ├── security.ts          (PHASE 6)
│   ├── db/
│   │   ├── businessLogic.ts (PHASE 7)
│   │   └── actionLog.ts     (PHASE 8)
│   └── middleware/
│       └── auth.ts          (PHASE 6)
├── prisma/
│   ├── schema.prisma        (PHASE 2-4)
│   ├── seed.js              (PHASE 5)
│   └── migrations/
├── tests/                   (PHASE 9)
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── logs/                    (Production)
│   ├── error.log
│   └── output.log
├── dist/                    (Compiled JS)
├── node_modules/
├── .env.backend             (Configuration)
├── backend-express-complete.ts
├── ecosystem.config.js      (PM2)
├── tsconfig.backend.json
├── package.json
└── README.md
```

---

## Commandes Utiles

```bash
# Development
npx ts-node backend-express-complete.ts

# Tests
npx ts-node VALIDATION_TESTS.ts
npx ts-node USAGE_EXAMPLES.ts
npm run test (PHASE 9)

# Build Production
npm run build
npx tsc --project tsconfig.backend.json

# Database
npx prisma studio
npx prisma db push
npx prisma migrate deploy
npm run seed

# PM2
pm2 start ecosystem.config.js
pm2 logs wao-api
pm2 restart wao-api
pm2 stop wao-api

# Docker (Optionnel)
docker build -t wao-api:latest .
docker run -p 3000:3000 --env-file .env.backend wao-api:latest
```

---

## Support & Escalation

**Pour les Problèmes:**
1. Vérifier les logs: `pm2 logs wao-api`
2. Vérifier les audit logs: `/api/audit-logs`
3. Vérifier les constraints database
4. Consulter RECAP_PHASES_6_7_8.md
5. Contacter l'équipe technique

**Documentation:**
- RECAP_PHASES_6_7_8.md - Implémentation complète
- BACKEND_SETUP.md - Configuration
- USAGE_EXAMPLES.ts - Exemples pratiques
- VALIDATION_TESTS.ts - Tests de validation

---

## Timeline Estimée

| Phase | Durée | Status |
|-------|-------|--------|
| 6 - Sécurité | ✅ Complétée | Done |
| 7 - Logique Métier | ✅ Complétée | Done |
| 8 - Journalisation | ✅ Complétée | Done |
| 9 - Tests (PHASE 9) | 2-3 semaines | Planned |
| 10 - Staging (PHASE 10) | 1-2 semaines | Planned |
| 11 - Production (PHASE 11) | 1 semaine | Planned |

---

**Status: PHASE 6, 7, 8 ✅ COMPLÈTEMENT IMPLÉMENTÉES**

**Prochaine Étape: PHASE 9 - Tests & Validation**

*Dernière mise à jour: Janvier 2024*
