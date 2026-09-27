/**
 * Pure community-voting rules (no Prisma / I/O), used by VotingService.
 * Each check returns the AppError to throw, or null when the vote may proceed.
 */
import { VotingEligibility } from '@prisma/client';
import { AppError } from '../../utils/response.js';

export const DEFAULT_VOTES_PER_USER = 3;

export interface VoterContext {
  eligibility: VotingEligibility;
  /** Authenticated user id, if any. */
  userId?: string;
  /** Whether the user belongs to any team in the event (only consulted for PARTICIPANTS_ONLY). */
  isEventParticipant?: boolean;
  /** User ids of the target project's team members. */
  projectMemberIds: string[];
}

/**
 * Eligibility + self-vote rules, in order:
 * VERIFIED_USERS requires login; PARTICIPANTS_ONLY requires login and team
 * membership in the event; PUBLIC allows anonymous votes. Logged-in voters
 * may never vote for a project their own team submitted.
 */
export function checkVoterEligibility(ctx: VoterContext): AppError | null {
  if (ctx.eligibility === VotingEligibility.VERIFIED_USERS && !ctx.userId) {
    return new AppError('You must be registered and logged in to vote.', 401, 'AUTH_REQUIRED');
  }

  if (ctx.eligibility === VotingEligibility.PARTICIPANTS_ONLY) {
    if (!ctx.userId) {
      return new AppError('Only registered participants can vote.', 401, 'AUTH_REQUIRED');
    }
    if (!ctx.isEventParticipant) {
      return new AppError('You must be a participant in this event to vote.', 403, 'NOT_A_PARTICIPANT');
    }
  }

  if (ctx.userId && ctx.projectMemberIds.includes(ctx.userId)) {
    return new AppError('You cannot vote for your own project submission.', 400, 'SELF_VOTE_PROHIBITED');
  }

  return null;
}

/** The event's per-voter vote budget (falls back to 3 when unset or 0). */
export function resolveVoteLimit(votesPerUser: number | null | undefined): number {
  return votesPerUser || DEFAULT_VOTES_PER_USER;
}

/**
 * Per-voter budget and duplicate rules, given the project ids this voter
 * (user, or IP for anonymous voters) has already voted for in the event.
 * The limit is checked before duplicates.
 */
export function checkVoteAllowance(existingProjectIds: string[], projectId: string, maxVotes: number): AppError | null {
  if (existingProjectIds.length >= maxVotes) {
    return new AppError(
      `You have reached the maximum allowed limit of ${maxVotes} votes for this event.`,
      400,
      'MAX_VOTES_REACHED'
    );
  }
  if (existingProjectIds.includes(projectId)) {
    return new AppError('You have already cast a vote for this project.', 400, 'DUPLICATE_VOTE');
  }
  return null;
}
