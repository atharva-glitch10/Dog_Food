import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';
import { ProjectStatus, Role, EventStatus } from '@prisma/client';

export class SubmissionsService {
  async getProjectById(projectId: string, user?: { id: string; role: Role }) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        event: {
          select: { id: true, name: true, slug: true, status: true, submissionDeadline: true },
        },
        track: true,
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, bio: true, avatarUrl: true },
                },
              },
            },
          },
        },
        _count: {
          select: { votes: true },
        },
      },
    });

    if (!project) {
      throw new AppError('Project submission not found.', 404, 'PROJECT_NOT_FOUND');
    }

    // Role isolation check: if DRAFT, only team members or organizers/admins can view
    if (project.status === ProjectStatus.DRAFT) {
      const isMember = user && project.team.members.some((m) => m.userId === user.id);
      const isPrivileged = user && (user.role === Role.ORGANIZER || user.role === Role.ADMIN);

      if (!isMember && !isPrivileged) {
        throw new AppError('This project is currently an unsubmitted draft and cannot be viewed.', 403, 'FORBIDDEN');
      }
    }

    return project;
  }

  async getSubmissionsByEvent(eventId: string, user?: { id: string; role: Role }) {
    const isPrivileged = user && (user.role === Role.ORGANIZER || user.role === Role.ADMIN);

    return prisma.project.findMany({
      where: {
        eventId,
        ...(!isPrivileged ? { status: { in: [ProjectStatus.SUBMITTED, ProjectStatus.FINALIZED] } } : {}),
      },
      include: {
        track: true,
        team: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
          },
        },
        _count: {
          select: {
            judgeAssignments: true,
            evaluations: true,
            votes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProject(eventId: string, userId: string, data: any) {
    // 1. Find user's team for this event
    const membership = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { eventId },
      },
      include: {
        team: {
          include: {
            event: true,
            project: true,
          },
        },
      },
    });

    if (!membership) {
      throw new AppError('You must be a member of a team in this event to create a project submission.', 400, 'NO_TEAM');
    }

    const { team } = membership;

    if (team.project) {
      throw new AppError('Your team already has an existing project submission. Please edit the existing draft.', 409, 'PROJECT_EXISTS');
    }

    // Enforce active event status for participants
    if (team.event.status === EventStatus.ARCHIVED || team.event.status === EventStatus.DRAFT) {
      throw new AppError(`Submissions are not accepted while event is in ${team.event.status} status.`, 400, 'EVENT_NOT_ACTIVE');
    }

    // Enforce submission window
    const now = new Date();
    if (now < team.event.submissionStartDate) {
      throw new AppError('Project submission period has not started yet for this event.', 400, 'SUBMISSION_NOT_STARTED');
    }
    if (now > team.event.submissionDeadline) {
      throw new AppError('Project submission deadline has passed for this event.', 400, 'DEADLINE_EXCEEDED');
    }

    // Validate track eligibility if provided
    if (data.trackId) {
      const track = await prisma.track.findUnique({ where: { id: data.trackId } });
      if (!track || track.eventId !== eventId) {
        throw new AppError('Selected track is not valid for this event.', 400, 'INVALID_TRACK');
      }
    }

    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          eventId,
          teamId: team.id,
          title: data.title,
          tagline: data.tagline || null,
          problemStatement: data.problemStatement,
          solutionDescription: data.solutionDescription,
          trackId: data.trackId || null,
          technologies: data.technologies || [],
          repoUrl: data.repoUrl || null,
          demoUrl: data.demoUrl || null,
          videoUrl: data.videoUrl || null,
          thumbnailUrl: data.thumbnailUrl || null,
          customFields: data.customFields || {},
          status: ProjectStatus.DRAFT,
        },
        include: {
          track: true,
          team: {
            include: {
              members: { include: { user: true } },
            },
          },
        },
      });

      await tx.submissionHistory.create({
        data: {
          projectId: newProject.id,
          changedByUserId: userId,
          status: ProjectStatus.DRAFT,
          snapshot: newProject as any,
        },
      });

      return newProject;
    });

    return project;
  }

  async updateProject(projectId: string, userId: string, userRole: Role, data: any) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        event: true,
        team: { include: { members: true } },
      },
    });

    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    const isMember = project.team.members.some((m) => m.userId === userId);
    const isPrivileged = userRole === Role.ORGANIZER || userRole === Role.ADMIN;

    if (!isMember && !isPrivileged) {
      throw new AppError('You do not have permission to edit this project.', 403, 'FORBIDDEN');
    }

    if (project.event.status === EventStatus.ARCHIVED) {
      throw new AppError('Event is archived. Submissions can no longer be modified.', 400, 'EVENT_ARCHIVED');
    }

    // Enforce deadline and window for participants
    const now = new Date();
    if (!isPrivileged && now < project.event.submissionStartDate) {
      throw new AppError('Submission window has not opened yet.', 400, 'SUBMISSION_NOT_STARTED');
    }
    if (!isPrivileged && now > project.event.submissionDeadline) {
      throw new AppError('Submission deadline has passed. Projects can no longer be edited.', 400, 'DEADLINE_EXCEEDED');
    }

    if (project.status === ProjectStatus.FINALIZED && !isPrivileged) {
      throw new AppError('This project has been finalized and locked.', 400, 'PROJECT_FINALIZED');
    }

    // Validate track eligibility if changed
    if (data.trackId) {
      const track = await prisma.track.findUnique({ where: { id: data.trackId } });
      if (!track || track.eventId !== project.eventId) {
        throw new AppError('Selected track is not valid for this event.', 400, 'INVALID_TRACK');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.project.update({
        where: { id: projectId },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.tagline !== undefined && { tagline: data.tagline }),
          ...(data.problemStatement && { problemStatement: data.problemStatement }),
          ...(data.solutionDescription && { solutionDescription: data.solutionDescription }),
          ...(data.trackId !== undefined && { trackId: data.trackId || null }),
          ...(data.technologies && { technologies: data.technologies }),
          ...(data.repoUrl !== undefined && { repoUrl: data.repoUrl || null }),
          ...(data.demoUrl !== undefined && { demoUrl: data.demoUrl || null }),
          ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl || null }),
          ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl || null }),
          ...(data.customFields && { customFields: data.customFields }),
          ...(data.status && isPrivileged && { status: data.status }),
        },
        include: {
          track: true,
          team: {
            include: {
              members: { include: { user: true } },
            },
          },
        },
      });

      await tx.submissionHistory.create({
        data: {
          projectId: p.id,
          changedByUserId: userId,
          status: p.status,
          snapshot: p as any,
        },
      });

      return p;
    });

    return updated;
  }

  async submitProject(projectId: string, userId: string, userRole: Role) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        event: { include: { settings: true } },
        team: { include: { members: true } },
      },
    });

    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    const isMember = project.team.members.some((m) => m.userId === userId);
    const isPrivileged = userRole === Role.ORGANIZER || userRole === Role.ADMIN;

    if (!isMember && !isPrivileged) {
      throw new AppError('You do not have permission to submit this project.', 403, 'FORBIDDEN');
    }

    if (project.event.status === EventStatus.ARCHIVED) {
      throw new AppError('Event is archived. Projects cannot be submitted.', 400, 'EVENT_ARCHIVED');
    }

    const now = new Date();
    if (!isPrivileged && now < project.event.submissionStartDate) {
      throw new AppError('Project submission period has not started yet.', 400, 'SUBMISSION_NOT_STARTED');
    }
    if (!isPrivileged && now > project.event.submissionDeadline) {
      throw new AppError('Submission deadline has passed. Projects cannot be submitted.', 400, 'DEADLINE_EXCEEDED');
    }

    if (project.status === ProjectStatus.FINALIZED && !isPrivileged) {
      throw new AppError('This project has already been finalized and locked.', 400, 'PROJECT_FINALIZED');
    }
    if (project.status === ProjectStatus.SUBMITTED && !isPrivileged) {
      throw new AppError('This project has already been submitted.', 400, 'PROJECT_ALREADY_SUBMITTED');
    }

    // Team Size Eligibility Check against Event Settings
    const minTeamSize = project.event.settings?.minTeamSize ?? 1;
    const maxTeamSize = project.event.settings?.maxTeamSize ?? 4;
    if (project.team.members.length < minTeamSize) {
      throw new AppError(
        `Team does not meet minimum team size of ${minTeamSize} required for submission. Currently has ${project.team.members.length} member(s).`,
        400,
        'TEAM_SIZE_TOO_SMALL'
      );
    }
    if (project.team.members.length > maxTeamSize) {
      throw new AppError(
        `Team exceeds maximum team size of ${maxTeamSize} permitted. Currently has ${project.team.members.length} members.`,
        400,
        'TEAM_SIZE_TOO_LARGE'
      );
    }

    // Validate required fields
    if (!project.title?.trim() || !project.problemStatement?.trim() || !project.solutionDescription?.trim()) {
      throw new AppError('Project is missing required fields (title, problem statement, or solution).', 400, 'INCOMPLETE_SUBMISSION');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.project.update({
        where: { id: projectId },
        data: {
          status: ProjectStatus.SUBMITTED,
          submittedAt: new Date(),
        },
        include: { track: true, team: true },
      });

      await tx.submissionHistory.create({
        data: {
          projectId: p.id,
          changedByUserId: userId,
          status: ProjectStatus.SUBMITTED,
          snapshot: p as any,
        },
      });

      return p;
    });

    return updated;
  }

  async finalizeProject(projectId: string, userId: string, userRole: Role) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        event: true,
        team: { include: { members: true } },
      },
    });

    if (!project) throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');

    const isLeader = project.team.members.some((m) => m.userId === userId && m.role === 'LEADER');
    const isPrivileged = userRole === Role.ORGANIZER || userRole === Role.ADMIN;

    if (!isLeader && !isPrivileged) {
      throw new AppError('Only the team leader or an organizer can finalize and lock the project.', 403, 'FORBIDDEN');
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.FINALIZED },
    });

    return updated;
  }
}

export const submissionsService = new SubmissionsService();
