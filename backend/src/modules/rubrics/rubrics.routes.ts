import { Router } from 'express';
import { rubricsController } from './rubrics.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/events/:eventId/rubrics', optionalAuth, rubricsController.getRubric);

router.post(
  '/events/:eventId/rubrics',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('RUBRIC_SAVED', 'Rubric', undefined, (req) => req.params.eventId),
  rubricsController.saveRubric
);

export default router;
