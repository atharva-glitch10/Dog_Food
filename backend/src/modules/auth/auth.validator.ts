import { z } from 'zod';
import { httpUrlOrUploadPath } from '../../utils/query.js';
import { Role } from '@prisma/client';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  // Self-registration always creates a PARTICIPANT. Judges are promoted by
  // organizers (POST /events/:id/judges); organizers/admins by an admin.
  role: z
    .literal(Role.PARTICIPANT, {
      errorMap: () => ({ message: 'Only participant accounts can be self-registered.' }),
    })
    .optional()
    .default(Role.PARTICIPANT),
  bio: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().optional(),
  avatarUrl: httpUrlOrUploadPath().optional().or(z.literal('')),
});
