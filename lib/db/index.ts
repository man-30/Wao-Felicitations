// Central export point for all database services
export { userService } from './users'
export { clientService } from './clients'
export { transactionService } from './transactions'
export { apprenantService } from './apprenants'
export { tontineService } from './tontine'
export { accountService } from './accounts'

// Re-export Prisma client for direct use if needed
export { prisma } from '../prisma.ts'
export type { 
  User, 
  Client, 
  Transaction, 
  Apprenant, 
  TontineAccount,
  Account,
  UserRole,
  ClientType,
  TransactionType,
  TransactionStatus,
  TontineStatus,
} from '@prisma/client'
