/**
 * backend-production.ts
 * Production-ready backend server with optimizations
 * Utilise .env.production pour la configuration
 */

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger .env.production pour production
config({ path: join(__dirname, '.env.production') })

import { PrismaClient } from '@prisma/client'
import Decimal from 'decimal.js'
import {
  generateToken,
  verifyPassword,
  hashPassword,
  validateEmail,
  validatePhone,
  validateMembershipCodeFormat,
} from './lib/security.ts'
import { authenticateToken, requireRole, requirePermission, validateZoneAccess, errorHandler } from './lib/middleware/auth.ts'
import {
  createClientWithCodes,
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
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
})

// ───────────────────────────────────────────────────────────────────────────
// AUTHENTICATION ROUTES
// ───────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Connexion utilisateur
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account disabled' })
    }

    const isValidPassword = await verifyPassword(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      zone: user.zone || undefined,
    })

    await logLogin(user.id, user.email)

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
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// ───────────────────────────────────────────────────────────────────────────
// CLIENT ROUTES
// ───────────────────────────────────────────────────────────────────────────

/**
 * GET /api/clients
 * Liste des clients
 */
app.get('/api/clients', authenticateToken, async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    res.json(clients)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' })
  }
})

/**
 * POST /api/clients
 * Créer un client
 */
app.post('/api/clients', authenticateToken, requireRole('admin', 'commercial'), async (req: Request, res: Response) => {
  try {
    const { name, type, phone, address, assignedCommercialId } = req.body

    if (!name || !type || !phone || !assignedCommercialId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const client = await createClientWithCodes({
      name,
      type,
      phone,
      address,
      assignedCommercialId,
    })

    await logCreateClient((req as any).user.userId, client.id)

    res.status(201).json(client)
  } catch (error) {
    console.error('Create client error:', error)
    res.status(500).json({ error: 'Failed to create client' })
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

// Error handler
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║   Wao Félicitations - PRODUCTION API Server             ║
║   Environment: ${process.env.NODE_ENV?.toUpperCase().padEnd(41)}║
╚══════════════════════════════════════════════════════════╝

Server running on http://localhost:${PORT}

✅ Authentification JWT
✅ RBAC (Role-Based Access Control)
✅ Performance optimizations enabled
✅ Database connection pooling (max: 20)

Protected routes require Authorization header:
Authorization: Bearer <token>
  `)
})

export default app
