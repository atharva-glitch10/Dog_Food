import { Router } from 'express';
import { validateBody } from '../../middleware/validate.js';
import { assignmentsController } from './assignments.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';
import { AutoAssignSchema, ManualAssignSchema } from './assignments.validator.js';

const router = Router();

router.post(
  '/events/:eventId/judges/assign/auto',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('JUDGE_AUTO_ASSIGNED', 'JudgeAssignment', undefined, (req) => req.params.eventId),
  validateBody(AutoAssignSchema),
  assignmentsController.autoAssign
);

router.post(
  '/events/:eventId/judges/assign/manual',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('JUDGE_MANUAL_ASSIGNED', 'JudgeAssignment', undefined, (req) => req.params.eventId),
  validateBody(ManualAssignSchema),
  assignmentsController.manualAssign
);

router.delete(
  '/assignments/:assignmentId',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('JUDGE_ASSIGNMENT_DELETED', 'JudgeAssignment', (req) => req.params.assignmentId),
  assignmentsController.deleteAssignment
);

export default router;
