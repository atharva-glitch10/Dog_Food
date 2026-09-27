import { describe, it, expect } from 'vitest';
import {
  computeGlobalStats,
  normalizeJudgeScores,
  zScoreToScale,
  compareRankedProjects,
  pickCoreCriterion,
  computeNormalization,
  GlobalStats,
  Z_CLAMP,
  NormalizationProjectInfo,
} from '../../src/modules/normalization/normalization.engine.js';

const GLOBAL: GlobalStats = { mean: 70, min: 40, max: 90, variance: 100, stdDev: 10 };

describe('Cross-Judge Score Normalization Unit Tests', () => {
  it('should accurately calculate judge mean, standard deviation and standard Z-score', () => {
    // Mean = 70, Variance = 100, StdDev = 10
    const { normalized, diagnostics } = normalizeJudgeScores([60, 70, 80], GLOBAL, 'Z_SCORE_FALLBACK');

    expect(diagnostics.rawMean).toBe(70);
    expect(diagnostics.rawStdDev).toBe(10);
    expect(diagnostics.isBayesianShrunk).toBe(false);

    // Z-score for 80: (80 - 70) / 10 = +1.0 -> 70 + 15 * 1.0 = 85.0
    expect(zScoreToScale(1.0)).toBe(85.0);
    expect(normalized).toEqual([55, 70, 85]);
  });

  it('should apply Bayesian prior shrinkage when judge sample size N < 3', () => {
    // Single observation (N=1) of 90; global mean 70, variance 100, std dev 10; k = 3
    const { normalized, diagnostics } = normalizeJudgeScores([90], GLOBAL, 'Z_SCORE_FALLBACK');

    // Shrunk mean: (1*90 + 3*70) / (1 + 3) = 300 / 4 = 75.0
    expect(diagnostics.adjustedMean).toBe(75.0);
    expect(diagnostics.isBayesianShrunk).toBe(true);
    expect(diagnostics.adjustedMean).toBeLessThan(90); // Pulled down towards global mean
    expect(diagnostics.adjustedStdDev).toBeGreaterThan(0);

    // combined variance = (0 + 3*100 + (3/4)*400) / 3 = 200 -> sd = 14.14; z = 15/14.14 = 1.06 -> 85.91
    expect(diagnostics.adjustedStdDev).toBe(14.14);
    expect(normalized[0]).toBe(85.91);
  });

  it('should handle zero variance without dividing by zero', () => {
    const { normalized, diagnostics } = normalizeJudgeScores([80, 80, 80], GLOBAL, 'Z_SCORE_FALLBACK');

    expect(diagnostics.isZeroVariance).toBe(true);
    // Fallback std dev = global std dev
    expect(diagnostics.adjustedStdDev).toBe(10);
    // z = 0 -> 70.0
    expect(normalized).toEqual([70.0, 70.0, 70.0]);
  });

  it('should clamp extreme outlier Z-scores to [-3.0, +3.0] and scale to [0, 100]', () => {
    expect(Z_CLAMP).toBe(3.0);
    expect(zScoreToScale(5.4)).toBe(100);
    expect(zScoreToScale(3.0)).toBe(100);
    expect(zScoreToScale(-5.4)).toBe(25); // 70 - 15 * 3
  });

  it('should break score ties using core criterion and lower variance hierarchy', () => {
    const projectA = {
      id: 'A',
      normalizedScore: 85.0,
      coreCriterionScore: 9.0,
      scoreStdDev: 2.0, // Low variance = high consensus
      submittedAt: new Date('2026-09-20T10:00:00Z'),
    };
    const projectB = {
      id: 'B',
      normalizedScore: 85.0,
      coreCriterionScore: 9.0,
      scoreStdDev: 6.0, // High variance = polarizing disagreement
      submittedAt: new Date('2026-09-20T10:00:00Z'),
    };

    const sorted = [projectB, projectA].sort(compareRankedProjects);
    expect(sorted[0].id).toBe('A');
  });

  it('applies every tie-break tier in order', () => {
    const base = { normalizedScore: 80, coreCriterionScore: 8, scoreStdDev: 3, submittedAt: new Date('2026-09-20T10:00:00Z') };
    // Tier 1: higher normalized score wins
    expect(compareRankedProjects({ ...base, normalizedScore: 81 }, base)).toBeLessThan(0);
    // Tier 2: higher core criterion wins
    expect(compareRankedProjects({ ...base, coreCriterionScore: 9 }, base)).toBeLessThan(0);
    // Tier 3: lower dispersion wins
    expect(compareRankedProjects({ ...base, scoreStdDev: 1 }, base)).toBeLessThan(0);
    // Tier 4: earlier submission wins; unsubmitted sorts last
    expect(compareRankedProjects({ ...base, submittedAt: new Date('2026-09-19T10:00:00Z') }, base)).toBeLessThan(0);
    expect(compareRankedProjects({ ...base, submittedAt: null }, base)).toBeGreaterThan(0);
  });

  it('should linearly scale scores to [0, 100] using judge min and max', () => {
    const { normalized } = normalizeJudgeScores([50, 75, 100], GLOBAL, 'MIN_MAX');
    expect(normalized).toEqual([0, 50, 100]);
  });

  it('should fall back gracefully to global range when judge min === max in Min-Max scaling', () => {
    // judge min = max = 80; global range [40, 90]: (80 - 40) / 50 * 100 = 80.0
    const { normalized } = normalizeJudgeScores([80], GLOBAL, 'MIN_MAX');
    expect(normalized[0]).toBe(80.0);
  });

  it('computes global statistics with sample variance and single-score defaults', () => {
    expect(computeGlobalStats([60, 70, 80])).toEqual({ mean: 70, min: 60, max: 80, variance: 100, stdDev: 10 });
    expect(computeGlobalStats([55])).toMatchObject({ mean: 55, variance: 100, stdDev: 10 });
  });

  it('picks the highest-weighted rubric criterion as the core criterion', () => {
    expect(pickCoreCriterion([{ id: 'a', weight: 0.2 }, { id: 'b', weight: 0.5 }, { id: 'c', weight: 0.3 }])?.id).toBe('b');
    expect(pickCoreCriterion(null)).toBeNull();
    expect(pickCoreCriterion([])).toBeNull();
  });
});

describe('computeNormalization pipeline', () => {
  // Harsh judge H scores everything ~20 points below lenient judge L.
  const evaluations = [
    { id: 'e1', judgeId: 'H', projectId: 'P1', weightedTotal: 60, scores: [{ criterionId: 'core', score: 6 }] },
    { id: 'e2', judgeId: 'H', projectId: 'P2', weightedTotal: 50, scores: [{ criterionId: 'core', score: 5 }] },
    { id: 'e3', judgeId: 'H', projectId: 'P3', weightedTotal: 40, scores: [{ criterionId: 'core', score: 4 }] },
    { id: 'e4', judgeId: 'L', projectId: 'P1', weightedTotal: 90, scores: [{ criterionId: 'core', score: 9 }] },
    { id: 'e5', judgeId: 'L', projectId: 'P2', weightedTotal: 80, scores: [{ criterionId: 'core', score: 8 }] },
    { id: 'e6', judgeId: 'L', projectId: 'P3', weightedTotal: 70, scores: [{ criterionId: 'core', score: 7 }] },
  ];
  const projects = new Map<string, NormalizationProjectInfo>(
    ['P1', 'P2', 'P3'].map((id) => [id, { title: id, teamName: `Team ${id}`, trackName: null, submittedAt: null }])
  );

  it('removes judge leniency bias and ranks by normalized score', () => {
    const result = computeNormalization(evaluations, projects, 'core', 'Z_SCORE_FALLBACK');

    expect(result.globalStats.totalEvaluations).toBe(6);
    expect(result.rankings.map((r) => r.projectId)).toEqual(['P1', 'P2', 'P3']);
    // Both judges have mean-centred z of +1 / 0 / -1 -> 85 / 70 / 55 for every project
    expect(result.rankings.map((r) => r.normalizedScore)).toEqual([85, 70, 55]);
    expect(result.rankings.map((r) => r.rawScore)).toEqual([75, 65, 55]);
    expect(result.rankings.map((r) => r.finalRank)).toEqual([1, 2, 3]);
    expect(result.rankings[0].scoreStdDev).toBe(0); // perfect cross-judge agreement
    expect(result.judgeDiagnostics).toHaveLength(2);
    expect(result.rankings[0]).not.toHaveProperty('coreCriterionScore');
  });

  it('is deterministic for identical input', () => {
    expect(computeNormalization(evaluations, projects, 'core', 'MIN_MAX')).toEqual(
      computeNormalization(evaluations, projects, 'core', 'MIN_MAX')
    );
  });
});
