/**
 * VALIDATION_TESTS.ts
 * Tests de vérification pour PHASE 6, 7, 8
 * 
 * Exécutez avec: npx ts-node VALIDATION_TESTS.ts
 */

import {
  hashPassword,
  verifyPassword,
  encryptField,
  decryptField,
  generateToken,
  verifyToken,
  hasPermission,
  validateEmail,
  validatePhone,
  validateMembershipCodeFormat,
  generateMembershipCode,
  generateAccountNumber,
  extractToken,
} from './lib/security.ts'
import { prisma } from './lib/prisma.ts'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

const results: TestResult[] = []

// Utility pour tester
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now()
  const result: TestResult = { name, passed: true, duration: 0 }

  try {
    await fn()
  } catch (error: any) {
    result.passed = false
    result.error = error.message || String(error)
  }

  result.duration = Date.now() - start
  results.push(result)

  const status = result.passed ? '✅' : '❌'
  const time = `(${result.duration}ms)`
  console.log(`${status} ${name} ${time}`)
  if (result.error) console.log(`   └─ Error: ${result.error}`)
}

// ───────────────────────────────────────────────────────────────────────────
// TESTS: PHASE 6 - SÉCURITÉ
// ───────────────────────────────────────────────────────────────────────────

async function runPhase6Tests() {
  console.log('\n=== PHASE 6 TESTS: Sécurité ===\n')

  // Password hashing
  await test('hashPassword: crée un hash bcrypt', async () => {
    const password = 'TestPassword123!'
    const hash = await hashPassword(password)
    if (!hash.startsWith('$2b$') && !hash.startsWith('$2a$')) {
      throw new Error('Hash ne commence pas par $2b$ ou $2a$')
    }
  })

  await test('verifyPassword: vérifie le bon password', async () => {
    const password = 'TestPassword123!'
    const hash = await hashPassword(password)
    const valid = await verifyPassword(password, hash)
    if (!valid) throw new Error('Password verification failed')
  })

  await test('verifyPassword: rejette le mauvais password', async () => {
    const password = 'CorrectPassword'
    const hash = await hashPassword(password)
    const invalid = await verifyPassword('WrongPassword', hash)
    if (invalid) throw new Error('Should have rejected wrong password')
  })

  // Encryption
  await test('encryptField: chiffre et retourne format iv:ciphertext', async () => {
    const plaintext = 'SecretData123'
    const encrypted = encryptField(plaintext)
    if (!encrypted.includes(':')) {
      throw new Error('Format should be iv:ciphertext')
    }
  })

  await test('decryptField: déchiffre correctement', async () => {
    const plaintext = 'CD-123456789-ABC'
    const encrypted = encryptField(plaintext)
    const decrypted = decryptField(encrypted)
    if (decrypted !== plaintext) {
      throw new Error(`Expected "${plaintext}", got "${decrypted}"`)
    }
  })

  await test('Encryption: données différentes chaque fois (IV unique)', async () => {
    const plaintext = 'SameData'
    const enc1 = encryptField(plaintext)
    const enc2 = encryptField(plaintext)
    if (enc1 === enc2) {
      throw new Error('Encrypted values should be different (different IVs)')
    }
  })

  // JWT
  await test('generateToken: crée un token JWT valide', async () => {
    const payload = {
      userId: 'u1',
      email: 'user@example.com',
      role: 'admin' as const,
    }
    const token = generateToken(payload)
    if (!token || token.split('.').length !== 3) {
      throw new Error('Invalid JWT format (should have 3 parts)')
    }
  })

  await test('verifyToken: valide et décode le token', async () => {
    const payload = {
      userId: 'u1',
      email: 'user@example.com',
      role: 'admin' as const,
      zone: 'kinshasa',
    }
    const token = generateToken(payload)
    const verified = verifyToken(token)
    if (!verified || verified.userId !== 'u1' || verified.email !== 'user@example.com') {
      throw new Error('Token verification failed')
    }
  })

  await test('verifyToken: rejette les tokens invalides', async () => {
    const verified = verifyToken('invalid.token.here')
    if (verified !== null) {
      throw new Error('Should have returned null for invalid token')
    }
  })

  await test('extractToken: extrait le token du Bearer header', async () => {
    const authHeader = 'Bearer mytoken123'
    const token = extractToken(authHeader)
    if (token !== 'mytoken123') {
      throw new Error(`Expected "mytoken123", got "${token}"`)
    }
  })

  // RBAC
  await test('hasPermission: admin a toutes les permissions', async () => {
    const perms = ['view:dashboard', 'manage:users', 'process:transactions', 'export:data']
    perms.forEach((perm) => {
      if (!hasPermission('admin', perm)) {
        throw new Error(`Admin should have ${perm}`)
      }
    })
  })

  await test('hasPermission: caissier ne peut pas manage:users', async () => {
    if (hasPermission('caissier', 'manage:users')) {
      throw new Error('Caissier should not have manage:users')
    }
  })

  await test('hasPermission: commercial ne peut pas export:data', async () => {
    if (hasPermission('commercial', 'export:data')) {
      throw new Error('Commercial should not have export:data')
    }
  })

  // Validation
  await test('validateEmail: accepte les emails valides', async () => {
    const validEmails = ['user@example.com', 'test@wao.cd', 'name+tag@domain.co.uk']
    validEmails.forEach((email) => {
      if (!validateEmail(email)) {
        throw new Error(`Should accept ${email}`)
      }
    })
  })

  await test('validateEmail: rejette les emails invalides', async () => {
    const invalidEmails = ['not-an-email', '@example.com', 'user@', 'user @example.com']
    invalidEmails.forEach((email) => {
      if (validateEmail(email)) {
        throw new Error(`Should reject ${email}`)
      }
    })
  })

  await test('validatePhone: accepte les formats valides', async () => {
    const validPhones = ['+243812345678', '+243898765432', '0812345678']
    validPhones.forEach((phone) => {
      if (!validatePhone(phone)) {
        throw new Error(`Should accept ${phone}`)
      }
    })
  })

  await test('validatePhone: rejette les formats invalides', async () => {
    const invalidPhones = ['123', '+1234', 'abc', '+243-81-23456']
    invalidPhones.forEach((phone) => {
      if (validatePhone(phone)) {
        throw new Error(`Should reject ${phone}`)
      }
    })
  })

  await test('validateMembershipCodeFormat: accepte les formats valides', async () => {
    const validCodes = ['A1B2WF123', 'ZXCVWF999', '1234WF000']
    validCodes.forEach((code) => {
      if (!validateMembershipCodeFormat(code)) {
        throw new Error(`Should accept ${code}`)
      }
    })
  })

  await test('validateMembershipCodeFormat: rejette les formats invalides', async () => {
    const invalidCodes = ['ABCDEFG123', 'A1B2WF12', 'A1B2XF123', 'A1B2WF']
    invalidCodes.forEach((code) => {
      if (validateMembershipCodeFormat(code)) {
        throw new Error(`Should reject ${code}`)
      }
    })
  })

  // Code generation
  await test('generateMembershipCode: génère au format XXXXWF###', async () => {
    const code = generateMembershipCode()
    if (!validateMembershipCodeFormat(code)) {
      throw new Error(`Generated code "${code}" doesn't match format`)
    }
  })

  await test('generateAccountNumber: génère au format ACC-...-...', async () => {
    const account = generateAccountNumber()
    if (!account.startsWith('ACC-')) {
      throw new Error('Account number should start with ACC-')
    }
    const parts = account.split('-')
    if (parts.length !== 3) {
      throw new Error('Account number should have 3 parts')
    }
  })

  await test('generateMembershipCode: génère des codes uniques', async () => {
    const codes = new Set()
    for (let i = 0; i < 100; i++) {
      const code = generateMembershipCode()
      if (codes.has(code)) {
        throw new Error('Duplicate code generated')
      }
      codes.add(code)
    }
  })
}

// ───────────────────────────────────────────────────────────────────────────
// TESTS: PHASE 7 - LOGIQUE MÉTIER
// ───────────────────────────────────────────────────────────────────────────

async function runPhase7Tests() {
  console.log('\n=== PHASE 7 TESTS: Logique Métier ===\n')

  // Vérifier que les fonctions sont importables
  await test('businessLogic: createClientWithCodes est importable', async () => {
    const { createClientWithCodes } = await import('@/lib/db/businessLogic')
    if (typeof createClientWithCodes !== 'function') {
      throw new Error('createClientWithCodes is not a function')
    }
  })

  await test('businessLogic: recordTransaction est importable', async () => {
    const { recordTransaction } = await import('@/lib/db/businessLogic')
    if (typeof recordTransaction !== 'function') {
      throw new Error('recordTransaction is not a function')
    }
  })

  await test('businessLogic: validateTransaction est importable', async () => {
    const { validateTransaction } = await import('@/lib/db/businessLogic')
    if (typeof validateTransaction !== 'function') {
      throw new Error('validateTransaction is not a function')
    }
  })

  await test('businessLogic: recordCotisation est importable', async () => {
    const { recordCotisation } = await import('@/lib/db/businessLogic')
    if (typeof recordCotisation !== 'function') {
      throw new Error('recordCotisation is not a function')
    }
  })

  await test('businessLogic: recordAdvancedDeposit est importable', async () => {
    const { recordAdvancedDeposit } = await import('@/lib/db/businessLogic')
    if (typeof recordAdvancedDeposit !== 'function') {
      throw new Error('recordAdvancedDeposit is not a function')
    }
  })

  await test('businessLogic: calculateFinancementApportPercentage est importable', async () => {
    const { calculateFinancementApportPercentage } = await import('@/lib/db/businessLogic')
    if (typeof calculateFinancementApportPercentage !== 'function') {
      throw new Error('calculateFinancementApportPercentage is not a function')
    }
  })

  await test('businessLogic: recordMissingDayRegularization est importable', async () => {
    const { recordMissingDayRegularization } = await import('@/lib/db/businessLogic')
    if (typeof recordMissingDayRegularization !== 'function') {
      throw new Error('recordMissingDayRegularization is not a function')
    }
  })

  await test('businessLogic: transferFinancementToSavings est importable', async () => {
    const { transferFinancementToSavings } = await import('@/lib/db/businessLogic')
    if (typeof transferFinancementToSavings !== 'function') {
      throw new Error('transferFinancementToSavings is not a function')
    }
  })
}

// ───────────────────────────────────────────────────────────────────────────
// TESTS: PHASE 8 - JOURNALISATION
// ───────────────────────────────────────────────────────────────────────────

async function runPhase8Tests() {
  console.log('\n=== PHASE 8 TESTS: Journalisation ActionLogs ===\n')

  // Vérifier les types d'action
  await test('actionLog: ActionType enum contient tous les types', async () => {
    const { ActionType } = await import('@/lib/db/actionLog')
    const requiredTypes = [
      'LOGIN',
      'LOGOUT',
      'CREATE_CLIENT',
      'DEPOSIT',
      'WITHDRAWAL',
      'RECORD_COTISATION',
      'VALIDATE_TRANSACTION',
    ]
    requiredTypes.forEach((type) => {
      if (!(type in ActionType)) {
        throw new Error(`Missing ActionType.${type}`)
      }
    })
  })

  // Vérifier que les fonctions de logging sont importables
  await test('actionLog: logLogin est importable', async () => {
    const { logLogin } = await import('@/lib/db/actionLog')
    if (typeof logLogin !== 'function') {
      throw new Error('logLogin is not a function')
    }
  })

  await test('actionLog: logCreateClient est importable', async () => {
    const { logCreateClient } = await import('@/lib/db/actionLog')
    if (typeof logCreateClient !== 'function') {
      throw new Error('logCreateClient is not a function')
    }
  })

  await test('actionLog: getActionLogs est importable', async () => {
    const { getActionLogs } = await import('@/lib/db/actionLog')
    if (typeof getActionLogs !== 'function') {
      throw new Error('getActionLogs is not a function')
    }
  })

  await test('actionLog: getUserActivityLog est importable', async () => {
    const { getUserActivityLog } = await import('@/lib/db/actionLog')
    if (typeof getUserActivityLog !== 'function') {
      throw new Error('getUserActivityLog is not a function')
    }
  })
}

// ───────────────────────────────────────────────────────────────────────────
// TESTS: MIDDLEWARES
// ───────────────────────────────────────────────────────────────────────────

async function runMiddlewareTests() {
  console.log('\n=== MIDDLEWARE TESTS: Authentication & RBAC ===\n')

  await test('middleware: authenticateToken est importable', async () => {
    const { authenticateToken } = await import('@/lib/middleware/auth')
    if (typeof authenticateToken !== 'function') {
      throw new Error('authenticateToken is not a function')
    }
  })

  await test('middleware: requireRole est importable', async () => {
    const { requireRole } = await import('@/lib/middleware/auth')
    if (typeof requireRole !== 'function') {
      throw new Error('requireRole is not a function')
    }
  })

  await test('middleware: requirePermission est importable', async () => {
    const { requirePermission } = await import('@/lib/middleware/auth')
    if (typeof requirePermission !== 'function') {
      throw new Error('requirePermission is not a function')
    }
  })

  await test('middleware: validateZoneAccess est importable', async () => {
    const { validateZoneAccess } = await import('@/lib/middleware/auth')
    if (typeof validateZoneAccess !== 'function') {
      throw new Error('validateZoneAccess is not a function')
    }
  })

  await test('middleware: errorHandler est importable', async () => {
    const { errorHandler } = await import('@/lib/middleware/auth')
    if (typeof errorHandler !== 'function') {
      throw new Error('errorHandler is not a function')
    }
  })
}

// ───────────────────────────────────────────────────────────────────────────
// SUMMARY
// ───────────────────────────────────────────────────────────────────────────

function printSummary() {
  console.log('\n╔════════════════════════════════════════════════════════╗')
  console.log('║             RÉSUMÉ DES TESTS                          ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0)

  console.log(`Total: ${results.length} tests`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏱️  Time: ${totalTime}ms\n`)

  if (failed > 0) {
    console.log('Failed tests:')
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  ❌ ${r.name}`)
      console.log(`     └─ ${r.error}`)
    })
  }

  console.log('\n╔════════════════════════════════════════════════════════╗')
  if (failed === 0) {
    console.log('║          ✅ TOUS LES TESTS RÉUSSIS!                   ║')
  } else {
    console.log(`║          ❌ ${failed} TEST(S) ÉCHOUÉ(S)                  ║`)
  }
  console.log('╚════════════════════════════════════════════════════════╝\n')

  process.exit(failed === 0 ? 0 : 1)
}

// ───────────────────────────────────────────────────────────────────────────
// MAIN
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   VALIDATION TESTS - PHASE 6, 7, 8                       ║
║   Sécurité • Logique Métier • Journalisation             ║
╚═══════════════════════════════════════════════════════════╝
  `)

  try {
    await runPhase6Tests()
    await runPhase7Tests()
    await runPhase8Tests()
    await runMiddlewareTests()

    printSummary()
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
