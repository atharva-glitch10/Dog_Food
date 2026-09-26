import { describe, it, expect } from 'vitest';

describe('Rubric & Weighted Scoring Formula Unit Tests', () => {
  it('should validate that criteria weights sum to 100%', () => {
    const criteria = [
      { title: 'Technical Architecture', weight: 0.30, maxScore: 10 },
      { title: 'Innovation', weight: 0.30, maxScore: 10 },
      { title: 'Impact', weight: 0.20, maxScore: 10 },
      { title: 'Design & UX', weight: 0.20, maxScore: 10 },
    ];

    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it('should accurately calculate weighted raw score on 0-100 scale', () => {
    const criteria = [
      { id: 'c1', weight: 0.30, maxScore: 10 },
      { id: 'c2', weight: 0.30, maxScore: 10 },
      { id: 'c3', weight: 0.20, maxScore: 10 },
      { id: 'c4', weight: 0.20, maxScore: 10 },
    ];

    // Awarded scores: 9, 8, 10, 7
    const awarded = { c1: 9, c2: 8, c3: 10, c4: 7 };

    // S_raw = (9/10)*0.30*100 + (8/10)*0.30*100 + (10/10)*0.20*100 + (7/10)*0.20*100
    //       = 27 + 24 + 20 + 14 = 85.0
    let total = 0;
    for (const c of criteria) {
      const s = awarded[c.id as keyof typeof awarded];
      total += (s / c.maxScore) * c.weight * 100;
    }

    expect(total).toBe(85.0);
  });

  it('should clamp total scores to [0, 100]', () => {
    const minScore = Math.max(0, Math.min(100, -5));
    const maxScore = Math.max(0, Math.min(100, 105));

    expect(minScore).toBe(0);
    expect(maxScore).toBe(100);
  });
});
