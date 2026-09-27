/**
 * Pure judge-assignment math (no Prisma / I/O), used by AssignmentService.
 */

/**
 * Deterministic 32-bit Pseudo-Random Number Generator (Mulberry32).
 *
 * WHY MULBERRY32?
 * Mulberry32 provides uniform pseudo-random distributions with a compact 32-bit internal state.
 * Using a deterministic seeded PRNG ensures:
 * 1. Reproducibility: Given the same seed, identical judge-project assignments are produced.
 * 2. Auditability: Contest organizers or third-party adjudicators can independently verify the run.
 * 3. Fairness: Tie-breaking among judges with identical workloads is strictly pseudo-random,
 *    eliminating alphabetical or database-insertion bias.
 */
export class Mulberry32 {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export interface AssignableJudge {
  id: string;
  userId: string;
  capacity: number;
}

export interface AssignableProject {
  id: string;
  /** User ids of the submitting team's members (conflict-of-interest source). */
  authorUserIds: string[];
}

/** projectId -> judge ids that may never review it (judge is a member of the submitting team). */
export function buildConflictMap(judges: AssignableJudge[], projects: AssignableProject[]): Map<string, Set<string>> {
  const conflictMap = new Map<string, Set<string>>();
  for (const project of projects) {
    const prohibitedJudges = new Set<string>();
    const authorUserIds = new Set(project.authorUserIds);
    for (const judge of judges) {
      if (authorUserIds.has(judge.userId)) {
        prohibitedJudges.add(judge.id);
      }
    }
    conflictMap.set(project.id, prohibitedJudges);
  }
  return conflictMap;
}

/**
 * Greedy load-balanced round-robin assignment. In each of `targetPerProject`
 * rounds every project (in the given order) gets one more distinct judge,
 * chosen among non-conflicted judges under capacity: lowest current load
 * first, Mulberry32 tie-break. Deterministic for a given seed and input order.
 */
export function greedyAssign(
  judges: AssignableJudge[],
  projects: AssignableProject[],
  targetPerProject: number,
  seed: number
): { projectAssignments: Map<string, string[]>; judgeLoads: Map<string, number> } {
  const conflictMap = buildConflictMap(judges, projects);
  const prng = new Mulberry32(seed);
  const judgeLoads = new Map<string, number>();
  const projectAssignments = new Map<string, string[]>();

  for (const j of judges) judgeLoads.set(j.id, 0);
  for (const p of projects) projectAssignments.set(p.id, []);

  for (let round = 0; round < targetPerProject; round++) {
    for (const project of projects) {
      const assigned = new Set(projectAssignments.get(project.id)!);
      const prohibited = conflictMap.get(project.id) || new Set();

      const candidates = judges.filter(
        (j) => !assigned.has(j.id) && !prohibited.has(j.id) && judgeLoads.get(j.id)! < j.capacity
      );

      if (candidates.length === 0) continue;

      // Sort candidates: lowest workload first, PRNG tie-breaker
      candidates.sort((a, b) => {
        const loadDiff = judgeLoads.get(a.id)! - judgeLoads.get(b.id)!;
        if (loadDiff !== 0) return loadDiff;
        return prng.next() - 0.5;
      });

      const selected = candidates[0];
      projectAssignments.get(project.id)!.push(selected.id);
      judgeLoads.set(selected.id, judgeLoads.get(selected.id)! + 1);
    }
  }

  return { projectAssignments, judgeLoads };
}
