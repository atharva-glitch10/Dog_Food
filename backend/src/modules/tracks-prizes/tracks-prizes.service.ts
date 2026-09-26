import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';

export class TracksPrizesService {
  async getTracksByEvent(eventId: string) {
    return prisma.track.findMany({
      where: { eventId },
      include: {
        _count: { select: { projects: true } },
      },
    });
  }

  async createTrack(eventId: string, data: { name: string; description: string; colorHex?: string }) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    return prisma.track.create({
      data: {
        eventId,
        name: data.name,
        description: data.description,
        colorHex: data.colorHex || '#3b82f6',
      },
    });
  }

  async updateTrack(trackId: string, data: { name?: string; description?: string; colorHex?: string }) {
    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) throw new AppError('Track not found', 404, 'TRACK_NOT_FOUND');

    return prisma.track.update({
      where: { id: trackId },
      data,
    });
  }

  async deleteTrack(trackId: string) {
    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) throw new AppError('Track not found', 404, 'TRACK_NOT_FOUND');

    return prisma.track.delete({ where: { id: trackId } });
  }

  async getPrizesByEvent(eventId: string) {
    return prisma.prize.findMany({
      where: { eventId },
      include: { track: true },
      orderBy: { rank: 'asc' },
    });
  }

  async createPrize(eventId: string, data: { name: string; description: string; amount?: string; rank?: number; trackId?: string }) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    return prisma.prize.create({
      data: {
        eventId,
        name: data.name,
        description: data.description,
        amount: data.amount,
        rank: data.rank || 1,
        trackId: data.trackId || null,
      },
      include: { track: true },
    });
  }

  async updatePrize(prizeId: string, data: { name?: string; description?: string; amount?: string; rank?: number; trackId?: string | null }) {
    const prize = await prisma.prize.findUnique({ where: { id: prizeId } });
    if (!prize) throw new AppError('Prize not found', 404, 'PRIZE_NOT_FOUND');

    return prisma.prize.update({
      where: { id: prizeId },
      data,
      include: { track: true },
    });
  }

  async deletePrize(prizeId: string) {
    const prize = await prisma.prize.findUnique({ where: { id: prizeId } });
    if (!prize) throw new AppError('Prize not found', 404, 'PRIZE_NOT_FOUND');

    return prisma.prize.delete({ where: { id: prizeId } });
  }
}

export const tracksPrizesService = new TracksPrizesService();
