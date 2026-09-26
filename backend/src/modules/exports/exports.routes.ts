import { Router } from 'express';
import { exportsController } from './exports.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';

const router = Router();

router.get(
  ['/events/:eventId/export/:resource.csv', '/events/:eventId/exports/csv/:resource', '/events/:eventId/export/:resource'],
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('CSV_EXPORTED', 'Export', (req) => req.params.resource, (req) => req.params.eventId),
  exportsController.exportCsv
);

router.post(
  '/events/:eventId/import/bulk',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('BULK_IMPORT', 'Import', undefined, (req) => req.params.eventId),
  exportsController.importBulk
);

export default router;
