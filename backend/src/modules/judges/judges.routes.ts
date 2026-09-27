import { Router } from 'express';
import { validateBody } from '../../middleware/validate.js';
import { judgesController } from './judges.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';
import { AddJudgeSchema } from './judges.validator.js';

const router = Router();

router.get(
  '/events/:eventId/judges',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  judgesController.getJudges
);

router.post(
  '/events/:eventId/judges',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('JUDGE_ADDED', 'Judge', undefined, (req) => req.params.eventId),
  validateBody(AddJudgeSchema),
  judgesController.addJudge
);

router.get(
  '/events/:eventId/judges/my-assignments',
  requireAuth,
  requireRole([Role.JUDGE, Role.ORGANIZER, Role.ADMIN]),
  judgesController.getMyAssignments
);

export default router;
