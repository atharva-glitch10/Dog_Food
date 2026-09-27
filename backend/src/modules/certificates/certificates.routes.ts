import { Router } from 'express';
import { validateBody } from '../../middleware/validate.js';
import { certificatesController } from './certificates.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';
import { GenerateCertificatesSchema } from './certificates.validator.js';

const router = Router();

router.post(
  '/events/:eventId/certificates/generate',
  requireAuth,
  requireRole([Role.ORGANIZER, Role.ADMIN]),
  logAuditAction('CERTIFICATES_GENERATED', 'Certificate', undefined, (req) => req.params.eventId),
  validateBody(GenerateCertificatesSchema),
  certificatesController.generate
);

router.get('/certificates/verify/:code', certificatesController.verify);
router.get('/certificates/my-certificates', requireAuth, certificatesController.getMyCertificates);

export default router;
