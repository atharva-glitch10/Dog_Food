import { Router } from 'express';
import { resultsController } from './results.controller.js';
import { optionalAuth, requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';

const router = Router();

// Accepts both event UUID and slug — the service resolves the correct record
router.get('/events/:eventId/results', optionalAuth, resultsController.getResults);

router.post(
  '/events/:eventId/results/publish',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('RESULTS_PUBLISHED', 'Event', undefined, (req) => req.params.eventId),
  resultsController.publishResults
);

export default router;
