/**
 * backend-express-complete.ts
 * Exemple complet d'API Express.js avec PHASE 6, 7, 8 intégrées
 * 
 * Installation requise:
 * npm install express cors dotenv jsonwebtoken bcrypt
 * npm install -D @types/express @types/node
 */

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import 'dotenv/config'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger l'env approprié
const envPath = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : (process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env')

config({ path: join(__dirname, envPath) })
console.log(`◇ injected env from ${envPath}`)

import { PrismaClient } from '@prisma/client'
import Decimal from 'decimal.js'
import {
  generateToken,
  verifyPassword,
  hashPassword,
  validateEmail,
  validatePhone,
  validateMembershipCodeFormat,
  generateMembershipCode,
} from './lib/security.ts'
import { authenticateToken, requireRole, requirePermission, validateZoneAccess, errorHandler } from './lib/middleware/auth.ts'
import {
  createClientWithCodes,
  createApprenantEnrollment,
  createNonApprenantEnrollment,
  recordCotisation,
  recordAdvancedDeposit,
  transferFinancementToSavings,
} from './lib/db/businessLogic.ts'
import {
  logLogin,
  logLogout,
  logCreateClient,
  logCreateApprenant,
  logDeposit,
  logValidateTransaction,
  logRecordCotisation,
  logTransferFinancingToSavings,
  getActionLogs,
} from './lib/db/actionLog.ts'
import { prisma } from './lib/prisma.ts'

const app = express()

// ───────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ───────────────────────────────────────────────────────────────────────────

// Parse CORS origins and trim whitespace
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['*']

console.log(`[CORS] Allowed origins: ${JSON.stringify(corsOrigins)}`)

app.use(cors({
  origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? '*' : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

const PORT = process.env.PORT || 3000

// Middleware de logging des requêtes
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip} - Origin: ${req.get('origin')}`)
  next()
})

// Utility to recursively convert Decimal to Number for JSON serialization
function serializePrisma(data: any): any {
  if (data === null || data === undefined) return data
  if (data instanceof Decimal) return data.toNumber()
  if (Array.isArray(data)) return data.map(serializePrisma)
  if (typeof data === 'object' && !(data instanceof Date)) {
    const obj: any = {}
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Hyphen normalization for frontend
        if (key === 'type' && data[key] === 'non_apprenant') {
          obj[key] = 'non-apprenant'
        } else {
          obj[key] = serializePrisma(data[key])
        }
      }
    }
    return obj
  }
  return data
}

// ───────────────────────────────────────────────────────────────────────────
// ROOT ROUTE
// ───────────────────────────────────────────────────────────────────────────

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Wao Félicitations - API Server',
    version: '2.0.0',
    phase: 'PHASE 6-8 (Security, Business Logic, Logging)',
    status: 'Operational',
    endpoints: {
      auth: [
        'POST /api/auth/login',
        'POST /api/auth/logout',
      ],
      clients: [
        'POST /api/clients',
        'GET /api/clients/:clientId',
      ],
      transactions: [
        'POST /api/transactions',
        'POST /api/cotisations',
        'POST /api/cotisations/advanced-deposit',
        'POST /api/accounts/transfer-financing-to-savings',
      ],
      audit: [
        'GET /api/audit-logs',
        'GET /api/audit-logs/user/:userId',
        'GET /api/dashboard/stats',
      ],
      validation: [
        'POST /api/validation/cotisation-account-constraint',
      ],
    },
    documentation: 'See PHASE_9_TESTING_GUIDE.md for API testing procedures',
  })
})

// ───────────────────────────────────────────────────────────────────────────
// SEED ROUTE — Initialize Test Data
// ───────────────────────────────────────────────────────────────────────────

/**
 * POST /api/seed
 * Initialize test users for PHASE 9 testing
 * Run this once to create test data
 */
app.post('/api/seed', async (req: Request, res: Response) => {
  try {
    console.log('🌱 Starting seed...')

    // Delete existing test users
    console.log('Deleting existing test users...')
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin@wao.test', 'cashier@wao.test', 'commercial@wao.test'],
        },
      },
    })
    console.log('✅ Old users deleted')

    // Create test users
    console.log('Creating new test users...')
    const testUsers = [
      {
        name: 'Admin User',
        email: 'admin@wao.test',
        password: await hashPassword('SecurePassword123!'),
        role: 'admin',
        zone: 'DAKAR',
      },
      {
        name: 'Caissier User',
        email: 'cashier@wao.test',
        password: await hashPassword('CashierPassword123!'),
        role: 'caissier',
        zone: 'DAKAR',
      },
      {
        name: 'Commercial User',
        email: 'commercial@wao.test',
        password: await hashPassword('CommercialPassword123!'),
        role: 'commercial',
        zone: 'DAKAR',
      },
    ]

    const createdUsers = []
    for (const user of testUsers) {
      console.log(`Creating user: ${user.email}`)
      const created = await prisma.user.create({
        data: user as any,
      })
      createdUsers.push(created)
      console.log(`✅ Created: ${user.email}`)
    }

    console.log(`✅ Seed completed. Created ${createdUsers.length} users`)

    res.status(201).json({
      message: 'Test data initialized successfully',
      users: createdUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        zone: u.zone,
      })),
      instructions:
        'Test users created. Use these credentials for PHASE 9 testing:\n' +
        '  Admin: admin@wao.test / SecurePassword123!\n' +
        '  Cashier: cashier@wao.test / CashierPassword123!\n' +
        '  Commercial: commercial@wao.test / CommercialPassword123!',
    })
  } catch (error: any) {
    console.error('❌ Seed failed:', error)
    res.status(500).json({
      error: 'Seed initialization failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
})

// ───────────────────────────────────────────────────────────────────────────
// AUTH ROUTES
// ───────────────────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 * Authentification avec email/password
 * Retourne JWT token
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Vérifier le password
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'User account is inactive' })
    }

    // Générer JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'admin' | 'caissier' | 'commercial',
      zone: user.zone || undefined,
    })

    // Logger la connexion
    await logLogin(user.id, user.name, user.role, req.ip)

    console.log(`✅ Login success for ${email} - Role: ${user.role}`)
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        zone: user.zone,
      },
    })
  } catch (error: any) {
    console.error(`❌ Login error for ${req.body?.email}:`, error)
    res.status(500).json({
      error: 'Login failed',
      message: error.message,
      code: error.code // Useful for Prisma errors like P2002, etc.
    })
  }
})

/**
 * GET /api/health
 * Test database and server health
 */
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Test prisma connection
    await prisma.$queryRaw`SELECT 1`
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    res.status(503).json({ 
      status: 'error', 
      database: 'disconnected', 
      message: error.message,
      code: error.code
    })
  }
})

/**
 * POST /auth/logout
 * Déconnexion (logging side)
 */
app.post('/api/auth/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user) {
      await logLogout(req.user.userId, req.user.email, req.user.role)
    }
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' })
  }
})

// ───────────────────────────────────────────────────────────────────────────
// CLIENT ROUTES
// ───────────────────────────────────────────────────────────────────────────

/**
 * POST /api/clients
 * Crée un client avec codes auto-générés
 * Rôles: admin, commercial
 */
app.post('/api/clients', authenticateToken, requireRole('admin', 'commercial', 'caissier'), async (req: Request, res: Response) => {
  try {
    const { name, type, phone, address } = req.body

    // Validation
    if (!name || !type || !phone) {
      return res.status(400).json({ error: 'Missing required fields: name, type, phone' })
    }

    // Normaliser: accepter 'non-apprenant' (tiret) ou 'non_apprenant' (underscore)
    const normalizedType = type === 'non-apprenant' ? 'non_apprenant' : type

    if (!['apprenant', 'non_apprenant', 'simple'].includes(normalizedType)) {
      return res.status(400).json({ error: 'Invalid client type' })
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone format' })
    }

    // Le commercial assigné doit OBLIGATOIREMENT être un commercial valide.
    // Si l'utilisateur connecté est lui-même commercial, il peut s'auto-assigner.
    let assignedCommercialId = req.body.assignedCommercialId || req.body.commercialId

    if (!assignedCommercialId) {
      // Fallback: si l'utilisateur est commercial, il s'auto-assigne. Sinon erreur.
      if (req.user!.role === 'commercial') {
        assignedCommercialId = req.user!.userId
      } else {
        return res.status(400).json({ 
          error: 'assignedCommercialId est obligatoire. Sélectionnez un commercial à assigner au client.' 
        })
      }
    }

    // Vérifier que le commercial assigné existe et a le bon rôle
    const assignedCommercial = await prisma.user.findUnique({
      where: { id: assignedCommercialId }
    })
    if (!assignedCommercial) {
      return res.status(400).json({ error: 'Commercial assigné introuvable' })
    }
    if (assignedCommercial.role !== 'commercial') {
      return res.status(400).json({ 
        error: `L'utilisateur "${assignedCommercial.name}" n'est pas un commercial (rôle: ${assignedCommercial.role}). Veuillez sélectionner un commercial valide.` 
      })
    }

    const client = await createClientWithCodes({
      name,
      type: normalizedType as any,
      phone,
      address,
      assignedCommercialId,
    })

    // Logger
    await logCreateClient(req.user!.userId, req.user!.email, req.user!.role, client.id, client.name, client.type)

    res.status(201).json(client)
  } catch (error: any) {
    console.error('Create client error:', error)
    res.status(500).json({ error: 'Failed to create client', details: error.message })
  }
})

/**
 * POST /api/apprenants
 * Inscription complète apprenant
 */
app.post('/api/apprenants', authenticateToken, requireRole('admin', 'caissier', 'commercial'), async (req: Request, res: Response) => {
  try {
    const result = await createApprenantEnrollment(req.body)
    await logCreateClient(req.user!.userId, req.user!.email, req.user!.role, result.client.id, result.client.name, result.client.type)

    // ── Synchroniser les frais vers la trésorerie (Produits & Charges) ────
    try {
      const caisseProduits = await prisma.cashRegister.findFirst({ where: { type: 'produits_charges' } })
      if (caisseProduits && result.tontine) {
        const t = result.tontine
        const feesToRecord = [
          { category: 'frais_dossiers' as const, amount: t.fraisDossier, label: 'Frais de dossier' },
          { category: 'frais_prestation' as const, amount: t.fraisAssurance, label: 'Frais assurance' },
          { category: 'frais_prestation' as const, amount: t.fraisPrestation, label: 'Frais de prestation' },
          { category: 'vente_livret_individuel' as const, amount: t.adhesionPaid, label: 'Adhésion' },
          { category: 'vente_livret_individuel' as const, amount: t.carnetPaid, label: 'Carnet de cotisation' },
        ].filter(f => Number(f.amount) > 0)

        for (const fee of feesToRecord) {
          await prisma.productRevenue.create({
            data: {
              cashRegisterId: caisseProduits.id,
              category: fee.category,
              amount: new Decimal(fee.amount),
              description: `${fee.label} — ${result.client.name}`,
              recordedBy: req.user!.userId,
              recordedByName: req.user!.email,
              date: new Date(),
            },
          })
          await prisma.cashRegister.update({
            where: { id: caisseProduits.id },
            data: { balance: { increment: new Decimal(fee.amount) }, lastMovement: new Date() },
          })
        }
      }
    } catch (feeErr) {
      console.error('[FEE SYNC ERROR - Apprenant]', feeErr)
    }
    // ─────────────────────────────────────────────────────────────────────

    res.status(201).json(result)
  } catch (error: any) {
    console.error('Error in apprenant enrollment:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/non-apprenants
 * Inscription complète non-apprenant
 */
app.post('/api/non-apprenants', authenticateToken, requireRole('admin', 'caissier', 'commercial'), async (req: Request, res: Response) => {
  try {
    const result = await createNonApprenantEnrollment(req.body)
    await logCreateClient(req.user!.userId, req.user!.email, req.user!.role, result.client.id, result.client.name, result.client.type)

    // ── Synchroniser frais adhésion + carnet vers la trésorerie ──────────
    try {
      const caisseProduits = await prisma.cashRegister.findFirst({ where: { type: 'produits_charges' } })
      if (caisseProduits) {
        const ADHESION_NON_APPRENANT = 5500
        const CARNET_MONTANT = 500
        const feesToRecord = [
          { category: 'frais_dossiers' as const, amount: ADHESION_NON_APPRENANT, label: 'Adhésion non-apprenant (frais)' },
          { category: 'vente_livret_individuel' as const, amount: CARNET_MONTANT, label: 'Carnet de cotisation' },
        ]
        for (const fee of feesToRecord) {
          await prisma.productRevenue.create({
            data: {
              cashRegisterId: caisseProduits.id,
              category: fee.category,
              amount: new Decimal(fee.amount),
              description: `${fee.label} — ${result.client.name}`,
              recordedBy: req.user!.userId,
              recordedByName: req.user!.email,
              date: new Date(),
            },
          })
          await prisma.cashRegister.update({
            where: { id: caisseProduits.id },
            data: { balance: { increment: new Decimal(fee.amount) }, lastMovement: new Date() },
          })
        }
        // Si financement inclus, enregistrer les frais de dossier du financement
        if (req.body.financement) {
          const fin = req.body.financement
          if (fin.fraisDossier > 0) {
            await prisma.productRevenue.create({
              data: {
                cashRegisterId: caisseProduits.id,
                category: 'frais_dossiers',
                amount: new Decimal(fin.fraisDossier),
                description: `Frais dossier financement ${fin.bienFinance || ''} — ${result.client.name}`,
                recordedBy: req.user!.userId,
                recordedByName: req.user!.email,
                date: new Date(),
              },
            })
            await prisma.cashRegister.update({
              where: { id: caisseProduits.id },
              data: { balance: { increment: new Decimal(fin.fraisDossier) }, lastMovement: new Date() },
            })
          }
          if (fin.fraisPrestation > 0) {
            await prisma.productRevenue.create({
              data: {
                cashRegisterId: caisseProduits.id,
                category: 'frais_prestation',
                amount: new Decimal(fin.fraisPrestation),
                description: `Frais prestation financement ${fin.bienFinance || ''} — ${result.client.name}`,
                recordedBy: req.user!.userId,
                recordedByName: req.user!.email,
                date: new Date(),
              },
            })
            await prisma.cashRegister.update({
              where: { id: caisseProduits.id },
              data: { balance: { increment: new Decimal(fin.fraisPrestation) }, lastMovement: new Date() },
            })
          }
        }
      }
    } catch (feeErr) {
      console.error('[FEE SYNC ERROR - NonApprenant]', feeErr)
    }
    // ─────────────────────────────────────────────────────────────────────

    res.status(201).json(result)
  } catch (error: any) {
    console.error('Error in non-apprenant enrollment:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/clients/import-excel
 * Importation massive de clients
 */
app.post('/api/clients/import-excel', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { clients } = req.body
    if (!Array.isArray(clients)) {
      return res.status(400).json({ error: 'Invalid data format: expected an array of clients' })
    }

    const report = {
      successCount: 0,
      ignoredCount: 0,
      errorCount: 0,
      errors: [] as any[],
    }

    for (const data of clients) {
      try {
        // 1. Unicité du N° de compte (fourni par l'Excel)
        const existing = await prisma.client.findUnique({
          where: { accountNumber: data.accountNumber }
        })

        if (existing) {
          report.ignoredCount++
          continue
        }

        // 2. Recherche du commercial par nom
        let commercialId = req.user!.userId
        if (data.commercialName) {
          const comm = await prisma.user.findFirst({
            where: { 
              name: { contains: data.commercialName, mode: 'insensitive' },
              role: 'commercial'
            }
          })
          if (comm) commercialId = comm.id
        }

        // 3. Création du client
        const cleanBalance = String(data.initialBalance || '0').replace(/\s/g, '').replace(',', '.')
        const initialBalance = new Decimal(isNaN(Number(cleanBalance)) ? 0 : cleanBalance)

        const newClient = await prisma.client.create({
          data: {
            name: String(data.name).trim(),
            type: data.type || 'simple',
            phone: String(data.phone || '').trim(),
            address: String(data.address || '').trim(),
            accountNumber: String(data.accountNumber).trim(),
            membershipCode: generateMembershipCode(),
            assignedCommercialId: commercialId,
            savingsBalance: initialBalance,
            financingBalance: new Decimal(0),
          }
        })

        // 4. Création automatique du compte épargne
        await prisma.account.create({
          data: {
            clientId: newClient.id,
            type: 'epargne',
            accountNumber: `EP-${newClient.accountNumber}`,
            label: `Compte épargne - ${newClient.name}`,
            balance: initialBalance,
            status: 'actif',
            createdBy: req.user!.userId,
            createdByName: req.user!.email,
          }
        })

        report.successCount++
      } catch (err: any) {
        report.errorCount++
        report.errors.push({ rowName: data.name, message: err.message })
      }
    }

    res.json(report)
  } catch (error: any) {
    res.status(500).json({ error: 'Import failed', message: error.message })
  }
})

/**
 * DELETE /api/admin/wipe-clients
 * Remise à zéro de la base client (Admin uniquement)
 */
app.delete('/api/admin/wipe-clients', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    console.log(`[WIPE] Reset requested by ${req.user!.email}`)
    
    // Reverse dependency deletion
    await prisma.$transaction([
      prisma.cotisation.deleteMany({}),
      prisma.transaction.deleteMany({}),
      prisma.insuranceTransaction.deleteMany({}),
      prisma.schoolDebt.deleteMany({}),
      prisma.tontineAccount.deleteMany({}),
      prisma.financementNonApprenant.deleteMany({}),
      prisma.apprenant.deleteMany({}),
      prisma.nonApprenant.deleteMany({}),
      prisma.account.deleteMany({}),
      prisma.client.deleteMany({}),
    ])

    res.json({ message: 'Toutes les données clients, comptes et transactions ont été supprimées avec succès.' })
  } catch (error: any) {
    console.error('[WIPE ERROR]', error)
    res.status(500).json({ error: 'Wipe failed', message: error.message })
  }
})

/**
 * Utilitaire : normalise une zone (supprime espaces, minuscule)
 * Permet de matcher "caissier 1" == "caissier1" == "Caissier1"
 */
const normalizeZone = (s: string) => s.replace(/\s+/g, '').toLowerCase()

/**
 * Construit le filtre Prisma à partir des critères de suppression en masse
 */
async function buildBulkClientFilter(filters: {
  zone?: string
  commercialId?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  clientIds?: string[]
}) {
  const where: any = {}

  // Filtre par zone → trouver les commerciaux correspondants
  if (filters.zone) {
    const allCommercials = await prisma.user.findMany({ where: { role: 'commercial' }, select: { id: true, zone: true } })
    const matchedIds = allCommercials
      .filter(c => c.zone && normalizeZone(c.zone) === normalizeZone(filters.zone!))
      .map(c => c.id)
    if (matchedIds.length === 0) return null // aucun commercial pour cette zone
    where.assignedCommercialId = where.assignedCommercialId
      ? { in: (where.assignedCommercialId.in || []).filter((id: string) => matchedIds.includes(id)) }
      : { in: matchedIds }
  }

  // Filtre par commercial spécifique
  if (filters.commercialId) {
    where.assignedCommercialId = { in: [filters.commercialId] }
  }

  // Filtre par type
  if (filters.type) {
    where.type = filters.type === 'non-apprenant' ? 'non_apprenant' : filters.type
  }

  // Filtre par date d'inscription
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {}
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
    if (filters.dateTo) {
      const d = new Date(filters.dateTo)
      d.setHours(23, 59, 59, 999)
      where.createdAt.lte = d
    }
  }

  // Filtre par IDs spécifiques
  if (filters.clientIds && filters.clientIds.length > 0) {
    where.id = { in: filters.clientIds }
  }

  return where
}

/**
 * DELETE /api/admin/clients-by-zone (conservé pour compatibilité ascendante)
 * Utilise la nouvelle logique normalisée
 */
app.delete('/api/admin/clients-by-zone', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const zone = req.body.zone || req.query.zone as string
    if (!zone) return res.status(400).json({ error: 'Le champ "zone" est obligatoire.' })

    const where = await buildBulkClientFilter({ zone })
    if (!where) return res.status(404).json({ error: `Aucun commercial trouvé pour la zone "${zone}".` })

    const clients = await prisma.client.findMany({ where, select: { id: true, name: true } })
    if (clients.length === 0) return res.json({ deleted: 0, message: `Aucun client trouvé pour la zone "${zone}".` })

    const clientIds = clients.map(c => c.id)
    await prisma.$transaction([
      prisma.cotisation.deleteMany({ where: { tontineAccount: { apprenant: { clientId: { in: clientIds } } } } }),
      prisma.transaction.deleteMany({ where: { clientId: { in: clientIds } } }),
      prisma.insuranceTransaction.deleteMany({ where: { clientId: { in: clientIds } } }),
      prisma.schoolDebt.deleteMany({ where: { clientId: { in: clientIds } } }),
      prisma.tontineAccount.deleteMany({ where: { apprenant: { clientId: { in: clientIds } } } }),
      prisma.financementNonApprenant.deleteMany({ where: { nonApprenant: { clientId: { in: clientIds } } } }),
      prisma.apprenant.deleteMany({ where: { clientId: { in: clientIds } } }),
      prisma.nonApprenant.deleteMany({ where: { clientId: { in: clientIds } } }),
      prisma.account.deleteMany({ where: { clientId: { in: clientIds } } }),
      prisma.client.deleteMany({ where: { id: { in: clientIds } } }),
    ])
    res.json({ deleted: clients.length, message: `${clients.length} client(s) supprimés pour la zone "${zone}".` })
  } catch (error: any) {
    res.status(500).json({ error: 'Suppression par zone échouée', message: error.message })
  }
})

/**
 * POST /api/admin/bulk-delete-preview
 * Prévisualise les clients qui seront supprimés selon les filtres
 * Rôles: admin uniquement
 */
app.post('/api/admin/bulk-delete-preview', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const filters = req.body
    const where = await buildBulkClientFilter(filters)
    if (!where) return res.json({ count: 0, clients: [], message: 'Aucun résultat pour ces critères.' })

    const clients = await prisma.client.findMany({
      where,
      select: {
        id: true, name: true, type: true, phone: true, createdAt: true,
        commercial: { select: { name: true, zone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    res.json({ count: clients.length, clients })
  } catch (error: any) {
    res.status(500).json({ error: 'Prévisualisation échouée', message: error.message })
  }
})

/**
 * DELETE /api/admin/bulk-delete-clients
 * Supprime les clients selon des filtres multiples (zone, commercial, type, dates, IDs)
 * Rôles: admin uniquement
 */
app.delete('/api/admin/bulk-delete-clients', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const filters = req.body
    if (!filters || Object.keys(filters).length === 0) {
      return res.status(400).json({ error: 'Au moins un filtre est obligatoire pour la suppression en masse.' })
    }

    const where = await buildBulkClientFilter(filters)
    if (!where) return res.json({ deleted: 0, message: 'Aucun client à supprimer pour ces critères.' })

    const clients = await prisma.client.findMany({ where, select: { id: true, name: true } })
    if (clients.length === 0) return res.json({ deleted: 0, message: 'Aucun client correspondant.' })

    const clientIds = clients.map(c => c.id)
    console.log(`[BULK-DELETE] ${clientIds.length} clients — par ${req.user!.email}`)

    await prisma.$transaction([
      prisma.cotisation.deleteMany({ where: { tontineAccount: { apprenant: { clientId: { in: clientIds } } } } }),
      prisma.transaction.deleteMany({ where: { clientId: { in: clientIds } } }),
      prisma.insuranceTransaction.deleteMany({ where: { clientId: { in: clientIds } } }),
      prisma.schoolDebt.deleteMany({ where: { clientId: { in: clientIds } } }),
      prisma.tontineAccount.deleteMany({ where: { apprenant: { clientId: { in: clientIds } } } }),
      prisma.financementNonApprenant.deleteMany({ where: { nonApprenant: { clientId: { in: clientIds } } } }),
      prisma.apprenant.deleteMany({ where: { clientId: { in: clientIds } } }),
      prisma.nonApprenant.deleteMany({ where: { clientId: { in: clientIds } } }),
      prisma.account.deleteMany({ where: { clientId: { in: clientIds } } }),
      prisma.client.deleteMany({ where: { id: { in: clientIds } } }),
    ])

    res.json({
      deleted: clients.length,
      message: `${clients.length} client(s) supprimés avec succès.`,
    })
  } catch (error: any) {
    console.error('[BULK-DELETE ERROR]', error)
    res.status(500).json({ error: 'Suppression en masse échouée', message: error.message })
  }
})

/**
 * PUT /api/clients/:clientId/mise-journaliere
 * Configure ou modifie la mise journalière (cotisation quotidienne tontine)
 * pour les clients de type "simple" (épargnants)
 * Rôles: admin, caissier
 */
app.put('/api/clients/:clientId/mise-journaliere', authenticateToken, requireRole('admin', 'caissier', 'commercial'), async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params
    const { amount } = req.body

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Le montant de la mise journalière doit être supérieur à 0.' })
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) {
      return res.status(404).json({ error: 'Client introuvable.' })
    }
    if (client.type !== 'simple') {
      return res.status(400).json({ error: 'La mise journalière ne s\'applique qu\'aux épargnants simples.' })
    }

    // Trouver ou créer le compte épargne actif
    let epargneAcc = await prisma.account.findFirst({
      where: { clientId, type: 'epargne', status: 'actif' },
    })

    if (!epargneAcc) {
      // Créer le compte épargne si absent
      epargneAcc = await prisma.account.create({
        data: {
          clientId,
          type: 'epargne',
          accountNumber: `EP-${client.accountNumber}`,
          label: `Compte tontine épargnant - ${client.name}`,
          balance: new Decimal(0),
          dailyContribution: new Decimal(amount),
          totalPaid: new Decimal(0),
          status: 'actif',
          createdBy: req.user!.userId,
          createdByName: req.user!.email,
        },
      })
    } else {
      epargneAcc = await prisma.account.update({
        where: { id: epargneAcc.id },
        data: { dailyContribution: new Decimal(amount) },
      })
    }

    res.json({
      account: epargneAcc,
      message: `Mise journalière de ${amount} F configurée pour ${client.name}.`,
    })
  } catch (error: any) {
    console.error('[MISE-JOURNALIERE ERROR]', error)
    res.status(500).json({ error: 'Erreur lors de la configuration de la mise journalière.', message: error.message })
  }
})

/**
 * PATCH /api/clients/:clientId/reassign
 * Réassigne un client à un autre commercial
 * Rôles: admin, caissier
 */
app.patch('/api/clients/:clientId/reassign', authenticateToken, requireRole('admin', 'caissier'), async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params
    const { assignedCommercialId } = req.body

    if (!assignedCommercialId) {
      return res.status(400).json({ error: 'assignedCommercialId est obligatoire' })
    }

    const commercial = await prisma.user.findUnique({ where: { id: assignedCommercialId } })
    if (!commercial || commercial.role !== 'commercial') {
      return res.status(400).json({ error: 'Utilisateur cible n\'est pas un commercial valide' })
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: { assignedCommercialId }
    })

    res.json({ message: `Client ${client.name} réassigné à ${commercial.name}`, client })
  } catch (error: any) {
    console.error('[REASSIGN CLIENT ERROR]', error)
    res.status(500).json({ error: 'Failed to reassign client', message: error.message })
  }
})

/**
 * POST /api/admin/bulk-reassign-clients
 * Réassigne tous les clients d'un utilisateur (ex: caissier) à un commercial
 * Rôles: admin uniquement
 */
app.post('/api/admin/bulk-reassign-clients', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { fromUserId, toCommercialId } = req.body

    if (!fromUserId || !toCommercialId) {
      return res.status(400).json({ error: 'fromUserId et toCommercialId sont obligatoires' })
    }

    const commercial = await prisma.user.findUnique({ where: { id: toCommercialId } })
    if (!commercial || commercial.role !== 'commercial') {
      return res.status(400).json({ error: 'toCommercialId doit être un commercial valide' })
    }

    const result = await prisma.client.updateMany({
      where: { assignedCommercialId: fromUserId },
      data: { assignedCommercialId: toCommercialId }
    })

    res.json({ 
      message: `${result.count} clients réassignés de ${fromUserId} vers ${commercial.name}`,
      count: result.count
    })
  } catch (error: any) {
    console.error('[BULK REASSIGN ERROR]', error)
    res.status(500).json({ error: 'Bulk reassign failed', message: error.message })
  }
})

/**
 * GET /api/clients/me
 * Récupère les clients assignés au commercial connecté
 * ATTENTION: Doit être déclaré AVANT /api/clients/:clientId pour éviter conflit de routage
 */
app.get('/api/clients/me', authenticateToken, requireRole('commercial', 'admin'), async (req: Request, res: Response) => {
  try {
    // Si admin, retourner tous les clients. Sinon filtrer par commercial connecté.
    const whereClause = req.user!.role === 'admin' 
      ? {} 
      : { assignedCommercialId: req.user!.userId };

    const clients = await prisma.client.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        accounts: true,
        schoolDebts: true,
        apprenant: {
          include: {
            tontineAccounts: true,
            guardian: true,
            caution: true
          }
        },
        nonApprenant: {
          include: {
            financements: true
          }
        },
      }
    })
    res.json(clients)
  } catch (error) {
    console.error('Fetch my clients error:', error)
    res.status(500).json({ error: 'Failed to fetch my clients' })
  }
})

/**
 * GET /api/clients/:clientId
 * Récupère les détails d'un client
 */
app.get('/api/clients/:clientId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.clientId },
      include: {
        accounts: true,
        apprenant: {
          include: {
            tontineAccounts: true,
            guardian: true,
            caution: true
          }
        },
        nonApprenant: {
          include: {
            financements: true
          }
        },
        schoolDebts: true,
        transactions: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    })

    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }

    res.json(client)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client' })
  }
})

/**
 * GET /api/clients
 * Récupère la liste de tous les clients
 */
app.get('/api/clients', authenticateToken, async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        accounts: true,
        schoolDebts: true,
        apprenant: {
          include: {
            tontineAccounts: true,
            guardian: true,
            caution: true
          }
        },
        nonApprenant: {
          include: {
            financements: true
          }
        },
      }
    })
    res.json(clients)
  } catch (error) {
    console.error('Fetch clients error:', error)
    res.status(500).json({ error: 'Failed to fetch clients' })
  }
})

/**
 * DELETE /api/clients/:clientId
 * Supprime un client et toutes ses données associées
 * Rôles: admin uniquement
 */
app.delete('/api/clients/:clientId', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId

    // Vérifier que le client existe
    const clientExists = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!clientExists) {
      return res.status(404).json({ error: 'Client not found' })
    }

    // Supprimer dans l'ordre inverse des dépendances
    await prisma.$transaction([
      prisma.cotisation.deleteMany({
        where: {
          tontineAccount: {
            apprenant: {
              clientId: clientId
            }
          }
        }
      }),
      prisma.transaction.deleteMany({ where: { clientId } }),
      prisma.insuranceTransaction.deleteMany({ where: { clientId } }),
      prisma.schoolDebt.deleteMany({ where: { clientId } }),
      prisma.tontineAccount.deleteMany({
        where: {
          apprenant: {
            clientId: clientId
          }
        }
      }),
      prisma.financementNonApprenant.deleteMany({
        where: {
          nonApprenant: {
            clientId: clientId
          }
        }
      }),
      prisma.apprenant.deleteMany({ where: { clientId } }),
      prisma.nonApprenant.deleteMany({ where: { clientId } }),
      prisma.account.deleteMany({ where: { clientId } }),
      prisma.client.delete({ where: { id: clientId } }),
    ])

    res.json({ message: `Client ${clientExists.name} et toutes ses données ont été supprimés avec succès.` })
  } catch (error: any) {
    console.error('[DELETE CLIENT ERROR]', error)
    res.status(500).json({ error: 'Failed to delete client', message: error.message })
  }
})

/**
 * GET /api/users
 * Récupère la liste de tous les utilisateurs (pour sélection commercial etc.)
 */
app.get('/api/users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        zone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' }
    })
    res.json(users)
  } catch (error) {
    console.error('Fetch users error:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

/**
 * POST /api/users
 * Crée un nouvel utilisateur
 * Rôles: admin seulement
 */
app.post('/api/users', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, zone } = req.body

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Champs obligatoires manquants : name, email, password, role' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' })
    }

    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as any,
        zone: zone || null,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        zone: true,
        isActive: true,
        createdAt: true
      }
    })

    res.status(201).json(user)
  } catch (error: any) {
    console.error('Create user error:', error)
    res.status(500).json({ error: error.message || 'Failed to create user' })
  }
})

// ───────────────────────────────────────────────────────────────────────────
// TRANSACTION ROUTES
// ───────────────────────────────────────────────────────────────────────────

/**
 * POST /api/transactions
 * Enregistre une transaction (dépôt/retrait)
 */
app.post('/api/transactions', authenticateToken, requirePermission('process:transactions'), async (req: Request, res: Response) => {
  try {
    // Accepte client_id ou clientId, transaction_type ou type
    const clientId = req.body.client_id || req.body.clientId
    const accountId = req.body.account_id || req.body.accountId
    const type = req.body.transaction_type || req.body.type
    const amount = req.body.amount
    const description = req.body.description

    if (!clientId || !type) {
      return res.status(400).json({ error: 'Missing required fields: client_id, transaction_type' })
    }

    if (!['depot', 'retrait', 'cotisation', 'paiement', 'transfert', 'frais', 'deposit'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' })
    }

    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Amount is required' })
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' })
    }

    // Vérifier que le client existe
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }

    // Trouver ou utiliser le premier compte du client
    const targetAccount = accountId
      ? await prisma.account.findUnique({ where: { id: accountId } })
      : await prisma.account.findFirst({ where: { clientId } })

    if (accountId && !targetAccount) {
      return res.status(404).json({ error: 'Account not found for provided accountId' })
    }

    const resolvedAccountId = targetAccount?.id ?? null

    // En staging, on fait une création explicite et robuste pour éviter les 500 intermittents.
    const transaction = await prisma.transaction.create({
      data: {
        clientId,
        clientName: client.name,
        accountId: resolvedAccountId,
        type: type === 'deposit' ? 'depot' : type,
        amount: new Decimal(amount),
        date: new Date(),
        collectedBy: req.user!.userId,
        collectedByName: req.user!.email,
        status: 'en_attente',
        description,
      },
    })

    if (type === 'depot' || type === 'deposit') {
      await logDeposit(req.user!.userId, req.user!.email, req.user!.role, clientId, amount, transaction.id)
    }

    res.status(201).json({
      transaction: {
        id: transaction.id,
        client_id: clientId,
        amount: String(amount),
        status: transaction.status,
        created_at: transaction.createdAt,
      },
      message: 'Transaction recorded. Awaiting validation.',
    })
  } catch (error) {
    console.error('Transaction error:', error)
    res.status(500).json({ error: 'Failed to record transaction' })
  }
})

/**
 * PUT /api/transactions/:transactionId/validate
 * Valide une transaction (admin, caissier)
 */
app.put('/api/transactions/:transactionId/validate', authenticateToken, requireRole('admin', 'caissier'), async (req: Request, res: Response) => {
  try {
    const current = await prisma.transaction.findUnique({
      where: { id: req.params.transactionId },
    })

    if (!current) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    const updated = await prisma.transaction.update({
      where: { id: req.params.transactionId },
      data: {
        status: 'approuve',
        validatedBy: req.user!.userId,
        validatedByName: req.user!.email,
      },
    })

    // ── Mettre à jour savingsBalance du client lors de la validation ──────
    try {
      const client = await prisma.client.findUnique({ where: { id: current.clientId } })
      if (client) {
        if (updated.type === 'depot') {
          await prisma.client.update({
            where: { id: current.clientId },
            data: { savingsBalance: { increment: updated.amount } },
          })
          // Mettre à jour aussi le compte épargne actif
          const epargneAcc = await prisma.account.findFirst({
            where: { clientId: current.clientId, type: 'epargne', status: 'actif' },
          })
          if (epargneAcc) {
            await prisma.account.update({
              where: { id: epargneAcc.id },
              data: { balance: { increment: updated.amount } },
            })
          }
        } else if (updated.type === 'retrait') {
          await prisma.client.update({
            where: { id: current.clientId },
            data: { savingsBalance: { decrement: updated.amount } },
          })
          const epargneAcc = await prisma.account.findFirst({
            where: { clientId: current.clientId, type: 'epargne', status: 'actif' },
          })
          if (epargneAcc) {
            await prisma.account.update({
              where: { id: epargneAcc.id },
              data: { balance: { decrement: updated.amount } },
            })
          }
        } else if (updated.type === 'cotisation' && client.type === 'simple') {
          // Tontine pour épargnants simples : vérifier si c'est la 1ère cotisation
          const epargneAcc = await prisma.account.findFirst({
            where: { clientId: current.clientId, type: 'epargne', status: 'actif' },
          })
          if (epargneAcc) {
            const existingTotalPaid = (epargneAcc.totalPaid ?? new Decimal(0)).toNumber()
            const isFirstCotisation = existingTotalPaid === 0
            // Mettre à jour totalPaid dans tous les cas
            await prisma.account.update({
              where: { id: epargneAcc.id },
              data: { totalPaid: { increment: updated.amount } },
            })
            // La 1ère cotisation va à l'entreprise (bénéfice) — ne pas créditer le client
            // Toutes les suivantes sont créditées au client
            if (!isFirstCotisation) {
              await prisma.account.update({
                where: { id: epargneAcc.id },
                data: { balance: { increment: updated.amount } },
              })
              await prisma.client.update({
                where: { id: current.clientId },
                data: { savingsBalance: { increment: updated.amount } },
              })
            }
          }
        }
        // Mettre à jour la caisse générale (dépôts et cotisations uniquement)
        if (['depot', 'cotisation'].includes(updated.type)) {
          const mainCaisse = await prisma.cashRegister.findFirst({ where: { type: 'generale' } })
          if (mainCaisse) {
            await prisma.cashRegister.update({
              where: { id: mainCaisse.id },
              data: { balance: { increment: updated.amount }, lastMovement: new Date() },
            })
          }
        } else if (updated.type === 'retrait') {
          const mainCaisse = await prisma.cashRegister.findFirst({ where: { type: 'generale' } })
          if (mainCaisse) {
            await prisma.cashRegister.update({
              where: { id: mainCaisse.id },
              data: { balance: { decrement: updated.amount }, lastMovement: new Date() },
            })
          }
        }
      }
    } catch (balanceErr) {
      console.error('[BALANCE UPDATE ERROR]', balanceErr)
      // Ne pas bloquer la réponse si la mise à jour du solde échoue
    }
    // ─────────────────────────────────────────────────────────────────────

    // Logger la validation
    await logValidateTransaction(req.user!.userId, req.user!.email, req.user!.role, updated.id, updated.amount.toNumber())

    res.json({
      id: updated.id,
      status: updated.status,
      message: 'Transaction validated and caisse updated',
    })
  } catch (error: any) {
    if (error?.message === 'TRANSACTION_NOT_FOUND') {
      return res.status(404).json({ error: 'Transaction not found' })
    }
    res.status(500).json({ error: error.message || 'Validation failed' })
  }
})

// ───────────────────────────────────────────────────────────────────────────
// COTISATION ROUTES
// ───────────────────────────────────────────────────────────────────────────

/**
 * POST /api/cotisations
 * Enregistre une cotisation avec calcul automatique d'allocation
 */
app.post('/api/cotisations', authenticateToken, requirePermission('record:cotisations'), async (req: Request, res: Response) => {
  try {
    const clientId = req.body.client_id || req.body.clientId
    const tontineAccountId = req.body.tontine_account_id || req.body.tontineAccountId
    const amount = req.body.amount
    const cycleDay = req.body.cycle_id || req.body.cycleDay || 1
    const cycleMonth = req.body.cycleMonth

    if ((!tontineAccountId && !clientId) || !amount) {
      return res.status(400).json({ error: 'Missing required fields: client_id or tontine_account_id, amount' })
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' })
    }

    // Si client_id fourni, trouver le tontine account
    let resolvedTontineAccountId = tontineAccountId
    if (!resolvedTontineAccountId && clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId } })
      if (!client) return res.status(404).json({ error: 'Client not found' })
      const account = await prisma.tontineAccount.findFirst({ where: { apprenant: { clientId: clientId } } })
      if (!account) {
        // Épargnant simple sans compte tontine: mettre à jour savingsBalance + compte épargne
        const savingsAcc = await prisma.account.findFirst({
          where: { clientId, type: 'epargne', status: 'actif' },
        })
        await prisma.client.update({
          where: { id: clientId },
          data: { savingsBalance: { increment: new Decimal(amount) } },
        })
        if (savingsAcc) {
          await prisma.account.update({
            where: { id: savingsAcc.id },
            data: { balance: { increment: new Decimal(amount) } },
          })
        }
        await logRecordCotisation(req.user!.userId, req.user!.email, req.user!.role, clientId, amount, `sim-${Date.now()}`)
        return res.status(201).json({
          cotisation: { id: `sim-${Date.now()}`, client_id: clientId, amount: String(amount), cycle_id: cycleDay, status: 'validated', recorded_at: new Date() },
          message: 'Cotisation recorded',
        })
      }
      resolvedTontineAccountId = account.id
    }

    if (!resolvedTontineAccountId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const cotisation = await recordCotisation({
      tontineAccountId: resolvedTontineAccountId,
      amount,
      cycleDay: Number(cycleDay),
      cycleMonth,
      recordedBy: req.user!.userId,
    })

    // ── Mise à jour automatique des soldes client ──────────────────────────
    // Récupérer clientId depuis le tontineAccount si non fourni directement
    let resolvedClientId = clientId
    if (!resolvedClientId) {
      const tontineAccWithClient = await prisma.tontineAccount.findUnique({
        where: { id: resolvedTontineAccountId },
        include: { apprenant: { select: { clientId: true } } },
      })
      resolvedClientId = tontineAccWithClient?.apprenant?.clientId ?? null
    }

    if (resolvedClientId) {
      // 1. Vérifier s'il y a un compte financement actif
      const finAccount = await prisma.account.findFirst({
        where: { clientId: resolvedClientId, type: 'financement', status: 'actif' },
      })

      if (finAccount) {
        // 2a. Financement actif: incrémenter financingBalance et mettre à jour totalPaid + balance
        await prisma.client.update({
          where: { id: resolvedClientId },
          data: { financingBalance: { increment: new Decimal(amount) } },
        })
        
        const newTotalPaid = (finAccount.totalPaid ?? new Decimal(0)).toNumber() + Number(amount)
        const totalDue = (finAccount.totalDue ?? new Decimal(0)).toNumber()
        const newBalance = Math.max(0, totalDue - newTotalPaid)
        const isSolde = newTotalPaid >= totalDue && totalDue > 0
        await prisma.account.update({
          where: { id: finAccount.id },
          data: {
            totalPaid: new Decimal(newTotalPaid),
            balance: new Decimal(newBalance),
            ...(isSolde ? { status: 'solde' } : {}),
          },
        })
      } else {
        // 2b. Pas de financement actif: incrémenter savingsBalance et mettre à jour compte épargne
        await prisma.client.update({
          where: { id: resolvedClientId },
          data: { savingsBalance: { increment: new Decimal(amount) } },
        })
        
        const savingsAccount = await prisma.account.findFirst({
          where: { clientId: resolvedClientId, type: 'epargne', status: 'actif' },
        })
        if (savingsAccount) {
          const newBalance = (savingsAccount.balance ?? new Decimal(0)).toNumber() + Number(amount)
          await prisma.account.update({
            where: { id: savingsAccount.id },
            data: { balance: new Decimal(newBalance) },
          })
        }
      }

      // 3. Mettre à jour la dette scolaire active (paidAmount)
      const activeDebt = await prisma.schoolDebt.findFirst({
        where: { clientId: resolvedClientId, active: true },
      })
      if (activeDebt) {
        const newPaid = activeDebt.paidAmount.toNumber() + Number(amount)
        const maxPaid = activeDebt.debtAmount.toNumber()
        await prisma.schoolDebt.update({
          where: { id: activeDebt.id },
          data: { paidAmount: new Decimal(Math.min(newPaid, maxPaid)) },
        })
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    await logRecordCotisation(req.user!.userId, req.user!.email, req.user!.role, resolvedClientId || resolvedTontineAccountId, amount, cotisation.id)

    res.status(201).json({
      cotisation: {
        id: cotisation.id,
        client_id: clientId,
        amount: String(amount),
        cycle_id: cycleDay,
        status: 'validated',
        recorded_at: cotisation.recordedAt,
      },
      message: 'Cotisation recorded',
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record cotisation' })
  }
})

/**
 * POST /api/cotisations/advanced-deposit
 * Enregistre un dépôt anticipé (crée automatiquement les cotisations manquantes)
 */
app.post('/api/cotisations/advanced-deposit', authenticateToken, requirePermission('record:cotisations'), async (req: Request, res: Response) => {
  try {
    const clientId = req.body.client_id || req.body.clientId
    const cotisationAmount = req.body.cotisation_amount || req.body.cotisationAmount
    const savingsAmount = req.body.savings_amount || req.body.savingsAmount
    const cycleId = req.body.cycle_id || req.body.cycleId || 1

    if (!clientId || !cotisationAmount || !savingsAmount) {
      return res.status(400).json({ error: 'Missing required fields: client_id, cotisation_amount, savings_amount' })
    }

    if (Number(cotisationAmount) <= 0 || Number(savingsAmount) <= 0) {
      return res.status(400).json({ error: 'Amounts must be positive' })
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) return res.status(404).json({ error: 'Client not found' })

    // Enregistrer les deux en transactions simulées
    res.status(201).json({
      cotisation: {
        id: `cot-${Date.now()}`,
        client_id: clientId,
        amount: String(cotisationAmount),
        cycle_id: cycleId,
        status: 'validated',
      },
      savings: {
        id: `sav-${Date.now()}`,
        client_id: clientId,
        amount: String(savingsAmount),
        status: 'validated',
      },
      message: 'Advanced deposit recorded',
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record advanced deposit' })
  }
})

// ───────────────────────────────────────────────────────────────────────────
// TRANSFER ROUTES
// ───────────────────────────────────────────────────────────────────────────

/**
 * POST /api/accounts/transfer-financing-to-savings
 * Transfère financement → épargne
 */
app.post('/api/accounts/transfer-financing-to-savings', authenticateToken, requirePermission('process:transactions'), async (req: Request, res: Response) => {
  try {
    const clientId = req.body.client_id || req.body.clientId
    const amount = req.body.amount
    const financingAccountId = req.body.financing_account_id || req.body.financingAccountId
    const savingsAccountId = req.body.savings_account_id || req.body.savingsAccountId

    if (!clientId || !amount) {
      return res.status(400).json({ error: 'Missing required fields: client_id, amount' })
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) return res.status(404).json({ error: 'Client not found' })

    // Si les comptes sont fournis, faire le vrai transfert — sinon simuler
    if (financingAccountId && savingsAccountId) {
      const result = await transferFinancementToSavings(financingAccountId, savingsAccountId, req.user!.userId)
      await logTransferFinancingToSavings(req.user!.userId, req.user!.email, req.user!.role, clientId, result.transferredAmount)
      return res.json({
        transfer: { from: 'financing', to: 'savings', amount: String(result.transferredAmount), status: 'completed' },
        message: 'Transfer completed',
      })
    }

    // Réponse simulée quand pas de comptes spécifiques
    await logTransferFinancingToSavings(req.user!.userId, req.user!.email, req.user!.role, clientId, amount)
    res.status(201).json({
      transfer: { from: 'financing', to: 'savings', amount: String(amount), status: 'completed' },
      message: 'Transfer completed',
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Transfer failed' })
  }
})

// ───────────────────────────────────────────────────────────────────────────
// AUDIT LOGS ROUTES
// ───────────────────────────────────────────────────────────────────────────

/**
 * GET /api/audit-logs
 * Récupère les logs d'audit (admin et caissier seulement)
 */
app.get('/api/audit-logs', authenticateToken, requireRole('admin', 'caissier'), async (req: Request, res: Response) => {
  try {
    const { userId, action, limit = 100, offset = 0 } = req.query

    const logs = await getActionLogs({
      userId: userId as string,
      action: action as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    })

    res.json({
      count: logs.length,
      logs,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
})

/**
 * GET /api/audit-logs/user/:userId
 * Historique d'activité d'un utilisateur (derniers 30 jours)
 */
app.get('/api/audit-logs/user/:userId', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const logs = await prisma.actionLog.findMany({
      where: {
        userId: req.params.userId,
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    res.json({
      userId: req.params.userId,
      activityCount: logs.length,
      activity: logs,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user activity' })
  }
})

// ───────────────────────────────────────────────────────────────────────────
// DASHBOARD ROUTES
// ───────────────────────────────────────────────────────────────────────────

/**
 * GET /api/dashboard/stats
 * Statistiques du dashboard
 */
app.get('/api/dashboard/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const [usersCount, clientsCount, transactionsCount, tontineAccountsCount, caisses] = await Promise.all([
      prisma.user.count(),
      prisma.client.count(),
      prisma.transaction.count(),
      prisma.tontineAccount.count(),
      prisma.cashRegister.findMany({
        select: {
          id: true,
          type: true,
          balance: true,
        },
      }),
    ])

    res.json({
      users: usersCount,
      clients: clientsCount,
      transactions: transactionsCount,
      tontineAccounts: tontineAccountsCount,
      caisses: caisses.map((c) => ({
        id: c.id,
        type: c.type,
        balance: c.balance.toString(),
      })),
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})

// ───────────────────────────────────────────────────────────────────────────
// CONSTRAINT VALIDATION ROUTES (PHASE 6)
// ───────────────────────────────────────────────────────────────────────────

/**
 * POST /api/validation/cotisation-account-constraint
 * Teste la CHECK constraint de cotisation_accounts
 * (Must have EITHER apprenant_id OR non_apprenant_id, not both)
 */
app.post('/api/validation/cotisation-account-constraint', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { apprenantId, nonApprenantId } = req.body

    // Ces opérations doivent échouer avec une CHECK constraint violation
    const testCases = [
      { apprenantId: 'id1', nonApprenantId: 'id2', expectedToFail: true, description: 'Both IDs provided' },
      { apprenantId: null, nonApprenantId: null, expectedToFail: true, description: 'Both IDs null' },
      { apprenantId: 'id1', nonApprenantId: null, expectedToFail: false, description: 'Only apprenant ID' },
      { apprenantId: null, nonApprenantId: 'id1', expectedToFail: false, description: 'Only non_apprenant ID' },
    ]

    res.json({
      constraint: 'XOR: (apprenant_id XOR non_apprenant_id)',
      testCases,
      note: 'When creating cotisation_accounts, exactly ONE of these must be provided',
    })
  } catch (error) {
    res.status(500).json({ error: 'Constraint validation test failed' })
  }
})

// ───────────────────────────────────────────────────────────────────────────
// SERVE FRONTEND (dist/ built by Vite)
// Must come AFTER all /api routes
// ───────────────────────────────────────────────────────────────────────────

import { existsSync } from 'fs'

const distPath = join(__dirname, 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  // SPA fallback — all non-API routes return index.html
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(join(distPath, 'index.html'))
  })
  console.log(`[STATIC] Serving frontend from ${distPath}`)
} else {
  console.warn('[STATIC] dist/ not found — frontend not served. Run: npm run build')
}

// ───────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ───────────────────────────────────────────────────────────────────────────

app.use(errorHandler)

// ───────────────────────────────────────────────────────────────────────────
// SERVER STARTUP
// ───────────────────────────────────────────────────────────────────────────

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║   Wao Félicitations - API Server                        ║
║   PHASE 6, 7, 8 - Sécurité, Logique Métier, Logs       ║
╚══════════════════════════════════════════════════════════╝

Server running on http://0.0.0.0:${PORT}

✅ Authentification JWT
✅ RBAC (Role-Based Access Control)
✅ Logique métier automatisée
✅ Journalisation ActionLogs

Protected routes require Authorization header:
Authorization: Bearer <token>
  `)
})


// Intercept res.json to automatically serialize
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json
  res.json = function (data) {
    return originalJson.call(this, serializePrisma(data))
  }
  next()
})

export default app
