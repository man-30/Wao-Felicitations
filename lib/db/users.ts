import { prisma } from '../prisma.ts'
import { User, UserRole } from '@prisma/client'

export const userService = {
  async create(data: {
    name: string
    role: UserRole
    email: string
    password: string
    zone?: string
  }): Promise<User> {
    return prisma.user.create({ data })
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } })
  },

  async findMany(options?: {
    role?: UserRole
    zone?: string
    isActive?: boolean
  }): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        role: options?.role,
        zone: options?.zone,
        isActive: options?.isActive,
      },
      orderBy: { createdAt: 'desc' },
    })
  },

  async update(
    id: string,
    data: Partial<{
      name: string
      zone: string
      isActive: boolean
      password: string
    }>
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    })
  },

  async delete(id: string): Promise<User> {
    return prisma.user.delete({ where: { id } })
  },
}
