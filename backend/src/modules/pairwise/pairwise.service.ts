import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';
import { rankByBradleyTerry } from './bradley-terry.js';

export class PairwiseService {
  async getRandomPair(eventId: string, judgeUserId: string) {
    const judge = await prisma.judge.findUnique({
      where: { eventId_userId: { eventId, userId: judgeUserId } },
    });
    if (!judge) throw new AppError('You are not a registered judge for this event.', 403, 'FORBIDDEN');

    // Filter out projects where judge is a team member (COI prevention)
    const judgeTeamMemberships = await prisma.teamMember.findMany({
      where: { userId: judgeUserId },
      select: { teamId: true },
    });
    const prohibitedTeamIds = new Set(judgeTeamMemberships.map((m) => m.teamId));

    const projects = await prisma.project.findMany({
      where: {
        eventId,
        status: { in: ['SUBMITTED', 'FINALIZED'] },
        ...(prohibitedTeamIds.size > 0 ? { teamId: { notIn: Array.from(prohibitedTeamIds) } } : {}),
      },
      select: {
        id: true,
        title: true,
        tagline: true,
        problemStatement: true,
        solutionDescription: true,
        technologies: true,
        demoUrl: true,
        repoUrl: true,
        track: true,
      },
    });

    if (projects.length < 2) {
      throw new AppError('At least 2 eligible projects are required for pairwise comparison.', 400, 'INSUFFICIENT_PROJECTS');
    }

    // Pick two distinct projects — O(1), no loop risk
    const idxA = Math.floor(Math.random() * projects.length);
    const idxB =
      (idxA + 1 + Math.floor(Math.random() * (projects.length - 1))) % projects.length;

    return {
      projectA: projects[idxA],
      projectB: projects[idxB],
    };
  }

  async recordComparison(
    eventId: string,
    judgeUserId: string,
    data: { projectAId: string; projectBId: string; winnerProjectId?: string | null; notes?: string }
  ) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    if (event.status === 'ARCHIVED') {
      throw new AppError('Event is archived. Pairwise comparisons cannot be recorded.', 400, 'EVENT_ARCHIVED');
    }

    const now = new Date();
    if (now < event.judgingStartDate) {
      throw new AppError('Judging period has not started yet for this event.', 400, 'JUDGING_NOT_STARTED');
    }
    if (now > event.judgingDeadline) {
      throw new AppError('Judging deadline has passed. Comparisons can no longer be recorded.', 400, 'DEADLINE_EXCEEDED');
    }

    const judge = await prisma.judge.findUnique({
      where: { eventId_userId: { eventId, userId: judgeUserId } },
    });
    if (!judge) throw new AppError('You are not a registered judge for this event.', 403, 'FORBIDDEN');

    // Verify projects exist, belong to this event, and are not in DRAFT status
    const [projectA, projectB] = await Promise.all([
      prisma.project.findUnique({ where: { id: data.projectAId } }),
      prisma.project.findUnique({ where: { id: data.projectBId } }),
    ]);

    if (!projectA || projectA.eventId !== eventId || !projectB || projectB.eventId !== eventId) {
      throw new AppError('One or both comparison projects were not found in this event.', 404, 'PROJECT_NOT_FOUND');
    }

    if (projectA.status === 'DRAFT' || projectB.status === 'DRAFT') {
      throw new AppError('Draft projects cannot be evaluated in pairwise comparisons.', 400, 'PROJECT_NOT_SUBMITTED');
    }

    // COI verification on comparison submission
    const authoredProject = await prisma.project.findFirst({
      where: {
        id: { in: [data.projectAId, data.projectBId] },
        team: { members: { some: { userId: judgeUserId } } },
      },
    });

    if (authoredProject) {
      throw new AppError('Conflict of Interest: You cannot judge your own project submission in pairwise ranking.', 403, 'SELF_COMPARISON_FORBIDDEN');
    }

    const comparison = await prisma.pairwiseComparison.create({
      data: {
        eventId,
        judgeId: judge.id,
        projectAId: data.projectAId,
        projectBId: data.projectBId,
        winnerProjectId: data.winnerProjectId || null,
        notes: data.notes || null,
      },
    });

    return comparison;
  }

  async computeBradleyTerryRankings(eventId: string) {
    const comparisons = await prisma.pairwiseComparison.findMany({
      where: { eventId },
    });

    if (comparisons.length === 0) {
      throw new AppError('No pairwise comparisons recorded yet for this event.', 400, 'NO_COMPARISONS');
    }

    const projects = await prisma.project.findMany({
      where: { eventId, status: { in: ['SUBMITTED', 'FINALIZED'] } },
      include: { team: true },
    });

    // Bradley-Terry MM fit + [50, 100] scaling (pure engine)
    const projectsById = new Map(projects.map((p) => [p.id, p]));
    const { converged, rankings } = rankByBradleyTerry(
      projects.map((p) => p.id),
      comparisons
    );

    return {
      totalComparisons: comparisons.length,
      converged,
      rankings: rankings.map((r) => {
        const project = projectsById.get(r.projectId)!;
        return {
          projectId: r.projectId,
          title: project.title,
          teamName: project.team.name,
          latentSkill: r.latentSkill,
          pairwiseScore: r.pairwiseScore,
          rank: r.rank,
        };
      }),
    };
  }
}

export const pairwiseService = new PairwiseService();
