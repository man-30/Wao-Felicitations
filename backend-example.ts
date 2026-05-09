/**
 * Exemple d'API Backend Express avec Prisma
 * À créer dans un dossier séparé: backend/server.ts
 * 
 * Installation:
 * npm install express cors dotenv bcryptjs jsonwebtoken
 * npm install -D ts-node @types/express
 * 
 * Usage: npx ts-node backend/server.ts
 */

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import { hash, compare } from 'bcryptjs'
import {
  prisma,
  userService,
  clientService,
  transactionService,
  apprenantService,
  tontineService,
  User,
  UserRole,
} from '../lib/db'

dotenv.config()

const app = express()
const PORT = process.env.API_PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key'

// ─── MIDDLEWARE ────────────────────────────────────────────────────────

app.use(cors())
app.use(express.json())

// Authentification JWT
interface AuthRequest extends Request {
  user?: User
}

const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization']
  const token = authHeader?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  jwt.verify(token, JWT_SECRET, (err, user: any) => {
    if (err) return res.status(403).json({ error: 'Token invalide' })
    req.user = user
    next()
  })
}

// ─── ROUTES AUTHENTIFICATION ───────────────────────────────────────────

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const user = await userService.findByEmail(email)
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    // ⚠️ En production, utiliser bcryptjs.compare()
    const passwordMatch = password === user.password

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
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
    res.status(500).json({ error: error.message })
  }
})

// ─── ROUTES CLIENTS ───────────────────────────────────────────────────

// GET /api/clients - Lister les clients
app.get('/api/clients', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { type, search, commercialId } = req.query

    const clients = await clientService.findMany({
      type: type as any,
      search: search as string,
      assignedCommercialId:
        req.user?.role === 'commercial' ? req.user.id : (commercialId as string),
    })

    res.json({
      success: true,
      data: clients,
      count: clients.length,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/clients - Créer un client
app.post('/api/clients', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'commercial') {
      return res.status(403).json({ error: 'Permission refusée' })
    }

    const client = await clientService.create(req.body)

    // Log action
    await prisma.actionLog.create({
      data: {
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role as UserRole,
        action: 'Création Client',
        details: `Création du client ${client.name} (${client.membershipCode})`,
        timestamp: new Date(),
      },
    })

    res.status(201).json({
      success: true,
      data: client,
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// GET /api/clients/:id - Récupérer un client
app.get('/api/clients/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const client = await clientService.findById(req.params.id)
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' })
    }
    res.json({ success: true, data: client })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ─── ROUTES APPRENANTS ────────────────────────────────────────────────

// POST /api/apprenants - Enrôler un apprenant
app.post('/api/apprenants', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'commercial') {
      return res.status(403).json({ error: 'Permission refusée' })
    }

    const {
      clientId,
      studentName,
      schoolName,
      schoolLevel,
      schoolYear,
      fraisScolarite,
      guardianData,
      cautionData,
    } = req.body

    // Créer tuteur et caution
    const guardian = await prisma.guardian.create({
      data: guardianData,
    })
    const caution = await prisma.caution.create({
      data: cautionData,
    })

    // Créer apprenant
    const apprenant = await apprenantService.create({
      clientId,
      studentName,
      schoolName,
      schoolLevel,
      schoolYear,
      guardianId: guardian.id,
      cautionId: caution.id,
      documents: [
        { key: 'acte_naissance', label: 'Acte de naissance', status: 'en_attente' },
        { key: 'photos', label: '2 photos passeport', status: 'en_attente' },
        { key: 'piece_parent', label: 'Pièce parent', status: 'en_attente' },
        { key: 'piece_caution', label: 'Pièce caution', status: 'en_attente' },
      ],
      createdBy: req.user!.id,
    })

    // Calculer grille tarifaire (depuis votre logique métier)
    // const { calculerGrille } = require('../src/grille')
    // const grilleCalcul = calculerGrille(fraisScolarite)

    // Créer compte tontine (exemple simplifié)
    const tontineAccount = await tontineService.create({
      apprenantId: apprenant.id,
      numero: `TON-${Date.now()}`,
      schoolName,
      schoolLevel,
      fraisScolarite,
      grilleNumero: 8, // À calculer réellement
      fraisDossier: 1000,
      fraisAssurance: 1000,
      fraisPrestation: 13500,
      cotisationJournaliere: 500,
      totalCapital: fraisScolarite + 1000 + 1000,
      totalJours: 120,
    })

    // Log action
    await prisma.actionLog.create({
      data: {
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role as UserRole,
        action: 'Enrôlement Apprenant',
        details: `Enrôlement de ${studentName} à ${schoolName}`,
        timestamp: new Date(),
      },
    })

    res.status(201).json({
      success: true,
      data: {
        apprenant,
        tontineAccount,
      },
    })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// GET /api/apprenants - Lister les apprenants
app.get('/api/apprenants', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const apprenants = await apprenantService.findMany()
    res.json({ success: true, data: apprenants, count: apprenants.length })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ─── ROUTES TRANSACTIONS ──────────────────────────────────────────────

// POST /api/transactions - Créer une transaction
app.post('/api/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!['caissier', 'commercial'].includes(req.user?.role!)) {
      return res.status(403).json({ error: 'Permission refusée' })
    }

    const transaction = await transactionService.create({
      ...req.body,
      collectedBy: req.user!.id,
      collectedByName: req.user!.name,
    })

    res.status(201).json({ success: true, data: transaction })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// PUT /api/transactions/:id/validate - Valider une transaction
app.put(
  '/api/transactions/:id/validate',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (req.user?.role !== 'caissier') {
        return res.status(403).json({ error: 'Permission refusée' })
      }

      const transaction = await transactionService.updateStatus(
        req.params.id,
        req.body.status,
        req.user.id,
        req.user.name
      )

      await prisma.actionLog.create({
        data: {
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role as UserRole,
          action: `Validation Transcation - ${req.body.status}`,
          details: `Transaction ${req.params.id}`,
          transactionId: req.params.id,
          timestamp: new Date(),
        },
      })

      res.json({ success: true, data: transaction })
    } catch (error) {
      res.status(400).json({ error: error.message })
    }
  }
)

// GET /api/transactions - Lister les transactions
app.get('/api/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, type, status } = req.query

    const transactions = await transactionService.findMany({
      clientId: clientId as string,
      type: type as any,
      status: status as any,
    })

    res.json({
      success: true,
      data: transactions,
      count: transactions.length,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ─── ROUTES TONTINE ───────────────────────────────────────────────────

// GET /api/tontine/stats - Statistiques tontine
app.get('/api/tontine/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await tontineService.getStats()
    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ─── ROUTES ADMIN ──────────────────────────────────────────────────────

// GET /api/users - Lister les utilisateurs (admin only)
app.get('/api/users', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Permission refusée' })
    }

    const users = await userService.findMany()
    res.json({ success: true, data: users, count: users.length })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/users - Créer un utilisateur (admin only)
app.post('/api/users', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Permission refusée' })
    }

    // Hash password (⚠️ exemple: utiliser bcryptjs en production)
    const user = await userService.create(req.body)

    await prisma.actionLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role as UserRole,
        action: 'Création Utilisateur',
        details: `Création de l'utilisateur ${user.name} (${user.role})`,
        timestamp: new Date(),
      },
    })

    res.status(201).json({ success: true, data: user })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// ─── ROUTES DASHBOARD ──────────────────────────────────────────────────

// GET /api/dashboard - Statistiques dashboard
app.get('/api/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [
      clientsCount,
      apprenantCount,
      nonApprenantCount,
      tontineStats,
      transactionsCount,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.apprenant.count(),
      prisma.nonApprenant.count(),
      tontineService.getStats(),
      prisma.transaction.count({ where: { status: 'approuve' } }),
    ])

    res.json({
      success: true,
      data: {
        clients: {
          total: clientsCount,
          apprenants: apprenantCount,
          nonApprenants: nonApprenantCount,
        },
        tontine: tontineStats,
        transactions: transactionsCount,
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ─── ERROR HANDLING ────────────────────────────────────────────────────

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err)
  res.status(500).json({
    error: 'Erreur serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// ─── START SERVER ──────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 API serveur démarré sur http://localhost:${PORT}`)
  console.log(`📚 Documentation: Voir PRISMA_EXAMPLES.md`)
})
