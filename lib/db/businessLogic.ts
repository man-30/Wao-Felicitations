/**
 * lib/db/businessLogic.ts
 * Logique métier critique pour les opérations métier
 */

import Decimal from 'decimal.js'
import { generateMembershipCode, generateAccountNumber } from '../security.ts'
import { prisma } from '../prisma.ts'

// ───────────────────────────────────────────────────────────────────────────
// CLIENT CREATION WITH AUTO-GENERATED CODES
// ───────────────────────────────────────────────────────────────────────────

/**
 * Crée un client avec génération automatique des codes uniques
 */
export async function createClientWithCodes(data: {
  name: string
  type: 'apprenant' | 'non_apprenant' | 'simple'
  phone: string
  address?: string
  assignedCommercialId: string
}) {
  const membershipCode = generateMembershipCode()
  const accountNumber = generateAccountNumber()

  // Vérifier l'unicité
  let existingCode = await prisma.client.findUnique({
    where: { membershipCode },
  })
  while (existingCode) {
    const newCode = generateMembershipCode()
    existingCode = await prisma.client.findUnique({
      where: { membershipCode: newCode },
    })
  }

  let existingAccount = await prisma.client.findUnique({
    where: { accountNumber },
  })
  while (existingAccount) {
    const newAccount = generateAccountNumber()
    existingAccount = await prisma.client.findUnique({
      where: { accountNumber: newAccount },
    })
  }

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        ...data,
        membershipCode,
        accountNumber,
        savingsBalance: new Decimal(0),
        financingBalance: new Decimal(0),
      },
    })

    // Créer automatiquement le compte épargne
    await tx.account.create({
      data: {
        clientId: client.id,
        type: 'epargne',
        accountNumber: `EP-${accountNumber}`,
        label: `Compte épargne - ${data.name}`,
        balance: new Decimal(0),
        status: 'actif',
        createdBy: data.assignedCommercialId, // Par défaut
        createdByName: 'Système',
      }
    })

    return client
  })
}

// ───────────────────────────────────────────────────────────────────────────
// TRANSACTION BALANCE UPDATES
// ───────────────────────────────────────────────────────────────────────────

/**
 * Enregistre une transaction et met à jour les balances
 */
export async function recordTransaction(data: {
  clientId: string
  accountId?: string
  type: 'depot' | 'retrait' | 'cotisation' | 'paiement' | 'transfert' | 'frais'
  amount: number
  collectedBy: string
  date?: Date
  receiptNumber?: string
}) {
  // Récupérer les noms requis par le schéma
  const client = await prisma.client.findUnique({ where: { id: data.clientId } })
  const collector = await prisma.user.findUnique({ where: { id: data.collectedBy } })

  const transaction = await prisma.transaction.create({
    data: {
      clientId: data.clientId,
      clientName: client?.name || 'Unknown',
      accountId: data.accountId || null,
      type: data.type,
      amount: new Decimal(data.amount),
      date: data.date || new Date(),
      collectedBy: data.collectedBy,
      collectedByName: collector?.name || 'Unknown',
      status: 'en_attente',
      receiptNumber: data.receiptNumber,
    },
  })

  // Mettre à jour la balance du compte uniquement si accountId fourni.
  // Sinon, Prisma peut lever une erreur de validation sur `where.id`.
  const account = data.accountId
    ? await prisma.account.findUnique({
        where: { id: data.accountId },
      })
    : null

  if (account && data.accountId) {
    const changeAmount = data.type === 'retrait' ? -data.amount : data.amount
    const newBalance = (account.balance as Decimal).toNumber() + changeAmount

    await prisma.account.update({
      where: { id: data.accountId },
      data: {
        balance: new Decimal(newBalance),
      },
    })
  }

  return transaction
}

/**
 * Valide une transaction et met à jour la caisse
 */
export async function validateTransaction(transactionId: string, validatedBy: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { account: true },
  })

  if (!transaction) throw new Error('TRANSACTION_NOT_FOUND')

  if (transaction.status === 'approuve') {
    return transaction
  }

  // Mettre à jour le statut
  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: 'approuve',
      validatedBy,
      validatedByName: validatedBy, // Should get from user lookup
    },
  })

  // Mettre à jour la caisse générale si montant >= 0 (dépôt)
  if (transaction.type === 'depot' && transaction.amount.toNumber() > 0) {
    try {
      const mainCaisse = await prisma.cashRegister.findFirst({
        where: { type: 'generale' },
      })

      if (mainCaisse) {
        await prisma.cashRegister.update({
          where: { id: mainCaisse.id },
          data: {
            balance: (mainCaisse.balance as Decimal).plus(transaction.amount),
            lastMovement: new Date(),
          },
        })
      }
    } catch (cashUpdateError) {
      // Ne pas bloquer la validation transaction en staging si la mise à jour caisse échoue.
      console.error('Cash register update failed during validation:', cashUpdateError)
    }
  }

  return updated
}

// ───────────────────────────────────────────────────────────────────────────
// COTISATION LOGIC
// ───────────────────────────────────────────────────────────────────────────

/**
 * Enregistre une cotisation avec calcul automatique de l'allocation
 * Logique: cycleDay = 1 → bénéfice_societe, sinon → remboursement
 */
export async function recordCotisation(data: {
  tontineAccountId: string
  amount: number
  cycleDay: number
  cycleMonth: number
  recordedBy: string
}) {
  const allocation = data.cycleDay === 1 ? 'benefice_societe' : 'remboursement'

  const cotisation = await prisma.cotisation.create({
    data: {
      ...data,
      amount: new Decimal(data.amount),
      date: new Date(),
      allocation: allocation as any,
    },
  })

  // Mettre à jour total_cotise du tontineAccount
  const tontineAccount = await prisma.tontineAccount.findUnique({
    where: { id: data.tontineAccountId },
  })

  if (tontineAccount) {
    const newTotalCotise = (tontineAccount.totalCotise as Decimal).plus(data.amount)
    const totalCapital = tontineAccount.totalCapital as Decimal

    // Vérifier si solde (total_cotise >= total_capital)
    const isSolde = newTotalCotise.greaterThanOrEqualTo(totalCapital)

    await prisma.tontineAccount.update({
      where: { id: data.tontineAccountId },
      data: {
        totalCotise: newTotalCotise,
        status: isSolde ? 'solde' : 'actif',
      },
    })
  }

  return cotisation
}

/**
 * Enregistre un dépôt anticipé (couvre plusieurs jours)
 * Crée automatiquement les entrées consécutives dans cotisations
 */
export async function recordAdvancedDeposit(data: {
  tontineAccountId: string
  daysToAdd: number
  dailyAmount: number
  recordedBy: string
}) {
  const tontineAccount = await prisma.tontineAccount.findUnique({
    where: { id: data.tontineAccountId },
  })

  if (!tontineAccount) throw new Error('Tontine account not found')

  const cotisations = []
  const today = new Date()

  // Créer une entrée pour chaque jour
  for (let i = 0; i < data.daysToAdd; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)

    const cycleDay = ((tontineAccount.totalJours || 0) % 31) + 1
    const cotisation = await recordCotisation({
      tontineAccountId: data.tontineAccountId,
      amount: data.dailyAmount,
      cycleDay,
      cycleMonth: date.getMonth() + 1,
      recordedBy: data.recordedBy,
    })

    cotisations.push(cotisation)
  }

  return cotisations
}

/**
 * Calcule le pourcentage d'apport personnel pour financement bien
 * apport_pourcentage = (apport_personnel / valeur_bien) × 100
 */
export async function calculateFinancementApportPercentage(
  financementId: string,
  apportPersonnel: number,
  valeurBien: number
): Promise<number> {
  if (valeurBien === 0) throw new Error('Valeur bien must be > 0')
  const percentage = (apportPersonnel / valeurBien) * 100
  
  await prisma.financementNonApprenant.update({
    where: { id: financementId },
    data: {
      apportPourcentage: new Decimal(percentage),
    },
  })

  return percentage
}

/**
 * Crée les cotisations manquées (détection jour manqué + régularisation)
 * Montant = jours_manques × cotisation_journaliere
 */
export async function recordMissingDayRegularization(data: {
  tontineAccountId: string
  daysToAdd: number
  recordedBy: string
}) {
  const tontineAccount = await prisma.tontineAccount.findUnique({
    where: { id: data.tontineAccountId },
  })

  if (!tontineAccount) throw new Error('Tontine account not found')

  const totalRegularization = (tontineAccount.cotisationJournaliere as Decimal).times(data.daysToAdd)

  const cotisation = await prisma.cotisation.create({
    data: {
      tontineAccountId: data.tontineAccountId,
      amount: totalRegularization,
      cycleDay: 15,
      cycleMonth: new Date().getMonth() + 1,
      date: new Date(),
      allocation: 'remboursement' as any,
      recordedBy: data.recordedBy,
    },
  })

  // Mettre à jour total_cotise
  const newTotalCotise = (tontineAccount.totalCotise as Decimal).plus(totalRegularization)
  const totalCapital = tontineAccount.totalCapital as Decimal
  const isSolde = newTotalCotise.greaterThanOrEqualTo(totalCapital)

  await prisma.tontineAccount.update({
    where: { id: data.tontineAccountId },
    data: {
      totalCotise: newTotalCotise,
      status: isSolde ? 'solde' : 'actif',
    },
  })

  return cotisation
}

/**
 * Transfert financement → épargne
 * Conditions: solde positif + financement soldé
 */
export async function transferFinancementToSavings(
  financingAccountId: string,
  savingsAccountId: string,
  executedBy: string
) {
  const financingAccount = await prisma.account.findUnique({
    where: { id: financingAccountId },
  })

  const savingsAccount = await prisma.account.findUnique({
    where: { id: savingsAccountId },
  })

  if (!financingAccount || !savingsAccount) {
    throw new Error('One or both accounts not found')
  }

  // Vérification: financement doit être solde et épargne doit être prête
  if (financingAccount.status !== 'solde') {
    throw new Error('Financing account must be solde to transfer')
  }

  const remainingAmount = financingAccount.balance as Decimal
  if (remainingAmount.lessThan(0)) {
    throw new Error('Remaining amount must be positive')
  }

  // Transférer
  await prisma.$transaction([
    prisma.account.update({
      where: { id: financingAccountId },
      data: {
        status: 'ferme',
      },
    }),
    prisma.account.update({
      where: { id: savingsAccountId },
      data: {
        balance: (savingsAccount.balance as Decimal).plus(remainingAmount),
      },
    }),
  ])

  // Créer une transaction de transfert
  await prisma.transaction.create({
    data: {
      clientId: financingAccount.clientId,
      accountId: savingsAccountId,
      type: 'transfert',
      amount: remainingAmount,
      date: new Date(),
      collectedBy: executedBy,
      status: 'approuve',
      receiptNumber: `TRF-${Date.now()}`,
    },
  })

  return { success: true, transferredAmount: remainingAmount.toNumber() }
}

export default {
  createClientWithCodes,
  recordTransaction,
  validateTransaction,
  recordCotisation,
  recordAdvancedDeposit,
  calculateFinancementApportPercentage,
  recordMissingDayRegularization,
  transferFinancementToSavings,
}
