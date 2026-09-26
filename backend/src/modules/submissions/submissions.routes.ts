import { Router } from 'express';
import { submissionsController } from './submissions.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/requireAuth.js';
import { validateBody } from '../../middleware/validate.js';
import { CreateProjectSchema, UpdateProjectSchema } from './submissions.validator.js';
import { logAuditAction } from '../../middleware/auditLogger.js';

const router = Router();

// Event-scoped submission routes
router.get('/events/:eventId/submissions', optionalAuth, submissionsController.getSubmissions);
router.post(
  '/events/:eventId/submissions',
  requireAuth,
  validateBody(CreateProjectSchema),
  logAuditAction('PROJECT_CREATED', 'Project', undefined, (req) => req.params.eventId),
  submissionsController.createProject
);

// Project-specific routes
router.get('/projects/:id', optionalAuth, submissionsController.getProject);
router.put(
  '/projects/:id',
  requireAuth,
  validateBody(UpdateProjectSchema),
  logAuditAction('PROJECT_UPDATED', 'Project', (req) => req.params.id),
  submissionsController.updateProject
);
router.post(
  '/projects/:id/submit',
  requireAuth,
  logAuditAction('PROJECT_SUBMITTED', 'Project', (req) => req.params.id),
  submissionsController.submitProject
);
router.post(
  '/projects/:id/finalize',
  requireAuth,
  logAuditAction('PROJECT_FINALIZED', 'Project', (req) => req.params.id),
  submissionsController.finalizeProject
);

export default router;
