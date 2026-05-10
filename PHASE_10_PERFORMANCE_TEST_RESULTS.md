# PHASE 10 — Tests de Performance

**Date**: 10 Mai 2026  
**Environnement**: Staging  
**Outil**: k6 v2.0.0-rc1  
**Backend**: Express + Prisma + Neon PostgreSQL  

---

## Configuration du Test

### Paramètres k6

```javascript
stages: [
  { duration: '30s', target: 10 },   // Warm-up: 10 utilisateurs
  { duration: '1m', target: 50 },    // Montée: 50 utilisateurs
  { duration: '3m', target: 100 },   // Pic: 100 utilisateurs
  { duration: '30s', target: 0 },    // Descente: 0 utilisateurs
]
```

### Seuils de Performance

- **Latence P95**: < 500ms
- **Latence P99**: < 1000ms (1s)
- **Taux d'erreur**: < 1%
- **Erreurs métier**: < 1%

---

## Scénarios de Test

### 1. Admin Workflow
- Login admin
- GET /api/dashboard/stats
- GET /api/audit-logs

### 2. Cashier Workflow
- Login cashier
- POST /api/transactions (création de transactions)

### 3. Read-Only Workflow
- Login admin
- GET /api/clients (lecture clients)

---

## Résultats

### ❌ Métriques Globales - ÉCHEC

**Durée totale**: 5m 4.5s  
**Utilisateurs max**: 100 VUs  
**Itérations complètes**: 1419  

### 🔴 Seuils Non Respectés

| Métrique | Seuil | Résultat | Status |
|----------|-------|----------|--------|
| **Latence P95** | < 500ms | **9.77s** | ❌ ÉCHEC (19.5x trop lent) |
| **Latence P99** | < 1000ms | **13.92s** | ❌ ÉCHEC (13.9x trop lent) |
| **Taux d'erreur HTTP** | < 1% | **14.76%** | ❌ ÉCHEC (486/3291 requêtes) |
| **Erreurs métier** | < 1% | **100%** | ❌ ÉCHEC (1419/1419 checks) |

### 📊 Détails des Requêtes

**Total requêtes HTTP**: 3,291  
**Requêtes réussies**: 2,805 (85.24%)  
**Requêtes échouées**: 486 (14.76%)  

**Temps de réponse moyen**: 3.97s  
**Temps de réponse max**: 17.25s  

### ❌ Checks Échoués

| Check | Taux Succès |
|-------|-------------|
| ✅ login status 200 | 100% |
| ✅ login has token | 100% |
| ❌ clients status 200 | **0%** (0/486) |
| ❌ dashboard has data | **0%** (0/453) |
| ❌ transaction has id | **0%** (0/480) |
| ✅ audit logs status 200 | 100% |

---

## Analyse des Problèmes

### 🔴 Problèmes Critiques Identifiés

1. **Endpoints GET /api/clients** - 100% échec
   - Le script k6 tente d'accéder à GET /api/clients sans ID
   - L'endpoint requiert probablement un ID spécifique
   - **Action**: Corriger le script k6 pour utiliser des IDs valides

2. **Dashboard sans données** - 0% succès
   - GET /api/dashboard/stats retourne une réponse mais sans les champs attendus
   - Le check `dashboard has data` vérifie `totalClients` qui n'existe peut-être pas
   - **Action**: Vérifier la structure de réponse du dashboard

3. **Transactions sans ID** - 0% succès
   - POST /api/transactions crée la transaction (status 201) mais la réponse n'a pas de champ `id`
   - **Action**: Vérifier que l'API retourne bien l'objet créé avec son ID

4. **Performance inacceptable** - P95 à 9.77s
   - Temps de réponse 19x trop lent sous charge
   - Probable goulot d'étranglement base de données ou réseau
   - **Action**: Optimiser les requêtes DB et ajouter des index

### ✅ Points Fonctionnels

- ✅ **Authentification JWT**: 100% de succès
- ✅ **Login endpoints**: Fonctionnels et rapides
- ✅ **Audit logs**: Accessibles et fonctionnels
- ✅ **Création transactions**: Status 201 OK (malgré structure réponse incorrecte)

### 🔍 Causes Probables

1. **Script k6 mal configuré**: Les checks vérifient des champs qui n'existent pas
2. **API response structure**: Les réponses ne correspondent pas aux attentes
3. **Pas d'optimisation DB**: Requêtes lentes sous charge (pas d'index, N+1 queries)
4. **Pooling connexions**: Possible saturation du pool PgBouncer

---

## Prochaines Étapes - Actions Correctives

### Phase 1: Corrections Urgentes (Priorité Haute)

1. **Corriger le script k6**
   - [ ] Créer un client avant de le GET
   - [ ] Vérifier les bons noms de champs dans les checks
   - [ ] Utiliser les IDs retournés dynamiquement

2. **Optimiser la base de données**
   - [ ] Ajouter des index sur les colonnes fréquemment requêtées
   - [ ] Analyser et optimiser les requêtes lentes (EXPLAIN ANALYZE)
   - [ ] Vérifier le pool de connexions PgBouncer

3. **Valider la structure API**
   - [ ] Vérifier que POST /api/transactions retourne l'objet créé
   - [ ] Confirmer la structure de réponse de /api/dashboard/stats
   - [ ] Tester manuellement chaque endpoint

### Phase 2: Re-test (Après Corrections)

4. **Ré-exécuter les tests k6**
   - [ ] Avec script corrigé
   - [ ] Avec DB optimisée
   - [ ] Objectif: P95 < 500ms, erreurs < 1%

5. **Documenter les résultats**
   - [ ] Mettre à jour PHASE_10_PERFORMANCE_TEST_RESULTS.md
   - [ ] Créer PHASE_10_SIGN_OFF.md si succès
   - [ ] Sinon, itérer sur les optimisations

---

## Commande de Test

```bash
cd "c:\Wao Felicitations"
k6 run k6-staging-performance.js
```
