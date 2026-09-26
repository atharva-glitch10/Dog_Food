import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';

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
    const judge = await prisma.judge.findUnique({
      where: { eventId_userId: { eventId, userId: judgeUserId } },
    });
    if (!judge) throw new AppError('You are not a registered judge for this event.', 403, 'FORBIDDEN');

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

    const projectIds = projects.map((p) => p.id);
    const n = projectIds.length;
    const idToIndex = new Map(projectIds.map((id, i) => [id, i]));

    // Comparison matrix N[i][j] and Win vector W[i]
    const W = new Array(n).fill(0.1); // Small Laplace prior smoothing
    const N = Array.from({ length: n }, () => new Array(n).fill(0));

    for (const comp of comparisons) {
      const i = idToIndex.get(comp.projectAId);
      const j = idToIndex.get(comp.projectBId);
      if (i === undefined || j === undefined) continue;

      N[i][j] += 1;
      N[j][i] += 1;

      if (comp.winnerProjectId === comp.projectAId) {
        W[i] += 1;
      } else if (comp.winnerProjectId === comp.projectBId) {
        W[j] += 1;
      } else {
        // Tie
        W[i] += 0.5;
        W[j] += 0.5;
      }
    }

    // MM (Minorization-Maximization) Algorithm for Bradley-Terry MLE
    let pi = new Array(n).fill(1.0);
    const maxIterations = 200;
    const tolerance = 1e-6;
    let converged = false;

    for (let iter = 0; iter < maxIterations; iter++) {
      const piNext = new Array(n).fill(0);

      for (let i = 0; i < n; i++) {
        let denominator = 0;
        for (let j = 0; j < n; j++) {
          if (i !== j && N[i][j] > 0) {
            denominator += N[i][j] / (pi[i] + pi[j]);
          }
        }
        piNext[i] = denominator > 0 ? W[i] / denominator : pi[i];
      }

      // Normalize pi so sum(pi) = n
      const sumPi = piNext.reduce((a, b) => a + b, 0);
      for (let i = 0; i < n; i++) {
        piNext[i] = (piNext[i] / sumPi) * n;
      }

      // Check convergence — track actual result
      let maxDiff = 0;
      for (let i = 0; i < n; i++) {
        maxDiff = Math.max(maxDiff, Math.abs(piNext[i] - pi[i]));
      }

      pi = piNext;
      if (maxDiff < tolerance) {
        converged = true;
        break;
      }
    }

    // Convert latent skill parameters to 0-100 scale
    const maxPi = Math.max(...pi);
    const minPi = Math.min(...pi);
    const range = maxPi - minPi || 1;

    const ranked = projects.map((p, idx) => {
      const skill = pi[idx];
      const normalizedScore = 50 + ((skill - minPi) / range) * 50;
      return {
        projectId: p.id,
        title: p.title,
        teamName: p.team.name,
        latentSkill: parseFloat(skill.toFixed(4)),
        pairwiseScore: parseFloat(normalizedScore.toFixed(2)),
      };
    });

    ranked.sort((a, b) => b.pairwiseScore - a.pairwiseScore);

    return {
      totalComparisons: comparisons.length,
      converged,  // Fixed: was always hardcoded `true`
      rankings: ranked.map((r, i) => ({ ...r, rank: i + 1 })),
    };
  }
}

export const pairwiseService = new PairwiseService();
