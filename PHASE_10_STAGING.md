# PHASE 10 — Promotion vers Staging (branche `dev` → `staging`)

**Status**: 🟡 À effectuer après Phase 9 validée  
**Branche Neon**: `dev` → `staging`  
**Durée estimée**: 3-5 jours  
**Équipe requise**: 1 DevOps + 1 QA Lead  

---

## 📋 Checklist de Promotion

### 1️⃣ Prérequis de Phase 9

- [ ] Tous les tests de la **PHASE 9** sont passés sur `dev`
- [ ] Aucune erreur dans les logs applicatifs
- [ ] Base de données `dev` cohérente et validée
- [ ] Code backend complètement testé (couverture > 80%)
- [ ] Équipe QA confirmée prête pour UAT sur staging

### 2️⃣ Préparation de la Migration

#### 2.1 Créer une Migration Versionnée et Propre

```bash
# Sur la machine locale avec DATABASE_URL pointant vers dev
cd c:\Wao Felicitations

# Exporter l'état actuel de la base dev
npx prisma db execute --stdin < dump-dev.sql > migration-phase6-8.sql

# Ou créer une migration explicite
npx prisma migrate create add_phase_6_7_8_features --create-only

# ✅ Une migration propre = un fichier .sql versé dans le VCS
ls -la prisma/migrations/
```

**Fichier de migration attendu:**
```
prisma/migrations/
└── 20260504_phase_6_7_8_complete/
    └── migration.sql         # Contient CREATE TABLE, indexes, constraints
```

#### 2.2 Documenter les Changements

Créer un fichier `MIGRATION_LOG_PHASE_6_8.md`:
```markdown
# Migration Phase 6, 7, 8

**Date**: May 4, 2026  
**Branch**: dev → staging  
**Changes**:
- Added 13 security functions (lib/security.ts)
- Added 8 business logic functions (lib/db/businessLogic.ts)
- Added 23 action log types (lib/db/actionLog.ts)
- Added 5 Express middlewares (lib/middleware/auth.ts)
- Added 13 API routes (backend-express-complete.ts)

**Breaking Changes**: None
**Data Migration Required**: No (schema backward compatible)
**Rollback Plan**: db branch revert to dev snapshot
```

### 3️⃣ Promotion de la Branche Neon

#### 3.1 Sync de `dev` vers `staging` sur Neon Console

Deux options:

**Option A: Copy-on-Write (recommandé)**
```bash
# Via Neon Dashboard
1. Aller à: Branches → dev
2. Clique sur "..." → "Create branch from dev"
3. Nommer la branche: staging
4. ✅ Copy-on-Write automatique (Neon crée un snapshot COW)
   - Aucune copie de données
   - Isolation complète vs dev
   - État exact de dev à moment T
```

**Option B: Promotion SQL (manuel)**
```bash
# Exporter le schema et les données de dev
pg_dump \
  --host=ep-xxxxx.neon.tech \
  --port=5432 \
  --username=neonuser \
  --dbname=neondb \
  --schema-only > schema_dev.sql

# Restaurer sur staging
psql \
  --host=staging-xxxxx.neon.tech \
  --port=5432 \
  --username=neonuser \
  --dbname=neondb < schema_dev.sql
```

#### 3.2 Mettre à Jour les Variables d'Environnement (Staging)

```bash
# Créer .env.staging
cat > .env.staging << 'EOF'
# PHASE 10 — STAGING

# Neon Staging Branch
DATABASE_URL="postgresql://neonuser:password@staging-xxxxx.neon.tech:5432/neondb"
DATABASE_URL_POOLED="postgresql://neonuser:password@staging-xxxxx-pooled.neon.tech:5432/neondb"

# Security
JWT_SECRET="staging-jwt-secret-min-32-characters-xxxxxxxx"
ENCRYPTION_KEY="staging-encryption-key-32-char-xxxxx"

# Server
PORT=3001
NODE_ENV=staging
CORS_ORIGIN="https://staging.wao-felicitations.com"

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/wao-staging.log

# Monitoring
SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
EOF

# Vérifier la connexion
npx prisma db execute --stdin < /dev/null
```

### 4️⃣ Application de la Migration sur Staging

#### 4.1 Appliquer les Migrations

```bash
# Basculer vers le contexte staging
export DATABASE_URL=$(grep DATABASE_URL .env.staging | cut -d'=' -f2-)

# Appliquer les migrations en ordre
npx prisma migrate deploy

# ✅ Vérifier que tous les tables existent
npx prisma db execute --stdin << SQL
\dt
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';
SQL
```

#### 4.2 Appliquer le Seed sur Staging

```bash
# Seed de STAGING (données de test réalistes)
cat > prisma/seed-staging.ts << 'EOF'
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding staging database...');

  // 1. Créer admin de test
  const admin = await prisma.user.create({
    data: {
      email: 'admin@staging.test',
      password: hashPassword('admin123'), // ⚠️ À changer en PRODUCTION
      user_role: 'admin',
      is_active: true,
      zone: 'Kinshasa',
      created_at: new Date()
    }
  });

  // 2. Créer caisses de staging (données de test réalistes)
  const cashRegisters = await Promise.all([
    prisma.cashRegister.create({
      data: {
        name: '[STAGING] Caisse Générale',
        type: 'generale',
        balance: new Prisma.Decimal('500000'),
        created_at: new Date()
      }
    }),
    prisma.cashRegister.create({
      data: {
        name: '[STAGING] Caisse Produits/Charges',
        type: 'produits_charges',
        balance: new Prisma.Decimal('200000'),
        created_at: new Date()
      }
    }),
    prisma.cashRegister.create({
      data: {
        name: '[STAGING] Caisse Assurance',
        type: 'assurance',
        balance: new Prisma.Decimal('100000'),
        created_at: new Date()
      }
    })
  ]);

  // 3. Créer 50 clients de test (apprenants + non-apprenants)
  for (let i = 1; i <= 50; i++) {
    const user = await prisma.user.create({
      data: {
        email: `test-client-${i}@staging.test`,
        password: hashPassword('password123'),
        user_role: 'caissier',
        is_active: true,
        zone: i % 2 === 0 ? 'Kinshasa' : 'Lubumbashi',
        created_at: new Date()
      }
    });

    const clientType = i % 3 === 0 ? 'non-apprenant' : 'apprenant';
    const client = await prisma.client.create({
      data: {
        user_id: user.id,
        client_type: clientType,
        membership_code: `TEST-${i.toString().padStart(4, '0')}`,
        account_number: `ACC-${i.toString().padStart(6, '0')}`,
        status: 'actif',
        phone: `+243812345${i.toString().padStart(3, '0')}`,
        address: `${i === 1 ? 'Kinshasa' : 'Lubumbashi'}, DRC`
      }
    });

    // Créer account épargne pour chaque client
    await prisma.account.create({
      data: {
        client_id: client.id,
        account_type: 'epargne',
        status: 'actif',
        balance: new Prisma.Decimal(Math.random() * 1000000),
        created_at: new Date()
      }
    });

    if (clientType === 'apprenant') {
      // Créer apprenant avec données réalistes
      const guardian = await prisma.guardian.create({
        data: {
          full_name: `Guardian ${i}`,
          phone: `+243812345${i.toString().padStart(3, '0')}`,
          relationship: 'Parent'
        }
      });

      const caution = await prisma.caution.create({
        data: {
          full_name: `Caution ${i}`,
          phone: `+243812345${i.toString().padStart(3, '0')}`
        }
      });

      await prisma.apprenant.create({
        data: {
          client_id: client.id,
          birth_date: new Date('2008-01-01'),
          institution: 'Lycée Test',
          level: '4ème',
          guardian_id: guardian.id,
          caution_id: caution.id,
          documents_status: 'fourni'
        }
      });
    }
  }

  console.log('✅ Staging database seeded successfully');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

function hashPassword(password: string): string {
  // À remplacer par bcryptjs en production
  return require('crypto').createHash('sha256').update(password).digest('hex');
}
EOF

# Exécuter le seed
npx ts-node prisma/seed-staging.ts
```

### 5️⃣ Recette Fonctionnelle Complète sur Staging

#### 5.1 Tests Manuels des Parcours Critiques

Avant la validation finale, tester les **5 parcours critiques**:

**Parcours 1: Apprenant**
```bash
1. Créer client apprenant avec phone + address
   ✅ Vérifier: membership_code unique
   ✅ Vérifier: account_number créé automatiquement
   
2. Créer apprenant avec guardian + caution
   ✅ Vérifier: toutes les FK valides
   
3. Enregistrer cotisation journalière
   ✅ Vérifier: balance updated
   ✅ Vérifier: account actif
   
4. Enregistrer dépôt anticipé (5 jours)
   ✅ Vérifier: 5 entrées cotisations
   ✅ Vérifier: dates correctes
```

**Parcours 2: Non-Apprenant + Financement**
```bash
1. Créer client non-apprenant
   ✅ Vérifier: client_type = non-apprenant
   
2. Créer financement
   ✅ Vérifier: status = actif
   ✅ Vérifier: solde auto-détecté quand montant atteint
   
3. Transférer vers épargne
   ✅ Vérifier: transaction créée
   ✅ Vérifier: balance épargne augmentée
```

**Parcours 3: Caissier & Admin**
```bash
1. Caissier enregistre dépôt
   ✅ Vérifier: status = en_attente
   ✅ Vérifier: created_by_id = caissier
   
2. Admin valide dépôt
   ✅ Vérifier: status = approuve
   ✅ Vérifier: caisse générale balance updated
   
3. Vérifier logs action
   ✅ Vérifier: 2 entrées logs
   ✅ Vérifier: timestamps corrects
```

**Parcours 4: Paiement Employé**
```bash
1. Admin positionne paiement
   ✅ Vérifier: status = en_attente
   
2. Caissier reçoit et traite
   ✅ Vérifier: status = traite
   ✅ Vérifier: processed_by_id = caissier
   
3. Vérifier historique
   ✅ Vérifier: action logs complets
```

**Parcours 5: Caisse Assurance**
```bash
1. Apprenant crée assurance
   ✅ Vérifier: caisse assurance créditée
   
2. Effectuer retrait avec motif
   ✅ Vérifier: motif enregistré
   ✅ Vérifier: balance caisse réduite
   
3. Vérifier historique
   ✅ Vérifier: retrait visible dans transactions
```

#### 5.2 Tests API (Postman/Insomnia)

```bash
# Importer la collection Postman (à créer)
# Fichier: postman/PHASE_10_STAGING_TESTS.json

# Tester tous les 13 routes:
1. POST /api/auth/login ✅
2. POST /api/auth/logout ✅
3. POST /api/clients ✅
4. GET /api/clients/:clientId ✅
5. POST /api/transactions ✅
6. PUT /api/transactions/:id/validate ✅
7. POST /api/cotisations ✅
8. POST /api/cotisations/advanced-deposit ✅
9. POST /api/accounts/transfer-financing-to-savings ✅
10. GET /api/audit-logs ✅
11. GET /api/audit-logs/user/:userId ✅
12. GET /api/dashboard/stats ✅
13. POST /api/validation/cotisation-account-constraint ✅
```

### 6️⃣ Vérifier Synchronisation Temps Réel

#### 6.1 WebSocket ou Polling (Caissier ↔ Admin)

```bash
# Si WebSocket implémenté:
1. Caissier enregistre dépôt → Admin voit mise à jour en < 2s
   ✅ Vérifier: temps réel < 2 secondes
   ✅ Vérifier: balance caisse update auto

# Si Polling (toutes les 5s):
1. Caissier enregistre dépôt
2. Admin voit la nouvelle transaction dans les 5s
   ✅ Vérifier: polling fonctionne
   ✅ Vérifier: données cohérentes
```

### 7️⃣ Valider Exports et Partage

#### 7.1 Exports PDF

```bash
# Tester génération PDF

# Dashboard PDF
1. Admin → Dashboard → Export PDF
   ✅ Vérifier: fichier généré
   ✅ Vérifier: données correctes
   ✅ Vérifier: taille < 2MB
   ✅ Vérifier: téléchargement fonctionnne

# Rapport transactions PDF
1. Admin → Rapports → Export PDF
   ✅ Vérifier: pagination OK
   ✅ Vérifier: totaux corrects
   ✅ Vérifier: signatures du caissier présentes

# État de caisse PDF
1. Caissier → Caisse → Export PDF
   ✅ Vérifier: balance correcte
   ✅ Vérifier: nombre transactions affiché
   ✅ Vérifier: timestamp d'export présent
```

#### 7.2 Partage PNG/JPEG (Reçus)

```bash
# Tester partage d'images

# Reçu de transaction
1. Caissier → Transaction → Générer reçu
   ✅ Vérifier: image PNG générée
   ✅ Vérifier: format lisible sur mobile
   ✅ Vérifier: QR code présent (si implémenté)
   ✅ Vérifier: partage WhatsApp fonctionne
   ✅ Vérifier: partage Email fonctionne

# Preuve de paiement
1. Client → Télécharger preuve
   ✅ Vérifier: signature caissier
   ✅ Vérifier: timestamp exact
   ✅ Vérifier: taille image optimisée
```

### 8️⃣ Performance & Stabilité

#### 8.1 Load Testing (100 utilisateurs simultanés)

```bash
# Installer k6 ou Apache Bench
npm install -g k6

# Créer script de test
cat > k6-staging.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100,        // 100 utilisateurs
  duration: '5m',  // 5 minutes
  thresholds: {
    'http_req_duration': ['p(99)<500'],  // 99% < 500ms
    'http_req_failed': ['rate<0.01']    // < 1% erreurs
  }
};

export default function() {
  // Simuler un utilisateur normal
  
  // Login
  let loginRes = http.post('https://staging.wao-felicitations.com/api/auth/login', {
    email: 'test@staging.test',
    password: 'password123'
  });
  check(loginRes, { 'login ok': (r) => r.status === 200 });
  
  sleep(1);
  
  // Créer transaction
  let txRes = http.post('https://staging.wao-felicitations.com/api/transactions', {
    client_id: 'xxx',
    amount: 50000,
    type: 'depot'
  });
  check(txRes, { 'transaction ok': (r) => r.status === 201 });
  
  sleep(2);
  
  // Logout
  http.post('https://staging.wao-felicitations.com/api/auth/logout');
}
EOF

# Exécuter test
k6 run k6-staging.js

# ✅ Vérifier:
#   - 99% des requêtes < 500ms
#   - Taux erreur < 1%
#   - Pas de timeout DB
#   - Pas d'erreur de pool connexion
```

#### 8.2 Monitoring Ressources

```bash
# Vérifier CPU, RAM, Disk sur serveur staging

# CPU
watch -n 1 'top -bn1 | head -20'
✅ Vérifier: < 70% CPU pendant charge

# RAM
free -h
✅ Vérifier: < 80% RAM utilisée

# Disk
df -h
✅ Vérifier: > 20% espace libre pour logs

# DB Connections
psql -h staging-xxxxx.neon.tech -U neonuser -d neondb -c "SELECT count(*) FROM pg_stat_activity;"
✅ Vérifier: < 100 connexions (PgBouncer limite)
```

### 9️⃣ Validation Sécurité Staging

#### 9.1 Checklist Sécurité

```bash
# JWT Tokens
✅ Tester token valide → peut accéder aux ressources
✅ Tester token expiré → 401 Unauthorized
✅ Tester token modifié → 401 Unauthorized
✅ Vérifier: JWT_SECRET ≥ 32 caractères

# RBAC
✅ Admin peut tout faire → OK
✅ Caissier ne peut pas delete user → 403 Forbidden
✅ Commercial ne peut pas exporter données → 403 Forbidden
✅ Vérifier: permissions matrice respectée

# Chiffrement
✅ Champs sensibles chiffrés (id_number, etc.) → OK
✅ Impossible lire en base directe → OK
✅ ENCRYPTION_KEY ≥ 32 caractères → OK

# Pas de Secrets en Logs
✅ Aucun password en logs
✅ Aucun JWT token en logs
✅ Aucune clé API en logs
```

### 🔟 Validation Finale & Sign-Off

#### 10.1 Document de Validation

Créer un fichier `PHASE_10_SIGN_OFF.md`:
```markdown
# PHASE 10 Sign-Off — Staging Validation

**Date**: [Aujourd'hui]  
**Responsable QA**: [Nom]  
**Responsable DevOps**: [Nom]  

## Résultats des Tests

### Parcours Métier
- [x] Apprenant: PASS ✅
- [x] Non-Apprenant: PASS ✅
- [x] Paiement Employé: PASS ✅
- [x] Caisse Assurance: PASS ✅
- [x] Dépôt Anticipé: PASS ✅

### Performance
- [x] Requêtes < 100ms: PASS ✅
- [x] Load test 100 users: PASS ✅
- [x] Pagination 500+ entrées: PASS ✅

### Sécurité
- [x] JWT validation: PASS ✅
- [x] RBAC respected: PASS ✅
- [x] Chiffrement OK: PASS ✅
- [x] Pas de secrets en logs: PASS ✅

### Exports & Partage
- [x] PDF generation: PASS ✅
- [x] PNG/JPEG sharing: PASS ✅
- [x] WebSocket sync: PASS ✅

## Blockers Trouvés
- [ ] Aucun blocker critique
- [ ] Aucun blocker modéré
- [ ] Issues mineures: [Lister]

## Recommandations
- [Lister les améliorations pour Phase 11]

## Approbation Finale
- [x] QA Lead: APPROUVÉ ✅
- [x] DevOps Lead: APPROUVÉ ✅
- [x] Product Owner: APPROUVÉ ✅

**La branche staging est prête pour la promotion en production.**
```

#### 10.2 Communications

```bash
# Notifier l'équipe du succès
✅ Slack: "#deployments"  "Staging promotion réussie! Prêt pour Phase 11."
✅ Email: Stakeholders "Staging validation complétée - Prêt pour production"
```

---

## 📦 Fichiers à Créer/Modifier

```
PHASE_10_STAGING/
├── .env.staging                           ← Variables d'environnement staging
├── prisma/seed-staging.ts                 ← Seed données test
├── prisma/migrations/xxx_phase_6_7_8/     ← Migration versionnée
├── MIGRATION_LOG_PHASE_6_8.md             ← Documentation migration
├── postman/PHASE_10_STAGING_TESTS.json    ← Collection Postman
├── k6-staging.js                          ← Load test script
├── PHASE_10_SIGN_OFF.md                   ← Validation finale
└── CHECKLIST_STAGING.md                   ← Checklist de suivi
```

---

## ✅ Résumé Phase 10

| Étape | Status | Deadline |
|-------|--------|----------|
| Prérequis Phase 9 | [ ] | Day 1 |
| Migration préparée | [ ] | Day 1 |
| Promotion branch Neon | [ ] | Day 1 |
| Seed staging | [ ] | Day 1 |
| Recette fonctionnelle | [ ] | Day 2-3 |
| Load testing | [ ] | Day 3 |
| Validation sécurité | [ ] | Day 3 |
| Sign-off final | [ ] | Day 4 |
| **Phase 11 lancée** | **[ ]** | **Day 5** |

---

**🎯 Objectif**: Avoir une **branche staging 100% stable** et **testée à 100%** avant promotion en production (Phase 11).

**❌ Ne pas avancer vers Phase 11** tant que tous les checks ne sont pas ✅.

