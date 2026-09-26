import { Router } from 'express';
import { normalizationController } from './normalization.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';

const router = Router();

router.post(
  '/events/:eventId/judging/normalize',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('SCORES_NORMALIZED', 'Event', undefined, (req) => req.params.eventId),
  normalizationController.normalize
);

export default router;
