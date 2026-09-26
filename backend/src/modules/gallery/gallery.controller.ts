import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { ProjectStatus, Prisma } from '@prisma/client';

export class GalleryController {
  async getGallery(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;
      const { search, trackId, sort, page = '1', limit = '12' } = req.query as {
        search?: string;
        trackId?: string;
        sort?: 'title' | 'date' | 'randomized';
        page?: string;
        limit?: string;
      };

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
      let resolvedEventId = eventId;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
      if (!isUuid) {
        const found = await prisma.event.findUnique({ where: { slug: eventId }, select: { id: true } });
        if (found) resolvedEventId = found.id;
      }

      const where: Prisma.ProjectWhereInput = {
        eventId: resolvedEventId,
        status: { in: [ProjectStatus.SUBMITTED, ProjectStatus.FINALIZED] },
        ...(trackId && { trackId }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { tagline: { contains: search, mode: 'insensitive' } },
            { problemStatement: { contains: search, mode: 'insensitive' } },
            { solutionDescription: { contains: search, mode: 'insensitive' } },
            { technologies: { hasSome: [search] } },
          ],
        }),
      };

      let orderBy: Prisma.ProjectOrderByWithRelationInput = { submittedAt: 'desc' };
      if (sort === 'title') {
        orderBy = { title: 'asc' };
      }

      const [total, projects] = await Promise.all([
        prisma.project.count({ where }),
        prisma.project.findMany({
          where,
          include: {
            track: true,
            team: {
              include: {
                members: {
                  include: {
                    user: {
                      select: { id: true, name: true, avatarUrl: true },
                    },
                  },
                },
              },
            },
            _count: {
              select: { votes: true },
            },
          },
          orderBy,
          skip: sort === 'randomized' ? 0 : (pageNum - 1) * limitNum,
          take: sort === 'randomized' ? 50 : limitNum,
        }),
      ]);

      let resultProjects = projects;
      if (sort === 'randomized') {
        // Seeded or session-consistent shuffle
        resultProjects = [...projects].sort(() => Math.random() - 0.5).slice(0, limitNum);
      }

      return sendSuccess(res, {
        projects: resultProjects,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      }, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const galleryController = new GalleryController();
