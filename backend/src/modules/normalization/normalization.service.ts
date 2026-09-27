import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';
import {
  computeNormalization,
  pickCoreCriterion,
  NormalizationMethod,
  NormalizationProjectInfo,
  NormalizedProjectResult,
} from './normalization.engine.js';

export type { NormalizedProjectResult, NormalizationMethod };

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

    // 2-6. Pure math: per-judge normalization, per-project aggregation, 4-tier ranking
    const coreCriterion = pickCoreCriterion(event.rubric?.criteria);
    const projectInfo = new Map<string, NormalizationProjectInfo>();
    for (const e of evaluations) {
      projectInfo.set(e.projectId, {
        title: e.project.title,
        teamName: e.project.team.name,
        trackName: e.project.track?.name || null,
        submittedAt: e.project.submittedAt,
      });
    }
    const result = computeNormalization(
      evaluations.map((e) => ({
        id: e.id,
        judgeId: e.judgeId,
        projectId: e.projectId,
        weightedTotal: e.weightedTotal,
        scores: e.scores.map((sc) => ({ criterionId: sc.criterionId, score: sc.score })),
      })),
      projectInfo,
      coreCriterion?.id ?? null,
      method
    );

    // 7. Atomic DB Transaction: Commit scores and ranks to projects table
    await prisma.$transaction(async (tx) => {
      for (const p of result.rankings) {
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

    return result;
  }
}

export const normalizationService = new NormalizationService();
