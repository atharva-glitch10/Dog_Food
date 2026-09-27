import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';
import { httpUrl, httpUrlOrUploadPath } from '../../utils/query.js';

export const CreateProjectSchema = z.object({
  title: z.string().min(3, 'Project title must be at least 3 characters').max(255),
  tagline: z.string().max(255).optional(),
  problemStatement: z.string().min(10, 'Problem statement must be at least 10 characters'),
  solutionDescription: z.string().min(10, 'Solution description must be at least 10 characters'),
  trackId: z.string().uuid().optional(),
  technologies: z.array(z.string()).default([]),
  repoUrl: httpUrl('Invalid repository URL').optional().or(z.literal('')),
  demoUrl: httpUrl('Invalid demo URL').optional().or(z.literal('')),
  videoUrl: httpUrl('Invalid video URL').optional().or(z.literal('')),
  thumbnailUrl: httpUrlOrUploadPath().optional().or(z.literal('')),
  customFields: z.record(z.any()).optional().default({}),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  status: z.nativeEnum(ProjectStatus).optional(),
});
