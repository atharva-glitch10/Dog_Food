import { z } from 'zod';

export const CreateTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
});

export const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address format'),
});

export const JoinTeamSchema = z.object({
  inviteCode: z.string().optional(),
  token: z.string().optional(),
}).refine((data) => data.inviteCode || data.token, {
  message: 'Must provide either inviteCode or token to join a team',
});
