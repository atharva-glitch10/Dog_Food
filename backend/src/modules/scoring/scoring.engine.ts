/**
 * Pure weighted-rubric scoring (no Prisma / I/O), used by ScoringService.
 */
import { AppError } from '../../utils/response.js';

export interface ScoringCriterion {
  id: string;
  title: string;
  weight: number;
  maxScore: number;
}

export interface ScoreInput {
  criterionId: string;
  score: number;
}

/**
 * Validate a judge's per-criterion scores against the rubric and return the
 * weighted total on a 0-100 scale:
 *   total = sum((score / maxScore) * weight * 100), rounded to 2 decimals, clamped to [0, 100].
 * Throws AppError DUPLICATE_CRITERION, MISSING_CRITERIA, INVALID_CRITERION,
 * INVALID_SCORE or SCORE_OUT_OF_BOUNDS (checked in that order).
 */
export function computeWeightedTotal(criteria: ScoringCriterion[], scores: ScoreInput[]): number {
  const criteriaMap = new Map(criteria.map((c) => [c.id, c]));

  // Reject duplicate criterion IDs in a single submission
  const submittedCriterionIds = scores.map((s) => s.criterionId);
  const uniqueIds = new Set(submittedCriterionIds);
  if (uniqueIds.size !== submittedCriterionIds.length) {
    throw new AppError(
      'Duplicate criterion IDs detected in submission. Each criterion must appear exactly once.',
      400,
      'DUPLICATE_CRITERION'
    );
  }

  // Require all rubric criteria to be present
  const missingCriteria = criteria.filter((c) => !uniqueIds.has(c.id)).map((c) => c.title);
  if (missingCriteria.length > 0) {
    throw new AppError(`Missing required criteria: ${missingCriteria.join(', ')}`, 400, 'MISSING_CRITERIA');
  }

  let weightedTotal = 0;
  for (const item of scores) {
    const criterion = criteriaMap.get(item.criterionId);
    if (!criterion) {
      throw new AppError(`Invalid criterion ID: ${item.criterionId}`, 400, 'INVALID_CRITERION');
    }

    if (typeof item.score !== 'number' || !isFinite(item.score)) {
      throw new AppError(`Score for criterion '${criterion.title}' must be a finite number.`, 400, 'INVALID_SCORE');
    }

    if (item.score < 0 || item.score > criterion.maxScore) {
      throw new AppError(
        `Score for '${criterion.title}' must be between 0 and ${criterion.maxScore}. Received: ${item.score}`,
        400,
        'SCORE_OUT_OF_BOUNDS'
      );
    }

    // Weighted contribution = (score / maxScore) * weight * 100
    weightedTotal += (item.score / criterion.maxScore) * criterion.weight * 100;
  }

  return Math.min(100, Math.max(0, parseFloat(weightedTotal.toFixed(2))));
}

export interface RubricCriterionInput {
  title: string;
  description: string;
  weight: number; // e.g. 0.3 for 30%, or 30 for 30%
  maxScore?: number;
  orderIndex?: number;
}

/**
 * Normalize rubric criteria before saving: weights given as percentages
 * (total > 1.5, e.g. 30/30/40) are converted to fractions (0.3/0.3/0.4),
 * maxScore defaults to 10 and orderIndex to the list position. Weights must
 * then sum to 1.0 (±0.01). Throws EMPTY_RUBRIC or INVALID_RUBRIC_WEIGHTS.
 */
export function normalizeRubricCriteria(criteria: RubricCriterionInput[]) {
  if (!criteria || criteria.length === 0) {
    throw new AppError('A rubric must contain at least one criterion.', 400, 'EMPTY_RUBRIC');
  }

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const isPercent = totalWeight > 1.5;
  const normalizedCriteria = criteria.map((c, index) => ({
    title: c.title,
    description: c.description,
    weight: isPercent ? c.weight / 100 : c.weight,
    maxScore: c.maxScore || 10,
    orderIndex: c.orderIndex !== undefined ? c.orderIndex : index,
  }));

  const sumNorm = normalizedCriteria.reduce((sum, c) => sum + c.weight, 0);
  if (Math.abs(sumNorm - 1.0) > 0.01) {
    throw new AppError('Criterion weights must sum to 100% (1.0).', 400, 'INVALID_RUBRIC_WEIGHTS');
  }

  return normalizedCriteria;
}
