import { z } from 'zod';

export const RecordComparisonSchema = z.object({
  projectAId: z.string().min(1).max(64),
  projectBId: z.string().min(1).max(64),
  winnerProjectId: z.string().min(1).max(64).nullable().optional(),
  notes: z.string().max(5000).optional(),
});
