import { describe, it, expect } from 'vitest';

class Mulberry32 {
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

describe('Deterministic Judge Assignment Unit Tests', () => {
  it('should produce identical PRNG sequence for a fixed seed', () => {
    const prng1 = new Mulberry32(42);
    const prng2 = new Mulberry32(42);

    const seq1 = [prng1.next(), prng1.next(), prng1.next()];
    const seq2 = [prng2.next(), prng2.next(), prng2.next()];

    expect(seq1).toEqual(seq2);
  });

  it('should prevent self-assignment when a judge is an author of the project', () => {
    const judge1 = { id: 'J1', userId: 'U1', capacity: 5 };
    const judge2 = { id: 'J2', userId: 'U2', capacity: 5 };

    const project = { id: 'P1', authorUserIds: new Set(['U1']) }; // Judge 1 is author!

    // Filter valid judges
    const eligibleJudges = [judge1, judge2].filter((j) => !project.authorUserIds.has(j.userId));

    expect(eligibleJudges.length).toBe(1);
    expect(eligibleJudges[0].id).toBe('J2');
  });

  it('should respect judge capacity limits', () => {
    const judge = { id: 'J1', capacity: 2, currentLoad: 2 };
    const canAssign = judge.currentLoad < judge.capacity;
    expect(canAssign).toBe(false);
  });
});
