/**
 * lib/db/actionLog.ts
 * Journalisation automatique de toutes les actions critiques
 */

import { UserRole } from '@prisma/client'
import { prisma } from '../prisma.ts'

export enum ActionType {
  // Authentication
  LOGIN = 'Connexion',
  LOGOUT = 'Déconnexion',

  // Client management
  CREATE_CLIENT = 'Création Client',
  MODIFY_CLIENT = 'Modification Client',
  CREATE_APPRENANT = 'Création Apprenant',
  CREATE_NON_APPRENANT = 'Création Non-Apprenant',

  // Transactions
  DEPOSIT = 'Dépôt',
  WITHDRAWAL = 'Retrait',
  RECORD_COTISATION = 'Enregistrement Cotisation',
  VALIDATE_TRANSACTION = 'Validation Transaction',

  // Transfers
  TRANSFER_FINANCING_TO_SAVINGS = 'Transfert Financement → Épargne',

  // Fees
  PAY_ADHESION_FEE = 'Paiement Frais Adhésion',
  PAY_FILE_FEE = 'Paiement Frais Dossier',
  PAY_INSURANCE_FEE = 'Paiement Frais Assurance',

  // Employee payments
  POSITION_EMPLOYEE_PAYMENT = 'Positionnement Paiement Employé',
  PROCESS_EMPLOYEE_PAYMENT = 'Traitement Paiement Employé',

  // User management
  CREATE_USER = 'Création Utilisateur',
  MODIFY_USER = 'Modification Utilisateur',
  ACTIVATE_USER = 'Activation Utilisateur',
  DEACTIVATE_USER = 'Désactivation Utilisateur',

  // Cash management
  WITHDRAW_INSURANCE_CASH = 'Retrait Caisse Assurance',

  // Exports
  EXPORT_DASHBOARD = 'Export PDF Dashboard',
  EXPORT_REPORT = 'Export Rapport',

  // System
  SYSTEM_ERROR = 'Erreur Système',
}

interface LogContext {
  userId: string
  userName: string
  userRole: UserRole
  action: ActionType | string
  details?: Record<string, any>
  transactionId?: string
  relatedId?: string
}

/**
 * Enregistre une action dans action_logs
 */
async function logAction(context: LogContext): Promise<void> {
  try {
    await prisma.actionLog.create({
      data: {
        userId: context.userId,
        userName: context.userName,
        userRole: context.userRole,
        action: typeof context.action === 'string' ? context.action : context.action,
        details: JSON.stringify(context.details || {}),
        transactionId: context.transactionId || null,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    console.error('Failed to log action:', error)
    // Ne pas lever d'erreur pour ne pas bloquer l'opération
  }
}

// ───────────────────────────────────────────────────────────────────────────
// AUTHENTICATION LOGS
// ───────────────────────────────────────────────────────────────────────────

export async function logLogin(userId: string, userName: string, userRole: UserRole, ipAddress?: string) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.LOGIN,
    details: { ipAddress, timestamp: new Date().toISOString() },
  })
}

export async function logLogout(userId: string, userName: string, userRole: UserRole) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.LOGOUT,
    details: { timestamp: new Date().toISOString() },
  })
}

// ───────────────────────────────────────────────────────────────────────────
// CLIENT MANAGEMENT LOGS
// ───────────────────────────────────────────────────────────────────────────

export async function logCreateClient(
  userId: string,
  userName: string,
  userRole: UserRole,
  clientId: string,
  clientName: string,
  clientType: string
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.CREATE_CLIENT,
    details: { clientName, clientType, clientId },
    relatedId: clientId,
  })
}

export async function logModifyClient(userId: string, userName: string, userRole: UserRole, clientId: string, changes: Record<string, any>) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.MODIFY_CLIENT,
    details: { changes },
    relatedId: clientId,
  })
}

export async function logCreateApprenant(
  userId: string,
  userName: string,
  userRole: UserRole,
  clientId: string,
  studentName: string
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.CREATE_APPRENANT,
    details: { studentName, clientId },
    relatedId: clientId,
  })
}

export async function logCreateNonApprenant(
  userId: string,
  userName: string,
  userRole: UserRole,
  clientId: string,
  fullName: string
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.CREATE_NON_APPRENANT,
    details: { fullName, clientId },
    relatedId: clientId,
  })
}

// ───────────────────────────────────────────────────────────────────────────
// TRANSACTION LOGS
// ───────────────────────────────────────────────────────────────────────────

export async function logDeposit(
  userId: string,
  userName: string,
  userRole: UserRole,
  clientId: string,
  amount: number,
  transactionId: string
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.DEPOSIT,
    details: { clientId, amount, transactionId },
    transactionId,
  })
}

export async function logWithdrawal(
  userId: string,
  userName: string,
  userRole: UserRole,
  clientId: string,
  amount: number,
  transactionId: string
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.WITHDRAWAL,
    details: { clientId, amount, transactionId },
    transactionId,
  })
}

export async function logRecordCotisation(
  userId: string,
  userName: string,
  userRole: UserRole,
  tontineAccountId: string,
  amount: number,
  cycleDay: number
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.RECORD_COTISATION,
    details: { tontineAccountId, amount, cycleDay },
    relatedId: tontineAccountId,
  })
}

export async function logValidateTransaction(
  userId: string,
  userName: string,
  userRole: UserRole,
  transactionId: string,
  amount: number
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.VALIDATE_TRANSACTION,
    details: { amount },
    transactionId,
  })
}

// ───────────────────────────────────────────────────────────────────────────
// TRANSFER LOGS
// ───────────────────────────────────────────────────────────────────────────

export async function logTransferFinancingToSavings(
  userId: string,
  userName: string,
  userRole: UserRole,
  clientId: string,
  transferredAmount: number
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.TRANSFER_FINANCING_TO_SAVINGS,
    details: { clientId, transferredAmount },
    relatedId: clientId,
  })
}

// ───────────────────────────────────────────────────────────────────────────
// FEE PAYMENT LOGS
// ───────────────────────────────────────────────────────────────────────────

export async function logPayAdhesionFee(
  userId: string,
  userName: string,
  userRole: UserRole,
  clientId: string,
  amount: number
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.PAY_ADHESION_FEE,
    details: { clientId, amount },
    relatedId: clientId,
  })
}

export async function logPayFileFee(userId: string, userName: string, userRole: UserRole, clientId: string, amount: number) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.PAY_FILE_FEE,
    details: { clientId, amount },
    relatedId: clientId,
  })
}

export async function logPayInsuranceFee(
  userId: string,
  userName: string,
  userRole: UserRole,
  clientId: string,
  amount: number
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.PAY_INSURANCE_FEE,
    details: { clientId, amount },
    relatedId: clientId,
  })
}

// ───────────────────────────────────────────────────────────────────────────
// EMPLOYEE PAYMENT LOGS
// ───────────────────────────────────────────────────────────────────────────

export async function logPositionEmployeePayment(
  userId: string,
  userName: string,
  userRole: UserRole,
  employeeId: string,
  amount: number,
  period: string
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.POSITION_EMPLOYEE_PAYMENT,
    details: { employeeId, amount, period },
    relatedId: employeeId,
  })
}

export async function logProcessEmployeePayment(
  userId: string,
  userName: string,
  userRole: UserRole,
  employeeId: string,
  amount: number
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.PROCESS_EMPLOYEE_PAYMENT,
    details: { employeeId, amount },
    relatedId: employeeId,
  })
}

// ───────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT LOGS
// ───────────────────────────────────────────────────────────────────────────

export async function logCreateUser(
  userId: string,
  userName: string,
  userRole: UserRole,
  newUserId: string,
  newUserName: string,
  newUserRole: string
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.CREATE_USER,
    details: { newUserName, newUserRole },
    relatedId: newUserId,
  })
}

export async function logModifyUser(userId: string, userName: string, userRole: UserRole, targetUserId: string, changes: Record<string, any>) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.MODIFY_USER,
    details: { changes },
    relatedId: targetUserId,
  })
}

export async function logActivateUser(userId: string, userName: string, userRole: UserRole, targetUserId: string) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.ACTIVATE_USER,
    details: { targetUserId },
    relatedId: targetUserId,
  })
}

export async function logDeactivateUser(userId: string, userName: string, userRole: UserRole, targetUserId: string) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.DEACTIVATE_USER,
    details: { targetUserId },
    relatedId: targetUserId,
  })
}

// ───────────────────────────────────────────────────────────────────────────
// CASH MANAGEMENT LOGS
// ───────────────────────────────────────────────────────────────────────────

export async function logWithdrawInsuranceCash(
  userId: string,
  userName: string,
  userRole: UserRole,
  amount: number,
  reason: string
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.WITHDRAW_INSURANCE_CASH,
    details: { amount, reason },
  })
}

// ───────────────────────────────────────────────────────────────────────────
// EXPORT LOGS
// ───────────────────────────────────────────────────────────────────────────

export async function logExportDashboard(
  userId: string,
  userName: string,
  userRole: UserRole,
  filters: Record<string, any>
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.EXPORT_DASHBOARD,
    details: { filters, exportedAt: new Date().toISOString() },
  })
}

export async function logExportReport(userId: string, userName: string, userRole: UserRole, reportType: string) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.EXPORT_REPORT,
    details: { reportType },
  })
}

// ───────────────────────────────────────────────────────────────────────────
// ERROR LOGGING
// ───────────────────────────────────────────────────────────────────────────

export async function logSystemError(
  userId: string,
  userName: string,
  userRole: UserRole,
  errorMessage: string,
  errorStack?: string
) {
  await logAction({
    userId,
    userName,
    userRole,
    action: ActionType.SYSTEM_ERROR,
    details: { errorMessage, errorStack },
  })
}

// ───────────────────────────────────────────────────────────────────────────
// QUERY ACTION LOGS (Read-Only)
// ───────────────────────────────────────────────────────────────────────────

export async function getActionLogs(
  filters?: {
    userId?: string
    action?: string
    fromDate?: Date
    toDate?: Date
    limit?: number
    offset?: number
  }
) {
  const where: any = {}

  if (filters?.userId) where.userId = filters.userId
  if (filters?.action) where.action = filters.action
  if (filters?.fromDate || filters?.toDate) {
    where.timestamp = {}
    if (filters.fromDate) where.timestamp.gte = filters.fromDate
    if (filters.toDate) where.timestamp.lte = filters.toDate
  }

  return prisma.actionLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: filters?.limit || 100,
    skip: filters?.offset || 0,
  })
}

export async function getUserActivityLog(userId: string, days: number = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  return prisma.actionLog.findMany({
    where: {
      userId,
      timestamp: { gte: since },
    },
    orderBy: { timestamp: 'desc' },
  })
}

export default {
  ActionType,
  logAction,
  logLogin,
  logLogout,
  logCreateClient,
  logModifyClient,
  logCreateApprenant,
  logCreateNonApprenant,
  logDeposit,
  logWithdrawal,
  logRecordCotisation,
  logValidateTransaction,
  logTransferFinancingToSavings,
  logPayAdhesionFee,
  logPayFileFee,
  logPayInsuranceFee,
  logPositionEmployeePayment,
  logProcessEmployeePayment,
  logCreateUser,
  logModifyUser,
  logActivateUser,
  logDeactivateUser,
  logWithdrawInsuranceCash,
  logExportDashboard,
  logExportReport,
  logSystemError,
  getActionLogs,
  getUserActivityLog,
}
