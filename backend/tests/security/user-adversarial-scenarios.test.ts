import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubmissionsService } from '../../src/modules/submissions/submissions.service.js';
import { ScoringService } from '../../src/modules/scoring/scoring.service.js';
import { Role, ProjectStatus, EventStatus } from '@prisma/client';

// Mock in-memory DB state for concurrency and verification
const mockDb = {
  projects: [] as any[],
  evaluations: [] as any[],
};

vi.mock('../../src/utils/prisma.js', () => {
  return {
    prisma: {
      event: {
        findUnique: vi.fn(),
      },
      team: {
        findUnique: vi.fn(),
      },
      teamMember: {
        findFirst: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      judge: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      judgeAssignment: {
        findUnique: vi.fn(),
      },
      evaluation: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      evaluationScore: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) =>
        callback({
          project: {
            create: vi.fn().mockImplementation((args) => {
              mockDb.projects.push(args.data);
              return Promise.resolve({ id: `proj-${mockDb.projects.length}`, ...args.data });
            }),
            update: vi.fn().mockImplementation((args) => {
              return Promise.resolve({ id: args.where.id, ...args.data });
            }),
          },
          evaluation: {
            findUnique: vi.fn().mockResolvedValue(null),
            upsert: vi.fn().mockImplementation((args) => {
              mockDb.evaluations.push(args.create);
              return Promise.resolve({ id: 'eval-1', ...args.create });
            }),
          },
          evaluationScore: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
          judgeAssignment: {
            update: vi.fn().mockResolvedValue({ id: 'assign-1', isCompleted: true }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'log-1' }),
          },
        })
      ),
    },
  };
});

import { prisma } from '../../src/utils/prisma.js';

describe('Targeted Adversarial Security Scenarios', () => {
  const submissionsService = new SubmissionsService();
  const scoringService = new ScoringService();

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.projects = [];
    mockDb.evaluations = [];
  });

  // SCENARIO 1: Judge A attempts ID substitution to fetch or score Judge B's assigned project
  describe("Scenario 1: Judge A tries to fetch/score Judge B's assigned project by ID substitution", () => {
    it("REJECTS Judge A attempting to GET Judge B's assigned project evaluation", async () => {
      // Judge A is authenticated
      // getEvaluation resolves the judge within the project's event
      (prisma.project.findUnique as any).mockResolvedValue({ eventId: 'event-1' });
      (prisma.judge.findUnique as any).mockResolvedValue({
        id: 'judge-A-id',
        userId: 'user-judge-A',
        eventId: 'event-1',
      });

      // Project is assigned to Judge B, NOT Judge A
      (prisma.judgeAssignment.findUnique as any).mockResolvedValue(null);

      // Raw API simulation: GET /api/events/event-1/evaluations/proj-assigned-to-B
      await expect(
        scoringService.getEvaluation('proj-assigned-to-B', 'user-judge-A', Role.JUDGE)
      ).rejects.toMatchObject({
        code: 'NOT_ASSIGNED',
        statusCode: 403,
      });
    });

    it("REJECTS Judge A attempting to POST score for Judge B's assigned project via ID substitution", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        id: 'event-1',
        status: EventStatus.JUDGING_ACTIVE,
        judgingStartDate: new Date(Date.now() - 86400000),
        judgingDeadline: new Date(Date.now() + 86400000),
        rubric: {
          criteria: [
            { id: 'c1', title: 'Code', weight: 0.5, maxScore: 10 },
            { id: 'c2', title: 'Impact', weight: 0.5, maxScore: 10 },
          ],
        },
      });

      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-assigned-to-B',
        eventId: 'event-1',
        status: ProjectStatus.SUBMITTED,
      });

      (prisma.judge.findUnique as any).mockResolvedValue({
        id: 'judge-A-id',
        userId: 'user-judge-A',
        eventId: 'event-1',
      });

      // Query judgeAssignment for [judge-A-id, proj-assigned-to-B] returns null
      (prisma.judgeAssignment.findUnique as any).mockResolvedValue(null);

      // Raw API simulation: POST /api/events/event-1/evaluations with projectId = 'proj-assigned-to-B'
      await expect(
        scoringService.submitEvaluation(
          'event-1',
          'user-judge-A',
          {
            projectId: 'proj-assigned-to-B',
            scores: [
              { criterionId: 'c1', score: 9 },
              { criterionId: 'c2', score: 8 },
            ],
          },
          Role.JUDGE
        )
      ).rejects.toMatchObject({
        code: 'NOT_ASSIGNED',
        statusCode: 403,
      });

      // Assert DB was NOT mutated
      expect(mockDb.evaluations.length).toBe(0);
    });
  });

  // SCENARIO 2: Fire two near-simultaneous submission requests for the same team and check DB for duplicates
  describe('Scenario 2: Near-simultaneous submission requests for the same team', () => {
    it('PREVENTS duplicate project creation and maintains exactly 1 project in DB under concurrent requests', async () => {
      let existingProject: any = null;

      // Mock atomic check-and-create behavior with mutex/lock simulation in DB
      (prisma.teamMember.findFirst as any).mockImplementation(async () => {
        return {
          userId: 'user-team-lead',
          team: {
            id: 'team-1',
            eventId: 'event-1',
            project: existingProject, // Will reflect project once first call creates it
            event: {
              id: 'event-1',
              status: EventStatus.SUBMISSION_OPEN,
              submissionStartDate: new Date(Date.now() - 86400000),
              submissionDeadline: new Date(Date.now() + 86400000),
            },
          },
        };
      });

      // When the first transaction commits, existingProject is set
      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        if (existingProject) {
          throw { code: 'P2002', message: 'Unique constraint failed on teamId' };
        }
        const result = await callback({
          project: {
            create: vi.fn().mockImplementation((args) => {
              existingProject = { id: 'proj-first', ...args.data };
              mockDb.projects.push(existingProject);
              return Promise.resolve(existingProject);
            }),
          },
          submissionHistory: {
            create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
          },
        });
        return result;
      });

      // Fire two simultaneous requests
      const request1 = submissionsService.createProject('event-1', 'user-team-lead', {
        title: 'Project Concurrent 1',
        problemStatement: 'Problem 1',
        solutionDescription: 'Solution 1',
      });

      const request2 = submissionsService.createProject('event-1', 'user-team-lead', {
        title: 'Project Concurrent 2',
        problemStatement: 'Problem 2',
        solutionDescription: 'Solution 2',
      });

      const results = await Promise.allSettled([request1, request2]);

      // Exactly one must succeed
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Check DB for duplicates: MUST BE STRICTLY 1
      expect(mockDb.projects.length).toBe(1);
      expect(mockDb.projects[0].title).toBe('Project Concurrent 1');
    });
  });

  // SCENARIO 3: Send a PATCH/PUT to update a submission via direct API call using a timestamp after the deadline
  describe('Scenario 3: Direct API PATCH/PUT update after the submission deadline has passed', () => {
    it('REJECTS direct PATCH/PUT updateProject call when current time is past submissionDeadline', async () => {
      const pastDeadline = new Date(Date.now() - 7200000); // 2 hours ago

      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-past-deadline',
        eventId: 'event-1',
        status: ProjectStatus.DRAFT,
        title: 'Original Title',
        event: {
          id: 'event-1',
          status: EventStatus.SUBMISSION_OPEN,
          submissionStartDate: new Date(Date.now() - 86400000),
          submissionDeadline: pastDeadline, // DEADLINE PASSED
        },
        team: {
          members: [{ userId: 'user-team-member' }],
        },
      });

      // Direct API call simulation: PATCH /api/projects/proj-past-deadline
      await expect(
        submissionsService.updateProject(
          'proj-past-deadline',
          'user-team-member',
          Role.PARTICIPANT,
          {
            title: 'Unauthorized Late Edit After Deadline',
            solutionDescription: 'Sneaky modification',
          }
        )
      ).rejects.toMatchObject({
        code: 'DEADLINE_EXCEEDED',
        statusCode: 400,
      });

      // Verify prisma.project.update was NOT invoked
      expect(prisma.project.update).not.toHaveBeenCalled();
    });
  });
});
