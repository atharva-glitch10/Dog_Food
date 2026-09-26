import { Router } from 'express';
import { auditController } from './audit.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '@prisma/client';

const router = Router();

router.get(
  '/events/:eventId/audit-logs',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  auditController.getAuditLogs
);

router.get(
  '/audit-logs',
  requireAuth,
  requireRole([Role.ADMIN]),
  auditController.getAuditLogs
);

export default router;
