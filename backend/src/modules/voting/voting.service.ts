import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';
import { checkVoterEligibility, checkVoteAllowance, resolveVoteLimit } from './voting.rules.js';
import { Prisma, VotingEligibility } from '@prisma/client';

export class VotingService {
  async castVote(
    eventId: string,
    projectId: string,
    userId: string | undefined,
    ipAddress: string,
    userAgent?: string
  ) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { settings: true },
    });

    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    if (!event.settings?.allowCommunityVoting) {
      throw new AppError('Community voting is disabled for this event.', 400, 'VOTING_DISABLED');
    }

    // Check project exists and is in submitted/finalized state
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { team: { include: { members: true } } },
    });

    if (!project || project.eventId !== eventId || project.status === 'DRAFT') {
      throw new AppError('Project not found or not eligible for voting.', 404, 'PROJECT_NOT_ELIGIBLE');
    }

    // Eligibility + self-vote rules (pure)
    const eligibility = event.settings.votingEligibility;
    const needsParticipantCheck = eligibility === VotingEligibility.PARTICIPANTS_ONLY && !!userId;
    const isEventParticipant = needsParticipantCheck
      ? !!(await prisma.teamMember.findFirst({ where: { userId, team: { eventId } } }))
      : undefined;
    const eligibilityError = checkVoterEligibility({
      eligibility,
      userId,
      isEventParticipant,
      projectMemberIds: project.team.members.map((m) => m.userId),
    });
    if (eligibilityError) throw eligibilityError;

    // Anti-Abuse 2 + 3: per-voter limit and duplicate prevention.
    // The count and insert run in one transaction under a per-voter advisory
    // lock, so concurrent requests from the same voter cannot both pass the
    // limit check. Duplicates are also blocked by unique indexes (userId-based
    // and, for anonymous votes, a partial index on ipAddress); a race that
    // reaches the insert surfaces as P2002 and is mapped to DUPLICATE_VOTE.
    const maxVotes = resolveVoteLimit(event.settings.votesPerUser);
    // Anonymous voters are identified by IP across all votes from that address.
    const voterFilter = userId ? { userId } : { ipAddress };
    const lockKey = `vote:${eventId}:${userId ? `user:${userId}` : `ip:${ipAddress}`}`;

    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

        const existingVotes = await tx.vote.findMany({
          where: { eventId, ...voterFilter },
          select: { projectId: true },
        });
        const allowanceError = checkVoteAllowance(
          existingVotes.map((v) => v.projectId),
          projectId,
          maxVotes
        );
        if (allowanceError) throw allowanceError;

        return tx.vote.create({
          data: {
            eventId,
            projectId,
            userId: userId || null,
            ipAddress,
            userAgent: userAgent || null,
          },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError('You have already cast a vote for this project.', 400, 'DUPLICATE_VOTE');
      }
      throw err;
    }
  }

  async getMyVotes(eventId: string, userId?: string, ipAddress?: string) {
    return prisma.vote.findMany({
      where: {
        eventId,
        ...(userId ? { userId } : { ipAddress }),
      },
      include: {
        project: {
          select: { id: true, title: true, tagline: true, thumbnailUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVotingStats(eventId: string) {
    const totalVotes = await prisma.vote.count({ where: { eventId } });
    const votesByProject = await prisma.vote.groupBy({
      by: ['projectId'],
      where: { eventId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const projectDetails = await prisma.project.findMany({
      where: { id: { in: votesByProject.map((v) => v.projectId) } },
      select: { id: true, title: true },
    });
    const projMap = new Map(projectDetails.map((p) => [p.id, p.title]));

    return {
      totalVotes,
      tally: votesByProject.map((v) => ({
        projectId: v.projectId,
        title: projMap.get(v.projectId) || 'Unknown',
        votes: v._count.id,
      })),
    };
  }
}

export const votingService = new VotingService();
