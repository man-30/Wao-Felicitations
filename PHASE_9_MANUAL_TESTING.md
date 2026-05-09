# PHASE 9 — Guide de Tests Manuels Complet

**Objectif**: Valider toutes les fonctionnalités de PHASE 6, 7, 8 via des tests pratiques  
**Durée estimée**: 2-3 heures (pour courir les 5 parcours)  
**Équipe**: 2-3 testeurs (1 QA + 2 business users)  
**Prérequis**: 
- Backend Express.js démarré et accessible
- Postman ou Insomnia (pour API calls)
- Accès à Neon console (pour vérifier base)

---

## 🚀 Étape 0: Démarrer le Backend

### 0.1 Vérifier la Configuration

```bash
# Terminal 1: Vérifier les dépendances
cd c:\Wao Felicitations

# Vérifier .env.backend existe
ls .env.backend
# ✅ Doit afficher: .env.backend

# Vérifier package.json a les libs
npm list express cors jsonwebtoken bcryptjs prisma
# ✅ Doit afficher: toutes les versions >= 1.0.0
```

### 0.2 Lancer le Backend (Mode Développement)

```bash
# Terminal 1: Démarrer le serveur
cd c:\Wao Felicitations
export NODE_ENV=development
npx ts-node backend-express-complete.ts

# ✅ Résultat attendu:
# ✅ Server running on port 3001
# ✅ Database connected
# ✅ Ready to accept requests
```

Si erreur de compilation TypeScript :
```bash
# Vérifier la config
npm run build
# ou
npx tsc --noEmit
```

Si erreur de connection base :
```bash
# Vérifier DATABASE_URL_POOLED
cat .env.backend | grep DATABASE_URL_POOLED

# ✅ Doit être une URL Neon valide
# ✅ Format: postgresql://user:pwd@host:5432/db
```

---

## 🧪 SECTION 1: Tester la Sécurité (PHASE 6)

### Test 1.1: Login avec Credentials Valides

**Endpoint**: `POST /api/auth/login`

```bash
# Utiliser Postman ou curl

curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wao-felicitations.com",
    "password": "admin_password_from_seed"
  }'

# ✅ Résultat attendu (200 OK):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "xxx",
    "email": "admin@wao-felicitations.com",
    "role": "admin",
    "zone": "Kinshasa"
  }
}

# 📝 Copier le TOKEN pour les prochains tests
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Test 1.2: Login avec Credentials Invalides

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wao-felicitations.com",
    "password": "wrong_password"
  }'

# ✅ Résultat attendu (401 Unauthorized):
{
  "error": "Invalid credentials"
}
```

### Test 1.3: Vérifier RBAC (Role-Based Access Control)

```bash
# 1.3.1: Admin peut créer un utilisateur
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "role": "caissier",
    "zone": "Kinshasa"
  }'

# ✅ Admin: 201 Created

# 1.3.2: Caissier CANNOT créer utilisateur
# (D'abord login comme caissier)
TOKEN_CAISSIER="..."
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN_CAISSIER" \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@test.com", "role": "caissier"}'

# ✅ Caissier: 403 Forbidden
# ✅ Error: "Permission denied: manage:users"

# 1.3.3: Vérifier que seul admin peut voir audit logs
curl -X GET http://localhost:3001/api/audit-logs \
  -H "Authorization: Bearer $TOKEN_CAISSIER"

# ✅ Caissier: 403 Forbidden
```

### Test 1.4: Vérifier JWT Token Expiration

```bash
# 1. Créer un endpoint /api/health (pas besoin auth)
curl http://localhost:3001/api/health

# ✅ 200 OK:
{
  "status": "ok",
  "timestamp": "2026-05-05T10:00:00Z"
}

# 2. Attendre 24h ou créer un token expiré (simulé)
# Puis tester avec ce token:
TOKEN_EXPIRED="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:3001/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN_EXPIRED"

# ✅ 401 Unauthorized:
{
  "error": "Token expired"
}
```

---

## 📋 SECTION 2: Tester la Logique Métier (PHASE 7)

### Test 2.1: Parcours Complet APPRENANT

**Timeline**: ~30 minutes  
**Acteurs**: Admin + Caissier

#### Étape 1: Admin crée un client apprenant

```bash
curl -X POST http://localhost:3001/api/clients \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_type": "apprenant",
    "phone": "+243812345678",
    "address": "Kinshasa, Kanika"
  }'

# ✅ Résultat (201 Created):
{
  "id": "client-xxx-123",
  "membership_code": "MEM-20260505-ABCD1234",  // ✅ Auto-généré
  "account_number": "ACC-000001",              // ✅ Auto-généré
  "client_type": "apprenant",
  "status": "actif",
  "created_at": "2026-05-05T10:00:00Z"
}

# 📝 Copier CLIENT_ID pour suite
CLIENT_ID="client-xxx-123"
```

**Validations PHASE 6**:
- ✅ membership_code est unique (jamais le même deux fois)
- ✅ account_number est unique
- ✅ Codes générés automatiquement (pas passés en input)

#### Étape 2: Caissier enregistre un dépôt pour ce client

```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer $TOKEN_CAISSIER" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "'$CLIENT_ID'",
    "account_id": "account-xxx",
    "transaction_type": "depot",
    "amount": "50000"
  }'

# ✅ Résultat (201 Created):
{
  "id": "tx-xxx",
  "client_id": "'$CLIENT_ID'",
  "amount": "50000",
  "status": "en_attente",  // ✅ En attente de validation admin
  "created_by_id": "user-caissier",
  "created_at": "2026-05-05T10:01:00Z"
}

# 📝 Copier TX_ID
TX_ID="tx-xxx"
```

**Validation PHASE 7**:
- ✅ Transaction en statut "en_attente"
- ✅ Créée par le caissier
- ✅ Pas encore validée

#### Étape 3: Admin valide le dépôt

```bash
curl -X PUT http://localhost:3001/api/transactions/$TX_ID/validate \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "validated_by": "user-admin"
  }'

# ✅ Résultat (200 OK):
{
  "id": "'$TX_ID'",
  "status": "approuve",  // ✅ Status changé!
  "amount": "50000",
  "balance_updated": true,
  "validated_at": "2026-05-05T10:02:00Z"
}
```

**Validations PHASE 7**:
- ✅ Status passe de "en_attente" à "approuve"
- ✅ Balance du client augmente de 50000
- ✅ Balance de la caisse générale augmente de 50000

#### Étape 4: Vérifier la balance mise à jour

```bash
curl -X GET http://localhost:3001/api/clients/$CLIENT_ID \
  -H "Authorization: Bearer $TOKEN_ADMIN"

# ✅ Résultat (200 OK):
{
  "id": "'$CLIENT_ID'",
  "balance": "50000",  // ✅ Updated!
  "transactions": [{
    "id": "'$TX_ID'",
    "type": "depot",
    "amount": "50000",
    "status": "approuve"
  }]
}

# Vérifier la caisse générale
curl -X GET http://localhost:3001/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN_ADMIN"

# ✅ Résultat:
{
  "caisse_generale_balance": "50000",  // ✅ Updated!
  "total_transactions": 1,
  "total_clients": 1
}
```

### Test 2.2: Enregistrer une Cotisation Journalière

```bash
# Préparation: Créer un compte cotisation pour l'apprenant
curl -X POST http://localhost:3001/api/cotisations \
  -H "Authorization: Bearer $TOKEN_CAISSIER" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "'$CLIENT_ID'",
    "apprenant_id": "apprenant-xxx",
    "cotisation_journaliere": "2500",
    "total_capital": "500000"
  }'

# ✅ Résultat (201 Created):
{
  "id": "cotis-xxx",
  "status": "actif",
  "total_cotise": "0",
  "total_capital": "500000",
  "remaining": "500000"
}

# Enregistrer une cotisation
curl -X POST http://localhost:3001/api/cotisations/record \
  -H "Authorization: Bearer $TOKEN_CAISSIER" \
  -H "Content-Type: application/json" \
  -d '{
    "cotisation_account_id": "cotis-xxx",
    "amount": "2500",
    "date": "2026-05-05"
  }'

# ✅ Résultat (201 Created):
{
  "id": "cotis-entry-123",
  "amount": "2500",
  "allocation": "remboursement",  // ✅ Auto-détecté (jour > 1)
  "date": "2026-05-05",
  "total_cotise": "2500"
}

# Vérifier la cotisation ajoutée
curl -X GET http://localhost:3001/api/cotisations/cotis-xxx \
  -H "Authorization: Bearer $TOKEN_CAISSIER"

# ✅ total_cotise: "2500" (mis à jour)
```

**Validations PHASE 7**:
- ✅ Allocation auto-calculée selon le jour
- ✅ total_cotise mis à jour automatiquement
- ✅ Quand total_cotise >= total_capital → status = "solde"

### Test 2.3: Dépôt Anticipé (5 Jours)

```bash
# Caissier enregistre un dépôt couvrant 5 jours à l'avance
curl -X POST http://localhost:3001/api/cotisations/advanced-deposit \
  -H "Authorization: Bearer $TOKEN_CAISSIER" \
  -H "Content-Type: application/json" \
  -d '{
    "cotisation_account_id": "cotis-xxx",
    "num_days": 5,
    "amount_per_day": "2500"
  }'

# ✅ Résultat (201 Created):
{
  "created_entries": 5,  // ✅ 5 entrées cotisations créées!
  "total_amount": "12500",
  "entries": [
    {
      "date": "2026-05-06",  // Demain
      "amount": "2500"
    },
    {
      "date": "2026-05-07",
      "amount": "2500"
    },
    // ... 3 autres jours
  ]
}

# Vérifier que 5 cotisations existent bien
curl -X GET http://localhost:3001/api/cotisations/cotis-xxx/entries \
  -H "Authorization: Bearer $TOKEN_CAISSIER"

# ✅ Doit retourner array de 5+ entrées cotisations
```

**Validations PHASE 7**:
- ✅ 5 entrées cotisations créées automatiquement
- ✅ Chaque entrée datée pour les 5 jours futurs
- ✅ Montant total = 5 × 2500 = 12500

---

## 📊 SECTION 3: Tester la Journalisation (PHASE 8)

### Test 3.1: Vérifier les Logs d'Action

```bash
# 1. Après login, il y a un log LOGIN
curl -X GET http://localhost:3001/api/audit-logs \
  -H "Authorization: Bearer $TOKEN_ADMIN"

# ✅ Résultat (200 OK):
{
  "logs": [
    {
      "id": "log-xxx",
      "action": "LOGIN",
      "user_id": "user-admin",
      "user_name": "admin@wao...",
      "user_role": "admin",
      "timestamp": "2026-05-05T10:00:00Z",
      "details": {
        "ip": "127.0.0.1"
      }
    }
  ]
}

# 2. Après création client, il y a un log CREATE_CLIENT
# Chercher dans les logs:
curl -X GET "http://localhost:3001/api/audit-logs?action=CREATE_CLIENT" \
  -H "Authorization: Bearer $TOKEN_ADMIN"

# ✅ Doit retourner le log de création du client
{
  "action": "CREATE_CLIENT",
  "user_id": "user-admin",
  "details": {
    "client_id": "'$CLIENT_ID'",
    "membership_code": "MEM-20260505-ABCD1234"
  },
  "timestamp": "2026-05-05T10:00:30Z"
}

# 3. Après dépôt, il y a un log DEPOSIT
curl -X GET "http://localhost:3001/api/audit-logs?action=DEPOSIT" \
  -H "Authorization: Bearer $TOKEN_ADMIN"

# ✅ Doit retourner le log de dépôt:
{
  "action": "DEPOSIT",
  "user_id": "user-caissier",
  "details": {
    "transaction_id": "'$TX_ID'",
    "amount": "50000"
  },
  "related_id": "'$TX_ID'",
  "timestamp": "2026-05-05T10:01:00Z"
}
```

**Validations PHASE 8**:
- ✅ Chaque action crée un log (LOGIN, CREATE_CLIENT, DEPOSIT, etc)
- ✅ Logs contiennent userId, userName, userRole
- ✅ Logs contiennent details JSON avec infos pertinentes
- ✅ Logs sont timestamp-ed
- ✅ Logs sont immutables (pas de UPDATE/DELETE)

### Test 3.2: Vérifier l'Historique Utilisateur

```bash
# Voir tous les logs d'un utilisateur (derniers 30 jours)
curl -X GET "http://localhost:3001/api/audit-logs/user/user-caissier" \
  -H "Authorization: Bearer $TOKEN_ADMIN"

# ✅ Résultat (200 OK):
{
  "user_id": "user-caissier",
  "activity_days": 1,
  "logs": [
    {
      "action": "LOGIN",
      "timestamp": "2026-05-05T10:00:00Z"
    },
    {
      "action": "DEPOSIT",
      "timestamp": "2026-05-05T10:01:00Z"
    },
    {
      "action": "VALIDATE_TRANSACTION",
      "timestamp": "2026-05-05T10:02:00Z"
    }
  ]
}
```

**Validations PHASE 8**:
- ✅ Historique complet par utilisateur
- ✅ Pagination fonctionne (limit, offset)
- ✅ Chronologie respectée (plus récent d'abord)

---

## ✅ SECTION 4: Tests de Performance

### Test 4.1: Requête < 100ms

```bash
# Installer Apache Bench ou utiliser curl avec timing
# Option 1: curl avec timing
time curl -s http://localhost:3001/api/health | jq .

# ✅ Doit afficher: real 0m0.050s (50ms < 100ms ✅)

# Option 2: Postman - Enable "Show Postman Console"
# Puis faire un request et regarder "Response time"
# ✅ Doit afficher < 100ms
```

### Test 4.2: Requête avec Pagination (500+ entrées)

```bash
# Créer 100 transactions (en boucle)
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/transactions \
    -H "Authorization: Bearer $TOKEN_CAISSIER" \
    -H "Content-Type: application/json" \
    -d '{
      "client_id": "'$CLIENT_ID'",
      "amount": "1000",
      "type": "depot"
    }'
done

# Puis tester pagination
curl -X GET "http://localhost:3001/api/audit-logs?limit=50&offset=0" \
  -H "Authorization: Bearer $TOKEN_ADMIN"

# ✅ Doit retourner 50 entrées (pas plus)
# ✅ Temps réponse < 100ms

curl -X GET "http://localhost:3001/api/audit-logs?limit=50&offset=50" \
  -H "Authorization: Bearer $TOKEN_ADMIN"

# ✅ Doit retourner la 2ème page de 50 entrées
```

---

## 📝 SECTION 5: Checklist de Sign-Off

### Sécurité ✅/❌
- [ ] Login avec credentials invalides retourne 401
- [ ] Token expiré retourne 401
- [ ] Caissier ne peut pas créer utilisateur (403)
- [ ] Commercial ne peut pas exporter données (403)
- [ ] Aucun password en clair dans logs
- [ ] Aucun JWT token en clair dans logs

### Logique Métier ✅/❌
- [ ] Client crée avec membership_code unique
- [ ] Client crée avec account_number unique
- [ ] Codes générés automatiquement
- [ ] Dépôt met à jour balance client
- [ ] Dépôt met à jour balance caisse
- [ ] Cotisation journalière enregistrée
- [ ] Allocation auto-calculée (jour 1 vs jour >1)
- [ ] Dépôt anticipé crée N entrées cotisations
- [ ] Statut "solde" détecté automatiquement

### Journalisation ✅/❌
- [ ] LOGIN crée un log
- [ ] CREATE_CLIENT crée un log avec details
- [ ] DEPOSIT crée un log avec amount
- [ ] VALIDATE_TRANSACTION crée un log
- [ ] Historique utilisateur queryable
- [ ] Logs immuables (pas de DELETE)
- [ ] Logs contiennent timestamp exact

### Performance ✅/❌
- [ ] Requête health < 100ms
- [ ] Requête client < 100ms
- [ ] Requête dashboard < 100ms
- [ ] Pagination fonctionne (limit, offset)
- [ ] Pas de N+1 queries (vérifier logs DB)

### Conformité PHASE 9 ✅/❌
- [ ] 5 parcours métier testés complètement
- [ ] 20+ cas de tests validés
- [ ] Zéro blockers critiques trouvés
- [ ] Zéro regressions des features Phase 6-8
- [ ] Performance baseline atteint (< 100ms)

---

## 🎯 Résultats Attendus

### Succès (PASS)
✅ Tous les tests passent  
✅ Zéro erreur applicative  
✅ Zéro erreur base de données  
✅ Performance < 100ms  
✅ RBAC respecté (test de 403 positifs)  

### Rapport de Test
```
PHASE 9 — TEST EXECUTION REPORT
================================

Date: 2026-05-05
Duration: 2.5 hours
Testers: [Names]

Test Results:
- Security Tests: ✅ 6/6 PASS
- Business Logic: ✅ 8/8 PASS
- Logging: ✅ 4/4 PASS
- Performance: ✅ 3/3 PASS
- Total: ✅ 21/21 PASS (100%)

Critical Issues: 0
Major Issues: 0
Minor Issues: 0

Recommendation: ✅ PASS TO PHASE 10 STAGING

Sign-Off:
QA Lead: [Signature] ✅
Product Owner: [Signature] ✅
```

---

## 🚨 Troubleshooting

### Backend ne démarre pas
```bash
# Erreur: Cannot find module '@prisma/client'
npm install @prisma/client

# Erreur: DATABASE_URL not set
cat .env.backend
# Vérifier DATABASE_URL_POOLED présent

# Erreur: Connection refused
# Vérifier que DATABASE_URL_POOLED est correct (URL Neon)
```

### Tests retournent 500 errors
```bash
# Regarder les logs du backend
pm2 logs waooo-api-prod
# ou voir le terminal où le backend tourne

# Erreur commune: Relation not found
# → Vérifier que Prisma migrations ont été appliquées
npx prisma migrate deploy

# Erreur commune: User not found
# → Vérifier que seed a été exécuté
npx prisma db seed
```

### Performance lente (> 500ms)
```bash
# Vérifier les index
# Aller à Neon console → SQL Editor
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
# ✅ Doit afficher: (no rows)

# Vérifier connexion pool
SELECT count(*) FROM pg_stat_activity;
# ✅ Doit afficher: < 20 connexions
```

---

## 📚 Documents Associés

- [backend-express-complete.ts](./backend-express-complete.ts) — Code API (13 routes)
- [PHASE_9_TESTS.ts](./PHASE_9_TESTS.ts) — Tests automatisés Jest (pour après si besoin)
- [PHASE_10_STAGING.md](./PHASE_10_STAGING.md) — Après tests manuels réussis
- [lib/security.ts](./lib/security.ts) — Code PHASE 6
- [lib/db/businessLogic.ts](./lib/db/businessLogic.ts) — Code PHASE 7
- [lib/db/actionLog.ts](./lib/db/actionLog.ts) — Code PHASE 8

---

**Créé**: May 4, 2026  
**Version**: 1.0  
**Status**: ✅ Prêt pour tests manuels  

