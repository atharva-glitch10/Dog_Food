import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { webhookService, WEBHOOK_EVENT_TYPES } from '../modules/webhooks/webhook.service.js';

const WEBHOOK_EVENTS = new Set<string>(WEBHOOK_EVENT_TYPES);

export function logAuditAction(action: string, entityType: string, getEntityId?: (req: Request) => string | undefined, getEventId?: (req: Request) => string | undefined) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Intercept finish event to log only upon successful response
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const entityId = getEntityId ? getEntityId(req) : req.params.id || undefined;
          const explicitEventId = getEventId ? getEventId(req) : req.params.eventId || req.body?.eventId || undefined;
          const eventId = explicitEventId || (await resolveEventId(entityType, entityId));
          const ipAddress = req.ip || req.socket.remoteAddress || null;

          await prisma.auditLog.create({
            data: {
              eventId: eventId || null,
              userId: req.user?.id || null,
              action,
              entityType,
              entityId: entityId || null,
              ipAddress,
              payload: {
                method: req.method,
                path: req.originalUrl,
                params: req.params,
                query: redactSecrets(req.query),
                body: redactSecrets(req.body),
              },
            },
          });

          // Outbound webhooks for the same successful domain actions. Draft
          // evaluations are not "submitted", so they do not fire.
          if (eventId && WEBHOOK_EVENTS.has(action) && !(action === 'EVALUATION_SUBMITTED' && req.body?.isDraft === true)) {
            void webhookService.dispatchEvent(eventId, action, {
              entityType,
              entityId: entityId || null,
              actorUserId: req.user?.id || null,
            });
          }
        } catch (err) {
          console.error('Failed to write audit log:', err);
        }
      }
    });

    next();
  };
}

/** Some routes only know the entity (e.g. /projects/:id/submit); derive its event. */
async function resolveEventId(entityType: string, entityId: string | undefined): Promise<string | undefined> {
  if (!entityId) return undefined;
  if (entityType === 'Event') return entityId;
  if (entityType === 'Project') {
    const project = await prisma.project.findUnique({ where: { id: entityId }, select: { eventId: true } });
    return project?.eventId;
  }
  return undefined;
}

const SECRET_KEYS = /^(password|passwordHash|secret|token|currentPassword|newPassword)$/i;

/** Recursively redact credential-like fields (including inside arrays, e.g. bulk-import rows). */
export function redactSecrets(value: any, depth = 0): any {
  if (value === null || typeof value !== 'object' || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => redactSecrets(v, depth + 1));
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SECRET_KEYS.test(k) ? '[REDACTED]' : redactSecrets(v, depth + 1);
  }
  return out;
}
