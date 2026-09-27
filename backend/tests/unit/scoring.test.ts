import { describe, it, expect } from 'vitest';
import { computeWeightedTotal, normalizeRubricCriteria } from '../../src/modules/scoring/scoring.engine.js';

describe('Rubric & Weighted Scoring Formula Unit Tests', () => {
  it('should validate that criteria weights sum to 100%', () => {
    const criteria = [
      { title: 'Technical Architecture', description: '', weight: 0.30, maxScore: 10 },
      { title: 'Innovation', description: '', weight: 0.30, maxScore: 10 },
      { title: 'Impact', description: '', weight: 0.20, maxScore: 10 },
      { title: 'Design & UX', description: '', weight: 0.20, maxScore: 10 },
    ];

    const normalized = normalizeRubricCriteria(criteria);
    const totalWeight = normalized.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);

    // Percentages are converted to fractions
    const pct = normalizeRubricCriteria(criteria.map((c) => ({ ...c, weight: c.weight * 100 })));
    expect(pct.map((c) => c.weight)).toEqual([0.3, 0.3, 0.2, 0.2]);

    // Weights that do not sum to 100% are rejected, as fractions or as percentages
    expect(() => normalizeRubricCriteria(criteria.map((c) => ({ ...c, weight: 0.3 })))).toThrow('must sum to 100%');
    expect(() => normalizeRubricCriteria(criteria.map((c) => ({ ...c, weight: 30 })))).toThrow('must sum to 100%');
    expect(() => normalizeRubricCriteria([])).toThrow('at least one criterion');
  });

  it('should accurately calculate weighted raw score on 0-100 scale', () => {
    const criteria = [
      { id: 'c1', title: 'c1', weight: 0.30, maxScore: 10 },
      { id: 'c2', title: 'c2', weight: 0.30, maxScore: 10 },
      { id: 'c3', title: 'c3', weight: 0.20, maxScore: 10 },
      { id: 'c4', title: 'c4', weight: 0.20, maxScore: 10 },
    ];

    // Awarded scores: 9, 8, 10, 7
    // S_raw = (9/10)*0.30*100 + (8/10)*0.30*100 + (10/10)*0.20*100 + (7/10)*0.20*100
    //       = 27 + 24 + 20 + 14 = 85.0
    const total = computeWeightedTotal(criteria, [
      { criterionId: 'c1', score: 9 },
      { criterionId: 'c2', score: 8 },
      { criterionId: 'c3', score: 10 },
      { criterionId: 'c4', score: 7 },
    ]);

    expect(total).toBe(85.0);
  });

  it('should clamp total scores to [0, 100]', () => {
    // Mis-weighted rubrics (sum 1.05 / -0.05) would give 105 / -5 without clamping
    const over = computeWeightedTotal([{ id: 'c', title: 'c', weight: 1.05, maxScore: 10 }], [{ criterionId: 'c', score: 10 }]);
    const under = computeWeightedTotal([{ id: 'c', title: 'c', weight: -0.05, maxScore: 10 }], [{ criterionId: 'c', score: 10 }]);

    expect(under).toBe(0);
    expect(over).toBe(100);
  });
});
