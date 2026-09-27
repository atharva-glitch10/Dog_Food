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

export type NormalizationMethod = 'Z_SCORE_FALLBACK' | 'MIN_MAX';

/**
 * NormalizationService
 *
 * THEORETICAL FOUNDATION & MATHEMATICAL RATIONALE:
 *
 * 1. THE PROBLEM WITH RAW JUDGE AVERAGES:
 *    In hackathons, projects are evaluated by different sub-panels of judges.
 *    Two major cognitive biases undermine raw scores:
 *    - Leniency/Harshness Bias (Location Shift): Judge A averages 88/100, while Judge B averages 62/100.
 *      A team evaluated by Judge A receives an artificial unearned advantage.
 *    - Scale Compression/Dispersion Bias (Scale Shift): Judge C uses only [75, 85] (variance = 8),
 *      while Judge D uses [20, 100] (variance = 400). Judge D's scores disproportionately dominate
 *      the raw arithmetic average.
 *
 * 2. Z-SCORE NORMALIZATION (Standardized Normal Rescaling):
 *    Standardizes each judge's evaluations into standard deviation units:
 *      z = (x - mu_judge) / sigma_judge
 *    Then linearly maps onto a standardized hackathon benchmark distribution (mean = 70, std = 15):
 *      S_norm = clamp(70 + 15 * clamp(z, -3.0, 3.0), 0, 100)
 *
 * 3. BAYESIAN SHRINKAGE PRIOR (for small sample sizes N < 3):
 *    Standard sample variance s^2 = sum(x - x_bar)^2 / (N - 1) is unstable or undefined when N < 3.
 *    If a judge evaluates only 1 project, s is 0, causing division-by-zero.
 *    If N = 2, variance estimation has massive error.
 *    Solution: Empirical Bayes Shrinkage using pseudo-observations (k = 3):
 *      mu_adj = (N * mu_raw + k * mu_global) / (N + k)
 *      s^2_adj = ((N - 1)*s^2_raw + k*s^2_global + (N*k/(N+k))*(mu_raw - mu_global)^2) / (N + k - 1)
 *    This smoothly shrinks small-sample judges toward the global hackathon population prior.
 *
 * 4. MIN-MAX FEATURE SCALING ALTERNATIVE:
 *    Maps each judge's evaluations to [0, 100] based on their individual range:
 *      S_norm = ((x - min_judge) / (max_judge - min_judge)) * 100
 *    If a judge gives identical scores (min === max), falls back to global population range.
 *
 * 5. 4-TIER DETERMINISTIC TIE-BREAKING HIERARCHY:
 *    - Tier 1: Highest Normalized Score.
 *    - Tier 2: Highest Core Criterion Score (criterion with highest rubric weight).
 *    - Tier 3: Lowest Judge Score Dispersion (higher consensus / lower standard deviation).
 *    - Tier 4: Earliest Submission Timestamp.
 */
export class NormalizationService {
  async normalizeScores(eventId: string, options?: { method?: NormalizationMethod }) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        settings: true,
        rubric: { include: { criteria: true } },
      },
    });

    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    const method: NormalizationMethod =
      options?.method ||
      (event.settings?.defaultNormalization as NormalizationMethod) ||
      'Z_SCORE_FALLBACK';

    // 1. Fetch all finalized evaluations (drafts are excluded from normalization)
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

    // 2. Compute Global Population Statistics
    const allScores = evaluations.map((e) => e.weightedTotal);
    const globalMean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const globalMin = Math.min(...allScores);
    const globalMax = Math.max(...allScores);
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

    const normalizedEvaluationScores = new Map<string, number>(); // evalId -> normalizedScore

    const judgeStats = new Map<
      string,
      {
        sampleSize: number;
        rawMean: number;
        rawStdDev: number;
        rawMin: number;
        rawMax: number;
        adjustedMean: number;
        adjustedStdDev: number;
        isZeroVariance: boolean;
        isBayesianShrunk: boolean;
        normalizationMethod: NormalizationMethod;
      }
    >();

    for (const [judgeId, evals] of judgeGroups.entries()) {
      const N = evals.length;
      const scores = evals.map((e) => e.weightedTotal);
      const rawMean = scores.reduce((a, b) => a + b, 0) / N;
      const rawVariance = N > 1 ? scores.reduce((sum, s) => sum + Math.pow(s - rawMean, 2), 0) / (N - 1) : 0;
      const rawStdDev = Math.sqrt(rawVariance);
      const rawMin = Math.min(...scores);
      const rawMax = Math.max(...scores);

      let adjustedMean = rawMean;
      let adjustedStdDev = rawStdDev;
      let isZeroVariance = rawStdDev === 0;
      let isBayesianShrunk = false;

      if (method === 'MIN_MAX') {
        // Min-Max Scaling per judge
        const judgeRange = rawMax - rawMin;
        const globalRange = globalMax - globalMin || 1;

        for (const e of evals) {
          let scaled: number;
          if (judgeRange > 0) {
            scaled = ((e.weightedTotal - rawMin) / judgeRange) * 100;
          } else {
            // Judge gave all identical scores: scale relative to global hackathon bounds
            scaled = ((e.weightedTotal - globalMin) / globalRange) * 100;
          }
          const clamped = Math.max(0, Math.min(100, parseFloat(scaled.toFixed(2))));
          normalizedEvaluationScores.set(e.id, clamped);
        }
      } else {
        // Z_SCORE_FALLBACK: Bayesian Shrinkage for small sample size (N < 3)
        if (N < 3) {
          const k = 3; // Pseudo-observation weight for prior
          adjustedMean = (N * rawMean + k * globalMean) / (N + k);
          const combinedVariance =
            ((Math.max(0, N - 1) * rawVariance) + k * globalVariance + ((N * k) / (N + k)) * Math.pow(rawMean - globalMean, 2)) /
            (N + k - 1);
          adjustedStdDev = Math.sqrt(combinedVariance) || globalStdDev;
          isBayesianShrunk = true;
        } else if (isZeroVariance) {
          // Zero variance fallback: judge gave identical scores to all projects
          adjustedStdDev = globalStdDev;
        }

        for (const e of evals) {
          let z = (e.weightedTotal - adjustedMean) / (adjustedStdDev || 1);
          z = Math.max(-3.0, Math.min(3.0, z)); // Outlier clamp [-3sigma, +3sigma]
          // Rescale: target mean 70, target std dev 15
          const normalized = Math.max(0, Math.min(100, 70 + 15 * z));
          normalizedEvaluationScores.set(e.id, parseFloat(normalized.toFixed(2)));
        }
      }

      judgeStats.set(judgeId, {
        sampleSize: N,
        rawMean: parseFloat(rawMean.toFixed(2)),
        rawStdDev: parseFloat(rawStdDev.toFixed(2)),
        rawMin: parseFloat(rawMin.toFixed(2)),
        rawMax: parseFloat(rawMax.toFixed(2)),
        adjustedMean: parseFloat(adjustedMean.toFixed(2)),
        adjustedStdDev: parseFloat(adjustedStdDev.toFixed(2)),
        isZeroVariance,
        isBayesianShrunk,
        normalizationMethod: method,
      });
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
