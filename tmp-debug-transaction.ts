import { prisma } from './lib/prisma.ts'
import { recordTransaction } from './lib/db/businessLogic.ts'

const main = async () => {
  const cashier = await prisma.user.findFirst({ where: { email: 'cashier@staging.test' } })
  const client = await prisma.client.findFirst({ orderBy: { createdAt: 'desc' } })
  console.log('cashier', cashier?.id)
  console.log('client', client?.id)
  if (!cashier || !client) return
  try {
    const tx = await recordTransaction({ clientId: client.id, type: 'depot', amount: 50000, collectedBy: cashier.id })
    console.log('tx', tx.id, tx.status)
  } catch (e) {
    console.error('ERR', e)
  }
  await prisma.$disconnect()
}
main()
