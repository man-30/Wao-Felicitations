import { prisma } from './lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const users = await prisma.user.findMany()
  for (const user of users) {
    if (user.password && !user.password.startsWith('$2')) {
      const hashed = await bcrypt.hash(user.password, 10)
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed }
      })
      console.log(`Hashed password for user: ${user.email}`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
