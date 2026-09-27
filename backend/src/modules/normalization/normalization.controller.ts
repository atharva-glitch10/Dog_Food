import { Request, Response, NextFunction } from 'express';
import { normalizationService } from './normalization.service.js';
import { sendSuccess } from '../../utils/response.js';

export class NormalizationController {
  async normalize(req: Request, res: Response, next: NextFunction) {
    try {
      const method = (req.body?.method || req.query?.method) as any;
      const results = await normalizationService.normalizeScores(req.params.eventId, { method });
      return sendSuccess(res, results, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const normalizationController = new NormalizationController();
