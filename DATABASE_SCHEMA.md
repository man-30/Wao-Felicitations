# Schéma de Base de Données - WAOOO FELICITATIONS
**Version corrigée — Mai 2026**

## 📋 Vue d'ensemble

Ce document définit la structure complète et corrigée de la base de données pour le système de gestion financière WAOOO FELICITATIONS. Les tables sont organisées par domaines logiques avec leurs relations, contraintes et enums. Toutes les incohérences identifiées lors de l'audit ont été corrigées.

---

## 🔑 Énumérations et Types

### UserRole
```
'admin' | 'caissier' | 'commercial'
```

### ClientType
```
'apprenant' | 'non-apprenant'
```
> ✏️ *Correction : Suppression du type `'simple'` non documenté et sans usage dans le système.*

### AccountType
```
'epargne' | 'financement'
```

### AccountStatus
```
'actif' | 'solde' | 'ferme'
```

### TransactionType
```
'depot' | 'retrait' | 'cotisation' | 'paiement' | 'transfert' | 'frais'
```
> ✏️ *Ajout : `'transfert'` pour les transferts compte financement → compte épargne. `'frais'` pour les frais d'adhésion, dossier et assurance à la création.*

### TransactionStatus
```
'en_attente' | 'approuve' | 'rejete'
```

### DocumentStatus
```
'fourni' | 'manquant' | 'en_attente'
```

### CotisationAccountStatus
```
'actif' | 'solde' | 'suspendu'
```
> ✏️ *Renommage de `TontineStatus` en `CotisationAccountStatus` pour couvrir aussi les Non-Apprenants.*

### FinancementStatus
```
'en_attente_apport' | 'actif' | 'solde'
```

### DureeFinancement
```
'4_mois' | '6_mois' | '8_mois' | '10_mois'
```

### CotisationAllocation
```
'remboursement' | 'benefice_societe'
```

### EmployeePaymentStatus
```
'en_attente' | 'traite'
```
> ✏️ *Ajout : nécessaire pour le workflow admin → caissier (positionnement et traitement des paiements employés).*

### CaisseType
```
'generale' | 'produits_charges' | 'assurance'
```
> ✏️ *Ajout : pour modéliser les trois caisses distinctes du système.*

---

## 📊 Tables Principales

---

### 1. **Users** (Utilisateurs du Système)
Gère tous les utilisateurs (admin, caissiers, commerciaux) avec authentification et droits d'accès.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| name | String | NOT NULL | Nom complet |
| role | Enum(UserRole) | NOT NULL | Admin, Caissier ou Commercial |
| email | String | UNIQUE, NOT NULL | Adresse email |
| password | String | NOT NULL | Hash du mot de passe (bcrypt/Argon2) |
| zone | String | NULLABLE | Zone géographique assignée |
| phone | String | NULLABLE | Contact téléphonique |
| isActive | Boolean | DEFAULT: true | Statut actif/inactif |
| updatedAt | DateTime | NULLABLE | Date dernière modification |
| createdAt | DateTime | NOT NULL | Date de création |

> ✏️ *Ajout : `phone`, `updatedAt`.*

**Indexes** : email, role, zone
**Relations** : ← ActionLogs, ← Transactions, ← Cotisations, ← EmployeePayments

---

### 2. **Clients** (Clients Base)
Table centrale regroupant tous les clients avec leurs informations de base.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| name | String | NOT NULL | Nom complet du client |
| sex | Enum | NOT NULL | 'M' ou 'F' |
| membershipCode | String | UNIQUE, NOT NULL | Code adhésion format XXXXWFyyy |
| accountNumber | String | UNIQUE, NOT NULL | Numéro de compte unique |
| type | Enum(ClientType) | NOT NULL | apprenant, non-apprenant |
| phone | String | NOT NULL | Contact téléphonique |
| address | String | NULLABLE | Adresse |
| fonction | String | NULLABLE | Fonction / Profession |
| assignedCommercialId | UUID | FK → Users | Commercial responsable |
| createdBy | UUID | FK → Users | Caissier créateur |
| updatedAt | DateTime | NULLABLE | Date dernière modification |
| createdAt | DateTime | NOT NULL | Date d'adhésion |

> ✏️ *Ajout : `sex`, `fonction`, `createdBy`, `updatedAt`. Suppression : `savingsBalance` et `financingBalance` (redondants avec `Accounts.balance` — source de vérité unique déplacée sur `Accounts`). Suppression du type `'simple'` dans ClientType.*

**Indexes** : membershipCode, accountNumber, assignedCommercialId, type
**Relations** :
- → Users (assignedCommercialId, createdBy)
- ← Apprenants (1:1 si type='apprenant')
- ← NonApprenants (1:1 si type='non-apprenant')
- ← Accounts (1:n)
- ← Transactions (1:n)
- ← InsuranceTransactions (1:n)

---

### 3. **Apprenants** (Informations Spécifiques aux Élèves)
Détails des clients de type "apprenant" avec infos tuteur, caution et documents.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| clientId | UUID | FK → Clients, UNIQUE | Lien au client (1:1) |
| studentName | String | NOT NULL | Nom de l'élève |
| studentBirthDate | Date | NULLABLE | Date de naissance |
| schoolName | String | NOT NULL | Nom de l'établissement |
| schoolLevel | String | NOT NULL | Niveau (3ème, Seconde, Terminale, etc.) |
| schoolYear | String | NOT NULL | Année scolaire (ex : 2025-2026) |
| guardianId | UUID | FK → Guardians | Tuteur/Parent |
| cautionId | UUID | FK → Cautions | Caution |
| documents | JSON | NOT NULL | Array de {key, label, status: DocumentStatus} |
| createdBy | UUID | FK → Users | Caissier créateur |
| updatedAt | DateTime | NULLABLE | Date dernière modification |
| createdAt | DateTime | NOT NULL | Date d'enrôlement |

**Documents standards** :
- `acte_naissance` : Acte de naissance (copie)
- `photos` : 2 photos passeport de l'élève
- `piece_parent` : Pièce d'identité parent/tuteur
- `piece_caution` : Pièce d'identité caution

**Indexes** : clientId, schoolName
**Relations** :
- → Clients (1:1)
- → Guardians (n:1)
- → Cautions (n:1)
- → Users (createdBy)
- ← CotisationAccounts (1:n)

---

### 4. **Guardians** (Tuteurs / Parents)
Informations des tuteurs ou parents des apprenants.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| fullName | String | NOT NULL | Nom complet du tuteur |
| phone | String | NOT NULL | Téléphone |
| relationship | String | NOT NULL | Lien de parenté (Père, Mère, Oncle, etc.) |
| idNumber | String | NULLABLE | N° pièce d'identité (chiffré au repos) |
| createdAt | DateTime | NOT NULL | Date de création |

**Indexes** : phone
**Relations** : ← Apprenants (n:1)

---

### 5. **Cautions**
Informations des cautions pour les apprenants.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| fullName | String | NOT NULL | Nom complet |
| phone | String | NOT NULL | Téléphone |
| idNumber | String | NULLABLE | N° pièce d'identité (chiffré au repos) |
| profession | String | NULLABLE | Profession |
| createdAt | DateTime | NOT NULL | Date de création |

**Indexes** : phone
**Relations** : ← Apprenants (n:1)

---

### 6. **NonApprenants** (Informations Non-Apprenants)
Détails des clients finançant des biens.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| clientId | UUID | FK → Clients, UNIQUE | Lien au client (1:1) |
| fullName | String | NOT NULL | Nom complet |
| phone | String | NOT NULL | Téléphone |
| idNumber | String | NULLABLE | N° pièce d'identité (chiffré au repos) |
| documents | JSON | NOT NULL | {pieceIdentite: bool, photos: bool} |
| adhesionPaid | Decimal | DEFAULT: 0 | Montant frais adhésion versé |
| createdBy | UUID | FK → Users | Caissier créateur |
| updatedAt | DateTime | NULLABLE | Date dernière modification |
| createdAt | DateTime | NOT NULL | Date création |

> ✏️ *Correction : `adhesionPaid` passe de `Boolean` à `Decimal` pour cohérence avec `Apprenants.adhesionPaid`. Ajout de `updatedAt`.*

**Indexes** : clientId, idNumber
**Relations** :
- → Clients (1:1)
- → Users (createdBy)
- ← FinancementNonApprenants (1:n)
- ← CotisationAccounts (1:n)

---

### 7. **CotisationAccounts** (Comptes de Cotisation — Apprenants & Non-Apprenants)
Comptes de suivi des cotisations journalières, applicables aux apprenants (financement scolaire) ET aux non-apprenants ayant un financement actif.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| clientId | UUID | FK → Clients | Client propriétaire |
| apprenantId | UUID | FK → Apprenants, NULLABLE | Renseigné si client apprenant |
| nonApprenantId | UUID | FK → NonApprenants, NULLABLE | Renseigné si client non-apprenant |
| numero | String | UNIQUE | N° de compte cotisation |
| schoolName | String | NULLABLE | École (apprenants uniquement) |
| schoolLevel | String | NULLABLE | Niveau scolaire (apprenants uniquement) |
| schoolYear | String | NULLABLE | Année scolaire (apprenants uniquement) |
| bienFinance | String | NULLABLE | Description du bien (non-apprenants uniquement) |
| fraisScolarite | Decimal | NULLABLE | Frais de scolarité (apprenants uniquement) |
| grilleNumero | Integer | NULLABLE | N° de ligne de grille tarifaire (1-13) |
| fraisDossier | Decimal | NOT NULL | Frais de dossier |
| fraisAssurance | Decimal | DEFAULT: 0 | Frais assurance (apprenants uniquement, sinon 0) |
| fraisPrestation | Decimal | NOT NULL | Frais prestation |
| cotisationJournaliere | Decimal | NOT NULL | Montant cotisation/jour |
| totalCapital | Decimal | NOT NULL | Capital total à rembourser |
| totalCotise | Decimal | DEFAULT: 0 | Montant total cotisé à ce jour |
| totalBeneficeCases | Decimal | DEFAULT: 0 | Total des cases bénéfice société |
| totalJours | Integer | NOT NULL | Nombre de jours théoriques total |
| status | Enum(CotisationAccountStatus) | NOT NULL | actif, solde, suspendu |
| adhesionPaid | Decimal | DEFAULT: 0 | Frais adhésion versés |
| createdAt | DateTime | NOT NULL | Date création |
| updatedAt | DateTime | NULLABLE | Date dernière modification |

**Contrainte** : `apprenantId` OU `nonApprenantId` doit être renseigné, pas les deux simultanément (CHECK constraint).

**Calculs** :
- `totalCapital` = capital financé + fraisDossier + fraisAssurance
- `totalARembourser` = totalCapital + fraisPrestation
- `totalJours` = casesRemboursement + casesBenefice
- `progression` = (totalCotise / totalCapital) × 100

> ✏️ *Renommage et refonte complète de `TontineAccounts` : la table couvre désormais Apprenants ET Non-Apprenants conformément à la Directive 17.8. Les champs spécifiques à chaque profil sont NULLABLE selon le type de client.*

**Indexes** : clientId, apprenantId, nonApprenantId, grilleNumero, status
**Relations** :
- → Clients (n:1)
- → Apprenants (n:1, nullable)
- → NonApprenants (n:1, nullable)
- ← Cotisations (1:n)
- ← Accounts (n:1)

---

### 8. **Cotisations** (Historique des Cotisations Journalières)
Enregistrement journalier des paiements de cotisations.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| cotisationAccountId | UUID | FK → CotisationAccounts | Compte de cotisation |
| amount | Decimal | NOT NULL | Montant de la cotisation |
| date | Date | NOT NULL | Date du paiement |
| cycleMonth | Integer | NOT NULL | Mois du cycle (1-n) |
| cycleDay | Integer | NOT NULL | Jour du cycle (1-31) |
| joursCouverts | Integer | DEFAULT: 1 | Nombre de jours couverts (dépôt anticipé) |
| periodeCoverte | String | NULLABLE | Période couverte ex: "01/05 au 03/05" (si dépôt anticipé) |
| allocation | Enum(CotisationAllocation) | NOT NULL | remboursement ou benefice_societe |
| status | Enum | NOT NULL | 'cotise' ou 'manque' |
| recordedBy | UUID | FK → Users | Caissier enregistreur |
| notes | String | NULLABLE | Commentaires |
| createdAt | DateTime | NOT NULL | Date enregistrement |

**Règle d'allocation automatique** :
- Si `cycleDay = 1` → `benefice_societe` (case jaune)
- Sinon → `remboursement` (case verte si cotisé, rouge si manquée)

**Règle dépôt anticipé** :
- Si `joursCouverts > 1` → créer autant d'entrées consécutives que de jours couverts à partir du premier jour non coché

> ✏️ *Correction : `cycleMonth` et `cycleDay` passent de NULLABLE à NOT NULL (valeurs toujours requises). Ajout : `joursCouverts`, `periodeCoverte` pour les dépôts anticipés (Directive 19.9). Ajout : `status` pour distinguer case cotisée (verte) de case manquée (rouge). Renommage : `tontineAccountId` → `cotisationAccountId`.*

**Indexes** : cotisationAccountId, date, allocation, status
**Relations** :
- → CotisationAccounts (n:1)
- → Users (recordedBy)

---

### 9. **FinancementNonApprenants** (Dossiers Financement de Biens)
Dossiers individuels de financement de biens pour les non-apprenants.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| nonApprenantId | UUID | FK → NonApprenants | Client non-apprenant |
| bienFinance | String | NOT NULL | Description du bien (ex : "Moto", "Frigo") |
| valeurBien | Decimal | NOT NULL | Valeur marchande du bien |
| apportPersonnel | Decimal | NOT NULL | Apport libre du client |
| apportPourcentage | Decimal | NOT NULL | % apport calculé automatiquement (apport/valeur × 100) |
| montantFinance | Decimal | NOT NULL | valeurBien − apportPersonnel |
| dureeChoisie | Enum(DureeFinancement) | NOT NULL | 4_mois, 6_mois, 8_mois, 10_mois |
| grilleNumero | Integer | NOT NULL | N° grille tarifaire (1-13) |
| fraisDossier | Decimal | NOT NULL | Frais de dossier |
| fraisPrestation | Decimal | NOT NULL | Frais de prestation |
| cotisationJournaliere | Decimal | NOT NULL | Cotisation journalière |
| totalARembourser | Decimal | NOT NULL | montantFinance + fraisPrestation |
| totalCotise | Decimal | DEFAULT: 0 | Montant total cotisé à ce jour |
| totalBeneficeCases | Decimal | DEFAULT: 0 | Total des cases bénéfice société |
| totalCases | Integer | NOT NULL | Nombre total de cases carnet |
| status | Enum(FinancementStatus) | NOT NULL | en_attente_apport, actif, solde |
| createdAt | DateTime | NOT NULL | Date création dossier |
| updatedAt | DateTime | NULLABLE | Date dernière modification |

> ✏️ *Correction : `apportPourcentage` passe de NULLABLE à NOT NULL (toujours calculé automatiquement). Ajout de `updatedAt`.*

**Indexes** : nonApprenantId, dureeChoisie, status
**Relations** :
- → NonApprenants (n:1)
- ← Accounts (1:1)

---

### 10. **Accounts** (Comptes Financiers)
Comptes d'épargne et de financement des clients. Source de vérité unique pour les soldes.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| clientId | UUID | FK → Clients | Client propriétaire |
| type | Enum(AccountType) | NOT NULL | epargne ou financement |
| balance | Decimal | DEFAULT: 0 | Solde actuel (source de vérité unique) |
| linkedAccountId | UUID | FK → Accounts, NULLABLE | Compte lié (épargne ↔ financement) |
| accountNumber | String | UNIQUE, NULLABLE | Numéro de compte spécifique |
| label | String | NULLABLE | Libellé (ex : "Compte Épargne Principal") |
| status | Enum(AccountStatus) | NOT NULL | actif, solde, ferme |
| createdBy | UUID | FK → Users | Caissier créateur |
| createdByName | String | NOT NULL | Nom caissier (snapshot) |
| notes | String | NULLABLE | Notes internes |
| updatedAt | DateTime | NULLABLE | Date dernière modification |
| createdAt | DateTime | NOT NULL | Date création |

> ✏️ *Refactorisation : suppression de toutes les colonnes financement-spécifiques (`principalAmount`, `dossierFee`, `insuranceFee`, `prestationFee`, `dailyContribution`, `totalDue`, `totalPaid`, `residualBalance`) qui étaient toutes NULLABLE et créaient de l'ambiguïté. Ces données sont désormais portées par `CotisationAccounts` et `FinancementNonApprenants`. `Accounts` ne gère que le solde financier courant. Suppression de la duplication de solde : `Clients.savingsBalance` et `Clients.financingBalance` ont été retirés de la table `Clients`, `Accounts.balance` est la seule source de vérité.*

**Indexes** : clientId, type, status
**Relations** :
- → Clients (n:1)
- → Users (createdBy)
- ← Transactions (1:n)
- ← InsuranceTransactions (1:n)

---

### 11. **Transactions** (Mouvements Financiers)
Enregistrement de tous les mouvements financiers (dépôts, retraits, cotisations, paiements, transferts, frais).

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| clientId | UUID | FK → Clients | Client concerné |
| clientName | String | NOT NULL | Nom client (snapshot) |
| accountId | UUID | FK → Accounts, NULLABLE | Compte source |
| destinationAccountId | UUID | FK → Accounts, NULLABLE | Compte destination (transferts uniquement) |
| type | Enum(TransactionType) | NOT NULL | depot, retrait, cotisation, paiement, transfert, frais |
| amount | Decimal | NOT NULL | Montant |
| date | Date | NOT NULL | Date transaction |
| collectedBy | UUID | FK → Users | Commercial/Caissier collecteur |
| collectedByName | String | NOT NULL | Nom (snapshot) |
| validatedBy | UUID | FK → Users, NULLABLE | Caissier validateur |
| validatedByName | String | NULLABLE | Nom (snapshot) |
| status | Enum(TransactionStatus) | NOT NULL | en_attente, approuve, rejete |
| receiptNumber | String | UNIQUE, NULLABLE | N° reçu |
| receiptImageUrl | String | NULLABLE | URL image du reçu (PNG/JPEG partageable) |
| description | String | NULLABLE | Commentaires / motif |
| createdAt | DateTime | NOT NULL | Date enregistrement |

> ✏️ *Ajout : `destinationAccountId` pour les transferts compte financement → compte épargne (Directive 19.4). Ajout : `receiptImageUrl` pour le partage du reçu en image (Directive 19.7). Type étendu avec `'transfert'` et `'frais'`.*

**Indexes** : clientId, date, status, type, collectedBy, validatedBy
**Relations** :
- → Clients (n:1)
- → Accounts (accountId, destinationAccountId)
- → Users (collectedBy, validatedBy)
- ← ActionLogs (n:1)

---

### 12. **InsuranceTransactions** (Caisse d'Assurance)
Tracking de tous les mouvements de la caisse d'assurance (crédits à la création d'un apprenant, débits sur retrait admin).

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| amount | Decimal | NOT NULL | Montant |
| type | Enum | NOT NULL | 'credit' ou 'debit' |
| description | String | NOT NULL | Libellé de l'opération |
| clientId | UUID | FK → Clients, NULLABLE | Client source (si crédit à la création) |
| clientName | String | NULLABLE | Nom client (snapshot) |
| date | Date | NOT NULL | Date transaction |
| operatedBy | UUID | FK → Users | Utilisateur opérateur |
| operatedByName | String | NOT NULL | Nom (snapshot) |
| motifRetrait | String | NULLABLE | Motif obligatoire si type = 'debit' |
| createdAt | DateTime | NOT NULL | Date enregistrement |

> ✏️ *Ajout : `motifRetrait` obligatoire pour les débits (Directive 19.6). Suppression du champ `accountId` : la caisse d'assurance est une caisse indépendante, non liée à un `Account` client.*

**Indexes** : date, clientId, operatedBy, type
**Relations** :
- → Clients (n:1, nullable)
- → Users (operatedBy)

---

### 13. **CashRegisters** (Caisses)
Modélise les trois caisses distinctes du système avec leur solde en temps réel.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| name | String | NOT NULL, UNIQUE | Nom de la caisse |
| type | Enum(CaisseType) | NOT NULL | generale, produits_charges, assurance |
| balance | Decimal | DEFAULT: 0 | Solde actuel |
| description | String | NULLABLE | Description de la caisse |
| updatedAt | DateTime | NULLABLE | Date dernière mise à jour |
| createdAt | DateTime | NOT NULL | Date création |

**Valeurs initiales** :
1. `"Caisse Générale"` — type: `generale`
2. `"Caisse Produits & Charges"` — type: `produits_charges`
3. `"Caisse Assurance"` — type: `assurance`

> ✏️ *Nouvelle table : les caisses n'étaient pas modélisées en base. Désormais chaque caisse a un enregistrement avec son solde persisté.*

**Indexes** : type
**Relations** : aucune FK directe — les transactions alimentent les caisses via des triggers ou la logique applicative.

---

### 14. **Expenses** (Charges Opérationnelles)
Enregistrement des dépenses de l'institution.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| category | Enum(ExpenseCategory) | NOT NULL | Catégorie de charge |
| amount | Decimal | NOT NULL | Montant dépensé |
| description | String | NULLABLE | Détails |
| date | Date | NOT NULL | Date de la dépense |
| recordedBy | UUID | FK → Users | Caissier enregistreur |
| recordedByName | String | NOT NULL | Nom (snapshot) |
| createdAt | DateTime | NOT NULL | Date enregistrement |

**Enum ExpenseCategory** :
```
'carburant_lubrifiant' | 'fournitures_bureau' | 'fournitures_informatiques' |
'fournitures_entretien' | 'eau' | 'electricite' | 'loyer' |
'entretien_reparation' | 'formation_personnel' | 'personnel_exterieur' |
'publicite' | 'communication' | 'impots_taxes' | 'charges_sociales' |
'agios' | 'salaire' | 'primes' | 'autres_charges'
```

> ✏️ *Correction : `category` passe de `String` libre à `Enum(ExpenseCategory)` avec les 18 catégories exactes définies en Directive 6.*

**Indexes** : date, category, recordedBy
**Relations** : → Users (recordedBy)

---

### 15. **ProductRevenues** (Produits — Revenus Opérationnels)
Enregistrement des revenus générés par les produits et services de l'institution.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| category | Enum(ProductCategory) | NOT NULL | Catégorie de produit |
| amount | Decimal | NOT NULL | Montant encaissé |
| description | String | NULLABLE | Détails / commentaires |
| date | Date | NOT NULL | Date de l'opération |
| recordedBy | UUID | FK → Users | Opérateur enregistreur |
| recordedByName | String | NOT NULL | Nom (snapshot) |
| createdAt | DateTime | NOT NULL | Date enregistrement |

**Enum ProductCategory** :
```
'vente_livret_individuel' | 'deplacement' | 'vente_livret_tontine' |
'duplicata' | 'vente_fournitures_scolaires' | 'vente_autres_biens' |
'frais_dossiers' | 'frais_livraison' | 'profits_exceptionnels' | 'autres_produits'
```

> ✏️ *Nouvelle table : remplace la table `Produits` qui était un catalogue de produits financiers sans rapport avec l'enregistrement comptable des revenus. `ProductRevenues` couvre les 10 catégories de la Directive 6.*

**Indexes** : date, category, recordedBy
**Relations** : → Users (recordedBy)

---

### 16. **AdminCodeRequests** (Demandes de Codes Admin)
Suivi des demandes et validations de codes d'édition par l'administrateur.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| userId | UUID | FK → Users | Utilisateur demandeur |
| code | String | NOT NULL | Code généré |
| purpose | String | NOT NULL | Motif de la demande |
| status | Enum | NOT NULL | 'pending', 'approved', 'rejected' |
| requestedAt | DateTime | NOT NULL | Date demande |
| approvedBy | UUID | FK → Users, NULLABLE | Admin approbateur |
| approvedAt | DateTime | NULLABLE | Date approbation |
| expiresAt | DateTime | NULLABLE | Date d'expiration du code |

> ✏️ *Ajout : `expiresAt` — un code sans expiration constitue une faille de sécurité.*

**Indexes** : userId, status, approvedBy
**Relations** : → Users (userId, approvedBy)

---

### 17. **EmployeePayments** (Paiements Employés)
Tracking complet du workflow de paiement des employés : positionnement par l'admin → traitement par le caissier.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| userId | UUID | FK → Users | Employé bénéficiaire |
| amount | Decimal | NOT NULL | Montant à verser |
| motif | String | NULLABLE | Motif / commentaire |
| period | String | NOT NULL | Période concernée (ex : 2026-05) |
| status | Enum(EmployeePaymentStatus) | NOT NULL | en_attente, traite |
| positionedBy | UUID | FK → Users | Admin ayant positionné le paiement |
| positionedByName | String | NOT NULL | Nom admin (snapshot) |
| positionedAt | DateTime | NOT NULL | Date de positionnement |
| paidBy | UUID | FK → Users, NULLABLE | Caissier ayant effectué le paiement |
| paidByName | String | NULLABLE | Nom caissier (snapshot) |
| paidAt | DateTime | NULLABLE | Date de traitement effectif |
| notes | String | NULLABLE | Notes internes |
| createdAt | DateTime | NOT NULL | Date enregistrement |

> ✏️ *Refonte complète : ajout de `status`, `positionedBy`, `positionedByName`, `positionedAt`, `paidAt` pour modéliser le workflow admin → caissier (Directive 2 & 3). `date` remplacé par `positionedAt` et `paidAt` plus précis.*

**Indexes** : userId, period, status, positionedBy
**Relations** : → Users (userId, positionedBy, paidBy)

---

### 18. **ActionLogs** (Audit Trail)
Enregistrement détaillé et immuable de toutes les actions critiques du système.

| Colonne | Type | Contrainte | Description |
|---------|------|-----------|-------------|
| id | UUID | PK | Identifiant unique |
| userId | UUID | FK → Users | Utilisateur auteur |
| userName | String | NOT NULL | Nom (snapshot) |
| userRole | Enum(UserRole) | NOT NULL | Rôle (snapshot) |
| action | String | NOT NULL | Type d'action |
| details | String | NOT NULL | Détails de l'action |
| transactionId | UUID | FK → Transactions, NULLABLE | Transaction liée |
| timestamp | DateTime | NOT NULL | Horodatage précis |

**Actions standards** :
- Connexion / Déconnexion
- Création Client (Apprenant / Non-Apprenant)
- Modification Client
- Enregistrement Cotisation
- Dépôt / Retrait
- Transfert Compte Financement → Épargne
- Paiement Frais (Adhésion / Dossier / Assurance)
- Positionnement Paiement Employé
- Traitement Paiement Employé
- Création Utilisateur
- Modification Utilisateur
- Activation / Désactivation Utilisateur
- Validation Transaction
- Retrait Caisse Assurance
- Export PDF Dashboard

**Indexes** : userId, userRole, timestamp, action
**Relations** :
- → Users (userId)
- → Transactions (transactionId)

---

## 🔗 Diagramme des Relations

```
Users (1) ──── (n) Clients [assignedCommercialId]
Users (1) ──── (n) Clients [createdBy]
Users (1) ──── (n) Apprenants [createdBy]
Users (1) ──── (n) NonApprenants [createdBy]
Users (1) ──── (n) Cotisations [recordedBy]
Users (1) ──── (n) Transactions [collectedBy / validatedBy]
Users (1) ──── (n) Expenses [recordedBy]
Users (1) ──── (n) ProductRevenues [recordedBy]
Users (1) ──── (n) ActionLogs
Users (1) ──── (n) EmployeePayments [positionedBy / paidBy]
Users (1) ──── (n) Accounts [createdBy]
Users (1) ──── (n) InsuranceTransactions [operatedBy]

Clients (1) ──── (1) Apprenants       [type='apprenant']
Clients (1) ──── (1) NonApprenants    [type='non-apprenant']
Clients (1) ──── (n) Accounts
Clients (1) ──── (n) Transactions
Clients (1) ──── (n) InsuranceTransactions
Clients (1) ──── (n) CotisationAccounts

Apprenants (n) ──── (1) Guardians
Apprenants (n) ──── (1) Cautions
Apprenants (1) ──── (n) CotisationAccounts

NonApprenants (1) ──── (n) FinancementNonApprenants
NonApprenants (1) ──── (n) CotisationAccounts

CotisationAccounts (1) ──── (n) Cotisations
CotisationAccounts (n) ──── (1) Accounts [compte financement lié]

FinancementNonApprenants (1) ──── (1) Accounts

Accounts (1) ──── (n) Transactions
Accounts (1) ──── (n) InsuranceTransactions
Accounts (1) ←──→ (1) Accounts [linkedAccountId : épargne ↔ financement]
```

---

## 🔍 Index Recommandés pour Performance

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_zone ON users(zone);

-- Clients
CREATE INDEX idx_clients_membership_code ON clients(membershipCode);
CREATE INDEX idx_clients_account_number ON clients(accountNumber);
CREATE INDEX idx_clients_type ON clients(type);
CREATE INDEX idx_clients_commercial ON clients(assignedCommercialId);

-- Apprenants
CREATE INDEX idx_apprenants_clientId ON apprenants(clientId);
CREATE INDEX idx_apprenants_school ON apprenants(schoolName);

-- NonApprenants
CREATE INDEX idx_non_apprenants_clientId ON nonApprenants(clientId);

-- CotisationAccounts
CREATE INDEX idx_cotisation_accounts_clientId ON cotisationAccounts(clientId);
CREATE INDEX idx_cotisation_accounts_apprenantId ON cotisationAccounts(apprenantId);
CREATE INDEX idx_cotisation_accounts_nonApprenantId ON cotisationAccounts(nonApprenantId);
CREATE INDEX idx_cotisation_accounts_status ON cotisationAccounts(status);
CREATE INDEX idx_cotisation_accounts_grille ON cotisationAccounts(grilleNumero);

-- Cotisations
CREATE INDEX idx_cotisations_account ON cotisations(cotisationAccountId);
CREATE INDEX idx_cotisations_date ON cotisations(date);
CREATE INDEX idx_cotisations_allocation ON cotisations(allocation);
CREATE INDEX idx_cotisations_status ON cotisations(status);

-- FinancementNonApprenants
CREATE INDEX idx_financement_non_apprenant ON financementNonApprenants(nonApprenantId);
CREATE INDEX idx_financement_status ON financementNonApprenants(status);

-- Accounts
CREATE INDEX idx_accounts_client ON accounts(clientId);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_status ON accounts(status);

-- Transactions
CREATE INDEX idx_transactions_client ON transactions(clientId);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_collected_by ON transactions(collectedBy);
CREATE INDEX idx_transactions_validated_by ON transactions(validatedBy);

-- InsuranceTransactions
CREATE INDEX idx_insurance_date ON insuranceTransactions(date);
CREATE INDEX idx_insurance_client ON insuranceTransactions(clientId);
CREATE INDEX idx_insurance_type ON insuranceTransactions(type);

-- CashRegisters
CREATE INDEX idx_cash_registers_type ON cashRegisters(type);

-- Expenses
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- ProductRevenues
CREATE INDEX idx_product_revenues_date ON productRevenues(date);
CREATE INDEX idx_product_revenues_category ON productRevenues(category);

-- EmployeePayments
CREATE INDEX idx_employee_payments_userId ON employeePayments(userId);
CREATE INDEX idx_employee_payments_status ON employeePayments(status);
CREATE INDEX idx_employee_payments_period ON employeePayments(period);
CREATE INDEX idx_employee_payments_positionedBy ON employeePayments(positionedBy);

-- ActionLogs
CREATE INDEX idx_logs_user ON actionLogs(userId);
CREATE INDEX idx_logs_timestamp ON actionLogs(timestamp);
CREATE INDEX idx_logs_action ON actionLogs(action);
```

---

## 📋 Exemples d'Interrogation (SQL)

### Soldes actuels d'un client
```sql
SELECT
  ac.id,
  ac.type,
  ac.balance,
  ac.status,
  ac.label
FROM accounts ac
WHERE ac.clientId = 'client_uuid'
ORDER BY ac.type;
```

### Progression d'un compte de cotisation (apprenant ou non-apprenant)
```sql
SELECT
  ca.numero,
  c.name AS clientName,
  ca.totalCapital,
  ca.totalCotise,
  ROUND((ca.totalCotise / ca.totalCapital) * 100) AS progression_pct,
  ca.status
FROM cotisationAccounts ca
JOIN clients c ON c.id = ca.clientId
WHERE ca.clientId = 'client_uuid';
```

### Historique des transactions d'un client
```sql
SELECT
  t.id,
  t.type,
  t.amount,
  t.date,
  t.collectedByName,
  t.validatedByName,
  t.status,
  t.receiptNumber
FROM transactions t
WHERE t.clientId = 'client_uuid'
ORDER BY t.date DESC
LIMIT 50;
```

### Jours manqués d'un client sur le mois en cours
```sql
SELECT
  co.cycleDay,
  co.date,
  co.amount,
  co.status
FROM cotisations co
JOIN cotisationAccounts ca ON ca.id = co.cotisationAccountId
WHERE ca.clientId = 'client_uuid'
  AND co.cycleMonth = [mois_courant]
  AND co.status = 'manque'
ORDER BY co.cycleDay ASC;
```

### Situation de la Caisse Produits & Charges
```sql
SELECT
  (SELECT COALESCE(SUM(amount), 0) FROM productRevenues
   WHERE date BETWEEN [debut_periode] AND [fin_periode]) AS total_produits,
  (SELECT COALESCE(SUM(amount), 0) FROM expenses
   WHERE date BETWEEN [debut_periode] AND [fin_periode]) AS total_charges,
  (
    (SELECT COALESCE(SUM(amount), 0) FROM productRevenues
     WHERE date BETWEEN [debut_periode] AND [fin_periode])
    -
    (SELECT COALESCE(SUM(amount), 0) FROM expenses
     WHERE date BETWEEN [debut_periode] AND [fin_periode])
  ) AS solde_net;
```

### Statistiques de la Caisse Assurance
```sql
SELECT
  DATE_TRUNC('month', it.date) AS mois,
  SUM(CASE WHEN it.type = 'credit' THEN it.amount ELSE 0 END) AS total_credits,
  SUM(CASE WHEN it.type = 'debit' THEN it.amount ELSE 0 END) AS total_debits,
  SUM(CASE WHEN it.type = 'credit' THEN it.amount ELSE -it.amount END) AS solde_net
FROM insuranceTransactions it
GROUP BY DATE_TRUNC('month', it.date)
ORDER BY mois DESC;
```

### Paiements employés en attente (pour le caissier)
```sql
SELECT
  ep.id,
  u.name AS employe,
  ep.amount,
  ep.motif,
  ep.period,
  ep.positionedByName,
  ep.positionedAt
FROM employeePayments ep
JOIN users u ON u.id = ep.userId
WHERE ep.status = 'en_attente'
ORDER BY ep.positionedAt ASC;
```

### Audit des opérations d'un caissier (7 derniers jours)
```sql
SELECT
  al.timestamp,
  al.action,
  al.details,
  al.transactionId
FROM actionLogs al
WHERE al.userId = 'caissier_uuid'
  AND al.timestamp >= NOW() - INTERVAL '7 days'
ORDER BY al.timestamp DESC;
```

---

## ⚙️ Considérations d'Implémentation

### Base de Données Recommandée
- **PostgreSQL** : recommandé pour les contraintes ACID, les relations complexes, les CHECK constraints et la gestion des enums natifs

### Sécurité
- Les mots de passe doivent être hashés avec **bcrypt** ou **Argon2** (jamais en clair)
- Les champs `idNumber` (`Guardians`, `Cautions`, `NonApprenants`) doivent être **chiffrés au repos**
- Authentification par **JWT tokens** avec gestion des sessions et expiration
- Accès basé sur les rôles **(RBAC)** : chaque route API vérifie le rôle avant exécution

### Synchronisation Temps Réel
- Implémenter **WebSockets** (ou polling court ≤ 5s) pour la synchronisation des paiements employés entre l'espace caissier et le dashboard admin (Directive 19.5)

### Intégrité des Données
- La contrainte CHECK sur `CotisationAccounts` : `apprenantId IS NOT NULL XOR nonApprenantId IS NOT NULL`
- Le solde des `Accounts` est la **seule source de vérité** pour les balances clients
- Toute opération financière doit générer une entrée dans `ActionLogs` et mettre à jour `CashRegisters`

### Backups
- Sauvegardes automatiques quotidiennes
- Rétention minimum : 30 jours

---

## 📊 Récapitulatif des Tables

| # | Table | Statut | Rôle |
|---|---|---|---|
| 1 | Users | ✅ Mis à jour | Personnel du système |
| 2 | Clients | ✅ Mis à jour | Base clients |
| 3 | Apprenants | ✅ Mis à jour | Profil apprenant |
| 4 | Guardians | ✅ Inchangé | Tuteurs |
| 5 | Cautions | ✅ Inchangé | Cautions |
| 6 | NonApprenants | ✅ Mis à jour | Profil non-apprenant |
| 7 | CotisationAccounts | ✅ Refonte | Comptes cotisation (apprenants + non-apprenants) |
| 8 | Cotisations | ✅ Mis à jour | Historique journalier des cotisations |
| 9 | FinancementNonApprenants | ✅ Mis à jour | Dossiers financement biens |
| 10 | Accounts | ✅ Refactorisé | Comptes épargne & financement |
| 11 | Transactions | ✅ Mis à jour | Tous les mouvements financiers |
| 12 | InsuranceTransactions | ✅ Mis à jour | Caisse assurance |
| 13 | CashRegisters | 🆕 Nouveau | Les 3 caisses du système |
| 14 | Expenses | ✅ Mis à jour | Charges opérationnelles |
| 15 | ProductRevenues | 🆕 Nouveau | Revenus opérationnels |
| 16 | AdminCodeRequests | ✅ Mis à jour | Codes d'édition admin |
| 17 | EmployeePayments | ✅ Refonte | Paiements employés (workflow admin→caissier) |
| 18 | ActionLogs | ✅ Mis à jour | Audit trail complet |

**Total : 18 tables — 2 nouvelles — 6 refactorisées — 10 mises à jour**

---

*WAOOO FELICITATIONS — Schéma Base de Données v2.0 — Mai 2026*
