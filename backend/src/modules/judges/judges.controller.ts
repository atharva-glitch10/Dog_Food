import { Request, Response, NextFunction } from 'express';
import { judgesService } from './judges.service.js';
import { sendSuccess } from '../../utils/response.js';

export class JudgesController {
  async getJudges(req: Request, res: Response, next: NextFunction) {
    try {
      const judges = await judgesService.getJudgesByEvent(req.params.eventId);
      return sendSuccess(res, judges, 200);
    } catch (err) {
      next(err);
    }
  }

  async addJudge(req: Request, res: Response, next: NextFunction) {
    try {
      const judge = await judgesService.addJudgeToEvent(
        req.params.eventId,
        req.body.email,
        req.body.capacity
      );
      return sendSuccess(res, judge, 201);
    } catch (err) {
      next(err);
    }
  }

  async getMyAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const assignments = await judgesService.getMyAssignments(req.params.eventId, req.user!.id);
      return sendSuccess(res, assignments, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const judgesController = new JudgesController();
