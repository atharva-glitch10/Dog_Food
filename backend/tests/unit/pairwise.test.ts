import { describe, it, expect } from 'vitest';

// Bradley-Terry MM Algorithm Reference Implementation
function computeBradleyTerry(
  projectIds: string[],
  comparisons: { projectAId: string; projectBId: string; winnerProjectId?: string | null }[]
) {
  const n = projectIds.length;
  const idToIndex = new Map(projectIds.map((id, i) => [id, i]));

  const W = new Array(n).fill(0.1); // Small Laplace smoothing
  const N = Array.from({ length: n }, () => new Array(n).fill(0));

  for (const comp of comparisons) {
    const i = idToIndex.get(comp.projectAId);
    const j = idToIndex.get(comp.projectBId);
    if (i === undefined || j === undefined) continue;

    N[i][j] += 1;
    N[j][i] += 1;

    if (comp.winnerProjectId === comp.projectAId) {
      W[i] += 1;
    } else if (comp.winnerProjectId === comp.projectBId) {
      W[j] += 1;
    } else {
      // Tie
      W[i] += 0.5;
      W[j] += 0.5;
    }
  }

  let pi = new Array(n).fill(1.0);
  const maxIterations = 200;
  const tolerance = 1e-6;

  for (let iter = 0; iter < maxIterations; iter++) {
    const piNext = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      let denominator = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j && N[i][j] > 0) {
          denominator += N[i][j] / (pi[i] + pi[j]);
        }
      }
      piNext[i] = denominator > 0 ? W[i] / denominator : pi[i];
    }

    const sumPi = piNext.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      piNext[i] = (piNext[i] / sumPi) * n;
    }

    let maxDiff = 0;
    for (let i = 0; i < n; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(piNext[i] - pi[i]));
    }

    pi = piNext;
    if (maxDiff < tolerance) break;
  }

  const maxPi = Math.max(...pi);
  const minPi = Math.min(...pi);
  const range = maxPi - minPi || 1;

  const ranked = projectIds.map((id, idx) => {
    const skill = pi[idx];
    const normalizedScore = 50 + ((skill - minPi) / range) * 50;
    return {
      projectId: id,
      latentSkill: parseFloat(skill.toFixed(4)),
      pairwiseScore: parseFloat(normalizedScore.toFixed(2)),
    };
  });

  ranked.sort((a, b) => b.pairwiseScore - a.pairwiseScore);
  return ranked.map((r, i) => ({ ...r, rank: i + 1 }));
}

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
});
