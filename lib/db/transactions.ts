import { prisma } from '../prisma.ts'
import { Transaction, TransactionType, TransactionStatus } from '@prisma/client'

export const transactionService = {
  async create(data: {
    clientId: string
    clientName: string
    accountId?: string
    type: TransactionType
    amount: number | string
    date: Date
    collectedBy: string
    collectedByName: string
    validatedBy?: string
    validatedByName?: string
    status?: TransactionStatus
    receiptNumber?: string
    description?: string
  }): Promise<Transaction> {
    return prisma.transaction.create({
      data: {
        ...data,
        amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
      },
    })
  },

  async findById(id: string): Promise<Transaction | null> {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        client: true,
        account: true,
        collectedByUser: true,
        validatedByUser: true,
      },
    }) as Promise<any>
  },

  async findMany(options?: {
    clientId?: string
    type?: TransactionType
    status?: TransactionStatus
    startDate?: Date
    endDate?: Date
    collectedBy?: string
  }): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: {
        clientId: options?.clientId,
        type: options?.type,
        status: options?.status,
        date: {
          gte: options?.startDate,
          lte: options?.endDate,
        },
        collectedBy: options?.collectedBy,
      },
      include: { client: true, account: true },
      orderBy: { date: 'desc' },
    }) as Promise<any>
  },

  async updateStatus(
    id: string,
    status: TransactionStatus,
    validatedBy?: string,
    validatedByName?: string
  ): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id },
      data: {
        status,
        validatedBy,
        validatedByName,
      },
    })
  },

  async getByReceiptNumber(receiptNumber: string): Promise<Transaction | null> {
    return prisma.transaction.findUnique({
      where: { receiptNumber },
    })
  },

  async getTotalByType(type: TransactionType): Promise<number> {
    const result = await prisma.transaction.aggregate({
      where: { type },
      _sum: { amount: true },
    })
    return Number(result._sum.amount || 0)
  },
}
