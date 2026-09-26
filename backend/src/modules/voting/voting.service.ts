import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';
import { VotingEligibility, Role } from '@prisma/client';

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

    // Eligibility checks
    const eligibility = event.settings.votingEligibility;
    if (eligibility === VotingEligibility.VERIFIED_USERS && !userId) {
      throw new AppError('You must be registered and logged in to vote.', 401, 'AUTH_REQUIRED');
    }

    if (eligibility === VotingEligibility.PARTICIPANTS_ONLY) {
      if (!userId) {
        throw new AppError('Only registered participants can vote.', 401, 'AUTH_REQUIRED');
      }
      const isParticipant = await prisma.teamMember.findFirst({
        where: { userId, team: { eventId } },
      });
      if (!isParticipant) {
        throw new AppError('You must be a participant in this event to vote.', 403, 'NOT_A_PARTICIPANT');
      }
    }

    // Anti-Abuse 1: Prevent author from voting for their own project
    if (userId) {
      const isAuthor = project.team.members.some((m) => m.userId === userId);
      if (isAuthor) {
        throw new AppError('You cannot vote for your own project submission.', 400, 'SELF_VOTE_PROHIBITED');
      }
    }

    // Anti-Abuse 2: Check max votes per user / IP
    const maxVotes = event.settings.votesPerUser || 3;
    const existingVotesCount = await prisma.vote.count({
      where: {
        eventId,
        ...(userId ? { userId } : { ipAddress }),
      },
    });

    if (existingVotesCount >= maxVotes) {
      throw new AppError(`You have reached the maximum allowed limit of ${maxVotes} votes for this event.`, 400, 'MAX_VOTES_REACHED');
    }

    // Anti-Abuse 3: Duplicate vote prevention
    const existingVoteForProject = await prisma.vote.findFirst({
      where: {
        eventId,
        projectId,
        ...(userId ? { userId } : { ipAddress }),
      },
    });

    if (existingVoteForProject) {
      throw new AppError('You have already cast a vote for this project.', 400, 'DUPLICATE_VOTE');
    }

    const vote = await prisma.vote.create({
      data: {
        eventId,
        projectId,
        userId: userId || null,
        ipAddress,
        userAgent: userAgent || null,
      },
    });

    return vote;
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
