/**
 * Test direct database connection
 */
import { config } from 'dotenv'
config()

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

async function testConnection() {
  console.log('🔍 Testing database connection...')
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...')
  console.log('DATABASE_URL_POOLED:', process.env.DATABASE_URL_POOLED?.substring(0, 50) + '...')
  
  const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL
  console.log('Using connection:', connectionString?.substring(0, 80) + '...')
  
  try {
    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })
    
    const userCount = await prisma.user.count()
    console.log('✅ Connection successful!')
    console.log(`Found ${userCount} users in database`)
    
    await prisma.$disconnect()
    await pool.end()
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message)
    process.exit(1)
  }
}

testConnection()
