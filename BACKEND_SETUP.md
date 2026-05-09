# Backend Setup Guide

## 1. Installation des Dépendances

```bash
npm install express cors dotenv jsonwebtoken bcrypt
npm install -D @types/express @types/node typescript ts-node

# Vérifier installation
npm list express cors jsonwebtoken bcrypt
```

## 2. Configuration Environnement

Créer un fichier `.env.backend` à la racine:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/dbname"
DATABASE_URL_POOLED="postgresql://user:password@host:port/dbname?schema=public"

# JWT
JWT_SECRET="your-256-bit-secret-key-minimum-32-characters-required-for-security"

# Encryption
ENCRYPTION_KEY="your-32-char-encryption-key-for-aes256"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:5173,http://localhost:3000"
```

### Générer des Clés:

```bash
# JWT_SECRET (générer 32+ caractères)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY (générateur 32 caractères pour AES-256)
node -e "console.log(require('crypto').randomBytes(32).toString('hex')).slice(0,32)"
```

## 3. Variables d'Environnement Requises

| Variable | Type | Exemple | Obligatoire |
|----------|------|---------|------------|
| `DATABASE_URL` | URL | `postgresql://user:pass@neon.tech/dbname` | ✅ |
| `DATABASE_URL_POOLED` | URL | `postgresql://user:pass@neon.tech:6432/dbname` | ✅ |
| `JWT_SECRET` | String | 32+ char hex string | ✅ |
| `ENCRYPTION_KEY` | String | 32 char hex string | ✅ |
| `PORT` | Number | 3000 | ❌ (default: 3000) |
| `NODE_ENV` | String | development\|production | ❌ (default: development) |
| `CORS_ORIGIN` | String | http://localhost:5173 | ❌ (default: *) |

## 4. Configurations Suggérées

### Development
```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN="http://localhost:5173,http://localhost:3000"
```

### Staging
```env
NODE_ENV=staging
PORT=3001
CORS_ORIGIN="https://staging.waofelicitations.com"
```

### Production
```env
NODE_ENV=production
PORT=3000
CORS_ORIGIN="https://app.waofelicitations.com"
```

## 5. Démarrage du Serveur

### Mode Development (avec hot-reload):
```bash
npx ts-node backend-express-complete.ts
```

### Mode Production:
```bash
# Compiler TypeScript
npx tsc backend-express-complete.ts

# Exécuter JavaScript compilé
node backend-express-complete.js
```

### Avec PM2 (Recommandé Production):
```bash
npm install -g pm2

# Créer ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'wao-api',
    script: './backend-express-complete.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '500M',
    wait_ready: true,
    listen_timeout: 10000
  }]
}
EOF

# Démarrer
pm2 start ecosystem.config.js

# Logs
pm2 logs

# Restart
pm2 restart wao-api

# Stop
pm2 stop wao-api
```

## 6. Tests de Connexion

### Test 1: Vérifier le serveur démarre

```bash
curl http://localhost:3000/api/dashboard/stats
# Doit retourner 401 (Unauthorized - pas de token)
```

### Test 2: Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin@wao.com",
    "password":"password123"
  }'

# Réponse:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": "u1",
#     "name": "Admin User",
#     "email": "admin@wao.com",
#     "role": "admin",
#     "zone": null
#   }
# }
```

### Test 3: Requête protégée

```bash
# Sauvegarder le token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Accéder à dashboard
curl http://localhost:3000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"

# Réponse:
# {
#   "users": 5,
#   "clients": 5,
#   "transactions": 2,
#   "tontineAccounts": 3,
#   "caisses": [...]
# }
```

### Test 4: Création client

```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kibonge Félicité",
    "type": "apprenant",
    "phone": "+243812345678",
    "address": "Kinshasa"
  }'

# Réponse:
# {
#   "id": "cl...",
#   "name": "Kibonge Félicité",
#   "membershipCode": "A1B2WF123",
#   "accountNumber": "ACC-1704067200000-AB3K",
#   "type": "apprenant",
#   "message": "Client created successfully with auto-generated codes"
# }
```

### Test 5: Audit logs

```bash
curl http://localhost:3000/api/audit-logs \
  -H "Authorization: Bearer $TOKEN"

# Réponse:
# {
#   "count": 15,
#   "logs": [
#     {
#       "id": "log1",
#       "userId": "u1",
#       "userName": "Admin User",
#       "userRole": "admin",
#       "action": "Connexion",
#       "details": "{\"ipAddress\":\"127.0.0.1\",...}",
#       "timestamp": "2024-01-15T10:30:00Z"
#     },
#     ...
#   ]
# }
```

## 7. Structure des Réponses

### Succès (200-201)
```json
{
  "id": "resource_id",
  "status": "success",
  "data": {...},
  "message": "Operation completed successfully"
}
```

### Erreur (400-500)
```json
{
  "error": "Error description",
  "message": "Detailed error information (dev only)",
  "requiredFields": ["field1", "field2"],
  "requiredRoles": ["admin"],
  "requiredPermissions": ["permission1"]
}
```

## 8. Gestion des Erreurs

### 401 Unauthorized
```json
{ "error": "No token provided" }
{ "error": "Invalid or expired token" }
{ "error": "User not authenticated" }
```

### 403 Forbidden
```json
{ "error": "Insufficient permissions", "requiredRoles": ["admin"] }
{ "error": "Insufficient permissions", "requiredPermissions": ["process:transactions"] }
{ "error": "Access denied to this zone" }
```

### 400 Bad Request
```json
{ "error": "Missing required fields: name, type, phone" }
{ "error": "Invalid client type" }
{ "error": "Invalid phone format" }
```

### 500 Server Error
```json
{ "error": "Internal server error" }
```

## 9. Logging & Monitoring

### Logs d'Action (ActionLog)

Tous les événements critiques sont loggés automatiquement:

```typescript
// Voir dans la table action_logs:
const logs = await prisma.actionLog.findMany({
  orderBy: { timestamp: 'desc' },
  take: 100
})
```

### Fichiers de Log (PM2)

```bash
# Voir logs
pm2 logs wao-api

# Logs d'erreur
tail -f logs/error.log

# Logs stdout
tail -f logs/output.log
```

## 10. Performance & Optimisation

### Indexes Prisma (Automatique)
```prisma
// Tous les FK, emails, codes, dates sont indexés
model Client {
  id              String @id @default(cuid())
  email           String @unique
  membershipCode  String @unique
  accountNumber   String @unique
  @@index([email])
  @@index([membershipCode])
}
```

### Query Optimization
```typescript
// ✅ Bon: Inclure seulement les relations nécessaires
const client = await prisma.client.findUnique({
  where: { id },
  include: { accounts: true, apprenants: true }
})

// ❌ Mauvais: Charger tout sans limites
const client = await prisma.client.findUnique({
  where: { id },
  include: { 
    accounts: true,
    apprenants: { include: { documents: true } },
    cotisations: true,
    // ... tous les champs
  }
})
```

### Connection Pooling
```env
# Utilisé par défaut avec DATABASE_URL_POOLED
# PgBouncer sur Neon gère le pooling automatiquement
DATABASE_URL_POOLED="postgresql://user:pass@neon.tech:6432/db"
```

## 11. Checklist Déploiement

- [ ] Variables d'environnement correctement définies
- [ ] JWT_SECRET générée (32+ caractères)
- [ ] ENCRYPTION_KEY générée (32 caractères)
- [ ] Database URLs testées (DATABASE_URL et DATABASE_URL_POOLED)
- [ ] Migrations Prisma appliquées (`npx prisma migrate deploy`)
- [ ] Données seed chargées (si applicable)
- [ ] Server démarre sans erreurs
- [ ] Tests de connexion réussis
- [ ] Audit logs enregistrés correctement
- [ ] CORS configuré pour domaines autorisés
- [ ] SSL/TLS activé (production)
- [ ] Monitoring en place (PM2, Sentry, etc.)
- [ ] Backups database configurés
- [ ] Rate limiting mis en place (si applicable)

## 12. Troubleshooting

### Erreur: "Cannot find module '@prisma/client'"
```bash
npm install @prisma/client
npx prisma generate
```

### Erreur: "Invalid token"
```bash
# Vérifier JWT_SECRET dans .env
# Régénérer avec: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Erreur: "Connection timeout"
```bash
# Vérifier DATABASE_URL et DATABASE_URL_POOLED
# Tester avec: psql $DATABASE_URL -c "SELECT 1"
```

### Erreur: "RBAC permission denied"
```bash
# Vérifier les rôles de l'utilisateur
# Admin peut tout faire
# Caissier: process:transactions, validate:transactions, record:cotisations
# Commercial: record:cotisations, manage:clients
```

## 13. Escalade en Production

### Recommandations:

1. **API Gateway** (Nginx, Cloudflare)
   - SSL/TLS termination
   - Rate limiting
   - Load balancing

2. **Monitoring** (Datadog, New Relic)
   - Performance metrics
   - Error tracking
   - Alert thresholds

3. **Logging** (ELK, Sentry)
   - Centralized logs
   - Error aggregation
   - Tracing

4. **Security** (Auth0, Okta)
   - MFA support
   - Single Sign-On
   - OAuth2

5. **Database** (Neon PostgreSQL)
   - Automated backups
   - Point-in-time recovery
   - High availability

---

## Support & Documentation

- Backend Examples: `backend-express-complete.ts`
- Security Implementation: `lib/security.ts`
- Business Logic: `lib/db/businessLogic.ts`
- Action Logging: `lib/db/actionLog.ts`
- Middleware: `lib/middleware/auth.ts`

---

**Dernière mise à jour: Janvier 2024**
