import { z } from 'zod';
import { httpUrlOrUploadPath } from '../../utils/query.js';
import { Role } from '@prisma/client';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  role: z.nativeEnum(Role).optional().default(Role.PARTICIPANT),
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
