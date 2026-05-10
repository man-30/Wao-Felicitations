/**
 * seed-production.ts
 * Seed production database with initial admin user only
 * ⚠️ DO NOT SEED TEST DATA IN PRODUCTION
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.production
config({ path: join(__dirname, '..', '.env.production') })

const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL or DATABASE_URL_POOLED must be set')
}

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const BCRYPT_ROUNDS = 10

async function main() {
  console.log('🌱 Starting PRODUCTION seed...')

  // Create admin user only
  console.log('👤 Creating production admin user...')
  
  const adminPassword = await bcrypt.hash('AdminProd2026!SecurePassword', BCRYPT_ROUNDS)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@wao-felicitations.com' },
    update: {},
    create: {
      id: 'prod-u-admin',
      name: 'Administrateur Principal',
      email: 'admin@wao-felicitations.com',
      password: adminPassword,
      role: 'admin',
      zone: 'Kinshasa',
      isActive: true,
    },
  })

  console.log('✅ Admin user created:', admin.email)

  // Create cash registers
  console.log('💰 Creating cash registers...')
  
  const caisseGenerale = await prisma.cashRegister.upsert({
    where: { type: 'generale' },
    update: {},
    create: {
      type: 'generale',
      balance: new Decimal(0),
      name: 'Caisse Générale',
    },
  })

  const caisseProduitsCharges = await prisma.cashRegister.upsert({
    where: { type: 'produits_charges' },
    update: {},
    create: {
      type: 'produits_charges',
      balance: new Decimal(0),
      name: 'Caisse Produits & Charges',
    },
  })

  const caisseAssurance = await prisma.cashRegister.upsert({
    where: { type: 'assurance' },
    update: {},
    create: {
      type: 'assurance',
      balance: new Decimal(0),
      name: 'Caisse Assurance',
    },
  })

  console.log('✅ Cash registers created')

  console.log(`
✅ Production seed complete!

🔐 Admin Credentials:
Email: admin@wao-felicitations.com
Password: AdminProd2026!SecurePassword

⚠️  IMPORTANT: Change this password immediately after first login!
  `)

  await prisma.$disconnect()
  await pool.end()
}

main()
  .catch((e) => {
    console.error('❌ Production seed failed:', e)
    process.exit(1)
  })
