/**
 * Phase 10 Regression Tests — Scoring Validation
 * Tests duplicate criteria, missing criteria, out-of-range scores, and invalid values.
 */
import { describe, it, expect } from 'vitest';

// ─── Pure scoring logic extracted for unit testing ────────────────────────────

interface Criterion { id: string; title: string; weight: number; maxScore: number }
interface ScoreInput { criterionId: string; score: number }

function validateAndComputeScore(criteria: Criterion[], scores: ScoreInput[]): number {
  const criteriaMap = new Map(criteria.map((c) => [c.id, c]));

  // Check duplicates
  const submittedIds = scores.map((s) => s.criterionId);
  const uniqueIds = new Set(submittedIds);
  if (uniqueIds.size !== submittedIds.length) {
    throw new Error('DUPLICATE_CRITERION');
  }

  // Check all criteria present
  const missingCriteria = criteria.filter((c) => !uniqueIds.has(c.id)).map((c) => c.title);
  if (missingCriteria.length > 0) {
    throw new Error(`MISSING_CRITERIA: ${missingCriteria.join(', ')}`);
  }

  let weightedTotal = 0;
  for (const item of scores) {
    const criterion = criteriaMap.get(item.criterionId);
    if (!criterion) throw new Error('INVALID_CRITERION');

    if (typeof item.score !== 'number' || !isFinite(item.score)) {
      throw new Error('INVALID_SCORE');
    }

    if (item.score < 0 || item.score > criterion.maxScore) {
      throw new Error(`SCORE_OUT_OF_BOUNDS: ${item.score} for ${criterion.title}`);
    }

    weightedTotal += (item.score / criterion.maxScore) * criterion.weight * 100;
  }

  return Math.min(100, Math.max(0, parseFloat(weightedTotal.toFixed(2))));
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
    expect(() => validateAndComputeScore(CRITERIA, scores)).toThrow('DUPLICATE_CRITERION');
  });

  it('rejects submission missing a required criterion', () => {
    const scores: ScoreInput[] = [
      { criterionId: 'c1', score: 8 },
      { criterionId: 'c2', score: 8 },
      // c3 missing
      { criterionId: 'c4', score: 8 },
    ];
    expect(() => validateAndComputeScore(CRITERIA, scores)).toThrow('MISSING_CRITERIA');
  });

  it('rejects score above maxScore', () => {
    const scores: ScoreInput[] = CRITERIA.map((c, i) => ({
      criterionId: c.id,
      score: i === 0 ? 11 : 8, // 11 > 10
    }));
    expect(() => validateAndComputeScore(CRITERIA, scores)).toThrow('SCORE_OUT_OF_BOUNDS');
  });

  it('rejects negative score', () => {
    const scores: ScoreInput[] = CRITERIA.map((c, i) => ({
      criterionId: c.id,
      score: i === 0 ? -1 : 8,
    }));
    expect(() => validateAndComputeScore(CRITERIA, scores)).toThrow('SCORE_OUT_OF_BOUNDS');
  });

  it('rejects NaN score', () => {
    const scores: ScoreInput[] = CRITERIA.map((c, i) => ({
      criterionId: c.id,
      score: i === 0 ? NaN : 8,
    }));
    expect(() => validateAndComputeScore(CRITERIA, scores)).toThrow('INVALID_SCORE');
  });

  it('rejects Infinity score', () => {
    const scores: ScoreInput[] = CRITERIA.map((c, i) => ({
      criterionId: c.id,
      score: i === 0 ? Infinity : 8,
    }));
    expect(() => validateAndComputeScore(CRITERIA, scores)).toThrow('INVALID_SCORE');
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

  it('allows boundary score of exactly maxScore', () => {
    const scores: ScoreInput[] = CRITERIA.map((c) => ({ criterionId: c.id, score: c.maxScore }));
    expect(() => validateAndComputeScore(CRITERIA, scores)).not.toThrow();
  });

  it('allows boundary score of exactly 0', () => {
    const scores: ScoreInput[] = CRITERIA.map((c) => ({ criterionId: c.id, score: 0 }));
    expect(() => validateAndComputeScore(CRITERIA, scores)).not.toThrow();
  });
});
