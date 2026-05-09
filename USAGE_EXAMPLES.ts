/**
 * USAGE_EXAMPLES.ts
 * Exemples pratiques d'utilisation des modules PHASE 6, 7, 8
 * 
 * Exécutez avec: npx ts-node USAGE_EXAMPLES.ts
 */

import {
  generateToken,
  hashPassword,
  verifyPassword,
  encryptField,
  decryptField,
  hasPermission,
  getPermissions,
  validateEmail,
  validatePhone,
  generateMembershipCode,
  generateAccountNumber,
} from './lib/security.ts'
import {
  createClientWithCodes,
  recordTransaction,
  validateTransaction,
  recordCotisation,
  recordAdvancedDeposit,
  calculateFinancementApportPercentage,
  transferFinancementToSavings,
} from './lib/db/businessLogic.ts'
import {
  logLogin,
  logCreateClient,
  logDeposit,
  logValidateTransaction,
  logRecordCotisation,
  getActionLogs,
} from './lib/db/actionLog.ts'
import { prisma } from './lib/prisma.ts'

// ───────────────────────────────────────────────────────────────────────────
// EXEMPLE 1: PHASE 6 - SÉCURITÉ
// ───────────────────────────────────────────────────────────────────────────

async function example_phase6_security() {
  console.log('\n=== PHASE 6: SÉCURITÉ ===\n')

  // 1. Hachage password
  console.log('1. Hachage password:')
  const password = 'MySecurePassword123!'
  const hashedPassword = await hashPassword(password)
  console.log(`  Original: ${password}`)
  console.log(`  Hashed: ${hashedPassword.substring(0, 20)}...`)

  // 2. Vérification password
  const isValid = await verifyPassword(password, hashedPassword)
  console.log(`  Verification: ${isValid ? '✅ Valid' : '❌ Invalid'}`)

  // 3. Chiffrement de champs sensibles
  console.log('\n2. Chiffrement de champs:')
  const identityNumber = 'CD-123456789-ABC'
  const encrypted = encryptField(identityNumber)
  const decrypted = decryptField(encrypted)
  console.log(`  Original: ${identityNumber}`)
  console.log(`  Encrypted: ${encrypted.substring(0, 30)}...`)
  console.log(`  Decrypted: ${decrypted}`)
  console.log(`  Match: ${identityNumber === decrypted ? '✅' : '❌'}`)

  // 4. JWT Token generation
  console.log('\n3. JWT Token:')
  const token = generateToken({
    userId: 'u1',
    email: 'admin@wao.com',
    role: 'admin',
    zone: 'kinshasa',
  })
  console.log(`  Token: ${token.substring(0, 50)}...`)

  // 5. Validation données
  console.log('\n4. Validation:')
  console.log(`  Email valid: ${validateEmail('user@example.com') ? '✅' : '❌'}`)
  console.log(`  Phone valid: ${validatePhone('+243812345678') ? '✅' : '❌'}`)

  // 6. Auto-génération de codes
  console.log('\n5. Auto-génération codes:')
  const membershipCode = generateMembershipCode()
  const accountNumber = generateAccountNumber()
  console.log(`  Membership Code: ${membershipCode}`)
  console.log(`  Account Number: ${accountNumber}`)

  // 7. RBAC
  console.log('\n6. RBAC (Role-Based Access Control):')
  const adminPerms = getPermissions('admin')
  console.log(`  Admin permissions (${adminPerms.length}):`)
  adminPerms.forEach((p) => console.log(`    - ${p}`))

  console.log(`\n  Caissier can process:transactions? ${hasPermission('caissier', 'process:transactions') ? '✅' : '❌'}`)
  console.log(`  Caissier can manage:users? ${hasPermission('caissier', 'manage:users') ? '✅' : '❌'}`)
  console.log(`  Commercial can record:cotisations? ${hasPermission('commercial', 'record:cotisations') ? '✅' : '❌'}`)
}

// ───────────────────────────────────────────────────────────────────────────
// EXEMPLE 2: PHASE 7 - LOGIQUE MÉTIER
// ───────────────────────────────────────────────────────────────────────────

async function example_phase7_businessLogic() {
  console.log('\n=== PHASE 7: LOGIQUE MÉTIER ===\n')

  // Préparer un utilisateur et des comptes
  const user = await prisma.user.findFirst({ where: { role: 'commercial' } })
  const account = await prisma.account.findFirst()

  if (!user || !account) {
    console.log('⚠️  Données de test non disponibles. Exécutez seed.js d\'abord.')
    return
  }

  // 1. Créer client avec codes auto-générés
  console.log('1. Création client avec codes auto-générés:')
  const newClient = await createClientWithCodes({
    name: 'Kibonge Félicité Jr',
    type: 'apprenant',
    phone: '+243812345678',
    address: 'Kinshasa',
    assignedCommercialId: user.id,
  })
  console.log(`  ✅ Client créé:`)
  console.log(`     ID: ${newClient.id}`)
  console.log(`     Membership Code: ${newClient.membershipCode}`)
  console.log(`     Account Number: ${newClient.accountNumber}`)

  // 2. Enregistrer une transaction
  console.log('\n2. Enregistrement transaction:')
  const transaction = await recordTransaction({
    clientId: newClient.id,
    accountId: account.id,
    type: 'depot',
    amount: 50000,
    collectedBy: user.id,
  })
  console.log(`  ✅ Transaction créée:`)
  console.log(`     ID: ${transaction.id}`)
  console.log(`     Status: ${transaction.status}`)
  console.log(`     Amount: ${transaction.amount}`)

  // 3. Valider la transaction
  console.log('\n3. Validation transaction:')
  const validated = await validateTransaction(transaction.id, user.id)
  console.log(`  ✅ Transaction validée:`)
  console.log(`     Status: ${validated.status}`)
  console.log(`     Validated by: ${validated.validatedBy}`)

  // 4. Enregistrer une cotisation
  console.log('\n4. Enregistrement cotisation (allocation auto-calculée):')
  const tontineAccount = await prisma.tontineAccount.findFirst()
  if (tontineAccount) {
    const cotisation = await recordCotisation({
      tontineAccountId: tontineAccount.id,
      amount: 5000,
      cycleDay: 1, // 1er jour → allocation='benefice_societe'
      cycleMonth: 1,
      recordedBy: user.id,
    })
    console.log(`  ✅ Cotisation créée:`)
    console.log(`     ID: ${cotisation.id}`)
    console.log(`     Amount: ${cotisation.amount}`)
    console.log(`     Allocation: ${cotisation.allocation} (auto-calculée)`)
    console.log(`     Cycle Day 1 → benefice_societe`)
  }

  // 5. Dépôt anticipé
  console.log('\n5. Dépôt anticipé (5 jours):')
  if (tontineAccount) {
    const cotisations = await recordAdvancedDeposit({
      tontineAccountId: tontineAccount.id,
      daysToAdd: 5,
      dailyAmount: 1000,
      recordedBy: user.id,
    })
    console.log(`  ✅ Cotisations créées: ${cotisations.length}`)
    console.log(`     Total montant: ${cotisations.reduce((sum, c) => sum + c.amount.toNumber(), 0)}`)
  }

  // 6. Calcul pourcentage apport
  console.log('\n6. Calcul pourcentage apport personnel:')
  const financing = await prisma.financementNonApprenant.findFirst()
  if (financing) {
    const percentage = await calculateFinancementApportPercentage(
      financing.id,
      5000000, // Apport personnel
      25000000 // Valeur bien
    )
    console.log(`  ✅ Apport calculé:`)
    console.log(`     Apport personnel: 5,000,000 FC`)
    console.log(`     Valeur bien: 25,000,000 FC`)
    console.log(`     Pourcentage: ${percentage.toFixed(2)}%`)
  }
}

// ───────────────────────────────────────────────────────────────────────────
// EXEMPLE 3: PHASE 8 - JOURNALISATION
// ───────────────────────────────────────────────────────────────────────────

async function example_phase8_logging() {
  console.log('\n=== PHASE 8: JOURNALISATION ===\n')

  const user = await prisma.user.findFirst({ where: { role: 'admin' } })
  const client = await prisma.client.findFirst()
  const transaction = await prisma.transaction.findFirst()

  if (!user || !client || !transaction) {
    console.log('⚠️  Données de test non disponibles. Exécutez seed.js d\'abord.')
    return
  }

  // 1. Logger une connexion
  console.log('1. Logging: Connexion utilisateur')
  await logLogin(user.id, user.name, user.role, '192.168.1.100')
  console.log('  ✅ Connexion loggée')

  // 2. Logger création client
  console.log('\n2. Logging: Création client')
  await logCreateClient(user.id, user.name, user.role, client.id, client.name, client.type)
  console.log('  ✅ Création client loggée')

  // 3. Logger dépôt
  console.log('\n3. Logging: Dépôt')
  await logDeposit(user.id, user.name, user.role, client.id, 50000, transaction.id)
  console.log('  ✅ Dépôt loggé')

  // 4. Logger validation
  console.log('\n4. Logging: Validation transaction')
  await logValidateTransaction(user.id, user.name, user.role, transaction.id, transaction.amount.toNumber())
  console.log('  ✅ Validation loggée')

  // 5. Logger cotisation
  console.log('\n5. Logging: Cotisation')
  const tontineAccount = await prisma.tontineAccount.findFirst()
  if (tontineAccount) {
    await logRecordCotisation(user.id, user.name, user.role, tontineAccount.id, 5000, 1)
    console.log('  ✅ Cotisation loggée')
  }

  // 6. Récupérer les logs
  console.log('\n6. Récupération logs d\'audit:')
  const logs = await getActionLogs({
    userId: user.id,
    limit: 10,
  })
  console.log(`  ✅ ${logs.length} logs trouvés:`)
  logs.slice(0, 5).forEach((log) => {
    console.log(`     - ${log.action} (${new Date(log.timestamp).toLocaleString()})`)
  })
}

// ───────────────────────────────────────────────────────────────────────────
// EXEMPLE 4: INTÉGRATION COMPLÈTE
// ───────────────────────────────────────────────────────────────────────────

async function example_fullIntegration() {
  console.log('\n=== INTÉGRATION COMPLÈTE (Workflow) ===\n')

  const user = await prisma.user.findFirst({ where: { role: 'commercial' } })
  if (!user) {
    console.log('⚠️  Données de test non disponibles.')
    return
  }

  console.log('Workflow: Commercial crée un client et enregistre un dépôt\n')

  // Étape 1: Login
  console.log('1️⃣  Commercial se connecte')
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role as 'commercial',
    zone: user.zone,
  })
  await logLogin(user.id, user.name, user.role)
  console.log(`   ✅ Token généré: ${token.substring(0, 30)}...`)

  // Étape 2: Créer client
  console.log('\n2️⃣  Commercial crée un client apprenant')
  const newClient = await createClientWithCodes({
    name: 'Mbuyi Lumbu',
    type: 'apprenant',
    phone: '+243822222222',
    address: 'Goma',
    assignedCommercialId: user.id,
  })
  await logCreateClient(user.id, user.name, user.role, newClient.id, newClient.name, newClient.type)
  console.log(`   ✅ Client créé avec:`)
  console.log(`      - Membership Code: ${newClient.membershipCode}`)
  console.log(`      - Account Number: ${newClient.accountNumber}`)

  // Étape 3: Créer compte épargne
  console.log('\n3️⃣  Créer compte épargne')
  const savingsAccount = await prisma.account.create({
    data: {
      clientId: newClient.id,
      type: 'epargne',
      status: 'actif',
      balance: 0,
    },
  })
  console.log(`   ✅ Compte créé: ${savingsAccount.id}`)

  // Étape 4: Enregistrer dépôt
  console.log('\n4️⃣  Caissier enregistre un dépôt')
  const caissier = await prisma.user.findFirst({ where: { role: 'caissier' } })
  if (caissier) {
    const trans = await recordTransaction({
      clientId: newClient.id,
      accountId: savingsAccount.id,
      type: 'depot',
      amount: 100000,
      collectedBy: caissier.id,
    })
    await logDeposit(caissier.id, caissier.name, caissier.role, newClient.id, 100000, trans.id)
    console.log(`   ✅ Dépôt enregistré: 100,000 FC`)
    console.log(`      Status: ${trans.status} (en attente de validation)`)

    // Étape 5: Admin valide
    console.log('\n5️⃣  Admin valide la transaction')
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } })
    if (admin) {
      const validated = await validateTransaction(trans.id, admin.id)
      await logValidateTransaction(admin.id, admin.name, admin.role, trans.id, 100000)
      console.log(`   ✅ Dépôt validé`)
      console.log(`      Nouveau solde compte: 100,000 FC`)
      console.log(`      Caisse générale mise à jour`)
    }
  }

  // Résumé
  console.log('\n📊 RÉSUMÉ DE LA TRANSACTION:')
  const updatedClient = await prisma.client.findUnique({
    where: { id: newClient.id },
    include: { accounts: true },
  })
  console.log(`   Client: ${updatedClient?.name}`)
  console.log(`   Code d'adhésion: ${updatedClient?.membershipCode}`)
  console.log(`   Comptes: ${updatedClient?.accounts.length}`)
  updatedClient?.accounts.forEach((acc) => {
    console.log(`      - ${acc.type}: ${acc.balance} FC`)
  })

  // Logs d'audit
  const logs = await getActionLogs({ limit: 20 })
  console.log(`\n📋 LOGS D'AUDIT (${logs.length} enregistrements):`)
  logs.slice(0, 5).forEach((log) => {
    console.log(`   [${log.userRole}] ${log.userName}: ${log.action}`)
  })
}

// ───────────────────────────────────────────────────────────────────────────
// MAIN
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║         Exemples PHASE 6, 7, 8 - Wao Félicitations       ║
║     Sécurité • Logique Métier • Journalisation            ║
╚══════════════════════════════════════════════════════════╝
  `)

  try {
    // Exécuter les exemples
    await example_phase6_security()
    await example_phase7_businessLogic()
    await example_phase8_logging()
    await example_fullIntegration()

    console.log(`
╔══════════════════════════════════════════════════════════╗
║                  ✅ TOUS LES EXEMPLES RÉUSSIS            ║
╚══════════════════════════════════════════════════════════╝
    `)
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
