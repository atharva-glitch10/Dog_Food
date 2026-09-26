import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';

export interface NormalizedProjectResult {
  projectId: string;
  title: string;
  teamName: string;
  trackName: string | null;
  rawScore: number;
  normalizedScore: number;
  evaluationsCount: number;
  finalRank: number;
  scoreStdDev: number;
}

export class NormalizationService {
  async normalizeScores(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        rubric: { include: { criteria: true } },
      },
    });

    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    // 1. Fetch all finalized/submitted evaluations
    const evaluations = await prisma.evaluation.findMany({
      where: {
        eventId,
        isDraft: false,
      },
      include: {
        judge: { include: { user: true } },
        project: {
          include: {
            team: true,
            track: true,
          },
        },
        scores: { include: { criterion: true } },
      },
    });

    if (evaluations.length === 0) {
      throw new AppError('No completed evaluations to normalize.', 400, 'NO_EVALUATIONS');
    }

    // 2. Compute Global Statistics
    const allScores = evaluations.map((e) => e.weightedTotal);
    const globalMean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const globalVariance =
      allScores.length > 1
        ? allScores.reduce((sum, s) => sum + Math.pow(s - globalMean, 2), 0) / (allScores.length - 1)
        : 100;
    const globalStdDev = Math.sqrt(globalVariance) || 10;

    // 3. Group evaluations by Judge to compute per-judge parameters
    const judgeGroups = new Map<string, typeof evaluations>();
    for (const evalRecord of evaluations) {
      const group = judgeGroups.get(evalRecord.judgeId) || [];
      group.push(evalRecord);
      judgeGroups.set(evalRecord.judgeId, group);
    }

    const judgeStats = new Map<
      string,
      {
        sampleSize: number;
        rawMean: number;
        rawStdDev: number;
        adjustedMean: number;
        adjustedStdDev: number;
        isZeroVariance: boolean;
        isBayesianShrunk: boolean;
      }
    >();

    for (const [judgeId, evals] of judgeGroups.entries()) {
      const N = evals.length;
      const scores = evals.map((e) => e.weightedTotal);
      const rawMean = scores.reduce((a, b) => a + b, 0) / N;
      const rawVariance = N > 1 ? scores.reduce((sum, s) => sum + Math.pow(s - rawMean, 2), 0) / (N - 1) : 0;
      const rawStdDev = Math.sqrt(rawVariance);

      let adjustedMean = rawMean;
      let adjustedStdDev = rawStdDev;
      let isZeroVariance = rawStdDev === 0;
      let isBayesianShrunk = false;

      // Robust Fallback 1: Bayesian Shrinkage for small sample size (N < 3)
      if (N < 3) {
        const k = 3; // Pseudo-observation weight
        adjustedMean = (N * rawMean + k * globalMean) / (N + k);
        const combinedVariance =
          ((Math.max(0, N - 1) * rawVariance) + k * globalVariance + ((N * k) / (N + k)) * Math.pow(rawMean - globalMean, 2)) /
          (N + k - 1);
        adjustedStdDev = Math.sqrt(combinedVariance) || globalStdDev;
        isBayesianShrunk = true;
      } else if (isZeroVariance) {
        // Robust Fallback 2: Zero variance (judge gave all identical scores)
        adjustedStdDev = globalStdDev;
      }

      judgeStats.set(judgeId, {
        sampleSize: N,
        rawMean: parseFloat(rawMean.toFixed(2)),
        rawStdDev: parseFloat(rawStdDev.toFixed(2)),
        adjustedMean: parseFloat(adjustedMean.toFixed(2)),
        adjustedStdDev: parseFloat(adjustedStdDev.toFixed(2)),
        isZeroVariance,
        isBayesianShrunk,
      });
    }

    // 4. Calculate Normalized Score for each Evaluation
    // S_norm = clamp(70 + 15 * clamp(z, -3.0, 3.0), 0, 100)
    const normalizedEvaluationScores = new Map<string, number>(); // evalId -> normalizedScore
    for (const evalRecord of evaluations) {
      const stats = judgeStats.get(evalRecord.judgeId)!;
      let z = (evalRecord.weightedTotal - stats.adjustedMean) / (stats.adjustedStdDev || 1);
      z = Math.max(-3.0, Math.min(3.0, z)); // Outlier clamp

      const normalized = Math.max(0, Math.min(100, 70 + 15 * z));
      normalizedEvaluationScores.set(evalRecord.id, parseFloat(normalized.toFixed(2)));
    }

    // 5. Aggregate Normalized Scores per Project
    const projectGroups = new Map<string, typeof evaluations>();
    for (const evalRecord of evaluations) {
      const group = projectGroups.get(evalRecord.projectId) || [];
      group.push(evalRecord);
      projectGroups.set(evalRecord.projectId, group);
    }

    // Highest weighted criterion for tie breaking
    const highestWeightedCriterion = event.rubric?.criteria
      ? [...event.rubric.criteria].sort((a, b) => b.weight - a.weight)[0]
      : null;

    const rankedProjects: (NormalizedProjectResult & {
      coreCriterionScore: number;
      submittedAt: Date | null;
    })[] = [];

    for (const [projectId, evals] of projectGroups.entries()) {
      const normScores = evals.map((e) => normalizedEvaluationScores.get(e.id)!);
      const rawScores = evals.map((e) => e.weightedTotal);

      const meanNorm = normScores.reduce((a, b) => a + b, 0) / normScores.length;
      const meanRaw = rawScores.reduce((a, b) => a + b, 0) / rawScores.length;

      const normVariance =
        normScores.length > 1
          ? normScores.reduce((sum, s) => sum + Math.pow(s - meanNorm, 2), 0) / (normScores.length - 1)
          : 0;
      const scoreStdDev = Math.sqrt(normVariance);

      // Extract core criterion raw score for tie-breaker
      let coreCriterionScore = 0;
      if (highestWeightedCriterion) {
        const coreScores = evals.flatMap((e) =>
          e.scores.filter((s) => s.criterionId === highestWeightedCriterion.id).map((s) => s.score)
        );
        if (coreScores.length > 0) {
          coreCriterionScore = coreScores.reduce((a, b) => a + b, 0) / coreScores.length;
        }
      }

      const project = evals[0].project;

      rankedProjects.push({
        projectId,
        title: project.title,
        teamName: project.team.name,
        trackName: project.track?.name || null,
        rawScore: parseFloat(meanRaw.toFixed(2)),
        normalizedScore: parseFloat(meanNorm.toFixed(2)),
        evaluationsCount: evals.length,
        finalRank: 1,
        scoreStdDev: parseFloat(scoreStdDev.toFixed(2)),
        coreCriterionScore,
        submittedAt: project.submittedAt,
      });
    }

    // 6. Sort using 4-Tier Tie-Breaking Hierarchy
    rankedProjects.sort((a, b) => {
      // Tier 1: Highest Normalized Score
      if (Math.abs(b.normalizedScore - a.normalizedScore) > 0.001) {
        return b.normalizedScore - a.normalizedScore;
      }
      // Tier 2: Highest Core Criterion Score
      if (Math.abs(b.coreCriterionScore - a.coreCriterionScore) > 0.001) {
        return b.coreCriterionScore - a.coreCriterionScore;
      }
      // Tier 3: Lowest Judge Score Dispersion (Higher consensus)
      if (Math.abs(a.scoreStdDev - b.scoreStdDev) > 0.001) {
        return a.scoreStdDev - b.scoreStdDev;
      }
      // Tier 4: Earliest Submission Timestamp
      const timeA = a.submittedAt ? a.submittedAt.getTime() : Infinity;
      const timeB = b.submittedAt ? b.submittedAt.getTime() : Infinity;
      return timeA - timeB;
    });

    // Assign final ranks
    rankedProjects.forEach((p, idx) => {
      p.finalRank = idx + 1;
    });

    // 7. Atomic DB Transaction: Commit scores and ranks to projects table
    await prisma.$transaction(async (tx) => {
      for (const p of rankedProjects) {
        await tx.project.update({
          where: { id: p.projectId },
          data: {
            rawScore: p.rawScore,
            normalizedScore: p.normalizedScore,
            finalRank: p.finalRank,
          },
        });
      }
    });

    return {
      globalStats: {
        totalEvaluations: evaluations.length,
        globalMean: parseFloat(globalMean.toFixed(2)),
        globalStdDev: parseFloat(globalStdDev.toFixed(2)),
      },
      judgeDiagnostics: Array.from(judgeStats.entries()).map(([judgeId, stats]) => ({
        judgeId,
        ...stats,
      })),
      rankings: rankedProjects.map(({ coreCriterionScore, submittedAt, ...rest }) => rest),
    };
  }
}

export const normalizationService = new NormalizationService();
