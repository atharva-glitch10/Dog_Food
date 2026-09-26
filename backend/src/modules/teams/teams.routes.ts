import { Router } from 'express';
import { teamsController } from './teams.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { CreateTeamSchema, InviteMemberSchema, JoinTeamSchema } from './teams.validator.js';
import { logAuditAction } from '../../middleware/auditLogger.js';
import { Role } from '@prisma/client';

const router = Router();

// Event-scoped team routes
router.get('/events/:eventId/teams', optionalAuth, teamsController.getTeamsByEvent);
router.get('/events/:eventId/teams/my-team', requireAuth, teamsController.getMyTeam);
router.post(
  '/events/:eventId/teams',
  requireAuth,
  validateBody(CreateTeamSchema),
  logAuditAction('TEAM_CREATED', 'Team', undefined, (req) => req.params.eventId),
  teamsController.createTeam
);

// Team-specific routes
router.get('/teams/:teamId', optionalAuth, teamsController.getTeam);
router.post(
  '/teams/:teamId/invites',
  requireAuth,
  validateBody(InviteMemberSchema),
  logAuditAction('TEAM_INVITE_SENT', 'Invitation', (req) => req.params.teamId),
  teamsController.inviteMember
);
router.post(
  '/teams/join',
  requireAuth,
  validateBody(JoinTeamSchema),
  logAuditAction('TEAM_JOINED', 'Team'),
  teamsController.joinTeam
);
router.delete(
  '/teams/:teamId/members/:userId',
  requireAuth,
  logAuditAction('TEAM_MEMBER_REMOVED', 'TeamMember', (req) => req.params.userId),
  teamsController.removeMember
);

export default router;
