import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';

export function logAuditAction(action: string, entityType: string, getEntityId?: (req: Request) => string | undefined, getEventId?: (req: Request) => string | undefined) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Intercept finish event to log only upon successful response
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const entityId = getEntityId ? getEntityId(req) : req.params.id || undefined;
          const eventId = getEventId ? getEventId(req) : req.params.eventId || req.body?.eventId || undefined;
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
                query: req.query,
                body: sanitizePayload(req.body),
              },
            },
          });
        } catch (err) {
          console.error('Failed to write audit log:', err);
        }
      }
    });

    next();
  };
}

function sanitizePayload(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const clone = { ...body };
  if (clone.password) clone.password = '[REDACTED]';
  if (clone.secret) clone.secret = '[REDACTED]';
  return clone;
}
