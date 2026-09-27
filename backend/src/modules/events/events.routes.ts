import { Router } from 'express';
import { eventsController } from './events.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { CreateEventSchema, UpdateEventSchema, UpdateEventStatusSchema } from './events.validator.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', optionalAuth, eventsController.getAllEvents);
router.get('/:idOrSlug', optionalAuth, eventsController.getEvent);

router.post(
  '/',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  validateBody(CreateEventSchema),
  logAuditAction('EVENT_CREATED', 'Event'),
  eventsController.createEvent
);

router.put(
  '/:id',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  validateBody(UpdateEventSchema),
  logAuditAction('EVENT_UPDATED', 'Event', (req) => req.params.id),
  eventsController.updateEvent
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('EVENT_STATUS_UPDATED', 'Event', (req) => req.params.id),
  validateBody(UpdateEventStatusSchema),
  eventsController.updateStatus
);

export default router;
