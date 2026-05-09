/**
 * lib/prisma.ts
 * Singleton instance of PrismaClient
 * Use this instance across the entire application
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL
  
  if (!connectionString) {
    throw new Error('DATABASE_URL or DATABASE_URL_POOLED environment variable is not set')
  }

  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = global.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export { prisma }