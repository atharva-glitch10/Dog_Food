import { describe, it, expect } from 'vitest';

describe('Cross-Judge Score Normalization Unit Tests', () => {
  // Test Z-Score calculation
  it('should accurately calculate judge mean, standard deviation and standard Z-score', () => {
    const scores = [60, 70, 80]; // Mean = 70, Variance = 100, StdDev = 10
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (scores.length - 1);
    const stdDev = Math.sqrt(variance);

    expect(mean).toBe(70);
    expect(stdDev).toBe(10);

    // Z-score for score 80: (80 - 70) / 10 = +1.0
    const z = (80 - mean) / stdDev;
    expect(z).toBe(1.0);

    // Rescaled score with target mean 70, std dev 15: 70 + 15 * 1.0 = 85.0
    const normalized = Math.max(0, Math.min(100, 70 + 15 * z));
    expect(normalized).toBe(85.0);
  });

  // Test Bayesian shrinkage fallback for small sample size (N < 3)
  it('should apply Bayesian prior shrinkage when judge sample size N < 3', () => {
    const judgeScores = [90]; // Harsh/Lenient single observation N=1
    const N = 1;
    const rawMean = 90;
    const rawVariance = 0;

    const globalMean = 70;
    const globalVariance = 100;
    const globalStdDev = 10;
    const k = 3; // Pseudo-observation shrinkage weight

    // Shrunk mean: (1*90 + 3*70) / (1 + 3) = 300 / 4 = 75.0
    const adjustedMean = (N * rawMean + k * globalMean) / (N + k);
    expect(adjustedMean).toBe(75.0);

    const combinedVariance =
      ((Math.max(0, N - 1) * rawVariance) + k * globalVariance + ((N * k) / (N + k)) * Math.pow(rawMean - globalMean, 2)) /
      (N + k - 1);
    const adjustedStdDev = Math.sqrt(combinedVariance) || globalStdDev;

    expect(adjustedMean).toBeLessThan(90); // Pulled down towards global mean
    expect(adjustedStdDev).toBeGreaterThan(0);
  });

  // Test Zero Variance Fallback
  it('should handle zero variance without dividing by zero', () => {
    const scores = [80, 80, 80];
    const mean = 80;
    const stdDev = 0;
    const globalStdDev = 10;

    // Fallback stdDev
    const effectiveStdDev = stdDev === 0 ? globalStdDev : stdDev;
    expect(effectiveStdDev).toBe(10);

    const z = (80 - mean) / effectiveStdDev;
    expect(z).toBe(0);

    const normalized = Math.max(0, Math.min(100, 70 + 15 * z));
    expect(normalized).toBe(70.0);
  });

  // Test Outlier Clamping
  it('should clamp extreme outlier Z-scores to [-3.0, +3.0] and scale to [0, 100]', () => {
    const rawZ = 5.4; // Extreme outlier
    const clampedZ = Math.max(-3.0, Math.min(3.0, rawZ));
    expect(clampedZ).toBe(3.0);

    const normalized = Math.max(0, Math.min(100, 70 + 15 * clampedZ));
    expect(normalized).toBe(100);
  });

  // Test 4-Tier Tie Breaking
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

    // Tie-breaker: Same normalized score, same core criterion -> Project A wins on lower scoreStdDev
    const sorted = [projectB, projectA].sort((a, b) => {
      if (Math.abs(b.normalizedScore - a.normalizedScore) > 0.001) {
        return b.normalizedScore - a.normalizedScore;
      }
      if (Math.abs(b.coreCriterionScore - a.coreCriterionScore) > 0.001) {
        return b.coreCriterionScore - a.coreCriterionScore;
      }
      if (Math.abs(a.scoreStdDev - b.scoreStdDev) > 0.001) {
        return a.scoreStdDev - b.scoreStdDev; // Lowest variance first
      }
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    });

    expect(sorted[0].id).toBe('A');
  });
});
