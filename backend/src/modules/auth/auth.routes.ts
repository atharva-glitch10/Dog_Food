import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { RegisterSchema, LoginSchema, UpdateProfileSchema } from './auth.validator.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { rateLimiter } from '../../middleware/rateLimiter.js';
import { logAuditAction } from '../../middleware/auditLogger.js';

const router = Router();

// Auth rate limiter: max 15 requests per 1 minute
const authLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: 'Too many authentication attempts. Please try again in 1 minute.',
});

router.post(
  '/register',
  authLimiter,
  validateBody(RegisterSchema),
  logAuditAction('USER_REGISTERED', 'User'),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validateBody(LoginSchema),
  logAuditAction('USER_LOGGED_IN', 'User'),
  authController.login
);

router.post(
  '/logout',
  requireAuth,
  logAuditAction('USER_LOGGED_OUT', 'User'),
  authController.logout
);

router.get('/me', requireAuth, authController.getMe);

router.put(
  '/profile',
  requireAuth,
  validateBody(UpdateProfileSchema),
  logAuditAction('PROFILE_UPDATED', 'User'),
  authController.updateProfile
);

export default router;
