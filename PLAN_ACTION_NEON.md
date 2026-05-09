# Plan d'Action — Implémentation Base de Données sur Neon
# WAOOO FELICITATIONS v2.0

> **Base de données** : Neon Serverless PostgreSQL (neon.com)
> **Particularités Neon** : PostgreSQL fully managed, serverless, scale-to-zero, branching Git-like, connection pooling intégré (PgBouncer), backups automatiques, point-in-time recovery.
> **Méthode** : Les phases sont séquentielles. Ne pas passer à une phase suivante sans avoir complété et validé la phase en cours.

---

## PHASE 1 — Création et Configuration du Projet Neon

- [ ] Créer un compte sur [neon.com](https://neon.com) si ce n'est pas déjà fait
- [ ] Créer un nouveau **Project Neon** nommé `waooo-felicitations`
- [ ] Sélectionner la région la plus proche (recommandé : Europe ou US East selon hébergement de l'app)
- [ ] Noter et sauvegarder les informations de connexion fournies par Neon :
  - `DATABASE_URL` (connexion directe)
  - `DATABASE_URL_POOLED` (connexion via PgBouncer — à utiliser en production)
- [ ] Créer trois **branches Neon** dès le départ :
  - `main` → branche de production
  - `staging` → branche de recette/validation
  - `dev` → branche de développement actif
- [ ] Configurer les variables d'environnement dans l'application :
  - `DATABASE_URL` → connexion directe (pour les migrations uniquement)
  - `DATABASE_URL_POOLED` → connexion poolée (pour toutes les requêtes applicatives)
- [ ] Installer le driver Neon dans le projet : `@neondatabase/serverless` (si environnement serverless) ou `pg` (si Node.js standard)
- [ ] Installer et configurer l'ORM choisi (Prisma ou Drizzle — voir note ci-dessous)
- [ ] Tester la connexion à la branche `dev` depuis l'application et vérifier le ping

> 💡 **Note ORM** : Prisma et Drizzle sont tous les deux compatibles avec Neon.
> - **Prisma** : `npx prisma migrate deploy` pour appliquer les migrations
> - **Drizzle** : `npx drizzle-kit push` ou `npx drizzle-kit migrate`
> Choisir selon la stack existante du projet.

---

## PHASE 2 — Création des Enums (sur la branche `dev`)

> Toutes les opérations de cette phase se font sur la branche **`dev`**.

- [ ] Créer l'enum `user_role` : `admin`, `caissier`, `commercial`
- [ ] Créer l'enum `client_type` : `apprenant`, `non-apprenant`
- [ ] Créer l'enum `account_type` : `epargne`, `financement`
- [ ] Créer l'enum `account_status` : `actif`, `solde`, `ferme`
- [ ] Créer l'enum `transaction_type` : `depot`, `retrait`, `cotisation`, `paiement`, `transfert`, `frais`
- [ ] Créer l'enum `transaction_status` : `en_attente`, `approuve`, `rejete`
- [ ] Créer l'enum `document_status` : `fourni`, `manquant`, `en_attente`
- [ ] Créer l'enum `cotisation_account_status` : `actif`, `solde`, `suspendu`
- [ ] Créer l'enum `financement_status` : `en_attente_apport`, `actif`, `solde`
- [ ] Créer l'enum `duree_financement` : `4_mois`, `6_mois`, `8_mois`, `10_mois`
- [ ] Créer l'enum `cotisation_allocation` : `remboursement`, `benefice_societe`
- [ ] Créer l'enum `employee_payment_status` : `en_attente`, `traite`
- [ ] Créer l'enum `caisse_type` : `generale`, `produits_charges`, `assurance`
- [ ] Créer l'enum `expense_category` avec les 18 catégories de charges
- [ ] Créer l'enum `product_category` avec les 10 catégories de produits
- [ ] Valider que tous les enums sont bien créés via le SQL Editor Neon avant de passer à la suite

---

## PHASE 3 — Création des Tables (sur la branche `dev`)

> ⚠️ Respecter impérativement l'ordre ci-dessous pour éviter les erreurs de clés étrangères.

### Bloc A — Tables sans dépendances externes
- [ ] Créer la table `users`
- [ ] Créer la table `guardians`
- [ ] Créer la table `cautions`
- [ ] Créer la table `cash_registers`

### Bloc B — Tables dépendant de `users`
- [ ] Créer la table `clients` (FK → users)
- [ ] Créer la table `admin_code_requests` (FK → users × 2)
- [ ] Créer la table `employee_payments` (FK → users × 3)
- [ ] Créer la table `expenses` (FK → users)
- [ ] Créer la table `product_revenues` (FK → users)

### Bloc C — Tables dépendant de `clients`
- [ ] Créer la table `accounts` (FK → clients, users) avec la FK auto-référente `linked_account_id`
- [ ] Créer la table `apprenants` (FK → clients, guardians, cautions, users)
- [ ] Créer la table `non_apprenants` (FK → clients, users)

### Bloc D — Tables dépendant de `apprenants` et `non_apprenants`
- [ ] Créer la table `cotisation_accounts` (FK → clients, apprenants, non_apprenants)
- [ ] Ajouter la CHECK constraint sur `cotisation_accounts` :
  `CHECK ((apprenant_id IS NOT NULL AND non_apprenant_id IS NULL) OR (apprenant_id IS NULL AND non_apprenant_id IS NOT NULL))`
- [ ] Créer la table `financement_non_apprenants` (FK → non_apprenants)

### Bloc E — Tables dépendant de `cotisation_accounts`
- [ ] Créer la table `cotisations` (FK → cotisation_accounts, users)

### Bloc F — Tables transactionnelles
- [ ] Créer la table `transactions` (FK → clients, accounts × 2, users × 2)
- [ ] Créer la table `insurance_transactions` (FK → clients, users)

### Bloc G — Table d'audit
- [ ] Créer la table `action_logs` (FK → users, transactions)

---

## PHASE 4 — Création des Index (sur la branche `dev`)

- [ ] Appliquer tous les index sur `users`
- [ ] Appliquer tous les index sur `clients`
- [ ] Appliquer tous les index sur `apprenants`
- [ ] Appliquer tous les index sur `non_apprenants`
- [ ] Appliquer tous les index sur `cotisation_accounts`
- [ ] Appliquer tous les index sur `cotisations`
- [ ] Appliquer tous les index sur `financement_non_apprenants`
- [ ] Appliquer tous les index sur `accounts`
- [ ] Appliquer tous les index sur `transactions`
- [ ] Appliquer tous les index sur `insurance_transactions`
- [ ] Appliquer tous les index sur `cash_registers`
- [ ] Appliquer tous les index sur `expenses`
- [ ] Appliquer tous les index sur `product_revenues`
- [ ] Appliquer tous les index sur `employee_payments`
- [ ] Appliquer tous les index sur `action_logs`
- [ ] Vérifier que tous les index sont actifs via le SQL Editor Neon

---

## PHASE 5 — Données Initiales / Seed (sur la branche `dev`)

- [ ] Créer le premier compte `admin` avec email, mot de passe hashé (bcrypt/Argon2) et rôle `admin`
- [ ] Insérer les 3 enregistrements initiaux dans `cash_registers` :
  - `"Caisse Générale"` — type: `generale` — balance: 0
  - `"Caisse Produits & Charges"` — type: `produits_charges` — balance: 0
  - `"Caisse Assurance"` — type: `assurance` — balance: 0
- [ ] Vérifier que le seed s'exécute sans erreur
- [ ] Vérifier que le login admin fonctionne avec les identifiants seedés

---

## PHASE 6 — Sécurité & Contraintes (sur la branche `dev`)

- [ ] Vérifier que tous les mots de passe sont hashés (bcrypt ou Argon2) — aucun mot de passe en clair
- [ ] Mettre en place le chiffrement des champs sensibles : `guardians.id_number`, `cautions.id_number`, `non_apprenants.id_number`
- [ ] Implémenter l'authentification JWT avec expiration des tokens
- [ ] Implémenter le middleware RBAC sur toutes les routes API selon le rôle
- [ ] Vérifier que la CHECK constraint de `cotisation_accounts` fonctionne (tester les cas invalides)
- [ ] Vérifier que les contraintes UNIQUE rejettent bien les doublons : `membership_code`, `account_number`, `email`, `receipt_number`
- [ ] Vérifier que les contraintes NOT NULL rejettent bien les insertions incomplètes
- [ ] Configurer `expires_at` sur `admin_code_requests` (durée recommandée : 24h)
- [ ] Utiliser impérativement `DATABASE_URL_POOLED` (PgBouncer) pour toutes les connexions applicatives en production — évite l'épuisement des connexions en environnement serverless

---

## PHASE 7 — Logique Métier Critique (sur la branche `dev`)

- [ ] Implémenter la génération automatique du `membership_code` au format `XXXXWFyyy` avec vérification d'unicité
- [ ] Implémenter la génération automatique du `account_number` unique à la création d'un client
- [ ] Implémenter la mise à jour automatique de `accounts.balance` après chaque insertion dans `transactions`
- [ ] Implémenter la mise à jour automatique de `cash_registers.balance` (caisse générale) après chaque transaction validée
- [ ] Implémenter la mise à jour automatique de `cash_registers.balance` (caisse produits & charges) après chaque insertion dans `product_revenues` ou `expenses`
- [ ] Implémenter la mise à jour automatique de `cash_registers.balance` (caisse assurance) après chaque insertion dans `insurance_transactions`
- [ ] Implémenter le calcul automatique de `cotisations.allocation` : `cycleDay = 1` → `benefice_societe`, sinon → `remboursement`
- [ ] Implémenter la logique de dépôt anticipé : `jours_couverts > 1` → créer les entrées consécutives dans `cotisations` + renseigner `periode_coverte`
- [ ] Implémenter le calcul automatique de `financement_non_apprenants.apport_pourcentage` : `(apport_personnel / valeur_bien) × 100`
- [ ] Implémenter le passage automatique au mois suivant à l'échéance des 31 jours dans `cotisation_accounts`
- [ ] Implémenter le calcul automatique du montant de régularisation de dette : `jours_manques × cotisation_journaliere`
- [ ] Implémenter la logique de transfert financement → épargne (vérifie solde positif + financement soldé)
- [ ] Implémenter la mise à jour de `cotisation_accounts.total_cotise` après chaque cotisation enregistrée
- [ ] Implémenter la détection automatique du statut `solde` sur `cotisation_accounts` quand `total_cotise >= total_capital`

---

## PHASE 8 — Journalisation ActionLogs (sur la branche `dev`)

- [ ] Implémenter l'insertion automatique dans `action_logs` pour : Connexion / Déconnexion
- [ ] Implémenter l'insertion automatique dans `action_logs` pour : Création Client (Apprenant / Non-Apprenant)
- [ ] Implémenter l'insertion automatique dans `action_logs` pour : Modification Client
- [ ] Implémenter l'insertion automatique dans `action_logs` pour : Enregistrement Cotisation
- [ ] Implémenter l'insertion automatique dans `action_logs` pour : Dépôt / Retrait
- [ ] Implémenter l'insertion automatique dans `action_logs` pour : Transfert Financement → Épargne
- [ ] Implémenter l'insertion automatique dans `action_logs` pour : Paiement Frais (Adhésion / Dossier / Assurance)
- [ ] Implémenter l'insertion automatique dans `action_logs` pour : Positionnement Paiement Employé
- [ ] Implémenter l'insertion automatique dans `action_logs` pour : Traitement Paiement Employé
- [ ] Implémenter l'insertion automatique dans `action_logs` pour : Création / Modification / Activation / Désactivation Utilisateur
- [ ] Implémenter l'insertion automatique dans `action_logs` pour : Retrait Caisse Assurance
- [ ] Implémenter l'insertion automatique dans `action_logs` pour : Export PDF Dashboard
- [ ] Vérifier que `action_logs` est en lecture seule depuis l'application (aucune route UPDATE ou DELETE)

---

## PHASE 9 — Tests & Validation (sur la branche `dev`)

📖 **Documentation Complète**: [PHASE_9_TESTS.ts](./PHASE_9_TESTS.ts) (600+ lignes, 35+ tests automatisés)

### Tests des contraintes
- [ ] Tester l'insertion d'un client avec un `membership_code` en doublon → doit échouer
- [ ] Tester la CHECK constraint de `cotisation_accounts` avec les deux IDs renseignés → doit échouer
- [ ] Tester la CHECK constraint de `cotisation_accounts` avec les deux IDs NULL → doit échouer
- [ ] Tester la mise à jour de `accounts.balance` après un dépôt
- [ ] Tester la mise à jour de `cash_registers` après une transaction validée
- [ ] Tester que les champs chiffrés (`id_number`) sont illisibles en base directe

### Tests des parcours métier complets
- [ ] **Parcours Apprenant** : création client → création apprenant → génération code adhésion → création compte cotisation → cotisation journalière → détection jour manqué → régularisation dette en caisse
- [ ] **Parcours Non-Apprenant** : création client → création financement bien → suivi cotisations → solde financement → transfert vers épargne
- [ ] **Parcours Paiement Employé** : positionnement admin → réception caissier (statut `en_attente`) → traitement caissier → statut `traite` → historique mis à jour → synchronisation dashboard admin
- [ ] **Parcours Caisse Assurance** : création apprenant → crédit automatique caisse assurance → retrait avec motif → vérification historique
- [ ] **Parcours Dépôt Anticipé** : dépôt couvrant 5 jours → vérification de 5 entrées dans `cotisations` → cases cochées correctement

### Tests de performance via SQL Editor Neon
- [ ] Vérifier les temps de réponse des requêtes principales avec les index (< 100ms attendu)
- [ ] Tester une requête sur l'historique transactions d'un client avec 500+ entrées
- [ ] Vérifier que la pagination est bien implémentée sur toutes les listes

---

## PHASE 10 — Promotion vers Staging (branche `dev` → `staging`)

📖 **Guide Complet**: [PHASE_10_STAGING.md](./PHASE_10_STAGING.md) (700+ lignes avec procédures détaillées)

> Neon permet de promouvoir une branche vers une autre sans copie de données grâce au Copy-on-Write.

- [ ] Vérifier que tous les tests de la Phase 9 sont passés sur `dev`
- [ ] Créer une migration propre et versionnée de tous les changements effectués sur `dev`
- [ ] Appliquer la migration sur la branche `staging`
- [ ] Appliquer le seed sur la branche `staging`
- [ ] Effectuer une recette fonctionnelle complète sur `staging` avec des données de test réalistes
- [ ] Vérifier la synchronisation temps réel (WebSocket ou polling) entre caissier et admin sur `staging`
- [ ] Valider les exports PDF depuis le dashboard sur `staging`
- [ ] Vérifier le partage de reçus en PNG/JPEG sur `staging`
- [ ] Obtenir la validation finale de toutes les fonctionnalités avant de passer en production

---

## PHASE 11 — Mise en Production (branche `staging` → `main`)

📖 **Runbook Complet**: [PHASE_11_PRODUCTION.md](./PHASE_11_PRODUCTION.md) (1,200+ lignes)  
⚠️ **CRITICAL**: Ne pas commencer sans Phase 10 validée à 100%  

**Documents Additionnels**:
- [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md) — Versionning & traçabilité migrations
- [PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md) — Escalade & procédures urgence (généré depuis PHASE_11_PRODUCTION.md)

### Checklist Mise en Production
- [ ] Appliquer toutes les migrations validées sur la branche `main`
- [ ] Appliquer le seed de production sur `main` (admin + 3 caisses initiales)
- [ ] Basculer les variables d'environnement de l'application vers les URLs de la branche `main`
- [ ] Utiliser exclusivement `DATABASE_URL_POOLED` pour les connexions applicatives en production
- [ ] Vérifier le fonctionnement en production avec un test de bout en bout
- [ ] Activer le **Point-in-Time Recovery** Neon (disponible sur tous les plans, jusqu'à 30 jours sur Scale)
- [ ] Vérifier que les backups automatiques Neon sont actifs (gérés nativement par Neon, aucune configuration manuelle requise)
- [ ] Configurer les alertes de consommation dans le dashboard Neon pour éviter les surprises de facturation
- [ ] Définir les limites d'autoscaling (CU min / CU max) selon le trafic attendu
- [ ] Documenter les procédures de restauration via Point-in-Time Recovery en cas d'incident
- [ ] Effectuer un audit final de sécurité (mots de passe hashés, chiffrement, RBAC, tokens JWT)
- [ ] Livrer la base en production ✅

---

## Récapitulatif des Phases

| Phase | Intitulé | Branche Neon | Prérequis |
|---|---|---|---|
| 1 | Configuration Neon + Branches | — | Aucun |
| 2 | Création des Enums | `dev` | Phase 1 |
| 3 | Création des Tables | `dev` | Phase 2 |
| 4 | Création des Index | `dev` | Phase 3 |
| 5 | Seed initial | `dev` | Phase 4 |
| 6 | Sécurité & Contraintes | `dev` | Phase 5 |
| 7 | Logique Métier Critique | `dev` | Phase 6 |
| 8 | Journalisation ActionLogs | `dev` | Phase 7 |
| 9 | Tests & Validation | `dev` | Phase 8 |
| 10 | Promotion vers Staging | `staging` | Phase 9 |
| 11 | Mise en Production | `main` | Phase 10 |

---

## � Ressources Implémentées (Phases 6-11)

### Code Applicatif (1,850 lignes)
| Fichier | Lignes | Description |
|---------|--------|---|
| `lib/security.ts` | 350+ | Hashing, encryption, JWT, RBAC, validations |
| `lib/db/businessLogic.ts` | 400+ | Clients, transactions, cotisations, transferts |
| `lib/db/actionLog.ts` | 450+ | 23 types d'actions, audit trail |
| `lib/middleware/auth.ts` | 150+ | Middlewares Express (auth, roles, permissions, zones, errors) |
| `backend-express-complete.ts` | 500+ | 13 routes API REST complètes |
| `tsconfig.backend.json` | — | Configuration TypeScript strict |

### Documentation & Guides (3,000+ lignes)
| Document | Contenu |
|----------|---------|
| `READ_ME_FIRST.md` | Point d'entrée avec quick start 5 min |
| `RECAP_PHASES_6_7_8.md` | Référence technique complète PHASE 6-8 |
| `BACKEND_SETUP.md` | Guide installation & dépannage |
| `DEPLOYMENT_GUIDE.md` | Déploiement + roadmap PHASE 9-11 |
| `INDEX_PHASE_6_7_8.md` | Carte de navigation |
| `PHASE_9_TESTS.ts` | 600+ lignes, 35+ tests Jest/Supertest |
| `PHASE_10_STAGING.md` | 700+ lignes, recette staging + performance |
| `PHASE_11_PRODUCTION.md` | 1,200+ lignes, runbook production |
| `MIGRATION_CHECKLIST.md` | Versionning & traçabilité migrations |

### Tests & Validation (1,000+ lignes)
| Fichier | Tests |
|---------|-------|
| `VALIDATION_TESTS.ts` | 35+ tests automatisés (passwords, encryption, JWT, RBAC, validation codes) |
| `USAGE_EXAMPLES.ts` | 4 workflows exécutables (Security, Business Logic, Logging, Integration) |
| `PHASE_9_TESTS.ts` | 3 sections: contraintes BD + parcours métier + performance |

### Configuration & Déploiement
| Fichier | Utilité |
|---------|---------|
| `.env.backend` | Variables d'environnement (JWT_SECRET, ENCRYPTION_KEY, DATABASE_URL_POOLED) |
| `.env.staging` | Configuration staging |
| `.env.production` | Configuration production (secrets via vault) |
| `ecosystem.config.js` | PM2 cluster mode configuration |
| `nginx-prod.conf` | Reverse proxy + SSL + rate limiting |

---

## 🚀 Quick Start PHASES 9-11

### PHASE 9 — Tests (Dev Environment)
```bash
# 1. Installer dépendances test
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# 2. Configurer jest
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/_TESTS.ts']
};
EOF

# 3. Lancer tests
npx jest PHASE_9_TESTS.ts --verbose

# Résultat attendu: ✅ 35+ tests passed
```

### PHASE 10 — Staging (Recette Complète)
```bash
# Suivre [PHASE_10_STAGING.md](./PHASE_10_STAGING.md)

# Steps clés:
# 1. Copier snapshot de dev
# 2. Appliquer migrations
# 3. Exécuter seed staging
# 4. Tester 5 parcours métier
# 5. Load test (100 users)
# 6. Sign-off QA

# Durée: 3-5 jours
# Output: Branche staging 100% validée
```

### PHASE 11 — Production (Go-Live)
```bash
# Suivre [PHASE_11_PRODUCTION.md](./PHASE_11_PRODUCTION.md)

# Steps critiques:
# 1. T-24h: Freeze & snapshot
# 2. T-2h: Migrations en prod
# 3. T-1h: Deploy via PM2
# 4. T-30m: Smoke tests
# 5. T-0: GO/NO-GO vote
# 6. T+0h: LIVE avec monitoring 24/7
# 7. T+72h: Stabilization check

# Équipe: 2 DevOps + 1 SRE + Product Owner
# Risk: 🔴 CRITIQUE — Rollback < 5 min obligation
```

---

## �💡 Spécificités Neon à retenir

- **Pas d'installation PostgreSQL** : tout est géré par Neon, aucun serveur à provisionner
- **Branching instantané** : chaque branche est isolée, créée en moins d'une seconde sans copie de données (Copy-on-Write)
- **Connection Pooling** : toujours utiliser `DATABASE_URL_POOLED` en production pour éviter l'épuisement des connexions
- **Scale-to-Zero** : la base se met en veille automatiquement en cas d'inactivité — prévoir un léger délai de réveil (~500ms) sur le plan gratuit
- **Backups automatiques** : gérés nativement par Neon, pas besoin de configurer des cron jobs
- **SQL Editor intégré** : disponible directement dans le dashboard Neon pour inspecter et tester les requêtes à chaque phase
- **Point-in-Time Recovery** : permet de restaurer la base à n'importe quel moment passé en cas d'incident

---

*WAOOO FELICITATIONS — Plan d'action Neon v2.0 — Mai 2026*
