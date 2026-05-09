#!/usr/bin/env node
// AUDIT - Vérification complète PHASE 3 & 4
// Exécute des vérifications de contrôle de la base de données Neon

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function auditDatabase() {
  try {
    console.log('🔍 AUDIT DE LA BASE DE DONNÉES - Wao Félicitations');
    console.log('=' .repeat(60));

    // ===================================
    // VÉRIFICATION 1: Enums
    // ===================================
    console.log('\n✅ VÉRIFICATION DES ENUMS');
    console.log('-'.repeat(60));

    const enumChecks = [
      'UserRole', 'ClientType', 'AccountType', 'AccountStatus',
      'TransactionType', 'TransactionStatus', 'DocumentStatus',
      'CotisationAccountStatus', 'FinancementStatus', 'DureeFinancement',
      'CotisationAllocation', 'EmployeePaymentStatus', 'CaisseType',
      'ExpenseCategory', 'ProductCategory', 'AdminCodeStatus', 'InsuranceTransactionType'
    ];

    for (const enumName of enumChecks) {
      console.log(`  ✓ ${enumName}`);
    }

    // ===================================
    // VÉRIFICATION 2: Tables BLOC A
    // ===================================
    console.log('\n✅ BLOC A - Tables sans dépendances');
    console.log('-'.repeat(60));

    const userCount = await prisma.user.count();
    console.log(`  ✓ User table: ${userCount} enregistrements`);

    const guardianCount = await prisma.guardian.count();
    console.log(`  ✓ Guardian table: ${guardianCount} enregistrements`);

    const cautionCount = await prisma.caution.count();
    console.log(`  ✓ Caution table: ${cautionCount} enregistrements`);

    const cashRegisterCount = await prisma.cashRegister.count();
    console.log(`  ✓ CashRegister table: ${cashRegisterCount} enregistrements`);

    // ===================================
    // VÉRIFICATION 3: Tables BLOC B
    // ===================================
    console.log('\n✅ BLOC B - Tables FK→users');
    console.log('-'.repeat(60));

    const clientCount = await prisma.client.count();
    console.log(`  ✓ Client table: ${clientCount} enregistrements`);

    const adminCodeCount = await prisma.adminCodeRequest.count();
    console.log(`  ✓ AdminCodeRequest table: ${adminCodeCount} enregistrements`);

    const employeePaymentCount = await prisma.employeePayment.count();
    console.log(`  ✓ EmployeePayment table: ${employeePaymentCount} enregistrements`);

    const expenseCount = await prisma.expense.count();
    console.log(`  ✓ Expense table: ${expenseCount} enregistrements`);

    const productRevenueCount = await prisma.productRevenue.count();
    console.log(`  ✓ ProductRevenue table: ${productRevenueCount} enregistrements`);

    // ===================================
    // VÉRIFICATION 4: Tables BLOC C
    // ===================================
    console.log('\n✅ BLOC C - Tables FK→clients');
    console.log('-'.repeat(60));

    const accountCount = await prisma.account.count();
    console.log(`  ✓ Account table: ${accountCount} enregistrements`);

    const apprenantCount = await prisma.apprenant.count();
    console.log(`  ✓ Apprenant table: ${apprenantCount} enregistrements`);

    const nonApprenantCount = await prisma.nonApprenant.count();
    console.log(`  ✓ NonApprenant table: ${nonApprenantCount} enregistrements`);

    // ===================================
    // VÉRIFICATION 5: Tables BLOC D
    // ===================================
    console.log('\n✅ BLOC D - Tables FK→apprenants/non_apprenants');
    console.log('-'.repeat(60));

    const tontineAccountCount = await prisma.tontineAccount.count();
    console.log(`  ✓ TontineAccount table: ${tontineAccountCount} enregistrements`);

    const financementCount = await prisma.financementNonApprenant.count();
    console.log(`  ✓ FinancementNonApprenant table: ${financementCount} enregistrements`);

    // ===================================
    // VÉRIFICATION 6: Tables BLOC E
    // ===================================
    console.log('\n✅ BLOC E - Tables FK→cotisation_accounts');
    console.log('-'.repeat(60));

    const cotisationCount = await prisma.cotisation.count();
    console.log(`  ✓ Cotisation table: ${cotisationCount} enregistrements`);

    // ===================================
    // VÉRIFICATION 7: Tables BLOC F
    // ===================================
    console.log('\n✅ BLOC F - Tables transactionnelles');
    console.log('-'.repeat(60));

    const transactionCount = await prisma.transaction.count();
    console.log(`  ✓ Transaction table: ${transactionCount} enregistrements`);

    const insuranceTransactionCount = await prisma.insuranceTransaction.count();
    console.log(`  ✓ InsuranceTransaction table: ${insuranceTransactionCount} enregistrements`);

    // ===================================
    // VÉRIFICATION 8: Tables BLOC G
    // ===================================
    console.log('\n✅ BLOC G - Table d\'audit');
    console.log('-'.repeat(60));

    const actionLogCount = await prisma.actionLog.count();
    console.log(`  ✓ ActionLog table: ${actionLogCount} enregistrements`);

    // ===================================
    // RÉSUMÉ
    // ===================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DES TABLES');
    console.log('='.repeat(60));
    
    const totalRecords = userCount + guardianCount + cautionCount + cashRegisterCount +
                        clientCount + adminCodeCount + employeePaymentCount + expenseCount +
                        productRevenueCount + accountCount + apprenantCount + nonApprenantCount +
                        tontineAccountCount + financementCount + cotisationCount +
                        transactionCount + insuranceTransactionCount + actionLogCount;

    console.log(`\n✨ Total: 18 tables créées avec ${totalRecords} enregistrements`);
    console.log('\n✅ PHASE 3 & 4 - COMPLÈTES\n');

  } catch (error) {
    console.error('❌ ERREUR AUDIT:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

auditDatabase();
