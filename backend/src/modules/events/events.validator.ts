import { z } from 'zod';
import { EventStatus, VotingEligibility } from '@prisma/client';

export const EventBaseSchema = z.object({
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric with hyphens'),
  name: z.string().min(3).max(255),
  tagline: z.string().max(255).optional(),
  description: z.string().min(10),
  registrationStartDate: z.string().datetime().or(z.date()),
  registrationEndDate: z.string().datetime().or(z.date()),
  submissionStartDate: z.string().datetime().or(z.date()),
  submissionDeadline: z.string().datetime().or(z.date()),
  judgingStartDate: z.string().datetime().or(z.date()),
  judgingDeadline: z.string().datetime().or(z.date()),
  settings: z.object({
    minTeamSize: z.number().int().min(1).default(1),
    maxTeamSize: z.number().int().min(1).max(20).default(4),
    allowCommunityVoting: z.boolean().default(true),
    votingEligibility: z.nativeEnum(VotingEligibility).default(VotingEligibility.VERIFIED_USERS),
    votesPerUser: z.number().int().min(1).default(3),
    hideResultsUntilPublished: z.boolean().default(true),
    randomizeGallery: z.boolean().default(true),
    assignmentsPerProject: z.number().int().min(1).default(3),
  }).optional(),
});

export const CreateEventSchema = EventBaseSchema.refine((data) => new Date(data.registrationStartDate) < new Date(data.registrationEndDate), {
  message: 'Registration start date must be before registration end date',
  path: ['registrationEndDate'],
}).refine((data) => new Date(data.submissionStartDate) < new Date(data.submissionDeadline), {
  message: 'Submission start date must be before submission deadline',
  path: ['submissionDeadline'],
}).refine((data) => new Date(data.judgingStartDate) < new Date(data.judgingDeadline), {
  message: 'Judging start date must be before judging deadline',
  path: ['judgingDeadline'],
});

export const UpdateEventSchema = EventBaseSchema.partial().extend({
  status: z.nativeEnum(EventStatus).optional(),
});

export const UpdateEventStatusSchema = z.object({
  status: z.nativeEnum(EventStatus),
});
