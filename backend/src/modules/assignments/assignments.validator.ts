import { z } from 'zod';

export const AutoAssignSchema = z
  .object({
    seed: z.number().int().optional(),
    targetPerProject: z.number().int().min(1).max(50).optional(),
    clearExisting: z.boolean().optional(),
  })
  .default({});

export const ManualAssignSchema = z.object({
  judgeId: z.string().min(1).max(64),
  projectId: z.string().min(1).max(64),
});
