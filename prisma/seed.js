import 'dotenv/config'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Charger .env explicitement
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: `${__dirname}/../.env` })

const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL ou DATABASE_URL_POOLED non défini!')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Démarrage du seed...')

  // ─── CRÉER LES UTILISATEURS ────────────────────────────────────────────

  console.log('📝 Création des utilisateurs...')
  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: 'u1',
        name: 'Super Admin',
        role: 'admin',
        email: 'admin@waooo.com',
        password: 'admin123', // ⚠️ À hasher en production avec bcrypt!
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: 'u2',
        name: 'Caisse Centrale (Alice)',
        role: 'caissier',
        email: 'alice@waooo.com',
        password: 'alice123',
        isActive: true,
        zone: 'Agence Centre',
      },
    }),
    prisma.user.create({
      data: {
        id: 'u3',
        name: 'Caisse Nord (Bob)',
        role: 'caissier',
        email: 'bob@waooo.com',
        password: 'bob123',
        isActive: true,
        zone: 'Agence Nord',
      },
    }),
    prisma.user.create({
      data: {
        id: 'u4',
        name: 'Commercial Terrain (Jean)',
        role: 'commercial',
        email: 'jean@waooo.com',
        password: 'jean123',
        isActive: true,
        zone: 'Zone A',
      },
    }),
    prisma.user.create({
      data: {
        id: 'u5',
        name: 'Commercial Terrain (Marc)',
        role: 'commercial',
        email: 'marc@waooo.com',
        password: 'marc123',
        isActive: true,
        zone: 'Zone B',
      },
    }),
  ])

  console.log(`✅ ${users.length} utilisateurs créés`)

  // ─── CRÉER LES CAISSES INITIALES (PHASE 5) ─────────────────────────────

  console.log('📝 Création des caisses initiales...')
  const cashRegisters = await Promise.all([
    prisma.cashRegister.create({
      data: {
        id: 'cr1',
        type: 'generale',
        balance: 0,
        notes: 'Caisse générale de l\'agence principale',
        isActive: true,
      },
    }),
    prisma.cashRegister.create({
      data: {
        id: 'cr2',
        type: 'produits_charges',
        balance: 0,
        notes: 'Caisse des produits et charges commerciales',
        isActive: true,
      },
    }),
    prisma.cashRegister.create({
      data: {
        id: 'cr3',
        type: 'assurance',
        balance: 0,
        notes: 'Caisse d\'assurance',
        isActive: true,
      },
    }),
  ])

  console.log(`✅ ${cashRegisters.length} caisses créées`)

  // ─── CRÉER LES CLIENTS ─────────────────────────────────────────────────

  console.log('📝 Création des clients...')
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        id: 'c1',
        name: 'Idriss Traoré',
        membershipCode: '4728WF026',
        accountNumber: 'ACC-82736112',
        type: 'apprenant',
        phone: '0707070707',
        address: 'Abidjan Cocody',
        assignedCommercialId: 'u4',
        savingsBalance: 0,
        financingBalance: -58100,
      },
    }),
    prisma.client.create({
      data: {
        id: 'c2',
        name: 'Fatou Diop',
        membershipCode: '1928WF026',
        accountNumber: 'ACC-91283744',
        type: 'non_apprenant',
        phone: '0808080808',
        address: 'Abidjan Treichville',
        assignedCommercialId: 'u4',
        savingsBalance: 50000,
        financingBalance: 0,
      },
    }),
    prisma.client.create({
      data: {
        id: 'c3',
        name: 'Koffi Yao',
        membershipCode: '8827WF026',
        accountNumber: 'ACC-00192837',
        type: 'simple',
        phone: '0909090909',
        address: 'Abidjan Yopougon',
        assignedCommercialId: 'u5',
        savingsBalance: 5000,
        financingBalance: 0,
      },
    }),
    prisma.client.create({
      data: {
        id: 'c4',
        name: 'Aïsha Bakayoko',
        membershipCode: '5562WF026',
        accountNumber: 'ACC-11223344',
        type: 'apprenant',
        phone: '0123456789',
        address: 'Abidjan Marcory',
        assignedCommercialId: 'u4',
        savingsBalance: 0,
        financingBalance: -110500,
      },
    }),
    prisma.client.create({
      data: {
        id: 'c5',
        name: 'Yannick Ouédraogo',
        membershipCode: '7731WF026',
        accountNumber: 'ACC-55667788',
        type: 'apprenant',
        phone: '0566778899',
        address: 'Abidjan Riviera',
        assignedCommercialId: 'u5',
        savingsBalance: 0,
        financingBalance: -166575,
      },
    }),
  ])

  console.log(`✅ ${clients.length} clients créés`)

  // ─── CRÉER LES TUTEURS ET CAUTIONS ────────────────────────────────────

  console.log('📝 Création des tuteurs et cautions...')
  const guardians = await Promise.all([
    prisma.guardian.create({
      data: {
        id: 'g1',
        fullName: 'Moussa Traoré',
        phone: '0707070707',
        relationship: 'Père',
        idNumber: 'CI-1234567',
      },
    }),
    prisma.guardian.create({
      data: {
        id: 'g2',
        fullName: 'Karim Bakayoko',
        phone: '0123456789',
        relationship: 'Père',
      },
    }),
    prisma.guardian.create({
      data: {
        id: 'g3',
        fullName: 'Ousmane Ouédraogo',
        phone: '0566778899',
        relationship: 'Père',
      },
    }),
  ])

  const cautions = await Promise.all([
    prisma.caution.create({
      data: {
        id: 'ca1',
        fullName: 'Aminata Koné',
        phone: '0101010101',
        idNumber: 'CI-9876543',
      },
    }),
    prisma.caution.create({
      data: {
        id: 'ca2',
        fullName: 'Salimata Diaby',
        phone: '0911223344',
      },
    }),
    prisma.caution.create({
      data: {
        id: 'ca3',
        fullName: 'Awa Diallo',
        phone: '0944556677',
      },
    }),
  ])

  console.log(`✅ ${guardians.length} tuteurs et ${cautions.length} cautions créés`)

  // ─── CRÉER LES APPRENANTS ─────────────────────────────────────────────

  console.log('📝 Création des apprenants...')
  const apprenants = await Promise.all([
    prisma.apprenant.create({
      data: {
        id: 'ap1',
        clientId: 'c1',
        studentName: 'Idriss Traoré',
        studentBirthDate: new Date('2012-05-14'),
        schoolName: 'Lycée Classique',
        schoolLevel: '3ème',
        schoolYear: '2025-2026',
        guardianId: 'g1',
        cautionId: 'ca1',
        documents: [
          { key: 'acte_naissance', label: 'Acte de naissance', status: 'fourni' },
          { key: 'photos', label: '2 photos passeport', status: 'fourni' },
          { key: 'piece_parent', label: 'Pièce parent', status: 'fourni' },
          { key: 'piece_caution', label: 'Pièce caution', status: 'fourni' },
        ],
        createdBy: 'u2',
      },
    }),
    prisma.apprenant.create({
      data: {
        id: 'ap2',
        clientId: 'c4',
        studentName: 'Aïsha Bakayoko',
        schoolName: 'Collège Moderne',
        schoolLevel: 'Terminale',
        schoolYear: '2025-2026',
        guardianId: 'g2',
        cautionId: 'ca2',
        documents: [
          { key: 'acte_naissance', label: 'Acte de naissance', status: 'fourni' },
          { key: 'photos', label: '2 photos passeport', status: 'fourni' },
          { key: 'piece_parent', label: 'Pièce parent', status: 'fourni' },
          { key: 'piece_caution', label: 'Pièce caution', status: 'fourni' },
        ],
        createdBy: 'u2',
      },
    }),
    prisma.apprenant.create({
      data: {
        id: 'ap3',
        clientId: 'c5',
        studentName: 'Yannick Ouédraogo',
        schoolName: 'Lycée International',
        schoolLevel: 'Seconde',
        schoolYear: '2025-2026',
        guardianId: 'g3',
        cautionId: 'ca3',
        documents: [
          { key: 'acte_naissance', label: 'Acte de naissance', status: 'fourni' },
          { key: 'photos', label: '2 photos passeport', status: 'fourni' },
          { key: 'piece_parent', label: 'Pièce parent', status: 'fourni' },
          { key: 'piece_caution', label: 'Pièce caution', status: 'fourni' },
        ],
        createdBy: 'u2',
      },
    }),
  ])

  console.log(`✅ ${apprenants.length} apprenants créés`)

  // ─── CRÉER LES COMPTES TONTINE ────────────────────────────────────────

  console.log('📝 Création des comptes tontine...')
  const tontineAccounts = await Promise.all([
    prisma.tontineAccount.create({
      data: {
        id: 't1',
        apprenantId: 'ap1',
        numero: 'TON-2026-001',
        schoolName: 'Lycée Classique',
        schoolLevel: '3ème',
        fraisScolarite: 58700,
        grilleNumero: 8,
        fraisDossier: 1000,
        fraisAssurance: 1000,
        fraisPrestation: 13500,
        cotisationJournaliere: 500,
        totalCapital: 59700,
        totalCotise: 5000,
        totalJours: 120,
        status: 'actif',
      },
    }),
    prisma.tontineAccount.create({
      data: {
        id: 't2',
        apprenantId: 'ap2',
        numero: 'TON-2026-002',
        schoolName: 'Collège Moderne',
        schoolLevel: 'Terminale',
        fraisScolarite: 110500,
        grilleNumero: 10,
        fraisDossier: 1000,
        fraisAssurance: 1000,
        fraisPrestation: 17550,
        cotisationJournaliere: 650,
        totalCapital: 111500,
        totalCotise: 6500,
        totalJours: 172,
        status: 'actif',
      },
    }),
    prisma.tontineAccount.create({
      data: {
        id: 't3',
        apprenantId: 'ap3',
        numero: 'TON-2026-003',
        schoolName: 'Lycée International',
        schoolLevel: 'Seconde',
        fraisScolarite: 166575,
        grilleNumero: 12,
        fraisDossier: 1000,
        fraisAssurance: 1000,
        fraisPrestation: 21600,
        cotisationJournaliere: 800,
        totalCapital: 167575,
        totalCotise: 8000,
        totalJours: 211,
        status: 'actif',
      },
    }),
  ])

  console.log(`✅ ${tontineAccounts.length} comptes tontine créés`)

  // ─── CRÉER LES COMPTES ────────────────────────────────────────────────

  console.log('📝 Création des comptes...')
  const accounts = await Promise.all([
    // Épargne
    prisma.account.create({
      data: {
        id: 'a1',
        clientId: 'c2',
        type: 'epargne',
        balance: 50000,
        label: 'Épargne Principale',
        status: 'actif',
        createdBy: 'u2',
        createdByName: 'Alice',
      },
    }),
    prisma.account.create({
      data: {
        id: 'a2',
        clientId: 'c3',
        type: 'epargne',
        balance: 5000,
        label: 'Épargne',
        status: 'actif',
        createdBy: 'u2',
        createdByName: 'Alice',
      },
    }),
    // Financement (Tontines)
    prisma.account.create({
      data: {
        id: 'a3',
        clientId: 'c1',
        type: 'financement',
        balance: -58100,
        label: 'Tontine - Lycée Classique',
        status: 'actif',
        tontineAccountId: 't1',
        createdBy: 'u2',
        createdByName: 'Alice',
      },
    }),
    prisma.account.create({
      data: {
        id: 'a4',
        clientId: 'c4',
        type: 'financement',
        balance: -110500,
        label: 'Tontine - Collège Moderne',
        status: 'actif',
        tontineAccountId: 't2',
        createdBy: 'u2',
        createdByName: 'Alice',
      },
    }),
    prisma.account.create({
      data: {
        id: 'a5',
        clientId: 'c5',
        type: 'financement',
        balance: -166575,
        label: 'Tontine - Lycée International',
        status: 'actif',
        tontineAccountId: 't3',
        createdBy: 'u2',
        createdByName: 'Alice',
      },
    }),
  ])

  console.log(`✅ ${accounts.length} comptes créés`)

  // ─── CRÉER LES TRANSACTIONS ────────────────────────────────────────────

  console.log('📝 Création des transactions...')
  const transactions = await Promise.all([
    prisma.transaction.create({
      data: {
        id: 'trans1',
        clientId: 'c2',
        clientName: 'Fatou Diop',
        accountId: 'a1',
        type: 'depot',
        amount: 50000,
        date: new Date('2026-01-13'),
        collectedBy: 'u4',
        collectedByName: 'Jean',
        validatedBy: 'u2',
        validatedByName: 'Alice',
        status: 'approuve',
        receiptNumber: 'REC-2026-001',
      },
    }),
    prisma.transaction.create({
      data: {
        id: 'trans2',
        clientId: 'c3',
        clientName: 'Koffi Yao',
        accountId: 'a2',
        type: 'depot',
        amount: 5000,
        date: new Date('2026-01-15'),
        collectedBy: 'u5',
        collectedByName: 'Marc',
        validatedBy: 'u2',
        validatedByName: 'Alice',
        status: 'approuve',
        receiptNumber: 'REC-2026-002',
      },
    }),
  ])

  console.log(`✅ ${transactions.length} transactions créées`)

  // ─── CRÉER LES COTISATIONS ────────────────────────────────────────────

  console.log('📝 Création des cotisations...')
  const cotisations = await Promise.all([
    prisma.cotisation.create({
      data: {
        id: 'cot1',
        tontineAccountId: 't1',
        amount: 500,
        date: new Date('2026-01-20'),
        cycleMonth: 1,
        cycleDay: 10,
        allocation: 'remboursement',
        recordedBy: 'u2',
      },
    }),
    prisma.cotisation.create({
      data: {
        id: 'cot2',
        tontineAccountId: 't2',
        amount: 650,
        date: new Date('2026-01-21'),
        cycleMonth: 1,
        cycleDay: 5,
        allocation: 'remboursement',
        recordedBy: 'u2',
      },
    }),
  ])

  console.log(`✅ ${cotisations.length} cotisations créées`)

  // ─── CRÉER LES NON-APPRENANTS ────────────────────────────────────────

  console.log('📝 Création des non-apprenants...')
  const nonApprenants = await Promise.all([
    prisma.nonApprenant.create({
      data: {
        id: 'na1',
        clientId: 'c2',
        fullName: 'Fatou Diop',
        phone: '0808080808',
        idNumber: 'CI-5555555',
        documents: {
          pieceIdentite: true,
          photos: true,
        },
        adhesionPaid: true,
        createdBy: 'u2',
      },
    }),
  ])

  console.log(`✅ ${nonApprenants.length} non-apprenants créés`)

  // ─── CRÉER LES DETTES SCOLAIRES ────────────────────────────────────────

  console.log('📝 Création des dettes scolaires...')
  const debts = await Promise.all([
    prisma.schoolDebt.create({
      data: {
        id: 'd1',
        clientId: 'c1',
        schoolName: 'Lycée Classique',
        debtAmount: 58700,
        paidAmount: 600,
        active: true,
      },
    }),
    prisma.schoolDebt.create({
      data: {
        id: 'd2',
        clientId: 'c4',
        schoolName: 'Collège Moderne',
        debtAmount: 110500,
        paidAmount: 0,
        active: true,
      },
    }),
    prisma.schoolDebt.create({
      data: {
        id: 'd3',
        clientId: 'c5',
        schoolName: 'Lycée International',
        debtAmount: 166575,
        paidAmount: 0,
        active: true,
      },
    }),
  ])

  console.log(`✅ ${debts.length} dettes scolaires créées`)

  // ─── CRÉER LES LOGS D'ACTIONS ─────────────────────────────────────────

  console.log('📝 Création des logs d\'actions...')
  const logs = await Promise.all([
    prisma.actionLog.create({
      data: {
        id: 'log1',
        userId: 'u1',
        userName: 'Super Admin',
        userRole: 'admin',
        action: 'Connexion',
        details: 'Administrateur connecté',
        timestamp: new Date('2026-01-15 08:00:00'),
      },
    }),
    prisma.actionLog.create({
      data: {
        id: 'log2',
        userId: 'u2',
        userName: 'Alice',
        userRole: 'caissier',
        action: 'Création Client',
        details: 'Création du client Idriss Traoré',
        timestamp: new Date('2026-01-10 10:15:22'),
      },
    }),
  ])

  console.log(`✅ ${logs.length} logs créés`)

  // ─── CRÉER LES PRODUITS ───────────────────────────────────────────────

  console.log('📝 Création des produits...')
  const products = await Promise.all([
    prisma.produit.create({
      data: {
        id: 'prod1',
        name: 'Tontine Scolaire',
        description: 'Financement des frais de scolarité',
        category: 'vente_livret_tontine',
        isActive: true,
      },
    }),
    prisma.produit.create({
      data: {
        id: 'prod2',
        name: 'Financement de Biens',
        description: 'Financement de biens et équipements',
        category: 'vente',
        isActive: true,
      },
    }),
    prisma.produit.create({
      data: {
        id: 'prod3',
        name: 'Épargne Simple',
        description: 'Accumulation d\'épargne simple',
        category: 'autres_produits',
        isActive: true,
      },
    }),
  ])

  console.log(`✅ ${products.length} produits créés`)

  console.log('✨ Seed complété avec succès!')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
