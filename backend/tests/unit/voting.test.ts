import { describe, it, expect } from 'vitest';
import { VotingEligibility } from '@prisma/client';
import {
  checkVoterEligibility,
  checkVoteAllowance,
  resolveVoteLimit,
  DEFAULT_VOTES_PER_USER,
} from '../../src/modules/voting/voting.rules.js';

describe('Community Voting Anti-Abuse & Integrity Unit Tests', () => {
  const projectMemberIds = ['user-alice', 'user-bob'];

  it('should detect and prevent self-voting when voter is a team member', () => {
    const err = checkVoterEligibility({
      eligibility: VotingEligibility.PUBLIC,
      userId: 'user-alice',
      projectMemberIds,
    });

    // Should trigger SELF_VOTE_PROHIBITED error
    expect(err?.code).toBe('SELF_VOTE_PROHIBITED');
    const canVote = err === null;
    expect(canVote).toBe(false);
  });

  it('should prevent non-team members from being flagged as self-voters', () => {
    const err = checkVoterEligibility({
      eligibility: VotingEligibility.PUBLIC,
      userId: 'user-charlie',
      projectMemberIds,
    });

    expect(err).toBeNull();
  });

  it('should reject duplicate vote for the exact same project by same user', () => {
    const existingVotes = ['proj-A', 'proj-B'];
    const err = checkVoteAllowance(existingVotes, 'proj-A', 3);
    expect(err?.code).toBe('DUPLICATE_VOTE');
    expect(checkVoteAllowance(existingVotes, 'proj-C', 3)).toBeNull();
  });

  it('should enforce maximum votes per user limit', () => {
    const maxAllowedVotes = 3;
    const userVotes = ['proj-1', 'proj-2', 'proj-3'];

    const err = checkVoteAllowance(userVotes, 'proj-4', maxAllowedVotes);
    expect(err?.code).toBe('MAX_VOTES_REACHED');
    // The limit is checked before duplicates
    expect(checkVoteAllowance(userVotes, 'proj-1', maxAllowedVotes)?.code).toBe('MAX_VOTES_REACHED');
    expect(resolveVoteLimit(0)).toBe(DEFAULT_VOTES_PER_USER);
    expect(resolveVoteLimit(null)).toBe(3);
    expect(resolveVoteLimit(5)).toBe(5);
  });

  it('should enforce voting eligibility rules (VERIFIED_USERS vs PARTICIPANTS_ONLY)', () => {
    // Anonymous, non-participant voter
    const anonymous = { userId: undefined, isEventParticipant: false, projectMemberIds };

    // When policy is VERIFIED_USERS
    const verified = checkVoterEligibility({ eligibility: VotingEligibility.VERIFIED_USERS, ...anonymous });
    expect(verified?.code).toBe('AUTH_REQUIRED');

    // When policy is PARTICIPANTS_ONLY
    const participantsOnly = checkVoterEligibility({ eligibility: VotingEligibility.PARTICIPANTS_ONLY, ...anonymous });
    expect(participantsOnly?.code).toBe('AUTH_REQUIRED');

    // Logged in but not on any team in the event
    const notParticipant = checkVoterEligibility({
      eligibility: VotingEligibility.PARTICIPANTS_ONLY,
      userId: 'user-dan',
      isEventParticipant: false,
      projectMemberIds,
    });
    expect(notParticipant?.code).toBe('NOT_A_PARTICIPANT');
    expect(notParticipant?.statusCode).toBe(403);

    // PUBLIC allows anonymous votes
    expect(checkVoterEligibility({ eligibility: VotingEligibility.PUBLIC, ...anonymous })).toBeNull();
  });
});
