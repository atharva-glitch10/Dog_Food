import { Router } from 'express';
import { validateBody } from '../../middleware/validate.js';
import { webhooksController } from './webhooks.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';
import { WEBHOOK_EVENT_TYPES } from './webhook.service.js';
import { sendSuccess } from '../../utils/response.js';
import { CreateWebhookSchema } from './webhooks.validator.js';

const router = Router();

// Event types a subscription can listen to (drives the organizer UI checklist)
router.get(
  '/webhooks/event-types',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  (_req, res) => sendSuccess(res, WEBHOOK_EVENT_TYPES)
);

router.get(
  '/events/:eventId/webhooks',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  webhooksController.getSubscriptions
);

router.post(
  '/events/:eventId/webhooks',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('WEBHOOK_CREATED', 'WebhookSubscription', undefined, (req) => req.params.eventId),
  validateBody(CreateWebhookSchema),
  webhooksController.createSubscription
);

router.delete(
  '/webhooks/:subscriptionId',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('WEBHOOK_DELETED', 'WebhookSubscription', (req) => req.params.subscriptionId),
  webhooksController.deleteSubscription
);

export default router;
