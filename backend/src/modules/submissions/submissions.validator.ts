import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';

export const CreateProjectSchema = z.object({
  title: z.string().min(3, 'Project title must be at least 3 characters').max(255),
  tagline: z.string().max(255).optional(),
  problemStatement: z.string().min(10, 'Problem statement must be at least 10 characters'),
  solutionDescription: z.string().min(10, 'Solution description must be at least 10 characters'),
  trackId: z.string().uuid().optional(),
  technologies: z.array(z.string()).default([]),
  repoUrl: z.string().url('Invalid repository URL').optional().or(z.literal('')),
  demoUrl: z.string().url('Invalid demo URL').optional().or(z.literal('')),
  videoUrl: z.string().url('Invalid video URL').optional().or(z.literal('')),
  thumbnailUrl: z.string().optional().or(z.literal('')),
  customFields: z.record(z.any()).optional().default({}),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  status: z.nativeEnum(ProjectStatus).optional(),
});
