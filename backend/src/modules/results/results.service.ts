import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';
import { EventStatus, Role } from '@prisma/client';

export class ResultsService {
  async getResults(eventIdOrSlug: string, user?: { id: string; role: Role }) {
    // Resolve by UUID first, then by slug — allows both to work
    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id: eventIdOrSlug }, { slug: eventIdOrSlug }],
      },
      include: { settings: true },
    });

    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    const isPrivileged = user && (user.role === Role.ORGANIZER || user.role === Role.ADMIN);
    const isPublished = event.status === EventStatus.RESULTS_PUBLISHED || event.resultsPublishedAt !== null;

    if (!isPublished && !isPrivileged) {
      throw new AppError('Official results for this event have not yet been published.', 403, 'RESULTS_NOT_PUBLISHED');
    }

    const projects = await prisma.project.findMany({
      where: {
        eventId: event.id,
        status: { in: ['SUBMITTED', 'FINALIZED'] },
      },
      include: {
        track: true,
        team: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
        _count: {
          select: { votes: true, evaluations: true },
        },
      },
      orderBy: [
        { finalRank: 'asc' },
        { normalizedScore: 'desc' },
        { rawScore: 'desc' },
      ],
    });

    return {
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        status: event.status,
        resultsPublishedAt: event.resultsPublishedAt,
      },
      rankings: projects.map((p) => ({
        id: p.id,
        title: p.title,
        tagline: p.tagline,
        team: { id: p.team.id, name: p.team.name, members: p.team.members },
        track: p.track ? { id: p.track.id, name: p.track.name, colorHex: p.track.colorHex } : null,
        rawScore: isPrivileged || isPublished ? p.rawScore : null,
        normalizedScore: isPrivileged || isPublished ? p.normalizedScore : null,
        finalRank: isPrivileged || isPublished ? p.finalRank : null,
        voteCount: !event.settings?.hideResultsUntilPublished || isPublished || isPrivileged ? p._count.votes : null,
        evaluationsCount: p._count.evaluations,
        repoUrl: p.repoUrl,
        demoUrl: p.demoUrl,
      })),
    };
  }

  async publishResults(eventId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.RESULTS_PUBLISHED,
        resultsPublishedAt: new Date(),
      },
    });

    return updated;
  }
}

export const resultsService = new ResultsService();
