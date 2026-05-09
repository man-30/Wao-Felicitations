-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'caissier', 'commercial');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('apprenant', 'non_apprenant', 'simple');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('epargne', 'financement');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('actif', 'solde', 'ferme');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('depot', 'retrait', 'cotisation', 'paiement', 'transfert', 'frais');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('en_attente', 'approuve', 'rejete');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('fourni', 'manquant', 'en_attente');

-- CreateEnum
CREATE TYPE "CotisationAccountStatus" AS ENUM ('actif', 'solde', 'suspendu');

-- CreateEnum
CREATE TYPE "FinancementStatus" AS ENUM ('en_attente_apport', 'actif', 'solde');

-- CreateEnum
CREATE TYPE "DureeFinancement" AS ENUM ('mois_4', 'mois_6', 'mois_8', 'mois_10');

-- CreateEnum
CREATE TYPE "CotisationAllocation" AS ENUM ('remboursement', 'benefice_societe');

-- CreateEnum
CREATE TYPE "EmployeePaymentStatus" AS ENUM ('en_attente', 'traite');

-- CreateEnum
CREATE TYPE "CaisseType" AS ENUM ('generale', 'produits_charges', 'assurance');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('carburant_lubrifiant', 'fournitures_bureau', 'fournitures_informatique', 'fournitures_entretien', 'eau', 'electricite', 'loyer', 'entretien_reparation', 'formation_personnel', 'personnel_exterieur', 'publicite', 'communication', 'impots_taxes', 'charges_sociales', 'agios', 'salaire', 'primes', 'autres_charges');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('vente_livret_individuel', 'deplacement', 'vente_livret_tontine', 'duplicata', 'vente_fourniture_scolaire', 'vente', 'frais_dossiers', 'frais_prestation', 'profits_exceptionnels', 'autres_produits');

-- CreateEnum
CREATE TYPE "AdminCodeStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "InsuranceTransactionType" AS ENUM ('credit', 'debit');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "zone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "membershipCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "type" "ClientType" NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "assignedCommercialId" TEXT NOT NULL,
    "savingsBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "financingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apprenant" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentBirthDate" TIMESTAMP(3),
    "schoolName" TEXT NOT NULL,
    "schoolLevel" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "cautionId" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Apprenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "idNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caution" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "idNumber" TEXT,
    "profession" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Caution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TontineAccount" (
    "id" TEXT NOT NULL,
    "apprenantId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "schoolLevel" TEXT NOT NULL,
    "fraisScolarite" DECIMAL(18,2) NOT NULL,
    "grilleNumero" INTEGER NOT NULL,
    "fraisDossier" DECIMAL(18,2) NOT NULL,
    "fraisAssurance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fraisPrestation" DECIMAL(18,2) NOT NULL,
    "cotisationJournaliere" DECIMAL(18,2) NOT NULL,
    "totalCapital" DECIMAL(18,2) NOT NULL,
    "totalCotise" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalBeneficeCases" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalJours" INTEGER NOT NULL,
    "status" "CotisationAccountStatus" NOT NULL DEFAULT 'actif',
    "adhesionPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "carnetPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TontineAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotisation" (
    "id" TEXT NOT NULL,
    "tontineAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cycleMonth" INTEGER,
    "cycleDay" INTEGER,
    "allocation" "CotisationAllocation",
    "recordedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cotisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonApprenant" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "adhesionPaid" BOOLEAN NOT NULL DEFAULT false,
    "carnetPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonApprenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancementNonApprenant" (
    "id" TEXT NOT NULL,
    "nonApprenantId" TEXT NOT NULL,
    "bienFinance" TEXT NOT NULL,
    "valeurBien" DECIMAL(18,2) NOT NULL,
    "apportPersonnel" DECIMAL(18,2) NOT NULL,
    "apportPourcentage" DECIMAL(5,2),
    "montantFinance" DECIMAL(18,2) NOT NULL,
    "dureeChoisie" "DureeFinancement" NOT NULL,
    "grilleNumero" INTEGER NOT NULL,
    "fraisDossier" DECIMAL(18,2) NOT NULL,
    "fraisPrestation" DECIMAL(18,2) NOT NULL,
    "cotisationJournaliere" DECIMAL(18,2) NOT NULL,
    "totalARembourser" DECIMAL(18,2) NOT NULL,
    "totalCotise" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalBeneficeCases" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCases" INTEGER NOT NULL,
    "status" "FinancementStatus" NOT NULL DEFAULT 'en_attente_apport',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancementNonApprenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "linkedAccountId" TEXT,
    "accountNumber" TEXT,
    "label" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'actif',
    "principalAmount" DECIMAL(18,2),
    "dossierFee" DECIMAL(18,2),
    "insuranceFee" DECIMAL(18,2),
    "prestationFee" DECIMAL(18,2),
    "dailyContribution" DECIMAL(18,2),
    "totalDue" DECIMAL(18,2),
    "totalPaid" DECIMAL(18,2),
    "residualBalance" DECIMAL(18,2),
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tontineAccountId" TEXT,
    "financingId" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "accountId" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "collectedBy" TEXT NOT NULL,
    "collectedByName" TEXT NOT NULL,
    "validatedBy" TEXT,
    "validatedByName" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'en_attente',
    "receiptNumber" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceTransaction" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "type" "InsuranceTransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT,
    "accountId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "operatedBy" TEXT NOT NULL,
    "operatedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolDebt" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "debtAmount" DECIMAL(18,2) NOT NULL,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolDebt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "recordedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProductCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashRegister" (
    "id" TEXT NOT NULL,
    "type" "CaisseType" NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lastMovement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRevenue" (
    "id" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "description" TEXT,
    "recordedBy" TEXT NOT NULL,
    "recordedByName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminCodeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "AdminCodeStatus" NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "AdminCodeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "period" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paidBy" TEXT NOT NULL,
    "paidByName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" "UserRole" NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "transactionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_zone_idx" ON "User"("zone");

-- CreateIndex
CREATE UNIQUE INDEX "Client_membershipCode_key" ON "Client"("membershipCode");

-- CreateIndex
CREATE UNIQUE INDEX "Client_accountNumber_key" ON "Client"("accountNumber");

-- CreateIndex
CREATE INDEX "Client_membershipCode_idx" ON "Client"("membershipCode");

-- CreateIndex
CREATE INDEX "Client_accountNumber_idx" ON "Client"("accountNumber");

-- CreateIndex
CREATE INDEX "Client_assignedCommercialId_idx" ON "Client"("assignedCommercialId");

-- CreateIndex
CREATE INDEX "Client_type_idx" ON "Client"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Apprenant_clientId_key" ON "Apprenant"("clientId");

-- CreateIndex
CREATE INDEX "Apprenant_clientId_idx" ON "Apprenant"("clientId");

-- CreateIndex
CREATE INDEX "Apprenant_schoolName_idx" ON "Apprenant"("schoolName");

-- CreateIndex
CREATE INDEX "Guardian_phone_idx" ON "Guardian"("phone");

-- CreateIndex
CREATE INDEX "Caution_phone_idx" ON "Caution"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "TontineAccount_numero_key" ON "TontineAccount"("numero");

-- CreateIndex
CREATE INDEX "TontineAccount_apprenantId_idx" ON "TontineAccount"("apprenantId");

-- CreateIndex
CREATE INDEX "TontineAccount_grilleNumero_idx" ON "TontineAccount"("grilleNumero");

-- CreateIndex
CREATE INDEX "TontineAccount_status_idx" ON "TontineAccount"("status");

-- CreateIndex
CREATE INDEX "Cotisation_tontineAccountId_idx" ON "Cotisation"("tontineAccountId");

-- CreateIndex
CREATE INDEX "Cotisation_date_idx" ON "Cotisation"("date");

-- CreateIndex
CREATE INDEX "Cotisation_allocation_idx" ON "Cotisation"("allocation");

-- CreateIndex
CREATE UNIQUE INDEX "NonApprenant_clientId_key" ON "NonApprenant"("clientId");

-- CreateIndex
CREATE INDEX "NonApprenant_clientId_idx" ON "NonApprenant"("clientId");

-- CreateIndex
CREATE INDEX "NonApprenant_idNumber_idx" ON "NonApprenant"("idNumber");

-- CreateIndex
CREATE INDEX "FinancementNonApprenant_nonApprenantId_idx" ON "FinancementNonApprenant"("nonApprenantId");

-- CreateIndex
CREATE INDEX "FinancementNonApprenant_dureeChoisie_idx" ON "FinancementNonApprenant"("dureeChoisie");

-- CreateIndex
CREATE INDEX "FinancementNonApprenant_status_idx" ON "FinancementNonApprenant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Account_accountNumber_key" ON "Account"("accountNumber");

-- CreateIndex
CREATE INDEX "Account_clientId_idx" ON "Account"("clientId");

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE INDEX "Account_status_idx" ON "Account"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_receiptNumber_key" ON "Transaction"("receiptNumber");

-- CreateIndex
CREATE INDEX "Transaction_clientId_idx" ON "Transaction"("clientId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_collectedBy_idx" ON "Transaction"("collectedBy");

-- CreateIndex
CREATE INDEX "Transaction_validatedBy_idx" ON "Transaction"("validatedBy");

-- CreateIndex
CREATE INDEX "InsuranceTransaction_date_idx" ON "InsuranceTransaction"("date");

-- CreateIndex
CREATE INDEX "InsuranceTransaction_clientId_idx" ON "InsuranceTransaction"("clientId");

-- CreateIndex
CREATE INDEX "InsuranceTransaction_operatedBy_idx" ON "InsuranceTransaction"("operatedBy");

-- CreateIndex
CREATE INDEX "SchoolDebt_clientId_idx" ON "SchoolDebt"("clientId");

-- CreateIndex
CREATE INDEX "SchoolDebt_schoolName_idx" ON "SchoolDebt"("schoolName");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_recordedBy_idx" ON "Expense"("recordedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Produit_name_key" ON "Produit"("name");

-- CreateIndex
CREATE INDEX "Produit_category_idx" ON "Produit"("category");

-- CreateIndex
CREATE INDEX "CashRegister_type_idx" ON "CashRegister"("type");

-- CreateIndex
CREATE INDEX "CashRegister_lastMovement_idx" ON "CashRegister"("lastMovement");

-- CreateIndex
CREATE INDEX "ProductRevenue_cashRegisterId_idx" ON "ProductRevenue"("cashRegisterId");

-- CreateIndex
CREATE INDEX "ProductRevenue_category_idx" ON "ProductRevenue"("category");

-- CreateIndex
CREATE INDEX "ProductRevenue_recordedBy_idx" ON "ProductRevenue"("recordedBy");

-- CreateIndex
CREATE INDEX "ProductRevenue_date_idx" ON "ProductRevenue"("date");

-- CreateIndex
CREATE INDEX "AdminCodeRequest_userId_idx" ON "AdminCodeRequest"("userId");

-- CreateIndex
CREATE INDEX "AdminCodeRequest_status_idx" ON "AdminCodeRequest"("status");

-- CreateIndex
CREATE INDEX "AdminCodeRequest_approvedBy_idx" ON "AdminCodeRequest"("approvedBy");

-- CreateIndex
CREATE INDEX "EmployeePayment_userId_idx" ON "EmployeePayment"("userId");

-- CreateIndex
CREATE INDEX "EmployeePayment_period_idx" ON "EmployeePayment"("period");

-- CreateIndex
CREATE INDEX "EmployeePayment_date_idx" ON "EmployeePayment"("date");

-- CreateIndex
CREATE INDEX "ActionLog_userId_idx" ON "ActionLog"("userId");

-- CreateIndex
CREATE INDEX "ActionLog_userRole_idx" ON "ActionLog"("userRole");

-- CreateIndex
CREATE INDEX "ActionLog_timestamp_idx" ON "ActionLog"("timestamp");

-- CreateIndex
CREATE INDEX "ActionLog_action_idx" ON "ActionLog"("action");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_assignedCommercialId_fkey" FOREIGN KEY ("assignedCommercialId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apprenant" ADD CONSTRAINT "Apprenant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apprenant" ADD CONSTRAINT "Apprenant_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apprenant" ADD CONSTRAINT "Apprenant_cautionId_fkey" FOREIGN KEY ("cautionId") REFERENCES "Caution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apprenant" ADD CONSTRAINT "Apprenant_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TontineAccount" ADD CONSTRAINT "TontineAccount_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotisation" ADD CONSTRAINT "Cotisation_tontineAccountId_fkey" FOREIGN KEY ("tontineAccountId") REFERENCES "TontineAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotisation" ADD CONSTRAINT "Cotisation_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonApprenant" ADD CONSTRAINT "NonApprenant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonApprenant" ADD CONSTRAINT "NonApprenant_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancementNonApprenant" ADD CONSTRAINT "FinancementNonApprenant_nonApprenantId_fkey" FOREIGN KEY ("nonApprenantId") REFERENCES "NonApprenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_tontineAccountId_fkey" FOREIGN KEY ("tontineAccountId") REFERENCES "TontineAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_financingId_fkey" FOREIGN KEY ("financingId") REFERENCES "FinancementNonApprenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_collectedBy_fkey" FOREIGN KEY ("collectedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_validatedBy_fkey" FOREIGN KEY ("validatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceTransaction" ADD CONSTRAINT "InsuranceTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceTransaction" ADD CONSTRAINT "InsuranceTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceTransaction" ADD CONSTRAINT "InsuranceTransaction_operatedBy_fkey" FOREIGN KEY ("operatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolDebt" ADD CONSTRAINT "SchoolDebt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRevenue" ADD CONSTRAINT "ProductRevenue_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRevenue" ADD CONSTRAINT "ProductRevenue_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCodeRequest" ADD CONSTRAINT "AdminCodeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCodeRequest" ADD CONSTRAINT "AdminCodeRequest_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayment" ADD CONSTRAINT "EmployeePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayment" ADD CONSTRAINT "EmployeePayment_paidBy_fkey" FOREIGN KEY ("paidBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
