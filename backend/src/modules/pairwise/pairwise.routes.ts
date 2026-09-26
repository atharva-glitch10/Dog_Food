import { Router } from 'express';
import { pairwiseController } from './pairwise.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '@prisma/client';

const router = Router();

router.get(
  '/events/:eventId/pairwise/pairs',
  requireAuth,
  requireRole([Role.JUDGE, Role.ORGANIZER, Role.ADMIN]),
  pairwiseController.getRandomPair
);

router.post(
  '/events/:eventId/pairwise/compare',
  requireAuth,
  requireRole([Role.JUDGE, Role.ORGANIZER, Role.ADMIN]),
  pairwiseController.recordComparison
);

router.post(
  '/events/:eventId/pairwise/compute',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  pairwiseController.computeRankings
);

export default router;
