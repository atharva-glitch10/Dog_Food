import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';
import { ProjectStatus } from '@prisma/client';
import { greedyAssign } from './assignment.engine.js';

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

    // 3-4. Conflict-of-interest filtering + deterministic load-balanced round-robin (pure engine)
    const { projectAssignments, judgeLoads } = greedyAssign(
      judges.map((j) => ({ id: j.id, userId: j.userId, capacity: j.capacity })),
      projects.map((p) => ({ id: p.id, authorUserIds: p.team.members.map((m) => m.userId) })),
      targetPerProject,
      seed
    );

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
