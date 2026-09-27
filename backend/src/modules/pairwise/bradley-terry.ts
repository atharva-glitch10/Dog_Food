/**
 * Pure Bradley-Terry ranking via the MM (Minorization-Maximization) algorithm
 * (no Prisma / I/O), used by PairwiseService.
 */

export interface PairwiseComparisonInput {
  projectAId: string;
  projectBId: string;
  /** null/undefined = tie */
  winnerProjectId?: string | null;
}

export interface BradleyTerryOptions {
  maxIterations?: number;
  tolerance?: number;
}

/**
 * Fit latent skills pi (normalized so sum(pi) = n). Wins get +1, ties +0.5 to
 * both sides, with a 0.1 Laplace prior on every project's win count.
 * Comparisons referencing unknown projects are ignored.
 */
export function fitBradleyTerry(
  projectIds: string[],
  comparisons: PairwiseComparisonInput[],
  { maxIterations = 200, tolerance = 1e-6 }: BradleyTerryOptions = {}
): { skills: number[]; converged: boolean; iterations: number } {
  const n = projectIds.length;
  const idToIndex = new Map(projectIds.map((id, i) => [id, i]));

  // Comparison matrix N[i][j] and Win vector W[i]
  const W = new Array(n).fill(0.1); // Small Laplace prior smoothing
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
  let converged = false;
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
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

    // Normalize pi so sum(pi) = n
    const sumPi = piNext.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      piNext[i] = (piNext[i] / sumPi) * n;
    }

    let maxDiff = 0;
    for (let i = 0; i < n; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(piNext[i] - pi[i]));
    }

    pi = piNext;
    if (maxDiff < tolerance) {
      converged = true;
      break;
    }
  }

  return { skills: pi, converged, iterations };
}

/**
 * Fit Bradley-Terry and map skills linearly onto [50, 100] (weakest = 50,
 * strongest = 100), sorted best-first with 1-based ranks.
 */
export function rankByBradleyTerry(
  projectIds: string[],
  comparisons: PairwiseComparisonInput[],
  options?: BradleyTerryOptions
) {
  const { skills: pi, converged } = fitBradleyTerry(projectIds, comparisons, options);

  const maxPi = Math.max(...pi);
  const minPi = Math.min(...pi);
  const range = maxPi - minPi || 1;

  const ranked = projectIds.map((projectId, idx) => {
    const skill = pi[idx];
    const normalizedScore = 50 + ((skill - minPi) / range) * 50;
    return {
      projectId,
      latentSkill: parseFloat(skill.toFixed(4)),
      pairwiseScore: parseFloat(normalizedScore.toFixed(2)),
    };
  });

  ranked.sort((a, b) => b.pairwiseScore - a.pairwiseScore);

  return { converged, rankings: ranked.map((r, i) => ({ ...r, rank: i + 1 })) };
}
