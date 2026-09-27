/**
 * Business Rule Enforcement & Bypass Attack Simulation Tests
 *
 * Confirms that critical business rules are enforced server-side / in the API layer,
 * rejecting any client attempts to bypass rules via direct API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubmissionsService } from '../../src/modules/submissions/submissions.service.js';
import { ScoringService } from '../../src/modules/scoring/scoring.service.js';
import { TeamsService } from '../../src/modules/teams/teams.service.js';
import { ResultsService } from '../../src/modules/results/results.service.js';
import { AssignmentService } from '../../src/modules/assignments/assignment.service.js';
import { NormalizationService } from '../../src/modules/normalization/normalization.service.js';
import { PairwiseService } from '../../src/modules/pairwise/pairwise.service.js';
import { Role, ProjectStatus, EventStatus, TeamRole } from '@prisma/client';

// Mock Prisma client for deterministic, offline security testing
vi.mock('../../src/utils/prisma.js', () => {
  return {
    prisma: {
      event: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      team: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      teamMember: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      judge: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      judgeAssignment: {
        findUnique: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      evaluation: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
      evaluationScore: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      track: {
        findUnique: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      submissionHistory: {
        create: vi.fn(),
      },
      pairwiseComparison: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback({
        project: {
          create: vi.fn().mockImplementation((args) => Promise.resolve({ id: 'proj-new', ...args.data })),
          update: vi.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
        },
        evaluation: {
          findUnique: vi.fn().mockResolvedValue(null),
          upsert: vi.fn().mockImplementation((args) => Promise.resolve({ id: 'eval-1', ...args.create })),
        },
        evaluationScore: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn().mockResolvedValue({ count: 4 }),
        },
        judgeAssignment: {
          update: vi.fn().mockResolvedValue({ id: 'assign-1', isCompleted: true }),
        },
        auditLog: {
          create: vi.fn().mockImplementation((args) => Promise.resolve({ id: 'log-1', ...args.data })),
        },
        submissionHistory: {
          create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
        },
      })),
    },
  };
});

import { prisma } from '../../src/utils/prisma.js';

describe('Backend Business Rule Enforcement & Bypass Tests', () => {
  const submissionsService = new SubmissionsService();
  const scoringService = new ScoringService();
  const teamsService = new TeamsService();
  const resultsService = new ResultsService();
  const assignmentService = new AssignmentService();
  const normalizationService = new NormalizationService();
  const pairwiseService = new PairwiseService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. SUBMISSION DEADLINES & WINDOW ENFORCEMENT ───────────────────────────

  describe('1. Submission Window & Deadline Enforcement', () => {
    it('REJECTS submission creation if current time is BEFORE submissionStartDate', async () => {
      const futureStart = new Date(Date.now() + 86400000); // starts tomorrow
      const futureEnd = new Date(Date.now() + 172800000);

      (prisma.teamMember.findFirst as any).mockResolvedValue({
        userId: 'user-1',
        team: {
          id: 'team-1',
          project: null,
          event: {
            id: 'event-1',
            status: EventStatus.SUBMISSION_OPEN,
            submissionStartDate: futureStart,
            submissionDeadline: futureEnd,
          },
        },
      });

      await expect(
        submissionsService.createProject('event-1', 'user-1', {
          title: 'Early Project',
          problemStatement: 'Problem',
          solutionDescription: 'Solution',
        })
      ).rejects.toMatchObject({ code: 'SUBMISSION_NOT_STARTED', statusCode: 400 });
    });

    it('REJECTS submission creation if current time is AFTER submissionDeadline', async () => {
      const pastStart = new Date(Date.now() - 172800000);
      const pastEnd = new Date(Date.now() - 86400000); // ended yesterday

      (prisma.teamMember.findFirst as any).mockResolvedValue({
        userId: 'user-1',
        team: {
          id: 'team-1',
          project: null,
          event: {
            id: 'event-1',
            status: EventStatus.SUBMISSION_OPEN,
            submissionStartDate: pastStart,
            submissionDeadline: pastEnd,
          },
        },
      });

      await expect(
        submissionsService.createProject('event-1', 'user-1', {
          title: 'Late Project',
          problemStatement: 'Problem',
          solutionDescription: 'Solution',
        })
      ).rejects.toMatchObject({ code: 'DEADLINE_EXCEEDED', statusCode: 400 });
    });

    it('REJECTS final submission if submitted after deadline by participant', async () => {
      const pastEnd = new Date(Date.now() - 3600000); // 1 hour ago

      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        title: 'Project Title',
        problemStatement: 'Problem',
        solutionDescription: 'Solution',
        status: ProjectStatus.DRAFT,
        event: {
          status: EventStatus.SUBMISSION_OPEN,
          submissionStartDate: new Date(Date.now() - 86400000),
          submissionDeadline: pastEnd,
          settings: { minTeamSize: 1, maxTeamSize: 4 },
        },
        team: {
          members: [{ userId: 'user-1' }],
        },
      });

      await expect(
        submissionsService.submitProject('proj-1', 'user-1', Role.PARTICIPANT)
      ).rejects.toMatchObject({ code: 'DEADLINE_EXCEEDED', statusCode: 400 });
    });
  });

  // ─── 2. ELIGIBILITY CHECKS (TEAM SIZE & TRACKS) ─────────────────────────────

  describe('2. Eligibility Checks (Team Size & Track Scope)', () => {
    it('REJECTS project submission when team size is smaller than minTeamSize', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        title: 'Solo Project in Team Event',
        problemStatement: 'Problem',
        solutionDescription: 'Solution',
        status: ProjectStatus.DRAFT,
        event: {
          status: EventStatus.SUBMISSION_OPEN,
          submissionStartDate: new Date(Date.now() - 86400000),
          submissionDeadline: new Date(Date.now() + 86400000),
          settings: { minTeamSize: 2, maxTeamSize: 4 }, // Requires at least 2
        },
        team: {
          members: [{ userId: 'user-solo' }], // Only 1 member
        },
      });

      await expect(
        submissionsService.submitProject('proj-1', 'user-solo', Role.PARTICIPANT)
      ).rejects.toMatchObject({ code: 'TEAM_SIZE_TOO_SMALL', statusCode: 400 });
    });

    it('REJECTS project submission when team size exceeds maxTeamSize', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        title: 'Overcrowded Project',
        problemStatement: 'Problem',
        solutionDescription: 'Solution',
        status: ProjectStatus.DRAFT,
        event: {
          status: EventStatus.SUBMISSION_OPEN,
          submissionStartDate: new Date(Date.now() - 86400000),
          submissionDeadline: new Date(Date.now() + 86400000),
          settings: { minTeamSize: 1, maxTeamSize: 2 }, // Max 2
        },
        team: {
          members: [{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }], // 3 members
        },
      });

      await expect(
        submissionsService.submitProject('proj-1', 'u1', Role.PARTICIPANT)
      ).rejects.toMatchObject({ code: 'TEAM_SIZE_TOO_LARGE', statusCode: 400 });
    });

    it('REJECTS submission creation referencing a track belonging to a DIFFERENT event', async () => {
      (prisma.teamMember.findFirst as any).mockResolvedValue({
        userId: 'user-1',
        team: {
          id: 'team-1',
          project: null,
          event: {
            id: 'event-1',
            status: EventStatus.SUBMISSION_OPEN,
            submissionStartDate: new Date(Date.now() - 86400000),
            submissionDeadline: new Date(Date.now() + 86400000),
          },
        },
      });

      // Track belongs to event-999, not event-1
      (prisma.track.findUnique as any).mockResolvedValue({
        id: 'foreign-track',
        eventId: 'event-999',
        name: 'AI Track (Wrong Event)',
      });

      await expect(
        submissionsService.createProject('event-1', 'user-1', {
          title: 'Cross Track Injection',
          problemStatement: 'Problem',
          solutionDescription: 'Solution',
          trackId: 'foreign-track',
        })
      ).rejects.toMatchObject({ code: 'INVALID_TRACK', statusCode: 400 });
    });
  });

  // ─── 3. JUDGING ENGINE & CONFLICT OF INTEREST ENFORCEMENT ────────────────────

  describe('3. Judge Access Scope & Conflict of Interest (COI)', () => {
    const validRubric = {
      criteria: [
        { id: 'c1', title: 'Tech', weight: 0.5, maxScore: 10 },
        { id: 'c2', title: 'Design', weight: 0.5, maxScore: 10 },
      ],
    };

    it('REJECTS judge scoring an unassigned project (NOT_ASSIGNED)', async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        id: 'event-1',
        status: EventStatus.JUDGING_ACTIVE,
        judgingStartDate: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000),
        rubric: validRubric,
      });

      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-unassigned',
        eventId: 'event-1',
        status: ProjectStatus.SUBMITTED,
      });

      (prisma.judge.findUnique as any).mockResolvedValue({
        id: 'judge-1',
        eventId: 'event-1',
        userId: 'judge-user-1',
      });

      // Judge has NO assignment for this project
      (prisma.judgeAssignment.findUnique as any).mockResolvedValue(null);

      await expect(
        scoringService.submitEvaluation('event-1', 'judge-user-1', {
          projectId: 'proj-unassigned',
          scores: [
            { criterionId: 'c1', score: 9 },
            { criterionId: 'c2', score: 8 },
          ],
        })
      ).rejects.toMatchObject({ code: 'NOT_ASSIGNED', statusCode: 403 });
    });

    it('STRICTLY PROHIBITS judge from evaluating their own project (SELF_EVALUATION_FORBIDDEN)', async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        id: 'event-1',
        status: EventStatus.JUDGING_ACTIVE,
        judgingStartDate: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000),
        rubric: validRubric,
      });

      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-self',
        eventId: 'event-1',
        status: ProjectStatus.SUBMITTED,
      });

      (prisma.judge.findUnique as any).mockResolvedValue({
        id: 'judge-author',
        eventId: 'event-1',
        userId: 'user-author-judge',
      });

      (prisma.judgeAssignment.findUnique as any).mockResolvedValue({
        id: 'assign-self',
        judgeId: 'judge-author',
        projectId: 'proj-self',
      });

      // COI: Judge is found in teamMember for this project
      (prisma.teamMember.findFirst as any).mockResolvedValue({
        id: 'member-author',
        userId: 'user-author-judge',
        teamId: 'team-self',
      });

      await expect(
        scoringService.submitEvaluation('event-1', 'user-author-judge', {
          projectId: 'proj-self',
          scores: [
            { criterionId: 'c1', score: 10 },
            { criterionId: 'c2', score: 10 },
          ],
        })
      ).rejects.toMatchObject({ code: 'SELF_EVALUATION_FORBIDDEN', statusCode: 403 });
    });

    it('PREVENTS manual assignment of a judge to their own project', async () => {
      (prisma.judge.findUnique as any).mockResolvedValue({
        id: 'judge-1',
        eventId: 'event-1',
        userId: 'user-1',
        isActive: true,
        assignments: [],
        capacity: 10,
      });

      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        eventId: 'event-1',
        status: ProjectStatus.SUBMITTED,
        team: {
          members: [{ userId: 'user-1' }], // Author!
        },
      });

      // Ensure not already assigned
      (prisma.judgeAssignment.findUnique as any).mockResolvedValue(null);

      await expect(
        assignmentService.manualAssign('event-1', 'judge-1', 'proj-1')
      ).rejects.toMatchObject({ code: 'SELF_CONFLICT', statusCode: 400 });
    });

    it('REJECTS judge attempting to evaluate an unsubmitted DRAFT project', async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        id: 'event-1',
        status: EventStatus.JUDGING_ACTIVE,
        judgingStartDate: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000),
        rubric: validRubric,
      });

      // Project is in DRAFT
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-draft',
        eventId: 'event-1',
        status: ProjectStatus.DRAFT,
      });

      (prisma.judge.findUnique as any).mockResolvedValue({
        id: 'judge-1',
        eventId: 'event-1',
        userId: 'judge-user-1',
      });

      await expect(
        scoringService.submitEvaluation('event-1', 'judge-user-1', {
          projectId: 'proj-draft',
          scores: [
            { criterionId: 'c1', score: 8 },
            { criterionId: 'c2', score: 8 },
          ],
        })
      ).rejects.toMatchObject({ code: 'PROJECT_NOT_SUBMITTED', statusCode: 400 });
    });

    it('REJECTS scoring submission after judging deadline', async () => {
      const pastJudgingEnd = new Date(Date.now() - 3600000); // 1 hour ago

      (prisma.event.findUnique as any).mockResolvedValue({
        id: 'event-1',
        status: EventStatus.JUDGING_ACTIVE,
        judgingStartDate: new Date(Date.now() - 86400000),
        judgingDeadline: pastJudgingEnd,
        rubric: validRubric,
      });

      await expect(
        scoringService.submitEvaluation('event-1', 'judge-user-1', {
          projectId: 'proj-1',
          scores: [
            { criterionId: 'c1', score: 8 },
            { criterionId: 'c2', score: 8 },
          ],
        })
      ).rejects.toMatchObject({ code: 'DEADLINE_EXCEEDED', statusCode: 400 });
    });
  });

  // ─── 4. ROLE ISOLATION & VIEW ACCESS RESTRICTIONS ──────────────────────────

  describe('4. Role Isolation & Information Leakage Prevention', () => {
    it('PREVENTS participant from viewing other teams unsubmitted DRAFT projects', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-secret-draft',
        status: ProjectStatus.DRAFT,
        team: {
          members: [{ userId: 'user-team-a' }],
        },
      });

      // Participant from Team B attempts direct view
      await expect(
        submissionsService.getProjectById('proj-secret-draft', {
          id: 'user-team-b',
          role: Role.PARTICIPANT,
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
    });

    it('BLOCKS participants from viewing official rankings before results are published', async () => {
      (prisma.event.findFirst as any).mockResolvedValue({
        id: 'event-1',
        slug: 'dogfood-hack',
        name: 'Dogfood',
        status: EventStatus.JUDGING_ACTIVE, // Not published!
        resultsPublishedAt: null,
      });

      // Participant queries results
      await expect(
        resultsService.getResults('event-1', {
          id: 'participant-1',
          role: Role.PARTICIPANT,
        })
      ).rejects.toMatchObject({ code: 'RESULTS_NOT_PUBLISHED', statusCode: 403 });
    });

    it('BLOCKS a participant from accessing judge evaluations via getEvaluation', async () => {
      (prisma.judge.findFirst as any).mockResolvedValue(null); // Not a judge

      await expect(
        scoringService.getEvaluation('proj-1', 'participant-user', Role.PARTICIPANT)
      ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
    });

    it('BLOCKS a judge from viewing evaluations for projects they are not assigned to', async () => {
      (prisma.judge.findFirst as any).mockResolvedValue({
        id: 'judge-1',
        userId: 'judge-user-1',
      });

      // Not assigned
      (prisma.judgeAssignment.findUnique as any).mockResolvedValue(null);

      await expect(
        scoringService.getEvaluation('proj-unassigned', 'judge-user-1', Role.JUDGE)
      ).rejects.toMatchObject({ code: 'NOT_ASSIGNED', statusCode: 403 });
    });
  });

  // ─── 5. REGISTRATION DEADLINES & TEAM FORMATION ────────────────────────────

  describe('5. Team Formation & Registration Deadlines', () => {
    it('REJECTS team creation before registration starts', async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        id: 'event-1',
        status: EventStatus.DRAFT,
        registrationStartDate: new Date(Date.now() + 86400000), // tomorrow
        registrationEndDate: new Date(Date.now() + 172800000),
      });

      await expect(
        teamsService.createTeam('event-1', 'user-1', { name: 'Team Early' })
      ).rejects.toMatchObject({ code: 'REGISTRATION_NOT_STARTED', statusCode: 400 });
    });

    it('REJECTS team creation after registration ends', async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        id: 'event-1',
        status: EventStatus.SUBMISSION_OPEN,
        registrationStartDate: new Date(Date.now() - 172800000),
        registrationEndDate: new Date(Date.now() - 86400000), // ended yesterday
      });

      await expect(
        teamsService.createTeam('event-1', 'user-1', { name: 'Team Late' })
      ).rejects.toMatchObject({ code: 'REGISTRATION_CLOSED', statusCode: 400 });
    });
  });

  // ─── 6. AUDIT TRAIL VERIFICATION ──────────────────────────────────────────

  describe('6. Append-Only Scoring Audit Trail Verification', () => {
    it('creates an append-only AuditLog entry when evaluation is submitted', async () => {
      const auditLogMock = vi.fn().mockResolvedValue({ id: 'log-1' });

      (prisma.event.findUnique as any).mockResolvedValue({
        id: 'event-1',
        status: EventStatus.JUDGING_ACTIVE,
        judgingStartDate: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000),
        rubric: {
          criteria: [
            { id: 'c1', title: 'Tech', weight: 1.0, maxScore: 10 },
          ],
        },
      });

      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        eventId: 'event-1',
        status: ProjectStatus.SUBMITTED,
      });

      (prisma.judge.findUnique as any).mockResolvedValue({
        id: 'judge-1',
        eventId: 'event-1',
        userId: 'judge-user-1',
      });

      (prisma.judgeAssignment.findUnique as any).mockResolvedValue({
        id: 'assign-1',
        judgeId: 'judge-1',
        projectId: 'proj-1',
      });

      (prisma.teamMember.findFirst as any).mockResolvedValue(null);

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          evaluation: {
            findUnique: vi.fn().mockResolvedValue(null), // First time
            upsert: vi.fn().mockResolvedValue({ id: 'eval-1', weightedTotal: 90 }),
          },
          evaluationScore: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          judgeAssignment: {
            update: vi.fn().mockResolvedValue({ id: 'assign-1' }),
          },
          auditLog: {
            create: auditLogMock,
          },
        });
      });

      (prisma.evaluation.findUnique as any).mockResolvedValue({
        id: 'eval-1',
        scores: [{ criterionId: 'c1', score: 9 }],
      });

      await scoringService.submitEvaluation('event-1', 'judge-user-1', {
        projectId: 'proj-1',
        scores: [{ criterionId: 'c1', score: 9 }],
      });

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'EVALUATION_CREATED',
            entityType: 'Evaluation',
            userId: 'judge-user-1',
          }),
        })
      );
    });

    it('records SCORE_OVERRIDE action when privileged admin overrides a judges score', async () => {
      const auditLogMock = vi.fn().mockResolvedValue({ id: 'log-override' });

      (prisma.event.findUnique as any).mockResolvedValue({
        id: 'event-1',
        status: EventStatus.JUDGING_ACTIVE,
        judgingStartDate: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000),
        rubric: {
          criteria: [{ id: 'c1', title: 'Tech', weight: 1.0, maxScore: 10 }],
        },
      });

      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        eventId: 'event-1',
        status: ProjectStatus.SUBMITTED,
      });

      (prisma.judge.findUnique as any).mockResolvedValue({
        id: 'judge-1',
        eventId: 'event-1',
        userId: 'original-judge-user', // Original judge
      });

      (prisma.judgeAssignment.findUnique as any).mockResolvedValue({
        id: 'assign-1',
        judgeId: 'judge-1',
        projectId: 'proj-1',
      });

      (prisma.teamMember.findFirst as any).mockResolvedValue(null);

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          evaluation: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'eval-1',
              weightedTotal: 50,
              scores: [{ criterionId: 'c1', score: 5 }],
            }),
            upsert: vi.fn().mockResolvedValue({ id: 'eval-1', weightedTotal: 80 }),
          },
          evaluationScore: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          judgeAssignment: {
            update: vi.fn().mockResolvedValue({ id: 'assign-1' }),
          },
          auditLog: {
            create: auditLogMock,
          },
        });
      });

      (prisma.evaluation.findUnique as any).mockResolvedValue({
        id: 'eval-1',
        scores: [{ criterionId: 'c1', score: 8 }],
      });

      // Admin user-admin overrides original judge's evaluation
      await scoringService.submitEvaluation(
        'event-1',
        'admin-user-id',
        {
          projectId: 'proj-1',
          scores: [{ criterionId: 'c1', score: 8 }],
        },
        Role.ADMIN
      );

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'SCORE_OVERRIDE',
            entityType: 'Evaluation',
            userId: 'admin-user-id',
          }),
        })
      );
    });
  });

  // ─── 7. ADVERSARIAL PENETRATION & STRESS TESTS ────────────────────────────────

  describe('7. Adversarial Attacks & Race Conditions (Judge Breaking Attacks)', () => {
    it('REJECTS a judge attempting to evaluate another judges assigned project by directly modifying projectId', async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        id: 'event-1',
        status: EventStatus.JUDGING_ACTIVE,
        judgingStartDate: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000),
        rubric: {
          criteria: [{ id: 'c1', title: 'Tech', weight: 1.0, maxScore: 10 }],
        },
      });

      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-other-judge',
        eventId: 'event-1',
        status: ProjectStatus.SUBMITTED,
      });

      // Attacking judge is registered for event-1
      (prisma.judge.findUnique as any).mockResolvedValue({
        id: 'judge-attacker',
        eventId: 'event-1',
        userId: 'attacker-user-id',
      });

      // But is NOT assigned to 'proj-other-judge' (assigned to another judge)
      (prisma.judgeAssignment.findUnique as any).mockResolvedValue(null);

      await expect(
        scoringService.submitEvaluation(
          'event-1',
          'attacker-user-id',
          {
            projectId: 'proj-other-judge',
            scores: [{ criterionId: 'c1', score: 9 }],
          },
          Role.JUDGE
        )
      ).rejects.toMatchObject({ code: 'NOT_ASSIGNED', statusCode: 403 });
    });

    it('REJECTS a judge attempting to access another judges submitted evaluation', async () => {
      (prisma.judge.findFirst as any).mockResolvedValue({
        id: 'judge-attacker-id',
        userId: 'attacker-user-id',
      });

      // Project is not assigned to this judge
      (prisma.judgeAssignment.findUnique as any).mockResolvedValue(null);

      await expect(
        scoringService.getEvaluation('proj-other-judge', 'attacker-user-id', Role.JUDGE)
      ).rejects.toMatchObject({ code: 'NOT_ASSIGNED', statusCode: 403 });
    });

    it('REJECTS duplicate submissions from rapid succession calls (race condition prevention)', async () => {
      // Scenario A: Team already has a project draft created
      (prisma.teamMember.findFirst as any).mockResolvedValue({
        team: {
          eventId: 'event-1',
          project: { id: 'existing-proj-id' }, // Already exists!
          event: { status: EventStatus.SUBMISSION_OPEN },
        },
      });

      await expect(
        submissionsService.createProject('event-1', 'user-1', {
          title: 'Duplicate Project Request',
        })
      ).rejects.toMatchObject({ code: 'PROJECT_EXISTS', statusCode: 409 });

      // Scenario B: Project is already SUBMITTED and team tries to submit again
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-submitted',
        eventId: 'event-1',
        status: ProjectStatus.SUBMITTED, // Already submitted!
        event: {
          submissionStartDate: new Date(Date.now() - 86400000),
          submissionDeadline: new Date(Date.now() + 86400000),
          status: EventStatus.SUBMISSION_OPEN,
          settings: { minTeamSize: 1, maxTeamSize: 4 },
        },
        team: {
          members: [{ userId: 'user-1' }],
        },
        title: 'Project Title',
        problemStatement: 'Problem',
        solutionDescription: 'Solution',
      });

      await expect(
        submissionsService.submitProject('proj-submitted', 'user-1', Role.PARTICIPANT)
      ).rejects.toMatchObject({ code: 'PROJECT_ALREADY_SUBMITTED', statusCode: 400 });
    });

    it('REJECTS direct API attempts to edit or resubmit a project after the submission deadline has passed', async () => {
      const pastDeadline = new Date(Date.now() - 3600000); // 1 hour ago
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-past-deadline',
        eventId: 'event-1',
        status: ProjectStatus.DRAFT,
        event: {
          submissionStartDate: new Date(Date.now() - 86400000),
          submissionDeadline: pastDeadline,
          status: EventStatus.SUBMISSION_OPEN,
          settings: { minTeamSize: 1, maxTeamSize: 4 },
        },
        team: {
          members: [{ userId: 'user-1' }],
        },
        title: 'Project Title',
        problemStatement: 'Problem',
        solutionDescription: 'Solution',
      });

      // 1. Direct API updateProject attempt
      await expect(
        submissionsService.updateProject(
          'proj-past-deadline',
          'user-1',
          Role.PARTICIPANT,
          { title: 'Sneaky Late Update' }
        )
      ).rejects.toMatchObject({ code: 'DEADLINE_EXCEEDED', statusCode: 400 });

      // 2. Direct API submitProject attempt
      await expect(
        submissionsService.submitProject('proj-past-deadline', 'user-1', Role.PARTICIPANT)
      ).rejects.toMatchObject({ code: 'DEADLINE_EXCEEDED', statusCode: 400 });
    });

    it('REJECTS direct API attempts by a judge to score a team they have a declared conflict of interest with', async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        id: 'event-1',
        status: EventStatus.JUDGING_ACTIVE,
        judgingStartDate: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000),
        rubric: {
          criteria: [{ id: 'c1', title: 'Tech', weight: 1.0, maxScore: 10 }],
        },
      });

      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-my-team',
        eventId: 'event-1',
        status: ProjectStatus.SUBMITTED,
      });

      (prisma.judge.findUnique as any).mockResolvedValue({
        id: 'judge-conflict',
        eventId: 'event-1',
        userId: 'judge-author-user',
      });

      (prisma.judgeAssignment.findUnique as any).mockResolvedValue({
        id: 'assign-conflict',
        judgeId: 'judge-conflict',
        projectId: 'proj-my-team',
      });

      // Judge is a member of the project team (Conflict of Interest!)
      (prisma.teamMember.findFirst as any).mockResolvedValue({
        id: 'member-1',
        userId: 'judge-author-user',
        teamId: 'team-1',
      });

      await expect(
        scoringService.submitEvaluation(
          'event-1',
          'judge-author-user',
          {
            projectId: 'proj-my-team',
            scores: [{ criterionId: 'c1', score: 10 }],
          },
          Role.JUDGE
        )
      ).rejects.toMatchObject({ code: 'SELF_EVALUATION_FORBIDDEN', statusCode: 403 });
    });

    it('REJECTS pairwise comparison if judge attempts to evaluate their own project submission', async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        id: 'event-1',
        status: EventStatus.JUDGING_ACTIVE,
        judgingStartDate: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000),
      });

      (prisma.judge.findUnique as any).mockResolvedValue({
        id: 'judge-pairwise',
        eventId: 'event-1',
        userId: 'judge-author-user',
      });

      (prisma.project.findUnique as any).mockImplementation((args: any) => {
        if (args.where.id === 'proj-a') return Promise.resolve({ id: 'proj-a', eventId: 'event-1', status: 'SUBMITTED' });
        if (args.where.id === 'proj-b') return Promise.resolve({ id: 'proj-b', eventId: 'event-1', status: 'SUBMITTED' });
        return Promise.resolve(null);
      });

      // Judge is author of proj-a
      (prisma.project.findFirst as any).mockResolvedValue({
        id: 'proj-a',
        team: { members: [{ userId: 'judge-author-user' }] },
      });

      await expect(
        pairwiseService.recordComparison('event-1', 'judge-author-user', {
          projectAId: 'proj-a',
          projectBId: 'proj-b',
          winnerProjectId: 'proj-a',
        })
      ).rejects.toMatchObject({ code: 'SELF_COMPARISON_FORBIDDEN', statusCode: 403 });
    });
  });
});
