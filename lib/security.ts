/**
 * lib/security.ts
 * Utilitaires de sécurité : authentification JWT, hashage passwords, RBAC
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRATION = '24h'
const BCRYPT_ROUNDS = 10
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-min'

// ───────────────────────────────────────────────────────────────────────────
// PASSWORD HASHING (bcrypt)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Hash un mot de passe avec bcrypt
 * @param password - Mot de passe en clair
 * @returns Promise<string> - Hash bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Vérifie un mot de passe contre son hash bcrypt
 * @param password - Mot de passe en clair
 * @param hash - Hash bcrypt
 * @returns Promise<boolean> - true si correspond
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ───────────────────────────────────────────────────────────────────────────
// ENCRYPTION (Sensitive Fields)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Chiffre un champ sensible (id_number, etc.)
 * @param plaintext - Données à chiffrer
 * @returns string - Base64 encrypted
 */
export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv)
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return `${iv.toString('hex')}:${encrypted}`
}

/**
 * Déchiffre un champ sensible
 * @param encrypted - Données chiffrées (format: iv:ciphertext)
 * @returns string - Données en clair
 */
export function decryptField(encrypted: string): string {
  const [ivHex, encryptedHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv)
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// ───────────────────────────────────────────────────────────────────────────
// JWT TOKEN MANAGEMENT
// ───────────────────────────────────────────────────────────────────────────

export interface JWTPayload {
  userId: string
  email: string
  role: 'admin' | 'caissier' | 'commercial'
  zone?: string
  iat?: number
  exp?: number
}

/**
 * Génère un token JWT
 * @param payload - Données à encoder
 * @returns string - JWT token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION })
}

/**
 * Vérifie et décode un token JWT
 * @param token - Token JWT
 * @returns JWTPayload | null - Payload ou null si invalide
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Extrait le token du header Authorization
 * @param authHeader - Header "Authorization: Bearer <token>"
 * @returns string | null - Token ou null
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

// ───────────────────────────────────────────────────────────────────────────
// ROLE-BASED ACCESS CONTROL (RBAC)
// ───────────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'caissier' | 'commercial'

/**
 * Permission matrix: qui peut faire quoi
 */
const PERMISSIONS: Record<UserRole, Set<string>> = {
  admin: new Set([
    'view:dashboard',
    'manage:users',
    'manage:clients',
    'view:clients',
    'view:reports',
    'validate:transactions',
    'process:transactions',
    'record:cotisations',
    'record:deposits',
    'manage:caisses',
    'export:data',
    'create:clients',
    'initiate:enrollment',
    'validate:deposits',
  ]),
  caissier: new Set([
    'view:dashboard',
    'process:transactions',
    'record:cotisations',
    'view:clients',
    'validate:deposits',
  ]),
  commercial: new Set([
    'view:dashboard',
    'create:clients',
    'view:clients',
    'record:cotisations',
    'initiate:enrollment',
  ]),
}

/**
 * Vérifie si un utilisateur a une permission
 * @param role - Rôle utilisateur
 * @param permission - Permission requise
 * @returns boolean - true si autorisé
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  return PERMISSIONS[role]?.has(permission) ?? false
}

/**
 * Obtient toutes les permissions d'un rôle
 * @param role - Rôle utilisateur
 * @returns string[] - Liste des permissions
 */
export function getPermissions(role: UserRole): string[] {
  return Array.from(PERMISSIONS[role] ?? new Set())
}

// ───────────────────────────────────────────────────────────────────────────
// CONSTRAINT VERIFICATION
// ───────────────────────────────────────────────────────────────────────────

/**
 * Valide la CHECK constraint cotisation_accounts
 * (XOR: soit apprenant_id, soit non_apprenant_id, pas les deux)
 */
export function validateCotisationAccountConstraint(
  apprenantId?: string | null,
  nonApprenantId?: string | null
): boolean {
  const apprenantProvided = apprenantId != null
  const nonApprenantProvided = nonApprenantId != null
  
  // XOR: exactement un doit être fourni
  return apprenantProvided !== nonApprenantProvided
}

/**
 * Valide le format membership_code (XXXXWFyyy)
 */
export function validateMembershipCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{4}WF\d{3}$/.test(code)
}

/**
 * Génère un membership code aléatoire
 */
export function generateMembershipCode(): string {
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, '0')
  const numericPart = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `${randomPart}WF${numericPart}`
}

/**
 * Génère un account_number unique
 */
export function generateAccountNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 10).toUpperCase()
  return `ACC-${timestamp}${random}`.substring(0, 20)
}

/**
 * Valide un email
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Valide un numéro de téléphone (format simple)
 */
export function validatePhone(phone: string): boolean {
  return /^[\d\s\-+()]{8,}$/.test(phone)
}

export default {
  hashPassword,
  verifyPassword,
  encryptField,
  decryptField,
  generateToken,
  verifyToken,
  extractToken,
  hasPermission,
  getPermissions,
  validateCotisationAccountConstraint,
  validateMembershipCodeFormat,
  generateMembershipCode,
  generateAccountNumber,
  validateEmail,
  validatePhone,
}
