import { Router } from 'express';
import { validateBody } from '../../middleware/validate.js';
import { rubricsController } from './rubrics.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';
import { SaveRubricSchema } from './rubrics.validator.js';

const router = Router();

router.get('/events/:eventId/rubrics', optionalAuth, rubricsController.getRubric);

router.post(
  '/events/:eventId/rubrics',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('RUBRIC_SAVED', 'Rubric', undefined, (req) => req.params.eventId),
  validateBody(SaveRubricSchema),
  rubricsController.saveRubric
);

export default router;
