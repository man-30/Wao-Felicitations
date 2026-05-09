import { prisma } from '../prisma.ts'
import { Apprenant } from '@prisma/client'

export const apprenantService = {
  async create(data: {
    clientId: string
    studentName: string
    studentBirthDate?: Date
    schoolName: string
    schoolLevel: string
    schoolYear: string
    guardianId: string
    cautionId: string
    documents: any
    createdBy: string
  }): Promise<Apprenant> {
    return prisma.apprenant.create({ data })
  },

  async findById(id: string): Promise<Apprenant | null> {
    return prisma.apprenant.findUnique({
      where: { id },
      include: {
        client: true,
        guardian: true,
        caution: true,
        tontineAccounts: { include: { cotisations: true } },
      },
    }) as Promise<any>
  },

  async findByClientId(clientId: string): Promise<Apprenant | null> {
    return prisma.apprenant.findUnique({
      where: { clientId },
      include: {
        client: true,
        guardian: true,
        caution: true,
        tontineAccounts: true,
      },
    }) as Promise<any>
  },

  async findMany(options?: {
    schoolName?: string
    schoolLevel?: string
  }): Promise<Apprenant[]> {
    return prisma.apprenant.findMany({
      where: {
        schoolName: options?.schoolName,
        schoolLevel: options?.schoolLevel,
      },
      include: {
        client: true,
        guardian: true,
        caution: true,
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<any>
  },

  async updateDocuments(
    id: string,
    documents: any
  ): Promise<Apprenant> {
    return prisma.apprenant.update({
      where: { id },
      data: { documents },
    })
  },

  async count(): Promise<number> {
    return prisma.apprenant.count()
  },
}
