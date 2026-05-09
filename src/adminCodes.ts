import { db } from './localStorageDB';
import { AdminCodeActionType, AdminCodeRequest, User } from './types';

const CODE_TTL_MINUTES = 10;

function nowIso() {
  return new Date().toISOString();
}

function shortCode() {
  return 'ADM-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function isExpired(request: AdminCodeRequest) {
  return request.expiresAt ? new Date(request.expiresAt).getTime() < Date.now() : false;
}

export function refreshAdminCodeRequests() {
  const requests = db.getAdminCodeRequests();
  const updated = requests.map((request) =>
    request.status === 'generated' && isExpired(request)
      ? { ...request, status: 'expired' as const }
      : request,
  );
  db.saveAdminCodeRequests(updated);
  return updated;
}

export function requestAdminCode(params: {
  requestedBy: User;
  actionType: AdminCodeActionType;
  targetId: string;
  targetLabel: string;
  reason?: string;
}) {
  const requests = refreshAdminCodeRequests();
  const existing = requests.find(
    (request) =>
      request.requestedBy === params.requestedBy.id &&
      request.actionType === params.actionType &&
      request.targetId === params.targetId &&
      (request.status === 'pending' || request.status === 'generated'),
  );

  if (existing) return existing;

  const request: AdminCodeRequest = {
    id: 'acr_' + Date.now() + Math.random().toString(36).slice(2, 6),
    requestedBy: params.requestedBy.id,
    requestedByName: params.requestedBy.name,
    actionType: params.actionType,
    targetId: params.targetId,
    targetLabel: params.targetLabel,
    reason: params.reason,
    status: 'pending',
    requestedAt: nowIso(),
  };

  db.saveAdminCodeRequests([request, ...requests]);
  db.addLog(
    params.requestedBy.id,
    params.requestedBy.name,
    params.requestedBy.role,
    'Demande Code Admin',
    `${params.actionType} demandé pour ${params.targetLabel}`,
  );
  return request;
}

export function generateAdminCode(requestId: string, admin: User) {
  const requests = refreshAdminCodeRequests();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();
  let generatedCode = '';

  const updated = requests.map((request) => {
    if (request.id !== requestId) return request;
    generatedCode = shortCode();
    return {
      ...request,
      code: generatedCode,
      status: 'generated' as const,
      generatedAt: nowIso(),
      expiresAt,
    };
  });

  db.saveAdminCodeRequests(updated);
  db.addLog(admin.id, admin.name, admin.role, 'Génération Code Admin', `Code généré pour la demande ${requestId}`);
  return generatedCode;
}

export function validateAndConsumeAdminCode(params: {
  code: string;
  actionType: AdminCodeActionType;
  targetId: string;
  usedBy: User;
}) {
  const requests = refreshAdminCodeRequests();
  const normalized = params.code.trim().toUpperCase();
  const found = requests.find(
    (request) =>
      request.code === normalized &&
      request.actionType === params.actionType &&
      request.targetId === params.targetId &&
      request.status === 'generated' &&
      !isExpired(request),
  );

  if (!found) return { ok: false, message: 'Code invalide, expiré ou déjà utilisé.' };

  const updated = requests.map((request) =>
    request.id === found.id
      ? { ...request, status: 'used' as const, usedAt: nowIso(), usedBy: params.usedBy.id }
      : request,
  );
  db.saveAdminCodeRequests(updated);
  return { ok: true, request: found };
}

export function actionTypeLabel(actionType: AdminCodeActionType) {
  switch (actionType) {
    case 'client_edit': return 'Modification client';
    case 'cotisation_edit': return 'Modification cotisation';
    case 'cotisation_delete': return 'Suppression cotisation';
    case 'deposit_edit': return 'Correction dépôt';
  }
}