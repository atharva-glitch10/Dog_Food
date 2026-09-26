import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';
import { EventStatus, Prisma } from '@prisma/client';

export class EventsService {
  async getAllEvents(includeAllStatus: boolean = false) {
    const where: Prisma.EventWhereInput = includeAllStatus
      ? {}
      : { status: { not: EventStatus.DRAFT } };

    return prisma.event.findMany({
      where,
      include: {
        tracks: true,
        prizes: true,
        settings: true,
        _count: {
          select: {
            teams: true,
            projects: true,
            judges: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEventByIdOrSlug(idOrSlug: string) {
    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        settings: true,
        tracks: {
          include: {
            _count: { select: { projects: true } },
          },
        },
        prizes: {
          include: { track: true },
          orderBy: { rank: 'asc' },
        },
        rubric: {
          include: {
            criteria: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        _count: {
          select: {
            teams: true,
            projects: true,
            judges: true,
            votes: true,
          },
        },
      },
    });

    if (!event) {
      throw new AppError(`Event not found for identifier '${idOrSlug}'.`, 404, 'EVENT_NOT_FOUND');
    }

    return event;
  }

  async createEvent(data: any) {
    const existing = await prisma.event.findUnique({
      where: { slug: data.slug.toLowerCase() },
    });

    if (existing) {
      throw new AppError(`An event with slug '${data.slug}' already exists.`, 409, 'EVENT_SLUG_EXISTS');
    }

    const { settings, ...eventData } = data;

    const event = await prisma.event.create({
      data: {
        ...eventData,
        slug: data.slug.toLowerCase(),
        registrationStartDate: new Date(data.registrationStartDate),
        registrationEndDate: new Date(data.registrationEndDate),
        submissionStartDate: new Date(data.submissionStartDate),
        submissionDeadline: new Date(data.submissionDeadline),
        judgingStartDate: new Date(data.judgingStartDate),
        judgingDeadline: new Date(data.judgingDeadline),
        status: EventStatus.REGISTRATION_OPEN,
        settings: {
          create: settings || {},
        },
      },
      include: {
        settings: true,
        tracks: true,
        prizes: true,
      },
    });

    return event;
  }

  async updateEvent(id: string, data: any) {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Event not found.', 404, 'EVENT_NOT_FOUND');
    }

    const { settings, ...eventData } = data;

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...eventData,
        ...(eventData.slug && { slug: eventData.slug.toLowerCase() }),
        ...(eventData.registrationStartDate && { registrationStartDate: new Date(eventData.registrationStartDate) }),
        ...(eventData.registrationEndDate && { registrationEndDate: new Date(eventData.registrationEndDate) }),
        ...(eventData.submissionStartDate && { submissionStartDate: new Date(eventData.submissionStartDate) }),
        ...(eventData.submissionDeadline && { submissionDeadline: new Date(eventData.submissionDeadline) }),
        ...(eventData.judgingStartDate && { judgingStartDate: new Date(eventData.judgingStartDate) }),
        ...(eventData.judgingDeadline && { judgingDeadline: new Date(eventData.judgingDeadline) }),
        ...(settings && {
          settings: {
            upsert: {
              create: settings,
              update: settings,
            },
          },
        }),
      },
      include: {
        settings: true,
        tracks: true,
        prizes: true,
      },
    });

    return updated;
  }

  async updateStatus(id: string, status: EventStatus) {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Event not found.', 404, 'EVENT_NOT_FOUND');
    }

    return prisma.event.update({
      where: { id },
      data: { status },
      include: { settings: true },
    });
  }
}

export const eventsService = new EventsService();
