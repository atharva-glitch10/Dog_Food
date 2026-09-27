import { z } from 'zod';

const colorHex = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'colorHex must be a hex color like #3b82f6');

// Explicit field allowlists: update payloads are passed to Prisma, so unknown
// keys (eventId, nested relation writes, ...) must never get through.
export const CreateTrackSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000).default(''),
  colorHex: colorHex.optional(),
});

export const UpdateTrackSchema = CreateTrackSchema.partial().strict();

export const CreatePrizeSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().max(2000).default(''),
  amount: z.string().max(100).optional(),
  rank: z.number().int().min(1).max(1000).optional(),
  trackId: z.string().min(1).max(64).optional(),
});

export const UpdatePrizeSchema = CreatePrizeSchema.extend({
  trackId: z.string().min(1).max(64).nullable().optional(),
})
  .partial()
  .strict();
