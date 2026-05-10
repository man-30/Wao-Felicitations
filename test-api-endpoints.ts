import { config } from 'dotenv'

config()

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001'
const TEST_EMAIL = process.env.TEST_API_EMAIL || 'admin@wao-felicitations.com'
const TEST_PASSWORD = process.env.TEST_API_PASSWORD || 'AdminProd2026!SecurePassword'

async function run() {
  const results: Array<{ name: string; ok: boolean; details: string }> = []

  async function check(name: string, fn: () => Promise<void>) {
    try {
      await fn()
      results.push({ name, ok: true, details: 'OK' })
    } catch (error: any) {
      results.push({ name, ok: false, details: error?.message || String(error) })
    }
  }

  await check('GET /health', async () => {
    const res = await fetch(`${API_URL}/health`)
    if (!res.ok) throw new Error(`Status ${res.status}`)
    const body = await res.json()
    if (body.status !== 'ok') throw new Error('Health payload unexpected')
  })

  let token = ''

  await check('POST /api/auth/login', async () => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    })
    if (!res.ok) throw new Error(`Status ${res.status}`)
    const body = await res.json()
    if (!body.token) throw new Error('Token not returned')
    if (!body.user || !body.user.role) throw new Error('User payload invalid')
    token = body.token
  })

  await check('GET /api/dashboard/stats', async () => {
    const res = await fetch(`${API_URL}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Status ${res.status}`)
    const body = await res.json()
    if (typeof body.clients !== 'number') throw new Error('Stats payload missing clients')
  })

  await check('GET /api/audit-logs', async () => {
    const res = await fetch(`${API_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Status ${res.status}`)
    const body = await res.json()
    if (!Array.isArray(body.logs)) throw new Error('Audit logs payload invalid')
  })

  console.log('API Test Results:')
  results.forEach((result) => {
    console.log(`${result.ok ? '✅' : '❌'} ${result.name} — ${result.details}`)
  })
  const failed = results.filter((r) => !r.ok)
  process.exit(failed.length > 0 ? 1 : 0)
}

run().catch((error) => {
  console.error('Test runner failed', error)
  process.exit(1)
})
