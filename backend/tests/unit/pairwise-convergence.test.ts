/**
 * Phase 10 Regression Tests — Pairwise Ranking
 * Tests convergence tracking, edge cases, and correctness.
 */
import { describe, it, expect } from 'vitest';
import { rankByBradleyTerry } from '../../src/modules/pairwise/bradley-terry.js';

interface Comparison { projectAId: string; projectBId: string; winnerProjectId: string | null }

/** Thin adapter over the real engine: [{ id, score }] best-first, plus the convergence flag. */
function runBradleyTerry(
  projectIds: string[],
  comparisons: Comparison[],
  maxIterations = 200,
  tolerance = 1e-6
): { rankings: { id: string; score: number }[]; converged: boolean } {
  const result = rankByBradleyTerry(projectIds, comparisons, { maxIterations, tolerance });
  return {
    converged: result.converged,
    rankings: result.rankings.map((r) => ({ id: r.projectId, score: r.pairwiseScore })),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Bradley-Terry Pairwise Rankings', () => {
  it('converges and ranks correctly with clear winner', () => {
    const ids = ['A', 'B', 'C'];
    const comps: Comparison[] = [
      { projectAId: 'A', projectBId: 'B', winnerProjectId: 'A' },
      { projectAId: 'A', projectBId: 'C', winnerProjectId: 'A' },
      { projectAId: 'B', projectBId: 'C', winnerProjectId: 'B' },
      { projectAId: 'A', projectBId: 'B', winnerProjectId: 'A' },
      { projectAId: 'A', projectBId: 'C', winnerProjectId: 'A' },
    ];
    const result = runBradleyTerry(ids, comps);
    expect(result.converged).toBe(true);       // ← was always true before fix
    expect(result.rankings[0].id).toBe('A');
    expect(result.rankings[1].id).toBe('B');
    expect(result.rankings[2].id).toBe('C');
    expect(result.rankings[0].score).toBeGreaterThan(result.rankings[1].score);
  });

  it('sets converged=false when maxIterations=1 (not enough to converge)', () => {
    const ids = ['A', 'B', 'C', 'D'];
    const comps: Comparison[] = [
      { projectAId: 'A', projectBId: 'B', winnerProjectId: 'A' },
      { projectAId: 'C', projectBId: 'D', winnerProjectId: 'D' },
      { projectAId: 'B', projectBId: 'C', winnerProjectId: 'C' },
    ];
    const result = runBradleyTerry(ids, comps, 1, 1e-6);
    // With only 1 iteration on 4 projects it is very unlikely to converge
    expect(result.converged).toBe(false);
  });

  it('handles tie comparisons', () => {
    const ids = ['A', 'B'];
    const comps: Comparison[] = [
      { projectAId: 'A', projectBId: 'B', winnerProjectId: null },
      { projectAId: 'A', projectBId: 'B', winnerProjectId: null },
    ];
    const result = runBradleyTerry(ids, comps);
    expect(result.converged).toBe(true);
    // With equal ties both should have very similar scores
    expect(Math.abs(result.rankings[0].score - result.rankings[1].score)).toBeLessThan(5);
  });

  it('handles single comparison (minimum viable input)', () => {
    const ids = ['A', 'B'];
    const comps: Comparison[] = [
      { projectAId: 'A', projectBId: 'B', winnerProjectId: 'A' },
    ];
    const result = runBradleyTerry(ids, comps);
    expect(result.converged).toBe(true);
    expect(result.rankings[0].id).toBe('A');
  });

  it('scores are between 50 and 100 (min=50 always by design)', () => {
    const ids = ['A', 'B', 'C'];
    const comps: Comparison[] = [
      { projectAId: 'A', projectBId: 'B', winnerProjectId: 'A' },
      { projectAId: 'B', projectBId: 'C', winnerProjectId: 'B' },
    ];
    const result = runBradleyTerry(ids, comps);
    for (const r of result.rankings) {
      expect(r.score).toBeGreaterThanOrEqual(50);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it('handles disconnected graph (project with no comparisons)', () => {
    const ids = ['A', 'B', 'C'];
    // C has no comparisons — it is disconnected
    const comps: Comparison[] = [
      { projectAId: 'A', projectBId: 'B', winnerProjectId: 'A' },
    ];
    const result = runBradleyTerry(ids, comps);
    // Should not throw; all scores should be finite
    for (const r of result.rankings) {
      expect(isFinite(r.score)).toBe(true);
    }
  });

  it('repeated calculation with identical input produces same result', () => {
    const ids = ['A', 'B', 'C'];
    const comps: Comparison[] = [
      { projectAId: 'A', projectBId: 'B', winnerProjectId: 'A' },
      { projectAId: 'B', projectBId: 'C', winnerProjectId: 'B' },
      { projectAId: 'A', projectBId: 'C', winnerProjectId: 'A' },
    ];
    const r1 = runBradleyTerry(ids, comps);
    const r2 = runBradleyTerry(ids, comps);
    expect(r1.converged).toBe(r2.converged);
    for (let i = 0; i < r1.rankings.length; i++) {
      expect(r1.rankings[i].id).toBe(r2.rankings[i].id);
      expect(r1.rankings[i].score).toBeCloseTo(r2.rankings[i].score, 5);
    }
  });
});
