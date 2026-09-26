import { Router } from 'express';
import { votingController } from './voting.controller.js';
import { optionalAuth, requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { rateLimiter } from '../../middleware/rateLimiter.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';

const router = Router();

const voteLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Vote submission rate limit exceeded. Please wait 1 minute.',
});

router.post(
  '/events/:eventId/vote/:projectId',
  voteLimiter,
  optionalAuth,
  logAuditAction('VOTE_CAST', 'Vote', (req) => req.params.projectId, (req) => req.params.eventId),
  votingController.castVote
);

router.get('/events/:eventId/vote/my-votes', optionalAuth, votingController.getMyVotes);

router.get(
  '/events/:eventId/vote/stats',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  votingController.getStats
);

export default router;
