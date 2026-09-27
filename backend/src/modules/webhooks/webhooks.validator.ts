import { z } from 'zod';
import { WEBHOOK_EVENT_TYPES } from './webhook.service.js';

export const CreateWebhookSchema = z.object({
  targetUrl: z.string().trim().url('targetUrl must be a valid URL').max(2048),
  events: z
    .array(z.enum(WEBHOOK_EVENT_TYPES))
    .min(1, 'Subscribe to at least one event type')
    .max(WEBHOOK_EVENT_TYPES.length)
    .transform((events) => Array.from(new Set(events))),
});
