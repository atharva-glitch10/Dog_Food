import { describe, it, expect } from 'vitest';
import { rankByBradleyTerry } from '../../src/modules/pairwise/bradley-terry.js';

const computeBradleyTerry = (
  projectIds: string[],
  comparisons: { projectAId: string; projectBId: string; winnerProjectId?: string | null }[]
) => rankByBradleyTerry(projectIds, comparisons).rankings;

describe('Bradley-Terry Pairwise Ranking Algorithm Unit Tests', () => {
  it('should rank clearly dominant projects at top rank (transitivity test)', () => {
    const projects = ['proj-A', 'proj-B', 'proj-C'];
    // A beats B 3 times, B beats C 3 times, A beats C 3 times
    const comparisons = [
      { projectAId: 'proj-A', projectBId: 'proj-B', winnerProjectId: 'proj-A' },
      { projectAId: 'proj-A', projectBId: 'proj-B', winnerProjectId: 'proj-A' },
      { projectAId: 'proj-A', projectBId: 'proj-B', winnerProjectId: 'proj-A' },
      { projectAId: 'proj-B', projectBId: 'proj-C', winnerProjectId: 'proj-B' },
      { projectAId: 'proj-B', projectBId: 'proj-C', winnerProjectId: 'proj-B' },
      { projectAId: 'proj-B', projectBId: 'proj-C', winnerProjectId: 'proj-B' },
      { projectAId: 'proj-A', projectBId: 'proj-C', winnerProjectId: 'proj-A' },
      { projectAId: 'proj-A', projectBId: 'proj-C', winnerProjectId: 'proj-A' },
      { projectAId: 'proj-A', projectBId: 'proj-C', winnerProjectId: 'proj-A' },
    ];

    const results = computeBradleyTerry(projects, comparisons);

    expect(results[0].projectId).toBe('proj-A');
    expect(results[1].projectId).toBe('proj-B');
    expect(results[2].projectId).toBe('proj-C');

    expect(results[0].latentSkill).toBeGreaterThan(results[1].latentSkill);
    expect(results[1].latentSkill).toBeGreaterThan(results[2].latentSkill);
    expect(results.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(results[0].pairwiseScore).toBe(100);
    expect(results[2].pairwiseScore).toBe(50);
  });

  it('should produce equal latent skill for perfectly tied matchups', () => {
    const projects = ['proj-X', 'proj-Y'];
    // X and Y tie, or each wins once
    const comparisons = [
      { projectAId: 'proj-X', projectBId: 'proj-Y', winnerProjectId: null },
      { projectAId: 'proj-X', projectBId: 'proj-Y', winnerProjectId: 'proj-X' },
      { projectAId: 'proj-X', projectBId: 'proj-Y', winnerProjectId: 'proj-Y' },
    ];

    const results = computeBradleyTerry(projects, comparisons);
    expect(results[0].latentSkill).toBeCloseTo(results[1].latentSkill, 2);
    expect(results[0].pairwiseScore).toBeCloseTo(results[1].pairwiseScore, 2);
  });

  it('should handle cyclic comparisons gracefully (A > B > C > A)', () => {
    const projects = ['proj-A', 'proj-B', 'proj-C'];
    const comparisons = [
      { projectAId: 'proj-A', projectBId: 'proj-B', winnerProjectId: 'proj-A' },
      { projectAId: 'proj-B', projectBId: 'proj-C', winnerProjectId: 'proj-B' },
      { projectAId: 'proj-C', projectBId: 'proj-A', winnerProjectId: 'proj-C' },
    ];

    const results = computeBradleyTerry(projects, comparisons);
    expect(results).toHaveLength(3);
    // All should have essentially identical skills due to symmetry
    expect(results[0].latentSkill).toBeCloseTo(results[1].latentSkill, 1);
    expect(results[1].latentSkill).toBeCloseTo(results[2].latentSkill, 1);
  });

  it('should yield deterministic and reproducible results for identical inputs', () => {
    const projects = ['p1', 'p2', 'p3', 'p4'];
    const comparisons = [
      { projectAId: 'p1', projectBId: 'p2', winnerProjectId: 'p1' },
      { projectAId: 'p2', projectBId: 'p3', winnerProjectId: 'p2' },
      { projectAId: 'p3', projectBId: 'p4', winnerProjectId: 'p3' },
      { projectAId: 'p1', projectBId: 'p4', winnerProjectId: 'p1' },
    ];

    const run1 = computeBradleyTerry(projects, comparisons);
    const run2 = computeBradleyTerry(projects, comparisons);

    expect(run1).toEqual(run2);
  });

  it('ignores comparisons that reference unknown projects', () => {
    const results = computeBradleyTerry(['A', 'B'], [
      { projectAId: 'A', projectBId: 'B', winnerProjectId: 'A' },
      { projectAId: 'A', projectBId: 'GHOST', winnerProjectId: 'GHOST' },
    ]);
    expect(results.map((r) => r.projectId)).toEqual(['A', 'B']);
  });
});
