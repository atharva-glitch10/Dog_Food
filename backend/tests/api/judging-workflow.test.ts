import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { escapeCsvCell } from '../../src/modules/exports/csv.service.js';
import { computeWeightedTotal, normalizeRubricCriteria } from '../../src/modules/scoring/scoring.engine.js';
import { computeGlobalStats, normalizeJudgeScores } from '../../src/modules/normalization/normalization.engine.js';

describe('Judging & Integrity End-to-End Workflow Tests', () => {
  const app = createApp();

  it('1. should validate rubric criteria weights must sum to 100% (1.0)', async () => {
    // Valid weights: 0.35 + 0.35 + 0.30 = 1.00
    const validCriteria = [
      { title: 'Technical', description: '', weight: 0.35, maxScore: 10 },
      { title: 'Innovation', description: '', weight: 0.35, maxScore: 10 },
      { title: 'Design', description: '', weight: 0.30, maxScore: 10 },
    ];
    const validSum = normalizeRubricCriteria(validCriteria).reduce((sum, c) => sum + c.weight, 0);
    expect(validSum).toBeCloseTo(1.0, 5);

    // Invalid weights: 0.20 + 0.20 = 0.40
    const invalidCriteria = [
      { title: 'Technical', description: '', weight: 0.20, maxScore: 10 },
      { title: 'Innovation', description: '', weight: 0.20, maxScore: 10 },
    ];
    expect(() => normalizeRubricCriteria(invalidCriteria)).toThrow('Criterion weights must sum to 100%');
  });

  it('2. should calculate composite weighted score precisely based on configured rubric', () => {
    const rubric = [
      { id: 'c1', title: 'Architecture', weight: 0.40, maxScore: 10 },
      { id: 'c2', title: 'Completeness', weight: 0.30, maxScore: 10 },
      { id: 'c3', title: 'Presentation', weight: 0.30, maxScore: 10 },
    ];

    const awardedScores = [
      { criterionId: 'c1', score: 9 }, // (9/10)*0.40*100 = 36.0
      { criterionId: 'c2', score: 8 }, // (8/10)*0.30*100 = 24.0
      { criterionId: 'c3', score: 10 }, // (10/10)*0.30*100 = 30.0
    ];

    expect(computeWeightedTotal(rubric, awardedScores)).toBe(90.0);
  });

  it('3. should verify score normalization handles harsh and lenient judges fairly', () => {
    // Harsh judge gives scores [40, 50, 60] -> mean=50, std=10
    // Lenient judge gives scores [80, 90, 100] -> mean=90, std=10
    // Project A receives 60 from the harsh judge (+1.0 std) and Project B receives
    // 100 from the lenient judge (+1.0 std): both normalize to 70 + 15 * 1.0 = 85.0.
    const global = computeGlobalStats([40, 50, 60, 80, 90, 100]);
    const harsh = normalizeJudgeScores([40, 50, 60], global, 'Z_SCORE_FALLBACK');
    const lenient = normalizeJudgeScores([80, 90, 100], global, 'Z_SCORE_FALLBACK');

    expect(harsh.diagnostics.rawMean).toBe(50);
    expect(harsh.diagnostics.rawStdDev).toBe(10);
    expect(lenient.diagnostics.rawMean).toBe(90);
    expect(lenient.diagnostics.rawStdDev).toBe(10);

    const normHarsh = harsh.normalized[2];
    const normLenient = lenient.normalized[2];

    expect(normHarsh).toBe(85.0);
    expect(normLenient).toBe(85.0);
    expect(normHarsh).toBe(normLenient);
  });

  it('4. should properly escape CSV cells containing quotes, commas, and newlines', () => {
    const escapeMethod = escapeCsvCell;

    expect(escapeMethod('Simple Text')).toBe('"Simple Text"');
    expect(escapeMethod('Text, with comma')).toBe('"Text, with comma"');
    expect(escapeMethod('Text with "quotes"')).toBe('"Text with ""quotes"""');
    expect(escapeMethod('Multi\nLine\rText')).toBe('"Multi\nLine\rText"');
    expect(escapeMethod(null)).toBe('""');
  });

  it('5. should reject unauthenticated requests to judging and normalization endpoints', async () => {
    const res = await request(app).post('/api/events/test-event-id/judging/normalize');
    expect(res.status).toBe(401);

    const res2 = await request(app).post('/api/events/test-event-id/judges/assign/auto');
    expect(res2.status).toBe(401);

    const res3 = await request(app).post('/api/evaluations');
    expect(res3.status).toBe(401);
  });
});
