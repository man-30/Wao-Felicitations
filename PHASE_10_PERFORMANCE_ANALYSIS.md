# Phase 10 - Analyse de Performance Détaillée

## Date
9 Mai 2026 - 16:26

## Résumé Exécutif

Tests de performance effectués AVANT et APRÈS l'ajout de 13 index de base de données.

## Résultats Comparatifs

### Test 1 - SANS INDEX (baseline)
```
Durée: 5m 4.5s
Iterations: 1,419
HTTP requests: 3,291

MÉTRIQUES CLÉS:
✗ P95 latency: 9.77s (objectif: <500ms) - 19.5x trop lent
✗ P99 latency: 13.92s (objectif: <1000ms) - 13.9x trop lent  
✗ HTTP errors: 14.76% (486/3291) (objectif: <1%)
✗ Checks success: 74.85% (objectif: >99%)

ÉCHECS:
- clients status 200: 0% (486 échecs)
- dashboard has data: 0% (453 échecs)
- transaction has id: 0% (480 échecs)
```

### Test 2 - AVEC 13 INDEX
```
Durée: 5m 7.4s
Iterations: 968
HTTP requests: 2,908

MÉTRIQUES CLÉS:
✗ P95 latency: 12.44s (+27% vs baseline) - 24.8x trop lent
✗ P99 latency: 15.3s (+10% vs baseline) - 15.3x trop lent
✓ HTTP errors: 0.00% (CORRIGÉ - était 14.76%)
✓ Checks success: 93.57% (amélioration +18.7%)

ÉCHECS:
- audit logs returns array: 100% (310 échecs) - BUG DE TEST, pas API
```

## Index Ajoutés

```sql
-- 13 index créés avec succès:

1. Account_clientId_idx
2. Account_type_idx
3. Transaction_clientId_idx
4. Transaction_status_idx
5. Transaction_type_idx
6. Transaction_createdAt_idx
7. ActionLog_timestamp_idx
8. ActionLog_userId_idx
9. ActionLog_action_idx
10. Transaction_status_createdAt_idx (composite)
11. Account_clientId_type_idx (composite)

-- Index déjà présents dans schema.prisma:
- User: email, role, zone
- Client: membershipCode, accountNumber, assignedCommercialId, type
- Apprenant: clientId, schoolName
- TontineAccount: apprenantId, grilleNumero, status
- Cotisation: tontineAccountId, date, allocation
```

## Analyse des Résultats

### ✅ Améliorations Obtenues

1. **Erreurs HTTP éliminées**: 14.76% → 0.00%
   - Les 486 erreurs HTTP 4xx/5xx ont disparu
   - Stabilité API grandement améliorée

2. **Checks améliorés**: 74.85% → 93.57%
   - Seul échec restant: bug de validation dans test k6 (audit logs)

3. **Fiabilité fonctionnelle**:
   - POST /api/clients: stable
   - POST /api/transactions: stable
   - GET /api/dashboard/stats: stable

### ❌ Dégradations Constatées

1. **Latence P95**: 9.77s → 12.44s (+27%)
2. **Latence P99**: 13.92s → 15.3s (+10%)
3. **Throughput**: 4.66 iter/s → 3.15 iter/s (-32%)
4. **Durée moyenne requête**: 3.97s → 5.08s (+28%)

## Causes Probables de Dégradation

### 1. Accumulation de Données
- Test 1 a créé ~486 clients, ~480 transactions
- Test 2 travaille sur base plus volumineuse
- **Impact**: Requêtes SQL plus lentes car plus de lignes à scanner

### 2. Requêtes N+1 Non Optimisées
Les index résolvent les lookups simples mais pas les requêtes N+1:

```typescript
// PROBLÈME POTENTIEL dans getActionLogs():
const logs = await prisma.actionLog.findMany({...});
// Si chaque log charge User séparément → N requêtes
```

### 3. Index Manquants
Certaines colonnes fréquemment filtrées n'ont pas d'index:
- `ActionLog.timestamp` (pour sorting DESC)
- `Transaction.collectedBy` et `validatedBy` (foreign keys)

### 4. Pooling de Connexions
- PrismaPg adapter configuré pour DATABASE_URL_POOLED
- Sous charge 100 VUs, possible contention de pool

## Bug Corrigé dans k6

**Problème**: Check `audit logs returns array` échouait à 100%

**Cause**: L'endpoint `/api/audit-logs` retourne `{ count, logs }`, pas un array direct

**Correction appliquée**:
```javascript
// AVANT (incorrect)
'audit logs returns array': (r) => Array.isArray(r.json())

// APRÈS (correct)
'audit logs has logs array': (r) => r.json().logs && Array.isArray(r.json().logs)
'audit logs accessible': (r) => r.json().count !== undefined
```

## Actions Recommandées

### 🔴 CRITIQUE - Réinitialiser Base de Test

```bash
# Nettoyer et re-seeder pour état propre
npx prisma db push --force-reset
npx tsx prisma/seed-staging.ts
```

**Justification**: Éliminer biais d'accumulation de données avant re-test

### 🟠 HAUTE PRIORITÉ - Optimiser Requêtes N+1

**Backend à investiguer**:

1. `getActionLogs()` - Vérifier si User est eager-loaded
2. `GET /api/dashboard/stats` - Checker agrégations
3. `GET /api/clients` - Vérifier si apprenant/nonApprenant chargés

**Solution Prisma**:
```typescript
// AVANT
const logs = await prisma.actionLog.findMany({...});

// APRÈS (avec include)
const logs = await prisma.actionLog.findMany({
  include: { user: { select: { name: true, email: true } } }
});
```

### 🟡 MOYENNE PRIORITÉ - Index Additionnels

```sql
-- Foreign keys pour JOINs
CREATE INDEX "Transaction_collectedBy_idx" ON "Transaction"("collectedBy");
CREATE INDEX "Transaction_validatedBy_idx" ON "Transaction"("validatedBy");
CREATE INDEX "Expense_recordedBy_idx" ON "Expense"("recordedBy");

-- Améliorer sorting
CREATE INDEX "Client_createdAt_idx" ON "Client"("createdAt" DESC);
```

### 🟢 BASSE PRIORITÉ - Monitoring Production

1. Activer Prisma query logging:
   ```typescript
   log: ['query', 'info', 'warn', 'error']
   ```

2. Analyser EXPLAIN ANALYZE sur requêtes lentes:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM "ActionLog" 
   WHERE "userId" = 'xxx' 
   ORDER BY "timestamp" DESC LIMIT 100;
   ```

## Prochaines Étapes

### Phase A: Correction et Re-test (30 min)

1. ✅ Corriger check k6 audit-logs
2. ⏳ Reset DB + reseed
3. ⏳ Re-run k6 test (5 min)
4. ⏳ Comparer résultats

### Phase B: Optimisation Backend (1-2h)

1. Identifier requêtes N+1 avec Prisma logging
2. Ajouter `include` statements appropriés
3. Re-test après chaque optimisation

### Phase C: Production Readiness (4-6h)

1. Load test avec 200 VUs, 500 VUs
2. Configurer connection pooling optimal
3. Mettre en place monitoring APM
4. Documentation runbook

## Seuils de Performance Acceptables

Pour passer en production (Phase 10 complète):

| Métrique | Objectif | Actuel (avec index) | Écart |
|----------|----------|---------------------|-------|
| P95 latency | <500ms | 12.44s | **-2388%** |
| P99 latency | <1000ms | 15.3s | **-1430%** |
| Error rate | <1% | 0% | ✅ |
| Throughput | >10 iter/s | 3.15 iter/s | -68% |

**Verdict**: ❌ **NON PRÊT pour production**

## Conclusion

L'ajout des index a résolu les **erreurs fonctionnelles** (0% HTTP errors) mais révèle un **problème architectural plus profond** de performance.

**Root cause probable**: Requêtes N+1 et manque d'optimisation Prisma `include`.

**Action immédiate**: Reset DB + re-test pour éliminer biais. Si résultats toujours mauvais, investigation backend mandatory.
