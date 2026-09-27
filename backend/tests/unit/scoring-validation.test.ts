/**
 * Phase 10 Regression Tests — Scoring Validation
 * Tests duplicate criteria, missing criteria, out-of-range scores, and invalid values.
 */
import { describe, it, expect } from 'vitest';
import { computeWeightedTotal, ScoringCriterion as Criterion, ScoreInput } from '../../src/modules/scoring/scoring.engine.js';
import { AppError } from '../../src/utils/response.js';

const validateAndComputeScore = computeWeightedTotal;

/** Run fn and return the AppError code it throws (the engine's machine-readable error). */
function thrownCode(fn: () => unknown): string {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    return (err as AppError).code;
  }
  throw new Error('expected function to throw');
}

// ─── Test criteria fixture ────────────────────────────────────────────────────

const CRITERIA: Criterion[] = [
  { id: 'c1', title: 'Technical', weight: 0.30, maxScore: 10 },
  { id: 'c2', title: 'Innovation', weight: 0.30, maxScore: 10 },
  { id: 'c3', title: 'Impact', weight: 0.20, maxScore: 10 },
  { id: 'c4', title: 'Design', weight: 0.20, maxScore: 10 },
];

describe('Scoring Validation', () => {
  it('computes correct weighted total for perfect scores', () => {
    const scores: ScoreInput[] = CRITERIA.map((c) => ({ criterionId: c.id, score: c.maxScore }));
    expect(validateAndComputeScore(CRITERIA, scores)).toBe(100);
  });

  it('computes correct weighted total for zero scores', () => {
    const scores: ScoreInput[] = CRITERIA.map((c) => ({ criterionId: c.id, score: 0 }));
    expect(validateAndComputeScore(CRITERIA, scores)).toBe(0);
  });

  it('computes correct partial weighted total', () => {
    const scores: ScoreInput[] = [
      { criterionId: 'c1', score: 10 }, // 30% of 100 = 30
      { criterionId: 'c2', score: 0 },  // 0
      { criterionId: 'c3', score: 10 }, // 20
      { criterionId: 'c4', score: 0 },  // 0
    ];
    expect(validateAndComputeScore(CRITERIA, scores)).toBe(50);
  });

  it('rejects duplicate criterion IDs', () => {
    const scores: ScoreInput[] = [
      { criterionId: 'c1', score: 8 },
      { criterionId: 'c1', score: 9 }, // duplicate!
      { criterionId: 'c3', score: 7 },
      { criterionId: 'c4', score: 7 },
    ];
    expect(thrownCode(() => validateAndComputeScore(CRITERIA, scores))).toBe('DUPLICATE_CRITERION');
  });

  it('rejects submission missing a required criterion', () => {
    const scores: ScoreInput[] = [
      { criterionId: 'c1', score: 8 },
      { criterionId: 'c2', score: 8 },
      // c3 missing
      { criterionId: 'c4', score: 8 },
    ];
    expect(thrownCode(() => validateAndComputeScore(CRITERIA, scores))).toBe('MISSING_CRITERIA');
  });

  it('rejects score above maxScore', () => {
    const scores: ScoreInput[] = CRITERIA.map((c, i) => ({
      criterionId: c.id,
      score: i === 0 ? 11 : 8, // 11 > 10
    }));
    expect(thrownCode(() => validateAndComputeScore(CRITERIA, scores))).toBe('SCORE_OUT_OF_BOUNDS');
  });

  it('rejects negative score', () => {
    const scores: ScoreInput[] = CRITERIA.map((c, i) => ({
      criterionId: c.id,
      score: i === 0 ? -1 : 8,
    }));
    expect(thrownCode(() => validateAndComputeScore(CRITERIA, scores))).toBe('SCORE_OUT_OF_BOUNDS');
  });

  it('rejects NaN score', () => {
    const scores: ScoreInput[] = CRITERIA.map((c, i) => ({
      criterionId: c.id,
      score: i === 0 ? NaN : 8,
    }));
    expect(thrownCode(() => validateAndComputeScore(CRITERIA, scores))).toBe('INVALID_SCORE');
  });

  it('rejects Infinity score', () => {
    const scores: ScoreInput[] = CRITERIA.map((c, i) => ({
      criterionId: c.id,
      score: i === 0 ? Infinity : 8,
    }));
    expect(thrownCode(() => validateAndComputeScore(CRITERIA, scores))).toBe('INVALID_SCORE');
  });

  it('rejects invalid criterion ID', () => {
    const scores: ScoreInput[] = [
      { criterionId: 'c1', score: 8 },
      { criterionId: 'c2', score: 8 },
      { criterionId: 'c3', score: 8 },
      { criterionId: 'UNKNOWN', score: 8 }, // not in rubric
    ];
    // Will fail MISSING_CRITERIA for c4 first, but the point is it doesn't pass
    expect(() => validateAndComputeScore(CRITERIA, scores)).toThrow();
  });

  it('rejects an unknown criterion ID even when every rubric criterion is present', () => {
    const scores: ScoreInput[] = [
      ...CRITERIA.map((c) => ({ criterionId: c.id, score: 8 })),
      { criterionId: 'UNKNOWN', score: 8 },
    ];
    expect(thrownCode(() => validateAndComputeScore(CRITERIA, scores))).toBe('INVALID_CRITERION');
  });

  it('allows boundary score of exactly maxScore', () => {
    const scores: ScoreInput[] = CRITERIA.map((c) => ({ criterionId: c.id, score: c.maxScore }));
    expect(() => validateAndComputeScore(CRITERIA, scores)).not.toThrow();
  });

  it('allows boundary score of exactly 0', () => {
    const scores: ScoreInput[] = CRITERIA.map((c) => ({ criterionId: c.id, score: 0 }));
    expect(() => validateAndComputeScore(CRITERIA, scores)).not.toThrow();
  });
});
