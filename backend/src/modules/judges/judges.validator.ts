import { z } from 'zod';

export const AddJudgeSchema = z.object({
  email: z.string().trim().email(),
  capacity: z.number().int().min(1).max(1000).optional(),
});
