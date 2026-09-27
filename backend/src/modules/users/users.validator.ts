import { z } from 'zod';
import { Role } from '@prisma/client';

export const UpdateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});
