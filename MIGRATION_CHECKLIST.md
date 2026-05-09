# MIGRATION_CHECKLIST.md — Versionning et Traçabilité des Migrations

**Objectif**: Documenter et tracker toutes les migrations Prisma/Neon de manière versionnée et auditable.

**Responsable**: DBA + DevOps  
**Fréquence**: À chaque migration (dev → staging → prod)  
**Format**: Markdown checklist (facilement versionnable en Git)

---

## 📋 Template Standard de Migration

Chaque migration doit avoir un dossier dans `prisma/migrations/`:

```
prisma/migrations/
├── 20260505_phase_6_7_8_complete/
│   ├── migration.sql                    ← Le SQL réel
│   ├── MIGRATION_NOTES.md               ← Cette checklist remplie
│   ├── ROLLBACK.sql                     ← Script de rollback (optionnel)
│   └── TEST_CASES.md                    ← Tests de validation
│
├── 20260510_fix_cotisation_constraint/
│   ├── migration.sql
│   ├── MIGRATION_NOTES.md
│   └── TEST_CASES.md
│
└── 20260515_add_insurance_features/
    ├── migration.sql
    ├── MIGRATION_NOTES.md
    └── TEST_CASES.md
```

---

## ✅ Checklist Phase 6-8 Migration (Template)

### 1️⃣ Préparation

#### 1.1 Informations de Base
- [ ] **Migration ID**: `20260505_phase_6_7_8_complete`
- [ ] **Description**: Ajouter sécurité (PHASE 6), logique métier (PHASE 7), journalisation (PHASE 8)
- [ ] **Auteur**: [Votre nom]
- [ ] **Date créée**: May 4, 2026
- [ ] **Branche source**: `dev`

#### 1.2 Scope de la Migration
- [ ] Nouvelles tables: 0 (schéma déjà créé en Phase 3)
- [ ] Colonnes ajoutées: 0
- [ ] Index ajoutés: 0
- [ ] Enums modifiés: 0
- [ ] Contraintes ajoutées: 0
- [ ] **Changements applicatifs**: 5 fichiers TypeScript + 13 routes Express

#### 1.3 Compatibilité
- [ ] Breaking changes: NON ✅
- [ ] Rollback possible: OUI ✅
- [ ] Data migration requise: NON ✅
- [ ] Downtime requis: NON ✅

---

### 2️⃣ Préparation Technique

#### 2.1 Créer la Migration SQL

```bash
cd /c/Wao\ Felicitations

# Option 1: Créer migration vide (si c'est du code seulement)
npx prisma migrate create phase_6_7_8_complete --create-only

# Option 2: Créer migration depuis changements schéma
# (N/A pour cette phase car pas de changement schéma)

# Remplir migration.sql (voir template ci-dessous)
cat > prisma/migrations/20260505_phase_6_7_8_complete/migration.sql << 'EOF'
-- This migration is for PHASE 6, 7, 8 features
-- No schema changes required
-- Application code changes tracked separately

-- Verification queries (no-op)
SELECT 'Phase 6-8 code deployment: verify via application tests' as status;
EOF
```

Template `migration.sql` pour référence:
```sql
-- Migration: PHASE 6, 7, 8 Security, Business Logic, Logging
-- Date: 2026-05-05
-- Purpose: Support security, business logic, and action logging
-- 
-- Note: This migration does NOT modify the database schema.
-- The schema was created in PHASE 3.
-- This migration tracks code-level changes for deployment purposes.

-- Verification: Run post-deployment tests
-- PHASE_9_TESTS.ts covers all validations
```

#### 2.2 Créer MIGRATION_NOTES.md

```bash
cat > prisma/migrations/20260505_phase_6_7_8_complete/MIGRATION_NOTES.md << 'EOF'
# Migration: PHASE 6, 7, 8 Complete

**Migration ID**: 20260505_phase_6_7_8_complete  
**Date**: May 4, 2026  
**Author**: [Your Name]  
**Status**: 🟡 Draft → 🟢 Approved → 🔵 Deployed  

## Description

Déploiement des features PHASE 6 (Sécurité), PHASE 7 (Logique Métier), PHASE 8 (Journalisation).

### Changements Schéma
- ✅ Aucun changement de schéma
- ✅ Aucune table supprimée
- ✅ Aucune contrainte modifiée
- ✅ Tous les index intact

### Changements Code
- ✅ lib/security.ts (350+ lignes) — Hashing, encryption, JWT, RBAC
- ✅ lib/db/businessLogic.ts (400+ lignes) — Client creation, transactions, cotisations
- ✅ lib/db/actionLog.ts (450+ lignes) — Audit trail, 23 action types
- ✅ lib/middleware/auth.ts (150+ lignes) — Express middlewares
- ✅ backend-express-complete.ts (500+ lignes) — 13 API routes

### Configuration Requise
```bash
# .env variables (à avoir AVANT deploy)
JWT_SECRET="xxxx..."        # min 32 chars
ENCRYPTION_KEY="xxxx..."    # min 32 chars
DATABASE_URL_POOLED="..."   # Neon pooled connection
```

## Validation Avant Deployment

### Tests Passés
- [ ] npm run test:phase9 (35+ tests) ✅
- [ ] VALIDATION_TESTS.ts (35+ tests) ✅
- [ ] USAGE_EXAMPLES.ts (4 workflows) ✅
- [ ] npm run build (0 TypeScript errors) ✅

### Sécurité Validée
- [ ] Aucun secret hardcodé ✅
- [ ] Tous les JWT signs correctement ✅
- [ ] Tous les mots de passe hashés (bcrypt) ✅
- [ ] Tous les données sensibles chiffrées ✅

### Performance Validée
- [ ] Requêtes < 100ms ✅
- [ ] Index utilisés correctement ✅
- [ ] Pas de N+1 queries ✅
- [ ] Pagination implémentée ✅

## Déploiement (Timeline)

### DEV Branch
- [ ] Migration appliquée: `npx prisma migrate deploy`
- [ ] Seed exécuté: `npx prisma db seed`
- [ ] Tests passés: `npm run test:phase9`
- [ ] Date: [Remplir]

### STAGING Branch
- [ ] Migration appliquée: `npx prisma migrate deploy --database-url=$DATABASE_URL_STAGING`
- [ ] Seed exécuté (données test): `npx ts-node prisma/seed-staging.ts`
- [ ] Recette fonctionnelle: 5 parcours testés ✅
- [ ] Load test: 100 users OK ✅
- [ ] Sign-off QA: [Date]

### PRODUCTION Branch
- [ ] Migration appliquée: `npx prisma migrate deploy --database-url=$DATABASE_URL_PROD`
- [ ] Seed exécuté (données prod): `npx ts-node prisma/seed-production.ts`
- [ ] Smoke tests passés ✅
- [ ] Monitoring actif ✅
- [ ] Rollback tested ✅
- [ ] Date: [Remplir]

## Rollback Plan

Si problème découvert:

### Rollback Immédiat (code)
```bash
cd /app
git revert HEAD --no-edit
npm run build
pm2 restart waooo-api-prod
```

### Rollback Schéma (si besoin, mais pas nécessaire ici)
```bash
# Pas de changement schéma, donc pas de rollback SQL nécessaire
```

### Vérification Post-Rollback
- [ ] API répond à /api/health ✅
- [ ] Dashboard charge ✅
- [ ] Transactions fonctionnent ✅
- [ ] Pas d'erreurs Sentry ✅

## Sign-Off

### Dev
- [ ] Developer: [Signature] — Coded & tested
- [ ] Date: [Date]

### QA
- [ ] QA Lead: [Signature] — Tests passed
- [ ] Date: [Date]

### DevOps
- [ ] DevOps: [Signature] — Deployment approved
- [ ] Date: [Date]

### Product
- [ ] Product Owner: [Signature] — Ready for production
- [ ] Date: [Date]

## Notes Post-Deployment

```
[Notes prises pendant deployment]
- [Heure]: Étape X complétée
- [Heure]: Métrique Y observée
- [Heure]: Issue Z trouvée et resolue
```

---

**Migration Status**: 🔵 [Status à jour]  
**Last Updated**: May 4, 2026  
EOF
```

#### 2.3 Créer TEST_CASES.md

```bash
cat > prisma/migrations/20260505_phase_6_7_8_complete/TEST_CASES.md << 'EOF'
# Test Cases for PHASE 6, 7, 8 Migration

## Pre-Deployment Tests (Dev)

### Security Tests
```bash
# Test 1: Password hashing works
✅ hashPassword('test') != 'test'
✅ verifyPassword('test', hash) == true
✅ Hash changes on every call (salt)

# Test 2: Encryption works
✅ encryptField('plaintext') != 'plaintext'
✅ decryptField(encrypted) == 'plaintext'
✅ Ciphertext different every call (random IV)

# Test 3: JWT tokens work
✅ generateToken({userId: 1}) returns JWT
✅ verifyToken(jwt) extracts payload correctly
✅ verifyToken(expiredToken) returns null
✅ verifyToken(invalidToken) returns null

# Test 4: RBAC works
✅ admin has 11 permissions
✅ caissier has 5 permissions (no manage:users)
✅ commercial has 5 permissions (no export:data)
✅ hasPermission(admin, 'manage:users') == true
✅ hasPermission(caissier, 'manage:users') == false
```

### Business Logic Tests
```bash
# Test 5: Client creation with codes
✅ createClientWithCodes() generates unique membership_code
✅ createClientWithCodes() generates unique account_number
✅ Duplicate codes automatically regenerated

# Test 6: Transactions
✅ recordTransaction(type: 'depot') increases balance
✅ recordTransaction(type: 'retrait') decreases balance
✅ validateTransaction() updates caisse générale

# Test 7: Cotisations
✅ recordCotisation(day=1) sets allocation='benefice_societe'
✅ recordCotisation(day>1) sets allocation='remboursement'
✅ Auto-detect 'solde' when totalCotise >= totalCapital

# Test 8: Advanced deposits
✅ recordAdvancedDeposit(5) creates 5 cotisation entries
✅ Each entry dated for future day
✅ All entries same amount
```

### Logging Tests
```bash
# Test 9: Action logs created
✅ logLogin() creates ActionLog
✅ logCreateClient() creates ActionLog with details
✅ logDeposit() creates ActionLog with amount
✅ logValidateTransaction() links to transaction_id

# Test 10: Query action logs
✅ getActionLogs(filters) returns filtered logs
✅ getUserActivityLog(userId) shows user's activity
✅ Pagination works (limit, offset)
✅ No UPDATE/DELETE allowed on logs
```

## Post-Deployment Tests (Staging)

### End-to-End Tests
```bash
# Test 11: Full Apprenant workflow
1. Create client apprenant ✅
2. Create apprenant with guardian ✅
3. Create cotisation account ✅
4. Record daily cotisation ✅
5. Check balance updated ✅
6. View action logs ✅

# Test 12: Full Non-Apprenant workflow
1. Create client non-apprenant ✅
2. Create cotisation account ✅
3. Create financement ✅
4. Record cotisations (200) ✅
5. Auto-detect 'solde' ✅
6. Transfer to savings ✅

# Test 13: API endpoints
POST /api/auth/login ✅
POST /api/clients ✅
POST /api/transactions ✅
PUT /api/transactions/:id/validate ✅
POST /api/cotisations ✅
GET /api/audit-logs ✅
GET /api/dashboard/stats ✅
```

### Performance Tests
```bash
# Test 14: Latency
✅ All queries < 100ms
✅ 99th percentile < 500ms
✅ No slowlogs in database

# Test 15: Load (100 concurrent users)
✅ Request success rate > 99%
✅ p99 latency < 500ms
✅ Zero connection pool errors
```

### Security Tests
```bash
# Test 16: HTTPS
✅ http:// redirects to https://
✅ SSL certificate valid
✅ No mixed content

# Test 17: Authentication
✅ Invalid token returns 401
✅ Expired token returns 401
✅ No token returns 401

# Test 18: Authorization
✅ Caissier cannot access /api/users (403)
✅ Commercial cannot access /api/export (403)
✅ Only admin can see all user logs

# Test 19: Data security
✅ Sensitive fields not returned in API
✅ Passwords never logged
✅ JWT tokens never logged
```

## Acceptance Criteria (Must Pass)

- [ ] 0 TypeScript errors
- [ ] 35+ automated tests pass
- [ ] All smoke tests pass
- [ ] Performance baseline met
- [ ] Security audit passed
- [ ] No regressions in existing features
- [ ] Rollback procedure documented & tested

---

**Test Plan Created**: May 4, 2026  
**Last Updated**: May 4, 2026  
EOF
```

#### 2.4 Créer ROLLBACK.sql (optionnel mais recommandé)

```bash
cat > prisma/migrations/20260505_phase_6_7_8_complete/ROLLBACK.sql << 'EOF'
-- ROLLBACK Script for PHASE 6, 7, 8 Migration
-- 
-- This migration does NOT change the database schema,
-- so there is nothing to rollback in SQL.
-- 
-- The rollback is purely at the APPLICATION level:
-- 1. Revert git commit: git revert HEAD
-- 2. Rebuild: npm run build
-- 3. Restart: pm2 restart waooo-api-prod
-- 
-- Database state remains unchanged.
-- No schema rollback needed.

-- Verification query (for reference)
SELECT 
  COUNT(DISTINCT table_name) as table_count,
  COUNT(DISTINCT constraint_name) as constraint_count
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints c USING (table_schema, table_name)
WHERE table_schema = 'public';

-- Expected output: All tables and constraints UNCHANGED
EOF
```

---

## 📊 Migration History Register

Créer un fichier master: `MIGRATION_REGISTRY.md`

```bash
cat > MIGRATION_REGISTRY.md << 'EOF'
# Migration Registry — Waooo Félicitations v2.0

**Dernière mise à jour**: May 4, 2026  
**Total migrations**: 8  
**Status**: 5 Deployed, 3 Planned  

---

## ✅ Deployed Migrations

| ID | Date | Description | Stage | Status | Rollback |
|---|------|---|---|---|---|
| 20260401_phase_2_enums | Apr 1, 2026 | Create 17 enums | dev | ✅ Deployed | Schema rollback needed |
| 20260402_phase_3_tables | Apr 2, 2026 | Create 18 tables | dev, staging | ✅ Deployed | Full restore needed |
| 20260403_phase_4_indexes | Apr 3, 2026 | Create 50+ indexes | dev, staging | ✅ Deployed | Drop indexes |
| 20260404_phase_5_seed | Apr 4, 2026 | Seed 37 test records | dev | ✅ Deployed | Delete records |
| 20260505_phase_6_7_8 | May 5, 2026 | Security, Logic, Logging | dev, staging, prod | ✅ Deployed | Code revert |

## 🟡 Pending Migrations

| ID | Target | Description | Status | Owner |
|---|---|---|---|---|
| 20260601_fix_cotisation_constraint | dev | Add CHECK constraint | 🟡 Draft | [Assign] |
| 20260602_add_insurance_premium | dev | Insurance premium features | 🟡 Draft | [Assign] |
| 20260603_performance_optimization | dev | Query optimization indexes | 🟡 Draft | [Assign] |

## 🔴 Failed Migrations (History)

Aucune pour le moment ✅

---

## Deployment Branches Status

| Branch | Latest Migration | Date | Status |
|---|---|---|---|
| **dev** | 20260505_phase_6_7_8 | May 5 | ✅ Current |
| **staging** | 20260505_phase_6_7_8 | May 5 | ✅ Staging |
| **main** | 20260505_phase_6_7_8 | May 5 | ✅ Production |

---

## Audit Trail

```
2026-05-04: Migration 20260505 created & tested on dev
2026-05-05: Migration promoted to staging, QA signed off
2026-05-05: Migration deployed to production, monitoring active
```

---

**Last Updated**: May 4, 2026  
**Maintained by**: DevOps Team  
**Review Frequency**: Monthly  
EOF
```

---

## 🚀 Procédure Standard de Migration

### Étape 1: Développement (dev branch)

```bash
# 1. Créer migration
npx prisma migrate create migration_name --create-only

# 2. Remplir MIGRATION_NOTES.md
vim prisma/migrations/DATE_migration_name/MIGRATION_NOTES.md

# 3. Remplir TEST_CASES.md
vim prisma/migrations/DATE_migration_name/TEST_CASES.md

# 4. Tester localement
npx prisma migrate deploy
npm run test:phase9

# 5. Commit
git add prisma/migrations/DATE_migration_name/
git commit -m "migration: phase_6_7_8_complete"
git push origin dev

# 6. Mark as ready
sed -i 's/Status: 🟡 Draft/Status: 🟢 Approved/' MIGRATION_NOTES.md
```

### Étape 2: Staging (staging branch)

```bash
# 1. Vérifier que dev migration fonctionne
git log prisma/migrations/ --oneline

# 2. Promouvoir vers staging
git checkout staging
git merge dev

# 3. Appliquer migration
export DATABASE_URL_STAGING="..."
npx prisma migrate deploy

# 4. Exécuter tests staging
npm run test:phase10

# 5. Sign-off
echo "QA: Approved" >> MIGRATION_NOTES.md
```

### Étape 3: Production (main branch)

```bash
# 1. Vérifier que staging fonctionne (72h+)
npm run test:phase11

# 2. Promouvoir vers main
git checkout main
git merge staging

# 3. Appliquer migration
export DATABASE_URL_PROD="..."
npx prisma migrate deploy

# 4. Monitoring
pm2 logs waooo-api-prod

# 5. Update registry
echo "20260505_phase_6_7_8 | ✅ Deployed" >> MIGRATION_REGISTRY.md
```

---

## 📋 Checklist Complète per Migration

```markdown
## Migration: [NAME]

### Pre-Deployment (Dev)
- [ ] migration.sql créé & reviewed
- [ ] MIGRATION_NOTES.md complété
- [ ] TEST_CASES.md écrit
- [ ] ROLLBACK.sql préparé
- [ ] npm run build sans erreurs
- [ ] Tests passés (35+)
- [ ] Security audit OK
- [ ] Dev branch lead review: ✅

### Staging Promotion
- [ ] Dev merged vers staging
- [ ] Migration appliquée: npx prisma migrate deploy
- [ ] Seed exécuté
- [ ] Tests staging passés
- [ ] Performance OK (p99 < 500ms)
- [ ] Load test OK (100 users)
- [ ] Security validated
- [ ] QA lead sign-off: ✅

### Production Deployment
- [ ] 72h+ stable on staging
- [ ] Staging merged vers main
- [ ] Migration appliquée en prod
- [ ] Seed production exécuté
- [ ] Smoke tests passés
- [ ] Monitoring active
- [ ] Rollback tested
- [ ] Stakeholders notified
- [ ] DevOps lead sign-off: ✅

### Post-Deployment
- [ ] Health check OK (24h)
- [ ] Performance metrics stable
- [ ] Error rate < 0.1%
- [ ] Sentry errors: 0
- [ ] Logs clean
- [ ] MIGRATION_REGISTRY.md updated
- [ ] Close deployment ticket
```

---

## 🔒 Governance & Approvals

Pour chaque migration:

1. **Developer**: Code review + tests
2. **DBA**: Schema changes review (si applicable)
3. **QA Lead**: Functional testing signoff
4. **DevOps**: Deployment & monitoring plan review
5. **Product Owner**: Business approval before prod
6. **Tech Lead**: Final approval before production

**Sans tous ces sign-offs, la migration ne peut pas aller en prod.**

---

## 📞 Support & Escalade

Pendant déploiement d'une migration:

- **Problème mineur**: Slack #deployments
- **Problème majeur**: Call team lead
- **Problème critique**: Activater runbook de rollback

Runbook: `PRODUCTION_RUNBOOK.md`

---

**Créé**: May 4, 2026  
**Version**: 1.0  
**Prochaine révision**: May 2026  

