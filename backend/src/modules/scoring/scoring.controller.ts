import { Request, Response, NextFunction } from 'express';
import { scoringService } from './scoring.service.js';
import { sendSuccess } from '../../utils/response.js';

export class ScoringController {
  async getEvaluation(req: Request, res: Response, next: NextFunction) {
    try {
      const evaluation = await scoringService.getEvaluation(
        req.params.projectId,
        req.user!.id,
        req.user!.role
      );
      return sendSuccess(res, evaluation, 200);
    } catch (err) {
      next(err);
    }
  }

  async submitEvaluation(req: Request, res: Response, next: NextFunction) {
    try {
      const evaluation = await scoringService.submitEvaluation(
        req.body.eventId,
        req.user!.id,
        req.body
      );
      return sendSuccess(res, evaluation, 201);
    } catch (err) {
      next(err);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await scoringService.getJudgingStats(req.params.eventId);
      return sendSuccess(res, stats, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const scoringController = new ScoringController();
