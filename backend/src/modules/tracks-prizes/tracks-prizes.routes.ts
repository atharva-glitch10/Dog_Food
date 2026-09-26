import { Router } from 'express';
import { tracksPrizesController } from './tracks-prizes.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';

const router = Router();

// Track routes
router.get('/events/:eventId/tracks', tracksPrizesController.getTracks);
router.post(
  '/events/:eventId/tracks',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('TRACK_CREATED', 'Track', undefined, (req) => req.params.eventId),
  tracksPrizesController.createTrack
);
router.put(
  '/tracks/:trackId',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('TRACK_UPDATED', 'Track', (req) => req.params.trackId),
  tracksPrizesController.updateTrack
);
router.delete(
  '/tracks/:trackId',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('TRACK_DELETED', 'Track', (req) => req.params.trackId),
  tracksPrizesController.deleteTrack
);

// Prize routes
router.get('/events/:eventId/prizes', tracksPrizesController.getPrizes);
router.post(
  '/events/:eventId/prizes',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('PRIZE_CREATED', 'Prize', undefined, (req) => req.params.eventId),
  tracksPrizesController.createPrize
);
router.put(
  '/prizes/:prizeId',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('PRIZE_UPDATED', 'Prize', (req) => req.params.prizeId),
  tracksPrizesController.updatePrize
);
router.delete(
  '/prizes/:prizeId',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('PRIZE_DELETED', 'Prize', (req) => req.params.prizeId),
  tracksPrizesController.deletePrize
);

export default router;
