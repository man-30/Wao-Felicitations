import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Database Counts ---')
  const [users, clients, transactions, tontineAccounts, accounts] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.transaction.count(),
    prisma.tontineAccount.count(),
    prisma.account.count(),
  ])

  console.log(`Users: ${users}`)
  console.log(`Clients: ${clients}`)
  console.log(`Transactions: ${transactions}`)
  console.log(`Tontine Accounts: ${tontineAccounts}`)
  console.log(`Accounts: ${accounts}`)

  if (users > 0) {
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } })
    console.log(`Admin user found: ${admin?.name} (${admin?.email})`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
