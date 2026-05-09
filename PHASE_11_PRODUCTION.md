# PHASE 11 — Mise en Production (branche `staging` → `main`)

**Status**: 🔴 Bloquée jusqu'à Phase 10 complétée  
**Branche Neon**: `staging` → `main`  
**Durée estimée**: 1-2 jours  
**Équipe requise**: 2 DevOps + 1 SRE + 1 Product Owner  
**Risk Level**: 🔴 CRITIQUE — Rollback plan obligatoire

---

## 🚨 PRÉ-REQUIS IMPÉRATIVEMENT VALIDÉS

Avant de lire cette section, **TOUS** ces critères doivent être ✅:

```
✅ Phase 9 (Tests) complètement réussie
✅ Phase 10 (Staging) sign-off signé
✅ Aucun blocker critique en staging
✅ Load test 100+ users PASS
✅ Sécurité audit complet PASS
✅ Rollback plan testé & documenté
✅ Team lead Production en standby
✅ Support 24/7 prêt pour escalade
```

---

## 📋 Checklist Mise en Production

### 1️⃣ Verification Préalable (T-24h)

#### 1.1 Vérifier l'État Final de Staging

```bash
# Arrêter les modifications en staging
✅ Gel du code: aucune pull request acceptée après T-24h
✅ Gel de la base: aucune modification de schéma après T-24h

# Snapshot de staging pour rollback
DATABASE_URL_STAGING="postgresql://neonuser:password@staging-xxxxx.neon.tech:5432/neondb"

# Exporter snapshot complet
pg_dump \
  --host=staging-xxxxx.neon.tech \
  --port=5432 \
  --username=neonuser \
  --dbname=neondb \
  --format=custom \
  --file=rollback_snapshot_production.dump

# ✅ Vérifier taille du snapshot
ls -lh rollback_snapshot_production.dump

# Chiffrer & sauvegarder
openssl enc -aes-256-cbc -in rollback_snapshot_production.dump -out rollback_snapshot_production.dump.enc

# Copier dans Azure Blob Storage / S3 pour sécurité
az storage blob upload --container-name backups --name snapshots/staging_20260504.dump.enc --file rollback_snapshot_production.dump.enc
```

#### 1.2 Logs & Monitoring Baseline

```bash
# Enregistrer l'état actuel
✅ Nombre utilisateurs actifs
✅ Taille base données
✅ Nombre transactions (pour vérification fin)
✅ État de tous les services

# Commandes:
psql -h staging-xxxxx.neon.tech -U neonuser -d neondb << SQL
-- Counts avant production
SELECT 'users' as table_name, COUNT(*) FROM users
UNION
SELECT 'clients' as table_name, COUNT(*) FROM clients
UNION
SELECT 'transactions' as table_name, COUNT(*) FROM transactions
UNION
SELECT 'action_logs' as table_name, COUNT(*) FROM action_logs;
SQL
```

#### 1.3 Team Communication

```bash
# Envoyer notifications
📧 Email à stakeholders:
   Subject: "🔴 PRODUCTION DEPLOYMENT — Dimanche 5 Mai 22h00"
   Content:
   - Timeline: 22h00 - 23h30
   - Services affectés: Tous les caisses + dashboard
   - Rollback time: <5 minutes si critère
   - Support 24/7: [Numero]
   
📱 Slack #deployments:
   "🚀 Production deployment dans 24h. Freeze en place. Personne ne commit!"
```

---

### 2️⃣ Apport des Migrations en Production (T-4h)

#### 2.1 Créer la Branche `main` (Production) sur Neon

```bash
# Via Neon Dashboard
1. Aller à: Branches
2. Clique "Create branch"
3. Nommer: main
4. Source: staging (copy-on-write)
5. ✅ Attendez que Neon finisse le COW (~30s)
```

#### 2.2 Appliquer les Migrations sur `main`

```bash
# Configurer DATABASE_URL vers main
export DATABASE_URL="postgresql://neonuser:password@main-xxxxx.neon.tech:5432/neondb"

# Appliquer les migrations
npx prisma migrate deploy

# Vérifier le succès
npx prisma db execute --stdin << SQL
\dt
SELECT COUNT(*) FROM pg_stat_user_tables;
SQL

# ✅ Doit afficher: 18 tables créées (ou plus si ajouts)
```

#### 2.3 Appliquer le Seed Production

```bash
# Seed de PRODUCTION (données RÉELLES minimales)
# ⚠️ NE PAS utiliser le seed de staging!

cat > prisma/seed-production.ts << 'EOF'
import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...');

  // 1. CRÉER UTILISATEURS PRODUCTION (admin + 2 caissiers)
  
  // Admin production (utiliser credential vault, pas hardcoder!)
  const adminPassword = process.env.PROD_ADMIN_PASSWORD!;
  const admin = await prisma.user.create({
    data: {
      email: 'admin@wao-felicitations.com',
      password: await bcrypt.hash(adminPassword, 10),
      user_role: 'admin',
      is_active: true,
      zone: 'Kinshasa',
      created_at: new Date()
    }
  });

  // Caissier 1
  const teller1 = await prisma.user.create({
    data: {
      email: 'caissier1@wao-felicitations.com',
      password: await bcrypt.hash(process.env.PROD_TELLER1_PASSWORD!, 10),
      user_role: 'caissier',
      is_active: true,
      zone: 'Kinshasa',
      created_at: new Date()
    }
  });

  // Caissier 2
  const teller2 = await prisma.user.create({
    data: {
      email: 'caissier2@wao-felicitations.com',
      password: await bcrypt.hash(process.env.PROD_TELLER2_PASSWORD!, 10),
      user_role: 'caissier',
      is_active: true,
      zone: 'Lubumbashi',
      created_at: new Date()
    }
  });

  // 2. CRÉER 3 CAISSES INITIALES

  const caisses = await Promise.all([
    prisma.cashRegister.create({
      data: {
        name: '[PRODUCTION] Caisse Générale - Kinshasa',
        type: 'generale',
        balance: new Prisma.Decimal('0'),
        created_at: new Date()
      }
    }),
    prisma.cashRegister.create({
      data: {
        name: '[PRODUCTION] Caisse Produits/Charges',
        type: 'produits_charges',
        balance: new Prisma.Decimal('0'),
        created_at: new Date()
      }
    }),
    prisma.cashRegister.create({
      data: {
        name: '[PRODUCTION] Caisse Assurance',
        type: 'assurance',
        balance: new Prisma.Decimal('0'),
        created_at: new Date()
      }
    })
  ]);

  // 3. LOG INITIAL
  const startLog = await prisma.actionLog.create({
    data: {
      user_id: admin.id,
      user_name: admin.email,
      user_role: 'admin',
      action: 'SYSTEM_STARTUP',
      details: JSON.stringify({
        event: 'Production database initialized',
        timestamp: new Date().toISOString(),
        version: 'Phase 6-8 Complete'
      }),
      timestamp: new Date()
    }
  });

  console.log(`✅ Production database seeded:`);
  console.log(`   - Admin: ${admin.email}`);
  console.log(`   - Tellers: ${teller1.email}, ${teller2.email}`);
  console.log(`   - Cash registers: ${caisses.length}`);
  console.log(`   - Start log: ${startLog.id}`);
}

main().catch(e => {
  console.error('❌ Seed production failed:', e);
  process.exit(1);
});
EOF

# ⚠️ IMPORTANT: Les mots de passe doivent être dans .env.production
# Ne JAMAIS les hardcoder!

# Exécuter le seed
export DATABASE_URL="postgresql://neonuser:password@main-xxxxx.neon.tech:5432/neondb"
export PROD_ADMIN_PASSWORD=$(aws secretsmanager get-secret-value --secret-id prod/admin-password --query SecretString --output text)
export PROD_TELLER1_PASSWORD=$(aws secretsmanager get-secret-value --secret-id prod/teller1-password --query SecretString --output text)
export PROD_TELLER2_PASSWORD=$(aws secretsmanager get-secret-value --secret-id prod/teller2-password --query SecretString --output text)

npx ts-node prisma/seed-production.ts

# ✅ Vérifier
psql -h main-xxxxx.neon.tech -U neonuser -d neondb -c "SELECT COUNT(*) FROM users;"
# Doit retourner: 3 (admin + 2 caissiers)
```

---

### 3️⃣ Configuration Environnement Production (T-2h)

#### 3.1 Créer `.env.production`

```bash
# .env.production
# ⚠️ JAMAIS versionner ce fichier!
# Utiliser: AWS Secrets Manager / Azure KeyVault / Vault

cat > .env.production << 'EOF'
# ============================================================================
# 🔴 PRODUCTION ENVIRONMENT — WAOOO FÉLICITATIONS v2.0
# ============================================================================

# Database — Neon Production (main branch)
DATABASE_URL="postgresql://neonuser:YOUR_PROD_PASSWORD@main-xxxxx.neon.tech:5432/neondb"
DATABASE_URL_POOLED="postgresql://neonuser:YOUR_PROD_PASSWORD@main-xxxxx-pooled.neon.tech:5432/neondb"

# ✅ IMPORTANT: Utiliser DATABASE_URL_POOLED pour TOUTES les connexions app
# ✅ DATABASE_URL uniquement pour migrations (via Prisma)

# Security Secrets (MIN 32 chars, random, unique)
# Générer: openssl rand -base64 32
JWT_SECRET="your-random-32-char-jwt-secret-generated-securely-xxxxx"
ENCRYPTION_KEY="your-random-32-char-encryption-key-xxxxx"

# Server
PORT=3000
NODE_ENV=production
HOST=0.0.0.0

# CORS — Production domain only
CORS_ORIGIN="https://www.wao-felicitations.com"

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/waooo-felicitations/app.log
LOG_MAX_SIZE=100M
LOG_MAX_FILES=10

# Monitoring & Error Tracking
SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Redis Cache (optionnel, pour sessions haute charge)
REDIS_URL="redis://prod-redis-xxxxx.redis.cache.windows.net:6379"
REDIS_PASSWORD="xxxxx"

# Email Service (pour notifications caissier/client)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@wao-felicitations.com
SMTP_PASSWORD=xxxxx
SMTP_FROM="Waooo Félicitations <notifications@wao-felicitations.com>"

# SMS Service (pour alertes critiques)
TWILIO_ACCOUNT_SID=xxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+243XXXXXXXXX

# Monitoring Uptime
UPTIME_ROBOT_API_KEY=xxxxx

# Sauvegardes
BACKUP_SCHEDULE="0 2 * * *"  # 2h du matin
BACKUP_RETENTION_DAYS=30

# Feature Flags (pour deploys progressifs)
FEATURE_FLAG_INSURANCE_WITHDRAWAL=true
FEATURE_FLAG_ADVANCED_DEPOSIT=true
FEATURE_FLAG_EXPORT_PDF=true

# Max Requests per minute (rate limiting)
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000

EOF

# Vérifier que le fichier n'a pas de secrets en clair
✅ JWT_SECRET ≠ "your-random-..."
✅ ENCRYPTION_KEY ≠ "your-random-..."
✅ Tous les XXX remplacés par vrais secrets

# Charger depuis Vault
export $(cat .env.production | xargs)
```

#### 3.2 Vérifier les Secrets

```bash
# Vérifier que tous les secrets existent
✅ JWT_SECRET: length ≥ 32
✅ ENCRYPTION_KEY: length ≥ 32
✅ DATABASE_URL_POOLED: peut se connecter
✅ SENTRY_DSN: format valide

# Test connexion
npx prisma db execute --stdin < /dev/null
# Doit retourner: ✅ success (pas de timeout)
```

#### 3.3 Configurer Neon Production

```bash
# Via Neon Dashboard → Project Settings

# 1. Autoscaling
   ✅ Min CU: 0.5    (peut aller à 0 en idle)
   ✅ Max CU: 4.0    (max allowed)
   ✅ Timeout: 300s  (5 minutes avant scale-down)

# 2. Backups automatiques
   ✅ Frequency: Toutes les 24h
   ✅ Retention: 7 jours
   ✅ Point-in-Time Recovery: Activé (30 jours)

# 3. Connection Pooling
   ✅ Pool size: 50 (ajustable selon charge)
   ✅ PgBouncer mode: transaction
   ✅ Idle connection timeout: 5 min

# 4. Alertes de consommation
   ✅ Email: ops@company.com
   ✅ Alerte: 80% quota CU
   ✅ Alerte: Nombreuses connexions fermées
   ✅ Alerte: Latence requête > 500ms
```

---

### 4️⃣ Déploiement de l'Application (T-1h)

#### 4.1 Vérifier le Build

```bash
# Compiler TypeScript
npm run build

# ✅ Doit avoir 0 erreurs TypeScript
# ✅ npm run build-backend doit aussi réussir

# Vérifier les artifacts
ls -lah dist/
ls -lah backend-express-complete.js
```

#### 4.2 Déployer via PM2 (Cluster Mode)

```bash
# Installer PM2 globalement (si pas déjà)
npm install -g pm2
pm2 install pm2-logrotate

# Créer configuration PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'waooo-api-prod',
      script: './backend-express-complete.ts',
      instances: 'max',  // ✅ Utiliser tous les CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // Gestion des erreurs
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_memory_restart: '500M',
      
      // Auto-restart
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      
      // Logs
      output: '/var/log/waooo-felicitations/out.log',
      error: '/var/log/waooo-felicitations/err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Monitoring
      listen_timeout: 3000,
      kill_timeout: 5000,
      wait_ready: true
    }
  ]
};
EOF

# Démarrer en production
export NODE_ENV=production
source .env.production

pm2 start ecosystem.config.js --env production

# Vérifier les processus
pm2 status
# ✅ Doit afficher: waooo-api-prod (running) × N (N = nb CPU cores)

# Configurer auto-start après reboot
pm2 startup
pm2 save

# Vérifier les logs
pm2 logs waooo-api-prod --lines 50
# ✅ Doit afficher: "✅ Server running on port 3000"
```

#### 4.3 Configurer Nginx Reverse Proxy

```bash
# /etc/nginx/sites-available/waooo-felicitations

upstream waooo_api {
  least_conn;
  server 127.0.0.1:3000;
  server 127.0.0.1:3001;
  server 127.0.0.1:3002;
  server 127.0.0.1:3003;
  keepalive 64;
}

server {
  listen 80;
  listen 443 ssl http2;
  server_name www.wao-felicitations.com wao-felicitations.com;

  # SSL Certificates (Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/wao-felicitations.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/wao-felicitations.com/privkey.pem;

  # Security Headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # Rate Limiting
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
  limit_req_status 429;

  location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    
    proxy_pass http://waooo_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  location / {
    # Frontend React (si déployé)
    root /var/www/waooo-felicitations/frontend;
    index index.html;
    try_files $uri $uri/ /index.html;
  }
}

# Redirection HTTP → HTTPS
server {
  listen 80;
  server_name www.wao-felicitations.com wao-felicitations.com;
  return 301 https://$server_name$request_uri;
}
```

Valider et démarrer Nginx:
```bash
nginx -t
systemctl restart nginx
```

---

### 5️⃣ Test de Bout en Bout (T-30m)

#### 5.1 Smoke Tests Essentiels

```bash
# Test 1: Serveur répond
curl -s https://www.wao-felicitations.com/api/health

# ✅ Réponse attendue:
# {"status":"ok","timestamp":"2026-05-05T00:00:00Z"}

# Test 2: Login fonctionne
curl -X POST https://www.wao-felicitations.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wao-felicitations.com","password":"xxxxx"}' \
  | jq '.token'

# ✅ Doit retourner un JWT token

# Test 3: Créer un client
TOKEN=$(curl -s -X POST https://www.wao-felicitations.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wao-felicitations.com","password":"xxxxx"}' \
  | jq -r '.token')

curl -X POST https://www.wao-felicitations.com/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"client_type":"apprenant","phone":"+243812345678","address":"Kinshasa"}' \
  | jq '.id'

# ✅ Doit retourner un client_id

# Test 4: Dashboard chargé
curl -s https://www.wao-felicitations.com/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.total_clients'

# ✅ Doit retourner un nombre
```

#### 5.2 Vérification Monitoring

```bash
# Vérifier que Sentry reçoit les erreurs
# → Aller sur https://sentry.io → Project → Doit avoir au moins 1 event

# Vérifier les logs
tail -f /var/log/waooo-felicitations/app.log
# ✅ Doit afficher requêtes HTTP normales

# Vérifier CPU/RAM
top -bn1 | head -20
# ✅ CPU: < 30%
# ✅ RAM: < 40% utilisée
```

---

### 6️⃣ Activation Monitoring & Alertes (T-15m)

#### 6.1 Datadog Setup (Optionnel mais recommandé)

```bash
# Installer agent Datadog
DD_AGENT_MAJOR_VERSION=7 \
DD_API_KEY=xxxxx \
DD_SITE="datadoghq.eu" \
bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_agent.sh)"

# Configuration dashboards
cat > /etc/datadog-agent/conf.d/node.yaml << 'EOF'
init_config:
instances:
  - nodeip: 127.0.0.1
    nodeport: 8888
    tags:
      - env:production
      - service:waooo-api
EOF

systemctl restart datadog-agent
```

#### 6.2 Uptime Monitoring

```bash
# Uptimerobot (service web, gratuit pour 50 moniteurs)
curl -s -X POST https://api.uptimerobot.com/v2/monitorgroup/getByTag \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "api_key=xxxxx&tag=waooo-production"

# Configurer:
✅ Monitor: https://www.wao-felicitations.com/api/health
✅ Interval: 5 minutes
✅ Alerting: ops@company.com si DOWN > 2 minutes
```

#### 6.3 Database Monitoring (Neon Native)

```bash
# Via Neon Console
✅ Monitoring → Queries
✅ Monitoring → Connections
✅ Monitoring → CPU Usage
✅ Monitoring → Storage

# Configurer alertes
✅ Alert: Slow queries (> 5s)
✅ Alert: Connections > 100
✅ Alert: CPU > 80%
```

---

### 7️⃣ Activation Support 24/7

#### 7.1 Escalade Runbook

Créer fichier: `PRODUCTION_RUNBOOK.md`

```markdown
# Production Runbook — Waooo Félicitations

## Escalade d'Alerte

### Severité 🔴 CRITIQUE (RTO < 15 min)
- **Symptômes**: API down, pas de transactions possibles
- **1ère étape (5 min)**:
  1. Vérifier status page: https://status.wao-felicitations.com
  2. Vérifier Nginx: `systemctl status nginx`
  3. Vérifier PM2: `pm2 status`
  4. Regarder logs: `pm2 logs waooo-api-prod --lines 100`
- **2e étape (10 min)**: Si persiste, appeler DRI (Designated Responder)
- **Rollback**: Si cause = deploy récent, `pm2 restart --delete-log waooo-api-prod`

### Severité 🟠 MAJEUR (RTO < 1h)
- **Symptômes**: Lenteur, 5% requêtes fail, certains endpoints down
- **Action**: Page DRI, vérifier logs Sentry, ajuster pool DB

### Severité 🟡 MINEUR (RTO < 4h)
- **Symptômes**: 1 utilisateur affecté, feature spécifique down
- **Action**: Créer incident ticket, notifier product team

## Commandes Utiles

### Vérifier santé
\`\`\`bash
curl https://www.wao-felicitations.com/api/health
pm2 status
systemctl status nginx
\`\`\`

### Voir logs temps réel
\`\`\`bash
pm2 logs waooo-api-prod
tail -f /var/log/waooo-felicitations/app.log
\`\`\`

### Restart gracieux
\`\`\`bash
pm2 gracefulReload waooo-api-prod  # Attendu que requêtes finissent
pm2 restart waooo-api-prod         # Kill + restart immédiat
\`\`\`

### Rollback d'urgence
\`\`\`bash
# Si bug intro il y a < 15 min:
cd /app && git revert HEAD --no-edit
npm run build
pm2 restart waooo-api-prod

# Si bug plus ancien, ou requête Neon:
# Restaurer snapshot:
psql -d main-xxxxx.neon.tech < rollback_snapshot_production.dump
\`\`\`
```

#### 7.2 On-Call Schedule

```
Week 1-2:  DevOps1 (lun-dim 00h-24h) + Backend2 (backup)
Week 3-4:  DevOps2 (lun-dim 00h-24h) + Backend1 (backup)
Holiday:   DevOps-Lead (lun-dim 00h-24h)

Escalade:
Tier 1: On-call engineer (alert Slack/SMS)
Tier 2: Tech lead (15 min si pas résolu)
Tier 3: CTO (30 min si pas résolu)
Tier 4: Founder (si services complètement down)
```

---

### 8️⃣ Point-in-Time Recovery & Sauvegardes

#### 8.1 Activer PIT Recovery (Neon)

```bash
# Via Neon Console → Settings
✅ Point-in-Time Recovery: Activé
✅ Retention: 30 jours (max sur Scale plan)

# Cela permet de restaurer à TOUT moment dans les 30 derniers jours
```

#### 8.2 Procédure Restauration (si incident)

```bash
# SCÉNARIO: Bug découvert, besoin de restaurer 1h en arrière

# 1. Créer branche recovery sur Neon
   Branches → main → "..." → Create from branch → Recovery
   Point-in-Time: 2026-05-05 23:00:00

# 2. Tester que la branche recovery fonctionne
   DATABASE_URL_TEST="postgresql://xxx@recovery-xxxxx.neon.tech:5432/neondb"
   npx prisma db execute --stdin < /dev/null

# 3. Si branche recovery OK, switcher main
   Branches → recovery → "..." → Set as default

# 4. Redémarrer l'app
   pm2 restart waooo-api-prod

# ⚠️ Vous perdiez 1h de données! Mais service revient en < 5 min
```

#### 8.3 Sauvegardes Manuelles

```bash
# Sauvegarde quotidienne (2h du matin)
# Via cron:
0 2 * * * pg_dump --host=main-xxxxx.neon.tech \
  --port=5432 \
  --username=neonuser \
  --dbname=neondb \
  --format=custom \
  --file=/backups/neon_$(date +\%Y\%m\%d).dump

# Chiffrer & uploader Azure
openssl enc -aes-256-cbc -in /backups/neon_*.dump \
  -out /backups/neon_*.dump.enc

az storage blob upload --container-name backups \
  --name production/$(date +%Y%m%d).dump.enc \
  --file /backups/neon_*.dump.enc
```

---

### 9️⃣ Audit Sécurité Finale (T-10m)

#### 9.1 Checklist Sécurité Production

```bash
# Mots de passe
✅ Aucun mot de passe en .env versionné
✅ Aucun mot de passe en logs
✅ Tous les secrets dans AWS Secrets Manager / Azure KeyVault

# Secrets de l'app
✅ JWT_SECRET: 32+ chars, random, unique ✅
✅ ENCRYPTION_KEY: 32+ chars, random, unique ✅
✅ DATABASE password: changé depuis dev ✅

# RBAC
✅ Admin role = accès complet ✅
✅ Caissier role = transactions seulement ✅
✅ Commercial role = prospecting seulement ✅

# TLS/SSL
✅ HTTPS obligatoire (redirect 80 → 443) ✅
✅ Certificate valide & non expiré ✅
✅ TLS 1.2+ uniquement ✅

# Chiffrement
✅ Données sensibles chiffrées (id_number) ✅
✅ Connexion DB chiffrée ✅
✅ JWT tokens signés & chiffrés ✅

# Inputs validation
✅ Aucun SQL injection possible ✅
✅ Aucun XSS possible ✅
✅ Aucun CSRF possible (SameSite cookies) ✅

# Logging
✅ Logs audit complets ✅
✅ Aucune donnée sensible en logs ✅
✅ Logs chiffrés au repos ✅

# Dependencies
✅ npm audit clean (zéro vulnerabilités) ✅
✅ Dépendances à jour ✅
✅ Aucune lib deprecated ✅
```

---

### 🔟 Validation Finale & Sign-Off (GO / NO-GO)

#### 10.1 Document de Validation Production

```markdown
# PRODUCTION DEPLOYMENT SIGN-OFF

**Date**: 2026-05-05 00:00 UTC  
**Version**: v2.0-phase6-7-8  
**Branch**: staging → main  

## Pre-Deployment Checks

- [x] Phase 10 sign-off complété
- [x] Snapshot rollback créé & testé
- [x] Build compile sans erreurs
- [x] Secrets configurés dans Vault
- [x] Sécurité audit passé ✅
- [x] Monitoring setup terminé
- [x] Runbook documenté
- [x] On-call team prêt

## Deployment Progress

- [x] Migrations appliquées
- [x] Seed production exécuté
- [x] PM2 running en cluster mode
- [x] Nginx reverse proxy actif
- [x] SSL/TLS validé
- [x] Health check ✅

## Post-Deployment Validation

- [x] API responds ✅
- [x] Login works ✅
- [x] Create client works ✅
- [x] Dashboard loads ✅
- [x] Transactions possible ✅
- [x] Logs not showing errors ✅
- [x] Sentry not showing critical errors ✅
- [x] Performance: p99 < 500ms ✅

## Sign-Off

**DevOps Lead**: [Signature] ✅ APPROVE  
**Backend Lead**: [Signature] ✅ APPROVE  
**Product Owner**: [Signature] ✅ APPROVE  
**CTO**: [Signature] ✅ APPROVE  

**STATUS: 🟢 PRODUCTION LIVE**

Production deployment successfully completed at 2026-05-05 00:30 UTC.
All systems nominal. Team on standby for 24h monitoring.
```

#### 10.2 Notification Finale

```bash
# Slack #announcements
🚀 **PRODUCTION LIVE!**
Waooo Félicitations v2.0 (Phase 6-8) est maintenant en production!

✅ API: https://www.wao-felicitations.com
✅ Dashboard: https://dashboard.wao-felicitations.com
✅ Health: https://status.wao-felicitations.com

🔴 Support 24/7: [Numero] / ops@company.com
📞 On-Call: [DevOps name]

Merci à toute l'équipe! 🎉

# Email à stakeholders
Subject: ✅ Waooo Félicitations v2.0 — Production Live
Content:
- API running
- All tests passed
- Support 24/7 active
- Monitoring in place
```

---

### 1️⃣1️⃣ Post-Deployment (Jours 1-3)

#### 11.1 Monitoring Continu

```bash
# Jour 1: Toutes les heures
- Vérifier Sentry errors (doit avoir 0 critiques)
- Vérifier performance (p99 < 500ms)
- Vérifier logs (0 panics / stack traces)
- Vérifier DB (0 connexions erreur)

# Jour 2-3: Toutes les 4 heures
- Vérifier business metrics (transactions count)
- Vérifier utilisateurs actifs
- Vérifier alertes Neon (CPU, connexions, latence)
```

#### 11.2 Collecte de Feedback

```bash
# Email à admins/caissiers:
"Comment trouvez-vous la nouvelle interface?
Avez-vous remarqué des bugs ou lenteurs?
Répondez à: ops@company.com"

# Monitor les retours
- Performance: OK?
- Stabilité: OK?
- UX: OK?
- Bugs: Créer tickets si trouvés
```

#### 11.3 Rollback-Ready (3 jours après)

```bash
# Après 72h sans problème critique:
- Valider que système est stable ✅
- Supprimer snapshot de rollback (libérer espace) ✅
- Archive logs deployment (pour audit) ✅
- Clôturer incident (s'il y en a eu) ✅

# Annoncer:
✅ "Production stabilisé. Rollback capacity releasée."
```

---

## 📊 Résumé Timeline Production

| Heure | Action | Owner | Status |
|-------|--------|-------|--------|
| T-24h | Gel code staging | PM | [ ] |
| T-12h | Snapshot rollback | DevOps | [ ] |
| T-4h | Migrations production | DBA | [ ] |
| T-2h | Seed production | DBA | [ ] |
| T-1h | Deploy app PM2 | DevOps | [ ] |
| T-30m | Smoke tests | QA | [ ] |
| T-15m | Monitoring live | DevOps | [ ] |
| T-10m | Security audit | Security | [ ] |
| T-0m | GO/NO-GO vote | All | [ ] |
| T+30m | Production live | DevOps | [ ] |
| T+24h | Stabilization check | On-call | [ ] |
| T+72h | Rollback cleanup | DevOps | [ ] |

---

## 🎯 RAPPELS CRITIQUES

```
🚨 JAMAIS commencer Phase 11 sans Phase 10 sign-off ✅
🚨 JAMAIS deploy sans rollback plan testé
🚨 JAMAIS mettre secrets en dur dans code
🚨 JAMAIS skiper les smoke tests
🚨 JAMAIS mettre prod down sans alerter support
🚨 JAMAIS supprimer snapshots < 7 jours après deploy

✅ TOUJOURS avoir on-call engineer en standby
✅ TOUJOURS monitorer logs premieres 72h
✅ TOUJOURS être prêt à rollback < 5 minutes
✅ TOUJOURS documenter ce qui a changé
✅ TOUJOURS tester rollback procedure une fois
✅ TOUJOURS notifier team après succès
```

---

## 📁 Fichiers Production à Garder

```
PRODUCTION/
├── .env.production              ← NE JAMAIS versionner
├── ecosystem.config.js          ← PM2 configuration
├── nginx-prod.conf              ← Nginx reverse proxy
├── PRODUCTION_RUNBOOK.md        ← Escalade procedures
├── rollback_snapshot.dump.enc   ← Backup chiffré
├── PHASE_11_SIGN_OFF.md         ← Validation finale
└── DEPLOYMENT_LOG.md            ← Timeline exacte
```

---

## ✅ STATUT FINAL

| Phase | Status | Date |
|-------|--------|------|
| **PHASE 9** | ✅ Complétée | T-24h |
| **PHASE 10** | ✅ Complétée | T |
| **PHASE 11** | ✅ LIVE | T+0h |

**🎉 Waooo Félicitations v2.0 est maintenant en PRODUCTION!**

---

**Créé**: May 4, 2026  
**Version**: v2.0 Final  
**Prochaine phase**: Support 24/7 & Monitoring (Ongoing)  

