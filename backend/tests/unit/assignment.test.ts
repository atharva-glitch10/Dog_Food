import { describe, it, expect } from 'vitest';
import { Mulberry32, buildConflictMap, greedyAssign } from '../../src/modules/assignments/assignment.engine.js';

describe('Deterministic Judge Assignment Unit Tests', () => {
  it('should produce identical PRNG sequence for a fixed seed', () => {
    const prng1 = new Mulberry32(42);
    const prng2 = new Mulberry32(42);

    const seq1 = [prng1.next(), prng1.next(), prng1.next()];
    const seq2 = [prng2.next(), prng2.next(), prng2.next()];

    expect(seq1).toEqual(seq2);
    for (const v of seq1) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(new Mulberry32(43).next()).not.toBe(seq1[0]);
  });

  it('should prevent self-assignment when a judge is an author of the project', () => {
    const judge1 = { id: 'J1', userId: 'U1', capacity: 5 };
    const judge2 = { id: 'J2', userId: 'U2', capacity: 5 };
    const project = { id: 'P1', authorUserIds: ['U1'] }; // Judge 1 is author!

    const conflicts = buildConflictMap([judge1, judge2], [project]);
    expect([...conflicts.get('P1')!]).toEqual(['J1']);

    // Even when asking for 2 judges per project, only the non-conflicted judge is used
    const { projectAssignments } = greedyAssign([judge1, judge2], [project], 2, 42);
    const eligibleJudges = projectAssignments.get('P1')!;
    expect(eligibleJudges.length).toBe(1);
    expect(eligibleJudges[0]).toBe('J2');
  });

  it('should respect judge capacity limits', () => {
    const judge = { id: 'J1', userId: 'U1', capacity: 2 };
    const projects = ['P1', 'P2', 'P3'].map((id) => ({ id, authorUserIds: [] }));

    const { projectAssignments, judgeLoads } = greedyAssign([judge], projects, 1, 42);

    // Once currentLoad === capacity, no further assignment is possible
    expect(judgeLoads.get('J1')).toBe(2);
    expect(projectAssignments.get('P3')).toEqual([]);
  });

  it('balances load and gives each project distinct judges', () => {
    const judges = ['J1', 'J2', 'J3', 'J4'].map((id) => ({ id, userId: `U-${id}`, capacity: 10 }));
    const projects = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map((id) => ({ id, authorUserIds: [] }));

    const { projectAssignments, judgeLoads } = greedyAssign(judges, projects, 2, 7);

    for (const assigned of projectAssignments.values()) {
      expect(assigned).toHaveLength(2);
      expect(new Set(assigned).size).toBe(2);
    }
    // 12 assignments over 4 judges. Greedy lowest-load-first with the distinct-judge
    // constraint is near-even but not guaranteed perfect: loads stay within 2 of each other.
    const loads = [...judgeLoads.values()];
    expect(loads.reduce((a, b) => a + b, 0)).toBe(12);
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(2);
  });

  it('is reproducible for the same seed', () => {
    const judges = ['J1', 'J2', 'J3'].map((id) => ({ id, userId: `U-${id}`, capacity: 10 }));
    const projects = ['P1', 'P2', 'P3', 'P4'].map((id) => ({ id, authorUserIds: [] }));
    const a = greedyAssign(judges, projects, 2, 2026);
    const b = greedyAssign(judges, projects, 2, 2026);
    expect([...a.projectAssignments.entries()]).toEqual([...b.projectAssignments.entries()]);
  });
});
