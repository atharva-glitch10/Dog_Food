import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/response.js';

export class CsvExportService {
  private escapeCsvCell(cell: any): string {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }

  private toCsvString(headers: string[], rows: (string | number | null | undefined)[][]): string {
    const headerLine = headers.map((h) => this.escapeCsvCell(h)).join(',');
    const rowLines = rows.map((row) => row.map((cell) => this.escapeCsvCell(cell)).join(','));
    return [headerLine, ...rowLines].join('\r\n');
  }

  async exportParticipants(eventId: string): Promise<string> {
    const members = await prisma.teamMember.findMany({
      where: { team: { eventId } },
      include: {
        user: true,
        team: true,
      },
    });

    const headers = ['User ID', 'Name', 'Email', 'Role', 'Team Name', 'Team Role', 'Joined At'];
    const rows = members.map((m) => [
      m.user.id,
      m.user.name,
      m.user.email,
      m.user.role,
      m.team.name,
      m.role,
      m.joinedAt.toISOString(),
    ]);

    return this.toCsvString(headers, rows);
  }

  async exportTeams(eventId: string): Promise<string> {
    const teams = await prisma.team.findMany({
      where: { eventId },
      include: {
        members: { include: { user: true } },
        project: true,
      },
    });

    const headers = ['Team ID', 'Team Name', 'Invite Code', 'Member Count', 'Members', 'Project Title', 'Project Status'];
    const rows = teams.map((t) => [
      t.id,
      t.name,
      t.inviteCode,
      t.members.length,
      t.members.map((m) => `${m.user.name} (${m.role})`).join('; '),
      t.project?.title || 'None',
      t.project?.status || 'None',
    ]);

    return this.toCsvString(headers, rows);
  }

  async exportProjects(eventId: string): Promise<string> {
    const projects = await prisma.project.findMany({
      where: { eventId },
      include: {
        team: true,
        track: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Project ID', 'Title', 'Team Name', 'Track', 'Status', 'Submitted At', 'Repo URL', 'Demo URL', 'Raw Score', 'Normalized Score', 'Final Rank'];
    const rows = projects.map((p) => [
      p.id,
      p.title,
      p.team.name,
      p.track?.name || 'General',
      p.status,
      p.submittedAt ? p.submittedAt.toISOString() : 'Unsubmitted',
      p.repoUrl || '',
      p.demoUrl || '',
      p.rawScore !== null ? p.rawScore : '',
      p.normalizedScore !== null ? p.normalizedScore : '',
      p.finalRank !== null ? p.finalRank : '',
    ]);

    return this.toCsvString(headers, rows);
  }

  async exportScores(eventId: string): Promise<string> {
    const evaluations = await prisma.evaluation.findMany({
      where: { eventId },
      include: {
        judge: { include: { user: true } },
        project: { include: { team: true } },
        scores: { include: { criterion: true } },
      },
    });

    const headers = ['Evaluation ID', 'Judge Name', 'Judge Email', 'Project Title', 'Team Name', 'Weighted Total', 'Is Draft', 'Submitted At', 'Criterion Breakdown'];
    const rows = evaluations.map((e) => [
      e.id,
      e.judge.user.name,
      e.judge.user.email,
      e.project.title,
      e.project.team.name,
      e.weightedTotal,
      e.isDraft ? 'Yes' : 'No',
      e.createdAt.toISOString(),
      e.scores.map((s) => `${s.criterion.title}: ${s.score}/${s.criterion.maxScore}`).join('; '),
    ]);

    return this.toCsvString(headers, rows);
  }

  async exportResults(eventId: string): Promise<string> {
    const projects = await prisma.project.findMany({
      where: {
        eventId,
        status: { in: ['SUBMITTED', 'FINALIZED'] },
      },
      include: {
        team: true,
        track: true,
        _count: { select: { votes: true, evaluations: true } },
      },
      orderBy: [{ finalRank: 'asc' }, { normalizedScore: 'desc' }],
    });

    const headers = ['Rank', 'Project Title', 'Team Name', 'Track', 'Normalized Score', 'Raw Score', 'Evaluations Count', 'Community Votes', 'Repo URL'];
    const rows = projects.map((p) => [
      p.finalRank || 'N/A',
      p.title,
      p.team.name,
      p.track?.name || 'General',
      p.normalizedScore !== null ? p.normalizedScore : 'N/A',
      p.rawScore !== null ? p.rawScore : 'N/A',
      p._count.evaluations,
      p._count.votes,
      p.repoUrl || '',
    ]);

    return this.toCsvString(headers, rows);
  }
}

export const csvExportService = new CsvExportService();
