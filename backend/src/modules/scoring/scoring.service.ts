import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';
import { computeWeightedTotal, ScoreInput } from './scoring.engine.js';
import { Role, ProjectStatus, EventStatus } from '@prisma/client';

export type { ScoreInput };

export class ScoringService {
  async getEvaluation(projectId: string, judgeUserId: string, userRole: Role) {
    const isPrivileged = userRole === Role.ORGANIZER || userRole === Role.ADMIN;

    const judge = await prisma.judge.findFirst({
      where: { userId: judgeUserId },
    });

    if (!judge && !isPrivileged) {
      throw new AppError('You are not a registered judge.', 403, 'FORBIDDEN');
    }

    // Role Isolation: Unprivileged judge can ONLY view projects they are assigned to
    if (judge && !isPrivileged) {
      const assignment = await prisma.judgeAssignment.findUnique({
        where: { judgeId_projectId: { judgeId: judge.id, projectId } },
      });
      if (!assignment) {
        throw new AppError('You are not assigned to evaluate this project.', 403, 'NOT_ASSIGNED');
      }
    }

    const evaluation = await prisma.evaluation.findFirst({
      where: {
        projectId,
        ...(judge && !isPrivileged ? { judgeId: judge.id } : {}),
      },
      include: {
        scores: { include: { criterion: true } },
        judge: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    return evaluation;
  }

  async submitEvaluation(
    eventId: string,
    judgeUserId: string,
    data: {
      projectId: string;
      isDraft?: boolean;
      feedback?: string;
      scores: ScoreInput[];
    },
    userRole?: Role
  ) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { rubric: { include: { criteria: true } } },
    });

    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    if (event.status === EventStatus.ARCHIVED) {
      throw new AppError('Event is archived. Evaluations cannot be submitted.', 400, 'EVENT_ARCHIVED');
    }

    const now = new Date();
    if (now < event.judgingStartDate) {
      throw new AppError('Judging period has not started yet for this event.', 400, 'JUDGING_NOT_STARTED');
    }
    if (now > event.judgingDeadline) {
      throw new AppError('Judging deadline has passed. Evaluations can no longer be submitted.', 400, 'DEADLINE_EXCEEDED');
    }

    if (!event.rubric || event.rubric.criteria.length === 0) {
      throw new AppError('Judging rubric has not been configured for this event.', 400, 'NO_RUBRIC');
    }

    // Verify project exists, belongs to this event, and is submitted (not draft)
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project || project.eventId !== eventId) {
      throw new AppError('Project not found for this event.', 404, 'PROJECT_NOT_FOUND');
    }

    if (project.status === ProjectStatus.DRAFT) {
      throw new AppError('Judges cannot evaluate an unsubmitted draft project.', 400, 'PROJECT_NOT_SUBMITTED');
    }

    const judge = await prisma.judge.findUnique({
      where: { eventId_userId: { eventId, userId: judgeUserId } },
    });

    if (!judge) {
      throw new AppError('You are not a registered judge for this event.', 403, 'FORBIDDEN');
    }

    // Verify assignment
    const assignment = await prisma.judgeAssignment.findUnique({
      where: { judgeId_projectId: { judgeId: judge.id, projectId: data.projectId } },
    });

    if (!assignment) {
      throw new AppError('You are not assigned to evaluate this project.', 403, 'NOT_ASSIGNED');
    }

    // Defense-in-depth: Conflict of Interest prevention
    const isTeamMember = await prisma.teamMember.findFirst({
      where: {
        userId: judgeUserId,
        team: { project: { id: data.projectId } },
      },
    });
    if (isTeamMember) {
      throw new AppError('Conflict of Interest: You cannot evaluate your own project submission.', 403, 'SELF_EVALUATION_FORBIDDEN');
    }

    // Validate scores against the rubric and compute the 0-100 weighted total (pure engine)
    const weightedTotal = computeWeightedTotal(event.rubric.criteria, data.scores);

    const isDraft = Boolean(data.isDraft);
    const isPrivileged = userRole === Role.ORGANIZER || userRole === Role.ADMIN;

    // Save evaluation & record append-only audit trail in an atomic transaction
    const evaluation = await prisma.$transaction(async (tx) => {
      // Check if this evaluation already existed to distinguish initial creation vs edit/override
      const existingEval = await tx.evaluation.findUnique({
        where: {
          judgeId_projectId: {
            judgeId: judge.id,
            projectId: data.projectId,
          },
        },
        include: { scores: true },
      });

      const evalRecord = await tx.evaluation.upsert({
        where: {
          judgeId_projectId: {
            judgeId: judge.id,
            projectId: data.projectId,
          },
        },
        create: {
          eventId,
          judgeId: judge.id,
          projectId: data.projectId,
          isDraft,
          weightedTotal,
          feedback: data.feedback || null,
        },
        update: {
          isDraft,
          weightedTotal,
          feedback: data.feedback !== undefined ? data.feedback : undefined,
        },
      });

      // Bulk-replace criterion scores: delete existing rows, then insert all at once.
      await tx.evaluationScore.deleteMany({
        where: { evaluationId: evalRecord.id },
      });
      await tx.evaluationScore.createMany({
        data: data.scores.map((item) => ({
          evaluationId: evalRecord.id,
          criterionId: item.criterionId,
          score: item.score,
        })),
      });

      // Update assignment completion flag
      await tx.judgeAssignment.update({
        where: { id: assignment.id },
        data: { isCompleted: !isDraft },
      });

      // Append-only audit log entry: records who scored what, previous scores vs new scores, and edits/overrides
      const isOverride = isPrivileged && judge.userId !== judgeUserId;
      const auditAction = existingEval
        ? (isOverride ? 'SCORE_OVERRIDE' : 'EVALUATION_UPDATED')
        : 'EVALUATION_CREATED';

      await tx.auditLog.create({
        data: {
          eventId,
          userId: judgeUserId,
          action: auditAction,
          entityType: 'Evaluation',
          entityId: evalRecord.id,
          payload: {
            judgeId: judge.id,
            judgeUserId: judge.userId,
            scorerUserId: judgeUserId,
            projectId: data.projectId,
            isDraft,
            isOverride,
            previousWeightedTotal: existingEval ? existingEval.weightedTotal : null,
            newWeightedTotal: weightedTotal,
            previousScores: existingEval?.scores.map((s) => ({ criterionId: s.criterionId, score: s.score })) ?? [],
            newScores: data.scores,
            feedback: data.feedback !== undefined ? data.feedback : (existingEval?.feedback ?? null),
            timestamp: new Date().toISOString(),
          } as any,
        },
      });

      return evalRecord;
    });

    return prisma.evaluation.findUnique({
      where: { id: evaluation.id },
      include: {
        scores: { include: { criterion: true } },
      },
    });
  }

  async getJudgingStats(eventId: string) {
    const [totalProjects, totalJudges, totalAssignments, completedEvaluations] = await Promise.all([
      prisma.project.count({ where: { eventId, status: { in: ['SUBMITTED', 'FINALIZED'] } } }),
      prisma.judge.count({ where: { eventId, isActive: true } }),
      prisma.judgeAssignment.count({ where: { eventId } }),
      prisma.evaluation.count({ where: { eventId, isDraft: false } }),
    ]);

    const completionRate = totalAssignments > 0 ? (completedEvaluations / totalAssignments) * 100 : 0;

    return {
      totalProjects,
      totalJudges,
      totalAssignments,
      completedEvaluations,
      pendingEvaluations: totalAssignments - completedEvaluations,
      completionRate: parseFloat(completionRate.toFixed(1)),
    };
  }
}

export const scoringService = new ScoringService();
