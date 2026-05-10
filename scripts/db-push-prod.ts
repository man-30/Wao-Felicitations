import { config } from 'dotenv'
import { execSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: join(__dirname, '..', '.env.production') })

try {
  console.log('📦 Chargement de .env.production et lancement de prisma db push...')
  execSync('npx prisma db push', { stdio: 'inherit', cwd: join(__dirname, '..') })
  console.log('✅ db push production terminé')
} catch (error) {
  console.error('❌ Échec du db push production:', error)
  process.exit(1)
}
