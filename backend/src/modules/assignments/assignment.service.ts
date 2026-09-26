import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';
import { ProjectStatus } from '@prisma/client';

// Deterministic 32-bit PRNG (Mulberry32)
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

    // 2. Fetch submitted/finalized projects
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

    // 3. Build conflict map: projectId -> Set of judgeIds who are on the project's team
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

    // 4. Run deterministic assignment algorithm
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

    // 5. Commit assignments to database
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

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { team: { include: { members: true } } },
    });
    if (!project || project.eventId !== eventId) {
      throw new AppError('Project not found in this event', 404, 'PROJECT_NOT_FOUND');
    }

    // Check self-conflict
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
