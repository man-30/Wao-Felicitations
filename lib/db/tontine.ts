import { prisma } from '../prisma.ts'
import { TontineAccount, TontineStatus } from '@prisma/client'

export const tontineService = {
  async create(data: {
    apprenantId: string
    numero: string
    schoolName: string
    schoolLevel: string
    fraisScolarite: number | string
    grilleNumero: number
    fraisDossier: number | string
    fraisAssurance: number | string
    fraisPrestation: number | string
    cotisationJournaliere: number | string
    totalCapital: number | string
    totalJours: number
    status?: TontineStatus
  }): Promise<TontineAccount> {
    return prisma.tontineAccount.create({
      data: {
        ...data,
        fraisScolarite: typeof data.fraisScolarite === 'string' ? parseFloat(data.fraisScolarite) : data.fraisScolarite,
        fraisDossier: typeof data.fraisDossier === 'string' ? parseFloat(data.fraisDossier) : data.fraisDossier,
        fraisAssurance: typeof data.fraisAssurance === 'string' ? parseFloat(data.fraisAssurance) : data.fraisAssurance,
        fraisPrestation: typeof data.fraisPrestation === 'string' ? parseFloat(data.fraisPrestation) : data.fraisPrestation,
        cotisationJournaliere: typeof data.cotisationJournaliere === 'string' ? parseFloat(data.cotisationJournaliere) : data.cotisationJournaliere,
        totalCapital: typeof data.totalCapital === 'string' ? parseFloat(data.totalCapital) : data.totalCapital,
      },
    })
  },

  async findById(id: string): Promise<TontineAccount | null> {
    return prisma.tontineAccount.findUnique({
      where: { id },
      include: {
        apprenant: { include: { client: true } },
        cotisations: { orderBy: { date: 'asc' } },
      },
    }) as Promise<any>
  },

  async findByNumero(numero: string): Promise<TontineAccount | null> {
    return prisma.tontineAccount.findUnique({ where: { numero } })
  },

  async findByApprenant(apprenantId: string): Promise<TontineAccount[]> {
    return prisma.tontineAccount.findMany({
      where: { apprenantId },
      include: { cotisations: true },
      orderBy: { createdAt: 'desc' },
    }) as Promise<any>
  },

  async findMany(options?: {
    status?: TontineStatus
    grilleNumero?: number
  }): Promise<TontineAccount[]> {
    return prisma.tontineAccount.findMany({
      where: {
        status: options?.status,
        grilleNumero: options?.grilleNumero,
      },
      include: { apprenant: true, cotisations: true },
      orderBy: { createdAt: 'desc' },
    }) as Promise<any>
  },

  async updateBalance(
    id: string,
    totalCotise: number | string,
    totalBeneficeCases?: number | string
  ): Promise<TontineAccount> {
    return prisma.tontineAccount.update({
      where: { id },
      data: {
        totalCotise: typeof totalCotise === 'string' ? parseFloat(totalCotise) : totalCotise,
        totalBeneficeCases: totalBeneficeCases 
          ? typeof totalBeneficeCases === 'string' ? parseFloat(totalBeneficeCases) : totalBeneficeCases
          : undefined,
      },
    })
  },

  async updateStatus(id: string, status: TontineStatus): Promise<TontineAccount> {
    return prisma.tontineAccount.update({
      where: { id },
      data: { status },
    })
  },

  async getStats(): Promise<{
    total: number
    actifs: number
    soldes: number
    suspendus: number
    totalCapital: number
    totalCotise: number
  }> {
    const [total, actifs, soldes, suspendus] = await Promise.all([
      prisma.tontineAccount.count(),
      prisma.tontineAccount.count({ where: { status: 'actif' } }),
      prisma.tontineAccount.count({ where: { status: 'solde' } }),
      prisma.tontineAccount.count({ where: { status: 'suspendu' } }),
    ])

    const sums = await prisma.tontineAccount.aggregate({
      _sum: {
        totalCapital: true,
        totalCotise: true,
      },
    })

    return {
      total,
      actifs,
      soldes,
      suspendus,
      totalCapital: Number(sums._sum.totalCapital || 0),
      totalCotise: Number(sums._sum.totalCotise || 0),
    }
  },
}
