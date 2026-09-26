import { Request, Response, NextFunction } from 'express';
import { teamsService } from './teams.service.js';
import { sendSuccess } from '../../utils/response.js';

export class TeamsController {
  async getTeamsByEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const teams = await teamsService.getTeamsByEvent(req.params.eventId);
      return sendSuccess(res, teams, 200);
    } catch (err) {
      next(err);
    }
  }

  async getTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const team = await teamsService.getTeamById(req.params.teamId);
      return sendSuccess(res, team, 200);
    } catch (err) {
      next(err);
    }
  }

  async getMyTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const team = await teamsService.getMyTeamForEvent(req.params.eventId, req.user!.id);
      return sendSuccess(res, team, 200);
    } catch (err) {
      next(err);
    }
  }

  async createTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const team = await teamsService.createTeam(req.params.eventId, req.user!.id, req.body);
      return sendSuccess(res, team, 201);
    } catch (err) {
      next(err);
    }
  }

  async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const invite = await teamsService.inviteMember(req.params.teamId, req.user!.id, req.body.email);
      return sendSuccess(res, invite, 201);
    } catch (err) {
      next(err);
    }
  }

  async joinTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const team = await teamsService.joinTeam(req.user!.id, req.body);
      return sendSuccess(res, team, 200);
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await teamsService.removeMember(
        req.params.teamId,
        req.params.userId,
        req.user!.id,
        req.user!.role
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const teamsController = new TeamsController();
