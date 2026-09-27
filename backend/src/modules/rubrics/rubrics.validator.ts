import { z } from 'zod';

export const SaveRubricSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  criteria: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().max(2000).default(''),
        weight: z.number().finite().positive(),
        maxScore: z.number().int().min(1).max(1000).optional(),
        orderIndex: z.number().int().min(0).optional(),
      })
    )
    .min(1, 'A rubric must contain at least one criterion.')
    .max(50),
});
