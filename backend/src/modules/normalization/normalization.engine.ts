/**
 * Pure normalization math (no Prisma / I/O). NormalizationService loads data,
 * calls computeNormalization() and persists the result; see the service for
 * the full theoretical rationale.
 */

export type NormalizationMethod = 'Z_SCORE_FALLBACK' | 'MIN_MAX';

/** Pseudo-observation weight k for the Bayesian shrinkage prior. */
export const SHRINKAGE_PSEUDO_OBSERVATIONS = 3;
/** Target distribution for z-score rescaling. */
export const TARGET_MEAN = 70;
export const TARGET_STD_DEV = 15;
/** Outlier clamp for z-scores, in standard deviations. */
export const Z_CLAMP = 3.0;

export interface GlobalStats {
  mean: number;
  min: number;
  max: number;
  variance: number;
  stdDev: number;
}

export interface JudgeDiagnostics {
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

export interface NormalizationEvaluationInput {
  id: string;
  judgeId: string;
  projectId: string;
  weightedTotal: number;
  scores: { criterionId: string; score: number }[];
}

export interface NormalizationProjectInfo {
  title: string;
  teamName: string;
  trackName: string | null;
  submittedAt: Date | null;
}

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

export interface RankableProject {
  normalizedScore: number;
  coreCriterionScore: number;
  scoreStdDev: number;
  submittedAt: Date | null;
}

const round2 = (n: number) => parseFloat(n.toFixed(2));

/** Population statistics over all finalized evaluation totals (sample variance; 100 when N = 1). */
export function computeGlobalStats(allScores: number[]): GlobalStats {
  const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const min = Math.min(...allScores);
  const max = Math.max(...allScores);
  const variance =
    allScores.length > 1
      ? allScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / (allScores.length - 1)
      : 100;
  const stdDev = Math.sqrt(variance) || 10;
  return { mean, min, max, variance, stdDev };
}

/**
 * Normalize one judge's scores.
 * - MIN_MAX: scale to [0, 100] by the judge's own range, or the global range if the judge's range is 0.
 * - Z_SCORE_FALLBACK: z-score with Bayesian shrinkage toward the global prior when N < 3, global
 *   std-dev fallback for zero variance, z clamped to [-3, 3], rescaled to mean 70 / sd 15, clamped to [0, 100].
 * Returned normalized values are rounded to 2 decimals, in input order.
 */
export function normalizeJudgeScores(
  scores: number[],
  global: GlobalStats,
  method: NormalizationMethod
): { normalized: number[]; diagnostics: JudgeDiagnostics } {
  const N = scores.length;
  const rawMean = scores.reduce((a, b) => a + b, 0) / N;
  const rawVariance = N > 1 ? scores.reduce((sum, s) => sum + Math.pow(s - rawMean, 2), 0) / (N - 1) : 0;
  const rawStdDev = Math.sqrt(rawVariance);
  const rawMin = Math.min(...scores);
  const rawMax = Math.max(...scores);

  let adjustedMean = rawMean;
  let adjustedStdDev = rawStdDev;
  const isZeroVariance = rawStdDev === 0;
  let isBayesianShrunk = false;
  let normalized: number[];

  if (method === 'MIN_MAX') {
    const judgeRange = rawMax - rawMin;
    const globalRange = global.max - global.min || 1;

    normalized = scores.map((score) => {
      let scaled: number;
      if (judgeRange > 0) {
        scaled = ((score - rawMin) / judgeRange) * 100;
      } else {
        // Judge gave all identical scores: scale relative to global hackathon bounds
        scaled = ((score - global.min) / globalRange) * 100;
      }
      return Math.max(0, Math.min(100, round2(scaled)));
    });
  } else {
    if (N < 3) {
      const k = SHRINKAGE_PSEUDO_OBSERVATIONS;
      adjustedMean = (N * rawMean + k * global.mean) / (N + k);
      const combinedVariance =
        (Math.max(0, N - 1) * rawVariance +
          k * global.variance +
          ((N * k) / (N + k)) * Math.pow(rawMean - global.mean, 2)) /
        (N + k - 1);
      adjustedStdDev = Math.sqrt(combinedVariance) || global.stdDev;
      isBayesianShrunk = true;
    } else if (isZeroVariance) {
      // Zero variance fallback: judge gave identical scores to all projects
      adjustedStdDev = global.stdDev;
    }

    normalized = scores.map((score) => zScoreToScale((score - adjustedMean) / (adjustedStdDev || 1)));
  }

  return {
    normalized,
    diagnostics: {
      sampleSize: N,
      rawMean: round2(rawMean),
      rawStdDev: round2(rawStdDev),
      rawMin: round2(rawMin),
      rawMax: round2(rawMax),
      adjustedMean: round2(adjustedMean),
      adjustedStdDev: round2(adjustedStdDev),
      isZeroVariance,
      isBayesianShrunk,
      normalizationMethod: method,
    },
  };
}

/** Clamp z to [-3, 3], rescale to mean 70 / sd 15, clamp to [0, 100], round to 2 decimals. */
export function zScoreToScale(z: number): number {
  const clamped = Math.max(-Z_CLAMP, Math.min(Z_CLAMP, z));
  const normalized = Math.max(0, Math.min(100, TARGET_MEAN + TARGET_STD_DEV * clamped));
  return round2(normalized);
}

/**
 * 4-tier deterministic tie-breaking comparator:
 * 1. highest normalized score, 2. highest core-criterion score,
 * 3. lowest dispersion (std-dev), 4. earliest submission.
 */
export function compareRankedProjects(a: RankableProject, b: RankableProject): number {
  if (Math.abs(b.normalizedScore - a.normalizedScore) > 0.001) {
    return b.normalizedScore - a.normalizedScore;
  }
  if (Math.abs(b.coreCriterionScore - a.coreCriterionScore) > 0.001) {
    return b.coreCriterionScore - a.coreCriterionScore;
  }
  if (Math.abs(a.scoreStdDev - b.scoreStdDev) > 0.001) {
    return a.scoreStdDev - b.scoreStdDev;
  }
  const timeA = a.submittedAt ? a.submittedAt.getTime() : Infinity;
  const timeB = b.submittedAt ? b.submittedAt.getTime() : Infinity;
  return timeA - timeB;
}

/** The criterion with the highest rubric weight (tie-break tier 2), or null without a rubric. */
export function pickCoreCriterion<T extends { weight: number }>(criteria: T[] | null | undefined): T | null {
  return criteria ? [...criteria].sort((a, b) => b.weight - a.weight)[0] ?? null : null;
}

/**
 * Full normalization pipeline over finalized evaluations. Pure: callers load
 * evaluations/project info and persist rawScore/normalizedScore/finalRank.
 */
export function computeNormalization(
  evaluations: NormalizationEvaluationInput[],
  projects: Map<string, NormalizationProjectInfo>,
  coreCriterionId: string | null,
  method: NormalizationMethod
) {
  const global = computeGlobalStats(evaluations.map((e) => e.weightedTotal));

  // Group evaluations by judge
  const judgeGroups = new Map<string, NormalizationEvaluationInput[]>();
  for (const evalRecord of evaluations) {
    const group = judgeGroups.get(evalRecord.judgeId) || [];
    group.push(evalRecord);
    judgeGroups.set(evalRecord.judgeId, group);
  }

  const normalizedEvaluationScores = new Map<string, number>(); // evalId -> normalizedScore
  const judgeStats = new Map<string, JudgeDiagnostics>();

  for (const [judgeId, evals] of judgeGroups.entries()) {
    const { normalized, diagnostics } = normalizeJudgeScores(
      evals.map((e) => e.weightedTotal),
      global,
      method
    );
    evals.forEach((e, i) => normalizedEvaluationScores.set(e.id, normalized[i]));
    judgeStats.set(judgeId, diagnostics);
  }

  // Aggregate normalized scores per project
  const projectGroups = new Map<string, NormalizationEvaluationInput[]>();
  for (const evalRecord of evaluations) {
    const group = projectGroups.get(evalRecord.projectId) || [];
    group.push(evalRecord);
    projectGroups.set(evalRecord.projectId, group);
  }

  const rankedProjects: (NormalizedProjectResult & RankableProject)[] = [];

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

    let coreCriterionScore = 0;
    if (coreCriterionId) {
      const coreScores = evals.flatMap((e) =>
        e.scores.filter((s) => s.criterionId === coreCriterionId).map((s) => s.score)
      );
      if (coreScores.length > 0) {
        coreCriterionScore = coreScores.reduce((a, b) => a + b, 0) / coreScores.length;
      }
    }

    const project = projects.get(projectId)!;

    rankedProjects.push({
      projectId,
      title: project.title,
      teamName: project.teamName,
      trackName: project.trackName,
      rawScore: round2(meanRaw),
      normalizedScore: round2(meanNorm),
      evaluationsCount: evals.length,
      finalRank: 1,
      scoreStdDev: round2(scoreStdDev),
      coreCriterionScore,
      submittedAt: project.submittedAt,
    });
  }

  rankedProjects.sort(compareRankedProjects);
  rankedProjects.forEach((p, idx) => {
    p.finalRank = idx + 1;
  });

  return {
    globalStats: {
      totalEvaluations: evaluations.length,
      globalMean: round2(global.mean),
      globalStdDev: round2(global.stdDev),
    },
    judgeDiagnostics: Array.from(judgeStats.entries()).map(([judgeId, stats]) => ({ judgeId, ...stats })),
    rankings: rankedProjects.map(({ coreCriterionScore, submittedAt, ...rest }) => rest),
  };
}
