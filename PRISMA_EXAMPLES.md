/**
 * ✅ EXEMPLE D'UTILISATION PRISMA DANS WAO FÉLICITATIONS
 * 
 * Cet exemple montre le pattern recommandé pour utiliser Prisma
 * dans l'application. Pour une app React pure (Vite), il faut passer
 * par une API backend.
 */

// ─── PATTERN 1: API Route Backend (Node.js / Express) ────────────────────

/**
 * backend/routes/clients.ts
 * Endpoint pour récupérer tous les clients
 */
export async function getClientsRoute(req, res) {
  try {
    const { type, search, commercialId } = req.query
    
    const clients = await clientService.findMany({
      type: type as ClientType,
      search: search as string,
      assignedCommercialId: commercialId as string
    })
    
    res.json({
      success: true,
      data: clients,
      count: clients.length
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * backend/routes/clients.ts
 * Endpoint pour créer un client
 */
export async function createClientRoute(req, res) {
  try {
    const client = await clientService.create(req.body)
    
    // Log action
    await prisma.actionLog.create({
      data: {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'Création Client',
        details: `Création du client ${client.name}`,
        timestamp: new Date()
      }
    })
    
    res.status(201).json({
      success: true,
      data: client
    })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

// ─── PATTERN 2: React Hook (côté Frontend) ─────────────────────────────

/**
 * src/hooks/useClients.ts
 * Custom hook pour gérer les clients avec Prisma via API
 */
import { useState, useEffect } from 'react'

interface UseClientsOptions {
  type?: 'apprenant' | 'non-apprenant' | 'simple'
  search?: string
  commercialId?: string
}

export function useClients(options?: UseClientsOptions) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Récupérer les clients
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (options?.type) params.append('type', options.type)
        if (options?.search) params.append('search', options.search)
        if (options?.commercialId) params.append('commercialId', options.commercialId)

        const res = await fetch(`/api/clients?${params}`)
        const result = await res.json()
        
        if (result.success) {
          setClients(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [options?.type, options?.search, options?.commercialId])

  // Créer un client
  const createClient = async (data) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const result = await res.json()
      
      if (result.success) {
        setClients([...clients, result.data])
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return {
    clients,
    loading,
    error,
    createClient,
    refetch: () => window.location.reload() // ou trigger fetch
  }
}

// ─── PATTERN 3: Composant React ───────────────────────────────────────

/**
 * src/components/ClientManagementWithPrisma.tsx
 * Exemple complet de gestion clients avec Prisma
 */
import { useState } from 'react'
import { useClients } from '@/hooks/useClients'

export function ClientManagement() {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const { clients, loading, error, createClient } = useClients({
    search,
    type: selectedType as any
  })

  const handleCreateClient = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    try {
      setIsCreating(true)
      const newClient = await createClient({
        name: formData.get('name'),
        membershipCode: formData.get('membershipCode'),
        accountNumber: formData.get('accountNumber'),
        type: formData.get('type'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        assignedCommercialId: formData.get('commercialId')
      })
      
      alert(`Client créé: ${newClient.name}`)
      e.target.reset()
    } catch (err) {
      alert(`Erreur: ${err.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Formulaire de création */}
      <form onSubmit={handleCreateClient} className="bg-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Créer un Client</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            name="name"
            placeholder="Nom"
            required
            className="border p-2 rounded"
          />
          <input
            type="text"
            name="membershipCode"
            placeholder="Code adhésion (ex: 4728WF026)"
            required
            className="border p-2 rounded"
          />
          <input
            type="text"
            name="accountNumber"
            placeholder="Numéro de compte"
            required
            className="border p-2 rounded"
          />
          <select
            name="type"
            required
            className="border p-2 rounded"
          >
            <option value="">Sélectionner type</option>
            <option value="apprenant">Apprenant</option>
            <option value="non-apprenant">Non-Apprenant</option>
            <option value="simple">Simple</option>
          </select>
          <input
            type="tel"
            name="phone"
            placeholder="Téléphone"
            required
            className="border p-2 rounded"
          />
          <input
            type="text"
            name="address"
            placeholder="Adresse"
            className="border p-2 rounded"
          />
        </div>
        <button
          type="submit"
          disabled={isCreating}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isCreating ? 'Création...' : 'Créer'}
        </button>
      </form>

      {/* Barre de recherche */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Chercher par nom, code ou numéro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border p-2 rounded"
        />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Tous les types</option>
          <option value="apprenant">Apprenants</option>
          <option value="non-apprenant">Non-Apprenants</option>
          <option value="simple">Simples</option>
        </select>
      </div>

      {/* Liste des clients */}
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">
          Clients ({clients.length})
        </h2>
        
        {loading && <p>Chargement...</p>}
        {error && <p className="text-red-600">{error}</p>}
        
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Nom</th>
              <th className="border p-2 text-left">Code</th>
              <th className="border p-2 text-left">Type</th>
              <th className="border p-2 text-left">Téléphone</th>
              <th className="border p-2 text-left">Épargne</th>
              <th className="border p-2 text-left">Financement</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="border p-2">{client.name}</td>
                <td className="border p-2">{client.membershipCode}</td>
                <td className="border p-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    client.type === 'apprenant' ? 'bg-blue-100 text-blue-800' :
                    client.type === 'non-apprenant' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {client.type}
                  </span>
                </td>
                <td className="border p-2">{client.phone}</td>
                <td className="border p-2 text-right font-mono">
                  {Number(client.savingsBalance).toLocaleString()} F
                </td>
                <td className="border p-2 text-right font-mono">
                  {Number(client.financingBalance).toLocaleString()} F
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── PATTERN 4: Service Direct dans une Route API ──────────────────────

/**
 * backend/routes/apprenants.ts
 * Endpoint pour enrôler un apprenant
 */
export async function enrollApprenantRoute(req, res) {
  const { clientId, studentData } = req.body
  
  try {
    // Créer l'apprenant
    const apprenant = await apprenantService.create({
      clientId,
      studentName: studentData.studentName,
      schoolName: studentData.schoolName,
      schoolLevel: studentData.schoolLevel,
      schoolYear: studentData.schoolYear,
      guardianId: studentData.guardianId,
      cautionId: studentData.cautionId,
      documents: studentData.documents || [],
      createdBy: req.user.id
    })

    // Calculer la grille tarifaire basée sur fraisScolarite
    const { calculerGrille } = require('@/src/grille')
    const grilleCalcul = calculerGrille(studentData.fraisScolarite)
    
    if (!grilleCalcul) {
      throw new Error('Frais de scolarité hors des tranches')
    }

    // Créer le compte tontine
    const tontineAccount = await tontineService.create({
      apprenantId: apprenant.id,
      numero: `TON-${Date.now()}`,
      schoolName: studentData.schoolName,
      schoolLevel: studentData.schoolLevel,
      fraisScolarite: studentData.fraisScolarite,
      grilleNumero: grilleCalcul.row.numero,
      fraisDossier: grilleCalcul.fraisDossier,
      fraisAssurance: grilleCalcul.fraisAssurance,
      fraisPrestation: grilleCalcul.fraisPrestation,
      cotisationJournaliere: grilleCalcul.cotisationJournaliere,
      totalCapital: grilleCalcul.capitalAvance,
      totalJours: grilleCalcul.totalCasesCarnet
    })

    // Créer un compte de financement lié
    const account = await accountService.create({
      clientId,
      type: 'financement',
      accountNumber: `TONT-${tontineAccount.numero}`,
      label: `Tontine - ${studentData.schoolName}`,
      status: 'actif',
      principalAmount: grilleCalcul.totalCapital,
      createdBy: req.user.id,
      createdByName: req.user.name
    })

    res.status(201).json({
      success: true,
      data: {
        apprenant,
        tontineAccount,
        account,
        calculus: grilleCalcul
      }
    })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

// ─── PATTERN 5: Statistiques Globales ──────────────────────────────────

/**
 * backend/routes/dashboard.ts
 * Endpoint pour obtenir les statistiques du dashboard
 */
export async function getDashboardStatsRoute(req, res) {
  try {
    const [
      tontineStats,
      totalClients,
      totalTransactions,
      totalSavings,
      totalFinancing
    ] = await Promise.all([
      tontineService.getStats(),
      prisma.client.count(),
      transactionService.findMany(),
      accountService.getTotalByType('epargne'),
      accountService.getTotalByType('financement')
    ])

    const totalTransactionAmount = totalTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    )

    res.json({
      success: true,
      data: {
        clients: {
          total: totalClients,
          apprenants: await prisma.apprenant.count(),
          nonApprenants: await prisma.nonApprenant.count()
        },
        tontine: tontineStats,
        accounts: {
          totalSavings,
          totalFinancing
        },
        transactions: {
          total: totalTransactions.length,
          totalAmount: totalTransactionAmount,
          byType: {
            deposits: totalTransactions.filter(t => t.type === 'depot').length,
            withdrawals: totalTransactions.filter(t => t.type === 'retrait').length,
            payments: totalTransactions.filter(t => t.type === 'paiement').length
          }
        }
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

// ─── UTILISATION DANS UN COMPOSANT REACT ──────────────────────────────

/**
 * src/components/Dashboard.tsx
 * Utilisation des stats du dashboard
 */
import { useEffect, useState } from 'react'

export function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(result => setStats(result.data))
  }, [])

  if (!stats) return <div>Chargement...</div>

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-600">Clients Total</h3>
        <p className="text-3xl font-bold">{stats.clients.total}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-600">Tontines Actives</h3>
        <p className="text-3xl font-bold">{stats.tontine.actifs}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-600">Épargne Total</h3>
        <p className="text-3xl font-bold">
          {Number(stats.accounts.totalSavings).toLocaleString()} F
        </p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-600">Transactions</h3>
        <p className="text-3xl font-bold">{stats.transactions.total}</p>
      </div>
    </div>
  )
}
