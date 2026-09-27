import { prisma } from '../../utils/prisma.js';
import { generateRandomToken } from '../../utils/crypto.js';
import { AppError } from '../../utils/response.js';
import { TeamRole, InviteStatus, EventStatus } from '@prisma/client';

export class TeamsService {
  async getTeamsByEvent(eventId: string) {
    return prisma.team.findMany({
      where: { eventId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        project: {
          select: { id: true, title: true, status: true },
        },
        _count: { select: { members: true } },
      },
    });
  }

  async getTeamById(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: {
          select: { id: true, name: true, slug: true, status: true, settings: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, bio: true, avatarUrl: true },
            },
          },
        },
        invitations: {
          where: { status: InviteStatus.PENDING },
        },
        project: {
          include: {
            track: true,
          },
        },
      },
    });

    if (!team) {
      throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
    }

    return team;
  }

  async getMyTeamForEvent(eventId: string, userId: string) {
    const membership = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { eventId },
      },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, bio: true, avatarUrl: true },
                },
              },
            },
            invitations: {
              where: { status: InviteStatus.PENDING },
            },
            project: {
              include: {
                track: true,
              },
            },
          },
        },
      },
    });

    return membership ? membership.team : null;
  }

  async createTeam(eventId: string, userId: string, data: { name: string; description?: string }) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { settings: true },
    });

    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    if (event.status === EventStatus.ARCHIVED) {
      throw new AppError('Event is archived. New teams cannot be created.', 400, 'EVENT_ARCHIVED');
    }

    // Enforce registration window
    const now = new Date();
    if (now < event.registrationStartDate) {
      throw new AppError('Team registration has not opened yet for this event.', 400, 'REGISTRATION_NOT_STARTED');
    }
    if (now > event.registrationEndDate) {
      throw new AppError('Team registration deadline has passed for this event.', 400, 'REGISTRATION_CLOSED');
    }

    // Check if user is already in a team for this event
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { eventId },
      },
    });

    if (existingMembership) {
      throw new AppError('You are already a member of a team in this event.', 409, 'ALREADY_IN_TEAM');
    }

    // Check unique team name within event
    const existingTeam = await prisma.team.findFirst({
      where: {
        eventId,
        name: { equals: data.name, mode: 'insensitive' },
      },
    });

    if (existingTeam) {
      throw new AppError(`A team named '${data.name}' already exists in this event.`, 409, 'TEAM_NAME_EXISTS');
    }

    const inviteCode = generateRandomToken(6).toUpperCase();

    // Create team and assign user as LEADER in a single atomic transaction
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          eventId,
          name: data.name,
          description: data.description || null,
          inviteCode,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId,
          role: TeamRole.LEADER,
        },
      });

      return newTeam;
    });

    return this.getTeamById(team.id);
  }

  async inviteMember(teamId: string, leaderUserId: string, email: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: { include: { settings: true } },
        members: true,
      },
    });

    if (!team) throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');

    if (team.event.status === EventStatus.ARCHIVED) {
      throw new AppError('Event is archived. Invitations cannot be issued.', 400, 'EVENT_ARCHIVED');
    }

    // Verify registration deadline
    const now = new Date();
    if (now > team.event.registrationEndDate) {
      throw new AppError('Team invitations cannot be issued after registration has closed.', 400, 'REGISTRATION_CLOSED');
    }

    // Verify leader authorization
    const leader = team.members.find((m) => m.userId === leaderUserId);
    if (!leader || leader.role !== TeamRole.LEADER) {
      throw new AppError('Only the team leader can issue invitations.', 403, 'FORBIDDEN');
    }

    const maxTeamSize = team.event.settings?.maxTeamSize || 4;
    if (team.members.length >= maxTeamSize) {
      throw new AppError(`Team has reached maximum capacity of ${maxTeamSize} members.`, 400, 'TEAM_FULL');
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        user: { email: email.toLowerCase() },
      },
    });

    if (existingMember) {
      throw new AppError('User is already a member of this team.', 400, 'ALREADY_MEMBER');
    }

    const token = generateRandomToken(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        teamId,
        invitedEmail: email.toLowerCase(),
        token,
        expiresAt,
      },
    });

    return {
      invitation,
      inviteUrl: `/join-team?token=${token}`,
      inviteCode: team.inviteCode,
    };
  }

  async joinTeam(userId: string, options: { inviteCode?: string; token?: string }) {
    let teamId: string | undefined;

    if (options.token) {
      const invitation = await prisma.invitation.findUnique({
        where: { token: options.token },
        include: { team: { include: { event: { include: { settings: true } }, members: true } } },
      });

      if (!invitation || invitation.status !== InviteStatus.PENDING) {
        throw new AppError('Invitation is invalid or has already been used.', 400, 'INVALID_INVITATION');
      }

      if (new Date() > invitation.expiresAt) {
        await prisma.invitation.update({ where: { id: invitation.id }, data: { status: InviteStatus.EXPIRED } });
        throw new AppError('Invitation has expired.', 400, 'INVITATION_EXPIRED');
      }

      teamId = invitation.teamId;

      // Mark invitation accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InviteStatus.ACCEPTED },
      });
    } else if (options.inviteCode) {
      const team = await prisma.team.findUnique({
        where: { inviteCode: options.inviteCode.toUpperCase() },
        include: { event: { include: { settings: true } }, members: true },
      });

      if (!team) {
        throw new AppError('Invalid team invite code.', 404, 'INVALID_INVITE_CODE');
      }

      teamId = team.id;
    }

    if (!teamId) {
      throw new AppError('No valid invitation provided.', 400, 'MISSING_INVITATION');
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { event: { include: { settings: true } }, members: true },
    });

    if (!team) throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');

    if (team.event.status === EventStatus.ARCHIVED) {
      throw new AppError('Event is archived. Cannot join teams.', 400, 'EVENT_ARCHIVED');
    }

    // Enforce registration window for joining teams
    const joinNow = new Date();
    if (joinNow < team.event.registrationStartDate) {
      throw new AppError('Team registration has not opened yet for this event.', 400, 'REGISTRATION_NOT_STARTED');
    }
    if (joinNow > team.event.registrationEndDate) {
      throw new AppError('Team registration has closed for this event.', 400, 'REGISTRATION_CLOSED');
    }

    // Check if user is already in a team for this event
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { eventId: team.eventId },
      },
    });

    if (existingMembership) {
      throw new AppError('You are already a member of a team in this event.', 409, 'ALREADY_IN_TEAM');
    }

    const maxTeamSize = team.event.settings?.maxTeamSize || 4;
    if (team.members.length >= maxTeamSize) {
      throw new AppError(`Team has reached its maximum size of ${maxTeamSize}.`, 400, 'TEAM_FULL');
    }

    await prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role: TeamRole.MEMBER,
      },
    });

    return this.getTeamById(teamId);
  }

  async removeMember(teamId: string, targetUserId: string, requestingUserId: string, requestingRole: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');

    const isSelf = targetUserId === requestingUserId;
    const isLeader = team.members.some((m) => m.userId === requestingUserId && m.role === TeamRole.LEADER);
    const isOrganizerOrAdmin = requestingRole === 'ORGANIZER' || requestingRole === 'ADMIN';

    if (!isSelf && !isLeader && !isOrganizerOrAdmin) {
      throw new AppError('Not authorized to remove this team member.', 403, 'FORBIDDEN');
    }

    const memberToRemove = team.members.find((m) => m.userId === targetUserId);
    if (!memberToRemove) {
      throw new AppError('Member not found in this team.', 404, 'MEMBER_NOT_FOUND');
    }

    // If leader is leaving and others remain, assign new leader
    if (memberToRemove.role === TeamRole.LEADER && team.members.length > 1) {
      const nextLeader = team.members.find((m) => m.userId !== targetUserId);
      if (nextLeader) {
        await prisma.teamMember.update({
          where: { id: nextLeader.id },
          data: { role: TeamRole.LEADER },
        });
      }
    }

    await prisma.teamMember.delete({
      where: { id: memberToRemove.id },
    });

    // If last member left, clean up team
    if (team.members.length <= 1) {
      await prisma.team.delete({ where: { id: teamId } });
      return { message: 'Team disbanded as last member departed.' };
    }

    return { message: 'Member removed successfully.' };
  }
}

export const teamsService = new TeamsService();
