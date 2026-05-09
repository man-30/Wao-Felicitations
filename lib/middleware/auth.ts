/**
 * lib/middleware/auth.ts
 * Middlewares Express pour authentification JWT et RBAC
 */

import { Request, Response, NextFunction } from 'express'
import { verifyToken, extractToken, hasPermission } from '../security.ts'
import { logLogin, logSystemError } from '../db/actionLog.ts'

// Étendre le type Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        email: string
        role: 'admin' | 'caissier' | 'commercial'
        zone?: string
      }
    }
  }
}

/**
 * Middleware: Vérification du token JWT
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = extractToken(authHeader)

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return res.status(403).json({ error: 'Invalid or expired token' })
  }

  req.user = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    zone: payload.zone,
  }

  next()
}

/**
 * Middleware: Vérification RBAC (Role-Based Access Control)
 * Usage: requireRole('admin', 'caissier')
 */
export function requireRole(...roles: Array<'admin' | 'caissier' | 'commercial'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions', requiredRoles: roles })
    }

    next()
  }
}

/**
 * Middleware: Vérification de permission spécifique
 * Usage: requirePermission('process:transactions')
 */
export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const hasAllPermissions = permissions.every((perm) => hasPermission(req.user!.role, perm))

    if (!hasAllPermissions) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        requiredPermissions: permissions,
      })
    }

    next()
  }
}

/**
 * Middleware: Validation du zone (pour commercial)
 * Assure que le commercial ne peut accéder qu'aux données de sa zone
 */
export function validateZoneAccess(paramName = 'zone') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    // Admins et caissiers peuvent accéder partout
    if (req.user.role !== 'commercial') {
      return next()
    }

    // Les commerciaux ne peuvent accéder que leur zone
    const requestedZone = req.params[paramName] || req.query[paramName] || req.body?.zone

    if (requestedZone && requestedZone !== req.user.zone) {
      return res.status(403).json({
        error: 'Access denied to this zone',
        userZone: req.user.zone,
        requestedZone,
      })
    }

    next()
  }
}

/**
 * Middleware: Error handler avec logging
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('API Error:', err)

  // Logger l'erreur
  if (req.user) {
    logSystemError(req.user.userId, req.user.email, req.user.role, err.message, err.stack).catch(() => {})
  }

  const statusCode = err.status || err.statusCode || 500
  const isParseError = err.type === 'entity.parse.failed'
  const errorMessage = isParseError
    ? 'Invalid JSON payload'
    : statusCode >= 400 && statusCode < 500
    ? err.message || 'Bad request'
    : 'Internal server error'

  res.status(statusCode).json({
    error: errorMessage,
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
}

export default {
  authenticateToken,
  requireRole,
  requirePermission,
  validateZoneAccess,
  errorHandler,
}
