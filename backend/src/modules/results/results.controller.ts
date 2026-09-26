import { Request, Response, NextFunction } from 'express';
import { resultsService } from './results.service.js';
import { sendSuccess } from '../../utils/response.js';

export class ResultsController {
  async getResults(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await resultsService.getResults(req.params.eventId, req.user);
      return sendSuccess(res, results, 200);
    } catch (err) {
      next(err);
    }
  }

  async publishResults(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await resultsService.publishResults(req.params.eventId);
      return sendSuccess(res, event, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const resultsController = new ResultsController();
