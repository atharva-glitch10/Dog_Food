import { Router } from 'express';
import { validateBody } from '../../middleware/validate.js';
import { usersController } from './users.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '@prisma/client';
import { UpdateRoleSchema } from './users.validator.js';

const router = Router();

router.get(
  '/users',
  requireAuth,
  requireRole([Role.ADMIN]),
  usersController.getAllUsers
);

router.patch(
  '/users/:userId/role',
  requireAuth,
  requireRole([Role.ADMIN]),
  validateBody(UpdateRoleSchema),
  usersController.updateUserRole
);

router.patch(
  '/users/:userId/toggle-active',
  requireAuth,
  requireRole([Role.ADMIN]),
  usersController.toggleActive
);

export default router;
