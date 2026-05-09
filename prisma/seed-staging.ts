import 'dotenv/config'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '../.env.staging') })

const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL or DATABASE_URL_POOLED is not defined in .env.staging')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
const BCRYPT_ROUNDS = 10

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

async function main() {
  console.log('🌱 Starting staging seed...')

  const adminPassword = await hashPassword('AdminStaging123!')
  const cashierPassword = await hashPassword('CashierStaging123!')
  const commercialPassword = await hashPassword('CommercialStaging123!')

  console.log('🧑‍💼 Creating staging users...')
  const [admin, cashier, commercial] = await Promise.all([
    prisma.user.create({
      data: {
        id: 'staging-u-admin',
        name: 'Staging Admin',
        role: 'admin',
        email: 'admin@staging.test',
        password: adminPassword,
        zone: 'Kinshasa',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: 'staging-u-cashier',
        name: 'Staging Cashier',
        role: 'caissier',
        email: 'cashier@staging.test',
        password: cashierPassword,
        zone: 'Kinshasa',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: 'staging-u-commercial',
        name: 'Staging Commercial',
        role: 'commercial',
        email: 'commercial@staging.test',
        password: commercialPassword,
        zone: 'Kinshasa',
        isActive: true,
      },
    }),
  ])

  console.log('✅ Created staging users')

  console.log('💵 Creating staging cash registers...')
  await Promise.all([
    prisma.cashRegister.create({
      data: {
        id: 'staging-cr-general',
        type: 'generale',
        balance: 150000,
        notes: '[STAGING] Caisse Générale',
        isActive: true,
      },
    }),
    prisma.cashRegister.create({
      data: {
        id: 'staging-cr-produits',
        type: 'produits_charges',
        balance: 75000,
        notes: '[STAGING] Caisse Produits / Charges',
        isActive: true,
      },
    }),
    prisma.cashRegister.create({
      data: {
        id: 'staging-cr-assurance',
        type: 'assurance',
        balance: 45000,
        notes: '[STAGING] Caisse Assurance',
        isActive: true,
      },
    }),
  ])

  console.log('✅ Created staging cash registers')

  console.log('📇 Creating staging clients and accounts...')
  const client1 = await prisma.client.create({
    data: {
      id: 'staging-client-1',
      name: 'Test Client Apprenant',
      membershipCode: 'STG-0001',
      accountNumber: 'STG-ACC-0001',
      type: 'apprenant',
      phone: '+243812345678',
      address: 'Kinshasa, Gombe',
      assignedCommercialId: commercial.id,
      savingsBalance: 120000,
      financingBalance: 0,
    },
  })

  const guardian1 = await prisma.guardian.create({
    data: {
      id: 'staging-guardian-1',
      fullName: 'Marie Staging',
      phone: '+243812300001',
      relationship: 'Mère',
    },
  })

  const caution1 = await prisma.caution.create({
    data: {
      id: 'staging-caution-1',
      fullName: 'Paul Staging',
      phone: '+243812300002',
    },
  })

  await prisma.apprenant.create({
    data: {
      id: 'staging-apprenant-1',
      clientId: client1.id,
      studentName: 'Alex Staging',
      studentBirthDate: new Date('2009-06-15'),
      schoolName: 'Lycée Staging',
      schoolLevel: 'Secondaire',
      schoolYear: '2026',
      guardianId: guardian1.id,
      cautionId: caution1.id,
      documents: [
        { key: 'carte_identite', label: 'Carte d\'identité', status: 'fourni' },
        { key: 'certificat_scolarite', label: 'Certificat de scolarité', status: 'en_attente' },
      ],
      createdBy: admin.id,
    },
  })

  await prisma.account.create({
    data: {
      id: 'staging-account-1',
      clientId: client1.id,
      type: 'epargne',
      balance: 120000,
      accountNumber: 'STG-EPI-0001',
      label: 'Livret épargne staging',
      status: 'actif',
      createdBy: admin.id,
      createdByName: admin.name,
    },
  })

  const client2 = await prisma.client.create({
    data: {
      id: 'staging-client-2',
      name: 'Test Client Non-Apprenant',
      membershipCode: 'STG-0002',
      accountNumber: 'STG-ACC-0002',
      type: 'non_apprenant',
      phone: '+243812345679',
      address: 'Lubumbashi, Kampemba',
      assignedCommercialId: commercial.id,
      savingsBalance: 50000,
      financingBalance: 200000,
    },
  })

  await prisma.nonApprenant.create({
    data: {
      id: 'staging-nonapprenant-1',
      clientId: client2.id,
      fullName: 'Joseph Staging',
      phone: client2.phone,
      idNumber: '123456789',
      documents: { pieceIdentite: true, photos: true },
      adhesionPaid: true,
      carnetPaid: false,
      createdBy: admin.id,
    },
  })

  await prisma.account.create({
    data: {
      id: 'staging-account-2',
      clientId: client2.id,
      type: 'financement',
      balance: 200000,
      accountNumber: 'STG-FIN-0002',
      label: 'Compte financement staging',
      status: 'actif',
      principalAmount: 200000,
      dossierFee: 15000,
      insuranceFee: 5000,
      prestationFee: 10000,
      dailyContribution: 2000,
      totalDue: 225000,
      totalPaid: 25000,
      residualBalance: 175000,
      createdBy: admin.id,
      createdByName: admin.name,
    },
  })

  console.log('✅ Created staging clients and accounts')

  console.log('💳 Creating sample staging transactions and expenses...')
  await prisma.transaction.create({
    data: {
      id: 'staging-tx-1',
      clientId: client1.id,
      clientName: client1.name,
      type: 'depot',
      amount: 50000,
      date: new Date(),
      collectedBy: cashier.id,
      collectedByName: cashier.name,
      status: 'approuve',
      description: 'Dépôt de test sur staging',
    },
  })

  await prisma.expense.create({
    data: {
      id: 'staging-expense-1',
      category: 'fournitures_bureau',
      amount: 12000,
      description: 'Achat fournitures pour agence staging',
      date: new Date(),
      recordedBy: admin.id,
      recordedByName: admin.name,
    },
  })

  console.log('✅ Created sample staging transactions and expenses')
  console.log('✅ Staging seed complete. Use `npm exec ts-node prisma/seed-staging.ts` with .env.staging loaded.')
}

main()
  .catch((error) => {
    console.error('❌ Staging seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
