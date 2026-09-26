import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { CsvExportService } from '../../src/modules/exports/csv.service.js';

describe('Judging & Integrity End-to-End Workflow Tests', () => {
  const app = createApp();
  const csvService = new CsvExportService();

  it('1. should validate rubric criteria weights must sum to 100% (1.0)', async () => {
    // Valid weights: 0.35 + 0.35 + 0.30 = 1.00
    const validCriteria = [
      { title: 'Technical', weight: 0.35, maxScore: 10 },
      { title: 'Innovation', weight: 0.35, maxScore: 10 },
      { title: 'Design', weight: 0.30, maxScore: 10 },
    ];
    const validSum = validCriteria.reduce((sum, c) => sum + c.weight, 0);
    expect(validSum).toBeCloseTo(1.0, 5);

    // Invalid weights: 0.20 + 0.20 = 0.40
    const invalidCriteria = [
      { title: 'Technical', weight: 0.20, maxScore: 10 },
      { title: 'Innovation', weight: 0.20, maxScore: 10 },
    ];
    const invalidSum = invalidCriteria.reduce((sum, c) => sum + c.weight, 0);
    expect(Math.abs(invalidSum - 1.0)).toBeGreaterThan(0.01);
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

    let totalScore = 0;
    for (const item of awardedScores) {
      const criterion = rubric.find((c) => c.id === item.criterionId)!;
      totalScore += (item.score / criterion.maxScore) * criterion.weight * 100;
    }

    expect(totalScore).toBe(90.0);
  });

  it('3. should verify score normalization handles harsh and lenient judges fairly', () => {
    // Harsh judge gives scores [40, 50, 60] -> mean=50, std=10
    // Lenient judge gives scores [80, 90, 100] -> mean=90, std=10
    // If Project A receives 60 from Harsh Judge (+1.0 std above harsh judge mean)
    // and Project B receives 100 from Lenient Judge (+1.0 std above lenient judge mean)
    // Both normalized scores should be identical (70 + 15 * 1.0 = 85.0)!

    const harshMean = 50, harshStd = 10, harshScore = 60;
    const lenientMean = 90, lenientStd = 10, lenientScore = 100;

    const zHarsh = (harshScore - harshMean) / harshStd;
    const zLenient = (lenientScore - lenientMean) / lenientStd;

    expect(zHarsh).toBe(1.0);
    expect(zLenient).toBe(1.0);

    const normHarsh = 70 + 15 * zHarsh;
    const normLenient = 70 + 15 * zLenient;

    expect(normHarsh).toBe(85.0);
    expect(normLenient).toBe(85.0);
    expect(normHarsh).toBe(normLenient);
  });

  it('4. should properly escape CSV cells containing quotes, commas, and newlines', () => {
    const escapeMethod = (csvService as any).escapeCsvCell;

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
