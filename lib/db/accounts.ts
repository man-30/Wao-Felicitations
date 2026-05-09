import { prisma } from '../prisma.ts'
import { Account, AccountType, AccountStatus } from '@prisma/client'

export const accountService = {
  async create(data: {
    clientId: string
    type: AccountType
    balance?: number | string
    accountNumber?: string
    label?: string
    status?: AccountStatus
    createdBy: string
    createdByName: string
    notes?: string
  }): Promise<Account> {
    return prisma.account.create({
      data: {
        ...data,
        balance: data.balance ? (typeof data.balance === 'string' ? parseFloat(data.balance) : data.balance) : 0,
      },
    })
  },

  async findById(id: string): Promise<Account | null> {
    return prisma.account.findUnique({
      where: { id },
      include: {
        client: true,
        transactions: { orderBy: { date: 'desc' } },
      },
    }) as Promise<any>
  },

  async findByClient(clientId: string): Promise<Account[]> {
    return prisma.account.findMany({
      where: { clientId },
      include: { transactions: true },
      orderBy: { createdAt: 'asc' },
    }) as Promise<any>
  },

  async findByType(clientId: string, type: AccountType): Promise<Account | null> {
    return prisma.account.findFirst({
      where: { clientId, type },
      include: { transactions: true },
    }) as Promise<any>
  },

  async findMany(options?: {
    type?: AccountType
    status?: AccountStatus
    clientId?: string
  }): Promise<Account[]> {
    return prisma.account.findMany({
      where: {
        type: options?.type,
        status: options?.status,
        clientId: options?.clientId,
      },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
    }) as Promise<any>
  },

  async updateBalance(id: string, newBalance: number | string): Promise<Account> {
    return prisma.account.update({
      where: { id },
      data: {
        balance: typeof newBalance === 'string' ? parseFloat(newBalance) : newBalance,
      },
    })
  },

  async updateStatus(id: string, status: AccountStatus): Promise<Account> {
    return prisma.account.update({
      where: { id },
      data: { status },
    })
  },

  async getTotalByType(type: AccountType): Promise<number> {
    const result = await prisma.account.aggregate({
      where: { type },
      _sum: { balance: true },
    })
    return Number(result._sum.balance || 0)
  },
}
