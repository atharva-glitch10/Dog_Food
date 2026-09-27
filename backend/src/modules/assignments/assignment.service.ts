import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';
import { ProjectStatus } from '@prisma/client';

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

export class AssignmentService {
  /**
   * Auto-assigns judges to submitted projects using a Load-Balanced Round-Robin Matching Algorithm.
   *
   * ALGORITHM DESIGN & CONSTRAINTS:
   * 1. Conflict of Interest (COI) Invariant:
   *    A bipartite conflict graph is constructed upfront. A judge is strictly prohibited from
   *    evaluating any project submitted by a team where the judge is a member.
   * 2. Equitable Load Balancing (Greedy Min-Heap Equivalent):
   *    At each assignment step, candidates are sorted by current assigned load ascending.
   *    Judges with the lowest current workload receive priority.
   * 3. Capacity Upper Bounds:
   *    No judge is assigned more evaluations than their configured `capacity` (default: 10).
   * 4. Multi-Round Project Coverage:
   *    The algorithm iterates across `targetPerProject` rounds (default: 3). In each round,
   *    every submitted project is assigned one additional distinct judge, ensuring even
   *    cross-judge coverage across all projects.
   */
  async autoAssignJudges(eventId: string, options?: { seed?: number; targetPerProject?: number; clearExisting?: boolean }) {
    const seed = options?.seed ?? 42;
    const targetPerProject = options?.targetPerProject ?? 3;
    const clearExisting = options?.clearExisting ?? true;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { settings: true },
    });

    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    // 1. Fetch active judges
    const judges = await prisma.judge.findMany({
      where: { eventId, isActive: true },
      include: { user: true },
    });

    if (judges.length === 0) {
      throw new AppError('No active judges available for this event.', 400, 'NO_JUDGES');
    }

    // 2. Fetch submitted/finalized projects (drafts are NEVER assigned to judges)
    const projects = await prisma.project.findMany({
      where: {
        eventId,
        status: { in: [ProjectStatus.SUBMITTED, ProjectStatus.FINALIZED] },
      },
      include: {
        team: {
          include: { members: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    if (projects.length === 0) {
      throw new AppError('No submitted projects to assign.', 400, 'NO_PROJECTS');
    }

    // 3. Build conflict map: projectId -> Set of prohibited judgeIds
    const conflictMap = new Map<string, Set<string>>();
    for (const project of projects) {
      const prohibitedJudges = new Set<string>();
      const authorUserIds = new Set(project.team.members.map((m) => m.userId));

      for (const judge of judges) {
        if (authorUserIds.has(judge.userId)) {
          prohibitedJudges.add(judge.id);
        }
      }
      conflictMap.set(project.id, prohibitedJudges);
    }

    // 4. Run deterministic load-balanced round-robin assignment
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
          (j) =>
            !assigned.has(j.id) &&
            !prohibited.has(j.id) &&
            judgeLoads.get(j.id)! < j.capacity
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

    // Compute coverage diagnostics
    let fullyCoveredCount = 0;
    const underCoveredProjects: { projectId: string; title: string; assignedCount: number; target: number }[] = [];
    for (const project of projects) {
      const count = projectAssignments.get(project.id)?.length || 0;
      if (count >= targetPerProject) {
        fullyCoveredCount++;
      } else {
        underCoveredProjects.push({
          projectId: project.id,
          title: project.title,
          assignedCount: count,
          target: targetPerProject,
        });
      }
    }

    // 5. Commit assignments to database atomically
    const createdAssignments = await prisma.$transaction(async (tx) => {
      if (clearExisting) {
        await tx.judgeAssignment.deleteMany({ where: { eventId } });
      }

      const recordsToInsert: { eventId: string; judgeId: string; projectId: string }[] = [];
      for (const [projectId, judgeIds] of projectAssignments.entries()) {
        for (const judgeId of judgeIds) {
          recordsToInsert.push({ eventId, judgeId, projectId });
        }
      }

      await tx.judgeAssignment.createMany({
        data: recordsToInsert,
        skipDuplicates: true,
      });

      return recordsToInsert;
    });

    const judgeStats = judges.map((j) => ({
      judgeId: j.id,
      name: j.user.name,
      email: j.user.email,
      assignedCount: judgeLoads.get(j.id) || 0,
      capacity: j.capacity,
    }));

    return {
      totalAssignments: createdAssignments.length,
      seedUsed: seed,
      targetPerProject,
      coverageSummary: {
        totalProjects: projects.length,
        fullyCoveredProjects: fullyCoveredCount,
        underCoveredProjectsCount: underCoveredProjects.length,
        underCoveredProjects,
      },
      judgeWorkloads: judgeStats,
    };
  }

  async manualAssign(eventId: string, judgeId: string, projectId: string) {
    const judge = await prisma.judge.findUnique({
      where: { id: judgeId },
      include: { assignments: true },
    });
    if (!judge || judge.eventId !== eventId) {
      throw new AppError('Judge not found in this event', 404, 'JUDGE_NOT_FOUND');
    }

    if (!judge.isActive) {
      throw new AppError('Cannot assign an inactive judge.', 400, 'JUDGE_INACTIVE');
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { team: { include: { members: true } } },
    });
    if (!project || project.eventId !== eventId) {
      throw new AppError('Project not found in this event', 404, 'PROJECT_NOT_FOUND');
    }

    if (project.status === ProjectStatus.DRAFT) {
      throw new AppError('Cannot assign judges to an unsubmitted draft project.', 400, 'PROJECT_NOT_SUBMITTED');
    }

    // Check duplicate assignment
    const existing = await prisma.judgeAssignment.findUnique({
      where: { judgeId_projectId: { judgeId, projectId } },
    });
    if (existing) {
      throw new AppError('This judge is already assigned to this project.', 409, 'ALREADY_ASSIGNED');
    }

    // Check capacity limit
    const currentAssignmentsCount = judge.assignments.length;
    if (currentAssignmentsCount >= judge.capacity) {
      throw new AppError(`Judge has reached maximum capacity of ${judge.capacity} assignments.`, 400, 'CAPACITY_EXCEEDED');
    }

    // Check conflict of interest (judge is a member of the project team)
    const isAuthor = project.team.members.some((m) => m.userId === judge.userId);
    if (isAuthor) {
      throw new AppError('Cannot assign a judge to their own project submission.', 400, 'SELF_CONFLICT');
    }

    return prisma.judgeAssignment.create({
      data: { eventId, judgeId, projectId },
    });
  }

  async removeAssignment(assignmentId: string) {
    return prisma.judgeAssignment.delete({ where: { id: assignmentId } });
  }
}

export const assignmentService = new AssignmentService();
