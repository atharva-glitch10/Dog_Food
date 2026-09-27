import { Router } from 'express';
import { validateBody } from '../../middleware/validate.js';
import { scoringController } from './scoring.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';
import { SubmitEvaluationSchema } from './scoring.validator.js';

const router = Router();

router.get(
  '/evaluations/project/:projectId',
  requireAuth,
  scoringController.getEvaluation
);

router.post(
  '/evaluations',
  requireAuth,
  requireRole([Role.JUDGE, Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('EVALUATION_SUBMITTED', 'Evaluation', (req) => req.body?.projectId, (req) => req.body?.eventId),
  validateBody(SubmitEvaluationSchema),
  scoringController.submitEvaluation
);

router.get(
  '/events/:eventId/judging/stats',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  scoringController.getStats
);

export default router;
