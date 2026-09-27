import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';
import { Role } from '@prisma/client';
import { invalidateUserCache } from '../../middleware/requireAuth.js';

export class JudgesService {
  async getJudgesByEvent(eventId: string) {
    return prisma.judge.findMany({
      where: { eventId },
      include: {
        user: {
          select: { id: true, name: true, email: true, bio: true, avatarUrl: true },
        },
        _count: {
          select: {
            assignments: true,
            evaluations: true,
          },
        },
      },
    });
  }

  async addJudgeToEvent(eventId: string, email: string, capacity: number = 10) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError(`No user found with email '${email}'. They must register first.`, 404, 'USER_NOT_FOUND');
    }

    // Upgrade role to JUDGE if currently PARTICIPANT
    if (user.role === Role.PARTICIPANT) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: Role.JUDGE },
      });
      invalidateUserCache(user.id);
    }

    const existingJudge = await prisma.judge.findUnique({
      where: {
        eventId_userId: { eventId, userId: user.id },
      },
    });

    if (existingJudge) {
      return prisma.judge.update({
        where: { id: existingJudge.id },
        data: { capacity, isActive: true },
        include: { user: true },
      });
    }

    return prisma.judge.create({
      data: {
        eventId,
        userId: user.id,
        capacity,
      },
      include: { user: true },
    });
  }

  async getMyAssignments(eventId: string, userId: string) {
    const judge = await prisma.judge.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    if (!judge) {
      throw new AppError('You are not registered as a judge for this event.', 403, 'NOT_A_JUDGE');
    }

    const assignments = await prisma.judgeAssignment.findMany({
      where: { judgeId: judge.id },
      include: {
        project: {
          include: {
            track: true,
            team: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { assignedAt: 'asc' },
    });

    // Also get judge's completed/draft evaluations
    const evaluations = await prisma.evaluation.findMany({
      where: { judgeId: judge.id },
      include: {
        scores: { include: { criterion: true } },
      },
    });

    const evalMap = new Map(evaluations.map((e) => [e.projectId, e]));

    return assignments.map((a) => ({
      assignmentId: a.id,
      isCompleted: a.isCompleted,
      assignedAt: a.assignedAt,
      project: a.project,
      evaluation: evalMap.get(a.projectId) || null,
    }));
  }
}

export const judgesService = new JudgesService();
