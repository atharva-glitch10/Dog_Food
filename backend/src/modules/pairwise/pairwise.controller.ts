import { Request, Response, NextFunction } from 'express';
import { pairwiseService } from './pairwise.service.js';
import { sendSuccess } from '../../utils/response.js';

export class PairwiseController {
  async getRandomPair(req: Request, res: Response, next: NextFunction) {
    try {
      const pair = await pairwiseService.getRandomPair(req.params.eventId, req.user!.id);
      return sendSuccess(res, pair, 200);
    } catch (err) {
      next(err);
    }
  }

  async recordComparison(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await pairwiseService.recordComparison(req.params.eventId, req.user!.id, req.body);
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async computeRankings(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await pairwiseService.computeBradleyTerryRankings(req.params.eventId);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const pairwiseController = new PairwiseController();
