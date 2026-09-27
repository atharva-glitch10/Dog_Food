import { z } from 'zod';

export const SubmitEvaluationSchema = z.object({
  eventId: z.string().min(1).max(64),
  projectId: z.string().min(1).max(64),
  isDraft: z.boolean().optional(),
  feedback: z.string().max(10000).optional(),
  scores: z
    .array(
      z.object({
        criterionId: z.string().min(1).max(64),
        score: z.number().finite(),
      })
    )
    .max(100),
});
