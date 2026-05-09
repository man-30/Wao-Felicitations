import { prisma } from '../prisma.ts'
import { Client, ClientType, Prisma } from '@prisma/client'

export const clientService = {
  async create(data: {
    name: string
    membershipCode: string
    accountNumber: string
    type: ClientType
    phone: string
    address?: string
    assignedCommercialId: string
  }): Promise<Client> {
    return prisma.client.create({ data })
  },

  async findById(id: string): Promise<Client | null> {
    return prisma.client.findUnique({
      where: { id },
      include: {
        apprenant: true,
        nonApprenant: true,
        accounts: true,
      },
    }) as Promise<any>
  },

  async findByMembershipCode(code: string): Promise<Client | null> {
    return prisma.client.findUnique({ where: { membershipCode: code } })
  },

  async findMany(options?: {
    type?: ClientType
    assignedCommercialId?: string
    search?: string
  }): Promise<Client[]> {
    const where: Prisma.ClientWhereInput = {}

    if (options?.type) where.type = options.type
    if (options?.assignedCommercialId)
      where.assignedCommercialId = options.assignedCommercialId
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { membershipCode: { contains: options.search, mode: 'insensitive' } },
        { accountNumber: { contains: options.search, mode: 'insensitive' } },
      ]
    }

    return prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  },

  async update(
    id: string,
    data: Partial<{
      name: string
      phone: string
      address: string
      assignedCommercialId: string
      savingsBalance: Prisma.Decimal
      financingBalance: Prisma.Decimal
    }>
  ): Promise<Client> {
    return prisma.client.update({
      where: { id },
      data,
    })
  },

  async delete(id: string): Promise<Client> {
    return prisma.client.delete({ where: { id } })
  },

  async getBalance(clientId: string): Promise<{
    savingsBalance: number
    financingBalance: number
  } | null> {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { savingsBalance: true, financingBalance: true },
    })
    return client
      ? {
          savingsBalance: Number(client.savingsBalance),
          financingBalance: Number(client.financingBalance),
        }
      : null
  },
}
