import { prisma } from './lib/prisma.ts'

const run = async () => {
  const c = await prisma.client.findFirst({ orderBy: { createdAt: 'desc' } })
  console.log('client', c?.id)
  if (!c) return
  try {
    const a = await prisma.account.findFirst({ where: { clientId: c.id } })
    console.log('account', a?.id ?? null)
  } catch (e) {
    console.error('account find error', e)
  }
  await prisma.$disconnect()
}
run()
